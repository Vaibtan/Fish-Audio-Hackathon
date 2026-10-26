import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { Effect, Fiber } from 'effect';
import { harness, registration, until } from './helpers';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0)) await dispose(); });
async function setup() { const h = await harness(); cleanup.push(() => h.runtime.dispose()); return h; }
const input = { lineId: 'line_1' as const, directionId: 'hidden_delight', mode: 'live' as const };

describe('A — canonical inputs, budget and idempotency', () => {
  it('rejects invalid, protected, uncovered, mismatched revision and overridden inputs with zero provider calls', async () => {
    const h = await setup();
    for (const body of [{ ...input, lineId: 'line_2' }, { ...input, directionId: 'not-authored' }, { ...input, voice: 'override' }, { ...input, lineId: 'line_3' }, { ...input, text: 'new words' }, { ...input, model: 's1' }]) {
      const result = await h.runtime.runPromise(h.service.render(h.round.roundId, randomUUID(), body));
      expect(result.slotConsumed).toBe(false); expect(result.status).toBe('failed');
    }
    const invalid = await h.runtime.runPromiseExit(h.service.register({ ...h.round, roundId: randomUUID(), sceneRevision: 99 }));
    expect(invalid._tag).toBe('Failure'); expect(h.fish.calls).toHaveLength(0);
    const repeated = await h.runtime.runPromise(h.service.register(h.round)); expect(repeated.remainingSlots).toBe(2);
  });
  it('concurrent identical UUIDs share one job; changed inputs conflict; a new UUID rerolls; third slot rejects', async () => {
    const h = await setup(); const id = randomUUID();
    const first = h.runtime.runPromise(h.service.render(h.round.roundId, id, input));
    const duplicate = h.runtime.runPromise(h.service.render(h.round.roundId, id, input));
    await until(() => h.fish.calls.length === 1);
    const conflict = await h.runtime.runPromise(h.service.render(h.round.roundId, id, { ...input, mode: 'prepared' }));
    expect(conflict.code).toBe('idempotency_conflict'); expect(conflict.slotConsumed).toBe(false);
    h.fish.succeed(); const [a, b] = await Promise.all([first, duplicate]); expect(a).toEqual(b); expect(a.slotIndex).toBe(1);
    const second = h.runtime.runPromise(h.service.render(h.round.roundId, randomUUID(), input));
    await until(() => h.fish.calls.length === 2); h.fish.succeed(); const c = await second;
    expect(c.take?.id).not.toBe(a.take?.id); expect(c.slotIndex).toBe(2);
    expect((await h.runtime.runPromise(h.service.render(h.round.roundId, randomUUID(), input))).code).toBe('budget_exhausted');
    expect(h.fish.calls).toHaveLength(2); expect((await h.runtime.runPromise(h.service.register(h.round))).remainingSlots).toBe(0);
  });
  it('busy is immediate and non-consuming; prepared completion cannot release live ownership', async () => {
    const h = await setup(); const other = registration(h.scene); await h.runtime.runPromise(h.service.register(other));
    const pending = h.runtime.runPromise(h.service.render(h.round.roundId, randomUUID(), input));
    await until(() => h.fish.calls.length === 1);
    const busy = await h.runtime.runPromise(h.service.render(other.roundId, randomUUID(), input));
    expect(busy.code).toBe('provider_busy'); expect(busy.slotConsumed).toBe(false);
    const prepared = await h.runtime.runPromise(h.service.render(other.roundId, randomUUID(), { ...input, mode: 'prepared' }));
    expect(prepared.status).toBe('ready'); expect(h.service.health().providerBusy).toBe(true);
    expect((await h.runtime.runPromise(h.service.register(other))).remainingSlots).toBe(1);
    h.fish.succeed(); await pending; expect(h.service.health().providerBusy).toBe(false);
  });
  it('round conflict preserves budgets and unknown rounds never recreate themselves', async () => {
    const h = await setup();
    await h.runtime.runPromise(h.service.render(h.round.roundId, randomUUID(), { ...input, mode: 'prepared' }));
    expect((await h.runtime.runPromiseExit(h.service.register({ ...h.round, protectedLineId: 'line_1' })))._tag).toBe('Failure');
    expect((await h.runtime.runPromise(h.service.register(h.round))).remainingSlots).toBe(1);
    expect((await h.runtime.runPromise(h.service.render(randomUUID(), randomUUID(), input))).code).toBe('round_not_found');
    expect(h.fish.calls).toHaveLength(0);
  });
});
describe('B — server-owned jobs', () => {
  it('a closed server scope rejects without reserving a slot or starting a provider call', async () => {
    const h = await setup(); await h.runtime.dispose();
    const result = await Effect.runPromise(h.service.render(h.round.roundId, randomUUID(), input));
    expect(result.code).toBe('round_not_found'); expect(result.slotConsumed).toBe(false);
    expect(h.fish.calls).toHaveLength(0); expect(h.service.health().providerBusy).toBe(false);
  });
  it('a defect is shared as a failed effect, never usable audio, and releases ownership', async () => {
    const h = await setup(); const id = randomUUID();
    const waiting = h.runtime.runPromiseExit(h.service.render(h.round.roundId, id, input));
    await until(() => h.fish.calls.length === 1); h.fish.defect();
    expect((await waiting)._tag).toBe('Failure'); expect(h.service.health().providerBusy).toBe(false);
    expect((await h.runtime.runPromiseExit(h.service.render(h.round.roundId, id, input)))._tag).toBe('Failure');
    expect(h.fish.calls).toHaveLength(1);
  });
  it('interrupting a caller leaves a duplicate waiter and synthesis alive', async () => {
    const h = await setup(); const id = randomUUID();
    const first = h.runtime.runFork(h.service.render(h.round.roundId, id, input));
    await until(() => h.fish.calls.length === 1);
    const second = h.runtime.runPromise(h.service.render(h.round.roundId, id, input));
    await Effect.runPromise(Fiber.interrupt(first));
    expect(h.fish.interrupted()).toBe(0); expect(h.service.health().providerBusy).toBe(true);
    h.fish.succeed(); const result = await second;
    expect(result.status).toBe('ready'); expect(await h.runtime.runPromise(h.service.render(h.round.roundId, id, input))).toEqual(result);
    expect(h.fish.calls).toHaveLength(1);
  });
  it.each(['provider_error', 'provider_timeout'] as const)('%s terminates once, releases the lock and never retries', async code => {
    const h = await setup(); const id = randomUUID();
    const first = h.runtime.runPromise(h.service.render(h.round.roundId, id, input));
    await until(() => h.fish.calls.length === 1); h.fish.fail(code);
    const result = await first; expect(result.code).toBe(code); expect(result.slotConsumed).toBe(true);
    expect(h.service.health().providerBusy).toBe(false);
    expect(await h.runtime.runPromise(h.service.render(h.round.roundId, id, input))).toEqual(result); expect(h.fish.calls).toHaveLength(1);
  });
  it('server-scope shutdown interrupts owned jobs, finalizes waiters and releases ownership', async () => {
    const h = await setup();
    const waiter = h.runtime.runPromiseExit(h.service.render(h.round.roundId, randomUUID(), input));
    await until(() => h.fish.calls.length === 1);
    await h.runtime.dispose(); expect((await waiter)._tag).toBe('Failure');
    expect(h.fish.interrupted()).toBe(1); expect(h.service.health().providerBusy).toBe(false);
  });
});
