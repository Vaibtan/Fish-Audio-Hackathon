export interface MediaClip {
  src: string; loop: boolean; volume: number;
  onended: ((event: Event) => void) | null; onerror: ((event: Event) => void) | null;
  play: () => Promise<void>; pause: () => void;
}
export type PlaybackOutcome = 'complete' | 'cancelled' | 'failed';
export class AudioController {
  private generation = 0;
  private media: MediaClip | null = null;
  private cancel: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private volume = 0.75;
  constructor(private createMedia: () => MediaClip = () => new Audio(), private gapMs = 150) {}
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.media) this.media.volume = this.volume;
  }
  private release() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.media) {
      this.media.onended = null; this.media.onerror = null;
      this.media.pause(); this.media.src = '';
      this.media = null;
    }
  }
  stop() {
    this.generation++;
    this.release();
    const cancel = this.cancel; this.cancel = null;
    cancel?.();
  }
  play(urls: readonly string[]): Promise<PlaybackOutcome> {
    this.stop();
    if (!urls.length) return Promise.resolve('failed');
    const run = this.generation;
    return new Promise(resolve => {
      let settled = false;
      const current = () => !settled && this.generation === run;
      const finish = (outcome: PlaybackOutcome) => {
        if (settled) return;
        settled = true;
        if (this.generation === run) { this.release(); this.cancel = null; }
        resolve(outcome);
      };
      this.cancel = () => finish('cancelled');
      const playClip = (index: number) => {
        if (!current()) return;
        let media: MediaClip;
        try { media = this.createMedia(); } catch { finish('failed'); return; }
        this.media = media;
        media.loop = false; media.volume = this.volume; media.src = urls[index];
        let started = false; let ended = false; let advanced = false;
        const advance = () => {
          if (!current() || this.media !== media || !started || !ended || advanced) return;
          advanced = true;
          this.release();
          if (index === urls.length - 1) finish('complete');
          else this.timer = setTimeout(() => { if (current()) playClip(index + 1); }, this.gapMs);
        };
        media.onended = () => { if (current() && this.media === media) { ended = true; advance(); } };
        media.onerror = () => { if (current() && this.media === media) finish('failed'); };
        try {
          void media.play().then(() => { if (current() && this.media === media) { started = true; advance(); } }, () => { if (current() && this.media === media) finish('failed'); });
        } catch { finish('failed'); }
      };
      playClip(0);
    });
  }
}
