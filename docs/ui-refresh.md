# Frontend refresh — 24 October 2026

The user chose **playful arcade** and **direct implementation in the app**.
This updates the earlier theatre/studio visual treatment without changing game
rules, authored scene text, direction labels, provider requests, or scoring.

## Changes

- Bungee display lettering and Barlow UI typography, self-hosted with their licenses.
- Cream scene cards, lavender selection states, a compact audio/brand bar, and
  consistent SVG controls across setup, directing, handoff, listening, and reveal.
- Visible sound-unlock instructions, player-name validation, catalog loading/error
  states, both empty audition slots, and an explicitly pressed selected audition.
- Responsive layouts, keyboard skip link, stage focus/scroll reset, and reduced
  motion. Listener rendering still uses the existing allowlisted projection.

## Fresh checks

- `npm run typecheck`: passed after the final UI behavior changes.
- `npm test`: 62/62 existing tests passed, including rendered listener privacy.
- `npm run build`: client and server passed. The subsequent focus-only frontend
  change also passed a fresh TypeScript check and `npx vite build`.
- Impeccable's mechanical detector returned an empty finding list.
- [Browser evidence](evidence/2026-10-24-ui-refresh.json): actual built app on an
  isolated keyless server with live generation disabled. All three approved saved
  scene packs completed through voting and reveal. No new Fish calls were made.
- Cake exercised both eligible lines, first-candidate commitment, actual private
  playback, initial Stop, successful initial playback, partial and complete replay,
  duplicate voting, and actual original/altered comparison playback.
- 24 checked layouts across 320, 390, 900, and 1440px had no horizontal document
  overflow. Local fonts loaded with external browser requests blocked. Long player
  names and the longer Exhibition title were included. No browser errors occurred.
- Keyboard skip/focus, sound activation lock, duplicate-name blocking, and selected
  audition semantics passed. Reduced-motion emulation was enabled; the stylesheet
  suppresses the reveal animation and transitions under that preference.
- Final accessibility corrections added a separate control-border token (3.99:1
  against the page, 3.54:1 against audition panels, 3.03:1 against selected panels)
  and restored the visible game-area focus indicator. A rebuilt frontend passed
  the full browser run again. There are 25 screenshots, including a dedicated
  `keyboard-focus-1440.png` capture.
- Independent Impeccable review disposition: **ship**. The final verdict scored
  both control-boundary contrast and game-area focus findings resolved, with no
  visible regressions in the reviewed captures. This verdict covers those two
  corrections; it is not a claim of exhaustive accessibility certification.

Browser entry: `scripts/browser-ui-review.js`, following the existing connector
function convention. It expects a keyless prepared-only built server on port 3811.
The local execution used the already-installed Playwright package and Chrome;
no browser dependency was added to the project manifest.

Screenshots are in `.impeccable/review/`, including `setup-1440.png`,
`setup-390.png`, `desk-selected-1440.png`, `listener-390.png`, and `reveal-1440.png`.

These checks establish frontend behavior and browser playback, not human acting
quality or venue readiness. The independent-listener and headphone/venue rehearsal
gates in `docs/verification.md` remain separate.

Run `npm start` after building and open http://127.0.0.1:3001.
