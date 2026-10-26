# Deepening an existing module

Trace a representative caller and find where understanding or changes scatter.
Choose the smallest boundary that can own that behavior.

| Dependency | Useful verification |
| --- | --- |
| Pure computation or local state | Exercise actual behavior directly |
| Persistence or local protocol | Use the real local adapter when storage, transactions or serialization matter |
| Owned remote capability | Test policy through its contract, and verify transport separately |
| External provider | Use a complete bounded stand-in for policy tests; identify what needs authorized provider verification |

Keep dependencies explicit, using Effect context and Layers where the project
owns a capability. A request value is still a value. Verify lifecycle and scope
when moving acquisition or dependency provision.

Add replacement coverage for distinct existing guarantees before deleting old
tests. A passing in-memory test cannot establish restart, database or provider
behavior. Compare before/after callers and the amount of knowledge each needs.
