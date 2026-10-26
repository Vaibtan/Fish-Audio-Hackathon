import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { HttpRouter, HttpServer } from 'effect/http';
import { NodeHttpServer } from '@effect/platform-node';
import { routes } from '../server/app';
import { TakeService, takeServiceLayer } from '../server/TakeService';
import { controlledFish, fakeStore, testConfig, until } from './helpers';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0)) await dispose(); });
async function server() {
  const fish = controlledFish();
  const services = takeServiceLayer(testConfig).pipe(Layer.provide(fish.layer), Layer.provideMerge(fakeStore()));
  const app = HttpRouter.serve(routes(testConfig).pipe(Layer.provide(services)), { disableLogger: true, disableListenLog: true });
  const runtime = ManagedRuntime.make(app.pipe(Layer.provideMerge(NodeHttpServer.layer(() => createServer(), { host: '127.0.0.1', port: 0, gracefulShutdownTimeout: 0 }))));
  cleanup.push(() => runtime.dispose());
  const url = await runtime.runPromise(HttpServer.addressFormattedWith(Effect.succeed));
  const body = { roundId: randomUUID(), gameMode: 'house', sceneId: 'cake_invitation', sceneRevision: 1, protectedLineId: 'line_2' };
  const registered = await fetch(url + '/api/rounds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  expect(registered.status).toBe(200);
  const render = (id: string, input: unknown, signal?: AbortSignal) => fetch(url + `/api/rounds/${body.roundId}/takes`, { method: 'POST', signal, headers: { 'content-type': 'application/json', 'idempotency-key': id }, body: JSON.stringify(input) });
  return { fish, runtime, url, roundId: body.roundId, render };
}
describe('A/B/H — actual loopback HTTP boundary with controlled Fish', () => {
  it('a previously registered round expires after server restart without silently renewing its budget', async () => {
    const first = await server(); const expiredId = first.roundId; await first.runtime.dispose();
    const restarted = await server();
    const response = await fetch(restarted.url + `/api/rounds/${expiredId}/takes`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
      body: JSON.stringify({ lineId: 'line_1', directionId: 'hidden_delight', mode: 'prepared' }) });
    expect(response.status).toBe(404); expect(await response.json()).toMatchObject({ code: 'round_not_found', slotConsumed: false });
    expect(restarted.fish.calls).toHaveLength(0);
  });
  it('HTTP caller disconnect does not kill a shared job; a duplicate waiter and subsequent retrieval share one result', async () => {
    const h = await server(); const id = randomUUID(); const input = { lineId: 'line_1', directionId: 'hidden_delight', mode: 'live' };
    const abort = new AbortController();
    const first = h.render(id, input, abort.signal).then(r => r.status, () => 'disconnected');
    await until(() => h.fish.calls.length === 1);
    const second = h.render(id, input); abort.abort(); expect(await first).toBe('disconnected');
    const health = await (await fetch(h.url + '/api/health')).json(); expect(health.providerBusy).toBe(true); expect(h.fish.interrupted()).toBe(0);
    h.fish.succeed(); const response = await second; const result = await response.json(); expect(response.status).toBe(200);
    expect(await (await h.render(id, input)).json()).toEqual(result); expect(h.fish.calls).toHaveLength(1);
  });
  it('strict JSON size/fields, opaque asset IDs, exact errors and no secret exposure', async () => {
    const h = await server(); const id = randomUUID();
    const over = await h.render(id, { lineId: 'line_1', directionId: 'hidden_delight', mode: 'live', text: 'x'.repeat(5000) });
    expect(over.status).toBe(400); expect(await over.json()).toMatchObject({ requestId: id, roundId: h.roundId, slotConsumed: false });
    const protectedLine = await h.render(randomUUID(), { lineId: 'line_2', directionId: 'hidden_delight', mode: 'live' });
    expect(protectedLine.status).toBe(409); expect((await protectedLine.json()).code).toBe('protected_line');
    expect((await fetch(h.url + '/api/audio/not-an-id')).status).toBe(404);
    for (const path of ['/api/health', '/api/catalog']) {
      const text = await (await fetch(h.url + path)).text(); expect(text).not.toContain(testConfig.key); expect(text).not.toContain('Authorization');
    }
    expect(h.fish.calls).toHaveLength(0);
  });
});
