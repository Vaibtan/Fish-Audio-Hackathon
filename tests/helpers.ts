import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Context, Effect, Layer, ManagedRuntime } from 'effect';
import type { Take, Scene, RegisterInput } from '../shared/contracts';
import { ClipStore, publicTake, type StoredTake } from '../server/ClipStore';
import { FishProvider } from '../server/FishProvider';
import { ApiFailure } from '../server/errors';
import { makeCatalog } from '../server/catalog';
import { compile, scenes, sha256, type RequestSpec } from '../server/requestSpec';
import type { Config } from '../server/config';
import { TakeService, takeServiceLayer } from '../server/TakeService';

// Simulated approved metadata is confined to tests. These are not real Fish takes or a distributable pack.
export const testConfig: Config = { key: 'test-secret-not-real', voice: 'test-voice', liveEnabled: true, timeoutMs: 100,
  host: '127.0.0.1', port: 3001, dataDir: '', manifestPath: '', webDir: 'dist' };
export const mp3 = new Uint8Array(readFileSync(new URL('./fixtures/tone.mp3', import.meta.url)));
export function simulatedTake(lineId: 'line_1' | 'line_2' | 'line_3', directionId: string, overrides: Partial<StoredTake> = {}): StoredTake {
  const { binding, request } = compile(scenes[0], lineId, directionId, testConfig.voice);
  const id = overrides.id ?? randomUUID();
  return { ...binding, id, audioUrl: `/api/audio/${id}`, origin: 'fish-api', review: 'approved', audioHash: sha256(mp3), createdAt: new Date(0).toISOString(), request, ...overrides };
}
export function simulatedBank() {
  return [simulatedTake('line_1', 'baseline'), simulatedTake('line_2', 'baseline'), simulatedTake('line_3', 'baseline'),
    simulatedTake('line_1', 'hidden_delight'), simulatedTake('line_3', 'thin_confidence')];
}
export function testScene(): Scene { return makeCatalog(testConfig.voice, simulatedBank()).scenes[0]; }
export function registration(scene: Scene, roundId = randomUUID()): RegisterInput {
  return { roundId, sceneId: scene.id, sceneRevision: scene.revision, gameMode: 'house', protectedLineId: scene.protectedLineId };
}
export function fakeStore(bank = simulatedBank()) {
  const records = [...bank];
  const service: Context.Service.Shape<typeof ClipStore> = {
    all: () => records,
    prepared: () => bank,
    diagnostics: () => [],
    audio: () => Effect.succeed(mp3),
    save: (binding, request, bytes) => Effect.sync(() => {
      const id = randomUUID();
      const take: StoredTake = { ...binding, request, id, audioUrl: `/api/audio/${id}`, origin: 'fish-api', review: 'unreviewed', audioHash: sha256(bytes), createdAt: new Date(0).toISOString() };
      records.push(take); return publicTake(take);
    }),
    review: () => Effect.fail(new ApiFailure({ code: 'invalid_request', message: 'No human approvals in tests.' })),
  };
  return Layer.succeed(ClipStore, service);
}
export function controlledFish() {
  const calls: RequestSpec[] = [];
  const completions: ((effect: Effect.Effect<Uint8Array, ApiFailure>) => void)[] = [];
  let interrupted = 0;
  const layer = Layer.succeed(FishProvider, {
    synthesize: (request: RequestSpec) => Effect.callback<Uint8Array, ApiFailure>((resume, signal) => {
      calls.push(request); completions.push(resume);
      signal.addEventListener('abort', () => { interrupted++; }, { once: true });
    }),
  });
  return { layer, calls, succeed: (i = calls.length - 1) => completions[i](Effect.succeed(mp3)),
    defect: (i = calls.length - 1) => completions[i](Effect.die(new Error('Controlled defect'))),
    fail: (code: 'provider_error' | 'provider_timeout' = 'provider_error', i = calls.length - 1) => completions[i](Effect.fail(new ApiFailure({ code, message: 'Controlled failure' }))),
    interrupted: () => interrupted };
}
export async function harness() {
  const fish = controlledFish();
  const store = fakeStore();
  const services = takeServiceLayer(testConfig).pipe(Layer.provide(fish.layer), Layer.provideMerge(store));
  const runtime = ManagedRuntime.make(services);
  const service = await runtime.runPromise(TakeService);
  const scene = service.catalog().scenes[0];
  const round = registration(scene);
  await runtime.runPromise(service.register(round));
  return { fish, store, services, runtime, service, scene, round };
}
export async function until(predicate: () => boolean) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  throw new Error('Expected condition was not reached.');
}
