# Host guide

The [README](../README.md) covers the game and quick start. This guide covers local configuration, prepared audio and operational checks.

## Configuration

Copy `.env.example` to `.env` only if the real file does not already exist. Keep credentials in that ignored file; never use a `VITE_` variable for a secret.

```dotenv
FISH_API_KEY=
FISH_VOICE_ID=c70cfb98867a4bfb9ae20d2401257b92
LIVE_GENERATION_ENABLED=false
HOST=127.0.0.1
PORT=3001
PROVIDER_TIMEOUT_MS=20000
```

The included packs use Delia, identified by the voice ID above. `FISH_VOICE_ID` selects the voice; the server's separate `model: drama-3` header selects the synthesis model. Prepared play needs a matching voice identity, local pack and running server, but no key or external internet. Changing the voice invalidates incompatible packs.

To enable live synthesis, supply your authorized Fish key and set `LIVE_GENERATION_ENABLED=true`. A configured key does not itself authorize spending. A fresh live audition makes one provider call and consumes a slot even when its controls match an earlier audition. Failed calls are not retried automatically. Restart after configuration or pack changes.

Built startup is `npm run build`, then `npm start` at http://127.0.0.1:3001. Development uses `npm run dev`: Vite on port 5173 proxies `/api` to the local API on 3001. Stop the built server before starting development. The host must be a loopback address.

## Prepare and review audio

The preparation utility reuses the server's Fish adapter, request compiler and clip store. It generates drafts, not automatically approved content. A scene needs three approved baselines and at least one approved alternative for each unprotected line.

Start with a representative contrast pair and an explicit call cap:

```powershell
npm run audio -- generate --scene cake_invitation --max-calls 2
```

The cap counts outbound attempts, including failures. Generation is sequential and stops on failure. Listen to the printed MP3 paths and check exact words, no spoken instructions, clear audio, stable voice and useful contrast. Also compare complete assembled scenes: surrounding baselines may overpower the alteration.

Record a human decision for each actual take:

```powershell
npm run audio -- approve --take <take-uuid>
npm run audio -- reject --take <take-uuid>
```

Interactive approval requires the displayed confirmation phrase after listening. Alternatively, `--review-file <path>` accepts an explicit host decision bound to the take ID, audio hash and render signature; see [a recorded approval](audio-reviews/2026-10-24-exhibition-assembled.json). This records a human decision already given, not an automated audio judgment. Test fixtures cannot be promoted. Acceptance inside a game round never promotes a reusable pack asset.

After reviewing the first pair, generate remaining coverage and check readiness:

```powershell
npm run audio -- generate --scene cake_invitation --max-calls 3
npm run audio -- check
```

The default plan skips exact combinations already approved. It produces three baselines and two alternatives: Badly hidden delight / Thin confidence for Cake and Exhibition, and Quiet conviction on both eligible Gala lines. All four authored card labels are shown in the game, but only covered combinations are enabled, including for live auditions.

To request a fresh replacement for one exact combination:

```powershell
npm run audio -- generate --scene cake_invitation --line line_1 --direction hidden_delight --max-calls 1
```

Drafts live in ignored `data/generated/`. Approval copies the audio and sidecar into `data/prepared/` and updates `content/prepared-manifest.json`. The manifest selects the active approved pack; rejected historical files may remain on disk without qualifying a scene. Keep the manifest, listed MP3s and matching JSON sidecars together when moving the demo. Restart the server to load changes.

## Failure and playback behavior

- Each round has two immutable audition slots. Same-request retrieval reuses its UUID and original inputs; a fresh UUID is another audition. One live job runs globally; busy rejection does not consume a server slot.
- A waiting audition offers its exact saved substitute after eight seconds. The same substitute may be selected after failure or technical rejection unless rejected this round. Selection makes no additional provider call, and late output cannot replace it. An uncertain transport outcome retains the slot for same-request retrieval.
- Live audio must be privately previewed and accepted for intact words/audibility. Disappointing acting alone is not a technical defect. Private playback stops at commitment.
- All three committed clips are prefetched and decoded before Play. The controller advances on actual media completion with 150 ms gaps. Stopped/failed initial playback leaves voting locked; a stopped/failed replay does not consume its allowance.
- Browser refresh starts a fresh game. Server restart discards round/job registries and returns `round_not_found` for expired auditions; prepared files survive. A committed round whose clips are cached can finish without further server operations. This is not durable match recovery.

## Checks and rehearsal

```powershell
npm run typecheck
npm test
npm run build
npm run verify:built
npm run audio -- check
```

The built verifier starts isolated servers with live synthesis disabled and checks every qualified pack, two-slot behavior, duplicate retrieval, immutable assets, restart expiry and port collisions. Tests use controllable fake providers and a clearly identified synthetic fixture; they do not establish human audio quality.

The three prepared scenes have explicit host clip and assembled-scene approvals. Technical/browser evidence and its limits are in [verification](verification.md); frontend review is in [UI refresh](ui-refresh.md). Complete the [manual acceptance checklist](manual-acceptance.md) with an independent listener and two actual headphone/room rehearsals, including one disconnected from external internet while the local server stays running.
