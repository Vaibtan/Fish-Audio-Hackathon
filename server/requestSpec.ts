import { createHash } from 'node:crypto';
import scenesJson from '../content/scenes.json';
import directionsJson from '../content/directions.json';
import { lineIds, type LineId } from '../shared/contracts';

export type AuthoredScene = Omit<typeof scenesJson[number], 'lines' | 'protectedLineId'> & {
  lines: { id: LineId; text: string }[]; protectedLineId: LineId;
};
export const scenes: AuthoredScene[] = scenesJson.map(scene => {
  if (scene.lines.length !== 3 || !lineIds.every(id => scene.lines.filter(line => line.id === id).length === 1)
    || scene.actions.length !== 2 || new Set(scene.actions.map(a => a.id)).size !== 2
    || !scene.actions.some(a => a.id === scene.defenderGoal) || !lineIds.includes(scene.protectedLineId as LineId)) {
    throw new Error('Invalid authored scene: ' + scene.id);
  }
  return scene as AuthoredScene;
});
export const directions = directionsJson;
if (directions.some(d => d.id === 'baseline') || new Set(directions.map(d => d.id)).size !== directions.length) throw new Error('Invalid authored cards.');
export type RequestSpec = {
  url: 'https://api.fish.audio/v1/tts'; model: 'drama-3';
  body: { text: string; reference_id: string; format: 'mp3'; latency: 'normal' };
};
export type RenderBinding = {
  sceneId: string; sceneRevision: number; lineId: LineId; directionId: string;
  directionRevision: number; voice: string; requestedModel: 'drama-3'; renderSignature: string;
};
export const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export function compile(scene: AuthoredScene, lineId: LineId, directionId: string, voice: string): { binding: RenderBinding; request: RequestSpec } {
  const line = scene.lines.find(line => line.id === lineId);
  const direction = directionId === 'baseline'
    ? { revision: scene.revision, instruction: scene.baselineDirection }
    : directions.find(d => d.id === directionId);
  if (!line || !direction || !voice) throw new Error('Incomplete canonical render specification.');
  const request: RequestSpec = {
    url: 'https://api.fish.audio/v1/tts', model: 'drama-3',
    body: { text: `[${direction.instruction}] ${line.text}`, reference_id: voice, format: 'mp3', latency: 'normal' },
  };
  return {
    request,
    binding: { sceneId: scene.id, sceneRevision: scene.revision, lineId, directionId,
      directionRevision: direction.revision, voice, requestedModel: 'drama-3', renderSignature: sha256(JSON.stringify(request)) },
  };
}
