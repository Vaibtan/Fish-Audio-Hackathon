---
name: diagnosing-bugs
description: Investigate a failing behavior or performance regression using reproducible evidence and targeted probes.
---

# Diagnose a bug

Identify the actual symptom, expected behavior, relevant environment and recent
changes. Read the path that produces the symptom, not an entire repository map.

Find the quickest trustworthy signal: a failing test, request, CLI input, captured
artifact or measured workload. It must distinguish this failure from incidental
errors. Reduce the case when doing so helps discriminate causes; full minimization
is unnecessary for an already clear fault.

Use the best-supported hypothesis to choose a falsifiable probe. For ambiguous
failures, compare a small ranked set of hypotheses and the evidence that separates
them. Change one meaningful variable at a time. For intermittent failures, measure
the reproduction rate; for performance, establish a correct baseline before tuning.
See [INVESTIGATION.md](INVESTIGATION.md) for harder cases.

If reproduction is inaccessible, inspect code and captured evidence, label the
limits, and continue useful diagnosis. Ask for a specific missing artifact or
access only when it materially blocks the next conclusion. Do not present an
untested hypothesis as an established cause.

When authorized to fix the issue, add a regression at the boundary that reaches
the real bug if feasible, observe its failure, apply the smallest correction and
rerun the original scenario and affected checks. The
[TDD skill](../tdd/SKILL.md) covers behavior-first cycles.

Redact credentials and personal data from captured evidence. Remove temporary
instrumentation, or retain it only when it is intentionally useful. Report the
cause, correction, observed verification and remaining uncertainty; a diagnostic
task does not require a commit or a production instrumentation change.
