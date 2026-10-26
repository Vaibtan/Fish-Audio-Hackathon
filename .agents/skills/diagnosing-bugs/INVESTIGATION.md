# Investigation options

Choose a signal close to the failing boundary: a focused test; an HTTP request
against local code; a CLI fixture; a browser journey; replay of a redacted trace;
or an isolated harness using the real relevant module.

For nondeterminism, control time, randomness and scheduling where possible,
repeat the trigger with recorded counts, and distinguish failure frequency from
latency. Stress and failure injection should exercise the suspected boundary.
For regressions across versions, compare known states in isolated checkouts;
preserve the user's checkout before considering bisection.

Prefer a debugger or one targeted measurement to broad logging. Tag temporary
instrumentation for cleanup. When human interaction is necessary, provide a small
numbered procedure or a PowerShell helper appropriate to the user's environment;
capture observations, not credentials.

For a performance claim, consult [PERFORMANCE.md](PERFORMANCE.md).
