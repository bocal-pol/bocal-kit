---
name: upfront-alignment
description: "Upfront alignment before any non-trivial change: a discovery interview across 6 axes (intent, scope, edge cases, alternatives, unknowns, security risks) until every decision branch is resolved, then a shared vocabulary (CONTEXT.md, or CONTEXT-MAP.md in a multi-context setup) and an ADR for hard decisions. Use before implementing a new feature, a redesign, or a structuring decision, and when the user says 'alignment', 'scope this for me', 'before implementing', 'let's align', 'what do we mean by'. Don't use for an obvious rename or fix."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[description of the change]"
type: utility
priority: high
scope: cross
dependencies: []  # paid-consultant-agent/devils-advocate-agent/mentor-agent/ceo-decision-agent: conditional, Phase 1bis only
conflicts: []
---

# upfront-alignment — Shared vocabulary and upfront alignment (essence)

An **alignment gate before any significant change**: a discovery interview that resolves every decision branch, **then** documents hard decisions (ADR) and builds a **shared domain vocabulary** (`CONTEXT.md`). Reduces both misalignment *and* verbosity — variables, functions, and files end up named with the same language.

> Essence extracted from `grill-with-docs` = `grilling` + `domain-modeling` (Matt Pocock) — no plugin, no imposed tracker. Complements `minimal-code-discipline` (before writing, go down the ladder) and `karpathy-guidelines` (think before coding) upstream: **before even deciding what to write, align on the what and the why.**

## When to use it

- Before any **non-trivial** change (feature, redesign, structuring decision).
- Invoked by `team-dev` before dev modes on a significant change, or directly via `/upfront-alignment <description>`.
- Skip if the change is trivial/mechanical (a rename, an obvious fix) — don't ritualize the unnecessary (ponytail spirit).
- For a structuring **non-technical** decision (investment, hiring, an offer, a budget), Phase 1bis brings 4 leadership personas to bear on the same decision before concluding.

## Workflow

### Phase 1 — Alignment interview (grilling)

Ask questions **until every decision branch is resolved** — don't stop at the first level. Via `AskUserQuestion`, in waves:

1. **Intent**: what's the real problem? for whom? what observable success?
2. **Scope**: what's in / explicitly out? constraints (perf, security, deadline)?
3. **Edge cases**: what happens with [empty input / concurrency / network failure / insufficient permissions]?
4. **Alternatives**: what approaches were discarded, and why? what would make this choice wrong?
5. **Unknowns**: what isn't decided yet and blocks implementation?
6. **Security risks** (OWASP A04 — Insecure Design): does this feature touch auth, access rights,
   personal data, a payment flow, or user-entered content? If so, what's the most obvious abuse
   case (who could misuse this feature, and how) and what control prevents it — server-side
   validation, authorization, rate limiting, encryption? If the answer is "we'll see while coding",
   that's an unresolved branch like any other: it belongs to design, not to after-the-fact
   implementation. For a structuring architectural decision rather than an isolated feature, prefer
   the `architect` skill's Phase 2bis (STRIDE threat modeling), which covers trust boundaries more
   thoroughly.

Conduct rules:
- **Facts are the agent's job, decisions are the user's.** Anything verifiable in the environment (files, dependencies, config, current behavior) is looked up with `Grep`/`Glob`/`Read` — never asked of the user. Only **choices** are submitted to them.
- **Ask the whole resolved frontier in each wave**: every question whose prerequisites are already settled, at once. A question whose answer depends on another still-open one waits for the next wave.
- Dig into every vague answer before moving on. A "we'll see" decision = an unresolved branch → keep going.

### Phase 1bis — Multi-angle deliberation (non-technical structuring decisions)

**Trigger condition**: the decision scoped in Phase 1 is strategic/business in nature rather than
purely technical — e.g. an investment choice, a hire, launching an offer, a budget trade-off, a
product pivot. Do **not** trigger this for a pure architecture or stack decision (it remains
covered by the 5 axes + ADR above). When in doubt, ask the user whether they want this phase rather
than silently skipping or imposing it.

Runs in two stages — three independent angles, then an informed close of the three:

**Stage 1 — independent angles (in parallel)**: call the Agent tool with each of the following
three agents, in the same message so they run in parallel. Each receives the same brief (intent +
scope + edge cases from Phase 1) and doesn't see the other two's answers — the goal is three truly
independent readings, not a sequential discussion.

1. **Call the Agent tool with `paid-consultant-agent`** — costs up to 3 options, decides, gives a
   2-week plan and a dated failure signal.
2. **Call the Agent tool with `devils-advocate-agent`** — attacks the favorite option's central
   assumption, ranks objections by likelihood × severity.
3. **Call the Agent tool with `mentor-agent`** — separates the stated problem from the real
   underlying one, spots the recurring pattern.

**Stage 2 — close**: once the three answers are in, **call the Agent tool with
`ceo-decision-agent`**, passing it the three positions (consultant, devil's advocate, mentor) along
with the initial brief — it decides in a fixed format (decision, why, what we stop, a 30-day metric
to watch, a deadline) informed by all three angles, not blindly.

Produce a **deliberation summary** before moving to Phase 2:

```markdown
## Deliberation — [decision]

| Angle | Position |
|-------|----------|
| Consultant | [recommended option + why] |
| Devil's advocate | [attacked assumption + main objection] |
| Mentor | [real problem vs. stated problem] |
| CEO | [decision made + metric to watch + deadline] |

### Points of consensus
[What at least 3 of the 4 angles converge on]

### Unresolved tensions
[Disagreements between angles — to be explicitly settled by the user, never decided on their behalf]
```

**⚠️ Fallback**: if an agent is unavailable, note "not run — relaunch via `/team-dev --<mode>`"
in the table and continue with the remaining angles rather than blocking the alignment.

### Phase 2 — Reading the terrain

Before locking in vocabulary: `Grep`/`Glob` the codebase to spot terms **already in use** (classes, modules, files). Reuse existing language rather than inventing new terms (consistency > novelty).

### Phase 3 — Shared vocabulary (`CONTEXT.md`)

`CONTEXT.md` is a **pure glossary** of domain-specific terms: name → unambiguous definition (one to two sentences, what the term *is*), synonyms to avoid. No implementation details, no generic programming concepts (timeouts, error types, utilities) even if the project uses many. Be decisive: one single word kept per concept, the others listed under "to avoid". Update **as the interview goes**, as soon as a term crystallizes, not in a batch at the end.

```markdown
# CONTEXT — Domain vocabulary

| Term | Definition | Synonyms to avoid |
|-------|-----------|--------------------|
| ...   | ...       | ...                |
```

**Structure based on the repo** (created lazily, at the first resolved term):
- **Single context** (most projects): one `CONTEXT.md` at the root.
- **Multiple contexts** (multi-service monorepo, distinct business domains): a `CONTEXT-MAP.md` at the root listing the contexts, where their `CONTEXT.md` lives (e.g. `services/billing/CONTEXT.md`), and how they talk to each other (events, shared types). If `CONTEXT-MAP.md` exists, follow it to find the right glossary; if the topic spans multiple contexts and it's unclear, ask.

### Phase 4 — ADR for hard decisions

Propose an ADR in `docs/adr/NNNN-title.md` **only if all three conditions are met**:

1. **Hard to reverse** — changing your mind later genuinely costs something.
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do that?".
3. **A real trade-off** — real alternatives existed and one was chosen for specific reasons.

Easy to reverse → it'll get reversed. Not surprising → no one will wonder. No alternative → nothing to record beyond "we did the obvious thing". Typically: architectural shape, integration patterns between contexts, lock-in technology choices, boundary decisions, deliberate deviations from the obvious path, constraints invisible in the code, alternatives rejected for non-trivial reasons.

An ADR can fit in **1 to 3 sentences** (context, decision, why). The sections below are added only if they add something:

```markdown
# ADR NNNN — [Title]

- **Status**: accepted
- **Context**: the problem and the forces at play
- **Decision**: what was chosen
- **Consequences**: what it implies (positive AND negative) — if not obvious
- **Rejected alternatives**: and why — if the rejection is worth recording
```

### Phase 5 — Output

Return:
- The **alignment summary** (intent, scope, edge cases, identified security risks, remaining unknowns).
- The files created/updated (`CONTEXT.md` / `CONTEXT-MAP.md`, ADR).
- The **green light** or the remaining **blocking unknowns** before implementing — an abuse case with no identified control (axis 6) is a blocking unknown like any other.

**This summary becomes the delegation prompt** to the implementation agent (`team-dev` Phase 2):
write it as such rather than as an interview write-up. Concretely (Anthropic, *prompt library*) —
state the expected **outcome** rather than the steps to get there (Phase 1's scope already supplies
the what, no need to prescribe the how); include a **verification command** whenever Phase 1
identified one (an edge-case test, an audit command); cite the `CONTEXT.md` term or file as a
reference rather than rephrasing it; quantify any measurable target identified in Phase 1 (perf,
threshold, deadline). An alignment summary made only of vague intent isn't ready to be delegated,
even if every decision branch of the interview is resolved.

## Fallback

If the skill is unavailable: run the interview from memory (intent → scope → edge cases → alternatives → unknowns) and record at least the key vocabulary in `CONTEXT.md`.

## Skip memorization

The artifacts (`CONTEXT.md`, `CONTEXT-MAP.md`, ADR) are the deliverable — versioned in the project, not in `~/.claude/memory/`.
