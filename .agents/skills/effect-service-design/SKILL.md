---
name: effect-service-design
description: Design or review Effect service ownership, dependency Layers, composition, and resource lifetimes.
---

# Effect service design

Treat a service as a cohesive capability with meaningful ownership: external I/O,
persistence, runtime resources, configuration, state or reusable effectful policy.
Keep request data, deterministic calculations, parsing and domain constructors as
explicit values or pure functions. Prefer an existing project or Effect capability
over wrapping it in a new service without added behavior.

## Establish the version and boundary

Read the pinned Effect version and the relevant local implementation/callers.
Verify v4-specific APIs against that version's primary source, using the available
find-docs skill when needed. When no package is pinned, keep recommendations
version-qualified and establish a pin before API-dependent implementation. This
is a version gate for API claims, not a reason to read every architecture document.

Trace one caller-visible operation to its effects. Place the narrow contract where
its application meaning belongs; keep technology-specific construction in its
adapter and select concrete Layers where the implementation choice is owned.
Keep an established compatible file/export convention instead of imposing a
universal module template.

## Preserve requirements and lifetimes

Yield stable dependencies during service construction when their lifetime matches
the service. Yield request-, operation- or fiber-scoped context at its actual use
site. Supplying dependencies early can erase requirements and capture the wrong
request or scope; inspect callers and composition before moving provision.

Use explicit v4 service/Layer construction rather than copying v3 automatic
`.Default` patterns. Named `Effect.fn` operations can provide useful trace names;
keep expected errors typed and preserve cancellation and defect behavior. Choose
Layer constructors and scoped resource APIs from the pinned version. Verify
acquisition, failure, interruption and release for resources that outlive a call.

A dependency-preserving Layer and an assembled production Layer can both be useful
when callers need them. Export either only when it has a real consumer. Constructor
options at an SDK/framework boundary are legitimate after the owning adapter has
obtained its runtime capabilities; syntax alone does not prove hidden authority.

## Test the advertised contract

Use a complete static service value for bounded policy tests, or a faithful local
adapter when state/storage semantics matter. Keep tiny one-off fixtures local;
partial methods that die are not reusable in-memory implementations. Export test
Layers or control services only when reuse justifies them. Share backing state
between operation and test-control views when they represent the same instance.

For test selection, consult [TDD boundaries](../tdd/TEST-BOUNDARIES.md); for a broader
interface question, consult [module design](../codebase-design/SKILL.md). Neither
reference needs to start another workflow or ask for previously settled approvals.

For a requested service/Layer audit, use [AUDIT.md](references/AUDIT.md). Report
concrete ownership, composition, lifecycle or test consequences. Differing names
or file locations alone do not warrant high-severity findings. See
[UPSTREAM.md](../../UPSTREAM.md) for attribution and the verified v4 source baseline.
