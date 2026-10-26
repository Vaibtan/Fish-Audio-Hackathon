# Dub Saboteur — implementation specification

Status: ready for implementation; application and audio qualification not yet performed.  
Decision date: 24 October 2026. Budget: approximately three hours, including verification and rehearsal.

## 1. Authority and outcome

This is the authoritative implementation specification. It supersedes [the reviewed handoff](../../dub-saboteur-codex-handoff.md), which remains historical design context. Do not combine its deferred features with this scope. Follow repository instructions and preserve unrelated work. Creating this specification does not start implementation.

Repository snapshot: only a minimal README, the handoff and local agent skills existed during review; no application, package manifest, tests or approved audio pack existed. All application paths below are proposed. Inspect the workspace before implementation in case that has changed.

Build a local two-person game demonstrating Fish Audio Drama 3: **“Same words. Different delivery. Can you steer their decision?”** One person directs a replacement performance of one line; an independent listener hears the assembled scene and chooses an action. The house supplies the defender, baseline and protected line.

The listener does not make a baseline vote. A win means their action matched the saboteur's objective; it does not prove that their mind changed. There is no emotion detection, deception detection or AI audio judge.

## 2. Scope and user experience

**P0:** one qualified scene, two eligible target lines, four authored card labels with availability driven by prepared coverage, two auditions, private headphone preview, explicit listener handoff, one-line replacement, one successful full replay, deterministic scoring, before/after reveal, live Fish integration, prepared offline play, preparation utility and focused verification.

**Optional, in order:** qualify a second scene; then consider a short custom direction field only after P0 verification and with rehearsal time protected. Custom directions require a small contract amendment for validation, immutable identity and explicit failure recovery before coding. They have no guaranteed matching fallback; never label a saved card performance as obeying a custom instruction. Omission is acceptable.

**Excluded:** three-person mode and its tests/screens, competitive match rotation, remote rooms, accounts, public hosting, databases, queues, WebSockets/WebRTC, microphones, voice cloning, STT, LLMs, agent frameworks, waveform editing, inpainting and arbitrary script editing. Do not build disabled future-mode UI.

| Person | Need and visible behavior |
| --- | --- |
| Saboteur | Sees goal, baseline, shield, eligible lines, available cards and two immutable audition slots; previews privately and commits one usable take. |
| Listener | Receives neutral context, unchanged transcript, playback controls and two semantic action labels; sees no goal ownership, shield, card, changed-line marker, audition count or provenance before voting. |
| Host | Configures a permitted voice/key, prepares and reviews audio, runs a sound check, resets/voids broken rounds, and sees accurate live/prepared status. |

Use a compact theatre/studio visual style: dark background, cream text, one accent, readable cards, clear private/listener screens. Include keyboard focus, explicit sound activation, volume and global Stop. Setup sound check uses an unrelated sample, never an upcoming scene's baseline. Private audio stops before handoff. The listener looks away and cannot hear private auditions; use headphones and keep private controls off audience displays.

The listener component receives an allowlisted projection, not private fields hidden with CSS. This protects ordinary pass-the-laptop play, not browser-memory inspection. The browser remains authoritative for game progression.

## 3. Round rules and state

Flow: `setup → protect/register → sabotage → handoff → listen → decide → reveal → setup`.

1. Start a qualified scene containing exactly three fixed lines and two distinct actions. The house automatically protects its authored line. Show that shield to the saboteur.
2. Register the round before permitting auditions. Failed registration stays at protection with retry; do not spend a slot.
3. Saboteur targets either unprotected line and chooses an enabled card. Each round has two slots, each allowing at most one Fish call. A second live audition is a fresh call even for identical inputs.
4. Slot identity is immutable: round, request/slot ID, index, scene/revision, line, card/revision and effective voice. Changing editor controls never changes an existing candidate.
5. Live audio requires private listening and explicit acceptance for intact words/audibility. Strategically disappointing but technically valid delivery still consumes its audition. Human rejection is for omitted/added words, spoken directions, corruption or inaudibility.
6. Commit only a ready, accepted candidate. Copy the three baseline take IDs and replace exactly the selected candidate's original line. Freeze this tuple, stop preview and invalidate generation-result adoption.
7. Listener explicitly accepts handoff, then starts playback. Voting requires one complete initial scene playback, phase `decide`, no active playback and a valid action ID.
8. Allow one additional successful full replay of the same tuple. Stopping/failing the initial listen leaves voting locked. Stopping/failing a replay returns to decide without consuming that replay allowance; repeated partial attempts are intentionally allowed.
9. Record at most one result per round ID. Defender wins if the chosen action equals the scene's defender goal; otherwise saboteur wins. Listener gets no point. Derive scores from results, never increment in callbacks or effects.
10. Reveal goal ownership, winner, changed line/card, new/saved provenance and original-versus-altered line playback. Offer reset or another qualified scene. Prefer fresh scenes for role swaps; label any reused scene as familiar.

Assign action-button order once outside the reducer and retain it. Never use button position to encode role ownership. Void an unrecoverable round without awarding points.

### State contract

Use a pure reducer and selectors. UUID creation, random action ordering, network calls and playback are commands outside it; no synthesis in mount effects.

| Entity | Required fields/guarantees |
| --- | --- |
| Scene | ID/revision, title, neutral context, effective voice, exactly three unique line IDs (`line_1`–`line_3`), two unique semantic actions, valid defender goal and house-protected line. Each line has fixed text, baseline direction and approved baseline take reference. |
| Take | Opaque ID, scene/revision, line, direction ID/revision, voice, `requestedModel: "drama-3"`, render signature, immutable audio URL, origin (`fish-api` or `test-fixture`), review (`unreviewed`, `approved`, `rejected`). |
| Slot | UUID shared with request ID, stable index 1 or 2, immutable input binding, status (`pending`, `ready`, `failed`, `rejected`), usability (`unchecked`, `accepted`, `rejected`), take or null, selection source (`generated-this-round`, `prepared`, null). Keep diagnostic provider outcome separate from selected fallback status. |
| Round | UUID, scene/revision, house/saboteur/listener identities, phase, protected line, at most two slots, selected slot, frozen tuple or null, fixed action order, initial/replay completion flags, active request/adoption identities, playback run/purpose, rejected take IDs, answer/result or null. |
| Result | Round ID, chosen action ID and winner ID; unique by round ID. |

Baseline takes use reserved direction ID `baseline`, revision equal to the scene revision. Changing baseline direction requires a scene revision change; cards cannot use that reserved ID. A slot acceptance never promotes a take into the reusable approved bank.

All async events carry round and request/run identities. Ignore stale events after reset, new round, fallback adoption or commitment. Clip preparation also correlates to the exact frozen tuple. UI slot indices never change to match server reservation order.

## 4. Architecture and Effect boundaries

One repository, npm manifest and lockfile. React + TypeScript + Vite; plain CSS. Use **`effect@4.0.6` and `@effect/platform-node@4.0.6`**, exact pins verified in the registry during this review. Confirm APIs against installed versions. Do not substitute v3 or beta examples. Use a compatible supported Node LTS and record it.

| Boundary | Ownership |
| --- | --- |
| Pure game modules | Rules, transitions, scoring, listener projection and valid choices. |
| Browser commands | UUIDs, immediate click guards, HTTP requests and correlated reducer events. |
| Audio controller/cache | One active sequence, immutable audio blobs, playback completion and cleanup. |
| Server catalog | Canonical text/cards/revisions, effective voice, approved manifests and readiness. |
| Render registry service | Round bindings, two-slot budgets, shared jobs, idempotency and global provider ownership. |
| Fish service | Direct REST request, typed failures, timeout and bounded body consumption. |
| Clip store service | Immutable files, sidecars, hashes, prepared lookup and safe audio serving. |

Use Effect HTTP routing/Node adapter and Effect Schema, not Hono or a parallel Zod layer. Compose service Layers once at startup; reuse Fish/store implementations in the preparation utility. Keep parsing, scoring and signature calculations as functions. Do not wrap every React component or pure function in a service. Current v4 routing documentation uses `effect/http`; concrete imports must match the pinned package.

Jobs belong to the **server scope**, not an HTTP caller's scope. A disconnected caller, fallback selection or UI navigation must not cancel shared synthesis. Duplicate callers await the same job. Provider timeout and server shutdown may interrupt it, with cleanup guaranteed. Map typed operational failures to HTTP errors without disguising defects/interruption as usable audio. No automatic paid-call retry.

Development: Vite `127.0.0.1:5173`, API `127.0.0.1:3001`, `/api` proxy and relative client URLs. Built demo: Node serves frontend and API on one loopback port. Reject port collisions clearly. No permissive CORS workaround.

Page refresh starts a fresh game. Server restart loses round/job registries, not prepared files. An expired render request returns `round_not_found`; never silently recreate it with renewed slots. A committed round whose clips are already cached may finish without further server operations. This is not durable match recovery or exactly-once billing across crashes.

Suggested files: `src/game/{types,reducer,selectors,commands}.ts`, `src/audio/{AudioController,ClipCache}.ts`, `src/api/client.ts`, React views, `shared/contracts.ts`, `server/{index,catalog,TakeService,FishProvider,ClipStore}.ts`, `content/{scenes,directions,prepared-manifest}.json`, `data/{prepared,generated,tmp}/`, `scripts/prepare-audio.ts`, `tests/`. Equivalent cohesive structure is acceptable. Shared code must not import secrets or server filesystem modules.

## 5. HTTP and request lifecycle

| Route | Contract |
| --- | --- |
| `GET /api/health` | Key configured boolean, live enabled, provider busy and local readiness; no secrets. |
| `GET /api/catalog` | Canonical scene DTOs, card labels, qualified baselines, default approved alternatives and availability; synthesis instructions can stay server-side. |
| `POST /api/rounds` | `{roundId, gameMode:"house", sceneId, sceneRevision, protectedLineId}`. Validate UUID, scene readiness/revision and authored shield. Pin card revisions. Identical repeats return existing binding; conflict returns 409 without resetting budgets. Return pinned revisions, `maxSlots:2`, remaining slots. |
| `POST /api/rounds/:roundId/takes` | Header `Idempotency-Key: <uuid>`; body `{lineId, directionId, mode:"live"\|"prepared"}`. Resolve all other inputs server-side. No arbitrary text, voice, model, URL, path or settings accepted. |
| `GET /api/audio/:takeId` | Completed immutable audio only, looked up by validated opaque ID. |

Candidate responses include `roundId`, `requestId`, `slotId`, reservation `slotIndex` when assigned, `slotConsumed`, status, and either take metadata/source or stable error code/message plus an optional exact `preparedTakeId`. Echo known valid request identity even on rejection. Success takes use the fields in section 3.

Error mapping: 400 `invalid_request`; 404 `round_not_found`/`take_not_found`; 409 `protected_line`, `round_conflict`, `idempotency_conflict`, `budget_exhausted`, `provider_busy`; 422 `prepared_take_missing`; 503 `live_unavailable`; 502 `provider_error`; 504 `provider_timeout`. Sanitize provider authentication, balance and rate-limit errors into useful local messages; never expose raw bodies or headers.

### Atomic reservation and duplicate suppression

1. Check existing request UUID first. Its fingerprint includes round, pinned specification and mode. Identical requests await/return the original job; conflicting reuse returns 409.
2. Validate round, inputs, live configuration or prepared availability. Reject unsupported requests before consumption.
3. Check two-slot capacity and the global live-provider owner. Busy means immediate non-consuming rejection, not a queue.
4. Atomically reserve slot, register shared job and acquire live ownership before launching I/O. Make interruption unable to leave a reservation without a terminal/shared job. At most one live call runs globally.
5. Call Fish once for a live slot, persist successful audio, finalize the shared result. Prepared jobs make no Fish call and never acquire/release live ownership.
6. Release only the owning live job's lock on success, failure, timeout or interruption. Selecting fallback does not release it early.

A fresh UUID means a genuine new audition; render signatures must not cache away rerolls. Replays and repeated request UUIDs do not synthesize. Use an immediate client command guard against double clicks before React updates; it must still permit prepared selection and commitment while a live job finishes.

### Provisional slots and prepared substitution

Create a client provisional slot with the request UUID before dispatch. A confirmed pre-reservation rejection frees it unless a prepared substitute has already been chosen. A transport timeout is uncertain: retain the slot and retrieve status by repeating the identical request/key. Never automatically free it and issue a new key.

Fallback selection is explicit and local to the existing slot, using canonical approved metadata; it is not another generation request. It may occur while the job is pending or after failure/technical rejection. Set slot ready/accepted/source prepared without changing input identity. Exclude take IDs rejected this round. Late results or rejection metadata cannot erase that selection. The client may conservatively consume more slots than the server, never fewer.

A standalone prepared audition consumes a slot through the endpoint. Keep one designated prepared default per exact combination to avoid unlimited previews. Fallback must match scene/revision, line, direction/revision, voice and complete render signature. If no usable candidates remain, void without points.

Defaults to tune after a venue check: private waiting notice/fallback offer at 8 seconds, provider deadline 20 seconds including body, browser deadline 25 seconds. Timeout does not prove upstream billing stopped.

## 6. Fish, storage and prepared content

Send server-side `POST https://api.fish.audio/v1/tts`, bearer auth, `Content-Type: application/json`, **`model: drama-3`**. Compile `text` as bracketed authored direction followed by literal locked words. Body includes `reference_id` from configured voice, `format:"mp3"`, `latency:"normal"`. Keep settings constant; record the full request specification. Set any additional output-affecting settings deliberately and include them in signatures. Do not invent supported options.

`requestedModel` records the actual header, not independently proven backend identity. Missing/unrecognized model selection can fall back to another model. No dependence on invite-only editing APIs. These provider facts were verified against official sources during review; recheck only if their version/assumptions change.

Resolve `FISH_VOICE_ID` once into the effective catalog used by server, manifest checker and preparation utility. Voice changes invalidate incompatible packs rather than relabeling them. Prepared-only play still needs a voice identity, but no key/internet. Missing setup produces a clear configuration message, not an arbitrary voice selection.

Hash the complete compiled request into a render signature and retain semantic IDs/revisions separately. Hash audio bytes separately. For successful audio: reject explicit JSON/HTML errors, empty/implausible MP3 output and bodies over 2 MiB; consume within deadline; write temporary files then publish immutable audio and metadata only when both are complete. Ignore orphan/incomplete files on startup. Browser decoding is an additional check, not proof of word fidelity or acting quality.

Prepared assets and metadata survive in `data/prepared`; generated drafts remain separate. Sidecars retain request specification, identity, source, timestamp, review and audio hash. Approval promotes/copies the asset into the prepared pack and updates the manifest. Baselines are never overwritten by alternate generation. Pack files must travel with the demo; avoid dependencies on unrelated temporary directories.

**House readiness:** three approved baselines plus at least one approved alternate for each of the two eligible lines: five clips minimum. All four cards on both lines require eleven approved clips. Show all four labels but enable only exact covered combinations for the rehearsed demo, including live mode. An optional exploration setting may allow uncovered live combinations with a private “No saved take available” notice; omit it if time is tight.

Preparation utility: `npm run audio -- generate --scene <id> --max-calls <n>`, `approve --take <id>`, `reject --take <id>`, `check`. Generation counts every outbound attempt, emits unreviewed IDs/listening locations and never automatically approves. A call cap is not an approved-clip guarantee. Generate sequentially and audition representative contrasts before multiplying content.

Human review checks exact words, no spoken instructions, audibility, stable voice and meaningful contrast. Test complete assembled scenes too; two surrounding baselines may overpower the alternate. Compare subtle cards with a clearer contrast in the actual room. Approval means usable content, not guaranteed persuasion. Fixtures cannot qualify a scene.

## 7. Playback guarantees

One controller owns preview, listener and comparison audio. Pre-fetch all three frozen clips into a cache keyed by immutable take ID before enabling Play. Correlate preparation to round and tuple; stale completion can populate cache but cannot ready another round. On preparation failure show neutral Retry/Void.

Start on user click, await each media `play()` promise, and advance on actual `ended` with looping disabled. Use a fixed approximately 150 ms inter-line gap. Every callback/timer checks run ID, round and clip index. A fresh media element per clip is acceptable. If browser policy blocks a later clip, require a click to continue/restart without unlocking voting early.

Stop invalidates the run, clears timers/listeners and settles the active sequence as cancelled; errors settle as failures. Neither can emit completion. Only complete current `initial`/`replay` runs unlock their corresponding flags; preview and comparison never qualify. Disable further listener replay after its successful completion. No seeking or pause/resume required.

Revoke cached object URLs only when no longer needed; dispose on fresh session/unmount. Keep playback messages neutral on the listener screen. Never synthesize while listening, and never let a late result start audio.

## 8. Starter content

All scene/card revisions start at 1. Content is authored and unqualified. Start with Cake; switch to Exhibition if wording alone drives rejection. Gala is an optional rescue scene. Use one permitted voice across the MVP.

| Scene | Neutral listener context | Actions; defender goal; protected line |
| --- | --- | --- |
| `cake_invitation` — The Cake Invitation | You are at an excessively formal cake tasting. The host offers you the first slice. Decide whether to accept or politely decline. | `accept_cake`: Take the first bite; `decline_cake`: Politely decline. Defender: accept. Protect `line_2`. |
| `normal_exhibition` — The Extremely Normal Exhibition | You manage a tiny museum. Its team has prepared tonight's new display and sent this announcement. Decide whether to open it to guests or request a rehearsal first. | `open_exhibition`: Open to guests; `request_rehearsal`: Request a rehearsal. Defender: open. Protect `line_1`. |
| `galactic_gala` — The Galactic Gala | You are booking a host for the Galactic Gala, an absurdly formal awards night. This is an applicant's short audition. Decide whether to book them or keep looking. | `book_host`: Book the host; `keep_looking`: Keep looking. Defender: keep looking. Protect `line_3`. |

| Scene | `line_1` | `line_2` | `line_3` |
| --- | --- | --- | --- |
| Cake | That is a very special cake. | I made it just for you. | Go on. Have a bite. |
| Exhibition | We've made a few changes. | Everything is in place. | We're ready when you are. |
| Gala | It's lovely to be here. | I have something planned for everyone. | This should be a memorable evening. |

Baseline directions, applied to each line of that scene:

- Cake: “Warm, naturally proud of your baking and genuinely welcoming. Address a guest casually. Keep the words exact and the delivery understated.”
- Exhibition: “A competent museum colleague giving an ordinary update. Natural conversational pacing, restrained warmth, settled and ready. Avoid exaggerated cheerfulness, ominous effects and added words.”
- Gala: “Formal and slightly distant, with measured pacing and restrained warmth. Make the anticipation mildly difficult to read. Avoid an overt villain voice, a conspicuous whisper, an obvious laugh or added words.” Keep this mild enough for one warmer line to rescue the audition.

Store card directions without brackets; the compiler adds them:

| ID / private label | Direction |
| --- | --- |
| `hidden_delight` / Badly hidden delight | Try to sound professionally composed. Let a small trace of inappropriate delight escape near the final important word, then recover. Keep it subtle and keep the words exact. |
| `thin_confidence` / Thin confidence | Begin with ordinary confidence. Let one brief hesitation or caught breath reveal that maintaining it takes effort, then finish as though nothing happened. Keep the words exact and avoid melodrama. |
| `ordinary_tuesday` / An ordinary Tuesday | Give a familiar, routine update as someone who has done this many times. Use grounded, matter-of-fact pacing. Avoid mystery, sarcasm, exaggerated warmth and added words. |
| `quiet_conviction` / Quiet conviction | Use sincere warmth and steady conviction. Address one person naturally and directly. Be reassuring without overselling it. Keep the performance restrained and the words exact. |

## 9. Verification and delivery gates

Use Vitest and a controllable fake Fish service for concurrency/failure tests. `@effect/vitest` is optional; check peer compatibility before adding it. Avoid broad snapshot suites. No fixtures or automated checks prove human listening quality.

| Gate | Required evidence |
| --- | --- |
| A — Inputs and spending | Invalid/protected/revision-mismatched requests make zero provider calls. Concurrent identical request UUIDs reserve once/call once; conflicting reuse rejects. New UUID rerolls call again. Third slot and busy rejection behave correctly. |
| B — Job lifetime | Disconnect one HTTP caller while another awaits the same job: job survives and both retrievals share one result. Timeout/failure/interruption release ownership; prepared operations cannot release a live lock. No implicit retry. |
| C — Candidate identity | Create candidates on different lines, change editor controls, select the first: exactly its original line changes and the other two take IDs remain identical. |
| D — Fallback races | Pending/failed live slot adopts only an exact approved fallback. Late success/rejection cannot override it. Confirmed non-consuming rejection frees only an unused provisional slot; uncertainty retains identity. Rejected prepared assets are not reoffered. |
| E — State and privacy | Reset/new round/commit ignore stale generation and preparation events. Listener projection and rendered view contain no private fields. Duplicate answer produces one point; invalid/early actions produce none. |
| F — Audio | Rejected play, mid-sequence error, Stop and stale ended events never unlock voting. Stop settles pending work. Replay preserves tuple and consumes allowance only on successful completion. Preview/reveal cannot unlock voting. |
| G — Prepared readiness | Validate bytes, hashes, metadata, revisions/voice/signature and coverage. Test fixtures/unreviewed takes never qualify. Changing voice invalidates old packs. |
| H — Built application | Typecheck client/server, tests, build and start pass. Manually complete a prepared round, first-candidate selection, replay, double-click vote and reveal in the built app. Repeat offline with local server running. Test expired render round after restart and cached committed-round completion. |
| I — Real audio and demo | Actual Drama 3 request returns playable audio; host reviews words/contrast and approves the minimum pack. Independent listener completes the full flow. Rehearse the disclosed prepared demo twice with room audio/headphones. |

Gate I requires real provider access and people; do not fabricate it. A browser test can supplement gate H if tooling is already available; otherwise document manual results. Record exact commands, scenes/take IDs, live/prepared/fixture provenance and unmet gates in the completion report. Compilation, fake-provider tests or HTTP success alone cannot establish demo readiness.

Required commands: `npm install`, `npm run dev`, `npm run typecheck`, `npm test` (once), `npm run build`, `npm start`, and the audio utility. Build both client and server with compatible modules. After installation/build, demo startup is one command. README covers local URLs, environment, preparation, headphone procedure, fallback and limitations.

Server-only environment: `FISH_API_KEY`, `FISH_VOICE_ID`, `HOST=127.0.0.1`, `PORT=3001`, `LIVE_GENERATION_ENABLED=true`, `PROVIDER_TIMEOUT_MS=20000`. Never use a `VITE_` secret. Ignore real environment files, generated drafts, temporary assets and build output. Include the lockfile in deliverables; do not commit unless requested. Keep prepared pack inclusion/distribution deliberate and documented.

Log only operational metadata: round/request/scene/line/card IDs, requested model, duration, bytes, result, provenance and duplicate status. Limit JSON body sizes, validate asset IDs and never serve client-supplied paths. No cloud infrastructure or external publication is needed.

## 10. Build order and presentation

| Time | Outcome |
| --- | --- |
| 0–15 min | Inspect repo/toolchain/access; test baseline versus contrasting take if authorized provider access is available. Identify exact audio blockers otherwise. |
| 15–35 | Scaffold Effect server/React client, implement Fish/store/preparation path; play one real take if available. |
| 35–60 | Complete prepared house round from setup through reveal. |
| 60–110 | Add live generation, immutable slots/idempotency, fallback races, blind handoff and robust playback; verify invariants as implemented. |
| 110–135 | Fix P0 gaps first; qualify second scene if core is solid. Custom directions only if gates are already satisfied and time remains. |
| 135–155 | Finish focused tests and built-app acceptance; fix material failures. |
| 155–180 | Stop feature work, verify offline pack/room audio and rehearse twice. |

Cut custom directions, decoration, extra coverage and extra scenes before cutting the complete round or correctness guarantees. Do not add standard mode. Time boxes are priorities, not permission to declare unfinished gates complete.

Guaranteed one-minute demonstration uses disclosed prepared Drama 3 audio: 0–8s premise; 8–15s neutral scene/actions; 15–25s private covered-card selection; 25–40s final playback; 40–50s action/reveal; 50–60s original/altered comparison. Use the best tested scene. Live generation is a separate time-permitting interaction with headphone audition; do not assume it fits this minute.

## 11. Remaining assumptions and dependencies

- **Submission format/judging criteria:** unspecified. Local laptop is the working assumption. A hosted-link requirement would change scope and must be surfaced rather than quietly implemented.
- **Provider access and permitted voice:** not verified in review. Do not print keys or infer permission from public voice listing. Use user-provided event access/authorization; obtain a bounded call budget if none is authorized when implementation reaches live synthesis. Continue code and fixture verification while access is unavailable.
- **Human qualification:** no approved audio or listening results exist yet. Host review and an independent listener are required for gate I; technical checks cannot replace them.
- **Content and latency:** intended acting effects and timeout suitability remain unverified. Tune content/voice and defaults using real evidence while preserving the game concept.
- **Optional custom directions:** not part of P0; their detailed contract remains intentionally deferred.

## 12. Sources and next-session prompt

Settled decisions derive from the reviewed [handoff v1.2](../../dub-saboteur-codex-handoff.md) and the user's three-hour, private-audition, cards-first and Effect-v4 choices. Official provider and Effect facts were checked in the review session; they are not evidence of this app working:

- [Drama 3 directing and model selection](https://docs.fish.audio/features/text-to-speech/drama-3)
- [Fish TTS request contract](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech)
- [Drama 3 launch / editing availability](https://fish.audio/blog/fish-audio-drama-3/)
- [Effect v4 HTTP routing](https://effect.website/docs/v4/api/effect/http/HttpRouter)
- [Effect 4.0.6 package](https://www.npmjs.com/package/effect/v/4.0.6) and [Node platform 4.0.6](https://www.npmjs.com/package/@effect/platform-node/v/4.0.6)

Copy into the implementation session:

```text
Implement Dub Saboteur using docs/specs/dub-saboteur.md as the authoritative
specification. Read it and applicable repository instructions before editing.
It supersedes dub-saboteur-codex-handoff.md. Inspect current workspace state,
preserve unrelated work and reuse the settled decisions without reopening them.

Target a three-hour local build: React/TypeScript/Vite, Effect v4 with the
specified exact pins, pure game rules, one complete two-person house round,
private headphone auditions, authored cards and explicit prepared fallback.
Implement and verify P0 before optional work. Do not add three-player mode.

Complete the unblocked code and focused verification. Use real provider access
only within supplied authorization and budget; report missing access/voice or
human approval precisely. Never approve audio on behalf of the human reviewer
or call fixtures genuine Drama 3 output. Keep secrets server-side.

Deliver startup instructions, playable scenes, live/prepared status, acceptance
evidence and remaining blockers. Rehearse the built offline-capable prepared
demo when human review is available. Do not commit, publish or deploy unless
separately requested.
```
