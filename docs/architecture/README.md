# Architecture source map

[SVG](system-architecture.svg) · [PNG](system-architecture.png) · [Editable Excalidraw](system-architecture.excalidraw)

The diagram describes the implemented built app, traced from current code. Boxes group related responsibilities; they are not separately deployed services. The dashed preparation arrows show reuse of implementations in a separate CLI process, not calls through the running server.

| Diagram component | Source and implemented responsibility |
| --- | --- |
| React views + pure game state | [App.tsx](../../src/App.tsx), [reducer.ts](../../src/game/reducer.ts), [selectors.ts](../../src/game/selectors.ts), [Listener.tsx](../../src/Listener.tsx): private desk, allowlisted listener projection, immutable three-take commitment, voting and scores. The server does not receive listener votes. |
| GameCommands + API client | [commands.ts](../../src/game/commands.ts), [client.ts](../../src/api/client.ts): UUIDs, click guards, correlated events, round/take HTTP requests, exact saved substitution, clip preparation and playback commands. |
| ClipCache + AudioController | [ClipCache.ts](../../src/audio/ClipCache.ts), [AudioController.ts](../../src/audio/AudioController.ts): fetch immutable audio URLs, decode, cache browser blob URLs and sequence actual media completion with 150 ms gaps. Cache is browser memory, not persistent browser storage. |
| Local Node / Effect server | [index.ts](../../server/index.ts), [app.ts](../../server/app.ts): compose Layers once; serve built frontend and API on loopback. [shared/contracts.ts](../../shared/contracts.ts) defines DTOs and server input schemas. Development uses the proxy in [vite.config.ts](../../vite.config.ts). |
| TakeService / catalog / compiler | [TakeService.ts](../../server/TakeService.ts): in-memory round/job maps, two slots, UUID idempotency, one live owner and server-scoped jobs. [catalog.ts](../../server/catalog.ts) checks approved coverage; [requestSpec.ts](../../server/requestSpec.ts) compiles fixed words and authored directions with voice/revisions and a complete request hash. |
| FishProvider | [FishProvider.ts](../../server/FishProvider.ts), [config.ts](../../server/config.ts): server-only bearer key, direct TTS REST call, `model: drama-3`, bounded MP3 response/deadline and no automatic retry. Provider MP3 bytes are saved through ClipStore by TakeService or the CLI; FishProvider itself does not write files. |
| ClipStore | [ClipStore.ts](../../server/ClipStore.ts): validates sidecars/audio, checks hashes and request signatures, indexes approved manifest IDs, publishes via temporary files and serves immutable take bytes. The audio HTTP route reads this service directly. |
| Content + local files | [content/](../../content/): scenes, cards and active prepared IDs. `data/prepared/` holds the approved pack and review history; ignored `data/generated/` holds drafts. MP3s have paired JSON sidecars. `data/tmp/` is only temporary publication/preparation storage and is omitted from the main diagram. |
| Host preparation | [prepare-audio.ts](../../scripts/prepare-audio.ts), [hostReview.ts](../../server/hostReview.ts): explicitly capped sequential generation and human approval/rejection. Approval copies audio to the prepared pack and updates the manifest; generation never approves output. |

## Runtime paths

**Saved audition:** browser registers a round and requests `mode: prepared`; TakeService reserves a slot and returns the exact approved take metadata without calling Fish. Audio is fetched by ID through the HTTP route and ClipStore.

**Live audition:** the same endpoint with `mode: live` reserves a slot and live ownership, launches a server-scoped Fish job, persists a successful unreviewed take, and returns its metadata. Duplicate UUIDs share the result. A disconnected caller or saved substitution does not cancel the owned job or release its lock early. Exact saved substitution is a browser operation on that existing slot.

**Commit and listen:** the reducer freezes three takes with one replacement. Commands stop private playback, prefetch/decode the tuple, and pass the neutral projection to the listener. Full playback unlocks a decision; scoring and reveal remain in browser state.

The diagram's read/write storage arrows cover both runtime and preparation operations. Prepared selection reads the pack; live generation writes drafts; only explicit CLI approval changes pack membership. Browser games/cache and server registrations/jobs are volatile; files persist. No database, queue, remote room, microphone or audio-editing service is implemented.

## Diagram validation

The editable scene contains 12 component boxes and 13 connections. Unique IDs, paired shape/text labels, orthogonal routes, reciprocal bindings and edge endpoints were checked. SVG and PNG were rendered with Excalidraw 0.18.0 using `restoreElements`, `exportToSvg` and `exportToBlob`, then inspected for readable labels, connected arrows and clipping. SVG coordinates are finite; exports are local assets with no remote image or font dependency.

Renderer APIs were checked against the official [restore](https://github.com/excalidraw/excalidraw/blob/v0.18.0/dev-docs/docs/@excalidraw/excalidraw/api/utils/restore.mdx) and [export](https://github.com/excalidraw/excalidraw/blob/v0.18.0/dev-docs/docs/@excalidraw/excalidraw/api/utils/export.mdx) documentation. The renderer and existing Playwright installation were used only to produce documentation; no application dependency or runtime behavior changed.
