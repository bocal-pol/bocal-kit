---
name: unlazy
description: >
  Anti-partial-compliance discipline. Write acceptance gates BEFORE any
  substantial work, break the task into a Depth Tree, run verifications, and
  refuse to report "done" while a required gate is unproven. Trigger on
  /unlazy, "tree N", "do not stop until done", "gates", or any substantial task.
model: claude-sonnet-5
type: utility
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unlazy — Anti-partial-compliance discipline

> Source: [github.com/Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy)
> Makes incomplete work **visible** and completion **testable**.
> Prove results against a ledger rather than trusting a confident "done" report.

---

## When this discipline applies

**Mandatory** as soon as the task involves one of the following:

- Writing or modifying code (any file)
- An audit or review spanning multiple files
- Any multi-step request (2+ distinct actions)
- Refactoring, migration, service integration
- Explicit invocation: `/unlazy`, `tree N`, `gates`, `do not stop until done`

**Exclusion**: a purely factual answer, a trivial one-line edit, an explanation with no action.

**Idempotence**: if a `GATES.md` already exists for this session/task, check its state via
`--status` rather than creating a new one.

---

## Step 1 — Write the gates BEFORE the work

Create `GATES.md` (or `.claude/tmp/GATES-<scope>.md`) before any implementation.
A gate = an observable result. Format:

```markdown
# Gates: [task name]

- [ ] G1: [criterion description]
  CHECK: [portable shell command]
  EXPECT: [expected success token in the output]
  EVIDENCE: pending

- [ ] G2: [a criterion with no possible command]
  MANUAL: [description of the manual check]
  EVIDENCE: pending
```

**Writing rules:**

- A runnable gate = `CHECK:` + `EXPECT:` mandatory
- A manual gate = `MANUAL:` only when no command can decide
- `EXPECT:` must be a success-only token — not a copy-paste of the assumed result
- Prefer portable Node scripts over `grep`/`tail` (missing on stock Windows)
- An impossible gate → `ABANDON: <id> <non-empty reason>` — never silently remove it

---

## Step 2 — Choose the minimal mode

| Mode | Usage |
|---|---|
| **Solo** | A focused task fitting in one session — a single `GATES.md` |
| **Orchestrated** | A build or deep review — a tree of leaves with gates per node |
| **Parallel** | Concurrent leaves — declare disjoint `OWNS:`, no write conflict |

---

## Step 3 — Build the Depth Tree (orchestrated mode)

1. Split at the task's natural boundaries
2. Each leaf = a narrow contract + an exact file ownership + its own `GATES.md`
3. Each branch = integration gates (interface compatibility, end-to-end behavior, regressions)
4. Dispatch only the leaves whose dependencies are verified
5. Re-verify every returned leaf with `--reverify` — `--status` doesn't re-run anything

**Rolling dispatch**: when a verified leaf unblocks another, dispatch it immediately without
waiting for unrelated in-flight leaves.

---

## Step 4 — Work each leaf in 4 passes

1. **Implement** the complete deliverable — no placeholder, no deferred remainder
2. **Re-read as a domain expert** — replace the cheap version of every part
3. **Hunt for defects**: correctness, integration, portability, performance, evidence
4. **Polish** — repeat until a full pass finds nothing

Only finish a leaf after a clean pass AND every gate proven or abandoned.

---

## Step 5 — Marking gates as proven

A runnable gate is **met** only if:

- The process exits 0
- `EXPECT:` matches the combined output
- `EVIDENCE:` is filled in with: the resolved shell, working directory, exit status, decisive
  output

A checked box with `EVIDENCE: pending` = an **unproven** gate.

---

## Step 6 — Audit the final report

Immediately before reporting "done":

- Re-measure every number and completion claim
- Use qualified ids (`leaf-1.2.1:G3`)
- Report the measured count: met / unmet / abandoned
- Surface **every** abandonment
- Never compose a "done" report while a required gate is unproven

---

## Honest gate rules

- Use a success-only token and require both exit 0 AND `EXPECT:`
- Negative-test against a known positive control before trusting an absence
- Measure numbers independently — don't copy a provided number into `EXPECT:` as its own proof
- Prefer portable Node scripts
- Treat an environment incompatibility as a failed check, not as proof

---

## Quick reference

```
/unlazy          → activates the discipline for the next task
tree N           → breaks the task into a tree of depth N
--status         → shows gate state with no execution
--approve        → approves and runs the CHECK: commands
--reverify       → re-runs the gates of a returned leaf
ABANDON: G1 ...  → documents an impossible gate, to surface in the report
```
