---
name: domain-modeling
description: Clarify domain terminology or record a resolved domain decision in a glossary or ADR.
---

# Domain modeling

Use this when terminology or a domain decision is being changed, not merely
because a task reads a glossary. Check existing definitions, relevant decisions
and code before proposing a new term.

Distinguish overloaded concepts with concrete examples. Surface disagreements
between the user's description and implementation without assuming either is the
intended contract. Resolve consequential ambiguities with the user and reuse
decisions already made.

Record settled terms in the relevant `GLOSSARY.md`, following an existing
`GLOSSARY-MAP.md` when present. Create a root glossary lazily if none exists.
Keep it about domain meaning; implementation and task notes belong elsewhere.
Use [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md) when no format is established.

Record an ADR when a real tradeoff is costly to reverse and its reasoning would
otherwise surprise a future maintainer. Follow existing conventions or
[ADR-FORMAT.md](ADR-FORMAT.md). Record resolved decisions during authorized design
work; mark proposals as proposals and avoid creating empty documentation.
