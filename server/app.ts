import { ByteSize, Effect } from 'effect';
import { HttpIncomingMessage, HttpRouter, HttpServerRequest, HttpServerResponse } from 'effect/http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { httpStatuses, uuidPattern } from '../shared/contracts';
import { ClipStore } from './ClipStore';
import type { Config } from './config';
import { TakeService } from './TakeService';

const json = (body: unknown, status = 200) => HttpServerResponse.jsonUnsafe(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const invalid = () => json({ code: 'invalid_request', message: 'Invalid JSON request or body exceeds 4 KiB.' }, 400);
const readJson = Effect.flatMap(HttpServerRequest.HttpServerRequest, request => request.json).pipe(Effect.provideService(HttpIncomingMessage.MaxBodySize, ByteSize.kibibytes(4)));
export function routes(config: Config) {
  return HttpRouter.use(router => Effect.gen(function* () {
    const takes = yield* TakeService;
    const store = yield* ClipStore;
    yield* router.add('GET', '/api/health', Effect.sync(() => json(takes.health())));
    yield* router.add('GET', '/api/catalog', Effect.sync(() => json(takes.catalog())));
    yield* router.add('POST', '/api/rounds', Effect.gen(function* () {
      const input = yield* readJson;
      return json(yield* takes.register(input));
    }).pipe(Effect.catchTag('ApiFailure', e => Effect.succeed(json({ code: e.code, message: e.message }, httpStatuses[e.code]))), Effect.catch(() => Effect.succeed(invalid()))));
    yield* router.add('POST', '/api/rounds/:roundId/takes', Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const { roundId } = yield* HttpRouter.params;
      const requestId = request.headers['idempotency-key'] ?? '';
      const parsed = yield* readJson.pipe(Effect.map(input => ({ ok: true as const, input })), Effect.catch(() => Effect.succeed({ ok: false as const })));
      if (!parsed.ok) return json({ roundId, requestId, slotId: requestId, status: 'failed', slotConsumed: false, code: 'invalid_request', message: 'Invalid JSON or body exceeds 4 KiB.' }, 400);
      const input = parsed.input;
      const result = yield* takes.render(roundId ?? '', requestId, input);
      return json(result, result.code ? httpStatuses[result.code] : 200);
    }).pipe(Effect.catch(() => Effect.succeed(invalid()))));
    yield* router.add('GET', '/api/audio/:takeId', Effect.gen(function* () {
      const { takeId } = yield* HttpRouter.params;
      if (!takeId || !uuidPattern.test(takeId)) return json({ code: 'take_not_found', message: 'Take not found.' }, 404);
      const bytes = yield* store.audio(takeId ?? '');
      return HttpServerResponse.uint8Array(bytes, { contentType: 'audio/mpeg', headers: { 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
    }).pipe(Effect.catchTag('ApiFailure', e => Effect.succeed(json({ code: e.code, message: e.message }, httpStatuses[e.code])))));
    yield* router.add('*', '/api/*', Effect.succeed(json({ code: 'take_not_found', message: 'API route not found.' }, 404)));
    yield* router.add('GET', '/*', request => Effect.gen(function* () {
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
      catch { return HttpServerResponse.text('Invalid URL', { status: 400 }); }
      if (pathname.includes('\0') || pathname.includes('\\')) return HttpServerResponse.empty({ status: 404 });
      const root = resolve(config.webDir);
      const file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) return HttpServerResponse.empty({ status: 404 });
      const target = pathname === '/' ? resolve(root, 'index.html') : file;
      const bytes = yield* Effect.tryPromise(() => readFile(target)).pipe(Effect.catch(() => Effect.succeed(null)));
      if (!bytes) return HttpServerResponse.text('Build the client with npm run build.', { status: 404 });
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(target)] ?? 'application/octet-stream';
      return HttpServerResponse.uint8Array(bytes, { contentType: type, headers: { 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' } });
    }));
  }));
}
