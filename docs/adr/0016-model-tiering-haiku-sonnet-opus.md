# ADR 0016 — Model tiering: Haiku / Sonnet / Opus

- **Status**: accepted
- **Date**: 2026-07-13 (infra audit) — revised 2026-08-21 — **revised 2026-09-17: moved to the Claude 5 generation**

> **2026-09-17 revision.** The machine was running `claude-fable-5-1` while 225 frontmatters still
> pinned the 4.x generation (`claude-opus-4-7`, `claude-sonnet-4-6`): every subagent and skill was
> running one generation behind. Script-driven migration (237 replacements) to
> `claude-opus-5` / `claude-sonnet-5`; `claude-haiku-4-5-20251001` left unchanged. `claude-fable-5-1`
> is never a default (cost): activated on demand via `/model`. The `model` in
> `settings.json` is `claude-sonnet-5`.

## Context

Every agent used `claude-opus-5` by default, generating exponential token costs. An infra audit (2026-07-13) revealed that 17 agents used Opus for tasks that didn't warrant that model. Result: a mass downgrade in a single commit.

## Decision

Allocate models by task criticality:

| Model | Use case |
| ------ | ----------- |
| `claude-haiku-4-5-20251001` | Mechanical, bounded tasks: lookups, verification, formatting, search, deterministic routing, git operations |
| `claude-sonnet-5` | **Default**: domain expertise, development, any synthesis/judgment that gets persisted |
| `claude-opus-5` | Reserved for heavy orchestration + architecture (`team-dev`, `architect`, `security-audit`) |

### Arbitration rule when in doubt

**When in doubt between Haiku and Sonnet → keep Sonnet.** A skill that produces content re-read from persistent memory, multi-version synthesis, or a decision with an asymmetric error cost stays on Sonnet — even if it looks mechanical.

Cases confirmed as Sonnet despite a mechanical appearance (2026-06-23 audit): `context7-mcp`, `network-checker`, `git-workflow`, `encode-correction`, `bug-validator`.

## Positive consequences

- Significant reduction in token costs
- Opus reserved for the handful of skills/agents that genuinely need it

## Negative consequences / risks

- Risk of underperforming on a skill misclassified as Haiku
- Requires a review each time a new skill is created

## Alternatives considered

- **Opus for everything**: uncontrolled costs. Rejected.
- **Sonnet for everything**: suboptimal for simple mechanical tasks. Acceptable but not adopted.

## Scope

Cross-cutting — all skills (`model:` frontmatter is mandatory).
