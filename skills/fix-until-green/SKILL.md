---
name: fix-until-green
description: "Test fix loop: run the suite, group failures by cause, diagnose (debug skill), fix the product, re-run the WHOLE suite, repeat until everything passes — never cheating (no test deleted, disabled or weakened, checked by an integrity guard) and with limits that stop the loop cleanly. Called by any skill or agent that runs tests. Invoke on: red tests, fix until green, make the tests pass, fix loop, until everything passes."
model: claude-sonnet-5-5
type: utility
priority: high
scope: cross
dependencies:
  - debug
conflicts: []
---

# Fix-until-green — Fix Until Everything Passes

A red test suite is not an end: it is the start of a loop. This skill is the **only** definition of
that loop. Skills that run tests call it instead of copying it (two copies always diverge).

## Optional input (if invoked from another skill or agent)

Receive: the **test command(s)** (full suite), the **editable scope** (product directories), the
**limits** (defaults below), the target **environment**. Do not ask these again. Return the loop
report (see "Report") without writing a file. No cross-session memorization in orchestrated mode.

## Principles

1. **Green = the full suite passes**, not "the test I aimed at". Every iteration re-runs everything.
2. **Fix the product, not the test.** A test is changed only if it is proven wrong (see "When the
   test is wrong"). Never to make it pass.
3. **One cause at a time**, one commit per fix.
4. **The loop has limits**: it stops when it no longer progresses and says so. Reporting "green"
   while a red remains is forbidden.
5. **Re-run before you accuse**: a new failure is a regression only after it has been re-run on the
   original code (baseline).

## Limits (defaults, overridable by the caller)

| Limit | Default | When reached |
| --- | --- | --- |
| Attempts per cause | 3 | Mark the cause **blocked**, move to the others |
| Total iterations | 10 | Stop, "not green" report |
| Stagnation | same failure signature after 2 different attempts | Cause blocked |
| Regression introduced | a test that passed turns red | Undo the fix (`git checkout`/`revert`), count an attempt |
| Flaky test | red then green with no change | Classify as flaky, **do not** "fix" by re-running, report it |

A budget (tokens, time) imposed by the caller adds to these limits: when it runs out, close.

## Preflight

1. Work branch `feature/*` or `bugfix/*` (never `main` or `develop`); clean tree, or existing changes
   noted.
2. **Baseline**: run the suite as is on the unmodified code. Note the list of failures `F0` and the
   number of tests `N0`. `N0 = 0`: stop — no suite, no green.
3. Write the gates (`unlazy`): "the full suite exits with code 0 and at least `N0` tests".
4. Environment: never production. A suite that writes to a database or sends messages runs on a test
   environment.

## The loop

Repeat, starting at iteration 1:

1. **Run the full suite.** Record failures, number of tests, duration.
2. **All green?** Then check: exit code 0, number of tests ≥ `N0`, **integrity guard** clean (see
   below). If yes: end, "green" report. Otherwise handle the violation.
3. **Classify the failures**: re-run the red tests once to rule out flaky ones; group the
   deterministic ones by cause (same message, same stack, same product line).
4. **Pick one cause** (the most upstream: the one other failures depend on).
5. **Diagnose**: call the Skill tool with `debug` (reproduce, minimize, ranked hypotheses). Aim at
   the root cause, not the symptom.
   ⚠️ Fallback: if `debug` is unavailable, apply the same approach by hand (reproduce, isolate, one
   hypothesis at a time) and note it.
6. **Decide where the defect is**: product, test, or environment/data.
   - Product → fix the product (minimal change).
   - Test → see "When the test is wrong".
   - Environment → fix the configuration, not the test; note it.
7. **Fix**, then re-run **the targeted test**, then **the full suite**.
8. **Evaluate**: target green and no previously passing test turned red → update `CHANGELOG.md`, then
   commit (`fix(scope): …`, Conventional Commits, no `Co-Authored-By` trailer). Otherwise undo and
   count an attempt.
9. **Run the integrity guard** (below) before each commit.

## Integrity guard — cheating is forbidden

```bash
bash ~/.claude/skills/fix-until-green/scripts/integrity.sh check --base <start-ref>
```

`<start-ref>` = the commit at the start of the loop. Exit code: `0` clean · `3` **blocking** · `4`
to justify.

| Finding | Level | Action |
| --- | --- | --- |
| Test file deleted | blocking | Undo |
| `skip`, `xfail`, `.only`, `@Ignore`… added | blocking | Undo |
| Number of tests down in a file | blocking | Undo |
| `passWithNoTests`, `\|\| true`, `retries`, `--ignore`, `continue-on-error`… added | blocking | Undo |
| Assertions down, or an assertion line changed | to justify | Written justification in the report, proof that the test was wrong |
| Runner configuration changed without cheating | to justify | Same |

A blocking finding is not "justified": undo the change and fix the product. If the test is really
wrong, the proof (specification, documented expected behavior) goes into the report and the change is
proposed to the user, never applied silently in the middle of a loop.

## When the test is wrong

A test is bad only if one of these points is established, with proof:

- it checks the **implementation** and not the behavior (text of a file, wording of a label, location
  of code);
- it contradicts a specification, an API contract or an explicit ADR;
- it depends on order, time or randomness (flaky) through no fault of the product.

In those cases: rewrite the test so that it exercises the **behavior**, never delete it; the new test
must fail on the old product if there was a real defect. Everything stays traced.

## Report

```markdown
# Fix loop — YYYY-MM-DD

**Result**: ✅ green / ❌ not green (reason)
**Suite**: <command> — N tests (baseline: N0)
**Iterations**: i / 10 · **Attempts**: … · **Commits**: …

| Cause | Product file | Attempts | Status |
| --- | --- | --- | --- |

**Flaky**: … · **Modified tests (justified)**: … · **Blocked**: cause, what was tried, next hypothesis
**Integrity guard**: clean / to justify (detail)
```

A blocked cause or a reached limit **always** gives "not green", with what is still red and the next
lead. Never complete a "green" report with an unproven gate.

## Forbidden

Deleting, disabling, emptying or loosening a test to make it pass · adding `|| true` or disabling the
exit code · re-running until a flaky test passes and calling it green · changing the runner
configuration to exclude tests · `--no-verify` · pushing or opening a PR from this loop · touching
`main`/`develop`.

⚠️ Fallback: if `git` or `node` is unavailable, the integrity guard cannot run: say so, compare the
test files by hand (`git diff --stat` on the tests) and do not declare "green" without it.
