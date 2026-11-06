# ADR 0009 — Unlazy discipline: acceptance gates before any substantial task

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Tasks were declared "done" with no objective verification: the code compiled, the tests passed, but the expected behavior wasn't proven. The definition of "done" was subjective and varied by agent or developer.

## Decision

Every substantial task must define **acceptance gates** BEFORE starting the work. A gate = an observable result with a verifiable command (`CHECK:`) and an expected success token (`EXPECT:`).

```markdown
# Gates: [task name]

- [ ] G1: [observable criterion]
  CHECK: node scripts/verify.mjs
  EXPECT: ✓ success
  EVIDENCE: pending
```

### Invariant rules

- **Gates before code**: write `GATES.md` before any implementation
- **Evidence is mandatory**: a checked box with `EVIDENCE: pending` = an unproven gate
- **Explicit abandonment**: an impossible gate → `ABANDON: <id> <reason>`
- **Honest reporting**: never compose a "done" report with unproven gates
- **Placement**: `.claude/tmp/GATES-<scope>.md` (gitignored)

### Trigger

Mandatory for: writing/modifying code, a multi-file audit, a multi-step task (2+ actions), refactoring, migration, service integration.

Skip for: a pure factual answer, a trivial one-line edit, an explanation with no action.

## Positive consequences

- The definition of "done" is objective and verifiable
- Abandonments are explicit and tracked — no silently dropped gates
- Reduces regressions discovered after delivery

## Alternatives considered

- **Unit tests alone**: verify code correctness, not observable behavior. Complementary, not sufficient.
- **Code review**: happens late, doesn't define the success criterion upfront. Insufficient on its own.

## Scope

All projects, all agents. A global rule (not limited to `team-dev`).
