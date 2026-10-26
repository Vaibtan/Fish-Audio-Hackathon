import type { GameState, Event, Round, Slot } from './types';
import type { Take } from '../../shared/contracts';

export const initialState: GameState = { round: null, results: [], familiarSceneIds: [] };
export const tupleKey = (takes: readonly Take[]) => takes.map(t => t.id).join('/');
export function sameBinding(a: Take, b: Take) {
  return a.sceneId === b.sceneId && a.sceneRevision === b.sceneRevision && a.lineId === b.lineId
    && a.directionId === b.directionId && a.directionRevision === b.directionRevision
    && a.voice === b.voice && a.requestedModel === b.requestedModel && a.renderSignature === b.renderSignature;
}
function updateSlot(round: Round, id: string, f: (s: Slot) => Slot): Round {
  return { ...round, slots: round.slots.map(s => s.id === id ? f(s) : s) };
}
export function reducer(state: GameState, event: Event): GameState {
  if (event.type === 'RESET') return { ...state, round: null };
  if (event.type === 'NEW_ROUND') {
    if (!event.scene.qualified || !event.scene.lines.every(l => l.baselineTake)
      || event.actionOrder.length !== 2 || new Set(event.actionOrder).size !== 2
      || !event.actionOrder.every(id => event.scene.actions.some(a => a.id === id))
      || !event.saboteurId.trim() || !event.listenerId.trim() || event.saboteurId === event.listenerId
      || event.saboteurId === 'The house' || event.listenerId === 'The house') return state;
    return { ...state, familiarSceneIds: [...new Set([...state.familiarSceneIds, event.scene.id])], round: {
      id: event.id, scene: event.scene, houseId: 'The house', saboteurId: event.saboteurId, listenerId: event.listenerId,
      phase: 'protect', registrationPending: false, registrationError: null, protectedLineId: event.scene.protectedLineId,
      slots: [], selectedSlotId: null, frozenTuple: null, actionOrder: [...event.actionOrder], initialCompleted: false,
      replayCompleted: false, playback: null, preparation: null, rejectedTakeIds: [], answer: null,
    } };
  }
  const r = state.round;
  if (!r || event.roundId !== r.id) return state;
  let next = r;
  switch (event.type) {
    case 'REGISTER_START':
      if (r.phase === 'protect') next = { ...r, registrationPending: true, registrationError: null };
      break;
    case 'REGISTERED':
      if (r.phase === 'protect') next = { ...r, phase: 'sabotage', registrationPending: false, registrationError: null };
      break;
    case 'REGISTER_FAILED':
      if (r.phase === 'protect') next = { ...r, registrationPending: false, registrationError: event.message };
      break;
    case 'RESERVE': {
      if (r.phase !== 'sabotage' || r.slots.length >= 2 || r.slots.some(s => s.id === event.id) || event.input.lineId === r.protectedLineId) break;
      const expected = r.scene.alternatives.find(t => t.lineId === event.input.lineId && t.directionId === event.input.directionId);
      if (!expected || r.rejectedTakeIds.includes(expected.id)) break;
      const index = r.slots.some(s => s.index === 1) ? 2 : 1;
      next = { ...r, slots: [...r.slots, { id: event.id, index, input: { ...event.input }, expected, status: 'pending', usability: 'unchecked',
        take: null, source: null, providerOutcome: null, uncertain: false, previewed: false }] };
      break;
    }
    case 'RESPONSE': {
      const response = event.response;
      const slot = r.slots.find(s => s.id === response.requestId);
      if (r.phase !== 'sabotage' || !slot || response.roundId !== r.id || response.slotId !== slot.id) break;
      if (slot.source === 'prepared') {
        next = updateSlot(r, slot.id, s => ({ ...s, providerOutcome: response, uncertain: false }));
        break;
      }
      if (slot.providerOutcome || slot.status === 'rejected') break;
      if (!response.slotConsumed) {
        next = { ...r, slots: r.slots.filter(s => s.id !== slot.id), selectedSlotId: r.selectedSlotId === slot.id ? null : r.selectedSlotId };
        break;
      }
      if (response.status === 'ready' && response.take && sameBinding(response.take, slot.expected)
        && !r.rejectedTakeIds.includes(response.take.id)
        && (response.source === 'generated-this-round' || (response.source === 'prepared' && response.take.id === slot.expected.id && response.take.review === 'approved' && response.take.origin === 'fish-api'))) {
        next = updateSlot(r, slot.id, s => ({ ...s, status: 'ready', take: response.take!, source: response.source!,
          usability: response.source === 'prepared' ? 'accepted' : 'unchecked', providerOutcome: response, uncertain: false }));
      } else next = updateSlot(r, slot.id, s => ({ ...s, status: 'failed', providerOutcome: response, uncertain: false }));
      break;
    }
    case 'UNCERTAIN':
      if (r.phase === 'sabotage') next = updateSlot(r, event.id, s => s.providerOutcome ? s : { ...s, uncertain: true });
      break;
    case 'FALLBACK': {
      if (r.phase !== 'sabotage' || r.playback) break;
      const slot = r.slots.find(s => s.id === event.id);
      const take = r.scene.alternatives.find(t => t.id === event.takeId);
      if (!slot || !take || take.id !== slot.expected.id || !sameBinding(take, slot.expected)
        || (slot.status === 'ready' && slot.source === 'generated-this-round')
        || take.review !== 'approved' || take.origin !== 'fish-api' || r.rejectedTakeIds.includes(take.id)) break;
      next = updateSlot(r, slot.id, s => ({ ...s, status: 'ready', usability: 'accepted', take, source: 'prepared', previewed: false }));
      break;
    }
    case 'ACCEPT':
      if (r.phase === 'sabotage' && !r.playback) next = updateSlot(r, event.id, s => s.status === 'ready' && s.previewed && s.take ? { ...s, usability: 'accepted' } : s);
      break;
    case 'REJECT': {
      if (r.phase !== 'sabotage' || r.playback) break;
      const slot = r.slots.find(s => s.id === event.id);
      if (!slot?.take) break;
      next = { ...updateSlot(r, slot.id, s => ({ ...s, status: 'rejected', usability: 'rejected' })), rejectedTakeIds: [...new Set([...r.rejectedTakeIds, slot.take.id])] };
      break;
    }
    case 'SELECT':
      if (r.phase === 'sabotage' && r.slots.some(s => s.id === event.id && s.status === 'ready' && s.usability === 'accepted')) next = { ...r, selectedSlotId: event.id };
      break;
    case 'COMMIT': {
      const slot = r.slots.find(s => s.id === r.selectedSlotId);
      if (r.phase !== 'sabotage' || !slot?.take || slot.status !== 'ready' || slot.usability !== 'accepted') break;
      const tuple = r.scene.lines.map(line => line.id === slot.input.lineId ? slot.take! : line.baselineTake!);
      next = { ...r, frozenTuple: Object.freeze([tuple[0], tuple[1], tuple[2]] as const), phase: 'handoff', playback: null, preparation: null };
      break;
    }
    case 'HANDOFF':
      if (r.phase === 'handoff') next = { ...r, phase: 'listen', playback: null };
      break;
    case 'PREPARING':
    case 'PREPARED':
    case 'PREPARE_FAILED':
      if ((r.phase === 'handoff' || r.phase === 'listen' || r.phase === 'decide') && r.frozenTuple && tupleKey(r.frozenTuple) === event.tupleKey) {
        if (event.type !== 'PREPARING' && r.preparation?.id !== event.preparationId) break;
        next = { ...r, preparation: { id: event.preparationId, tupleKey: event.tupleKey, status: event.type === 'PREPARING' ? 'pending' : event.type === 'PREPARED' ? 'ready' : 'failed' } };
      }
      break;
    case 'PLAY_START': {
      if (r.playback) break;
      const initial = event.purpose === 'initial' && r.phase === 'listen' && !r.initialCompleted && r.preparation?.status === 'ready';
      const replay = event.purpose === 'replay' && r.phase === 'decide' && r.initialCompleted && !r.replayCompleted && r.preparation?.status === 'ready';
      const preview = event.purpose === 'preview' && r.phase === 'sabotage'
        && (!event.slotId || r.slots.some(s => s.id === event.slotId && s.status === 'ready'));
      const comparison = event.purpose === 'comparison' && r.phase === 'reveal';
      if (initial || replay || preview || comparison) next = { ...r, playback: { runId: event.runId, purpose: event.purpose, slotId: event.slotId } };
      break;
    }
    case 'PLAY_FINISH': {
      if (r.playback?.runId !== event.runId) break;
      const play = r.playback;
      next = { ...r, playback: null };
      if (event.outcome !== 'complete') break;
      if (play.purpose === 'initial' && r.phase === 'listen') next = { ...next, initialCompleted: true, phase: 'decide' };
      if (play.purpose === 'replay' && r.phase === 'decide') next = { ...next, replayCompleted: true };
      if (play.purpose === 'preview' && play.slotId && r.phase === 'sabotage') next = updateSlot(next, play.slotId, s => ({ ...s, previewed: true }));
      break;
    }
    case 'ANSWER': {
      if (r.phase !== 'decide' || !r.initialCompleted || r.playback || !r.scene.actions.some(a => a.id === event.actionId) || state.results.some(result => result.roundId === r.id)) break;
      return { ...state, round: { ...r, answer: event.actionId, phase: 'reveal' }, results: [...state.results, {
        roundId: r.id, chosenActionId: event.actionId, winnerId: event.actionId === r.scene.defenderGoal ? r.houseId : r.saboteurId,
      }] };
    }
  }
  return next === r ? state : { ...state, round: next };
}
