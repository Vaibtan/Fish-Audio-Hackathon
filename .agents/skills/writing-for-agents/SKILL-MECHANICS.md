# Codex skill mechanics

Each discoverable folder under `.agents/skills` has `SKILL.md` with YAML `name`
and `description`. Keep the directory and name consistent. Codex loads selected
instructions and relevant resources on demand; raw file size is not initial
context consumption.

Use `agents/openai.yaml` for UI metadata and invocation policy. Set
`policy.allow_implicit_invocation: false` for an approved explicit-only entry;
explicit `$skill-name` use remains available. Preserve existing metadata fields
when editing. Do not rely on Claude's `disable-model-invocation` frontmatter.

Link shared references directly and conditionally. A file can be read as a
reference without inventing a Claude Skill tool call or promising zero catalog
cost. Avoid duplicate descriptions and unneeded aliases.

Validate YAML, resource paths and intended discovery with the actual client when
available. Static validation does not prove behavioral effectiveness. Current
primary reference: [Codex skills](https://learn.chatgpt.com/docs/build-skills).
