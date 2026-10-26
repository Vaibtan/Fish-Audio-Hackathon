---
name: code-review
description: Review a branch, PR, or working-tree change for correctness, requested behavior, and project standards.
---

# Code review

Review the requested change against its intended behavior and relevant project
standards. An issue tracker or separate spec is optional: use the user's request,
linked requirements, and established contracts. Distinguish missing requirements
from assumptions.

## Capture the review scope

Choose the comparison that matches the request, resolving refs before reviewing:

- **Committed branch:** `git diff <base>...HEAD`, with the matching commit list.
- **Working tree:** inspect `git diff --cached`, `git diff`, and
  `git ls-files --others --exclude-standard`. Read relevant untracked files;
  ordinary Git diffs omit them. Include additions, deletions, renames and binaries.
- **Branch plus local work:** compare the merge-base tree with the current files,
  including untracked additions. Label the committed and local portions.
- **PR:** use its actual base/head and diff, including later updates the user asks
  to review. Attach the PR through native Codex tools when available.

Infer a base from the named PR/branch and repository conventions when unambiguous.
Ask only when different plausible comparisons materially change the review.
Record the base/head SHAs and working-tree status. If local files can change
concurrently, record relevant content hashes or a temporary snapshot and recheck
before reporting; identify any portion that changed during review. Preserve local
work instead of switching, stashing, or committing it to simplify the review.

## Assess and report

Trace changed behavior through callers, error paths, state, resource lifetimes and
tests. Read surrounding implementation when a diff alone cannot establish impact.
Check correctness and requirement coverage alongside applicable standards; skip
formatting findings already enforced by tooling.

Use independent reviewers for substantial separable concerns when available and
within the task's scope. A small change does not require a fixed agent count.

Report actionable findings in severity order with file/line evidence, a concrete
trigger, consequence and smallest useful correction. Mark whether a finding is
about correctness, requirements or a documented standard. Treat design smells as
judgment calls, not automatic defects. State when no actionable findings remain,
and identify any checks or runtime behavior not verified. Review alone does not
authorize edits, commits, publishing or issue changes.
