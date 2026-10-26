import { Context, Effect, Layer, Schema } from 'effect';
import { mkdir, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LineIdSchema, Uuid, uuidPattern, type Take } from '../shared/contracts';
import type { Config } from './config';
import { ApiFailure } from './errors';
import { validateMp3 } from './FishProvider';
import { sha256, type RenderBinding, type RequestSpec } from './requestSpec';

const StoredSchema = Schema.Struct({
  id: Uuid, sceneId: Schema.String, sceneRevision: Schema.Number, lineId: LineIdSchema,
  directionId: Schema.String, directionRevision: Schema.Number, voice: Schema.String,
  requestedModel: Schema.Literal('drama-3'), renderSignature: Schema.String, audioUrl: Schema.String,
  origin: Schema.Literals(['fish-api', 'test-fixture']), review: Schema.Literals(['unreviewed', 'approved', 'rejected']),
  audioHash: Schema.String, createdAt: Schema.String,
  request: Schema.Struct({ url: Schema.Literal('https://api.fish.audio/v1/tts'), model: Schema.Literal('drama-3'),
    body: Schema.Struct({ text: Schema.String, reference_id: Schema.String, format: Schema.Literal('mp3'), latency: Schema.Literal('normal') }) }),
});
export type StoredTake = typeof StoredSchema.Type;
export function publicTake(take: StoredTake): Take {
  const { id, sceneId, sceneRevision, lineId, directionId, directionRevision, voice, requestedModel, renderSignature, audioUrl, origin, review } = take;
  return { id, sceneId, sceneRevision, lineId, directionId, directionRevision, voice, requestedModel, renderSignature, audioUrl, origin, review };
}
const storageFailure = () => new ApiFailure({ code: 'provider_error', message: 'Local audio storage failed. Check disk space and file permissions.' });
export class ClipStore extends Context.Service<ClipStore, {
  all: () => StoredTake[];
  prepared: () => StoredTake[];
  diagnostics: () => string[];
  audio: (id: string) => Effect.Effect<Uint8Array, ApiFailure>;
  save: (binding: RenderBinding, request: RequestSpec, bytes: Uint8Array) => Effect.Effect<Take, ApiFailure>;
  review: (id: string, decision: 'approved' | 'rejected') => Effect.Effect<Take, ApiFailure>;
}>()('dub/ClipStore') {}

export function clipStoreLayer(config: Config) {
  return Layer.effect(ClipStore, Effect.gen(function* () {
    const records = new Map<string, { metadata: StoredTake; file: string }>();
    const preparedIds: string[] = [];
    const diagnostics: string[] = [];
    yield* Effect.tryPromise({ try: async () => {
      for (const folder of ['prepared', 'generated', 'tmp']) await mkdir(join(config.dataDir, folder), { recursive: true });
      let manifest: { version: number; takeIds: string[] } = { version: 1, takeIds: [] };
      try {
        const decoded = Schema.decodeUnknownSync(Schema.Struct({ version: Schema.Literal(1), takeIds: Schema.Array(Uuid) }))(JSON.parse(await readFile(config.manifestPath, 'utf8')));
        manifest = { version: decoded.version, takeIds: [...decoded.takeIds] };
      } catch { diagnostics.push('Prepared manifest is missing or invalid.'); }
      for (const folder of ['generated', 'prepared']) {
        for (const name of await readdir(join(config.dataDir, folder))) {
          if (!name.endsWith('.json') || !uuidPattern.test(name.slice(0, -5))) continue;
          try {
            const take = Schema.decodeUnknownSync(StoredSchema, { onExcessProperty: 'error' })(JSON.parse(await readFile(join(config.dataDir, folder, name), 'utf8')));
            const file = join(config.dataDir, folder, `${take.id}.mp3`);
            const bytes = await readFile(file);
            validateMp3(bytes);
            if (take.id !== name.slice(0, -5) || take.audioHash !== sha256(bytes)
              || take.renderSignature !== sha256(JSON.stringify(take.request)) || take.audioUrl !== `/api/audio/${take.id}`
              || take.voice !== take.request.body.reference_id) throw new Error('Metadata mismatch.');
            records.set(take.id, { metadata: take, file });
          } catch { diagnostics.push(`Ignored invalid/incomplete ${folder} take ${name.slice(0, -5)}.`); }
        }
      }
      for (const id of manifest.takeIds) {
        const record = records.get(id);
        if (record?.metadata.review === 'approved' && record.metadata.origin === 'fish-api'
          && record.file === join(config.dataDir, 'prepared', `${id}.mp3`) && !preparedIds.includes(id)) preparedIds.push(id);
        else diagnostics.push(`Manifest take ${id} is not an approved Fish prepared asset.`);
      }
    }, catch: storageFailure });
    async function publish(take: StoredTake, bytes: Uint8Array, folder: string) {
      const token = randomUUID();
      const audioTemp = join(config.dataDir, 'tmp', `${token}.mp3`);
      const metaTemp = join(config.dataDir, 'tmp', `${token}.json`);
      await writeFile(audioTemp, bytes, { flag: 'wx' });
      await writeFile(metaTemp, JSON.stringify(take, null, 2), { flag: 'wx' });
      const file = join(config.dataDir, folder, `${take.id}.mp3`);
      await rename(audioTemp, file);
      await rename(metaTemp, join(config.dataDir, folder, `${take.id}.json`));
      records.set(take.id, { metadata: take, file });
    }
    return {
      all: () => [...records.values()].map(r => r.metadata),
      prepared: () => preparedIds.flatMap(id => { const r = records.get(id); return r?.metadata.review === 'approved' ? [r.metadata] : []; }),
      diagnostics: () => [...diagnostics],
      audio: id => Effect.gen(function* () {
        const record = uuidPattern.test(id) ? records.get(id) : undefined;
        if (!record) return yield* Effect.fail(new ApiFailure({ code: 'take_not_found', message: 'This immutable take is unavailable.' }));
        return yield* Effect.tryPromise({ try: async () => {
          const bytes = await readFile(record.file);
          if (sha256(bytes) !== record.metadata.audioHash) throw new Error('Audio integrity check failed.');
          return bytes;
        }, catch: storageFailure });
      }),
      save: (binding, request, bytes) => Effect.tryPromise({ try: async () => {
        validateMp3(bytes);
        const id = randomUUID();
        const metadata: StoredTake = { ...binding, id, audioUrl: `/api/audio/${id}`, origin: 'fish-api', review: 'unreviewed',
          audioHash: sha256(bytes), createdAt: new Date().toISOString(), request };
        await publish(metadata, bytes, 'generated');
        return publicTake(metadata);
      }, catch: storageFailure }),
      review: (id, decision) => Effect.gen(function* () {
        const record = records.get(id);
        if (!record || !uuidPattern.test(id)) return yield* Effect.fail(new ApiFailure({ code: 'take_not_found', message: 'Take not found.' }));
        if (decision === 'approved' && record.metadata.origin !== 'fish-api') return yield* Effect.fail(new ApiFailure({ code: 'invalid_request', message: 'Fixtures cannot be approved into a real pack.' }));
        return yield* Effect.tryPromise({ try: async () => {
          const metadata = { ...record.metadata, review: decision };
          const bytes = await readFile(record.file);
          validateMp3(bytes);
          if (sha256(bytes) !== metadata.audioHash) throw new Error('Audio changed.');
          await publish(metadata, bytes, decision === 'approved' || preparedIds.includes(id) ? 'prepared' : 'generated');
          const index = preparedIds.indexOf(id);
          if (decision === 'approved' && index < 0) preparedIds.push(id);
          if (decision === 'rejected' && index >= 0) preparedIds.splice(index, 1);
          const temp = join(config.dataDir, 'tmp', `${randomUUID()}.manifest`);
          await writeFile(temp, JSON.stringify({ version: 1, takeIds: preparedIds }, null, 2));
          await rename(temp, config.manifestPath);
          return publicTake(metadata);
        }, catch: storageFailure });
      }),
    };
  }));
}
