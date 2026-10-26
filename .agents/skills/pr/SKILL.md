---
name: pr
description: Draft or revise a pull-request description grounded in the actual change and verification.
metadata:
  credits: "Adapted from Matt Pocock's pr skill; see CREDITS.md."
---

# PR description

Lead with the concrete problem and resulting behavior. Describe the final change
for someone who has not read the conversation; rewrite around the final scope
rather than narrating abandoned approaches.

Use the repository's template and conventions when present. Otherwise a small
change needs a short explanation and observed validation. Add a before/after
example, diagram, rollout note or material risk only when it helps assess the
change. Distinguish executed checks, stand-in evidence and unverified behavior.

Use domain terminology and cite the relevant issue/spec when useful. Do not invent
test evidence, insist on a visual for a prose-sized change, or turn every PR into
a fixed risk checklist. Preserve credit in [CREDITS.md](CREDITS.md).

Drafting a body does not authorize publishing or updating a PR. When publishing
is requested, use a structured body argument or a UTF-8 body file, preserve actual
newlines, and attach the PR through native Codex tools when available.
