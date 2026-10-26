import type { Catalog, Scene, Take } from '../shared/contracts';
import { publicTake, type StoredTake } from './ClipStore';
import { compile, directions, scenes, type RenderBinding } from './requestSpec';

export function matches(take: Take, binding: RenderBinding): boolean {
  return take.sceneId === binding.sceneId && take.sceneRevision === binding.sceneRevision
    && take.lineId === binding.lineId && take.directionId === binding.directionId
    && take.directionRevision === binding.directionRevision && take.voice === binding.voice
    && take.requestedModel === binding.requestedModel && take.renderSignature === binding.renderSignature;
}
export function makeCatalog(voice: string, prepared: StoredTake[]): Catalog {
  const approved = prepared.filter(t => t.origin === 'fish-api' && t.review === 'approved');
  return {
    directions: directions.map(({ id, revision, label }) => ({ id, revision, label })),
    configurationMessage: voice ? null : 'Host setup required: set FISH_VOICE_ID to a permitted voice, then prepare and approve a pack.',
    scenes: scenes.map(scene => {
      const missing: string[] = [];
      const alternatives: Take[] = [];
      const find = (lineId: typeof scene.protectedLineId, directionId: string) => {
        if (!voice) return null;
        const { binding } = compile(scene, lineId, directionId, voice);
        const take = approved.find(t => matches(t, binding));
        return take ? publicTake(take) : null;
      };
      const lines = scene.lines.map(line => {
        const baselineTake = find(line.id, 'baseline');
        if (!baselineTake) missing.push(`${line.id}: approved baseline`);
        if (line.id !== scene.protectedLineId) {
          const covered = directions.flatMap(card => { const t = find(line.id, card.id); return t ? [t] : []; });
          alternatives.push(...covered);
          if (!covered.length) missing.push(`${line.id}: approved alternate`);
        }
        return { ...line, baselineTake };
      });
      return { id: scene.id, revision: scene.revision, title: scene.title, context: scene.context, voice,
        lines, actions: scene.actions, defenderGoal: scene.defenderGoal, protectedLineId: scene.protectedLineId,
        qualified: missing.length === 0, missing, alternatives } satisfies Scene;
    }),
  };
}
