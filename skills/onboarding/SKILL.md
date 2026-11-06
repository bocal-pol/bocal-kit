---
name: onboarding
description: "Generates a complete onboarding guide for new team members — architecture, stack, conventions, workflows, required access. Auto-invoke on mention of: onboarding, getting-started guide, new developer, getting started, project documentation."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Onboarding

Generates `ONBOARDING.md` at the root of the current project from available sources.

## Status: standalone, also invoked by delegation

This skill is **self-sufficient**: directly invocable (`/team-dev --onboarding` or in natural
language) with no dependency on any other skill. It's **also** invoked as a fixed delegation by
`documentation-agent` (dimension F of its Phase 1) when a project's full documentation is
requested — in that case, `documentation-agent` supplies its Phase 2 (Discovery) context as input
to avoid reading the project twice.

No strict hierarchy between the two: call `onboarding` directly for a one-off need (a new
developer joining, with no other documentation work to do); go through `documentation-agent` when
onboarding is part of a broader documentation strategy (README, API docs, product wiki at the same time).

## Workflow

### Phase 1 — Project mapping

Try reading `.claude/project-graph.md`. If absent, use Glob `**/*` and `**/**/*` (2 levels) to map the main folder and file structure.

### Phase 2 — Reading sources

Read if present: `README.md`, `package.json`, `requirements.txt`, `pyproject.toml`, `composer.json`, `.env.example`.
Also read `CLAUDE.md` or `.claude/CLAUDE.md` for internal conventions.
Glob `docs/**/*.md` for existing documentation.

### Phase 3 — Generating ONBOARDING.md

Mandatory sections:
1. **Project overview**: purpose, audience, status
2. **Technical stack**: languages, frameworks, main tools inferred from manifests
3. **Local installation**: numbered, copy-paste-ready steps (from the README or inferred)
4. **Architecture**: based on project-graph or detected Glob structure
5. **Code conventions**: from CLAUDE.md or inferred from the existing style
6. **Git workflow**: main branch, naming, PR process (from CLAUDE.md or inference)
7. **Contacts and required access**: explicit placeholders if not automatically detectable (`<!-- To fill in -->`)

Before the final write, offer to illustrate the key sections (architecture, workflow) with an accompanying narrative image. If accepted, call the Skill tool with `editorial-sketch` — automatic generation mode, no intermediate prompt validation (see `editorial-sketch/references/calling-agents.md`).

### Phase 4 — Writing

Write `ONBOARDING.md` at the root of the current project (overwrite if it exists).
Display confirmation: `✅ ONBOARDING.md generated`
