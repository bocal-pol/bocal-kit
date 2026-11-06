# ADR 0062 — `~/.claude` is a git checkout of this repo, not a copy

- **Status**: accepted
- **Date**: 2026-09-17
- **Supersedes**: ADR 0048 §2 (manual double-writing)

## Context

ADR 0048 required writing every change "in both places": the repo and `~/.claude`. Repeated incidents showed this discipline doesn't hold:

- Old, pre-rename copies of agents resurrected by a blind sync.
- A batch of an audit's fixes marked "✅ fixed" while several files — core orchestration skills, config, domain-specific skills — had never actually reached the machine. The environment that was actually running still contained stale names from before a rename.
- Project memory already documented this failure mode, with no effect on behavior.

The problem is structural: a procedural fix ("remember to copy") doesn't survive fatigue or parallel sessions.

## Decision

1. **`~/.claude` is a git repo**: `git init` in place, `remote origin` = this repo, checked out to `develop` (or a `feature/*` branch for testing). No folder is moved: `.credentials.json`, `projects/`, `memory/`, `sessions/`, `skills/synced/`, `settings.local.json` stay where they are, covered by `.gitignore`.
2. **A single modification flow**: a `feature/*` branch → a PR to `develop` → `git pull` inside `~/.claude`. A second clone (for example on another drive) is just a working copy.
3. **Divergence is detected, not assumed**: a mirror-check script, run by the repo's `SessionStart` hook, compares `~/.claude`'s commit to the current worktree's and flags any modified or untracked file in `~/.claude`.
4. **What isn't versioned doesn't go in `~/.claude`**: per-project knowledge (files like `frontend-knowledge.md` and similar) is written into `<project>/.claude/`, never into the global config.

## Positive consequences

- A committed and pulled fix is **by construction** the one that's running
- `git status` inside `~/.claude` replaces manual hash comparisons
- The machine's local history becomes visible (`git log`, `git diff`)

## Negative consequences / risks

- The runtime writes into `~/.claude` continuously: any new generated folder or file must be added to `.gitignore`, or `git status` becomes noisy (the hook flags this)
- Checking out a `feature/*` branch in `~/.claude` changes the behavior of sessions being tested — intentional, but worth keeping in mind before opening a "serious" session
- The HTTPS remote requires a working credential helper

## Alternatives considered

- **A symlink/junction `~/.claude` → the repo** (rejected in ADR 0048): moving the live folder while a session is running locks files; `git init` in place avoids any move.
- **Periodic copy repo → machine**: overwrites local additions with no warning. Rejected.
- **Keeping the double-writing**: repeated incidents. Rejected.

## Scope

The `~/.claude` environment and this repo. Any session that modifies a skill, an agent, a hook, or `settings.json`.
