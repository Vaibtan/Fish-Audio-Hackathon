# Dub Saboteur verification

Date: 24 October 2026. Authority: [implementation specification](specs/dub-saboteur.md). No commit, publication or deployment performed. Existing skills, configuration, specification and historical handoff preserved.

## Current outcome

- P0 application code exists: React/TypeScript/Vite game, Effect v4 HTTP server, scoped live jobs, immutable auditions, fallback, blind listener, playback controller, scoring/reveal and audio utility.
- Technical evidence: **62/62 tests pass across 9 files**; client/server/scripts/tests typecheck; production client/server build passes; built HTTP/assets/API, real prepared auditions, process restart and port-collision checks pass.
- Real Fish synthesis: the original seven documented calls plus **11 successful calls for the additional scenes**, using the actual `model: drama-3` header and host-selected Delia voice. Disk currently holds 19 Fish output sidecars, including an additional unreviewed Cake draft outside the original seven-call report. No draft is silently promoted. Header evidence proves requested model selection, not independently verified backend identity.
- Prepared scenes: **The Cake Invitation**, **The Extremely Normal Exhibition**, and **The Galactic Gala**, revision 1, each have three approved baselines and one approved alternate per eligible line. All 15 current pack files persist locally and the pack check passes. Rejected historical alternatives are excluded.
- Human audio evidence: host listened to and approved the original clips, identified a problem with the first line-1 alternate in full context, then approved the replacement take and its assembled scene. These are explicit human decisions, not agent approvals or audio-model judgments.
- Built browser acceptance passed for Cake and both additional scenes, with actual media completion and saved auditions on an isolated keyless server. A full round/replay/reveal passed with external browser HTTP(S) denied and localhost allowed; another cached round completed after the isolated server was stopped. Independent human listener, physical offline rehearsal and two venue/headphone rehearsals remain pending; complete demo readiness is not claimed.

The running local app is at **http://127.0.0.1:3001**. `npm start` is the one-command startup after installation/build. Live generation is configured; choose saved auditions for the disclosed prepared demonstration.

## Toolchain and commands

Actually used: Node `v22.23.1` LTS, npm `10.9.8`; exact `effect@4.0.6` and `@effect/platform-node@4.0.6` pins. The user authorized an unlimited synthesis budget and the Delia voice `c70cfb98867a4bfb9ae20d2401257b92`; no authorization was inferred from key availability. Credentials stay in ignored `.env` and server memory.

| Check | Observed result |
| --- | --- |
| `npm install` | Completed; lockfile created. |
| `npm run typecheck` | Passed for client, server, scripts and tests. |
| `npm test` | 62/62 passed across 9 files. |
| `npm run build` | Passed: Vite client in `dist`, bundled ESM server in `dist-server`. |
| `npm start` | Built frontend and API listen together on loopback port 3001. |
| `npm run dev` | Both services start; Vite on 5173 proxies `/api` to 3001. Node watch + tsx import hook works; tsx CLI watch stalled on this Windows toolchain and was replaced. |
| `npm run audio -- check` | All three scenes qualify, with 15 approved current take IDs in the manifest. |
| `npm run verify:built` | Expanded to check every qualified scene: two different-line slots, duplicates, third-slot rejection, all five assets per scene, expired round after process restart, all surviving packs, secret-path rejection and nonzero port-collision failure pass. Test server has live disabled; this command makes zero Fish calls. Earlier optional take-ID check also verified immutable byte hash. |
| Live HTTP render and identical retrieval | Registered actual Cake round; live POST returned a new unreviewed take. Repeating identical UUID/body returned the same take/slot with no reroll. See [exact public response](evidence/2026-10-24-live-http.json). |
| Real audio bytes | ffprobe identifies mono 44100 Hz MP3; ffmpeg complete decoding succeeds. Source/hash metadata is retained; no decoder result is treated as human approval. |
| Secret checks | Actual API key absent from built client JavaScript. Health/catalog omit credentials; `/.env` returns 404. |
| `npm audit` | Zero known vulnerabilities after esbuild `0.28.2` is used throughout the development toolchain. |

The new official `fish-audio-api` skill was checked before real synthesis. The SDK skill was inspected, but this app retains the specification’s direct REST adapter without an SDK dependency or SDK retry behavior.

## Real content and human decisions

Every row below is actual Fish API output with scene/card revision 1, authorized Delia voice and requested model `drama-3`. The exact compiled request, signature and audio hash are in each sidecar.

| Take ID | Input | Current review/use | Duration / bytes |
| --- | --- | --- | --- |
| `adb3d863-d625-4597-b5cb-3c86bf0ffe03` | Cake `line_1`, baseline | Approved; prepared baseline | 2.559938s / 40959 |
| `6ec49af2-3342-4693-8152-85fafebbbe50` | Cake `line_2`, baseline | Approved; house-protected baseline | 2.141938s / 34271 |
| `e60861a4-62b0-44bd-88f7-dacc3a17886b` | Cake `line_3`, baseline | Approved; prepared baseline | 1.933s / 30928 |
| `27024880-4c55-4a1a-bd94-e6859b1fe30b` | Cake `line_3`, `thin_confidence` | Approved; prepared default | 2.141938s / 34271 |
| `47cde982-3ce0-457d-816f-c33e2b073f10` | Cake `line_1`, `hidden_delight` | Approved replacement; prepared default | 2.716625s / 43466 |
| `4dfd26c5-99a1-4be4-ae8b-ed1f89ba9cd6` | Cake `line_1`, `hidden_delight` | Rejected after full-scene feedback; excluded from manifest/defaults | 2.664375s / 42630 |
| `68fa5a09-2a3b-4d6e-a5be-7d0def50889a` | Cake `line_1`, `hidden_delight` | Live HTTP smoke draft; unreviewed, not in pack | 2.664375s / 42630 |

Original documented outbound attempts were: initial preparation `--max-calls 2`; remaining minimum preparation `--max-calls 3`; explicit same-card replacement `--max-calls 1`; one live HTTP audition. All succeeded; no automatic paid-call retry occurred. Duplicate retrieval did not create another take. Additional unreviewed Cake draft `c5f5f934-b17f-4e04-8719-6ef47b01b83c` is present on disk and remains outside the prepared manifest.

### Additional scenes requested by the host

Exhibition required five successful calls. Its line-3 baseline/Thin confidence pair was approved, followed by explicit approval of all clips and both full assembled alterations. Gala required six successful calls: the first line-2 Quiet conviction take was rejected for weak contrast, its replacement was approved, then all clips and both assembled alterations were approved. Assemblies used 150 ms line gaps. Exact take IDs, hashes, signatures and human statements are retained in [Exhibition approval](audio-reviews/2026-10-24-exhibition-assembled.json), [Gala approval](audio-reviews/2026-10-24-gala-assembled.json), and [Gala rejection](audio-reviews/2026-10-24-gala-rejected.json). No automatic approval or paid retry occurred.

The default preparation plan now chooses Quiet conviction on both Gala eligible lines. Exhibition retains Badly hidden delight on line 2 and Thin confidence on line 3. Both new scenes passed actual browser selection, shield, two saved auditions/private playback, neutral listener transcript, complete media playback, action and first-candidate reveal. See [browser evidence](evidence/2026-10-24-additional-scenes-browser.json) and [three-scene screenshot](evidence/browser-three-scenes.png).

Host decisions were recorded only after explicit responses following local `ffplay -nodisp` playback:

- [Initial two-clip approval](audio-reviews/2026-10-24-cake-initial.json).
- [Remaining three-clip approval](audio-reviews/2026-10-24-cake-remaining.json).
- [Assembled scene feedback rejecting the first line-1 alternate](audio-reviews/2026-10-24-cake-assembled-feedback.json), superseding that alternate’s initial approval.
- [Replacement take and assembled scene approval](audio-reviews/2026-10-24-cake-replacement.json).

The terminal tool denied interactive-session creation. The utility therefore supports an explicit host review file bound to take ID, audio hash and render signature, as an alternative to the interactive confirmation phrase. It records the human decision already given; `generate` never reads this evidence or approves anything automatically. Invalid/absent evidence and fixtures cannot be promoted.

Full-scene review used temporary WAV assemblies of the actual three clips with 150 ms gaps: original, line-1 alteration, line-3 alteration, then the replacement line-1 scene. These were audition artifacts in ignored `data/tmp`, not additional provider output or prepared takes. This local player review does not prove browser sequencing.

## Acceptance audit

| Gate | Evidence and limits |
| --- | --- |
| A — Inputs/spending | Registry/HTTP/command tests reject invalid/protected/uncovered/revision-mismatched/override inputs before calls; identical UUIDs share one job; conflicts reject; new UUIDs reroll; two-slot limit and immediate non-consuming busy rejection pass. Same-tick browser command guard and no new audition during playback pass. Real HTTP duplicate retrieval also retained the same take. |
| B — Job lifetime | Actual Node HTTP disconnect test leaves synthesis alive for another waiter. Scope shutdown, closed scope, interruption, operational timeout/failure, shared defects and prepared/live-owner separation pass. External fiber observation settles even an unstarted job interrupted during shutdown. No implicit retry. |
| C — Identity | Different-line candidates, first-candidate selection, immutable frozen tuple and exactly one changed take ID pass. Client indices do not follow server reservation order. |
| D — Fallback | Pending/failed/non-consuming races preserve exact saved adoption; late results cannot erase it. Uncertainty retains UUID; confirmed unused rejection frees only the unused slot. Technical rejection permits fallback; rejected prepared IDs are excluded. |
| E — State/privacy | Reset/new round/commit and obsolete preparation attempts ignore stale events. Projection allowlist and rendered Listener omit private data. Early/invalid/duplicate votes cannot score; either valid action resolves deterministically; void gives no point. |
| F — Audio | Actual-ended sequencing, rejected play, mid-sequence errors, Stop during pending play/gaps/sound activation, stale callbacks, volume, replay completion rules and cache disposal/deduplication pass. Real MP3s decode/play through ffplay and the built browser; initial Stop, replay Stop, full playback and replay allowance passed in the browser. |
| G — Prepared readiness | Bytes/hashes, metadata/request/signatures, voice/revision drift, incomplete pairs and fixture/unreviewed/rejected exclusion are tested. All three actual five-clip host-approved packs pass the same checker. Rejected historical audio stays excluded. |
| H — Built app | Build/start/assets/API and actual prepared two-slot/restart boundaries verified for all scenes. Actual browser first-candidate/handoff/play/replay/double-vote/reveal passed. Full prepared round/replay/reveal passed with external browser HTTP(S) denied and localhost available. Actual cached committed round completed after isolated server shutdown, using blob URLs only. Physical internet-disconnected/manual confirmation remains pending. |
| I — Real audio/demo | Real model-header requests, MP3 decode/playability, explicit host clip reviews, replacement iteration and assembled-scene review exist. **Independent listener and two venue/headphone rehearsals remain pending.** |

Earlier Computer Use was unavailable on Windows Firefox. A newly available Playwright connector subsequently enabled built-browser checks on an isolated keyless server at port 3811. [Cake browser evidence](evidence/2026-10-24-browser-acceptance.json) records real media completion, stop/replay rules, private handoff, first candidate identity and single-point double voting. Page errors were absent; earlier favicon 404 console entries were fixed with a local SVG asset. A broad privacy assertion initially matched the legitimate public word “audition” in Gala's context; the check now excludes the exact authored context before checking private fields. The expanded HTTP verifier also needed its restart assertion updated after switching from one scene to all qualified scenes; its corrected run passed. Automated browser checks do not substitute for independent-listener or venue rehearsal evidence.

### External network and stopped-server browser evidence

[External-denial evidence](evidence/2026-10-24-browser-external-denied.json) records a full Exhibition round, successful replay and reveal while the browser context allowed only the isolated loopback origin. An explicit external probe was aborted before transmission; the application requested no external dependency. The server had no API key and live generation was disabled. This verifies the prepared browser path under denied external traffic, without changing machine adapters or claiming a physical venue test. Routing APIs were checked against [official Playwright documentation](https://github.com/microsoft/playwright/blob/main/docs/src/api/class-browsercontext.md).

[Cached stopped-server evidence](evidence/2026-10-24-browser-cached-server-stopped.json) binds the next committed Exhibition round. Isolated Node PID 29928 was verified and stopped; port 3811 no longer listened. The same browser tab completed actual initial playback, voted and reached reveal. The only resource events during completion were three browser-local blob GETs, with no HTTP(S) requests. A too-strict initial helper counted blob events as network traffic; the full connector log and follow-up inspection resolved that assertion error. The reusable helper now filters HTTP(S). Main app port 3001 was left running throughout.

Browser harnesses are source functions for the available Playwright connector, not npm test commands. `scripts/browser-offline.js` prepares the stopped-server test's second round; `scripts/browser-cached-finish.js` documents the corrected completion check. The actual stopped-server evidence comes from the executed flow plus inspected request log and reveal, rather than a claim that a later helper revision was rerun.

## Remaining work

1. Complete the human portions of the [built-app manual acceptance checklist](manual-acceptance.md). Automated built-browser flow now passes.
2. Confirm a physical internet-disconnected prepared run with the local server still running. Automated external-denial and actual cached stopped-server checks now pass.
3. Have an independent listener complete the actual flow. Rehearse the disclosed prepared demo twice using headphones/room audio and record results.
4. Fix any material issue found, then rerun affected checks. Exhibition and Gala were qualified at the host's explicit request before these rehearsal gates were completed.

Custom directions, three-player mode and infrastructure expansion remain cut. Three scenes are qualified. Keep the overall demo goal incomplete until the remaining actual acceptance gates pass.
