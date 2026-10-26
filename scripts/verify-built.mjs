import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

// HTTP checks against an isolated built app. Registers temporary saved rounds;
// never calls Fish, approves content, or creates a fixture pack.
const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const url = `http://127.0.0.1:${port}`;
const nativeFetch = globalThis.fetch;
function fetch(input, init = {}) {
  // This smoke test intentionally kills/restarts the process on the same port.
  // Do not reuse a stale keep-alive socket across that boundary or wait forever.
  const headers = new Headers(init.headers);
  headers.set('connection', 'close');
  return nativeFetch(input, { ...init, headers, signal: AbortSignal.timeout(5000) });
}
function launch() {
  const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'dist-server/index.js'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), LIVE_GENERATION_ENABLED: 'false' },
  });
  let logs = '';
  child.stdout.on('data', bytes => { logs += bytes; });
  child.stderr.on('data', bytes => { logs += bytes; });
  return { child, logs: () => logs };
}
let primary = launch();
let collision;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (primary.child.exitCode !== null) throw new Error('Built server exited before readiness.');
    try { const response = await fetch(url + '/api/health'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert(ready, 'Built server did not become ready within five seconds.');
  const html = await (await fetch(url)).text();
  const script = html.match(/src="(\/assets\/[^"]+\.js)"/);
  assert(script, 'Root must reference built JavaScript assets.');
  assert.equal((await fetch(url + script[1])).status, 200);
  const health = await (await fetch(url + '/api/health')).json();
  assert.equal(health.liveEnabled, false);
  assert.equal(health.providerBusy, false);
  const catalog = await (await fetch(url + '/api/catalog')).json();
  assert.equal(catalog.scenes.length, 3);
  assert.equal(catalog.directions.length, 4);
  let registeredRoundId;
  for (const playable of catalog.scenes.filter(scene => scene.qualified)) {
    registeredRoundId = randomUUID();
    const registration = { roundId: registeredRoundId, gameMode: 'house', sceneId: playable.id, sceneRevision: playable.revision, protectedLineId: playable.protectedLineId };
    const registered = await fetch(url + '/api/rounds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(registration) });
    assert.equal(registered.status, 200);
    const alternatives = playable.lines.filter(line => line.id !== playable.protectedLineId).map(line => playable.alternatives.find(take => take.lineId === line.id));
    const candidates = [];
    for (const [index, take] of alternatives.entries()) {
      const key = randomUUID();
      const init = { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ lineId: take.lineId, directionId: take.directionId, mode: 'prepared' }) };
      const response = await fetch(url + `/api/rounds/${registeredRoundId}/takes`, init);
      assert.equal(response.status, 200);
      const result = await response.json(); assert.equal(result.take.id, take.id); assert.equal(result.source, 'prepared'); assert.equal(result.slotIndex, index + 1);
      assert.deepEqual(await (await fetch(url + `/api/rounds/${registeredRoundId}/takes`, init)).json(), result);
      candidates.push(result);
    }
    const third = await fetch(url + `/api/rounds/${registeredRoundId}/takes`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify({ lineId: alternatives[0].lineId, directionId: alternatives[0].directionId, mode: 'prepared' }) });
    assert.equal(third.status, 409); assert.equal((await third.json()).code, 'budget_exhausted');
    assert.equal((await (await fetch(url + '/api/rounds', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(registration) })).json()).remainingSlots, 0);
    for (const take of [...playable.lines.map(line => line.baselineTake), ...candidates.map(candidate => candidate.take)]) {
      const response = await fetch(url + take.audioUrl);
      assert.equal(response.status, 200); await response.arrayBuffer();
    }
    console.log(`PASS: actual ${playable.id} approved pack, two different-line prepared slots, duplicates, budget and all five immutable assets.`);
  }
  const requestId = randomUUID(); const roundId = randomUUID();
  const expired = await fetch(url + `/api/rounds/${roundId}/takes`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': requestId },
    body: JSON.stringify({ lineId: 'line_1', directionId: 'hidden_delight', mode: 'prepared' }),
  });
  assert.equal(expired.status, 404);
  assert.deepEqual(await expired.json(), { roundId, requestId, slotId: requestId, status: 'failed', slotConsumed: false,
    code: 'round_not_found', message: 'Round expired after server restart. Void it and start a fresh round.' });
  assert.equal((await fetch(url + '/api/audio/not-an-opaque-id')).status, 404);
  assert.equal((await fetch(url + '/.env')).status, 404);
  const takeId = process.argv[2];
  if (takeId) {
    assert.match(takeId, /^[a-f0-9-]{36}$/i);
    const metadata = JSON.parse(await readFile(`data/generated/${takeId}.json`, 'utf8'));
    const response = await fetch(url + `/api/audio/${takeId}`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /audio\/mpeg/);
    assert.match(response.headers.get('cache-control'), /immutable/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.audioHash);
    assert.equal(metadata.request.model, 'drama-3'); assert.equal(metadata.review, 'unreviewed');
    console.log(`PASS: persisted unreviewed take ${takeId} served with exact byte hash and immutable headers.`);
  }
  collision = launch();
  for (let i = 0; i < 100 && collision.child.exitCode === null; i++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.notEqual(collision.child.exitCode, null, 'A port collision must terminate, not hang.');
  assert.notEqual(collision.child.exitCode, 0, 'A port collision must fail startup.');
  assert.match(collision.logs(), /Cannot start .*Check port collisions/);
  console.log('PASS: a second process fails clearly on the occupied port.');
  if (registeredRoundId) {
    primary.child.kill('SIGTERM');
    await new Promise(resolve => primary.child.once('exit', resolve));
    primary = launch();
    console.log('Checking the restarted process and the expired registered round…');
    let restarted = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(url + '/api/health')).ok) { restarted = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert(restarted, 'Restarted built server did not become ready.');
    const expired = await fetch(url + `/api/rounds/${registeredRoundId}/takes`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify({ lineId: 'line_1', directionId: 'hidden_delight', mode: 'prepared' }) });
    assert.equal(expired.status, 404); assert.equal((await expired.json()).code, 'round_not_found');
    const restartedCatalog = await (await fetch(url + '/api/catalog')).json();
    for (const scene of catalog.scenes.filter(scene => scene.qualified)) {
      assert(restartedCatalog.scenes.some(current => current.id === scene.id && current.qualified));
    }
    console.log('PASS: actual registered round expired after process restart; prepared pack survived.');
  }
  console.log('PASS: built HTML/assets, catalog, health, expired identity, safe assets, secret path rejection and clear port-collision failure.');
  console.log('No Fish requests, human approvals or browser playback performed by this verification.');
} finally {
  for (const instance of [primary, collision]) if (instance && instance.child.exitCode === null) {
    instance.child.kill('SIGTERM');
    await new Promise(resolve => { instance.child.once('exit', resolve); setTimeout(resolve, 1000).unref(); });
  }
}
