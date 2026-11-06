# ADR 0058 — `settings.json` permissions as generic classes

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The `permissions.allow` block in `settings.json` gained an entry every time a command triggered a confirmation prompt. After several months, it peaked at **over 90 ultra-specific entries**: exact `sed` lines, paths to since-deleted projects, and a `git push` to `master` — that is, a permanent authorization for an action the Git workflow forbids (ADR 0020).

The file had become unreadable, and nobody could say what it actually allowed. A permission granted for one session stayed in effect indefinitely.

## Decision

### 1. Classes, not accumulation

`permissions.allow` holds about twenty **generic classes** — `Read`, `Glob`, `Grep`, `AskUserQuestion`, `Edit(~/.claude/skills/**)`, `Edit(~/.claude/agents/**)`, `Bash(git status*)`, `Bash(git diff*)` — rather than entries derived from one past command.

An entry that's only valid for one specific command already run has no place in the global file.

### 2. An explicit `deny` block

`permissions.deny` always carries the structural bans, chief among them pushes to `main` and `develop` (ADR 0020). An empty `deny` leaves the ban resting on the `pre-tool-use.sh` hook alone (ADR 0026) — a single layer of defense for an irreversible action.

### 3. Project permissions go in the project

A permission relevant to only one repo goes in its `.claude/settings.local.json`, not in the global configuration.

### 4. Periodic cleanup

On every `settings.json` refactor, replace accumulated entries with classes instead of adding one more.

## Positive consequences

- The file becomes readable again: what it allows is understood at a glance
- Paths to deleted projects disappear instead of piling up
- The explicit `deny` adds a second layer of defense on irreversible actions

## Negative consequences / risks

- A generic class authorizes **more broadly** than a precise entry: `Edit(~/.claude/skills/**)` covers more than a dozen per-skill entries would. This is a readability-vs-granularity trade-off, accepted on a single-user environment.
- Confirmations come back for anything outside the classes — MCP tools, project-specific commands, `Write` outside `~/.claude`. Accepted friction: those authorizations go in the project's `settings.local.json`, not the global file.
- Cleanup is manual: without discipline, accumulation resumes

## Alternatives considered

- **Accumulate as you go**: the observed state at ~95 entries, one of which contradicted the Git workflow. Rejected.
- **No pre-granted permission at all**: a confirmation on every file read, unusable. Rejected.
- **Project-only permissions**: loses the common baseline shared by every session. Rejected; the two levels coexist.

## Scope

The global `settings.json` and projects' `.claude/settings.local.json`. See also ADR 0017 (security modes), 0020 (Git workflow), and 0026 (hooks).
