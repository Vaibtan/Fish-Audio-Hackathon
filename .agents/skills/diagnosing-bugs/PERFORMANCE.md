# Assessing a performance measurement

Before comparing options, state the user-relevant claim and inspect what the
harness times. Confirm the work actually ran, produced correct output, and counted
errors, retries and timeouts. A fast failure or unconsumed lazy computation is not
an improvement.

Use comparable builds, data, concurrency, configuration and cache state. Observe
machine contention with available Windows/runtime tools rather than assuming
Linux utilities. Profile separately when profiling changes timing. Identify the
bottleneck, including the load generator.

Interleave comparable runs and report units, repetitions, median/range and relevant
noise. A requested rough estimate can use one run if labeled. A close adoption
decision needs repeatable evidence; a difference within observed variation is
inconclusive. Check physical limits and the changed component's share of end-to-end
time before attributing a large speedup.

Keep raw evidence with the result. This checklist is adapted from pstack's
benchmark-checklist; provenance and license are in [UPSTREAM.md](../../UPSTREAM.md).
