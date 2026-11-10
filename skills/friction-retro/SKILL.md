---
name: friction-retro
description: "Retrospective on a coding session: re-reads the session's primary sources and proposes improvements to the agent's environment (navigation pointers, automated checks, review standards, trimming CLAUDE.md, tool economy, no-ops, information access), ranked by severity, then persists them to the observation log. Use at the end of a team-dev session, after a laborious session, or when the user says 'retro', 'retrospective', 'what got stuck', 'why did that take so long', 'improve your environment'. Also as a short, immediate capture, WITHOUT waiting for the end of the session, as soon as a user correction on approach, a skill gap, or a repeated pattern occurs along the way."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[session or period to analyze — default: current session]"
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# friction-retro — Agent environment retrospective (essence)

A retrospective on a **coding session** whose object isn't the code produced but **the agent's
environment**: what, in the steering files, tools, checks, and information access, would have made
the session shorter, cheaper, or less error-prone. The deliverable is a list of improvement
candidates ranked by severity, persisted for weekly review.

> Essence extracted from `retro` (Matt Pocock). Boundaries: `explain-diff` explains code to the
> human; `improve-skills` revises SKILL.md structure; `memory-ritual` consolidates project memory.
> `friction-retro` feeds `improve-skills` via the observation log.

## Principle — implementation vs. review

All work passes through two stages. The **implementation** agent carries the heaviest **context
pressure**: exploration, writing, debugging. The **review** agent carries the least: it receives a
diff, doesn't explore, barely writes. So **code standards belong in review**
(`pr-review-agent`, `code-reviewer`), not in implementation: a rule added to CLAUDE.md costs
every turn of every agent; the same rule in the reviewer's criteria only costs at the moment it's
useful.

## Continuous capture, during the session

`friction-retro` doesn't necessarily wait for the end of the session to write. As soon as a clear
friction occurs — a user correction on approach, a skill gap revealed by usage, a pattern that has
just repeated a second time in this session — log a short entry immediately in
`~/.claude/memory/skill-observations/log.md` (same collision-safe protocol as in step 4), without
waiting to finish the current task or to run through the 7 categories below. The reflex: capture
now, triage at review time. A friction noted in the moment beats one reconstructed from memory at
session end — some don't survive that long.

This hot capture doesn't preclude a full retrospective at the end of the session: the two
complement each other, one captures as things happen, the other structures and ranks by severity.

## Workflow

### 1. Primary sources

Read the session named as the argument; by default the **current session** (the transcript in
context). If a past session is targeted, find it in `~/.claude/projects/<project>/` (Glob on date
or a keyword). Look for: long searches, errors fixed after the fact, costly tool calls,
instructions re-read with no effect.

### 2. Candidates — 7 categories

For each category, only keep a candidate if its trigger actually occurred in the session:

| Category | Question | Use when… |
|---|---|---|
| **Navigation** | Would a pointer (a line in CLAUDE.md/primer.md, a referenced doc) have avoided the search? Is there a hidden dependency between files? | the session took a long time to find information |
| **Automated checks** | Would a lint, a type check, a test, or a structure check have caught the error? | the agent made an error a tool would have detected |
| **Code standards** | Does the reviewer need a new rule, or does an existing rule need removing/clarifying? | the review let an error through |
| **Global CLAUDE.md** | Should a steering instruction move to an automated check or a pointed-to doc? | CLAUDE.md (project or global) is heavy |
| **Tool economy** | Did a tool call, an MCP, or a CLI cost too many tokens for what it delivered? | a costly call happened |
| **No-ops** | Did a sentence in the steering files change behavior relative to the model's default? If not it only costs context: remove it **entirely**, don't shorten it. A prohibition should be rephrased as a positive target. | the steering files are long |
| **Information access** | Should the agent have seen the dev server logs, a third-party API response, a read-only database? | crucial information was missing |

### 3. Presentation

List candidates **by decreasing severity** (observed cost × recurrence probability). For each: the
category, what happened, the proposed change (file + readable diff), and for a no-op the test
applied ("without this sentence, would behavior be different?").

### 4. Validation and persistence

Via `AskUserQuestion`, have each candidate decided (apply / log / reject). Then:

- **Touches a skill** → an `OBS-NNN` entry in `~/.claude/memory/skill-observations/log.md`,
  **collision-safe protocol**: read the max number, assert absence, write N+1, verify the count.
  `improve-skills` will consume it, and must run its **Phase 6 — Verification and publication
  after a fix** (SkillSpector scan + fork PR) once the fix or creation has been written — see
  [`skills/improve-skills`](../improve-skills/SKILL.md). Exact format (`stop.sh` and
  `improve-skills` parse these fields, don't change their shape):

  ```markdown
  ### OBS-012
  - Status: pending
  - Type: gap | improvement | clarification | no-op
  - Skill: name-of-the-affected-skill (or "-" if cross-cutting)
  - Severity: high | medium | low
  - Observed: what happened in the session (1-2 sentences)
  - Proposal: the envisioned change (1-2 sentences, not the full diff here)
  ```

- **General lesson** (doesn't depend on any skill) → a dated entry in `~/.claude/hindsight.md`.
- **Touches CLAUDE.md / primer.md** → propose the diff, only write it after explicit agreement.
- **Automated check** → propose the hook or script (`settings.json`, `PostToolUse`/`Stop` hook),
  don't install it without agreement.

## Where everything lives (reference)

- `CLAUDE.md` / `primer.md`: pushed into every agent's context → **pointers only**, and rules that
  actually change behavior.
- `hindsight.md`: dated lessons, one per real situation.
- Skills: docs whose `description` serves as an invocation pointer, or user commands.
- `~/.claude/memory/skill-observations/log.md`: the skill-improvement queue, reviewed via
  `/improve-skills`.

## Fallback

If the skill is unavailable: go through the 7 memory categories for the current session by hand
and log frictions manually in `~/.claude/memory/skill-observations/log.md`.

## Skip memorization

No dedicated project memory: persistence goes through the observation log, `hindsight.md`, and the
diffs proposed on steering files.
