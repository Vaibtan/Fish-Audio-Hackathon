---
name: tdd
description: Implement behavior through focused red-green-refactor cycles when test-first work is requested or useful.
---

# Test-driven development

Choose the boundary that exercises the requested behavior and its failure mode.
Reuse established interfaces, test conventions and decisions. Propose a new
contract when necessary; ask only when an unresolved product/interface choice
materially changes the result, not for approval of every existing test boundary.

Work vertically: one independently meaningful failing case, enough implementation
to pass it, then behavior-preserving refactoring while green. Observe the intended
failure before trusting a regression test; distinguish a real failure from a
broken test environment. Avoid bulk tests for an imagined implementation.

Expected results come from the contract, an independent worked example or known
fixture, rather than repeating the implementation. Tests should survive internal
refactors without hiding distinct correctness guarantees.

Use [TEST-BOUNDARIES.md](TEST-BOUNDARIES.md) when selecting substitutes or deciding
between public behavior, storage, lifecycle or concurrency checks. For Effect
service/Layer design, use [effect-service-design](../effect-service-design/SKILL.md).

Run affected tests and the repository's required checks. Broaden or repeat them
when changes or unresolved concerns justify it. Low-impact edits do not need a
new test that merely mirrors the edit. Report observed results and verification
limits; a green stand-in test is not live-product acceptance.
