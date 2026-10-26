---
name: handoff
description: Write a portable continuation brief for another agent or session when explicitly requested.
---

# Handoff

Tailor the brief to the next session's intended task. Include the objective,
constraints and approvals, authoritative spec/decision/evidence links, current
branch and working-tree state, completed work, open failures or blockers, and the
next concrete steps. Separate observed verification from proposed or untested work.

Reference existing artifacts instead of duplicating them. Use absolute paths for
local resources so a fresh session can find them, and note when they are temporary
or machine-specific. Name useful skills with paths; Codex reads their files rather
than calling a Claude Skill tool.

Use the user's requested destination. Otherwise save a clearly named file in the
OS temporary directory (`Join-Path $env:TEMP ...` on Windows). Report its absolute
path and include a concise next-session prompt. Preserve any established durable
handoff convention instead of creating a competing plan.

Redact credentials and unnecessary personal data. Writing the brief does not
start another agent, create a chat, send messages, or commit it automatically.
