---
name: codex-delegate
description: "Delegates a small coding task to Codex (OpenAI) to save Claude tokens: a local bug, a broken test, boilerplate unit tests to write. Codex works in an isolated worktree. Claude reads the diff, runs the whole test suite again, commits as the single author and merges. If Codex is unavailable (not logged in, quota exhausted), Claude does the task itself. Invoke on: delegate to codex, codex fix this bug, have codex fix this test, codex write the tests, save my tokens on this task."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
dependencies:
  - codex-bridge
  - fix-until-green
conflicts: []
---

# Codex Delegate — Give a Small Task to Codex

The principle: Codex does the mechanical, bounded work. Claude keeps the judgment (review, test,
commit). If Codex cannot do it, Claude does the task. A delegation never blocks the work.

## Optional input (if invoked from another skill or agent)

Receive: the **task**, the **success criterion** (test command) and the **scope** (files or folders
that can change). Do not ask these questions again. Consent to the send stays mandatory. Return the
report (see "Report") without writing a file. No cross-session memory.

## What we delegate — and what we keep

| Delegated to Codex | Kept by Claude |
| --- | --- |
| A local bug that one command reproduces | Anything about authentication, access rights, secrets, billing |
| A broken test whose cause is in the product | An architecture or product decision |
| Boilerplate unit tests for existing code | Anything that needs several round trips with the user |
| A small, bounded, mechanical refactoring | A task with no verifiable success criterion |

Size rule: the task fits in a few files and one command verifies it. Otherwise, do it yourself. A
delegation saves nothing if Claude must redo everything.

## Procedure

1. **Preflight**: `bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh check`. Apply the table
   "Exit codes → action" of the `codex-bridge` skill (code 10, 11 or 21: complete Login block; code 12:
   fall back to Claude). **On fallback, do the task yourself without further ceremony.**
2. **Frame**: the task in one sentence, the test command, the files involved. Run the command
   **before**. Note the starting failure (baseline). Without a reproducible failure, do not delegate.
3. **Consent** (`AskUserQuestion`): "Codex (OpenAI) can read the whole repository in an isolated
   worktree and write in it. It will not commit or push anything. Send?" If no: do the task yourself.
4. **Worktree**: `codex-bridge.sh worktree --slug <short-name>`.
5. **Prompt** (`.claude/tmp/codex-<name>.md`): the task, the success criterion, the allowed files,
   "do not change the existing tests" (except for a task that writes tests), the minimal-code
   discipline, the bans of the `codex-bridge` skill (secrets, `git commit`/`push`, network), and a
   request for a short summary of what changed and why.
6. **Run**: `codex-bridge.sh exec --mode write --cwd .claude/worktrees/codex-<name> --prompt-file <prompt> --out .claude/tmp/codex-<name>.out.md --confirmed`.
7. **According to the exit code**:
   - **0**: go to verification.
   - **20** (quota): read `git -C <worktree> diff`. **Resume from that diff**, or start again from zero
     if the diff is unusable. Finish yourself. Say "Codex reached its limit, I take over. I will try
     again at the next use."
   - **22** (sandbox) or **23/24**: fall back to Claude, with the cause in one line.
8. **Verify — do not take Codex at its word**:
   - read the **whole** diff (`git -C <worktree> diff`). Check: no file outside the scope, no secret, no
     test deleted, disabled or weakened (the integrity guard of `fix-until-green` checks this);
   - call the Skill tool with `fix-until-green`. Give it the **complete suite** and the worktree as
     scope. Green means the whole suite, not only the target test;
   - if the diff raises a doubt, fix it or discard it. Never merge it "because it passes".
9. **Close**: commit in the worktree (Conventional Commits, one commit = one intention, **no**
   `Co-Authored-By` trailer, the user is the only author). Add a `CHANGELOG.md` entry. Merge into the
   working branch (`git merge --ff-only bugfix/codex-<name>`, otherwise `git merge --no-ff`). Then run
   `codex-bridge.sh worktree-clean --slug <name>`. Never merge into `develop`. Never push.

If the suite is not green at the end of the `fix-until-green` limits: merge nothing, leave the
worktree, say so, and offer to continue by hand.

## Report (3 to 6 lines)

Who did what (Codex, or Claude fallback and why), files touched, result of the complete suite
(**green / not green**), commit created, what was discarded from the diff of Codex.

⚠️ Fallback: if `codex-bridge` is unavailable, do the task with Claude and say so in one line.
