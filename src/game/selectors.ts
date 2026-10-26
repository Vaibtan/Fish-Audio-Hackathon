import type { GameState, Round } from './types';
export type ListenerView = {
  roundId: string; title: string; context: string; transcript: string[];
  actions: { id: string; label: string }[]; canVote: boolean; canPlay: boolean; canReplay: boolean;
  playing: boolean; preparing: boolean; preparationFailed: boolean; decisionReady: boolean;
};
export function listenerProjection(r: Round): ListenerView {
  return {
    roundId: r.id, title: r.scene.title, context: r.scene.context, transcript: r.scene.lines.map(l => l.text),
    actions: r.actionOrder.map(id => r.scene.actions.find(a => a.id === id)!).map(({ id, label }) => ({ id, label })),
    canVote: r.phase === 'decide' && r.initialCompleted && !r.playback,
    canPlay: r.phase === 'listen' && r.preparation?.status === 'ready' && !r.playback,
    canReplay: r.phase === 'decide' && !r.replayCompleted && !r.playback && r.preparation?.status === 'ready',
    playing: !!r.playback, preparing: !r.preparation || r.preparation.status === 'pending',
    preparationFailed: r.preparation?.status === 'failed', decisionReady: r.initialCompleted,
  };
}
export function scores(state: GameState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const result of state.results) totals[result.winnerId] = (totals[result.winnerId] ?? 0) + 1;
  return totals;
}
