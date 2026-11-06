# ADR 0027 — Temporary file hygiene

- **Status**: accepted
- **Date**: 2026-07-13

## Context

Scratch, patch, and dump files generated during sessions ended up at the root of repos, sometimes accidentally committed, sometimes holding sensitive data.

## Decision

- Never a temporary file (scratch, patch, dump) at the root of a repo
- Use `$env:TEMP` or the project's `.claude/tmp/` (gitignored)
- Any temporary file created during a task is deleted before the task is concluded
- After any dynamically generated shell command: check for suspicious files/directories (`--*`, `_tmp*`, `tmp_*`)
- Unlazy gate files: `.claude/tmp/GATES-<scope>.md` (gitignored)

## Positive consequences

- Clean repos, no accidental pollution
- Reduced risk of committing sensitive data
- A standardized, gitignored `.claude/tmp/`

## Alternatives considered

- **Files at the root**: pollution, risk of accidental commit. Rejected.

## Scope

Infra — all projects, all sessions.
