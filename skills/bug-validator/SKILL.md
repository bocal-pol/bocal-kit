---
name: bug-validator
description: "Bug Validator — presents each error reported by testers to the user for validation, generates a prevention rule in memory if validated, and produces a traceability report. Auto-invoke on mention of: tester error, bug report, validated bug, error validation, bug triage."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Bug Validator — Error Validation and Memorization

Presents each error reported by testers to the user for validation.
If validated: generates a prevention rule and records it in the memory system.

> **Complement**: `bug-validator` **validates and memorizes**; to **diagnose and fix** a bug, use the `debug` skill (reproduce → minimize → hypothesis → instrument → fix → regression test). The two chain together: `debug` fixes, `bug-validator` memorizes the prevention rule.

## Invocation modes

### Initial mode (first pass)
Invoked from `team-dev --bug` or directly with a list of errors or with no argument.

### Re-validation mode (follow-up pass after a dev fix)
Invoked with `--retest [BUG-XXX,BUG-XXX,...]` or from `team-dev --fix` after a fix is confirmed.
- Read the tracker `quality/bug-tracker/bugs.md`
- Only process the specified BUG-XXX items with status `Awaiting re-test`
- Go directly to Phase 3 with the tracker entries

## Optional input (if invoked from `team-dev --bug`)

If a list of errors is provided as input (Markdown file or inline text):
- Use it directly without asking about the source
- Start at Phase 2

Otherwise: run the full workflow starting at Phase 1.

## Workflow

### Phase 1 — Error collection

If no errors are provided as input:
1. Search via Glob for the most recent file in `quality/bug-validator/reports/*.md` (descending sort)
2. Fallback: search for `**/bug-report*.md`, `**/errors*.md`, `**/defects*.md` at the project root
3. If no file is found: ask via AskUserQuestion — paste the list of reported errors directly

Each error must contain at minimum: **description**, **reproduction steps** (if available), **observed behavior**, **expected behavior**.

### Phase 2 — Sequential numbering

Search via Glob for `quality/bug-validator/*.md` to determine the last BUG-XXX number used.
Number each new error: BUG-001, BUG-002, etc. (continue the existing sequence).

### Phase 3 — User validation (per error)

For each BUG-XXX error, display a summary card:

```
──────────────────────────────────────────
BUG-XXX — [Short title]
──────────────────────────────────────────
Description   : [error description]
Reproduced    : [steps / context]
Observed      : [current behavior]
Expected      : [correct behavior]
Severity      : [Critical / Major / Minor / Cosmetic]
──────────────────────────────────────────
```

Then ask via AskUserQuestion:
> **BUG-XXX — [Title]**: Validate this error?
> - `v` or `yes` → Validated (generates a prevention rule)
> - `r` or `no` → Rejected (false positive — archived with no rule)
> - `s` or `skip` → Skipped for now (to revalidate later)

Process errors one at a time. Don't batch validations.

### Phase 4 — Rule generation (if validated)

For each validated error, generate a prevention rule in two steps:

**Step A — Formulate the rule**:
Analyze the error to infer its likely root cause and formulate:
- **Rule**: what should no longer be done (or what should always be done)
- **Why**: the root cause / consequence of the error
- **How to apply**: in what context to apply this rule

**Step B — Write to memory**:
Create a `feedback` memory file in the auto-memory system:
- Path: `memory/bug_rule_XXX.md` (in the current project's `memory/` folder)
- Update `memory/MEMORY.md` with an index line

Memory file format:

```markdown
---
name: Bug Rule — [BUG-XXX short title]
description: Prevention rule from validated bug BUG-XXX — [title]
type: feedback
---

[Formulated rule: "Never do X because it causes Y" or "Always do Z to avoid W"]

**Why:** BUG-XXX — [short description of the error reported by the tester]
**How to apply:** [application context — code type, project phase, related skill]
```

Index line in MEMORY.md:
```
- [Bug Rule — Title](bug_rule_XXX.md) — short one-line rule
```

### Phase 5 — Report and tracker persistence

#### 5a — Session report

1. Bash: `mkdir -p quality/bug-validator`
2. Write `quality/bug-validator/YYYY-MM-DD_bug-validator.md`:

```markdown
# Validation report — YYYY-MM-DD

## Summary

| Total | Validated | Rejected | Skipped |
|-------|---------|---------|---------|
| X     | X       | X       | X       |

## Detail per error

### BUG-XXX — [Title] — ✅ Validated / ❌ Rejected / ⏭️ Skipped

**Description**: ...
**Generated rule**: ... *(if validated)*
**Memory**: `memory/bug_rule_XXX.md` *(if validated)*

---
```

#### 5b — Cycle tracker (persists across passes)

Read `quality/bug-tracker/bugs.md` if it exists, then update or create it.
This file is the source of truth for the dev/QA cycle. Never delete it between passes.

Tracker format:

```markdown
# Bug Tracker — [Project name]

| BUG-ID | Title | Severity | Status | Cycle | Associated TCs | Validated by | Validation date |
|--------|-------|----------|--------|-------|-------------|-----------|----------------|
| BUG-001 | [Title] | Critical | Awaiting fix | 1 | TC-012, TC-015 | [name] | YYYY-MM-DD |
| BUG-002 | [Title] | Major | Resolved ✅ | 2 | TC-007 | [name] | YYYY-MM-DD |
```

**Possible statuses**:
- `New` — reported, not yet validated
- `Awaiting fix` — validated by the user, dev must fix
- `Awaiting re-test` — dev flagged the fix, QA must replay
- `Resolved ✅` — re-test passed, bug confirmed fixed
- `Rejected ❌` — false positive, not kept
- `Skipped ⏭️` — to revalidate later

After each `bug-validator` pass: update the status of each processed BUG-XXX.
After each passed QA re-test: set the status to `Resolved ✅` and increment the cycle.

Bash: `mkdir -p quality/bug-tracker`
Write: `quality/bug-tracker/bugs.md` (incremental update, never fully overwritten)

#### 5c — Current cycle summary

At the end of each pass, display:

```
═══════════════════════════════════════════════════
 CYCLE STATUS — Pass N
═══════════════════════════════════════════════════
 ✅ Resolved      : X bugs
 🔧 Being fixed   : X bugs (to send to devs)
 🔁 To re-test    : X bugs
 ⏭️  Skipped       : X bugs
 ❌ Rejected      : X bugs
───────────────────────────────────────────────────
 Next step:
   → Devs: fix the "Awaiting fix" bugs
   → Then: /team-dev --qa-lead --retest BUG-001,BUG-003,...
   → Then: /team-dev --bug --retest BUG-001,BUG-003,...
═══════════════════════════════════════════════════
```

If all bugs are `Resolved ✅` or `Rejected ❌`: display `🎉 Cycle complete — no open bugs` and invoke `memory-ritual`.

<!-- To implement once the dev skills exist:
     Replace "Devs: fix manually" with:
     → /team-dev --fix BUG-001,BUG-003  (dispatches to the relevant stack agent: --backend, --frontend or --mobile)
-->

### Phase 6 — Final confirmation

Display a summary:
```
✅ X error(s) validated → X rule(s) written to memory
❌ X error(s) rejected — archived with no rule
⏭️ X error(s) skipped — to revalidate

Report: quality/bug-validator/YYYY-MM-DD_bug-validator.md
```
