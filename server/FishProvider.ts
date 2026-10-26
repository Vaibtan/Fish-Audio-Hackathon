import { Context, Effect, Layer, Option } from 'effect';
import type { Config } from './config';
import { ApiFailure } from './errors';
import type { RequestSpec } from './requestSpec';

export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export function validateMp3(bytes: Uint8Array): void {
  if (bytes.length < 128 || bytes.length > MAX_AUDIO_BYTES) throw new Error('Invalid audio size.');
  const prefix = new TextDecoder().decode(bytes.slice(0, 80)).trimStart().toLowerCase();
  if (prefix.startsWith('{') || prefix.startsWith('[') || prefix.startsWith('<')) throw new Error('Non-audio response.');
  // Require two complete consecutive MPEG Layer III frames, including after an ID3 tag.
  function frameLength(offset: number) {
    if (offset + 4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return 0;
    const version = (bytes[offset + 1] >> 3) & 3;
    const layer = (bytes[offset + 1] >> 1) & 3;
    const bitrateIndex = bytes[offset + 2] >> 4;
    const sampleIndex = (bytes[offset + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return 0;
    const bitrates = version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
    const sampleRate = [44100,48000,32000][sampleIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    return Math.floor((version === 3 ? 144 : 72) * bitrates[bitrateIndex] * 1000 / sampleRate) + ((bytes[offset + 2] >> 1) & 1);
  }
  let frame = false;
  for (let i = 0; i < bytes.length - 3; i++) {
    const first = frameLength(i); const second = first ? frameLength(i + first) : 0;
    if (first && second && i + first + second <= bytes.length) { frame = true; break; }
  }
  if (!frame) throw new Error('No plausible MP3 frame.');
}
export class FishProvider extends Context.Service<FishProvider, {
  synthesize: (request: RequestSpec) => Effect.Effect<Uint8Array, ApiFailure>;
}>()('dub/FishProvider') {}

export function fishLayer(config: Config, fetcher: typeof fetch = fetch) {
  return Layer.succeed(FishProvider, {
    synthesize: request => Effect.gen(function* () {
      if (!config.key || !config.liveEnabled) return yield* Effect.fail(new ApiFailure({ code: 'live_unavailable', message: 'Live generation is not enabled and configured by the host.' }));
      const operation = Effect.tryPromise({
        try: async signal => {
          const response = await fetcher(request.url, {
            method: 'POST', signal,
            headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', model: request.model },
            body: JSON.stringify(request.body),
          });
          if (!response.ok) {
            await response.body?.cancel();
            const message = response.status === 401 || response.status === 403 ? 'Fish authentication or voice access was refused. Check host credentials.'
              : response.status === 402 ? 'Fish account credit is unavailable. Use a saved take.'
              : response.status === 429 ? 'Fish is rate limited. Use a saved take; no retry was made.'
              : 'Fish could not produce audio. Use a saved take.';
            throw new ApiFailure({ code: 'provider_error', message });
          }
          if (/json|html|text\//i.test(response.headers.get('content-type') ?? '') || Number(response.headers.get('content-length')) > MAX_AUDIO_BYTES) {
            await response.body?.cancel();
            throw new ApiFailure({ code: 'provider_error', message: 'Fish returned an invalid audio response.' });
          }
          if (!response.body) throw new ApiFailure({ code: 'provider_error', message: 'Fish returned no audio.' });
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let length = 0;
          try {
            for (;;) {
              const next = await reader.read();
              if (next.done) break;
              length += next.value.byteLength;
              if (length > MAX_AUDIO_BYTES) throw new Error('Audio too large.');
              chunks.push(next.value);
            }
          } catch (error) {
            await reader.cancel().catch(() => undefined);
            throw error;
          } finally { reader.releaseLock(); }
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
          validateMp3(bytes);
          return bytes;
        },
        catch: error => error instanceof ApiFailure ? error : new ApiFailure({ code: 'provider_error', message: 'Fish audio was unavailable or invalid. No automatic retry was made.' }),
      });
      const result = yield* operation.pipe(Effect.timeoutOption(config.timeoutMs));
      if (Option.isNone(result)) return yield* Effect.fail(new ApiFailure({ code: 'provider_timeout', message: 'Fish exceeded the local deadline. Upstream billing may still have occurred. Use a saved take.' }));
      return result.value;
    }),
  });
}
