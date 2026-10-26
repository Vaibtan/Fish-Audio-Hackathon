import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { Effect, ManagedRuntime } from 'effect';
import { ClipStore, clipStoreLayer, type StoredTake } from '../server/ClipStore';
import { makeCatalog } from '../server/catalog';
import { compile, scenes } from '../server/requestSpec';
import { mp3, simulatedBank, testConfig } from './helpers';
import type { Config } from '../server/config';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const dispose of cleanup.splice(0)) await dispose(); });
async function disk(bank: StoredTake[] = []) {
  const folder = await mkdtemp(join(tmpdir(), 'dub-saboteur-test-'));
  const config: Config = { ...testConfig, dataDir: join(folder, 'data'), manifestPath: join(folder, 'manifest.json') };
  await mkdir(join(config.dataDir, 'prepared'), { recursive: true });
  for (const take of bank) {
    await writeFile(join(config.dataDir, 'prepared', take.id + '.mp3'), mp3);
    await writeFile(join(config.dataDir, 'prepared', take.id + '.json'), JSON.stringify(take));
  }
  await writeFile(config.manifestPath, JSON.stringify({ version: 1, takeIds: bank.map(t => t.id) }));
  function open() {
    const runtime = ManagedRuntime.make(clipStoreLayer(config)); cleanup.push(() => runtime.dispose());
    return runtime;
  }
  return { folder, config, open };
}
describe('G — disk integrity and prepared readiness', () => {
  it('minimum five exact approved records qualify only the matching voice/revision/signatures', () => {
    const bank = simulatedBank(); expect(makeCatalog(testConfig.voice, bank).scenes[0].qualified).toBe(true);
    expect(makeCatalog('a-different-voice', bank).scenes[0].qualified).toBe(false);
    for (const property of ['voice', 'sceneRevision', 'directionRevision', 'renderSignature'] as const) {
      const corrupt = bank.map((take, index) => index === 0 ? { ...take, [property]: property.includes('Revision') ? 99 : 'mismatch' } : take) as StoredTake[];
      expect(makeCatalog(testConfig.voice, corrupt).scenes[0].qualified).toBe(false);
    }
  });
  it('fixture, unreviewed and rejected records never qualify or enable cards', () => {
    for (const review of ['unreviewed', 'rejected'] as const) expect(makeCatalog(testConfig.voice, simulatedBank().map(t => ({ ...t, review }))).scenes[0].qualified).toBe(false);
    const fixtures = simulatedBank().map(t => ({ ...t, origin: 'test-fixture' as const }));
    const scene = makeCatalog(testConfig.voice, fixtures).scenes[0]; expect(scene.qualified).toBe(false); expect(scene.alternatives).toHaveLength(0);
  });
  it('disk reload validates audio hashes and drops corrupt or incomplete assets from coverage', async () => {
    const bank = simulatedBank(); const h = await disk(bank);
    await writeFile(join(h.config.dataDir, 'prepared', bank[0].id + '.mp3'), new Uint8Array(500));
    const orphan = randomUUID(); await writeFile(join(h.config.dataDir, 'prepared', orphan + '.json'), JSON.stringify({ ...bank[1], id: orphan }));
    const runtime = h.open(); const store = await runtime.runPromise(ClipStore);
    expect(store.prepared()).toHaveLength(4); expect(store.diagnostics().some(d => d.includes(bank[0].id))).toBe(true);
    expect(makeCatalog(testConfig.voice, store.prepared()).scenes[0].qualified).toBe(false);
  });
  it('mismatched metadata/request signature and tampered canonical text do not qualify', async () => {
    const bank = simulatedBank(); const h = await disk(bank);
    await writeFile(join(h.config.dataDir, 'prepared', bank[0].id + '.json'), JSON.stringify({ ...bank[0], request: { ...bank[0].request, body: { ...bank[0].request.body, text: 'modified words' } } }));
    const runtime = h.open(); const store = await runtime.runPromise(ClipStore);
    expect(store.prepared()).toHaveLength(4); expect(makeCatalog(testConfig.voice, store.prepared()).scenes[0].qualified).toBe(false);
  });
  it('new audio persists as unreviewed drafts; explicit approval copies to prepared and survives restart', async () => {
    const h = await disk(); const runtime = h.open(); const store = await runtime.runPromise(ClipStore);
    const compiled = compile(scenes[0], 'line_1', 'baseline', testConfig.voice);
    const take = await runtime.runPromise(store.save(compiled.binding, compiled.request, mp3));
    expect(take.review).toBe('unreviewed'); expect(store.prepared()).toHaveLength(0);
    expect(await readFile(join(h.config.dataDir, 'generated', take.id + '.mp3'))).toEqual(Buffer.from(mp3));
    // Exercise persistence of a simulated explicit review, not human approval of this fixture tone.
    await runtime.runPromise(store.review(take.id, 'approved'));
    const reload = h.open(); const loaded = await reload.runPromise(ClipStore);
    expect(loaded.prepared().map(t => t.id)).toEqual([take.id]);
    expect(new Uint8Array(await reload.runPromise(loaded.audio(take.id)))).toEqual(mp3);
    await reload.runPromise(loaded.review(take.id, 'rejected'));
    const again = h.open(); expect((await again.runPromise(ClipStore)).prepared()).toHaveLength(0);
  });
  it('disk fixtures cannot be approved, and asset paths are never accepted as take IDs', async () => {
    const bank = simulatedBank().map(t => ({ ...t, origin: 'test-fixture' as const })); const h = await disk(bank);
    const runtime = h.open(); const store = await runtime.runPromise(ClipStore);
    expect(store.prepared()).toHaveLength(0);
    expect((await runtime.runPromiseExit(store.review(bank[0].id, 'approved')))._tag).toBe('Failure');
    expect((await runtime.runPromiseExit(store.audio('../manifest.json')))._tag).toBe('Failure');
  });
});
