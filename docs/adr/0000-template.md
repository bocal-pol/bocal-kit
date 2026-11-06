# ADR NNNN — Short title, imperative or nominal

- **Status**: accepted | superseded by [ADR NNNN](.) | deprecated
- **Date**: YYYY-MM-DD

> Template. Copy this file as `NNNN-title-in-kebab-case.md`, increment the number, remove this quote block.

## Context

What was happening **before** the decision: the observed problem, the concrete situation that made it visible, what it was costing. No theory — a dated fact, an incident, an audit, an observed drift.

A reader unfamiliar with the project should understand here why the question even arose.

## Decision

What is decided, phrased in an **actionable and verifiable** way. Tables, numbered lists, and code snippets are preferable to prose.

If the decision carries completion criteria ("done" means…), state them explicitly.

## Positive consequences

What the decision brings — 2 to 4 concrete bullets. Not a restatement of the decision itself.

## Negative consequences / risks

What it costs, what it constrains, what can go wrong. **Mandatory section**: an ADR with no displayed cost is a pitch, not a decision. Name the main risk first.

## Alternatives considered

The options genuinely considered, each with the reason for its rejection. An alternative kept as a complement is flagged as such rather than as "rejected."

## Scope

Where the decision applies, and where it doesn't. Cross-references to related ADRs.

---

## When an ADR is justified

An ADR is only useful if the decision meets **all three** criteria:

1. **hard to reverse** — reverting it costs a migration, a rewrite, or a renegotiation;
2. **surprising without context** — a competent reader would wonder "why like this?";
3. **the result of a real trade-off** — several options were genuinely on the table.

An obvious convention, a choice with no serious alternative, or a style preference doesn't need an ADR: it goes in `CLAUDE.md` or in the relevant `SKILL.md`.

An ADR is never deleted. An abandoned decision moves to `superseded by` or `deprecated` status, with the reason — the history of decisions is part of the information.
