---
name: creativity-theory-slow-hunch
description: "Slow hunches, the adjacent possible, and liquid networks (Johnson 2010). Calibrate the resurfacing of dormant ideas, reactivate a set-aside idea whose reason no longer applies, circulate ideas between personal and professional contexts. Auto-invoke on: dormant idea, resurfacing, echo, slow hunch, adjacent possible, set-aside idea, reactivation, commonplace book, liquid network, serendipity."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Slow Hunch, Adjacent Possible, Liquid Networks

Module 1 of the corpus: Steven Johnson, *Where Good Ideas Come From* (2010), with Gruber on
Darwin's notebooks, Kauffman on the adjacent possible, Dunbar on laboratories.

Three operational theses:

- **Slow hunch** — most great ideas start as a vague intuition that matures over months or years.
  Darwin had natural selection written in his notebooks months before his "revelation"; Berners-Lee
  carried Enquire for ten years before the Web. Two conditions for an intuition to succeed: it must
  be **written down**, and it must be **revisited**. Without rereading, a notebook is a graveyard.
- **Adjacent possible** (Kauffman) — at any given moment, only certain ideas are reachable as a
  combination of what already exists. Babbage failed for lack of electronics; YouTube would have
  failed ten years earlier. Corollary: an idea may have been set aside only because it was outside
  the adjacent possible **of that moment**.
- **Liquid networks** — fertile environments are open enough for ideas to circulate, dense enough
  for them to stick. Dunbar filmed four laboratories: discoveries weren't born at the microscope,
  but at the weekly meeting table, when a researcher from another project saw something different
  in a strange result.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Never archive by age** | An idea's age isn't information about its value. Only an explicit decision changes its status |
| **Resurfacing indifferent to age** | A three-year-old idea has the same chance of resurfacing as a three-month-old one |
| **A usable set-aside reason** | A rejection with no reason forbids any future reactivation. The reason is the condition for the adjacent possible |
| **Contexts mixed by default** | Personal and professional in the same view by default; a filter exists but isn't the initial state |
| **Mandatory randomness** | An algorithm that only suggests similar things kills serendipity. Aim for ~80% relevant neighbors, ~20% improbable ones |
| **No obligation to act** | A resurfacing asks for resonance, never a decision |

## Workflow

### Phase 1 — Frame the request

Determine which of the three theses is at play: a resurfacing mechanism (slow hunch), reactivating
set-aside ideas (adjacent possible), or circulation between contexts and people (liquid networks).
Gather via `AskUserQuestion` if context is missing.

### Phase 2 — Check the existing state

Before any recommendation, read the real state (`Grep` excluding `node_modules/`, `vendor/`,
`*.test.*`): the resurfacing selection mechanism, the presence and enforcement of a set-aside
reason, any automatic reactivation, any siloing of contexts.

### Phase 3 — Recommendation

Produce concrete parameters: an idea's eligibility criterion for resurfacing, cadence, the share of
randomness, the reactivation condition, the granularity of the reason field. Tie each parameter to
its thesis.

### Phase 4 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return the result in Markdown, write
  nothing, **skip memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-slow-hunch-[topic].md` in the current
  project.

## Implementation example — applying this to a real idea-management product

What a mature implementation of this theory tends to look like, so as not to reinvent it:

- A resurfacing/"echo" mechanism with a deterministic, server-side selection, tracking per-item
  `shown_count`, `dismissed_count`, and a `next_eligible_at` field. **Several modes** are useful:
  dormant, duo/pairing, anniversary, rejected-reason, and pure random — the random mode carries the
  serendipity share, the rejected-reason mode carries the adjacent possible.
- Reactivating a set-aside idea works as a scheduled "suggest reactivation" job keyed off the stored
  rejection reason.
- Mixing personal/professional contexts works best as a single field on the idea (e.g. `context`:
  `personal` | `professional`) rather than fully separate spaces — this keeps circulation the
  default and filtering optional.
- A "dormant ideas" admin widget is a reasonable way to expose stale ideas to an administrator
  separately from the end-user resurfacing mechanism.
- **A connections graph view is commonly out of V1 scope** for a tool like this — don't presuppose
  it exists. The only inter-idea links that typically exist early on are an explicit "merged into"
  relationship and the resurfacing mechanism's own pairing mode.

## Fallback ⚠️

If the project's sources of truth aren't accessible, answer from theory alone while explicitly
stating up front: *"Theoretical recommendation not checked against the code's actual state."* Never
claim what the product does today without having read it.

## Optional input

- Targeted thesis (`slow-hunch` | `adjacent-possible` | `liquid-networks` | `all`)
- Scope (`personal` | `group` | `both`)
- Analyzed object (resurfacing mechanism, screen, data model, backlog item)
- Constraint (V1 only, no new table, no scheduled job…)
