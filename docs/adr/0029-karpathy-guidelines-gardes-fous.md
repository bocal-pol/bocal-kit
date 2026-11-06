# ADR 0029 — Karpathy Guidelines: behavioral guardrails before code

- **Status**: accepted
- **Date**: 2026-07-13

## Context

LLM agents make systematic mistakes: over-complicating solutions, editing beyond the requested scope, making implicit assumptions that are never surfaced. These behaviors cause regressions and off-scope deliveries.

## Decision

Invoke `karpathy-guidelines` (6 principles) systematically before any code review, refactoring, or detected sign of over-engineering:

1. **Think before coding** — understand the whole problem before writing
2. **Simplicity first** — the simplest solution that works
3. **Surgical changes** — only modify what was asked for
4. **Goal-driven execution** — stay on course toward the intent, not the details
5. **Surface assumptions** — make implicit assumptions visible
6. **Nothing speculative** — no code for hypothetical future needs

`team-dev` automatically invokes `karpathy-guidelines` before the `--backend`, `--frontend`, `--mobile` modes.

## Positive consequences

- Fewer regressions tied to off-scope edits
- Implicit assumptions become explicit decisions
- More focused, more maintainable code

## Alternatives considered

- **Code review alone**: happens late, doesn't prevent the errors. Complementary, not sufficient alone.

## Scope

Cross-cutting — all development agents, any review/refactor.
