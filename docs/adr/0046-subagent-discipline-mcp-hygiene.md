# ADR 0046 — Subagent discipline and MCP hygiene

- **Status**: accepted
- **Date**: 2026-09-17

## Context

ADR 0016 (model tiering) and 0019 (session hygiene) cover two of the five cost-optimization levers. Two others were left untracked, and they're the costliest in practice: the default reflex to delegate to a subagent, and the permanent activation of unneeded MCP servers.

A subagent opens its own context window and bills its own requests: delegating a task the main agent would handle directly doubles the cost for no gain. Symmetrically, MCP tool results stay in context for the whole session — a server enabled "just in case" on a pure-code session drags its weight until the end.

## Decision

### Subagent discipline

**Don't spawn a subagent by default.** A subagent is only justified if one of three conditions holds:

1. the work is genuinely parallelizable;
2. it's a large multi-file read that should be isolated from the main context;
3. the scope exceeds a single context window.

Otherwise, handle it directly.

**One orchestration level at a time**: don't stack subagents that re-spawn subagents with no real need (see the 3-level hierarchy, ADR 0014).

### MCP hygiene

- Don't enable an MCP server (Notion, Playwright…) on a session that doesn't need it.
- After a large MCP request, `/compact` to avoid dragging the residual weight (see ADR 0019).

## Positive consequences

- Removes the delegation cost on tasks the main agent handles just as well alone
- The one-orchestration-level cap makes a session's cost predictable
- Context stays available for real work rather than unused tool results

## Negative consequences / risks

- The "genuinely parallelizable" criterion requires judgment: under-delegating saturates the main context, exactly what ADR 0019 tries to avoid
- Disabling an MCP server makes it unavailable mid-session, requiring a restart if it becomes needed
- Handling a large exploration directly can cost more than isolating it — the rule has accepted exceptions

## Alternatives considered

- **Systematically delegate to subagents**: the initial state, doubling the cost with no gain on simple tasks. Rejected.
- **Ban subagents**: loses the real benefit on large explorations and parallelizable work. Rejected.
- **Always enable every MCP server**: immediate convenience, permanent contextual cost. Rejected (see ADR 0053).

## Scope

All sessions. Complements ADR 0016 and 0019 without replacing them. Source: the "Token & cost optimization" section of `CLAUDE.md`.
