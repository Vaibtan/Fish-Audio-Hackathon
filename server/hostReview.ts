import { Schema } from 'effect';
import type { StoredTake } from './ClipStore';
import { Uuid } from '../shared/contracts';

const HostReview = Schema.Struct({
  reviewer: Schema.String, confirmedAt: Schema.String, source: Schema.String, statement: Schema.String,
  takes: Schema.Array(Schema.Struct({ takeId: Uuid, audioHash: Schema.String, renderSignature: Schema.String, decision: Schema.Literal('approved') })),
});
// A host-authored record is an alternative to interactive entry, never an audio
// quality inference. Generate does not read it or approve anything automatically.
export function verifyHostReview(input: unknown, take: StoredTake): void {
  let review: typeof HostReview.Type;
  try { review = Schema.decodeUnknownSync(HostReview, { onExcessProperty: 'error' })(input); }
  catch { throw new Error('Host review file has an invalid format. No approval recorded.'); }
  if (!review.reviewer.trim() || !review.statement.trim() || !review.source.trim() || !Number.isFinite(Date.parse(review.confirmedAt))
    || take.origin !== 'fish-api' || !review.takes.some(t => t.takeId === take.id && t.audioHash === take.audioHash && t.renderSignature === take.renderSignature)) {
    throw new Error('Host approval evidence does not bind to these exact Fish audio bytes and request.');
  }
}
