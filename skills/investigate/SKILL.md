---
name: investigate
description: "INTERACTIVE 4-phase bug investigation with a stop and user validation at each step: locate → 3 ranked falsifiable hypotheses → targeted logs without fixing → minimal fix (3-strikes rule). Mode team-dev --investigate. Triggers on 'investigate', 'why is this crashing', 'analyze this bug with me', 'root cause', 'let's look together'. For an autonomous diagnosis with no intermediate validation (agents, --fix), use debug."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: cross
dependencies: []
conflicts: [debug]
---

# Investigate — Structured 4-phase debugging

Before starting, confirm you have two things:
- **The symptom**: what's concretely happening (error message, observed behavior, returned value…)
- **The expected behavior**: what should happen instead

If either is missing, ask for it explicitly before going further.

---

Before any fix, go through these 4 phases in order. **Stop at the end of each one and wait for validation** before moving to the next.

## PHASE 1: Locate and reproduce

From the symptom, explore the code (Read, Grep, Glob) to identify the 2–3 areas most likely to host the cause. List them, each with one justifying sentence.

Then describe in 3 lines the minimal scenario that reliably replays this bug.

> If you can't reproduce it reliably, say so and propose a plan to get there.

**⏸ STOP — wait for validation before Phase 2.**

---

## PHASE 2: 3 ranked hypotheses on the root cause

Propose **3 hypotheses about the root cause** (not the symptom), ranked from most to least likely.

For each:
1. One-sentence hypothesis
2. Falsifiable prediction: "if this hypothesis is true, we would observe _\<precise observation\>_; if we observe the opposite, we rule it out"

**⏸ STOP — wait for validation before Phase 3.**

---

## PHASE 3: Test hypothesis #1

Add targeted logs to verify hypothesis #1.

**Mandatory rule**:
- Prefix every log with `[DEBUG-xxxx]` (4 random characters) for bulk removal later
- **Don't propose a fix at this phase**
- State what should be observed to confirm or refute the hypothesis

> **3-strikes rule**: if all 3 hypotheses turn out false → STOP. This is no longer a code bug, it's an architecture question. Change the angle.

**⏸ STOP — wait for confirmation or refutation before Phase 4.**

---

## PHASE 4: Minimal fix

Once the hypothesis is confirmed, propose the shortest change that addresses **the root cause**.

Rules:
- No collateral optimization
- No opportunistic refactor
- Remove every `[DEBUG-xxxx]` log introduced in Phase 3

Write the Conventional Commit message explaining the root cause, not the symptom:

```
fix(scope): describe root cause fixed, not the symptom
```
