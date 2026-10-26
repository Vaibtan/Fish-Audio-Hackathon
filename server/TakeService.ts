import { Context, Deferred, Effect, Layer, Schema } from 'effect';
import { RegisterSchema, RenderSchema, Uuid, type CandidateResponse, type Catalog, type Health, type Registered, type RegisterInput, type RenderInput, type Take } from '../shared/contracts';
import { ClipStore } from './ClipStore';
import type { Config } from './config';
import { makeCatalog } from './catalog';
import { ApiFailure } from './errors';
import { FishProvider } from './FishProvider';
import { compile, directions, scenes } from './requestSpec';

type RoundBinding = { input: RegisterInput; voice: string; scene: Catalog['scenes'][number]; directionRevisions: Record<string, number>; slots: number };
type Job = { fingerprint: string; result: Deferred.Deferred<CandidateResponse>; slotIndex: number };
export class TakeService extends Context.Service<TakeService, {
  catalog: () => Catalog;
  health: () => Health;
  register: (input: unknown) => Effect.Effect<Registered, ApiFailure>;
  render: (roundId: string, requestId: string, input: unknown) => Effect.Effect<CandidateResponse>;
}>()('dub/TakeService') {}

const invalid = () => new ApiFailure({ code: 'invalid_request', message: 'Use the canonical scene, line, direction, mode and UUIDs only.' });
function parse<A>(schema: Schema.ConstraintDecoder<A>, input: unknown): A {
  try { return Schema.decodeUnknownSync(schema, { onExcessProperty: 'error' })(input); }
  catch { throw invalid(); }
}
export function takeServiceLayer(config: Config) {
  return Layer.effect(TakeService, Effect.gen(function* () {
    const fish = yield* FishProvider;
    const store = yield* ClipStore;
    const serverScope = yield* Effect.scope;
    const rounds = new Map<string, RoundBinding>();
    const jobs = new Map<string, Job>();
    let liveOwner: string | null = null;
    const catalog = () => makeCatalog(config.voice, store.prepared());
    return {
      catalog,
      health: () => ({ keyConfigured: !!config.key, liveEnabled: !!config.key && !!config.voice && config.liveEnabled,
        providerBusy: liveOwner !== null, readySceneIds: catalog().scenes.filter(s => s.qualified).map(s => s.id), configurationMessage: catalog().configurationMessage }),
      register: input => Effect.try({ try: () => {
        if (serverScope.state._tag === 'Closed') throw new ApiFailure({ code: 'round_not_found', message: 'The local server session has ended.' });
        const parsed = parse(RegisterSchema, input);
        const previous = rounds.get(parsed.roundId);
        if (previous) {
          if (JSON.stringify(previous.input) !== JSON.stringify(parsed)) throw new ApiFailure({ code: 'round_conflict', message: 'Round ID is already bound to a different scene or shield.' });
          return { ...previous.input, maxSlots: 2 as const, remainingSlots: 2 - previous.slots, directionRevisions: previous.directionRevisions };
        }
        const scene = catalog().scenes.find(s => s.id === parsed.sceneId);
        if (!scene || parsed.sceneRevision !== scene.revision || !scene.qualified) throw invalid();
        if (parsed.protectedLineId !== scene.protectedLineId) throw new ApiFailure({ code: 'protected_line', message: 'The house shield is fixed for this scene.' });
        const directionRevisions = Object.fromEntries(directions.map(d => [d.id, d.revision]));
        rounds.set(parsed.roundId, { input: parsed, voice: config.voice, scene, directionRevisions, slots: 0 });
        return { ...parsed, maxSlots: 2 as const, remainingSlots: 2, directionRevisions };
      }, catch: e => { if (e instanceof ApiFailure) return e; throw e; } }),
      render: (roundId, requestId, input) => Effect.uninterruptibleMask(restore => Effect.gen(function* () {
        const base = { roundId, requestId, slotId: requestId };
        const reserved = yield* Effect.try({ try: () => {
          parse(Uuid, requestId);
          if (serverScope.state._tag === 'Closed') throw new ApiFailure({ code: 'round_not_found', message: 'The local server session has ended.' });
          const previous = jobs.get(requestId);
          let parsed: RenderInput;
          try { parse(Uuid, roundId); parsed = parse(RenderSchema, input); }
          catch (error) {
            if (previous) throw new ApiFailure({ code: 'idempotency_conflict', message: 'This request ID is already bound. Retry its original inputs.' });
            throw error;
          }
          const round = rounds.get(roundId);
          // The immutable registration pins canonical revisions and effective voice.
          const fingerprint = JSON.stringify({ roundId, input: parsed, pinned: round && { ...round.input, voice: round.voice, cards: round.directionRevisions } });
          if (previous) {
            if (previous.fingerprint !== fingerprint) throw new ApiFailure({ code: 'idempotency_conflict', message: 'This request ID is bound to different inputs. Retry the original request.' });
            return { duplicate: true as const, job: previous };
          }
          if (!round) throw new ApiFailure({ code: 'round_not_found', message: 'Round expired after server restart. Void it and start a fresh round.' });
          if (parsed.lineId === round.input.protectedLineId) throw new ApiFailure({ code: 'protected_line', message: 'The house-protected line cannot be replaced.' });
          if (!round.scene.lines.some(l => l.id === parsed.lineId) || !round.directionRevisions[parsed.directionId]) throw invalid();
          const authored = scenes.find(s => s.id === round.input.sceneId)!;
          const compiled = compile(authored, parsed.lineId, parsed.directionId, round.voice);
          const prepared = round.scene.alternatives.find(t => t.lineId === parsed.lineId && t.directionId === parsed.directionId);
          if (!prepared) throw new ApiFailure({ code: 'prepared_take_missing', message: 'This exact line/card has no approved saved take. Choose a covered card.' });
          if (parsed.mode === 'live' && (!config.key || !config.liveEnabled)) throw new ApiFailure({ code: 'live_unavailable', message: 'Live generation is unavailable. Choose a saved audition.' });
          if (round.slots >= 2) throw new ApiFailure({ code: 'budget_exhausted', message: 'Both audition slots are reserved.' });
          if (parsed.mode === 'live' && liveOwner !== null) throw new ApiFailure({ code: 'provider_busy', message: 'Another live job is still running. No slot was spent. Choose saved audio or wait.' });
          // One synchronous critical section: no await/fiber boundary between validation and ownership.
          const job: Job = { fingerprint, slotIndex: ++round.slots, result: Deferred.makeUnsafe() };
          jobs.set(requestId, job);
          if (parsed.mode === 'live') liveOwner = requestId;
          return { duplicate: false as const, job, parsed, compiled, prepared };
        }, catch: e => { if (e instanceof ApiFailure) return e; throw e; } }).pipe(Effect.map(value => ({ ok: true as const, value })), Effect.catchTag('ApiFailure', e => Effect.succeed({ ok: false as const, error: e })));
        if (!reserved.ok) return { ...base, status: 'failed', slotConsumed: false, code: reserved.error.code, message: reserved.error.message };
        const r = reserved.value;
        if (!r.duplicate) {
          const start = Date.now();
          let byteCount = 0;
          const work = Effect.gen(function* () {
            const take: Take = r.parsed.mode === 'prepared' ? r.prepared : yield* fish.synthesize(r.compiled.request).pipe(
              Effect.tap(bytes => Effect.sync(() => { byteCount = bytes.byteLength; })),
              Effect.flatMap(bytes => store.save(r.compiled.binding, r.compiled.request, bytes)));
            return { ...base, slotIndex: r.job.slotIndex, slotConsumed: true, status: 'ready' as const, take,
              source: r.parsed.mode === 'live' ? 'generated-this-round' as const : 'prepared' as const };
          }).pipe(
            Effect.catchTag('ApiFailure', e => Effect.succeed({ ...base, slotIndex: r.job.slotIndex, slotConsumed: true, status: 'failed' as const,
              code: e.code, message: e.message, preparedTakeId: r.prepared.id })),
            Effect.onExit(exit => Effect.gen(function* () {
              yield* Effect.logInfo(JSON.stringify({ roundId, requestId, sceneId: r.compiled.binding.sceneId, lineId: r.parsed.lineId,
                cardId: r.parsed.directionId, requestedModel: 'drama-3', durationMs: Date.now() - start, bytes: byteCount, mode: r.parsed.mode,
                result: exit._tag === 'Success' ? exit.value.status : 'interrupted-or-defect', duplicate: false }));
            })),
          );
          // Fork in the captured server scope under the reservation mask; caller interruption only detaches its waiter.
          const fiber = yield* Effect.forkIn(Effect.interruptible(work), serverScope);
          // Observe outside the job: even an unstarted fiber interrupted by a
          // closing scope must settle the shared reservation. Observer attachment
          // remains inside the same uninterruptible reservation/launch command.
          fiber.addObserver(exit => {
            if (r.parsed.mode === 'live' && liveOwner === requestId) liveOwner = null;
            Deferred.doneUnsafe(r.job.result, exit);
          });
        } else yield* Effect.logInfo(JSON.stringify({ roundId, requestId, result: 'shared-job', duplicate: true }));
        return yield* restore(Deferred.await(r.job.result));
      })),
    };
  }));
}
