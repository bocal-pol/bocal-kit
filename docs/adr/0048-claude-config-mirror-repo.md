# ADR 0048 — This repo is a versioned mirror of `~/.claude`

- **Status**: **partially superseded by [ADR 0062](0062-claude-dir-checkout-git.md)** — section 1
  (the `.gitignore` contract) still holds; section 2 (manual double-writing) is abandoned:
  `~/.claude` is now itself a git checkout.
- **Date**: 2026-09-17

## Context

The Claude Code environment lives in `~/.claude`: skills, agents, hooks, `settings.json`, `CLAUDE.md`. This folder is also a runtime working directory, into which the harness constantly writes sessions, transcripts, telemetry, shell snapshots, caches, and credentials. Versioning the folder as-is would publish personal data and secrets; not versioning it at all meant losing the ecosystem on every machine change.

So a line had to be drawn: what does the repo contain, and how do the two locations stay in sync?

## Decision

### 1. The repo is a selective mirror of `~/.claude`

Deployed via `git clone <this-repo> ~/.claude`. `.gitignore` is the contract defining what's versioned:

- **Versioned** — `skills/`, `agents/`, `docs/adr/`, `CLAUDE.md`, `primer.md`, `hindsight.md`, `settings.json`, `.mcp.json`, `install.ps1`
- **Excluded** — `.credentials.json`, `history.jsonl`, `sessions/`, `telemetry/`, `session-env/`, `shell-snapshots/`, `bash-audit.log`, `backups/`, `file-history/`, `ide/`, `memory/`, `plans/`, `plugins/`, `projects/`, `node_modules/`

The sorting rule: anything **transferable from one machine to another** is versioned; anything runtime, personal, or machine-specific isn't.

### 2. Mandatory double-writing

Any creation or edit of a skill, an agent, `SKILLS_INDEX.md`, an ADR, or `team-dev/SKILL.md` is written **in both places**: `~/.claude/...` (what the runtime reads) and the git repo (what survives).

**Never blindly copy a folder to the other** — the two locations have already drifted apart in the past. Safe procedure:

- apply the **same Edit operations** to both files;
- reserve `Copy-Item -Recurse` for **entirely new** folders;
- check for drift before acting (`Compare-Object`).

⚠️ Don't read/write these files via PowerShell 5.1, which interprets UTF-8 as ANSI and produces mojibake. Use Read/Edit/Write; `Copy-Item` stays safe (binary copy).

### 3. Bootstrapping a new machine via `install.ps1`

An idempotent, re-runnable script: system prerequisites, deploying the repo to `~/.claude`, mandatory then optional MCP servers, tooling, a final check. Without `-ForceClone`, it never overwrites an existing `~/.claude` — it backs it up to `~/.claude.bak-<timestamp>`.

## Positive consequences

- The whole ecosystem redeploys on a fresh machine in one command
- No secret or session data in the git history
- The bootstrap procedure is executable, not just documented

## Negative consequences / risks

- **Double-writing is manual and fallible**: a change written on only one side is either invisible at runtime or lost at the next commit. This is the main risk of this architecture.
- `.gitignore` must be maintained: a new, unlisted runtime folder gets versioned by accident
- Drift between the two locations isn't detected on its own

## Alternatives considered

- **A symlink `~/.claude` → the repo**: would remove the double-writing, but the runtime writes its session data into the folder, which would become permanently dirty from git's point of view. Rejected.
- **Versioning all of `~/.claude`**: would publish credentials, transcripts, and telemetry. Rejected.
- **Periodic copy repo → runtime**: would overwrite legitimate divergence with no warning. Rejected.

## Scope

This repo and the `~/.claude` environment. Applies to any session that modifies a skill, an agent, or the ecosystem's documentation.
