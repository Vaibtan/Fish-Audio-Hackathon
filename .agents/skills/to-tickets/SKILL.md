---
name: to-tickets
description: Decompose a substantial spec into independently verifiable work items with explicit dependencies.
---

# Decompose substantial work

Use the existing spec or agreed discussion as the source of scope. Keep small
tasks direct rather than manufacturing tickets. Resolve missing requirements
before pretending the work is ready to implement.

Prefer narrow vertical slices that deliver verifiable behavior across the layers
actually involved. A backend change need not invent a UI. Use genuine prerequisites
or expand/migrate/contract steps for cross-cutting refactors when independent green
slices are impractical.

Give each work item a title, delivered behavior, acceptance criteria, verification
boundary and blocking edges. Explain any integration-only green point. Existing
seams and contracts are preferred; identify material new decisions explicitly.

Use the existing tracker/location when authorized. Otherwise write local files
under `.scratch/<topic>/issues/`, numbered in dependency order, linked to the spec.
For consequential decomposition choices, present a draft and incorporate feedback
before remote publication; an already approved breakdown need not be reapproved.

Publish, close or modify remote issues only within the requested scope. Creating
tickets does not require branches, commits, a fixed agent count or automatic
implementation. Make the next unblocked work visible without a second tracker
state machine.
