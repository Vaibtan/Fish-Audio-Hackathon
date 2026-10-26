# Curated project skills

This project uses direct Codex work by default. `.agents/skills` is the canonical
active collection: 13 adapted existing skills, `effect-service-design`, the
complete upstream `install-anti-slop` skill, `commit-work`, and `excalidraw`
(17 total).
`commit-work`, `grilling`, `handoff`, `to-spec`, `to-tickets` and `writing-for-agents` are explicitly
invoked; the other eleven support normal automatic selection. Use `$skill-name`
to explicitly invoke any skill. No aliases or plugin manifest are required for
Codex repository discovery.

This collection was copied from another project. Historical source baselines
below describe that import; they do not establish application dependencies,
installed lint tooling, Docker setup, or validation results in this repository.

## Provenance

| Material | Source baseline | License |
| --- | --- | --- |
| Original 38-skill import and 13 adapted owners | [mattpocock/skills](https://github.com/mattpocock/skills); the original installation did not record a Git revision. The original archive was not copied here. | [Matt Pocock MIT notice](licenses/mattpocock-skills-MIT.txt); retrieved from source revision `49dd158d1076134a641b33efb035946536778336`, not asserted as the original import revision |
| Effect service design and audit reference | [dmmulroy/skills at 8603380821fee6a77c82639f364ce8fe4f5a92be](https://github.com/dmmulroy/skills/tree/8603380821fee6a77c82639f364ce8fe4f5a92be/effect-service-design) | [Upstream MIT notice](licenses/dmmulroy-skills-MIT.txt); its current copyright names Matt Pocock |
| Performance reference under diagnosing-bugs | [pstack benchmark-checklist at f713f14203cd6420cec13cd7c55c32d598dbab68](https://github.com/cursor/plugins/blob/f713f14203cd6420cec13cd7c55c32d598dbab68/pstack/skills/benchmark-checklist/SKILL.md) | [Pstack MIT notice](licenses/cursor-pstack-MIT.txt) |
| PR visual/evidence attribution | Existing imported [CREDITS.md](skills/pr/CREDITS.md) retained; the active PR guidance is condensed and does not reproduce the original visual menu | See that credit |
| Complete anti-slop installer, policies, assets and runtime rules | [dmmulroy/anti-slop at 13909c9e07590f5a85d93c62712259fe14a883f7](https://github.com/dmmulroy/anti-slop/tree/13909c9e07590f5a85d93c62712259fe14a883f7/skills/install-anti-slop) | [Dillon Mulroy MIT notice](licenses/anti-slop-MIT.txt); nested third-party notices preserved |
| Excalidraw diagram skill and references | Copied skill; source repository, revision, and license were not recorded in the supplied collection | Unknown; preserve supplied files and establish provenance before redistribution |

Local changes remove Claude invocation mechanics, automatic Git/publishing,
mandatory orchestration and repeated approval gates. Review covers local work;
TDD allows refactoring; module design respects Effect terminology and lifecycle;
research and diagnosis scale to the problem. Specs/tickets remain available for
substantial work. Survey, alternative-design and retrospective material is reached
through references under its owner rather than duplicate skill entries.

The Effect adaptation keeps capability ownership and requirement/lifetime guidance,
but removes compulsory exports and architecture-only severity assignments. Primary
v4 documentation was checked at
[effect@4.0.0-rc.112 migration/services.md](https://github.com/effect-ts/effect/blob/effect%404.0.0-rc.112/migration/services.md).
That is a documentation baseline, not a selected application dependency. Verify
APIs against the actual package pin when scaffolding or upgrading the app.

The anti-slop installer and bundled assets are available here. Copying the skill
does not install or enable Oxlint in the application. Use `$install-anti-slop`
when installation/update/configuration work is requested, then verify the target
repository's dependencies and commands.

## Archive and updates

The previous project's archive, import lockfile, research notes, and validation
script are not included here. There is no active import lockfile asserting that
customized copies are unchanged upstream imports.

Preserve source notices and local changes during updates. Compare a pinned source
revision with the supplied files; do not bulk-sync upstream files over this
collection. Add a skill only when it owns a useful workflow the existing collection
does not. Keep model/effort defaults in the user's global setup, not in skill prose.

After maintenance, check names/frontmatter, invocation policies, local references,
and bundled helper behavior. Skill Creator's `quick_validate.py` provides a fuller
frontmatter check when its PyYAML dependency is available. Check discovery in
Codex with `/skills` or the `$` selector; restart if changes do not appear.
