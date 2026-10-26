import type { CandidateResponse, LineId, RenderInput, Scene, Take } from '../../shared/contracts';
export type Phase = 'protect' | 'sabotage' | 'handoff' | 'listen' | 'decide' | 'reveal';
export type Purpose = 'initial' | 'replay' | 'preview' | 'comparison';
export type Slot = {
  id: string; index: 1 | 2; input: RenderInput; expected: Take;
  status: 'pending' | 'ready' | 'failed' | 'rejected'; usability: 'unchecked' | 'accepted' | 'rejected';
  take: Take | null; source: 'generated-this-round' | 'prepared' | null;
  providerOutcome: CandidateResponse | null; uncertain: boolean; previewed: boolean;
};
export type Result = { roundId: string; chosenActionId: string; winnerId: string };
export type Round = {
  id: string; scene: Scene; houseId: 'The house'; saboteurId: string; listenerId: string;
  phase: Phase; registrationPending: boolean; registrationError: string | null;
  protectedLineId: LineId; slots: Slot[]; selectedSlotId: string | null;
  frozenTuple: readonly [Take, Take, Take] | null; actionOrder: readonly string[];
  initialCompleted: boolean; replayCompleted: boolean;
  playback: { runId: string; purpose: Purpose; slotId?: string } | null;
  preparation: { id: string; tupleKey: string; status: 'pending' | 'ready' | 'failed' } | null;
  rejectedTakeIds: readonly string[]; answer: string | null;
};
export type GameState = { round: Round | null; results: Result[]; familiarSceneIds: string[] };
export type Event =
  | { type: 'NEW_ROUND'; id: string; scene: Scene; saboteurId: string; listenerId: string; actionOrder: string[] }
  | { type: 'RESET' }
  | { type: 'REGISTER_START'; roundId: string }
  | { type: 'REGISTERED'; roundId: string }
  | { type: 'REGISTER_FAILED'; roundId: string; message: string }
  | { type: 'RESERVE'; roundId: string; id: string; input: RenderInput }
  | { type: 'RESPONSE'; roundId: string; response: CandidateResponse }
  | { type: 'UNCERTAIN'; roundId: string; id: string }
  | { type: 'FALLBACK'; roundId: string; id: string; takeId: string }
  | { type: 'ACCEPT' | 'REJECT' | 'SELECT'; roundId: string; id: string }
  | { type: 'COMMIT' | 'HANDOFF'; roundId: string }
  | { type: 'PREPARING' | 'PREPARED' | 'PREPARE_FAILED'; roundId: string; tupleKey: string; preparationId: string }
  | { type: 'PLAY_START'; roundId: string; runId: string; purpose: Purpose; slotId?: string }
  | { type: 'PLAY_FINISH'; roundId: string; runId: string; outcome: 'complete' | 'cancelled' | 'failed' }
  | { type: 'ANSWER'; roundId: string; actionId: string };
