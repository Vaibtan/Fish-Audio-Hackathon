import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Listener } from '../src/Listener';
import { initialState, reducer, tupleKey } from '../src/game/reducer';
import { listenerProjection, scores } from '../src/game/selectors';
import type { Event, GameState } from '../src/game/types';
import type { CandidateResponse, RenderInput } from '../shared/contracts';
import { testScene } from './helpers';
type LocalEvent<E = Event> = E extends Event ? Omit<E, 'roundId'> & { roundId?: string } : never;

function game() {
  const scene = testScene(); const id = randomUUID();
  let state = reducer(initialState, { type: 'NEW_ROUND', scene, id, saboteurId: 'Director', listenerId: 'Listener', actionOrder: scene.actions.map(a => a.id).reverse() });
  const send = (event: LocalEvent) => { state = reducer(state, { roundId: id, ...event } as Event); };
  send({ type: 'REGISTERED' });
  function reserve(input: RenderInput = { lineId: 'line_1', directionId: 'hidden_delight', mode: 'live' }) { const id = randomUUID(); send({ type: 'RESERVE', id, input }); return id; }
  function response(slotId: string, overrides: Partial<CandidateResponse> = {}) {
    const slot = state.round!.slots.find(s => s.id === slotId)!;
    const take = { ...slot.expected, id: randomUUID(), review: 'unreviewed' as const };
    const response: CandidateResponse = { roundId: id, requestId: slotId, slotId, slotConsumed: true, slotIndex: 2, status: 'ready', take, source: 'generated-this-round', ...overrides };
    send({ type: 'RESPONSE', response }); return response;
  }
  function accept(slotId: string) {
    const runId = randomUUID(); send({ type: 'PLAY_START', runId, purpose: 'preview', slotId });
    send({ type: 'PLAY_FINISH', runId, outcome: 'complete' }); send({ type: 'ACCEPT', id: slotId });
  }
  function commit(slotId: string) { send({ type: 'SELECT', id: slotId }); send({ type: 'COMMIT' }); }
  function ready() { const preparationId = randomUUID(); const key = tupleKey(state.round!.frozenTuple!); send({ type: 'PREPARING', tupleKey: key, preparationId }); send({ type: 'PREPARED', tupleKey: key, preparationId }); send({ type: 'HANDOFF' }); }
  function finish(purpose: 'initial' | 'replay', outcome: 'complete' | 'cancelled' | 'failed' = 'complete') { const runId = randomUUID(); send({ type: 'PLAY_START', purpose, runId }); send({ type: 'PLAY_FINISH', runId, outcome }); }
  return { id, scene, send, reserve, response, accept, commit, ready, finish, state: () => state };
}
describe('C — immutable candidate identity', () => {
  it('selecting the first of candidates on different lines replaces only its own line, regardless of later controls or server indices', () => {
    const g = game(); const a = g.reserve(); const ar = g.response(a); g.accept(a);
    const b = g.reserve({ lineId: 'line_3', directionId: 'thin_confidence', mode: 'live' }); g.response(b); g.accept(b);
    expect(g.state().round!.slots.map(s => s.index)).toEqual([1, 2]);
    g.commit(a); const tuple = g.state().round!.frozenTuple!;
    expect(tuple.map(t => t.id)).toEqual([ar.take!.id, g.scene.lines[1].baselineTake!.id, g.scene.lines[2].baselineTake!.id]);
    expect(Object.isFrozen(tuple)).toBe(true);
  });
  it('live take cannot be accepted before complete private preview; a valid disappointing take cannot be substituted without technical rejection', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.send({ type: 'ACCEPT', id: a }); g.commit(a);
    expect(g.state().round!.phase).toBe('sabotage');
    g.send({ type: 'FALLBACK', id: a, takeId: g.scene.alternatives[0].id }); expect(g.state().round!.slots[0].source).toBe('generated-this-round');
    g.accept(a); g.commit(a); expect(g.state().round!.phase).toBe('handoff');
  });
});
describe('D — fallback and provisional races', () => {
  it.each(['ready', 'failed', 'nonconsuming'] as const)('late %s result preserves pending-slot saved adoption', outcome => {
    const g = game(); const a = g.reserve(); const take = g.scene.alternatives[0];
    g.send({ type: 'FALLBACK', id: a, takeId: g.scene.alternatives[1].id }); expect(g.state().round!.slots[0].take).toBeNull();
    g.send({ type: 'FALLBACK', id: a, takeId: take.id });
    g.response(a, { status: outcome === 'ready' ? 'ready' : 'failed', slotConsumed: outcome !== 'nonconsuming', code: outcome === 'ready' ? undefined : 'provider_error' });
    const slot = g.state().round!.slots[0]; expect(slot.take?.id).toBe(take.id); expect(slot.source).toBe('prepared'); expect(slot.usability).toBe('accepted');
    expect(slot.providerOutcome).not.toBeNull();
  });
  it('confirmed rejection frees an unused provisional slot; uncertainty retains it and the same UUID', () => {
    const g = game(); const a = g.reserve(); g.send({ type: 'UNCERTAIN', id: a });
    expect(g.state().round!.slots[0].id).toBe(a); expect(g.state().round!.slots[0].uncertain).toBe(true);
    g.response(a, { status: 'failed', slotConsumed: false, code: 'provider_busy' }); expect(g.state().round!.slots).toHaveLength(0);
    const b = g.reserve(); expect(g.state().round!.slots[0].index).toBe(1); expect(b).not.toBe(a);
  });
  it('technical rejection permits exact fallback; a rejected prepared default is not offered again', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.send({ type: 'REJECT', id: a });
    g.send({ type: 'FALLBACK', id: a, takeId: g.scene.alternatives[0].id }); expect(g.state().round!.slots[0].source).toBe('prepared');
    g.send({ type: 'REJECT', id: a }); g.send({ type: 'FALLBACK', id: a, takeId: g.scene.alternatives[0].id });
    expect(g.state().round!.slots[0].status).toBe('rejected'); g.reserve(); expect(g.state().round!.slots).toHaveLength(1);
  });
  it('repeated retrieval cannot undo acceptance or revive a rejected generated take', () => {
    const g = game(); const a = g.reserve(); const response = g.response(a); g.accept(a);
    g.send({ type: 'RESPONSE', response }); expect(g.state().round!.slots[0].usability).toBe('accepted');
    g.send({ type: 'REJECT', id: a }); g.send({ type: 'RESPONSE', response }); expect(g.state().round!.slots[0].status).toBe('rejected');
  });
});
describe('E — stale events, blind projection and scoring', () => {
  it('reset, new rounds and commitment ignore late generation and unrelated preparation', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a);
    const committed = g.state(); const response = { roundId: g.id, requestId: a, slotId: a, slotConsumed: false, status: 'failed' as const };
    g.send({ type: 'RESPONSE', response }); expect(g.state()).toBe(committed);
    g.send({ type: 'PREPARED', tupleKey: 'wrong', preparationId: 'old' }); expect(g.state()).toBe(committed);
    g.send({ type: 'RESET' }); g.send({ type: 'RESPONSE', response }); expect(g.state().round).toBeNull();
    const scene = g.scene; g.send({ type: 'NEW_ROUND', id: randomUUID(), scene, saboteurId: 'Director', listenerId: 'Listener', actionOrder: scene.actions.map(a => a.id) });
    const fresh = g.state(); g.send({ type: 'RESPONSE', response }); expect(g.state()).toBe(fresh);
  });
  it('an earlier preparation attempt cannot erase a later successful retry', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a);
    const key = tupleKey(g.state().round!.frozenTuple!);
    g.send({ type: 'PREPARING', tupleKey: key, preparationId: 'old' }); g.send({ type: 'PREPARING', tupleKey: key, preparationId: 'new' });
    g.send({ type: 'PREPARED', tupleKey: key, preparationId: 'new' }); g.send({ type: 'PREPARE_FAILED', tupleKey: key, preparationId: 'old' });
    expect(g.state().round!.preparation?.status).toBe('ready');
  });
  it('listener projection and rendered component contain no private identity, card, shield or provenance', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a); g.ready();
    const view = listenerProjection(g.state().round!);
    expect(Object.keys(view).sort()).toEqual(['roundId','title','context','transcript','actions','canVote','canPlay','canReplay','playing','preparing','preparationFailed','decisionReady'].sort());
    const html = renderToStaticMarkup(createElement(Listener, { view, notice: '', onPlay() {}, onReplay() {}, onAnswer() {}, onRetry() {}, onVoid() {} }));
    for (const privateValue of ['Director','hidden_delight','Badly hidden delight','shield','fish-api','prepared','audition','baseline','saboteur']) expect(html.toLowerCase()).not.toContain(privateValue.toLowerCase());
    expect(view.actions.map(a => a.id)).toEqual(g.scene.actions.map(a => a.id).reverse());
  });
  it('only a valid action after completion scores; duplicate answers produce one derived point', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a); g.ready();
    g.send({ type: 'ANSWER', actionId: g.scene.defenderGoal }); expect(g.state().results).toHaveLength(0);
    g.finish('initial'); g.send({ type: 'ANSWER', actionId: 'invalid' }); expect(g.state().results).toHaveLength(0);
    g.send({ type: 'ANSWER', actionId: g.scene.defenderGoal }); g.send({ type: 'ANSWER', actionId: g.scene.defenderGoal });
    expect(g.state().results).toHaveLength(1); expect(scores(g.state())).toEqual({ 'The house': 1 });
  });
  it('the other semantic action gives the director a point and voiding never scores', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a); g.ready(); g.finish('initial');
    g.send({ type: 'ANSWER', actionId: g.scene.actions.find(a => a.id !== g.scene.defenderGoal)!.id }); expect(scores(g.state())).toEqual({ Director: 1 });
    const h = game(); h.send({ type: 'RESET' }); expect(h.state().results).toHaveLength(0);
  });
});
describe('F — playback state gates', () => {
  it.each(['cancelled','failed'] as const)('%s initial run keeps voting locked; only a complete replay spends its allowance', outcome => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a); g.commit(a); g.ready();
    g.finish('initial', outcome); expect(listenerProjection(g.state().round!).canVote).toBe(false);
    g.finish('initial'); const tuple = g.state().round!.frozenTuple;
    const runId = 'replay'; g.send({ type: 'PLAY_START', purpose: 'replay', runId }); g.send({ type: 'ANSWER', actionId: g.scene.defenderGoal }); expect(g.state().results).toHaveLength(0);
    g.send({ type: 'PLAY_FINISH', runId, outcome }); expect(g.state().round!.replayCompleted).toBe(false); expect(listenerProjection(g.state().round!).canVote).toBe(true);
    g.send({ type: 'PLAY_FINISH', runId, outcome: 'complete' }); expect(g.state().round!.replayCompleted).toBe(false);
    g.finish('replay'); expect(g.state().round!.replayCompleted).toBe(true); expect(g.state().round!.frozenTuple).toBe(tuple);
    g.send({ type: 'PLAY_START', purpose: 'replay', runId: 'extra' }); expect(g.state().round!.playback).toBeNull();
  });
  it('preview/reveal and stale run completion never unlock listener voting', () => {
    const g = game(); const a = g.reserve(); g.response(a); g.accept(a);
    expect(g.state().round!.initialCompleted).toBe(false);
    g.commit(a); g.ready(); g.send({ type: 'PLAY_FINISH', runId: 'stale', outcome: 'complete' });
    expect(listenerProjection(g.state().round!).canVote).toBe(false);
    g.send({ type: 'PLAY_START', purpose: 'comparison', runId: 'not-reveal' }); expect(g.state().round!.playback).toBeNull();
  });
});
