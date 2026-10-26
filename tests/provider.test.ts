import { describe, expect, it } from 'vitest';
import { Effect, ManagedRuntime } from 'effect';
import { FishProvider, fishLayer, validateMp3, MAX_AUDIO_BYTES } from '../server/FishProvider';
import { compile, scenes } from '../server/requestSpec';
import { mp3, testConfig } from './helpers';

const request = compile(scenes[0], 'line_1', 'hidden_delight', testConfig.voice).request;
describe('Fish adapter — bounded single attempts', () => {
  it('sends the exact drama-3 header and locked words; successful bytes remain unreviewed at the store boundary', async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (url, init) => {
      calls++; expect(url).toBe('https://api.fish.audio/v1/tts'); expect(init?.headers).toEqual({ Authorization: 'Bearer test-secret-not-real', 'Content-Type': 'application/json', model: 'drama-3' });
      expect(JSON.parse(String(init?.body))).toEqual(request.body);
      return new Response(mp3, { headers: { 'content-type': 'audio/mpeg' } });
    };
    const runtime = ManagedRuntime.make(fishLayer(testConfig, fetcher));
    try { const bytes = await runtime.runPromise(Effect.flatMap(FishProvider, f => f.synthesize(request))); expect(bytes).toEqual(mp3); expect(calls).toBe(1); }
    finally { await runtime.dispose(); }
  });
  it.each([401, 402, 429, 500])('sanitizes HTTP %i without leaking the raw body or retrying', async status => {
    let calls = 0;
    const runtime = ManagedRuntime.make(fishLayer(testConfig, async () => { calls++; return new Response('RAW SECRET PROVIDER BODY', { status }); }));
    try {
      const result = await runtime.runPromise(Effect.flatMap(FishProvider, f => f.synthesize(request)).pipe(Effect.catchTag('ApiFailure', e => Effect.succeed(e))));
      expect(result).toMatchObject({ code: 'provider_error' }); expect(JSON.stringify(result)).not.toContain('RAW SECRET'); expect(calls).toBe(1);
    } finally { await runtime.dispose(); }
  });
  it.each([
    () => new Response('{"error":"bad"}', { headers: { 'content-type': 'application/json' } }),
    () => new Response('<html>error</html>', { headers: { 'content-type': 'audio/mpeg' } }),
    () => new Response(new Uint8Array()),
    () => new Response(new Uint8Array(300)),
    () => new Response(new Uint8Array(MAX_AUDIO_BYTES + 1)),
  ])('rejects error, empty, implausible and oversized response bodies', async response => {
    const runtime = ManagedRuntime.make(fishLayer(testConfig, async () => response()));
    try { expect((await runtime.runPromiseExit(Effect.flatMap(FishProvider, f => f.synthesize(request))))._tag).toBe('Failure'); }
    finally { await runtime.dispose(); }
  });
  it('the provider deadline includes body consumption and aborts the single fetch', async () => {
    let calls = 0; let aborted = false;
    const runtime = ManagedRuntime.make(fishLayer({ ...testConfig, timeoutMs: 20 }, async (_url, init) => {
      calls++;
      return new Response(new ReadableStream({ start(controller) {
        init?.signal?.addEventListener('abort', () => { aborted = true; controller.error(new Error('aborted')); });
      } }), { headers: { 'content-type': 'audio/mpeg' } });
    }));
    try {
      const result = await runtime.runPromise(Effect.flatMap(FishProvider, f => f.synthesize(request)).pipe(Effect.catchTag('ApiFailure', e => Effect.succeed(e))));
      expect(result).toMatchObject({ code: 'provider_timeout' }); expect(calls).toBe(1); expect(aborted).toBe(true);
    } finally { await runtime.dispose(); }
  });
  it('missing key or disabled live makes zero calls', async () => {
    let calls = 0; const runtime = ManagedRuntime.make(fishLayer({ ...testConfig, key: '' }, async () => { calls++; return new Response(mp3); }));
    try { expect((await runtime.runPromiseExit(Effect.flatMap(FishProvider, f => f.synthesize(request))))._tag).toBe('Failure'); expect(calls).toBe(0); }
    finally { await runtime.dispose(); }
  });
  it('validates actual MP3 bytes and rejects text', () => { expect(() => validateMp3(mp3)).not.toThrow(); expect(() => validateMp3(new TextEncoder().encode('not audio'))).toThrow(); });
});
