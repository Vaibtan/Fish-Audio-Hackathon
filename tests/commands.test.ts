import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameCommands } from '../src/game/commands';
import { AudioController } from '../src/audio/AudioController';
import { ClipCache } from '../src/audio/ClipCache';
import { initialState, reducer } from '../src/game/reducer';
import { testScene } from './helpers';
import type { CandidateResponse, RenderInput } from '../shared/contracts';

afterEach(() => { vi.unstubAllGlobals(); });
function commands() {
  let state = initialState;
  const scene = testScene(); const id = randomUUID();
  state = reducer(state, { type: 'NEW_ROUND', id, scene, saboteurId: 'Director', listenerId: 'Listener', actionOrder: scene.actions.map(a => a.id) });
  state = reducer(state, { type: 'REGISTERED', roundId: id });
  const commands = new GameCommands(() => state, e => { state = reducer(state, e); }, new AudioController(), new ClipCache(), () => {});
  return { commands, state: () => state, scene, id };
}
describe('A/D — immediate browser command guards', () => {
  it('does not synthesize during active private playback', async () => {
    let calls = 0; const scene = testScene(); const id = randomUUID();
    let state = reducer(initialState, { type: 'NEW_ROUND', id, scene, saboteurId: 'Director', listenerId: 'Listener', actionOrder: scene.actions.map(a => a.id) });
    state = reducer(state, { type: 'REGISTERED', roundId: id });
    state = reducer(state, { type: 'PLAY_START', roundId: id, runId: 'preview', purpose: 'preview' });
    vi.stubGlobal('fetch', async () => { calls++; throw new Error('must not call'); });
    const command = new GameCommands(() => state, e => { state = reducer(state, e); }, new AudioController(), new ClipCache(), () => {});
    await command.audition({ lineId: 'line_1', directionId: 'hidden_delight', mode: 'live' });
    expect(calls).toBe(0); expect(state.round!.slots).toHaveLength(0);
  });
  it('same-tick double-clicks create one live request, while pending fallback and commitment remain allowed', async () => {
    const h = commands(); let resolveResponse: (r: Response) => void = () => {}; let requests = 0;
    vi.stubGlobal('fetch', async () => { requests++; return new Promise<Response>(resolve => { resolveResponse = resolve; }); });
    const input: RenderInput = { lineId: 'line_1', directionId: 'hidden_delight', mode: 'live' };
    const pending = h.commands.audition(input); await h.commands.audition(input); expect(requests).toBe(1); expect(h.state().round!.slots).toHaveLength(1);
    const slot = h.state().round!.slots[0]; h.commands.fallback(slot.id);
    expect(h.state().round!.slots[0].source).toBe('prepared');
    const late: CandidateResponse = { roundId: h.id, requestId: slot.id, slotId: slot.id, slotConsumed: true, status: 'ready', source: 'generated-this-round', take: { ...slot.expected, id: randomUUID(), review: 'unreviewed' } };
    resolveResponse(Response.json(late)); await pending;
    expect(h.state().round!.slots[0].take?.id).toBe(slot.expected.id);
  });
  it('transport uncertainty retains the slot and retrieval repeats its exact URL, UUID and body', async () => {
    const h = commands(); const requests: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => { requests.push({ url, init }); throw new Error('transport failed'); });
    await h.commands.audition({ lineId: 'line_1', directionId: 'hidden_delight', mode: 'live' });
    const slot = h.state().round!.slots[0]; expect(slot.uncertain).toBe(true);
    await h.commands.retrieve(slot.id); expect(requests).toHaveLength(2);
    expect(requests[1].url).toBe(requests[0].url); expect(requests[1].init?.body).toBe(requests[0].init?.body);
    expect(requests[1].init?.headers).toEqual(requests[0].init?.headers); expect(h.state().round!.slots[0].id).toBe(slot.id);
  });
});
