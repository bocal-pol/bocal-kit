---
name: codex-bridge
description: "Bridge to Codex (OpenAI, installed in WSL): checks that Codex is ready (WSL, installation, ChatGPT login, quota), tells the user how to log in when it is not, runs Codex with the consent of the user, handles the fallback to Claude when the quota is exhausted, and manages isolated worktrees. Single source of the Codex call, used by codex-delegate, codex-review, codex-explore and transfer. Invoke on: codex, delegate to codex, codex is not logged in, log in to codex, codex quota, codex unavailable."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Codex Bridge — Call Codex Without Surprises

Codex is a second coding assistant, made by OpenAI. It has two uses. It **saves Claude tokens** on
small tasks. It gives an **independent second opinion**. Codex is optional. If Codex is unavailable,
Claude does the work itself.

This skill is the **only** definition of the Codex call. The skills `codex-delegate`, `codex-review`,
`codex-explore` and `transfer` call it. They do not copy it.

## Why WSL

On native Windows, Codex can neither read nor write files (its sandbox is blocked, observed). Codex
therefore runs **inside WSL** (Ubuntu), where it works. The official plugin `codex@openai-codex` is not
used to delegate. It always starts the Windows Codex.

## Commands

Always use `bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh <command>`. Never use
`node ~/...`: neither `cmd.exe` nor the PowerShell tool expands it.

| Command | Role |
| --- | --- |
| `check` | State: WSL, Codex installed, logged in, quota. JSON output |
| `exec --mode read\|review\|write --cwd <folder> --prompt-file <f> --out <f> --confirmed` | Run Codex. `read` and `review` are read-only. `write` writes in `--cwd` |
| `worktree --slug <name>` | Create `.claude/worktrees/codex-<name>` and the branch `bugfix/codex-<name>` from `HEAD` |
| `worktree-clean --slug <name>` | Remove the worktree and the branch (merged branch only) |
| `state` / `reset` | Show / clear the quota state |
| `selftest` | Check the pure cases (error classification, paths, state) |

Work files (prompt, output) go in `.claude/tmp/` of the project. Git ignores that folder.

## Exit codes → action

| Code | Meaning | Action of Claude |
| --- | --- | --- |
| 0 | Success | Read `--out`, continue |
| 2 | Consent missing | Ask the user, run again with `--confirmed` |
| 10 | WSL or Codex absent | Show the **Login block** (below), then fall back to Claude |
| 11 | Codex not logged in | Show the **Login block** (below), then fall back to Claude |
| 12 | Quota exhausted, deadline not reached | Fall back to Claude, do not call Codex. Say until when |
| 20 | Quota reached during the call | Fall back to Claude: resume the work where Codex stopped |
| 21 | Authentication refused | Show the **Login block** (below), then fall back to Claude |
| 22 | Sandbox blocked | Fall back to Claude. Say that Codex cannot access the files |
| 23 / 24 | Other failure / timeout | Fall back to Claude. Quote the end of the error message |

## Login block — show it in full, never summarize it

Users often miss the login. When the exit code is 10, 11 or 21, show **this complete message** as it
is. Do not shorten it.

> ⚠️ **Codex is not ready: you must log in once (about 2 minutes).**
>
> **What it is**: Codex is a coding assistant made by OpenAI. You need a **ChatGPT account** (the free
> plan is enough, with limited quotas). **The code you give it is sent to OpenAI.**
>
> **Steps** (in a Windows terminal):
> 1. Open Ubuntu: `wsl`. If it is not installed: `wsl --install`, then restart.
> 2. Install Codex in Ubuntu: `npm install -g --prefix "$HOME/.local" @openai/codex`
> 3. **Enable device code login** in ChatGPT: *Settings → Security* → allow the device code for Codex.
>    **Without this setting, the login fails** with a red message.
> 4. In Ubuntu: `~/.local/bin/codex login --device-auth`. A code appears.
> 5. Open the address shown **in your browser** and type the code **on the web page**, not in the
>    terminal. The terminal must only wait. Click *Continue*.
> 6. Check: `~/.local/bin/codex login status` must show `Logged in using ChatGPT`.
>
> Tell me when it is done: I check. **Until then, I do the work myself.**

Rules for the block:

- Change only the state line at the top (what is missing: WSL, installation or login). Keep all the steps.
- Never start the login for the user. **Never copy** the Windows authentication file (`auth.json`) to
  WSL. The user logs in, once, inside WSL.
- After "it is done", run `check` again and report the result. If it fails, give only the step that
  failed. Do not repeat the whole block.
- Do not repeat the complete block for each task of the session. Show it once. After that, use one line
  ("Codex is still not logged in, I do the work myself").

## Consent — before each send

Everything Codex reads goes to OpenAI. Before **each** `exec`, ask the user a question with
`AskUserQuestion`. The question names exactly **what Codex can read** (the `--cwd` folder, so the whole
repository or the worktree) and **what it can write** (nothing in `read` and `review`, the worktree in
`write`). If the answer is "no", or if there is no answer, do not call Codex. Do the work yourself.

At night, or in a session without a human, the user gives consent **once at launch**
(`goodnight --handoff-codex`). That consent covers only the worktree of that night.

In the prompt sent to Codex, always write two rules. Do not read or quote `.env`, keys, certificates
or secret files. Do not run `git commit`, `git push` or any network command.

## Fallback when Codex is unavailable

The bridge keeps a local state (`~/.claude/codex/state.json`, outside the repository):

1. **Before** a delegation, `check` reads the state. If the quota is exhausted **and** the known return
   time is not reached: code 12. Claude does the task alone and says so in one line.
2. Otherwise (healthy state, time passed, or time **unknown**): **try** Codex. This is the re-check at
   the next use. A success clears the state.
3. **If Codex fails because of the quota** (code 20): the bridge records the state. Claude **resumes the
   task at once**. It first reads what Codex already changed in the worktree.
4. One attempt per use. Never retry automatically in a loop.
5. A failure not related to the quota (login, sandbox, outage) is reported as such. Do not present it
   as a quota problem.

Known limit: nobody observed the exact quota message of Codex (it cannot be triggered on purpose). The
bridge recognizes `usage limit`, `quota`, `rate limit`, `429`. At the first real overrun, check that the
fallback started. If it did not, adjust `classify` in the script and add the case to `selftest`.

## Isolated worktree

Codex always writes in a worktree. It never writes in the working repository:

1. `worktree --slug <name>`;
2. `exec --mode write --cwd .claude/worktrees/codex-<name>`;
3. Claude reads the diff, runs the tests again, **commits itself** (Conventional Commits, one author,
   no `Co-Authored-By` trailer), merges into the working branch, then runs `worktree-clean`.

Git already ignores `.claude/worktrees/`. Codex never commits.

## Optional input (if invoked from another skill)

Receive: the **mode** (`read`, `review`, `write`), the working **folder**, the **prompt file** and the
**output file**. Do not ask the framing questions again. **Consent** stays mandatory (except when the
user already gave it for the night). Return: the exit code, the path of the output and, on fallback,
the reason in one line. No cross-session memory in orchestrated mode.

⚠️ Fallback: if `node` or `wsl.exe` is unavailable, do not call Codex. Say why and do the work with
Claude.
