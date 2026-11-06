---
name: pilgrimage-food
description: Resupply + regional specialties + hiking menus for a long-distance pilgrimage route. Combines calorie logic (3000-3500 kcal/day) with gastronomic discovery. Delegates to game-master-agent for camp recipes and cultural specialties.
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

> **Associated agent**: this skill is designed to be routed by `game-master-agent`, which provides
> the business framing. It remains invocable alone, but the answer will be less contextualized.
> This relationship doesn't go through `dependencies:`, which only references skills or MCPs.

# Pilgrimage Food — Eating on the Way

Combines three logics:

1. **Kcal** — 3000-3500 kcal/day/person (20 km walked with a 10 kg pack), digestible, high calorie density
2. **Resupply** — where to shop along the route (markets, grocery stores, bakeries)
3. **Regional** — local specialties to discover (delegated to `game-master-agent`)

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Calorie density** | Prioritize at least 400 kcal/100g for carried food (dried fruit, nuts, dark chocolate, dry sausage, hard cheese) |
| **One hot meal/day** | Evening minimum (morale + muscle repair) |
| **Discovery when possible** | One specialty per main stage town |
| **Food safety** | Don't carry raw meat >6h; filtered water for raw produce if the source is doubtful |
| **Controlled cost** | 10-15 currency units/day/person average at the grocery store; restaurant splurges in town only |

## Workflow

### Phase 1 — Parameters

Collect via AskUserQuestion if not provided:
1. Leg (illustrative: first country | second country | third country)
2. Configuration (Solo | Duo)
3. Diet: omnivore | vegetarian | vegan | gluten-free | other allergy
4. Daily food budget

### Phase 2 — 3-day sample menu (hiking-practical)

Produce a reproducible sample menu plan:

```
### Standard day (20 km, 10 kg pack)

Breakfast (500-700 kcal)
- Oatmeal 80 g + dried fruit 50 g + nuts 30 g
- Or: bread 100 g + jam 30 g + cheese 40 g
- Instant coffee/tea

Morning snack (250 kcal)
- Cereal bar OR 30 g dark chocolate 70% + 30 g almonds

Cold lunch (600-800 kcal)
- Bread 150 g + dry sausage 60 g + hard cheese 60 g + 1 tomato + 1 fresh fruit
- Or cold wrap: tortilla + hummus + raw vegetables + cheese

Afternoon snack (250 kcal)
- Dried fruit 60 g + dry biscuits

Hot dinner (900-1200 kcal)
- Pasta/semolina/rice 150 g dry + olive oil 15 g + sun-dried tomatoes 30 g + parmesan 40 g + herbs
- Or pre-cooked lentils + onions + oil
- Dessert: a fruit-compote pouch + 2 chocolate squares

TOTAL: ~3000 kcal
```

### Phase 3 — Resupply by stage

Produce `resupply/notebook-<leg>.md` — one entry per stage with:

```
### DXX — Town X

**Market** (day + hours)
**Bakery**: name + hours
**Grocery / Supermarket**: chain + hours
**Water point**: location
**Recommended restaurant** (local specialty)
**Smart buy**: (local cheese, artisanal sausage, a local frozen specialty to reheat, etc.)
```

### Phase 4 — Regional specialties

Delegate to `game-master-agent` with a brief:
- Context: a long pilgrimage, gastronomic discovery while walking
- Requested format: per stage town, 1 to 3 emblematic specialties + where to taste them + season + cost
- Tone: appetizing, cultural, engaging

Consolidate into `resupply/specialties-<region>.md`.

### Phase 5 — Ration to resupply per stage

Calculation for each leg between two towns with a grocery store:

```
Stage DXX → DXX+1
- Distance: XX km
- Meals to cover: dinner D1 + breakfast D2 + lunch D2 (if a grocery store exists on D2)
- Resupply point: the market/grocery store at DXX
- Ration weight: ~800 g per person · per day
- Cost: ~12-15 currency units per person · per day
```

## Reference data

This skill ships with no baked-in city/vendor database — build one specific to the actual route being walked (town names, markets, specialty foods) as you go, rather than relying on a fixed list that goes stale. Treat Phase 2-3 content as a reusable template; populate Phase 3's notebook and Phase 4's specialties file per real leg.

## Fallback

If `game-master-agent` is unavailable: produce a simplified version based on generic regional-cuisine knowledge, without the detailed recipes.

## Optional input

- Leg
- Diet
- Configuration (solo/duo)
- Daily budget
- Focus: "specialties only" | "resupply only" | "7-day menus"
