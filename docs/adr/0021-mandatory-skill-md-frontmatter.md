# ADR 0021 — Mandatory frontmatter metadata in SKILL.md

- **Status**: accepted
- **Date**: 2026-07-13

## Context

`SKILL.md` files were inconsistent: no common structure, fuzzy relationships between skills, and the Skill Router couldn't compute scores or enforce dependencies automatically.

## Decision

Every `SKILL.md` must include a strict YAML frontmatter with 7 mandatory fields:

```yaml
name: laravel-developer       # unique kebab-case identifier
model: claude-sonnet-4-6      # full identifier mandatory
type: framework               # orchestrator|framework|domain|utility|context|specialized
priority: high                # high|medium|low
scope: backend                # backend|frontend|infra|mobile|data|security|cross
dependencies:
  - context7-mcp
conflicts:
  - dotnet-developer
```

- `model`: always a full identifier (`claude-sonnet-4-6`, never bare `sonnet`)
- `dependencies`: check availability before invoking, warn if missing
- `conflicts`: never activate two conflicting skills in the same session
- `scope: cross`: reserved for cross-cutting skills

## Positive consequences

- The router can compute confidence scores
- Dependencies and conflicts are automatically enforceable
- The skills index is navigable by domain, type, and priority

## Alternatives considered

- **Free-form frontmatter**: no usable structure. Rejected.
- **No frontmatter**: skills opaque to the router. Rejected.

## Scope

Cross-cutting — all skills (~100 `SKILL.md` files).
