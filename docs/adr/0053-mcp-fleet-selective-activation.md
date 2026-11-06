# ADR 0053 — MCP fleet: a versioned scope and selective activation

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The MCP servers used by the ecosystem don't share the same cost, the same trust level, or the same scope. Some are necessary for any coding session (up-to-date documentation, structured reasoning); others are specialized and context-expensive (Playwright, Notion, Glif, image or video generation).

Two decisions were being made implicitly, never tracked: which ones are versioned in the repo, and which ones should stay off by default.

## Decision

### 1. A narrow versioned scope

The repo's `.mcp.json` only declares the two **Hugging Face** servers (`hf-image`, `hf-t2v`) — public HTTP endpoints, no secrets, identical on any machine (see ADR 0023).

Other servers are **installed by the setup script**, not declared in the repo:

- **Mandatory** — `context7` (up-to-date documentation, ADR 0022) and `sequential-thinking`
- **Optional** — `playwright`

Connectors requiring personal authentication (Notion, Glif, Atlassian, Google…) are never versioned: they depend on an account, not on a machine.

### 2. `sequential-thinking` for multi-step reasoning

Use the `sequential-thinking` skill for any complex, multi-step reasoning: architecture decisions, difficult debugging, sprint planning, complexity estimation. Its cost is justified by the quality of the resulting decision, not by routine use.

### 3. Selective activation

Don't enable an MCP server on a session that doesn't need it — MCP tool results stay in context for the whole session. After a large MCP request, `/compact`.

This is the tooling-side counterpart to the subagent discipline (ADR 0046).

## Positive consequences

- The repo contains no MCP configuration tied to a personal account
- A fresh machine gets the necessary MCP baseline in one setup run
- The context cost of specialized MCP servers is only paid by the sessions that use them

## Negative consequences / risks

- MCP configuration is **split across two sources** (the versioned `.mcp.json` and the local install): both must be read to know a machine's actual fleet
- A server installed locally can drift in version from one machine to another, with no trace kept in the repo
- Enabling an MCP server mid-session often requires a restart

## Alternatives considered

- **Version everything in `.mcp.json`**: would publish configurations tied to personal accounts. Rejected.
- **Version nothing**: would lose the two HF servers, which are identical everywhere and secret-free. Rejected.
- **Always enable the whole fleet**: immediate convenience against a permanent contextual cost. Rejected.

## Scope

The ecosystem's MCP tooling. See also ADR 0022 (Context7), 0023 (Hugging Face), 0046 (MCP hygiene), and 0048 (the mirror repo).
