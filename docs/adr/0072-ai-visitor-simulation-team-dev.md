# ADR 0072 — `ai-visitor-simulation` skill: hybrid UX simulation, wired into team-dev systematically

- **Status**: accepted
- **Date**: 2026-10-30

## Context

Two external projects approach AI visitor simulation for UX testing from opposite angles: one judges static screenshots with 100 personas by default (broad but shallow, no real interaction); the other has 4 personas by default actually navigate in a headless browser via a dedicated daemon (deep but narrow, extra install required). Neither integrates with an existing development pipeline — both are standalone tools invoked by hand. This repo already has Playwright MCP tools configured in its runtime environment, which neither source project assumes.

## Decision

The `ai-visitor-simulation` skill combines both approaches rather than choosing one over the other:

1. **Hybrid method**: a first screenshot-based look across the full persona set (broad, cheap — inherited from the screenshot-judging approach), then real navigation via the Playwright MCP tools (already available in this environment, no install required) on a representative sample of roughly 10% (deep, costly but bounded — inherited from the live-navigation approach).
2. **100 personas by default**, not 4: a deliberate choice, against an initial recommendation of a smaller default meant to limit cost — broad coverage was judged a higher priority than token economy for this specific skill, with a `--fast` mode (20 personas) for in-progress development iterations.
3. **Automatic integration** into `team-dev --full`, a new closing-phase step placed between the anti-AI-slop filter and the release step — not an opt-in menu item like `accessibility-lead`. Explicitly skipped if the project exposes no user interface (a pure API, an internal tool with no frontend).

## Positive consequences

- Broad coverage (100 opinions) and real depth (actual interaction, not just reading a screenshot) in the same skill, with no external dependency to install.
- Every `team-dev --full` run with an interface produces UX feedback before release, on par with security or accessibility checks — production deployment is no longer the first time UX gets looked at by an outside eye (even a simulated one).
- A results folder accumulates a comparable run history over time.

## Negative consequences / risks

- A non-trivial, systematic token cost: every `team-dev --full` run on a project with an interface triggers roughly 5 subagents (in batches of 20) plus the real-navigation sample — an accepted overhead by explicit choice, not an oversight.
- AI-generated feedback isn't a real user test — risk of overconfidence if the report is taken as a definitive validation rather than a first filter (hence a systematic reminder at the top of every report).
- The closing phase gets one step longer for any project with an interface, including small internal projects with a simple UI where the signal is weaker.

## Alternatives considered

- **A smaller default, scalable on demand**: initially recommended to limit cost, rejected by the user in favor of broad coverage by default.
- **An opt-in menu item (like `accessibility-lead`)**: initially recommended to avoid imposing the cost on every `--full` run, rejected in favor of systematic execution.
- **Static screenshots only, or live navigation only**: each method alone reproduced the limits of its corresponding source project (breadth with no depth, or depth with no coverage) — rejected in favor of the hybrid.

## Scope

All projects with a user interface orchestrated via `team-dev --full`. Out of scope: APIs with no interface, internal tools with no frontend (explicitly skipped), pages behind complex authentication not provided as input. Connects with [ADR 0071](0071-perceived-performance-reactivity.md) (perceived performance, the same family of UX concern) without duplicating it, and delegates accessibility to `accessibility-lead` rather than reimplementing it.
