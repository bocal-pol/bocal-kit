# Primer — permanent project context

> Loaded in every session via `@primer.md` in `CLAUDE.md`.
>
> **This file doesn't repeat the conventions.** Those live in `CLAUDE.md`, loaded alongside it:
> duplicating them here would mean paying for them twice per session and creating two sources to
> keep in sync. It only contains what no other file says — the repo's purpose, how it's meant to be
> used, and its counters.

## Purpose

Bocal Kit is a public, English, anonymized Claude Code configuration: skills, orchestrator agents,
and conventions automating development, security, infrastructure, data, design, and project
management workflows. It's maintained by Bocal (`bocal-pol` on GitHub) as the public fork of a
private personal setup — see `RENAME-MAP.md` for the naming convention applied throughout.

Single entry point: `/team-dev <mode> [context]`.

## Usage — the least obvious point

This repository is meant to be cloned directly as your `~/.claude/` directory, or consulted as a
reference to cherry-pick skills/agents into an existing setup. Unlike the private source it's
forked from, there is no overlay repository and no excluded personal-scope content — everything
checked in here is meant to be public and reusable as-is.

If you maintain your own fork, the same discipline applies as to any shared configuration repo: a
committed fix is not a deployed fix until it's actually pulled into the `~/.claude/` checkout you
run against.

## Counters

| Item | Count |
| --- | --- |
| Skills (`skills/*/SKILL.md`) | see `RENAME-MAP.md` for the current count |
| Agents (`agents/*.md`) | see `RENAME-MAP.md` for the current count |
| ADRs (`docs/adr/`) | ported 1:1 from the source repo, same numbering |

Navigation index: `skills/SKILLS_INDEX.md` · `docs/adr/README.md`.

## Two conventions with no place elsewhere

- **A persona agent is named after its function**, never after a real person
  (`legal-compliance-agent`, `survival-logistics-agent`, `hr-agent`).
- There is no `scope: personal` in this repository — that concept belongs only to the private
  source repo's overlay, which isn't part of this fork.

## References

| File | Content |
| --- | --- |
| `CLAUDE.md` | All conventions — skills, agents, git, security, cost |
| `PRODUCT-RULES.md` | The product rules, detail and checklists |
| `README.md` | Structure, agent and skill catalog, installation |
| `CONTRIBUTING.md` | How to propose a skill or an agent |
| `hindsight.md` | Journal of lessons learned, dated entries |
| `skills/.router.json` | Single source of truth for Skill Router priorities |
