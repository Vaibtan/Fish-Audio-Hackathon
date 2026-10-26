# Dub Saboteur

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

Two people share a local laptop: a director changes the performance of one fixed
line, then an independent listener hears the full scene and chooses an action.
Two auditions make directing a bounded gamble. An action matching the director's
objective wins; this is not evidence of a changed mind.

## Operating context

Private headphone auditions, explicit device handoff, neutral listener playback,
one full replay, and a before/after reveal. The house protects one line. Setup
includes an unrelated sound check. The host manages prepared audio and live access.

## Capabilities and constraints

The authoritative rules are in `docs/specs/dub-saboteur.md`; the older handoff is
historical. React/TypeScript/Vite and plain CSS are already implemented. Preserve
the pure game rules, allowlisted listener projection, exact scene text, immutable
auditions, audio commands, and real prepared/live provenance. No new game modes,
accounts, remote play, infrastructure, or paid synthesis are part of this UI task.

## Brand commitments

Dub Saboteur; same words, different delivery. On 24 October 2026 the user selected
"More playful arcade" for the frontend refresh, superseding the prior subdued
theatre/studio visual treatment. Game content and behavior remain authoritative.

## Evidence on hand

Three authored scenes and four direction labels in `content/`. Existing tests,
approved prepared audio, and historical verification are documented in
`docs/verification.md`. Human listener and venue rehearsal gates remain separate
from frontend verification; this design task does not certify them.

## Accessibility

Keyboard focus, readable contrast, responsive layouts, explicit sound activation,
global Stop, volume control, and reduced motion. Never expose private objectives,
line markers, directions, or take provenance before the listener votes.
