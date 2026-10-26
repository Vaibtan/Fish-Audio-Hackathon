# Dub Saboteur

**Same words. Different delivery. Can you steer their decision?**

A local two-person house game: a director privately auditions up to two performances, replaces exactly one line, then hands the scene to an independent listener. The listener chooses an action; the reveal compares the original and altered line. A point means an action matched a goal, not proof of a changed mind.

The [implementation specification](docs/specs/dub-saboteur.md) is authoritative. See [current verification and remaining gates](docs/verification.md). The older handoff is historical.

## Run locally

Verified toolchain: Node **22.23.1 LTS**, npm **10.9.8**, Windows PowerShell. Effect and Node platform are pinned to **4.0.6** in the manifest and lockfile.

```powershell
npm install
npm run typecheck
npm test
npm run build
npm start
```

Open **http://127.0.0.1:3001**. After installation and build, `npm start` is the one-command demo startup. It serves both frontend and API on loopback; a port collision fails startup. No database, accounts, remote rooms or cloud services are needed for prepared play.

Three scenes now have host-approved prepared audio: **The Cake Invitation**, **The Extremely Normal Exhibition** (open a museum display or request a rehearsal), and **The Galactic Gala** (book an event host or keep looking). Each includes three original lines and two approved alternatives. Refresh the page after restarting the server to load updated packs.

For development, use `npm run dev`: Vite at **http://127.0.0.1:5173** proxies relative `/api` requests to **http://127.0.0.1:3001**. Stop the built server first. No CORS workaround is required.

## Host configuration

If `.env` does not exist, copy `.env.example` to `.env`. Edit that ignored file locally; keep the API key out of chat, browser settings and source control.

```dotenv
FISH_API_KEY=your_key_here
FISH_VOICE_ID=c70cfb98867a4bfb9ae20d2401257b92
LIVE_GENERATION_ENABLED=true
HOST=127.0.0.1
PORT=3001
PROVIDER_TIMEOUT_MS=20000
```

The user selected **Delia**, an English voice listed in [Fish’s Drama 3 guide](https://docs.fish.audio/features/text-to-speech/drama-3). `FISH_VOICE_ID` identifies the voice; the separate `model: drama-3` request header selects the model. Obtain an API key through the [Fish dashboard API Keys section](https://docs.fish.audio/developer-guide/getting-started/quickstart). The code uses direct REST and bracketed authored directions followed by the unchanged script.

A key is not spending authorization. The current session explicitly authorizes synthesis with Delia and an unlimited call budget; preparation commands still require an explicit per-invocation `--max-calls` cap and never retry a failed call automatically. For a different host, obtain their authorization first. The app has no secrets in `VITE_` variables. Health exposes configuration booleans only.

Prepared-only use requires the matching voice ID, the pack and local server, but no key or internet. Set `LIVE_GENERATION_ENABLED=false` and leave the key empty for that mode. Changing the voice invalidates incompatible packs. Restart the server after configuration or pack changes.

## Prepare real audio

**The Cake Invitation is playable with five host-approved real Fish clips.** The host reviewed the clips, rejected the first line-1 alternate after a full-scene comparison, and approved its replacement and assembled scene. IDs, decisions and decoding evidence are in the [verification report](docs/verification.md). Exhibition and Gala remain authored but unqualified. Full browser/offline acceptance and independent-listener rehearsals are still pending; pack readiness alone is not demo qualification.

Start with a representative baseline/contrast pair:

```powershell
npm run audio -- generate --scene cake_invitation --max-calls 2
```

The utility generates sequentially, counts every outbound attempt (including failure), stops on failure, and prints unreviewed take UUIDs and local MP3 paths. Play those files using your local audio player. Human review must check exact words, no spoken directions, audibility, stable voice and meaningful contrast. Poor strategy is not a technical failure. A call cap does not guarantee approved clips.

Approve or reject each take yourself:

```powershell
npm run audio -- approve --take <take-uuid>
npm run audio -- reject --take <take-uuid>
```

Approval requires an interactive terminal and the human reviewer typing the displayed phrase **after listening**, or `--review-file <path>` pointing to an explicit host review record bound to each approved take ID, audio hash and render signature. The latter records a human decision already given; it is not an automated audio judge. An example from this session is `docs/audio-reviews/2026-10-24-cake-initial.json`.

Approval copies immutable audio into `data/prepared` and updates `content/prepared-manifest.json`. Per-round acceptance never approves a take into this bank. Test fixtures cannot be promoted.

After reviewing the first pair, fill the remaining minimum coverage:

```powershell
npm run audio -- generate --scene cake_invitation --max-calls 5
npm run audio -- check
```

Already approved exact combinations are skipped in the default plan. Unreviewed drafts are not silently adopted or reused as approved audio. To request a specific replacement draft, explicitly name both fields:

```powershell
npm run audio -- generate --scene cake_invitation --line line_1 --direction hidden_delight --max-calls 1
```

`baseline` is a reserved preparation direction. Baseline generation never overwrites another take. The default five-clip plan covers three baselines, `hidden_delight` on the first eligible line, and `thin_confidence` on the second eligible line. Galactic Gala uses `quiet_conviction` on both eligible lines to support its warmer-host objective. All four card labels appear in the game; only combinations with an exact approved default are enabled, including in live mode. Each full four-card scene would need eleven approved clips.

The host requested additional scenarios and approved complete assembled versions of `normal_exhibition` and `galactic_gala`. Both now qualify alongside Cake. Check complete assembled scenes as well as individual lines; surrounding baselines can overpower a contrast. Host audio approval remains separate from independent-listener and venue rehearsal acceptance.

Distribute the approved take IDs listed in `content/prepared-manifest.json`: their `data/prepared/<id>.mp3` files and paired JSON sidecars, plus the manifest. A rejected historical take remains on disk for review history and is excluded by the manifest. These pack paths are deliberately eligible for source control, but inclusion/distribution requires a deliberate host decision. Drafts in `data/generated`, `data/tmp`, builds and real environment files are ignored. This task does not commit, publish or deploy anything.

## Play and rehearse

1. Start the local server and activate sound. The sound check is an unrelated tone. Confirm headphone routing, comfortable volume and global **Stop audio**.
2. Use distinct player names. Prefer an unfamiliar qualified scene. The listener looks away and cannot hear private audio; keep the private desk off audience displays.
3. Register the round, see the house shield, choose one of the two eligible lines and a covered authored card. Each audition has immutable line/card identity. A new live audition makes one Fish call, even for identical controls.
4. Listen privately to live output and accept intact words/audibility. Technical rejection means missing/added words, spoken directions, corruption or inaudibility. It still spends the live slot.
5. At eight seconds a waiting slot offers its exact saved substitute. A substitute also works after failure or technical rejection, excludes rejected assets and does not make another provider request. A late live result cannot replace it. A transport timeout retains the UUID; **Retrieve same request** repeats that exact request, without creating another audition.
6. Select a usable audition and lock it. Exactly its original line changes, private audio stops and all three committed clips prefetch/decode. Pass the device and headphones, then let the listener explicitly accept handoff.
7. The listener hears neutral context and unchanged transcript, completes the initial scene and chooses an action. A successful full replay is available once. Stopped/failed playback cannot unlock voting; stopped/failed replay does not consume its allowance. Void an unrecoverable round without points.
8. Reveal goals, winner, changed card and new/saved provenance. Compare original and altered line. The listener earns no points. Swap roles with a fresh qualified scene where possible; reused scenes are labelled familiar.

The listener component receives an allowlisted projection, not private data hidden by CSS. This protects ordinary pass-the-laptop play, not someone inspecting browser memory. Action order is fixed once per round and has no ownership meaning. Scores derive from one result per round ID.

Rehearse the disclosed prepared demo **twice** with an independent listener and venue audio/headphones. A suggested one-minute sequence: premise (8s), scene/actions (7s), private covered-card selection (10s), full playback (15s), action/reveal (10s), original/altered comparison (10s). Live generation is a separate interaction with private review, not a guaranteed one-minute step.

## Verification and limits

`npm test` runs focused Vitest tests with a controllable fake Fish service and isolated temporary disk state. `tests/fixtures/tone.mp3` is an unrelated synthetic test tone, never qualified demo content. After building, `npm run verify:built` checks the built app/API and port-collision behavior on a temporary loopback port, with live synthesis disabled. An optional draft UUID also verifies exact immutable audio bytes: `npm run verify:built -- <take-uuid>`.

Automated tests cannot verify acting quality or replace human approval. [Verification report](docs/verification.md) distinguishes implemented behavior, technical evidence and human-qualified readiness.

The server owns shared synthesis jobs. Disconnecting a client, picking a fallback or navigating away cannot cancel or unlock an active live job. One live request runs globally; busy rejections are immediate and non-consuming. Timeouts include response-body consumption; a timeout does not prove upstream billing stopped. Operational errors are sanitized, bodies are capped and no automatic paid-call retry exists.

Page refresh starts a new game. Restart loses round/job registries, not audio files. Expired renders return `round_not_found` and do not renew slot budgets. A committed tuple already in browser cache can finish without more server operations. This is not durable match recovery or exactly-once billing across crashes.

Three-person play, custom directions, accounts, hosting, infrastructure, voice cloning, microphones and audio editing are excluded. No fixture or green unit test establishes real demo readiness.
