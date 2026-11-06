# ADR 0022 — Context7 MCP: systematically up-to-date documentation

- **Status**: accepted
- **Date**: 2026-07-13

## Context

Claude generates code based on its training data, which can be stale for third-party APIs and libraries. Syntax hallucinations and incorrect versions caused silent, hard-to-debug errors.

## Decision

Use the `context7-mcp` skill **systematically** when:

- Working with an external library (React, Express, Django, Laravel, etc.)
- Generating code that uses a third-party API
- Uncertain about a dependency's version or syntax
- The user mentions a specific package version

**Don't use it for**: pure business logic, generic algorithms, simple data manipulation.

If context7 is unavailable: flag it explicitly and propose a manual check before generating the code.

## Positive consequences

- Zero syntax hallucination on verified APIs
- Generated code matches the dependency's actual version

## Negative consequences / risks

- Slight extra latency (context7 request before generation)
- Context7 must be configured and available

## Alternatives considered

- **Generating from training memory**: stale versions, hallucinations. Rejected for library-dependent code.

## Scope

Cross-cutting — all projects, all development agents.
