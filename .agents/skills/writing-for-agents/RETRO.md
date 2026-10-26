# Instruction maintenance after a session

Read the named session's actual evidence, relevant diffs and governing instructions.
Use the current session when no other one was named. Identify repeated navigation
cost, conflicting rules, unintended stops, missing observable checks or unnecessary
tool work. Distinguish a measured failure from a hypothetical improvement.

Check existing package scripts, CI and tooling before proposing another guardrail.
Prefer a small deterministic check for a repeated mechanical failure; use prose
for judgment and facts tooling cannot express. Reviewers may need source context
beyond a diff to establish impact.

Recommend the smallest correction and its verification. Apply changes only within
the requested scope; a retrospective need not grow the environment, add a new
skill or edit global instructions. Retire rules that no longer change useful
behavior, preserving real constraints and relevant provenance.
