import type { Take } from '../../shared/contracts';
export class ClipCache {
  private urls = new Map<string, string>();
  private pending = new Map<string, Promise<string>>();
  private epoch = 0;
  private context: AudioContext | null = null;
  private soundGeneration = 0;
  private sound: { oscillator: OscillatorNode; gain: GainNode; timer: ReturnType<typeof setTimeout> } | null = null;
  async activate() {
    this.context ??= new AudioContext();
    await this.context.resume();
  }
  async soundCheck(volume: number) {
    this.stopSoundCheck();
    const run = this.soundGeneration;
    await this.activate();
    if (run !== this.soundGeneration) return;
    const context = this.context!;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine'; oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.12, context.currentTime + 0.04);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    this.sound = { oscillator, gain, timer: setTimeout(() => this.stopSoundCheck(), 550) };
  }
  stopSoundCheck() {
    this.soundGeneration++;
    if (this.sound) {
      clearTimeout(this.sound.timer); this.sound.oscillator.stop(); this.sound.oscillator.disconnect(); this.sound.gain.disconnect(); this.sound = null;
    }
  }
  async prepare(takes: readonly Take[]): Promise<string[]> { return Promise.all(takes.map(t => this.load(t))); }
  private load(take: Take): Promise<string> {
    const cached = this.urls.get(take.id);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(take.id);
    if (pending) return pending;
    const epoch = this.epoch;
    const promise = (async () => {
      if (!this.context) throw new Error('Activate sound first.');
      const response = await fetch(take.audioUrl, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('Audio is unavailable.');
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength || buffer.byteLength > 2 * 1024 * 1024) throw new Error('Invalid audio size.');
      await this.context.decodeAudioData(buffer.slice(0));
      if (this.epoch !== epoch) throw new Error('Session cache was disposed.');
      const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      this.urls.set(take.id, url);
      return url;
    })();
    this.pending.set(take.id, promise);
    void promise.finally(() => { if (this.epoch === epoch) this.pending.delete(take.id); }).catch(() => undefined);
    return promise;
  }
  dispose() {
    this.epoch++;
    this.stopSoundCheck();
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear(); this.pending.clear();
    void this.context?.close(); this.context = null;
  }
}
