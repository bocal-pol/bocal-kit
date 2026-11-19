---
name: transfer
description: "Transfers the work in progress to Codex (OpenAI) when Claude is close to its token limit: writes a handoff file (goal, plan, repository state, decisions, next step, test commands), then either starts Codex in an isolated worktree or prepares an interactive resume in WSL. Human-only. Invoke on: /transfer, transfer to codex, I am almost at the limit, hand over to codex, continue with codex."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
disable-model-invocation: true
dependencies:
  - codex-bridge
conflicts: []
---

# Transfer — Hand Over to Codex

Human-only (`disable-model-invocation: true`). A transfer sends the code to OpenAI. A human decides it.
It never starts by itself. For the night, the `--handoff-codex` option of `goodnight` does the work,
without this skill.

This skill replaces `/codex:transfer` of the official plugin for the needs of this repository. The
plugin starts the Windows Codex, and its sandbox is blocked on Windows. Here, Codex runs in WSL.

## Procedure

1. **Preflight**: `bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh check`. Code 10, 11 or 21:
   show the complete **Login block** of the `codex-bridge` skill, **then stop**. While Codex is not
   logged in, there is nothing to transfer. Code 12 (Codex quota exhausted): say so, with the return
   time. Offer to write the handoff file anyway, for a later resume.
2. **Handoff file**: write `.claude/tmp/transfer-YYYY-MM-DD.md` (git ignores it). It must be complete
   enough for an assistant with no memory of the session to resume:
   - **Goal**: the real problem and the expected result, in two sentences;
   - **Plan**: the steps, marked **done**, **in progress**, **to do**;
   - **Repository state**: branch, `git status`, summary of `git diff --stat`, last commits;
   - **Decisions taken** and their reason, **pitfalls met**;
   - **Next step**, exact, and the **test command** that tells if the work is finished;
   - **Constraints**: repository conventions to respect, bans (no `git commit`, `git push`, secrets,
     network).
3. **Choose** (`AskUserQuestion`):
   - **Codex continues alone, in an isolated worktree** (non-interactive);
   - **Interactive resume**: Claude prepares the command. The user opens Codex in WSL.
4. **Consent** (for the first option, `AskUserQuestion`): "Codex (OpenAI) can read the whole repository
   in an isolated worktree and write in it. Send?" If no: stay on the interactive resume, or stop.
5. **First option**: `codex-bridge.sh worktree --slug transfer-<date>`, then
   `codex-bridge.sh exec --mode write --cwd .claude/worktrees/codex-transfer-<date> --prompt-file <handoff> --out .claude/tmp/transfer-<date>.out.md --confirmed`.
   Report the result with the code table of the `codex-bridge` skill (20: quota reached during the
   call, say that control returns to the user; other failures: quote the cause). On return, **merge
   nothing without review**. Follow the verification procedure of `codex-delegate` (diff, complete
   suite, commit as the single author).
6. **Second option**: give the exact command. The user runs it in a terminal:

   ```bash
   wsl
   cd <project path under /mnt/c/...>
   ~/.local/bin/codex "$(cat .claude/tmp/transfer-<date>.md)"
   ```

   Remind the user that Codex then reads the repository with its own rights. The user reviews what it
   proposes before accepting.
7. **Last word**: say what is transferred, where the handoff file is, and that **Claude takes control
   again** (diff review, tests) as soon as its limit is lifted.

## Limits to state

- Codex does not resume the conversation of Claude. It knows only the handoff file. The more precise
  the file, the better the resume.
- The free plan of Codex has its own quotas. A transfer can fail for lack of quota. The bridge detects
  it, and control returns to the user.

⚠️ Fallback: if `codex-bridge` is unavailable, write the handoff file anyway and give it to the user
for a manual resume.
