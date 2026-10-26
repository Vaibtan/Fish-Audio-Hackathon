# Service and Layer audit

Bound the audit to the requested diff, feature or package. Inventory relevant
services, constructors, Layers, provision sites, runtime capability access and test
substitutes. For a whole-codebase request, expand that inventory accordingly.

For each candidate record its contract/owner, dependencies, acquisition/provision
site, lifetime, representative callers and verification surface. Trace the
caller-visible operation to the composition root or a justified explicit value
boundary. Check whether a built-in capability or existing module already owns it.

Distinguish:

- pure/request values from capabilities;
- application-owned ports from technology adapters;
- stable dependencies from request/fiber/operation-scoped requirements;
- complete reusable substitutes from narrowly scoped test fixtures;
- real lifetime or requirement leaks from stylistic naming preferences.

Inspect failure and interruption paths, resource release, Layer sharing and the
scope that owns each acquired instance. Verify semantics against the project's
pinned Effect source; a `makeX` import or direct tag comparison alone is not a bug.

For an actionable finding, name the observed trigger and impact, evidence, owner,
smallest useful correction, composition/test consequences and missing validation.
Set severity from demonstrated consequences and likelihood. Do not assign P0/P1
merely because a constructor or Layer is in a different file or named differently.

Give inspected candidates a disposition: keep, deepen, move, merge, remove or add.
Retain correct explicit values, framework boundaries and scoped services. An audit
does not authorize an unrelated architecture migration or a new universal lint rule.
