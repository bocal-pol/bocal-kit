---
name: pilgrimage-prep
description: Cross-cutting preparation for a long-distance pilgrimage — fitness, pilgrim credential, foot health, weather/season, overall budget. Valid for the entire journey to the destination.
model: claude-haiku-4-5-20251001
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Pilgrimage Prep — Cross-cutting preparation for a long route

A mechanical skill producing five short, actionable sheets. Stable content, infrequently updated, hence the Haiku choice.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Full-journey vision** | Every piece of advice targets holding up over 4-5 months of walking, not just the first leg |
| **Actionable** | Every sheet ends with a dated checklist (D-90, D-60, D-30, D-7) |
| **Concrete numbers** | Kcal, costs, dates, distances — nothing vague |

## Workflow

### Phase 1 — Context

Read the project's existing context if present (`travel-plan-<leg>.md`, `full-route-overview.md`) to align dates and parameters.

### Phase 2 — Generate the 5 sheets

Create the `prep/` folder and write five files:

1. **`prep/fitness.md`** — a 12-week training plan before departure, progressive outings from short to long distances with a pack, back/core strengthening, ankle mobility, an RPE scale
2. **`prep/credential-and-papers.md`** — pilgrim credential, where to obtain it, spare credentials for the full distance, the completion certificate at the destination, travel health insurance, emergency contacts, power of attorney, a will (for a long trip)
3. **`prep/foot-health-pharmacy.md`** — a weighed, detailed first-aid kit, feet (shoe break-in, blisters, nails, technical socks), joints (knee/ankle), thermoregulation (heat/hypothermia), local plants worth knowing
4. **`prep/weather-season.md`** — the optimal departure window, temperature projections per leg, seasonal risks, useful offline weather apps
5. **`prep/budget.md`** — budget per leg + overall budget, expense sources (indoor nights, groceries, restaurants, local transport, gear replacement), money-saving tips, cash vs. card budget

### Phase 3 — Summary checklist

At the end, produce a consolidated checklist `prep/checklist-d-x.md`:

```markdown
# Checklist D-x before departure

## D-90 (3 months)
- [ ] Firm departure date decided
- [ ] Pack + tent + shoes purchased
- [ ] Training started, 3 outings/week
- [ ] Pilgrim credential obtained

## D-60 (2 months)
- [ ] 15 km outings with a loaded pack
- [ ] Stove + tent tested
- [ ] Tetanus vaccination checked
- [ ] Repatriation insurance taken out

## D-30 (1 month)
- [ ] 25 km test outing with a full pack
- [ ] Shoes broken in ≥ 100 km
- [ ] Emergency numbers in phone + on paper
- [ ] Chronic-treatment prescriptions

## D-7
- [ ] D-7 weather checked
- [ ] Day 1-2 food bought
- [ ] Day 1 lodging confirmed (if booked)
- [ ] Family contact — communication plan

## D-1
- [ ] Pack weighed one last time (≤ 12 kg)
- [ ] Shower + nails + clean socks
- [ ] A carb-rich meal (pasta)
- [ ] Early to bed
```

## Fallback

No external dependency. Self-contained content based on general long-distance hiking and pilgrimage-association recommendations.

## Optional input

- Planned departure date (to calibrate the D-x milestones)
- Starting fitness level (sedentary | occasionally active | regularly athletic)
- Known medical constraints
