# ADR 0063 — MIT license and contribution governance

- **Status**: accepted
- **Date**: 2026-09-17

## Context

This repo moved from a personal configuration to an environment meant to be cloned by other people. A sharing audit found it had no `LICENSE`, no `CONTRIBUTING.md`, no `SECURITY.md`, and no CI.

Legal consequence: **a published repo with no license is "all rights reserved" by default**. Someone given the link has formally no right to clone, modify, or redistribute it — even on a repo shared privately within a team. The absence of a license isn't a permissive default, it's the opposite.

Operational consequence: the repo imposed a Pull Request workflow on every project (ADR 0020) without tooling itself for it. Nothing validated the frontmatter of a contributed skill, even though the existing skills were only consistent because a one-off migration script had normalized them once.

## Decision

### 1. MIT License

Copyright holder: Pascal Dengis, 2026. Chosen for three reasons:

- It's compatible with skills already derived from MIT upstreams (`taste`, `impeccable`, `ponytail`), which a more restrictive license would put at odds with.
- The repo's content is conventions and prompts, not an asset to protect.
- It fits in two paragraphs, which matters for a repo whose entry cost is already high.

### 2. Automatic frontmatter validation

A CI workflow runs a validation script on every PR to `develop` and `main`. The script fails if a `SKILL.md` is missing one of the required fields, carries a `tools:` key (inert in a skill), has an improperly quoted value, a `model:` that isn't a known full identifier, a `name` different from its folder name — or if a file **tracked by git** contains a user-specific absolute path.

The script is written in Node with no dependency: it runs identically in CI and locally on a Windows machine, which has neither `grep` nor `tail`.

### 3. Written governance

`CONTRIBUTING.md` (anatomy of a skill and an agent, the git workflow, what CI checks), `SECURITY.md` (private reporting, what must never be committed), PR and issue templates.

## Positive consequences

- Reuse by someone else becomes legally possible
- Conventions stop resting on discipline alone: CI enforces them
- The validation script runs locally before pushing, so CI isn't a wall discovered at the last moment

## Negative consequences / risks

- **MIT can't be withdrawn.** A version published under MIT stays MIT for copies already distributed. This is what makes the decision hard to reverse, and therefore worth an ADR.
- The license covers the repo from its adoption onward; it doesn't settle the question of content already pushed to remotes before anonymization, which is a separate trade-off.
- CI validates form, not relevance: a conformant but useless skill still passes.

## Alternatives considered

- **Apache-2.0**: a patent clause with no object here, and verbosity that adds nothing to documentary content. Rejected.
- **An internal proprietary license**: would have restricted sharing to one team when most of the corpus is generic and unrelated to any employer. Rejected.
- **CC BY-SA 4.0**: designed for editorial content, poorly suited to the repo's scripts and hooks. Rejected.
- **Staying unlicensed**: the observed state, which legally forbids the intended use. Rejected.

## Scope

The repo root, `.github/`. See also ADR 0020 (Git workflow), 0016 (model identifiers), and 0062 (`~/.claude` as a git checkout).
