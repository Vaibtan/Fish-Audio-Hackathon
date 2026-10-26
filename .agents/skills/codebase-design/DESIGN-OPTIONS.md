# Surveys and alternative interfaces

For an architecture survey, honor the named area; otherwise use recent changes
and demonstrated friction to choose a bounded starting scope. Check relevant
domain definitions and decisions when present. Report a few evidence-backed
candidates with affected files, caller burden, smallest change, tradeoffs and
recommendation strength. Explain conflicts with existing decisions.

Use a short comparison or diagram when it clarifies the choice. An HTML report
or interactive prototype is useful when requested or when a visual interaction
is the question; it is not a survey prerequisite.

Explore competing interfaces when a consequential tradeoff remains. Vary a real
constraint: common-caller simplicity, lifetime ownership, flexibility or adapter
isolation. Independent agents can explore separable alternatives if available
and within scope; choose their number to fit the question.

Compare caller examples, types and invariants, hidden complexity, test strategy,
migration cost and operational implications. Recommend a direction and surface
only decisions that need human input. A design review does not itself authorize
implementing every candidate. If an experiment would settle the question, use
the [prototype skill](../prototype/SKILL.md).
