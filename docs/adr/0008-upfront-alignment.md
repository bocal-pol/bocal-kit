# ADR 0008 — Upfront alignment: mandatory before any non-trivial change

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Implementations were started without scope, edge cases, or alternatives being defined. Result: costly back-and-forth, features delivered next to the real need, structural decisions made along the way with no traceability.

## Decision

Before any non-trivial change (new feature, redesign, structural decision), run the `upfront-alignment` discipline: a 5-axis interview via `AskUserQuestion` before any implementation.

### The 5 axes

1. **Intent** — what real problem, for whom, what observable success?
2. **Scope** — what's in / explicitly out, constraints?
3. **Edge cases** — empty input, concurrency, network failure, insufficient rights?
4. **Alternatives** — approaches ruled out and why?
5. **Unknowns** — what isn't decided and blocks implementation?

### Deliverables

- `CONTEXT.md` at the project root — a glossary of domain terms
- `docs/adr/NNNN-title.md` — an ADR for each structural decision
- An alignment summary + a green light or blocking unknowns

### Allowed skip

Renaming, an obvious fix, a mechanical change (typo, dependency bump), or if alignment has already been done in the same session.

## Positive consequences

- Reduces back-and-forth and re-implementations
- Decisions are traced in ADRs — readable by any agent or developer
- Shared vocabulary (`CONTEXT.md`) reduces misunderstandings between agents

## Alternatives considered

- **Implement directly and adjust**: fast but costly in corrections. Rejected for non-trivial changes.
- **Formal spec document**: too heavy for routine changes. Replaced by the lightweight 5-axis interview.

## Scope

All projects, all agents. Triggered automatically by `team-dev` before dev modes on a significant change.

## Amendment 2026-09-11 — upstream alignment (grilling + domain-modeling pattern)

- **Facts vs. decisions**: the agent looks up every verifiable fact in the environment itself; only decisions are put to the user. Each wave surfaces the full boundary of unblocked questions.
- **Multi-context**: a monorepo or a domain with several bounded contexts uses a root `CONTEXT-MAP.md` pointing to one `CONTEXT.md` per context. `CONTEXT.md` stays a pure glossary (no implementation, no generic concepts).
- **ADR criteria**: an ADR is only proposed if the decision is simultaneously hard to reverse, surprising without context, and the result of a real trade-off. A 1-to-3-sentence ADR is valid.
- The skill gets a model-oriented `description:` frontmatter, absent until then.
