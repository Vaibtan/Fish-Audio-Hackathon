import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioController, type MediaClip } from '../src/audio/AudioController';

function controller(play: () => Promise<void> = () => Promise.resolve()) {
  const media: MediaClip[] = [];
  const controller = new AudioController(() => { const clip: MediaClip = { src: '', loop: true, volume: 0, onended: null, onerror: null, play, pause() {} }; media.push(clip); return clip; }, 150);
  return { controller, media };
}
const flush = () => Promise.resolve();
const event = new Event('ended');
afterEach(() => { vi.useRealTimers(); });
describe('F — media controller', () => {
  it('waits for each actual ended event and the fixed gap before completing the three-clip tuple', async () => {
    vi.useFakeTimers(); const h = controller(); let settled = false;
    const result = h.controller.play(['one', 'two', 'three']).then(outcome => { settled = true; return outcome; });
    await flush(); expect(h.media).toHaveLength(1); expect(h.media[0].loop).toBe(false);
    await vi.advanceTimersByTimeAsync(5000); expect(settled).toBe(false);
    h.media[0].onended!(event); await vi.advanceTimersByTimeAsync(149); expect(h.media).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1); expect(h.media[1].src).toBe('two');
    h.media[1].onended!(event); await vi.advanceTimersByTimeAsync(150); expect(h.media[2].src).toBe('three');
    h.media[2].onended!(event); expect(await result).toBe('complete');
  });
  it('a rejected play promise fails without completion or advancing', async () => {
    const h = controller(() => Promise.reject(new Error('autoplay blocked')));
    expect(await h.controller.play(['one','two'])).toBe('failed'); expect(h.media).toHaveLength(1);
  });
  it('a mid-sequence media error fails and clears callbacks', async () => {
    vi.useFakeTimers(); const h = controller(); const result = h.controller.play(['one','two','three']);
    await flush(); h.media[0].onended!(event); await vi.advanceTimersByTimeAsync(150);
    h.media[1].onerror!(new Event('error')); expect(await result).toBe('failed'); expect(h.media).toHaveLength(2);
    expect(h.media[1].onended).toBeNull();
  });
  it('Stop settles a pending play promise and late fulfillment/ended cannot complete a new run', async () => {
    let resolvePlay: () => void = () => {};
    const h = controller(() => new Promise(resolve => { resolvePlay = resolve; }));
    const old = h.controller.play(['old']); const ended = h.media[0].onended!;
    h.controller.stop(); expect(await old).toBe('cancelled'); resolvePlay(); ended(event); await flush();
    const current = h.controller.play(['new']); const newMedia = h.media[1]; ended(event);
    resolvePlay(); await flush(); newMedia.onended!(event); expect(await current).toBe('complete');
  });
  it('Stop during a gap cancels the timer and never starts the next clip', async () => {
    vi.useFakeTimers(); const h = controller(); const result = h.controller.play(['one','two']);
    await flush(); h.media[0].onended!(event); h.controller.stop(); expect(await result).toBe('cancelled');
    await vi.advanceTimersByTimeAsync(1000); expect(h.media).toHaveLength(1);
  });
  it('global volume applies to current and subsequent clips', async () => {
    const h = controller(); const result = h.controller.play(['one']); h.controller.setVolume(0.25);
    expect(h.media[0].volume).toBe(0.25); await flush(); h.media[0].onended!(event); await result;
    const second = h.controller.play(['two']); expect(h.media[1].volume).toBe(0.25); h.controller.stop(); await second;
  });
});
