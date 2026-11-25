---
name: sync-claude-home
description: "Reconcile the ~/.claude folder (the checkout used by sessions) with the working clone of the claude-config repository: detect the divergence, show what differs in each direction, move the changes through a branch and a PR, then prove that both commits are equal. Use when the user says 'I updated .claude in my session and I want it in this folder', 'sync .claude', 'check-mirror reports a divergence', 'my ~/.claude is behind', or after a check-mirror warning."
model: claude-sonnet-5-5
user-invocable: true
argument-hint: "[direction: home-to-work | work-to-home — default: ask]"
type: utility
priority: medium
scope: infra
dependencies:
  - git-workflow
conflicts: []
---

# sync-claude-home — `~/.claude` and the working clone

`~/.claude` is a git checkout of the `claude-config` repository. A second clone is the workspace. The two drift when a change is made on one side only. The `check-mirror.ps1` hook reports it but does not fix it. This skill fixes it. It never copies files by hand: direct copies create the divergence you want to remove.

## Procedure

1. **Establish the facts** (no question to the user) for `~/.claude`, then for the working clone: `git -C <path> status --short`, `git -C <path> branch --show-current`, `git -C <path> fetch origin`, `git -C <path> rev-parse HEAD`, `git -C <path> log --oneline origin/develop..HEAD`. A git-ignored file (`settings.local.json`, `memory/`, `.claude/tmp/`) is never a divergence.
2. **Classify.** Both `HEAD` equal and both trees clean: nothing to do. Say so and stop. Otherwise there are four cases: uncommitted changes on one side, local commits not pushed, one side behind `origin/develop`, both sides moved (a real conflict).
3. **Choose the direction.** Ask (AskUserQuestion) only if the argument is missing and both sides hold clean changes. The direction decides which version is overwritten.
4. **Move through git:**
   - `home-to-work`: in `~/.claude`, create `feature/<slug>` from an up-to-date `develop`, commit (Conventional Commits, no trailer), push, open the PR with `--base develop`. After the merge, run `git pull origin develop` in the working clone.
   - `work-to-home`: after the merge into `develop`, run `git -C ~/.claude checkout develop && git -C ~/.claude pull origin develop`. A dirty `~/.claude` tree blocks the pull. Say so. Do not run `reset --hard` or `stash` without approval.
   - Real conflict: show both versions of the file, let the user decide, do not resolve it in silence.
5. **Prove.** `git -C ~/.claude rev-parse HEAD` must equal `git -C <work> rev-parse HEAD`, and `git status` must be clean on both sides. A committed fix is not a deployed fix: without this equality, do not report "synchronized".

## Limits

- Hooks and the `PATH` are frozen when a session starts. After a pull that changes hooks, restart the session.
- This skill does not touch the overlay repository `claude-config-perso`, nor the public mirrors (see `ship-chain` for those).
