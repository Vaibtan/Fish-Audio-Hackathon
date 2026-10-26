# Built-app acceptance and rehearsal

Use the built app at **http://127.0.0.1:3001** (`npm run build`, then `npm start`). Cake, Exhibition and Galactic Gala each have five explicitly host-approved Fish clips. Rejected historical alternatives are excluded.

These are human verification steps, not claims that they have passed. Record actual results and any failure in [verification.md](verification.md).

Automated browser evidence already covers all three scenes, Cake replay/Stop/double-vote rules, a full Exhibition round with external browser HTTP(S) denied, and a cached Exhibition round completed after its isolated server stopped. Human/physical steps below remain separate.

## Browser round

1. Activate sound; check headphones and comfortable volume. Choose Cake with two distinct player names. Listener looks away and cannot hear private auditions.
2. Register the round. Confirm the house protects “I made it just for you.”
3. On line 1 choose Badly hidden delight and **Audition saved performance**. Then on line 3 choose Thin confidence and make the second saved audition.
4. Select **audition 1**, even though the editor now points to line 3. Lock it. Private playback must stop.
5. Listener explicitly accepts handoff. Confirm only neutral context, unchanged transcript, playback and action choices appear. No goal, shield, card, changed-line marker, audition count or provenance appears.
6. Play the scene. A Stop before it ends must leave voting locked. Restart and finish all three lines to unlock voting.
7. Use replay. If stopped/failed, voting returns and the successful replay remains available. After a successful full replay, further replay is disabled.
8. Double-click one valid vote. Reveal must award exactly one point, identify line 1 / Badly hidden delight, show saved provenance, and offer original/altered line playback. The listener gets no point.
9. Return to scenes. Cake should be labelled familiar. Do not mistake role-swapping a familiar scene for an independent fresh-scene experiment.

## Offline and restart

- Disconnect external internet while leaving the local server running. Start and finish a fresh **saved** round; confirm playback and reveal work. Browser developer-tools “Offline” can block localhost too and is not equivalent to disconnecting external internet.
- The automated built check registers a real prepared round, restarts the process, proves that round ID expires and verifies the pack survives. For a browser check, start a round, restart the server before requesting an audition, and confirm `round_not_found` leads to void/reset rather than silently renewing slots.
- After committing and waiting for clips to be prepared, stop the server and finish the already cached listener scene. Restart it afterward. This tests cached committed playback, not durable recovery of an uncommitted game.

## People and rehearsal

- An independent listener completes the actual pass-the-device flow without hearing private auditions.
- Run the disclosed prepared demonstration twice with actual headphones/room audio. Record date, people/roles, scene, chosen slot/action, playback/reveal result and observed problems; no personal names are required.
- Host per-clip approval and ffplay comparisons do not replace these runs. Exhibition and Gala were qualified at the host's explicit request; use a fresh scene for an independent listener where possible.

For each rehearsal, report: scene, whether the listener was independent and had avoided the private desk/audio, selected audition and card, listener action, whether initial playback/replay/reveal worked, headphone/room setup, whether external internet was disconnected, and any problem. Two completed runs with these observations are enough to record the remaining human evidence; no recording or personal names are required.
