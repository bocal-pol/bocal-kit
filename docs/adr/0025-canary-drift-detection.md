# ADR 0025 — Canary: instruction-drift detection

- **Status**: accepted
- **Date**: 2026-07-13

## Context

Claude Code can drift from its instructions without the user immediately noticing. Long sessions or heavily loaded context increase the risk of forgetting customized conventions.

## Decision

Start **every response** with the word `canary` in lowercase, alone on the first line, before any other content.

```text
canary
[normal response here]
```

The absence of `canary` on line 1 is an immediate signal that Claude Code has drifted from its instructions.

A word used as a canary must have no other legitimate reason to appear in a response — if it also names something else in the instructions (an agent, a skill, a recurring term), it can appear without being the canary, defeating the signal.

## Positive consequences

- Instant drift detection with no need to analyze the response
- Minimal token cost, no impact on response quality
- Works even after context compaction

## Negative consequences / risks

- No automatic correction mechanism — the user must flag the drift
- A detection signal only, not prevention

## Alternatives considered

- **No signal**: drift undetectable. Rejected.
- **A full sentence**: too verbose, hurts readability. Rejected.

## Scope

Cross-cutting — every Claude Code response.
