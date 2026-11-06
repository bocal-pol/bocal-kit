# ADR 0019 — Session hygiene and context compaction

- **Status**: accepted
- **Date**: 2026-07-13

## Context

Sessions stayed active in the background for hours with no intervention, accumulating context and generating invisible token costs. Large MCP results lingered in context long after they'd been used.

## Decision

Permanent session context-management rules:

- **Target**: don't exceed ~150k tokens in a single session
- **`/compact`**: after each logical task, especially after multi-file reads or code exploration
- **`/clear`**: on a topic change (e.g. moving from a security audit to frontend work)
- **Idle sessions**: close or compact sessions left untouched for several hours
- **MCP**: don't enable an MCP server on sessions that don't need it; `/compact` after any large MCP request

## Positive consequences

- Controllable, predictable token costs
- Relevant context = better answers
- No "invisible waste" from forgotten sessions

## Alternatives considered

- **Unlimited sessions**: exponential costs, polluted context. Rejected.

## Scope

Cross-cutting — all Claude Code sessions.
