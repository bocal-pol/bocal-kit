# ADR 0017 — Security modes: safe / dev / audit

- **Status**: accepted
- **Date**: 2026-07-13

## Context

A uniform permission mode let Claude Code write, delete, or push code in every context, including during audits where only reading should be possible. Accidental destructive actions during analysis were a real risk.

## Decision

Split permissions into 3 modes declared at the start of a session:

| Action | `safe` (default) | `dev` | `audit` |
| ------ | --------------- | ----- | ------- |
| Read, Glob, Grep | yes | yes | yes |
| Write, Edit | confirmation | yes | no |
| Bash, PowerShell | confirmation | yes | no |
| WebFetch, WebSearch | confirmation | yes | no |
| git push | no | feature/* only | no |
| File deletion | no | confirmation | no |

- **`safe`**: absolute default — matches `"defaultMode": "plan"` in `settings.json`
- **`dev`**: active implementation — declared at the start of a session
- **`audit`**: strict read-only — no writes, no shell

With no explicit declaration, `safe` always applies.

## Positive consequences

- No accidental destructive action possible in audit mode
- Traceable work context at the start of a session
- The `safe` default protects against drift

## Alternatives considered

- **Uniform permissions**: too permissive in audit, too restrictive in dev. Rejected.
- **Confirmation for everything**: excessive friction in active development mode. Rejected.

## Scope

Cross-cutting — all Claude Code sessions.
