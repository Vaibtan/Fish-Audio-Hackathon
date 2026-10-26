# Choosing a meaningful test boundary

Prefer behavior a caller can observe. Use focused internal tests when the named
guarantee would otherwise be obscured, such as an algorithm's properties,
transaction/fencing behavior, cleanup, cancellation or races.

| Guarantee | Exercise |
| --- | --- |
| Domain calculation or state transition | Real logic with independent expected outcomes |
| Application policy | Real operation with bounded substitutes for external capabilities |
| Database constraint, transaction or persistence | Actual local database/adapter at the named boundary |
| Protocol, serialization or provider contract | Real adapter with representative fixtures; authorized live verification where required |
| Resource lifetime or concurrent ownership | Acquisition/failure/cancellation/race scenario with observable cleanup and ownership |

Complete Effect service values supplied through test Layers are preferable to
module mocking when replacing capabilities. Keep one-off fixtures local and name
their scope honestly. A reusable in-memory adapter must implement its advertised
contract; partial values and methods that die cannot establish that contract.

Inspect persistence directly when the invariant requires it. Also test retrieval
or restart visibility when that is part of the user contract. Neither a direct DB
assertion alone nor a simulated caller alone proves every part of the system.

Avoid assertions on incidental call counts or structure. Ordering/counts are
appropriate when they are themselves the contract, such as an idempotent external
side effect. Explain what a substitute verifies and what it leaves untested.
