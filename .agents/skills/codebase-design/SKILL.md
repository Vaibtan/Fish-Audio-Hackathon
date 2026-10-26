---
name: codebase-design
description: Design module interfaces or examine architectural friction, ownership, test boundaries, and locality.
---

# Module design

A deep module hides substantial behavior behind an interface that callers can
understand. Its interface includes types, invariants, errors, configuration,
ordering and lifetime requirements. A seam is a place where behavior can vary;
an adapter supplies a concrete implementation there. Use the project's domain
language and normal technical terms, including service, API and boundary.

Start with the caller's operation and the change it needs. Locate ownership,
dependencies and existing contracts. Prefer a small coherent interface; apply the
deletion test: removing a useful module spreads its complexity into callers.
Removing a pass-through may simply remove complexity.

Keep deterministic domain transformations explicit. Introduce a service or seam
when capability ownership, resource lifetime, scope, variability or substantial
complexity warrants it; two implementations are evidence, not a prerequisite.
For Effect services and Layers, read the focused
[service-design skill](../effect-service-design/SKILL.md).

Test at the boundary that reveals the relevant guarantee. Internal algorithm,
persistence or concurrency tests can be justified even when an outer interface
also has coverage. Preserve distinct guarantees when replacing tests.

- For dependencies and safe deepening, use [DEEPENING.md](DEEPENING.md).
- For a requested architecture survey or competing interfaces, use
  [DESIGN-OPTIONS.md](DESIGN-OPTIONS.md).

Explain the concrete friction, proposed ownership/interface and tradeoffs. Avoid
introducing layers or migrating unrelated modules solely to match a diagram.
