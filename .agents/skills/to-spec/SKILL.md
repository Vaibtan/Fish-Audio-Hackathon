---
name: to-spec
description: Synthesize an agreed substantial change into a concise implementation-ready specification.
---

# Write a specification

Synthesize the current discussion and relevant code into one authoritative spec.
Reuse settled decisions. Investigate available facts yourself; ask only about
material gaps instead of restarting an interview.

Follow existing project conventions or use `docs/specs/<topic>.md`. Include the
problem and desired behavior, scope/non-goals, material contract and design
decisions, acceptance criteria, verification boundaries, and genuine open
questions. Include user stories when they clarify distinct needs; the number of
stories is not a completeness target.

Prefer established interfaces and tests. Explain proposed new boundaries and the
guarantees they catch or miss. Link relevant source, prototypes and decisions;
label snapshot-specific paths and unverified assumptions. Avoid speculative
architecture or a second plan duplicating an existing spec.

Local writing is the default. Publish to a tracker only when the user requests or
has authorized that destination. Ticket labels, issue closure and tracker setup
are not prerequisites. For multi-session implementation slices, use
[to-tickets](../to-tickets/SKILL.md). A spec request alone does not start implementation.
