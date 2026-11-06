---
name: debug
description: "AUTONOMOUS 7-phase diagnostic methodology (reproduce, minimize, ranked hypotheses, instrument, fix, regression test, cleanup) to address a bug's root cause, not its symptom — without intermediate user validation; this is the mode called by stack agents (backend, frontend, mobile) and by team-dev --fix. Triggers on 'debug', 'fix this bug', 'regression', 'failing test', 'it's crashing'. For a step-by-step investigation validated by the user, use investigate."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[symptom / bug to diagnose]"
type: utility
priority: high
scope: cross
dependencies: []
conflicts: [investigate]
---

# debug — Diagnostic methodology (essence)

Structured debugging discipline: **each phase blocks the next**, to prevent premature fixes and
guarantee that the **root cause** is addressed, not the symptom. Complements `bug-validator` (which
*validates and records* errors): here we *diagnose and fix*.

> Essence extracted from `diagnosing-bugs` (Matt Pocock). Used by dev agents (`backend`, `frontend`,
> `mobile`) when fixing, and directly invocable via `/debug <symptom>`.

## Cross-cutting rule — redact secrets first

Any log, trace, query, or artifact pasted into the conversation or into a file first goes through
redaction: replace every secret (token, password, cookie, `Authorization` header) with
`<REDACTED>`. Build reproduction loops on **environment variables**, never on hardcoded credentials.
From a captured artifact, quote only the lines carrying the signal.

## The 7 phases — in order, no skipping

### 1. Reproduce
Establish a **reliable, deterministic** reproduction of the bug. Until it can be triggered at will,
you're not diagnosing — you're guessing. Note the exact conditions (inputs, state, environment). A
non-deterministic bug is first a **reproducibility problem**: push its frequency above 50% (loop,
fuzzing, forced data) before any hypothesis.

**Stop rule**: if no reproduction loop can be built, **stop and say so explicitly** — list what was
tried, ask for access to an environment that reproduces it, redacted artifacts, or authorization to
instrument in production. Don't silently fall back to pure code analysis.

### 2. Minimize
Reduce to the **smallest case** that still reproduces: strip away noise (data, steps, dependencies)
down to the core. A minimal case isolates the guilty variable and becomes the basis for the
regression test.

### 3. Ranked hypotheses
Formulate **3 to 5 falsifiable hypotheses**, ranked by probability, in the form "if X is the cause,
then changing Y makes the bug disappear / changing Z makes it worse." **Share the ranked list with
the user before testing** — their domain knowledge may reorder or eliminate candidates. No fix yet.

### 4. Instrument
**Prove or disprove** the hypotheses **one at a time**, in ranked order: debugger/REPL first, then
targeted logs (prefixed `[DEBUG-…]` so they're easy to find), asserts, bisection (`git bisect`,
commenting out sections). Let the facts decide — don't fix on a hunch. All disproven → back to Phase
3 with new hypotheses.

### 5. Fix
Once the cause is **proven**, apply the **minimal fix** that addresses it at the root (not a patch on
the symptom). Grep all callers: a guard in the shared function beats a guard per caller. Respect
`ponytail`/`karpathy`: surgical change, nothing speculative.

### 6. Regression test
Write the test **before** the fix, at the **correct seam** — where the bug actually occurs at the
call site, not in an artificial harness. Watch it fail, apply the fix, watch it pass, then replay
the original reproduction (Phase 1). **If no correct seam exists to lock down the bug, that's a
finding in itself**: note it, the architecture prevents securing it. Then, if the bug was reported by
a tester, follow up with `bug-validator` to record the prevention rule.

### 7. Cleanup
Exit checklist, nothing is "done" before:
- [ ] The original reproduction no longer reproduces (Phase 1 loop replayed)
- [ ] The regression test passes (or the absence of a seam is documented)
- [ ] All `[DEBUG-…]` instrumentation is removed
- [ ] Disposable prototypes are deleted
- [ ] The confirmed hypothesis is stated in the commit message / PR

## Anti-patterns to refuse

- Fixing before reproducing (Phase 5 before Phase 1).
- Stacking "fixes" on a symptom without a proven hypothesis.
- Testing a single hypothesis without considering alternatives (tunnel vision).
- Closing without a regression test (the bug will come back).
- Leaving debug instrumentation in shipped code.
- Pasting a log with a token in it.

## Fallback

If the skill is unavailable: apply the 7 phases from memory — reproduce → minimize → ranked
hypotheses → instrument → fix → regression test → cleanup.

## Skip memory

No persistence of its own. Recording a prevention rule goes through `bug-validator` (Phase 6 above).
