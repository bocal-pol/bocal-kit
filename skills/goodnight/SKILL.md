---
name: goodnight
description: "Overnight autonomous work: the user goes to sleep, Claude runs a plan step by step, tests after each step, decides alone and notes why, stops only for the irreversible or a change to the plan, and leaves a short morning report — without ever exhausting the subscription usage quota (hardware guard by hook + statusLine, stop at 80%). Invoke on: goodnight, good night, work tonight, finish this while I sleep, night mode, long autonomous session."
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

## What is guaranteed, and what is not

A prompt cannot enforce a limit: the model cannot see its live counter, and no hook reads the quota
(the only documented signal is `rate_limits` in the statusLine). The guard therefore has three parts,
all checked by `selftest`:

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
  mode the guard would refuse everything for lack of signal: do not activate the night. Use the hard
  bounds in "Headless variant".
- The model could run `goodnight.mjs deactivate` to lift the guard. This skill forbids it, and the
  command is allowed only to close the night. This is a safety net against exhaustion, not a defense
  against a hostile agent.
- If the user spends quota elsewhere during the night (another device or session), the percentage
  rises without Claude's doing: the guard still stops.

## Preflight — mandatory, no exception

1. `node ~/.claude/skills/goodnight/scripts/goodnight.mjs selftest` → all cases ✓. One ✗: stop,
   show the failure, start nothing.
2. `node ~/.claude/skills/goodnight/scripts/goodnight.mjs status` → `ok: true`. Otherwise (state absent
   or stale) the statusLine is not wired in `settings.json` (`statusLine` key + `PreToolUse` `*`
   hook). Say so and do not start: without a reliable signal the limit is not guaranteed.
3. Quota already at 70% or more: refuse the night (`activate` refuses by itself) and suggest waiting
   for the reset (`resets_at` in `state.json`).
4. Ask once, at bedtime: the **plan file** (required — no plan, no night; suggest `cadrage` or
   `sdd-plan`), the **duration** (default 8 h), the **test commands**.

## Start

1. Create the branch from an up-to-date `develop`: `feature/goodnight-YYYY-MM-DD`. Never work on
   `main` or `develop`.
2. Create the notes file `.claude/tmp/NIGHT-NOTES.md` (git-ignored). Write the plan, the start time
   and the initial quota in it.
3. Activate the guard:
   `node ~/.claude/skills/goodnight/scripts/goodnight.mjs activate --notes .claude/tmp/NIGHT-NOTES.md --hours 8`
   A refusal is a hard stop: report the reason. Default thresholds `--warn 70 --stop 80`, ceiling 90.
4. Apply `unlazy`: one observable gate per plan step.

## Loop — one step at a time

Before **each** step, read `goodnight.mjs status`.

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

## Close — always, even in stop mode

The guard lets only these pass: read, write the notes file, `git status/diff/log/add/commit` and the
close command.

1. Write the **Morning** section at the top of the notes: what is done, what is broken, where to
   start — short enough to read with a coffee (10 lines at most).
2. Commit what works, with its CHANGELOG entry.
3. `node ~/.claude/skills/goodnight/scripts/goodnight.mjs deactivate`, **last**, and never to keep
   working.
4. End the reply with the same summary, in three lines.

## Headless variant (no quota guard)

The statusLine does not run under `-p`: do not activate the night. Rely on the hard bounds of Claude
Code, which bound turns and an **estimated** cost, not the subscription window:

```bash
CLAUDE_CODE_RETRY_WATCHDOG=1 CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS=600000 \
  timeout 8h claude -p "<prompt>" --max-turns 150 --max-budget-usd 20 --no-session-persistence
```

Present this as an indicative bound: it does not guarantee staying under the quota.

## Troubleshooting

- `selftest` fails: do not start the night, report the red case.
- `status` returns "state stale" mid-night: the statusLine no longer updates. Close.
- The guard refuses everything the next morning: the deadline passed and the night was not closed.
  Run the `deactivate` command.

⚠️ Fallback: if `node` is unavailable, do not start the night — the guard cannot run.
