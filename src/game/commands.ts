import type { Scene, RenderInput, Take } from '../../shared/contracts';
import { api } from '../api/client';
import { AudioController } from '../audio/AudioController';
import { ClipCache } from '../audio/ClipCache';
import { tupleKey } from './reducer';
import type { Event, GameState, Purpose } from './types';

export class GameCommands {
  private guards = new Set<string>();
  constructor(private get: () => GameState, private send: (event: Event) => void,
    readonly audio: AudioController, readonly cache: ClipCache, private notify: (message: string) => void) {}
  newRound(scene: Scene, saboteurId: string, listenerId: string) {
    this.stop();
    const actionOrder = scene.actions.map(a => a.id);
    if (crypto.getRandomValues(new Uint8Array(1))[0] % 2) actionOrder.reverse();
    this.send({ type: 'NEW_ROUND', id: crypto.randomUUID(), scene, saboteurId, listenerId, actionOrder });
  }
  reset() { this.stop(); this.send({ type: 'RESET' }); }
  stop() {
    const r = this.get().round;
    this.audio.stop(); this.cache.stopSoundCheck();
    if (r?.playback) this.send({ type: 'PLAY_FINISH', roundId: r.id, runId: r.playback.runId, outcome: 'cancelled' });
  }
  async register() {
    const r = this.get().round;
    if (!r || r.phase !== 'protect' || this.guards.has('register')) return;
    this.guards.add('register'); this.send({ type: 'REGISTER_START', roundId: r.id });
    try {
      await api.register({ roundId: r.id, gameMode: 'house', sceneId: r.scene.id, sceneRevision: r.scene.revision, protectedLineId: r.protectedLineId });
      this.send({ type: 'REGISTERED', roundId: r.id });
    } catch (e) { this.send({ type: 'REGISTER_FAILED', roundId: r.id, message: e instanceof Error ? e.message : 'Registration failed.' }); }
    finally { this.guards.delete('register'); }
  }
  async audition(input: RenderInput) {
    const r = this.get().round;
    const guard = 'audition:' + input.mode;
    if (!r || r.phase !== 'sabotage' || r.playback || r.slots.length >= 2 || this.guards.has(guard)) return;
    const id = crypto.randomUUID();
    this.send({ type: 'RESERVE', roundId: r.id, id, input });
    if (!this.get().round?.slots.some(s => s.id === id)) return;
    this.guards.add(guard);
    try { await this.request(r.id, id, input); } finally { this.guards.delete(guard); }
  }
  private async request(roundId: string, id: string, input: RenderInput) {
    try {
      const response = await api.render(roundId, id, input);
      this.send({ type: 'RESPONSE', roundId, response });
      if (response.code && this.get().round?.id === roundId && this.get().round?.phase === 'sabotage') this.notify(response.message ?? 'Audition failed.');
    } catch {
      this.send({ type: 'UNCERTAIN', roundId, id });
      if (this.get().round?.id === roundId && this.get().round?.phase === 'sabotage') this.notify('The request outcome is uncertain. Keep this slot; retrieve the same request or choose its saved substitute.');
    }
  }
  async retrieve(id: string) {
    const r = this.get().round; const slot = r?.slots.find(s => s.id === id);
    if (!r || r.phase !== 'sabotage' || !slot || this.guards.has(id)) return;
    this.guards.add(id);
    try { await this.request(r.id, id, slot.input); } finally { this.guards.delete(id); }
  }
  fallback(id: string) {
    this.stop(); const r = this.get().round; const slot = r?.slots.find(s => s.id === id);
    if (r && slot) this.send({ type: 'FALLBACK', roundId: r.id, id, takeId: slot.expected.id });
  }
  async commit() {
    this.stop(); const r = this.get().round;
    if (!r || r.phase !== 'sabotage') return;
    this.send({ type: 'COMMIT', roundId: r.id });
    await this.prepare();
  }
  async prepare() {
    const r = this.get().round;
    if (!r?.frozenTuple || !['handoff', 'listen', 'decide'].includes(r.phase)) return;
    const key = tupleKey(r.frozenTuple);
    const preparationId = crypto.randomUUID();
    this.send({ type: 'PREPARING', roundId: r.id, tupleKey: key, preparationId });
    try { await this.cache.prepare(r.frozenTuple); this.send({ type: 'PREPARED', roundId: r.id, tupleKey: key, preparationId }); }
    catch { this.send({ type: 'PREPARE_FAILED', roundId: r.id, tupleKey: key, preparationId }); }
  }
  async play(purpose: Purpose, takes?: readonly Take[], slotId?: string) {
    const r = this.get().round;
    if (!r || r.playback) return;
    const clips = purpose === 'initial' || purpose === 'replay' ? r.frozenTuple : takes;
    if (!clips) return;
    const runId = crypto.randomUUID();
    this.send({ type: 'PLAY_START', roundId: r.id, runId, purpose, slotId });
    if (this.get().round?.playback?.runId !== runId) return;
    let outcome: 'complete' | 'failed' | 'cancelled' = 'failed';
    try {
      await this.cache.activate();
      if (this.get().round?.id !== r.id || this.get().round?.playback?.runId !== runId) return;
      const urls = await this.cache.prepare(clips);
      if (this.get().round?.id !== r.id || this.get().round?.playback?.runId !== runId) return;
      outcome = await this.audio.play(urls);
    } catch { outcome = 'failed'; }
    this.send({ type: 'PLAY_FINISH', roundId: r.id, runId, outcome });
    if (outcome === 'failed' && this.get().round?.id === r.id) this.notify(purpose === 'initial' || purpose === 'replay' ? 'Playback did not finish. Check sound, then start again.' : 'Audio could not play. Check sound or choose a saved substitute.');
  }
}
