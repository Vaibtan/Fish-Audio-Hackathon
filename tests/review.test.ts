import { describe, expect, it } from 'vitest';
import { verifyHostReview } from '../server/hostReview';
import { simulatedTake } from './helpers';

describe('explicit host review recording', () => {
  const take = simulatedTake('line_3','baseline');
  const evidence = { reviewer: 'Test host (simulated)', confirmedAt: new Date(0).toISOString(), source: 'Test only', statement: 'Explicit approval (simulated)',
    takes: [{ takeId: take.id, audioHash: take.audioHash, renderSignature: take.renderSignature, decision: 'approved' }] };
  it('requires exact take ID, audio bytes hash, render signature and explicit approved decision', () => {
    expect(() => verifyHostReview(evidence, take)).not.toThrow();
    for (const field of ['takeId','audioHash','renderSignature','decision']) {
      expect(() => verifyHostReview({ ...evidence, takes: [{ ...evidence.takes[0], [field]: 'wrong' }] }, take)).toThrow();
    }
  });
  it('rejects fixtures, absent review statements and absent takes', () => {
    expect(() => verifyHostReview(evidence, { ...take, origin: 'test-fixture' })).toThrow();
    expect(() => verifyHostReview({ ...evidence, statement: '' }, take)).toThrow();
    expect(() => verifyHostReview({ ...evidence, takes: [] }, take)).toThrow();
  });
});
