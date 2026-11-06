---
name: pilgrimage-planner
description: Orchestrator for a long-distance multi-country pilgrimage project. Coordinates the pilgrimage-* skills (route, gear, lodging, food, poi, prep) to produce a complete, coherent travel plan. Parameterizable by leg. Invoke via /pilgrimage-planner [leg].
model: claude-sonnet-5
type: orchestrator
priority: high
scope: cross
dependencies:
  - pilgrimage-route
  - pilgrimage-gear
  - pilgrimage-lodging
  - pilgrimage-food
  - pilgrimage-poi
  - pilgrimage-prep
conflicts: []
---

# Pilgrimage Planner — Orchestrator for a long-distance pilgrimage

Coordinates the full preparation of a multi-thousand-km pilgrimage, typically run in multiple phases across the countries crossed.

| Phase | Leg | Start → End | Distance | Routes |
|-------|---------|------------------|----------|-------|
| 1 | **First country** | [start] → [border town] | ~XXX km | [named historical routes] |
| 2 | **Second country** | [border town] → [next border] | ~XXXX km | [named historical routes] |
| 3 | **Third country** | [border] → [destination] | ~XXX km | [named historical routes] |

**Total ≈ several thousand km, several months of walking.**

Fill in the actual route/leg names and distances for the specific pilgrimage being planned — this skill is a reusable planning framework, not tied to one fixed itinerary.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Full-journey vision** | Every decision (pack, shoes, health) is calibrated for the whole route, not just the current leg |
| **Progressive buildup** | Increasing stage distances (short days at the start, longer once broken in, a sensible max at peak fitness) |
| **Legal camping** | Always verify legality — delegate to `legal-compliance-agent` per jurisdiction |
| **Solo/Duo dual variant** | Pack and calories are presented in two configurations when relevant |
| **GPX honesty** | Generated waypoints OK; continuous tracks → refer to official sources (never invent a route) |

## Workflow

### Phase 1 — Context

Collect via AskUserQuestion if not provided:
1. Leg to prepare
2. Season / estimated departure date
3. Configuration: Solo | Duo
4. Desired camp/hostel ratio (100% camping | 50/50 mixed | hostel-priority)

### Phase 2 — Project mapping

Read existing deliverables if any:
- `travel-plan-<leg>.md`
- `full-route-overview.md`
- `stages/`, `gear/`, `lodging/`, `resupply/`, `poi/`, `prep/`

Identify what already exists (don't rewrite it), what needs updating, what's missing.

### Phase 3 — Delegation to specialized skills

Invoke in this logical order (each skill produces its own deliverables):

1. **`pilgrimage-route`** → `stages/` + `gpx/`: stage breakdown, distances, waypoints
2. **`pilgrimage-poi`** → `poi/heritage-<leg>.md`: cross-reference with stages to integrate visits
3. **`pilgrimage-lodging`** → `lodging/notebook-<leg>.md`: cross-reference with stages to validate overnight points
4. **`pilgrimage-food`** → `resupply/notebook-<leg>.md` + specialties: cross-reference with stages for resupply
5. **`pilgrimage-gear`** → `gear/inventory.md`: weighed solo + duo list (mostly leg-independent)
6. **`pilgrimage-prep`** → `prep/`: fitness, credential, foot health, weather, budget (cross-cutting)

### Phase 4 — Consolidation

Produce two master files:

**`full-route-overview.md`** (project root) — full-journey view:
- Recap of all phases with distances and duration
- Transition points (borders, shoe replacement, medical milestones)
- Overall budget and gear progression

**`travel-plan-<leg>.md`** (project root) — current-leg summary:
- Master stage table (day, from → to, distance, elevation, planned night, key POI)
- Links to each detailed sheet in `stages/`
- Pack summary (solo / duo weight)
- Next actions (get the credential, order missing gear, test shoes)

### Phase 5 — Final report

Show the user:
- Tree of produced files
- Remaining manual actions (official GPX downloads, bookings, purchases)
- Suggestions for future sessions: `/pilgrimage-gear` to adjust after a field test, `/pilgrimage-planner <next-leg>` as the next phase approaches

## Fallbacks

- If a child skill is unavailable → display `⚠️ pilgrimage-<name> unavailable — deliverable skipped, to produce manually or in a future session`
- If the `survival-logistics-agent` / `game-master-agent` / `legal-compliance-agent` agents don't respond → the child skills must produce baseline content without them (a degraded mode documented in each skill)

## Optional input

Can receive as input:
- A leg
- A focus (`gear` | `route` | `lodging` | ...) to rerun only one part
- A special constraint (injury, tight budget, fixed dates)
