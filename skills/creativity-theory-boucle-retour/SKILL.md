---
name: creativity-theory-boucle-retour
description: "Why idea boxes fail (Robinson & Schroeder 2004, Fairbank & Williams 2001, Frese et al. 1999). Design the acknowledgment receipt, the mandatory rejection reason, decision-making close to the ground, response time as an indicator. Auto-invoke on: feedback loop, acknowledgment receipt, rejection reason, suggestion system, response time, validation committee, participation, small ideas, emptying idea box, submitter feedback."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Feedback Loop

Module 5 of the corpus: Alan Robinson & Dean Schroeder, *Ideas Are Free* (2004) and *The
Idea-Driven Organization* (2014); Fairbank & Williams (2001) on motivation; Frese, Teng & Wijnen
(1999) on participation predictors.

The formal suggestion system dates back to 1898 (Eastman Kodak). Toyota launched its *Creative Idea
Suggestion System* in 1951; by the 1980s it reached millions of suggestions per year with an
implementation rate above 90%. The comparison with Western systems of the same era is brutal: a few
suggestions per employee per decade, a third adoption rate at best, and boxes that end up empty or
full of complaints.

### The four causes of failure

1. **The absence of a feedback loop** — cause number one. The employee submits, then nothing. After
   two or three vanished ideas, they stop submitting: the silence is rationally interpreted as
   contempt. **Response time is a direct predictor** of suggestion volume — systems that respond in
   days thrive, those that respond in months die.
2. **Opaque criteria** — an idea rejected with no reason teaches the submitter nothing. They don't
   know whether to propose something bigger, smaller, or elsewhere. Intrinsic motivation needs a
   competence signal.
3. **The managerial bottleneck** — routing every idea to a central committee overwhelms the
   committee, blows up the response time, and breaks the loop. Toyota pushed the decision to the
   lowest possible level: the team lead approves and implements a small idea the same day.
4. **The reward for big ideas** — a documented misconception. Financially rewarding "high-impact"
   ideas produces few ideas, often unverifiable, and attribution conflicts. Most of the potential
   lies in **small ideas**, the ones not worth a reward but which, accumulated, change everything.

Frese adds an individual predictor: those who submit the most are those who feel in control of
their work **and have seen their previous ideas succeed**. Participation is self-sustaining when
the loop works.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Immediate acknowledgment** | On submission, even automatic, even minimal. Never absent |
| **Every transition = feedback** | Every status change of a shared idea is a message to its submitter |
| **Mandatory reason on rejection** | Three words are enough, but the field can't be empty. That's what makes the criterion legible and future reactivation possible |
| **Decision as close as possible** | No central committee. The space owner or a periodic review decides |
| **Visible response time** | A discreet average-delay indicator makes the bottleneck visible before it kills the tool |
| **No bonus, no race for the big idea** | Count ideas that became real, never label ideas "brilliant" |

## What works, in summary

Immediate acknowledgment · fast decisions made close to the ground · a systematic reason even for
rejections · public visibility of ideas and their fate · valuing the quantity of small ideas over
the rarity of big ones.

## Workflow

### Phase 1 — Identify the object

Designing a transition notification · phrasing an acknowledgment · a reason rule · a decision
circuit · a space health indicator · diagnosing a dying space. Gather via `AskUserQuestion` if
absent.

### Phase 2 — Check the existing state

Read the real state (`Grep`, excluding `node_modules/`, `vendor/`, `*.test.*`): which transitions
notify the submitter, is the reason enforced server-side, who has the right to decide, what delay
is measured.

### Phase 3 — Diagnosis or recommendation

For a diagnosis, go through the four causes one by one and rule on each. For a design, produce:
notification triggers, message content, reason-validation constraint, decision-maker role matrix,
response-time indicator definition.

### Phase 4 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return in Markdown, write nothing, **skip
  memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-boucle-retour-[topic].md` in the current
  project.

## Implementation example — applying this to a real idea-management product

- A real status model for ideas commonly looks like: `raw · in_reflection · to_deepen · selected ·
  converted · rejected · archived`, with transitions managed by a dedicated state machine/service
  and a full history table logging `from_status`, `to_status`, `changed_by`, `reason`.
- The rejection reason is typically its own field (e.g. `status_reason`) alongside
  `status_changed_at` and `status_changed_by`. Verify the "reason required on rejection" rule is
  enforced **server-side**, not only in the form.
- Notifications route through whatever in-app notification channel the product already has.
- Decision-making is local by construction when role-based space membership exists (e.g.
  `member · contributor · moderator · admin`) — no central committee needed.
- A terminal "converted" status (idea became a real project) is the counter to favor, never a
  quality rating.
- Avoid negative voting in the reaction model — prefer `like`/`adhere`/`rating`-style reactions.
  See also `creativity-theory-psych-safety`.

## Fallback ⚠️

With no access to the sources, produce the theoretical diagnosis while prefixing: *"Diagnosis not
checked against the actually implemented transitions."* Never claim a notification exists without
having verified it: that's exactly the point where the gap costs the most.

## Optional input

- Object (`notifications` | `reason` | `decision-circuit` | `indicator` | `space-diagnosis`)
- The transition or status involved
- A required decision-maker role
- Constraint (V1 only, no new channel, no migration…)
