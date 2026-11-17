---
name: areopage
description: "Decision support through a plurality of honest viewpoints: a panel of reasoning profiles (boldness, caution, analysis, pragmatism, values) answers in parallel and in full isolation a personal or professional decision question, then a clerk faithfully compiles positions, agreements, disagreements and collective blind spots into a neutral report — never a verdict, never a single recommendation, the decision stays entirely with the user. Explicit invocation only — never automatic, expensive in agents/tokens. Triggers on /areopage, \"help me decide\", \"panel of viewpoints\", \"shed light on this decision\", \"areopagus\". Fully independent of team-dev and of gauntlet-council: delegates to no team-dev agent and shares no verdict mechanism with gauntlet-council."
model: claude-opus-5-5
user-invocable: true
type: specialized
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Areopagus — Reasoning panel then neutral compilation

Has a panel of 5 reasoning profiles answer a decision question, each from its own bias and in
full isolation from the others, then has a Clerk compile their positions into a single, neutral
report — no verdict, no recommendation. The decision stays entirely with the user. Standalone
skill, belongs to no `team-dev` hierarchy and shares no mechanism with `gauntlet-council` (no
quality verdict, no correction cycle).

## Optional input

Can receive the decision question as a free-text argument. With no argument, ask a single
grouped question (see Phase 1) — never ask again for information already given in the initial
argument.

## Workflow

### Phase 1 — Framing the question

If no argument is given, ask in one go:
```
Areopagus — Brief:
1. The decision to shed light on (your question, as you'd phrase it)
2. Minimal context: options already considered, constraints or deadline if relevant
```
Only ask again for what's genuinely missing if the initial argument already contains part of
these elements (Lazy Principle).

Rephrase the question into a single paragraph — this exact text gets sent identically to the 5
profiles in Phase 2, never rephrased differently per profile.

### Phase 2 — Reasoning panel (isolated dispatch)

Default panel (5 profiles, generic for any personal or professional decision):

1. **The Bold** — the cost of inaction comes first: what do I lose by not moving, what's the
   smallest first step possible right now, what would I regret not having tried.
2. **The Cautious** — irreversibility and the worst case come first: is this reversible, what's
   the realistic worst case, what safety margin is left.
3. **The Analyst** — explicit, weighted criteria come first: what are the real criteria and
   their order, what's evidence vs. assumption, what do comparable cases show.
4. **The Pragmatist** — real resources come first: actual, non-recoverable cost in time/money/
   energy, what gets dropped in exchange, is it sustainable over time, not just at the start.
5. **The Aligned** — consistency with one's values comes first: alignment with what truly
   matters, impact on others, pride in the choice 5 years from now regardless of outcome.

Launch the 5 profiles in parallel via the Agent tool. Each receives exactly the rephrased
question + the retained context + its bias + the strict isolation instruction (no visibility
into the others' answers) + this mandatory answer format:
- Position/leaning (one clear line, no hedging)
- Key arguments (max 3, concrete, tied to this specific question)
- Main risk seen (even if no other profile sees it)
- The one question it would ask before deciding, if only one were left

Each profile can and should lean clearly from its assumed bias — neutrality isn't required here,
only in Phase 3.

### Phase 3 — Compilation by the Clerk

A separate agent (the Clerk) receives the 5 complete answers (never pre-summarized) and produces
the final report in this format:

```markdown
# Areopagus Report — <subject>

## The question as rephrased
## Context retained
## Comparison table by profile
| Profile | Leaning | Key arguments | Main risk seen |
## Where there is consensus
## Where there is disagreement
## The question each profile would ask before deciding
## Collective blind spots
## What this report does not do
> This report recommends no option and decides nothing on your behalf. Each profile carries an
> assumed bias — none is "right" by default over another. The decision is entirely yours.
```

The Clerk never states its own opinion, never ranks the profiles against each other, and never
hides a collective blind spot even if that leaves the report incomplete on some aspect.

### Phase 4 — Conditional persistence

- If the question belongs to a project with a `.claude/` folder: offer to write the report to
  `<project>/areopage/YYYY-MM-DD_<subject-slug>.md`.
- Otherwise: return the report directly in the response, without writing a file.

### Phase 5 — Memorization (light)

If the same type of decision recurs across several invocations and a profile systematically
converges on the same observation, flag it to the user as a pattern worth noting — never write
to `life-knowledge.md` without explicit confirmation, since the subject is often personal.
