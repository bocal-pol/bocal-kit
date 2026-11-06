# ADR 0024 — Cross-session memory system (primer, hindsight, memory-ritual)

- **Status**: accepted
- **Date**: 2026-07-01

## Context

Every Claude Code session started from scratch: project context rediscovered, conventions re-explained, past mistakes repeated. There was no memory between sessions.

## Decision

A persistent, 3-component memory system, loaded automatically:

- **`primer.md`**: the project's permanent context (purpose, stack, architecture, references) — loaded via `@primer.md` in `CLAUDE.md`
- **`hindsight.md`**: a journal of lessons learned (dated entries, format: context + lesson) — loaded via `@hindsight.md`
- **`memory/`**: a directory of memos structured by type (user, feedback, project, reference) with a `MEMORY.md` index

### Consolidation via `/memory-ritual`

Explicit `/memory-ritual` invocation: merge duplicates, archive the obsolete, promote recurring patterns into rules, reorganize `MEMORY.md`.

## Positive consequences

- Full continuity between sessions — no more rediscovering context
- `hindsight.md` prevents repeating the same mistakes
- Recurring patterns become permanent rules

## Negative consequences / risks

- `MEMORY.md` is capped at ~200 lines (truncated beyond that)
- Memories can go stale — check validity before acting on one

## Alternatives considered

- **No memory**: constant rediscovery, costly. Rejected.
- **Inline memory in CLAUDE.md**: file would grow too large. Rejected.

## Scope

Cross-cutting — all sessions, all projects.
