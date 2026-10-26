---
name: Dub Saboteur
description: Same words. Different delivery.
colors:
  ink-purple: "#191720"
  warm-cream: "#fff5de"
  lavender-action: "#c4a4ff"
  lavender-hover: "#d5bfff"
  cabinet-panel: "#25212f"
  selected-panel: "#342a45"
  muted-copy: "#b8b1c3"
  divider: "#51495e"
  paper-muted: "#61566c"
  control-border: "#81728e"
typography:
  display:
    fontFamily: "Bungee, sans-serif"
    fontSize: "clamp(2.7rem, 4.4vw, 4.1rem)"
    fontWeight: 400
    lineHeight: 1.13
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bungee, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  primary-button:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.25
  action:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.45
  tag:
    fontFamily: "Barlow, 'Segoe UI', sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  field: "8px"
  control: "9px"
  brand-mark: "12px"
  surface: "14px"
  handoff-mark: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lavender-action}"
    textColor: "{colors.ink-purple}"
    typography: "{typography.primary-button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.lavender-hover}"
    textColor: "{colors.ink-purple}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.warm-cream}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  text-field:
    backgroundColor: "{colors.ink-purple}"
    textColor: "{colors.warm-cream}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  scene-card:
    backgroundColor: "{colors.warm-cream}"
    textColor: "{colors.ink-purple}"
    rounded: "{rounded.surface}"
    padding: "24px 26px 18px"
  audition-card:
    backgroundColor: "{colors.cabinet-panel}"
    textColor: "{colors.warm-cream}"
    rounded: "{rounded.surface}"
    padding: "20px"
  listener-action:
    backgroundColor: "{colors.lavender-action}"
    textColor: "{colors.ink-purple}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "20px 22px"
  status-tag:
    backgroundColor: "transparent"
    textColor: "{colors.muted-copy}"
    typography: "{typography.tag}"
---

# Design System: Dub Saboteur

## Overview

**Creative North Star: "The Ink-Purple Cabinet"**

Dub Saboteur is a playful arcade cabinet for two people passing one device. Ink-purple framing, warm cream scene cards and transcript, and flat lavender controls make game state legible without turning the full screen neon. Bungee gives the premise a marquee; Barlow keeps setup, directions, and reading straightforward.

The journey moves from a scene lobby to a private directing desk and an independent listener room, then returns to a clear reveal. Selection combines a filled state, a border, and a check. The listener receives neutral scene context, transcript, playback, and choices without the director's private objective or take details.

**Key Characteristics:**
- Ink-purple framing around warm cream reading and scene surfaces.
- Lavender marks primary actions, selected choices, sound readiness, and the reveal.
- Bungee leads; Barlow carries controls and scene reading.
- Flat, tactile controls use crisp borders and brief feedback.
- The listener view stays neutral and private-round details stay hidden.

## Colors

The palette pairs dark cabinet tones with warm paper, using lavender as the clear action and selection signal.

### Primary
- **Lavender Action:** Primary controls, selected choices, sound-ready feedback, and the reveal marker.
- **Lavender Hover:** A lighter response for primary and selected controls on hover.

### Neutral
- **Ink Purple:** The cabinet background, dark fields, and text on cream surfaces.
- **Warm Cream:** Main copy on the cabinet, scene cards, protected-line surfaces, and the listener transcript.
- **Cabinet Panel:** The resting surface for audition cards.
- **Selected Panel:** The selected audition and in-game notice surface.
- **Muted Copy:** Supporting text on dark surfaces.
- **Divider:** Borders and separators across the cabinet.
- **Paper Muted:** Supporting text on cream surfaces.
- **Control Border:** The outline that keeps transparent controls visible against the cabinet.

**The Lavender Action Rule.** Keep lavender for actions, selection, sound readiness, and the reveal; let ink-purple and warm cream carry the large surfaces.

## Typography

The local Bungee face gives the wordmark and game-stage headings a compact arcade voice. Barlow handles setup, controls, labels, and scene reading, with locally bundled regular, semibold, and bold weights.

### Hierarchy
- **Display:** Bungee leads the lobby premise; it is larger than the stage headlines and carries the strongest visual emphasis.
- **Headline:** Bungee identifies each game stage and result.
- **Title:** Bold Barlow names sections and scenes.
- **Body:** Regular Barlow carries instructions and context; the transcript is semibold for easy listening-room reading. Paragraphs stay within a readable measure.
- **Label:** Semibold Barlow marks control labels, status, and small supporting information.

**The Cabinet Type Rule.** Use Bungee for the wordmark and headlines; keep interface instructions and scene reading in Barlow.

## Layout

The main shell is capped at 1380px with 48px side padding on wide screens. The lobby uses two balanced columns for premise and scene selection, then stacks them at 760px. Side padding steps down to 32px below 1050px, 24px below 760px, and 20px below 480px. The game stage is capped at 840px; the directing desk gives the script and audition rail separate columns, moving the audition rail beneath the script on narrow screens.

## Elevation & Depth

The interface is flat. Cream and purple surface changes, crisp one-pixel borders, and selected fills establish depth without shadows. Controls respond with a brief border and fill change, a one-pixel press, and a single reveal stamp; reduced-motion settings remove animation and transitions.

**The Flat-by-Default Rule.** Separate surfaces with color and borders. Keep controls tactile through their pressed state, not through shadow.

## Shapes

Controls use gently rounded corners, fields are slightly tighter, and cards share the broader surface radius. The tilted sound mark and handoff mark are the two more expressive silhouettes. Borders stay crisp; large surfaces use a clean edge rather than a glow or shadow.

## Components

### Buttons
- **Shape:** Compact, rounded controls with a visible outline and 46px minimum height; listener action choices use a 72px minimum.
- **Primary:** Lavender fill and ink-purple text for the next clear action.
- **Secondary:** Transparent at rest, with cream text and a lavender border response on hover.
- **Hover / Focus:** Hover strengthens the fill or border. Controls use a 3px lavender outline with a 5px offset; the main game surface uses an 8px offset.
- **Pressed / Disabled:** Pressed controls move down 1px. Disabled controls use subdued colors and do not respond.

### Cards / Containers
- **Scene cards:** Warm cream surfaces with dark titles, muted supporting copy, a fine divider, a preparation status, and one clear scene choice.
- **Audition cards:** Dark purple surfaces with the line and direction kept beside each take. Selection adds a lavender edge and highlighted fill, plus a check and explicit selected label.
- **Notices:** Dark selected-purple fill with a crisp border; long status text can wrap.

### Inputs / Fields
- **Style:** Dark field, cream text, and a visible muted outline.
- **Focus / Error:** A lavender focus ring stays visible; invalid fields move to the lavender border.

### Status Tags
Use small, muted labels for preparation state and audition provenance. Keep the tag alongside the control or card it describes.

### Listener Room
Keep the listener room neutral. It presents scene context, transcript, playback status, and response choices without the director's objective, protected-line cue, chosen direction, or take provenance.

## Do's and Don'ts

### Do:
- Do keep the selected state clear with fill, border, and a check or label.
- Do use the locally bundled Bungee and Barlow faces for their established roles.
- Do keep the listener surface neutral and free of private-round details.

### Don't:
- Don't add neon glows, fake waveforms, or simulated audio data.
- Don't add shadows to the flat cabinet surfaces.
- Don't move the director's objective, protected-line cue, direction, or take provenance into the listener room.
