import { Schema } from 'effect';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const Uuid = Schema.String.check(Schema.isPattern(uuidPattern));
export const LineIdSchema = Schema.Literals(['line_1', 'line_2', 'line_3']);
export type LineId = typeof LineIdSchema.Type;
export const lineIds: readonly LineId[] = ['line_1', 'line_2', 'line_3'];
export const RegisterSchema = Schema.Struct({
  roundId: Uuid, gameMode: Schema.Literal('house'), sceneId: Schema.String,
  sceneRevision: Schema.Number, protectedLineId: LineIdSchema,
});
export type RegisterInput = typeof RegisterSchema.Type;
export const RenderSchema = Schema.Struct({
  lineId: LineIdSchema, directionId: Schema.String, mode: Schema.Literals(['live', 'prepared']),
});
export type RenderInput = typeof RenderSchema.Type;
export type Direction = { id: string; revision: number; label: string };
export type Take = {
  id: string; sceneId: string; sceneRevision: number; lineId: LineId;
  directionId: string; directionRevision: number; voice: string;
  requestedModel: 'drama-3'; renderSignature: string; audioUrl: string;
  origin: 'fish-api' | 'test-fixture'; review: 'unreviewed' | 'approved' | 'rejected';
};
export type Scene = {
  id: string; revision: number; title: string; context: string; voice: string;
  lines: { id: LineId; text: string; baselineTake: Take | null }[];
  actions: { id: string; label: string }[]; defenderGoal: string; protectedLineId: LineId;
  qualified: boolean; missing: string[]; alternatives: Take[];
};
export type Catalog = { scenes: Scene[]; directions: Direction[]; configurationMessage: string | null };
export type Health = { keyConfigured: boolean; liveEnabled: boolean; providerBusy: boolean; readySceneIds: string[]; configurationMessage: string | null };
export type Registered = RegisterInput & { maxSlots: 2; remainingSlots: number; directionRevisions: Record<string, number> };
export type ErrorCode = 'invalid_request' | 'round_not_found' | 'take_not_found' | 'protected_line' | 'round_conflict' | 'idempotency_conflict' | 'budget_exhausted' | 'provider_busy' | 'prepared_take_missing' | 'live_unavailable' | 'provider_error' | 'provider_timeout';
export type CandidateResponse = {
  roundId: string; requestId: string; slotId: string; slotIndex?: number;
  slotConsumed: boolean; status: 'ready' | 'failed';
  take?: Take; source?: 'generated-this-round' | 'prepared';
  code?: ErrorCode; message?: string; preparedTakeId?: string;
};
export const httpStatuses: Record<ErrorCode, number> = {
  invalid_request: 400, round_not_found: 404, take_not_found: 404, protected_line: 409,
  round_conflict: 409, idempotency_conflict: 409, budget_exhausted: 409, provider_busy: 409,
  prepared_take_missing: 422, live_unavailable: 503, provider_error: 502, provider_timeout: 504,
};
