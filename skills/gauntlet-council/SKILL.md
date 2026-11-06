---
name: gauntlet-council
description: "Cross-judgment of a deliverable (code, text, design, decision) by multiple agents: a panel of 5 judges with distinct personas (security, architecture, product, performance, maintainability) renders an independent verdict per angle, then a Builder/Critic cycle fixes each identified gap until validation or explicit abandonment after 3 passes. Explicit invocation only — never automatic, expensive in agents/tokens. Triggers on /gauntlet-council, 'put this through the council', 'cross-judgment', 'run a gauntlet on this', 'panel of judges'. Fully independent of team-dev: delegates to no team-dev agent and is referenced nowhere in it."
model: claude-opus-5
user-invocable: true
type: orchestrator
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Gauntlet Council — Cross-judgment then targeted correction

Has a deliverable judged by a panel of 5 independent personas, then fixes each identified gap via a
separate builder/critic cycle, until the panel validates it or a gap is explicitly abandoned.
Standalone skill — belongs to no `team-dev` hierarchy.

## Optional input

Can receive the path or description of the deliverable to judge (file, diff, text, proposal) as an
argument. With no argument, ask in one line: "What deliverable should I have judged?"

## Workflow

### Phase 1 — Panel scoping

Identify the deliverable's nature (code / text / design / product decision) and adapt the panel's 5
personas to that context. Default personas:

1. **Security & robustness** — flaws, edge cases, sensitive data, resilience.
2. **Architecture & technical quality** — consistency, debt, dependencies, testability.
3. **Product value** — does it meet the real need, correct priority, right scope.
4. **Performance** — execution cost, scalability, unnecessary complexity.
5. **Maintainability** — readability, implicit documentation, ease of pickup by a third party.

If the deliverable isn't code (text, decision), rephrase the 5 angles accordingly rather than
forcing a technical grid onto non-technical content.

### Phase 2 — Judge panel (Council)

Launch the 5 judges in parallel via the Agent tool, each with:
- The full deliverable (no summary — each judge must see the complete version).
- Their persona and exclusive angle — no visibility into the other judges' verdicts (independent
  judgment, no contamination).
- Instruction to return a `PASS` / `WARN` / `FAIL` verdict with, for each `WARN`/`FAIL`, a concrete,
  verifiable gap (not a general impression).

Consolidate the 5 verdicts into a single report: persona → verdict → listed gaps table.

If all 5 verdicts are `PASS`: stop here, report success, don't launch a Gauntlet.

### Phase 3 — Gauntlet cycle (Builder vs Critic)

For each `WARN`/`FAIL` gap raised by the Council, up to 3 passes max:

1. **Builder** — a correction agent receives only the targeted gap (not the whole report) and
   produces a fix.
2. **Critic** — a separate agent, without having seen the Builder's reasoning, compares the fixed
   version to the original gap and rules strictly: is the gap resolved, yes or no. The Critic must
   never receive the Builder's justification — only the before/after.
3. If the Critic rejects it: send back only the still-open gap for a new pass (never re-run on the
   whole deliverable).
4. After 3 passes with no resolution: mark the gap `ABANDON: <gap> <reason>` and exclude it from
   subsequent passes — never silently remove it from the final report.

### Phase 4 — Revalidation

Once every gap has been handled (resolved or abandoned), re-run only the judges whose initial
verdict wasn't `PASS`, on the final version. Don't re-judge angles already `PASS` in Phase 2 unless
a gap's fix could have affected them (e.g. a security fix that changes the architecture).

### Phase 5 — Final report

Produce a single report:
- Overall verdict: `SHIP` (everything `PASS` or abandonments explicitly accepted by the user) /
  `REVISE` (gaps still open) / `HOLD` (critical security abandonment).
- Table of the 5 final verdicts per persona.
- List of fixed gaps, with the pass that resolved them.
- List of `ABANDON`s with their reason — never hidden.

### Phase 6 — Conditional persistence

- If the judged deliverable is part of a project with a `.claude/` folder: offer to write the report
  to `<project>/gauntlet-council/YYYY-MM-DD_<topic>.md`.
- Otherwise, return the report directly in the response, without writing a file.

### Phase 7 — Memory

If a typical gap recurs across several invocations of this skill in the same project (e.g. the
security judge systematically rejects the same pattern), note it in
`<project>/.claude/life-knowledge.md` so future judgments account for it starting at Phase 1.
