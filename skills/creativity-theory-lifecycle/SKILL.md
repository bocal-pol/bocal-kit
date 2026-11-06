---
name: creativity-theory-lifecycle
description: "Audit a feature, screen, or data model against the 10-point design checklist from the theoretical synthesis (module 7) and against the real state machine. Produces a compliant / gap / blocking verdict per point. Auto-invoke on: idea box audit, idea lifecycle, idea state machine, design checklist, idea-management feature review, idea status, idea transition, terminal state."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Lifecycle Audit

Module 7 of the corpus: the synthesis. Overlaying what Johnson (don't bury), Wallas (tolerate the
open), Luhmann (connect rather than classify), Robinson & Schroeder (make the fate visible), and
Edmondson (don't judge the person) each require produces a state machine with **two defining
traits**: the incubation state is central and has no duration, and the "set aside" state isn't
terminal.

This is the cross-cutting diagnostic tool: invoke it first when a request spans several topics,
before going deeper with the per-module skills.

## The six states and their foundation

| State | What it means | What the tool must do | Foundation |
|------|-------------------|---------------------------|-----------|
| **Spark** | Raw capture, possibly unreadable | Nothing. No sorting required, no deadline | Slow hunch (Johnson) · fleeting notes (Ahrens) |
| **Waiting / maturing** | Reread once, in the durable corpus, with no decision | Spaced resurfacing, backlinks, pairing. Never an alert or overdue counter | Incubation (Wallas, Sio & Ormerod) · Zeigarnik · Zettelkasten |
| **In discussion** | Deliberately shared in a space | Acknowledgment, comments, possible anonymity | Liquid network (Johnson) · Edmondson · debate (Nemeth) |
| **Retained** | Decision to follow up | Visible reason, notification to the submitter | Feedback loop (Robinson & Schroeder) |
| **Set aside** | No follow-up *for now*, mandatory reason | Stays in the corpus; reactivatable if the reason no longer applies | Adjacent possible (Johnson) · visible criteria (Fairbank & Williams) |
| **Transformed** | Became a project, goal, or task | Link preserved back to the original idea | Platforms (Johnson) · small ideas (Robinson & Schroeder) |

## The design checklist — 10 points

This is the audit reference. Every point gets a verdict.

1. An idea is never archived by age alone; only a status moves it out of the cycle.
2. The waiting state is the default state and carries no deadline, alert, or counter.
3. Personal and professional contexts are mixed by default; weak links stay visible.
4. Every open idea shows "what points here"; any global view is filtered to the neighborhood.
5. A periodic resurfacing brings back dormant ideas, with an element of randomness.
6. Reminders are spaced, arrive outside of tasks, and only ask for resonance — not a decision.
7. "Set aside" requires a reason and becomes active again once that reason no longer applies.
8. In groups: immediate acknowledgment, fast local decisions, visible average response time.
9. In groups: private draft by default, possible anonymity, no negative voting, judgment-free
   statuses.
10. A space's health indicator is the number of members who submitted at least one idea this month.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **No terminal state** | A state with no way out is a blocker, regardless of its technical justification |
| **No time-triggered transition** | An automatic transition based on age is a blocker |
| **Verdict per point** | The 10 points are reviewed one by one. An unverifiable point is declared `not verified`, never `compliant` |
| **Evidence required** | Every verdict cites the file, enum, ADR, or label it's based on. A verdict with no evidence isn't a verdict |
| **Separate gap from blocker** | `gap` = divergence from the theory, arbitrable. `blocker` = violates a state-machine invariant |
| **Don't invent the scope** | A point about a feature outside V1 scope is declared `out of scope`, not `gap` |

## Workflow

### Phase 1 — Scope the audited object

Feature · screen · data model · endpoint · a locale's labels · a backlog item. Gather via
`AskUserQuestion` if absent, along with the scope (`personal` | `group` | `both`).

### Phase 2 — Read the real state

Mandatory before any verdict. Read, in the target repository (`Grep`, excluding `node_modules/`,
`vendor/`, `*.test.*`):

- the status enum and the state machine (allowed transitions);
- the project's context/constitution doc for V1 scope and decisions;
- the relevant ADR;
- the labels for the targeted locale(s);
- the existence of scheduled jobs or commands touching statuses.

### Phase 3 — Go through the 10 points

For each: a verdict (`compliant` | `gap` | `blocker` | `out of scope` | `not verified`), evidence,
and a recommendation if the verdict isn't `compliant`.

### Phase 4 — Summary

A summary table, then blockers first, gaps next, ordered by increasing fix cost. End with points
left open rather than forcing a ruling.

### Phase 5 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return in Markdown, write nothing, **skip
  memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-lifecycle-[object].md` in the current
  project.

## Implementation example — mapping the theory onto a real state machine

The course's vocabulary is **not** the code's vocabulary. Audit against the code, not against this
table — but expect a mapping that looks roughly like this:

| The course | A typical real status | Typical UI label |
|----------|--------------------------------------|------------|
| Spark | `raw` | "Raw spark" |
| Maturing | `in_reflection` (+ `to_deepen`) | "In reflection" |
| In discussion | *not a status* — carried by sharing metadata (`shared_at`, `shared_by`) into a group space | — |
| Retained | `selected` | — |
| Set aside | `rejected` (a `status_reason` field, required) | "Not retained" |
| Transformed | `converted` | "Became a project" |
| — | `archived` | — |

Vigilance points for this kind of product:

- **An `archived` status is the highest-risk one**: verify no automatic path leads there by age
  alone, and that it can be exited. That's invariant #1.
- **Backlinks (point 4) and weak links (point 3) are commonly out of V1 scope** in an early-stage
  idea-management tool — if a graph view is explicitly excluded by the project's own scope
  documents, declare those points `out of scope`, not `gap`.
- Point 5 is typically covered by a dedicated resurfacing/"echo" mechanism with several modes
  (dormant, duo/pairing, anniversary, rejected-reason, random).
- Point 7 is typically partially covered by a scheduled "suggest reactivating a rejected idea"
  job — verify its trigger condition.
- Point 9 typically rests on a pseudonymized-anonymity design and the absence of negative voting in
  the reaction model (e.g. `like`, `adhere`, `rating` only).
- History and traceability: a status-history table plus a state-machine/transition service.

## Fallback ⚠️

If the repository isn't accessible, **don't produce an audit**: an audit with no evidence is
misleading. Instead, return the 10-point checklist annotated with the questions to ask, stating:
*"Audit not possible — project sources inaccessible. Checklist provided as a framework."*

## Optional input

- Audited object (feature, screen, table, endpoint, locale, backlog item)
- Scope (`personal` | `group` | `both`)
- Points to explicitly skip (with justification)
- Output level (`summary` | `detailed`)
