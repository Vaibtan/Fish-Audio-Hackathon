import type { CandidateResponse, Catalog, Health, Registered, RegisterInput, RenderInput } from '../../shared/contracts';
async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error('Local server unavailable. Start it and retry.');
  return response.json();
}
export const api = {
  catalog: () => get<Catalog>('/api/catalog'),
  health: () => get<Health>('/api/health'),
  register: async (input: RegisterInput): Promise<Registered> => {
    const response = await fetch('/api/rounds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(25000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? 'Round registration failed.');
    return body;
  },
  render: async (roundId: string, requestId: string, input: RenderInput): Promise<CandidateResponse> => {
    const response = await fetch(`/api/rounds/${roundId}/takes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
      body: JSON.stringify(input), signal: AbortSignal.timeout(25000) });
    const body = await response.json();
    if (body.requestId !== requestId || body.roundId !== roundId || body.slotId !== requestId || typeof body.slotConsumed !== 'boolean') throw new Error('Uncorrelated response; retain the original request.');
    return body;
  },
};
