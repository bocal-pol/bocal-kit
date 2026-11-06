# ADR 0038 — Friction Retro: an end-of-session retrospective on the agent's environment

- **Status**: accepted
- **Date**: 2026-09-11

## Context

Friction encountered by the agent during a session (a long search for lack of a navigation pointer, an error a check would have caught, a costly tool call, a `CLAUDE.md` instruction with no effect) was only recorded by reflex, in `skill-observations/log.md`, and only when it touched a skill. Everything else was lost at the end of the session, while the steering files (`CLAUDE.md`, `primer.md`) only ever grew.

## Decision

Add a `friction-retro` skill, invoked at the close of `team-dev` (Phase D6 of `--full` mode, end-of-session for other modes) and on demand. It re-reads the session's primary sources and proposes improvements to **the agent's own environment** across 7 categories: navigation, automated checks, code standards, the global `CLAUDE.md`, tool economy, no-ops, and information access. After approval, it persists the result to `skill-observations/log.md` (a collision-safe protocol), to `hindsight.md`, or as a proposed diff on the steering files.

Guiding principle: **standards get enforced in review, not in implementation** (the review agent is under less context pressure). Any steering sentence that doesn't change behavior relative to the default is a no-op to be removed entirely.

## Positive consequences

- A closed loop: `friction-retro` feeds `improve-skills` (weekly review) instead of a randomly filled log.
- Downward pressure on `CLAUDE.md`: every instruction is regularly subjected to the no-op test.
- Friction unrelated to any skill (tools, access, checks) finally has a destination.

## Alternatives considered

- **Extend `improve-skills`**: it reviews `SKILL.md` structure, not the lived session; mixing the two would have drowned out the weekly review. Rejected; `improve-skills` only gets the "no-ops & negation" criterion.
- **Extend `explain-diff`**: aimed at a human learning from the produced code, not the agent's environment. Rejected.

## Scope

Cross-cutting — all projects, every `team-dev` mode that produces code or hit notable friction.
