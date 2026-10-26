import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipCache } from '../src/audio/ClipCache';
import { simulatedTake, mp3 } from './helpers';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup() {
  let decoded = 0; let requests = 0; let online = true; let release: (() => void) | null = null;
  const revoked: string[] = [];
  class TestContext {
    async resume() {}
    async close() {}
    async decodeAudioData() { decoded++; if (release) await new Promise<void>(resolve => { release = resolve; }); return {}; }
  }
  vi.stubGlobal('AudioContext', TestContext);
  vi.stubGlobal('fetch', async () => { requests++; if (!online) throw new Error('offline'); return new Response(mp3); });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test-' + decoded);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(url => { revoked.push(url); });
  const cache = new ClipCache();
  return { cache, decoded: () => decoded, requests: () => requests, revoked, offline: () => { online = false; },
    hold: () => { release = () => {}; }, release: () => release?.() };
}
describe('F/H — immutable decoded cache', () => {
  it('global Stop during pending sound activation prevents a late test tone', async () => {
    let resume: () => void = () => {}; let oscillators = 0;
    class TestContext {
      resume() { return new Promise<void>(resolve => { resume = resolve; }); }
      async close() {}
      createOscillator() { oscillators++; throw new Error('must not start'); }
    }
    vi.stubGlobal('AudioContext', TestContext);
    const cache = new ClipCache(); const pending = cache.soundCheck(0.5);
    cache.stopSoundCheck(); resume(); await pending;
    expect(oscillators).toBe(0); cache.dispose();
  });
  it('concurrent preparation deduplicates fetch/decode by take ID and cached committed clips survive server loss', async () => {
    const h = setup(); await h.cache.activate();
    const takes = [simulatedTake('line_1', 'baseline'), simulatedTake('line_2', 'baseline'), simulatedTake('line_3', 'thin_confidence')];
    const [a, b] = await Promise.all([h.cache.prepare(takes), h.cache.prepare(takes)]);
    expect(a).toEqual(b); expect(h.requests()).toBe(3); expect(h.decoded()).toBe(3);
    h.offline(); expect(await h.cache.prepare(takes)).toEqual(a); expect(h.requests()).toBe(3);
    h.cache.dispose(); expect(h.revoked).toEqual(a);
  });
  it('a stale decode after disposal never publishes an object URL into a fresh session', async () => {
    const h = setup(); await h.cache.activate(); h.hold();
    const pending = h.cache.prepare([simulatedTake('line_1','baseline')]);
    await vi.waitFor(() => expect(h.decoded()).toBe(1)); h.cache.dispose(); h.release();
    await expect(pending).rejects.toThrow('Session cache was disposed.'); expect(h.revoked).toHaveLength(0);
  });
});
