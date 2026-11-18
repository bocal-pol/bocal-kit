---
name: goodnight
description: "Overnight autonomous work: the user goes to sleep, Claude runs a plan step by step, tests after each step, decides alone and notes why, stops only for the irreversible or a change to the plan, and leaves a short morning report — without ever exhausting the subscription usage quota (two modes: interactive guard by hook + statusLine on Pro/Max/Ultra plans, headless supervisor on any plan including Team; stop at 80%). Invoke on: goodnight, good night, work tonight, finish this while I sleep, night mode, long autonomous session."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
disable-model-invocation: true
dependencies: []
conflicts: []
---

# Goodnight — Overnight Work Under a Quota Ceiling

Human-only (`disable-model-invocation: true`). A multi-hour autonomous run never starts by itself.
Inspired by the prompt "I'm done for today. You're not.": run the plan, test, decide alone, report the
essentials in the morning.

## Two modes — the subscription plan decides

A prompt cannot enforce a limit: the model cannot see its live counter, and no hook reads the quota.
Two signals exist, depending on the plan (`claude auth status` → `subscriptionType`):

| | Mode A — interactive guard | Mode B — headless supervisor |
| --- | --- | --- |
| Plans | Pro, Max, Ultra (`rate_limits` field of the statusLine) | **All, including Team and Enterprise** |
| Signal | percentage of the 5-hour and 7-day windows | `rate_limit_event` of the `stream-json` flow: `status` (`allowed` / `allowed_warning` / `rejected`), `utilization` if present, `isUsingOverage`; plus a measured token budget |
| Session | interactive (`claude` terminal) | `claude -p`, started by the supervisor |
| Stop | the hook refuses work tools; closing is possible | the supervisor **kills** the process; no close |
| Start | `/goodnight` skill | `goodnight.sh supervise` (section "Mode B") |

On a Team plan `rate_limits` does not exist (documented): mode A refuses to start, by design. Use
mode B.

## Mode A — interactive guard (Pro, Max, Ultra)

The guard has three parts, all checked by `selftest`:

- **statusLine** (`scripts/statusline.mjs`): copies the 5-hour and 7-day percentages to
  `~/.claude/goodnight/state.json`.
- **PreToolUse hook** (`scripts/guard.mjs`): once the night is active, it refuses every work tool as
  soon as the percentage reaches the stop threshold (80%). It also refuses — **fail-closed** — if the
  state is absent, stale (over 10 minutes), without percentage, if `active.json` is unreadable or if
  the deadline has passed. It stays inert outside an active night.
- **Skill discipline**: warning at 70% (finish the current step, start nothing new), 20% margin kept
  for the close, small steps committed one by one.

Known limits — tell the user at bedtime:

- The guard refuses **tool calls**. It does not cut reasoning between two calls: hence the margin
  between 80% and 100%.
- It needs an open **interactive session** (the statusLine does not run in `claude -p`). In headless
  mode the guard would refuse everything for lack of signal: do not activate the night. Use mode B.
- The model could run `goodnight.mjs deactivate` to lift the guard. This skill forbids it, and the
  command is allowed only to close the night. This is a safety net against exhaustion, not a defense
  against a hostile agent.
- If the user spends quota elsewhere during the night (another device or session), the percentage
  rises without Claude's doing: the guard still stops.

## Preflight — mandatory, no exception (mode A)

0. `claude auth status` → `subscriptionType`. `pro`, `max`, `ultra`: mode A is possible. Any other
   (including `team`, `enterprise`): **mode B only** — jump to the "Mode B" section. Steps 1 to 4
   below apply to mode A.
1. `bash ~/.claude/skills/goodnight/scripts/goodnight.sh selftest` → all cases ✓. One ✗: stop,
   show the failure, start nothing.
2. `bash ~/.claude/skills/goodnight/scripts/goodnight.sh status` → `ok: true`. Otherwise (state absent
   or stale) the statusLine is not wired in `settings.json` (`statusLine` key + `PreToolUse` `*`
   hook). Say so and do not start: without a reliable signal the limit is not guaranteed.
3. Quota already at 70% or more: refuse the night (`activate` refuses by itself) and suggest waiting
   for the reset (`resets_at` in `state.json`).
4. Ask once, at bedtime: the **plan file** (required — no plan, no night; suggest `cadrage` or
   `sdd-plan`), the **duration** (default 8 h), the **test commands**.

## Start (mode A)

1. Create the branch from an up-to-date `develop`: `feature/goodnight-YYYY-MM-DD`. Never work on
   `main` or `develop`.
2. Create `.goodnight/` (`mkdir -p .goodnight && echo .goodnight/ >> .git/info/exclude`) and put the
   notes file `NIGHT-NOTES.md` in it. Write the plan, the start time
   and the initial quota in it.
3. Activate the guard:
   `bash ~/.claude/skills/goodnight/scripts/goodnight.sh activate --notes .goodnight/NIGHT-NOTES.md --hours 8`
   A refusal is a hard stop: report the reason. Default thresholds `--warn 70 --stop 80`, ceiling 90.
4. Apply `unlazy`: one observable gate per plan step.

## Loop — one step at a time (modes A and B)

Before **each** step, read `goodnight.sh status` (**mode A only**; in mode B do not run it: the
supervisor stops the session, without any action from you).

| `status` result | Action |
| --- | --- |
| `ok: true`, `wrap_up` false | Do the next step |
| `ok: true`, `wrap_up` true (70% or more) | Finish the current step if it is nearly done, **start nothing**, go to the close |
| `ok: false` | Go to the close immediately |

For one step: implement it, run the tests, then

- **tests green** → update `CHANGELOG.md`, then commit (Conventional Commits, one commit = one
  intention, never a `Co-Authored-By` trailer);
- **tests red** → at most two fix attempts; otherwise do not commit on the work branch: create
  `feature/goodnight-wip-<step>`, commit the state there with a `wip(...)` message and the failure
  note, return to the work branch, move to the next step if it does not depend on the failure,
  otherwise close.

In the notes, for each decision taken alone: one line "decision — why".

## When to stop before the quota

Only if it is critical: an **irreversible** action (data deletion, migration on a shared database,
secret rotation), an **outbound** action (push, PR, deployment, message sent), or a **change to the
plan itself**. Then write the question at the **top** of the notes file, go to the close and wait for
the user. Everything else: decide and note why.

Forbidden at night, without exception: `git push`, opening or merging a PR, deleting a branch or
files outside the current work, `--no-verify`, installing an unlocked third-party package, touching
`main`/`develop`, working around a guard refusal.

## Close — always, even in stop mode (mode A)

The guard lets only these pass: read, write the notes file, `git status/diff/log/add/commit` and the
close command.

1. Write the **Morning** section at the top of the notes: what is done, what is broken, where to
   start — short enough to read with a coffee (10 lines at most).
2. Commit what works, with its CHANGELOG entry.
3. `bash ~/.claude/skills/goodnight/scripts/goodnight.sh deactivate`, **last**, and never to keep
   working.
4. End the reply with the same summary, in three lines.

## Mode B — headless supervisor (all plans, including Team)

Do not `activate`: the hook would refuse everything for lack of a statusLine. A script
(`supervise.mjs`) starts `claude -p --output-format stream-json`, reads the events live and **kills
the process** as soon as one of them asks for a stop:

| Event | Stop (code 4) |
| --- | --- |
| `rate_limit_event` with `status` = `allowed_warning` or `rejected` | yes |
| `rate_limit_event` with `utilization` at or above the threshold (0.8 by default; fraction or percentage) | yes |
| `rate_limit_event` with `isUsingOverage` true (beyond the included quota) | yes |
| `system/api_retry` with `error: rate_limit` | yes |
| Cumulative weighted tokens > `--max-tokens` (input + output + cache creation + 10% of cache reads; messages deduplicated by id) | yes |
| `--hours` deadline reached | yes (code 5) |

Procedure:

1. Create the working folder `.goodnight/` **inside the repository**, ignored locally:
   `mkdir -p .goodnight && echo .goodnight/ >> .git/info/exclude`. Not `.claude/tmp/`: in a
   non-interactive session `.claude/` is write-protected (seen in a trial: write refused, notes
   lost). Put the prompt file `NIGHT-PROMPT.md` in it: the plan, the test commands, and the order
   "read `~/.claude/skills/goodnight/SKILL.md`: apply *Loop*, *When to stop before the quota* and the
   prohibitions". Mandatory in the prompt: **one commit per finished step** (the stop is abrupt: no
   close, no handoff note), notes written along the way in `.goodnight/NIGHT-NOTES.md`, the
   `feature/goodnight-*` branch, and **do not run `goodnight.sh status`** (mode A only: in mode B
   there is no per-tool guard, and the call is refused for lack of permission).
2. Start:

   ```bash
   bash ~/.claude/skills/goodnight/scripts/goodnight.sh supervise \
     --prompt-file .goodnight/NIGHT-PROMPT.md --hours 8 --max-tokens 3000000 --max-turns 150 \
     -- --permission-mode acceptEdits --allowedTools "Bash(git *)" "Bash(npm test)"
   ```

   Everything after `--` goes to `claude`. `--dangerously-skip-permissions` is refused. Plan the
   permissions that are needed: a session without a human cannot answer a prompt.
3. Read the JSON summary (`outcome`, `reason`, `weighted_tokens`, `last_rate`, `log`). In the morning:
   the branch `git log` and the notes; the raw log is in `~/.claude/goodnight/run-*.jsonl`.

Known limits:

- The stop is **abrupt**: uncommitted work is lost. Hence one commit per step.
- The `allowed_warning` threshold is chosen by the platform and is **not documented**: the
  supervisor stops as soon as it appears, without knowing at what usage level it happens. The
  emission frequency of `rate_limit_event` is not documented: **a single event was observed over a
  17-turn session** (at the start), so it is probably emitted on a state change and not on every
  request. The supervisor sees a mid-night alert only if the platform emits one; **the token budget
  is the only continuously measured bound**. `utilization` was not observed on a Team account.
- The token budget is **yours**, not the Team quota: a ceiling that is too high can exceed the quota.
  Measured in a real trial: a trivial 2-step plan = 17 turns, about 196,000 weighted tokens, an
  estimated $0.89, 141 s — about 11,500 weighted tokens per turn, on a base context of about 100,000
  tokens (`CLAUDE.md`, tools, memory). Size `--max-tokens` on that rate.
- No per-tool guard in mode B: the supervisor watches the flow, it does not filter calls.

## Troubleshooting

- **Skill commands**: always `bash ~/.claude/skills/goodnight/scripts/goodnight.sh <command>`, never
  `node ~/...` (not expanded by `cmd.exe` nor by the PowerShell tool). From a `cmd.exe` terminal without
  `bash`: `node "%USERPROFILE%.claudeskillsgoodnightscriptsgoodnight.mjs" status`.
- **The hook and the statusLine go through `bash`** (`guard.sh`, `statusline.sh`), not `node ~/...`:
  under the Windows PowerShell tool `~` is not expanded, Node cannot find the script, and Claude Code
  treats the error as non-blocking — the guard would have stayed open (seen in a real test). The
  wrapper also denies if Node cannot start.
- **Team or Enterprise plan**: `rate_limits` does not exist for the statusLine (documented), so
  `status` will stay "state absent" whatever you do. Use mode B.
- **VS Code extension**: no `state.json` was observed in an extension session after wiring the
  statusLine. Cause not established (session started before the wiring, or the extension does not
  run the statusLine). If `status` stays "state absent" after a first reply, start the night from the
  terminal (`claude`), where the statusLine is supported.
- `selftest` fails: do not start the night, report the red case.
- `status` returns "state stale" mid-night: the statusLine no longer updates. Close.
- The guard refuses everything the next morning: the deadline passed and the night was not closed.
  Run the `deactivate` command.

⚠️ Fallback: if `node` is unavailable, do not start the night — the guard cannot run.
