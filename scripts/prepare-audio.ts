import { Effect, Layer, ManagedRuntime } from 'effect';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFile } from 'node:fs/promises';
import { readConfig } from '../server/config';
import { ClipStore, clipStoreLayer } from '../server/ClipStore';
import { FishProvider, fishLayer } from '../server/FishProvider';
import { compile, directions, scenes } from '../server/requestSpec';
import { makeCatalog, matches } from '../server/catalog';
import { lineIds, type LineId } from '../shared/contracts';
import { verifyHostReview } from '../server/hostReview';

const [command, ...args] = process.argv.slice(2);
function flag(name: string) { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }
const config = readConfig();
const runtime = ManagedRuntime.make(Layer.merge(clipStoreLayer(config), fishLayer(config)));
try {
  await runtime.runPromise(Effect.gen(function* () {
    const store = yield* ClipStore;
    if (command === 'check') {
      const catalog = makeCatalog(config.voice, store.prepared());
      for (const warning of store.diagnostics()) console.log('Warning:', warning);
      if (catalog.configurationMessage) console.log(catalog.configurationMessage);
      for (const scene of catalog.scenes) {
        console.log(`${scene.id} / revision ${scene.revision}: ${scene.qualified ? 'QUALIFIED PACK (host approvals recorded; rehearsal still required)' : 'NOT QUALIFIED'}`);
        for (const item of scene.missing) console.log(`  Missing ${item}`);
        for (const line of scene.lines) if (line.baselineTake) console.log(`  baseline ${line.id}: ${line.baselineTake.id}`);
        for (const take of scene.alternatives) console.log(`  alternate ${take.lineId}/${take.directionId}: ${take.id}`);
      }
      if (!catalog.scenes.some(s => s.qualified)) process.exitCode = 1;
      return;
    }
    if (command === 'approve' || command === 'reject') {
      const id = flag('--take');
      const take = store.all().find(t => t.id === id);
      if (!take) throw new Error('Use --take <existing take UUID>.');
      const scene = scenes.find(s => s.id === take.sceneId);
      if (command === 'approve') {
        if (!scene || !config.voice || !matches(take, compile(scene, take.lineId, take.directionId, config.voice).binding)) throw new Error('Take does not match the current canonical voice/revisions/request.');
        if (take.origin !== 'fish-api') throw new Error('Fixtures cannot be approved.');
        console.log(`Review ${id}: ${scene.lines.find(l => l.id === take.lineId)?.text}`);
        console.log('Human review required: exact words, no spoken directions, audibility, stable voice and meaningful contrast. Test the assembled scene too.');
        const reviewFile = flag('--review-file');
        if (reviewFile) {
          const evidence = yield* Effect.tryPromise(async () => {
            try { return JSON.parse(await readFile(reviewFile, 'utf8')); }
            catch { throw new Error('Host review file is missing or invalid. No approval recorded.'); }
          });
          verifyHostReview(evidence, take);
          console.log('Recording explicit host decision from the supplied review file.');
        } else {
          if (!stdin.isTTY) throw new Error('Use an interactive terminal or an explicit host review file (--review-file). No approval recorded.');
          const answer = yield* Effect.tryPromise(async () => {
            const prompt = createInterface({ input: stdin, output: stdout });
            try { return await prompt.question(`After listening, type "approve ${id}" to record your approval: `); }
            finally { prompt.close(); }
          });
          if (answer !== `approve ${id}`) throw new Error('Approval not recorded.');
        }
      }
      const reviewed = yield* store.review(take.id, command === 'approve' ? 'approved' : 'rejected');
      console.log(`${reviewed.id}: ${reviewed.review}. Restart the local server to load the updated pack.`);
      return;
    }
    if (command !== 'generate') throw new Error('Commands: generate --scene <id> --max-calls <n> [--line <line_id> --direction <card|baseline>]; approve --take <id>; reject --take <id>; check');
    const maxCalls = Number(flag('--max-calls'));
    if (!Number.isSafeInteger(maxCalls) || maxCalls < 1) throw new Error('An explicit positive integer --max-calls is required. It caps outbound attempts, including failures.');
    if (!config.voice || !config.key || !config.liveEnabled) throw new Error('Configure the permitted FISH_VOICE_ID, FISH_API_KEY and LIVE_GENERATION_ENABLED=true after authorizing spending. No call made.');
    const scene = scenes.find(s => s.id === flag('--scene'));
    if (!scene) throw new Error('Unknown --scene.');
    const fish = yield* FishProvider;
    const eligible = lineIds.filter(id => id !== scene.protectedLineId);
    const line = flag('--line'); const direction = flag('--direction');
    if (!!line !== !!direction) throw new Error('Supply --line and --direction together.');
    if (line && (!lineIds.includes(line as LineId) || !['baseline', ...directions.map(d => d.id)].includes(direction!))) throw new Error('Invalid line or direction.');
    if (line === scene.protectedLineId && direction !== 'baseline') throw new Error('Protected lines only have baselines.');
    // Hear a representative contrast first; do not multiply all four cards by default.
    const pairs: [LineId, string][] = line ? [[line as LineId, direction!]] : [
      [eligible[1], 'baseline'], [eligible[1], scene.id === 'galactic_gala' ? 'quiet_conviction' : 'thin_confidence'],
      [eligible[0], 'baseline'], [eligible[0], scene.id === 'galactic_gala' ? 'quiet_conviction' : 'hidden_delight'], [scene.protectedLineId, 'baseline'],
    ];
    let attempts = 0;
    for (const [lineId, directionId] of pairs) {
      const { binding, request } = compile(scene, lineId, directionId, config.voice);
      if (!line && store.prepared().some(t => matches(t, binding))) { console.log(`Already approved: ${lineId}/${directionId}`); continue; }
      if (attempts >= maxCalls) break;
      attempts++;
      console.log(`Attempt ${attempts}/${maxCalls}: ${scene.id}/${lineId}/${directionId} model=drama-3`);
      const result = yield* fish.synthesize(request).pipe(Effect.flatMap(bytes => store.save(binding, request, bytes)),
        Effect.map(take => ({ ok: true as const, take })), Effect.catchTag('ApiFailure', error => Effect.succeed({ ok: false as const, error })));
      if (!result.ok) {
        console.log(`${result.error.code}: ${result.error.message}`);
        console.log('Stopped after the failed attempt; no automatic retry.'); process.exitCode = 1; break;
      }
      console.log(`Unreviewed Fish take ${result.take.id}`);
      console.log(`Listen: ${resolve(config.dataDir, 'generated', result.take.id + '.mp3')}`);
      console.log(`Approve only after human listening: npm run audio -- approve --take ${result.take.id}`);
    }
    console.log(`Outbound attempts: ${attempts}. No take was automatically approved.`);
  }));
} catch (error) {
  // Never print arbitrary provider exceptions, requests or credentials.
  console.error(error instanceof Error && !error.message.includes('Bearer ') ? error.message : 'Audio preparation failed. Check local configuration.');
  process.exitCode = 1;
} finally { await runtime.dispose(); }
