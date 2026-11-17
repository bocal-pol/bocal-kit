---
name: survival-crafting
description: "Designs survival-crafting loops in any engine: gathering, recipes and tech trees, carry weight, spoilage, needs (hunger, thirst, temperature), base building. Auto-invoke for a Minecraft-, Valheim-, or Don't Starve-like game, or crafting that eats materials or needs that feel like chores. Not for RPG equipment stats (`rpg`), terrain generation (`procedural-gen`), or save format (`save-systems`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Survival crafting

This skill owns the gather-craft-build-survive loop and the pressure systems around it: needs,
scarcity, logistics, and escalating threats — never engine code. Every tool tier must unlock the
next resource tier; when that ladder breaks, the game turns into chores. Always load the detected
engine skill together with this genre skill.

> Adapted/translated from the `survival-crafting` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- The player gathers resources, crafts tools and structures, manages needs, and builds a base
  against escalating threats: a survival sandbox, a crafting game, a colony or base builder.
- Tuning needs, recipe and carry limits, spoilage, building rules, or raid pacing.

**Not this skill**: weapon and armor stat systems, rarity and affixes (`rpg`); world and biome
generation (`procedural-gen`); save format and migration (`save-systems`).

## Main workflow

1. **Choose the needs model with the user** (it sets the tone):
   - *Attrition*: an empty bar causes damage. Minecraft: 20 hunger points; at 0, the player loses
     1 HP every 4 s, stopping at 10 HP on easy and 1 HP on normal, and it can kill on hard.
   - *Buff*: food raises maximums instead of punishing. Valheim: up to 3 different foods active
     at once, each adding max HP and stamina for ~10-50 minutes; no one starves. Better for co-op
     and building-focused games.
2. **Set the clock.** Choose day length (Minecraft: 20 minutes, 10 of which are full daylight)
   and size needs against it: a full hunger bar lasts ~1-2 days of normal activity, thirst
   drains ~1.5-2x faster than hunger, warnings appear at 25-30%, and activity (sprinting, cold,
   carried weight) speeds up the drain.
3. **Draw the progression ladder** as a graph: resource tier → tool → new node type → station →
   next resource tier. Every step should require a new trip outside the base.
4. **Define recipes as data** with a station and a tech prerequisite (Pattern 1), and choose how
   they're discovered: reveal a recipe as soon as the player picks up one of its ingredients, so
   the menu teaches the next goal without a wiki.
5. **Set logistics limits**: slots with stack sizes (Minecraft stacks most items at 64), or
   weight (Valheim starts at 300). Storage and crafting from nearby chests relieve these limits
   at the base.
6. **Pace threats by progression** (bosses killed, tech tier, base size), not just wall-clock
   time, and telegraph big raids at least a day ahead.
7. **Verify** with the checklist below.

## Spoilage

Track freshness per stack (`0..1`, merged as a quantity-weighted average) and apply tiers. Don't
Starve's tiers are a well-tested reference: fresh (50-100%) gives full value; stale (20-50%) gives
2/3 hunger, 1/3 health, no sanity; spoiled (under 20%) gives 1/2 hunger, no health, and costs
sanity, then the item rots away entirely. Cooking halves accumulated spoilage. Cold storage slows
the clock. Show the tier on the icon.

## Patterns

### 1. Atomic crafting (pseudocode)

```python
# Pseudocode. Validate everything, then consume and add in a single step.
recipe = {"id": "stone_axe", "inputs": {"wood": 3, "stone": 2}, "output": ("stone_axe", 1),
          "station": "workbench", "tech": "basic_tools"}

def craft(recipe, inv, tech, station):
    if recipe["tech"] and recipe["tech"] not in tech: return "locked"
    if recipe["station"] and recipe["station"] != station: return "needs " + recipe["station"]
    if any(inv.count(i) < n for i, n in recipe["inputs"].items()): return "missing materials"
    if not inv.fits_after_removal(recipe["inputs"], *recipe["output"]):
        return "no room"                                 # count slots freed by the inputs
    for item, n in recipe["inputs"].items():
        inv.remove(item, n)
    inv.add(*recipe["output"])
    return "ok"
```

## Verify

1. Every craftable item is reachable from starting resources via the recipe/tech graph, and no
   recipe needs its own output (or a later tier) to be crafted.
2. Crafting with a full inventory holds the output or changes nothing.
3. Simulated needs: minutes from full to warning to empty, idle and sprinting, printed against
   day length.
4. Spoilage moves food through every freshness tier at the expected time.
5. Save, change a chunk and a container, reload: the change and contents survive.

## Pitfalls

- **Inputs consumed, nothing crafted** → output added after removal into a full bag, or an
  exception between the two steps. Check space by counting freed slots first (Pattern 1); if
  "drop on ground" is the rule, do it in the same step.
- **Needs feel like chores** → bars that drain fast with small restores. Fewer, bigger meals, a
  meal variety that rewards effort, or the buff model.
- **Instant deaths from needs** → binary failure. Warn, then apply attrition with time to
  recover.
- **Map exhausted, players leave** → no respawn. Respawn nodes on a timer or when the player is
  away, and keep rare nodes near the base so exploration stays the answer.
- **Inventory always full** → weight or slots with no relief at the base. Add storage, crafting
  from nearby containers, and a bulk-deposit action.
- **Mid-game wall** → a tier needs a resource with no hint about where to find it. Each tier's key
  resource must be visible or hinted before the player needs it.
- **Spoilage doubles or resets on stack merge** → freshness kept per item but merged by taking
  the most recent. Merge as a quantity-weighted average.
- **Needs drain differently on a fast machine** → per-frame decay without `dt`, or tied to
  rendering. Tick needs on the game clock.
- **Huge, slow saves, or lost bases** → saving everyone every time. Save changed chunks and
  structures incrementally, autosave on sleep or day change, never mid-combat (`save-systems`).

## References

- `procedural-gen`: for biome generation and resource placement themselves.
- `save-systems`: for the incremental, atomic world writes described here.

## Related skills

- **Composes with** (routing table §3d): `save-systems` +
  `godot-resources`/`unity-scriptableobjects` + `procedural-gen` + `game-ui-ux`.
- **Ownership on overlap** (routing table §3c): `rpg` owns items/equipment/rarity;
  `survival-crafting` owns gathering, recipes, carry weight, and spoilage. A bare "inventory"
  request with no further detail doesn't go to a single skill.
- `game-designer`: project-wide tone and balancing — `survival-crafting` owns genre-specific
  need and progression loops.
- `lead-gameplay-programmer`: integrating the crafting and needs system into the code
  architecture — `survival-crafting` supplies the data model, not the wiring.
- `physics-engineer`: out of scope except base building with physical structural-stability
  simulation — hand off in that case.

## Version notes

Last checked: 2026-11-17.

- Minecraft hunger (20 points, starvation 1 HP/4 s, difficulty floors 10/1/0 HP) and day length
  (24,000 ticks = 20 minutes): the game's official wiki.
- Don't Starve's freshness tiers and cooking's halving: the game's official wiki.
- Valheim: 3 food slots adding max HP and stamina, base carry weight 300: the game's community
  guides.
- The pacing ratios (bar length in days, thirst vs. hunger, warning thresholds) are design
  starting points, not measurements from a specific game.
