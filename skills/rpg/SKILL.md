---
name: rpg
description: "Designs RPG progression and combat in any engine: stats with a modifier stack, XP curves, damage formulas, items, equipment, and quests. Auto-invoke for a JRPG or a Diablo-like looter, or stats going wrong after removing equipment. Not for gathering/crafting and carry weight (`survival-crafting`), dialogue (`dialogue-systems`), or save format (`save-systems`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# RPG

This skill owns the numbers that make a character grow: stats, levels, damage, items, and
quests — never engine code. Design by outcome targets (minutes per level, hits to kill), then
derive formulas and tables from those targets, and verify the tables by script before anyone
plays. Always load the detected engine skill together with this genre skill.

> Adapted/translated from the `rpg` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Character progression, combat math, item and equipment systems, loot rarity, quest tracking.
- Symptoms: removing a buff or piece of equipment leaves the wrong stats, stacking defense makes
  enemies immune, damage explodes late-game, players outlevel content, loot is all "+1%".

**Not this skill**: gathering, crafting recipes, stack limits, weight and spoilage
(`survival-crafting`); dialogue trees and lines (`dialogue-systems`); save format and migration
(`save-systems`); permadeath runs (`roguelike`).

## Main workflow

1. **Read the existing setup**: stat names, item data, enemy tables, content format (resources,
   ScriptableObjects, JSON). Keep the project's own names.
2. **Set pacing targets** and get them confirmed: level cap, total hours to cap, and minutes per
   level at a few points. Starting point: ~3-5 minutes per level for the first five levels,
   rising to 30-60 minutes near the cap.
3. **Derive the XP table** from those minutes: `xp_for_next(N) = expected_xp_per_minute(N) *
   minutes_for_level(N)`, where XP per minute comes from enemies and quests at that level. A
   raw formula like `100 * N^2` is a fine first pass, but tune it against the minutes.
4. **Pick a single damage family** (see table below) and set same-level hit targets: a normal
   enemy dies in 2-4 player hits, the player survives 5-8 normal hits, a boss takes 25-60 hits.
5. **Build stats as base plus modifier stack** (Pattern 1); items push modifiers.
6. **Define item rarity and affixes**, with item level tied to the source's level (enemy or
   chest).
7. **Verify** with the checklist below.

## Formulas that hold up

| Choice | Default | Why |
|---|---|---|
| Damage vs. defense | ratio: `dmg * K / (K + def)`, K = the defense that must halve damage | each point of defense adds the same effective HP (1/K of HP), so defense never makes anyone immune; League of Legends uses K = 100 |
| Subtractive alternative | `max(1, atk - def)` | clean at small numbers, but stacking defense quickly cancels damage |
| Resistance caps | percentage resistances capped (Path of Exile: 75% by default) | otherwise stacked percentages reach 100% |
| Variance | ±10% | wider makes hits-to-kill unpredictable |
| Critical hits | 5% base chance, x1.5-2 damage | crit builds need room to grow |
| Type multipliers | 0.5 / 1 / 2 | clear readability; stack two weak types multiplicatively (0.25-4) |
| XP curve | cubic total XP ("Medium Fast" Pokémon: total XP at level N = N^3) or a minutes-based table | fast early levels, long late ones |
| Rarity weights | common 60, uncommon 25, rare 10, epic 4, legendary 1 | with a pity counter for the top tier if loot blocks progression |
| Item level | the level of the monster or chest that dropped it | keeps loot useful while leveling |

Round once at the end of the damage formula. Sum same-type percentage modifiers (+20% and +30% =
+50%); only multiply between deliberately separate layers.

## Patterns

### 1. Base stats plus modifier stack

```python
# Pseudocode. Base attributes are the only stored truth; derived stats are recomputed.
def stat(actor, name):
    flat = sum(m.value for m in actor.mods if m.stat == name and m.type == "flat")
    pct  = sum(m.value for m in actor.mods if m.stat == name and m.type == "pct")
    mult = product(1 + m.value for m in actor.mods if m.stat == name and m.type == "mult")
    return clamp((actor.base[name] + flat) * (1 + pct) * mult, *LIMITS[name])

def equip(actor, item):
    for m in item.mods:
        actor.mods.append(Mod(m.stat, m.type, m.value, source=item.instance_id))

def unequip(actor, item):
    actor.mods = [m for m in actor.mods if m.source != item.instance_id]   # exactly that item
```

When max HP changes, decide whether current HP keeps its value or its ratio, and apply the same
rule everywhere; otherwise swapping equipment becomes a free heal.

### 2. Verifiable balancing table

A script or test that prints one line per level (player HP, damage, hits to kill a same-level
enemy, hits to survive, minutes to next level) and fails when a line falls outside the targets
set in workflow step 2.

## Verify

1. Run the balancing-table script (Pattern 2) and report outliers.
2. Write a test that equips then unequips each item and checks derived stats return to exactly
   their previous value.
3. Check that the display format uses the same rounded value as the combat engine.
4. Check that a saved quest keeps not just "completed" status but also objective counter state
   (coordinate with `save-systems`).

## Pitfalls

- **Wrong stats after a buff ends or equipment is removed** → the buff modified base stats, or
  the modifier was removed by value instead of by source. Remove by source id (Pattern 1).
- **Unequip then re-equip fully heals** → current HP was rescaled to the new max. Keep absolute
  (clamped) HP or the ratio, one rule for every case.
- **Enemies become immune** → subtractive formula or uncapped percentage resistances. Use the
  ratio formula or cap resistances.
- **Numbers explode late-game** → exponential XP or damage growth with stacking multiplicative
  modifiers. Sum modifiers within the same layer; verify the table per level.
- **Players outlevel everything, or grind** → XP comes only from kills. Give quest XP sized to the
  minutes target to keep the player near the content's level on the critical path.
- **Progression feels pointless** → enemies fully scale to player level. Scale by regional band,
  or scale only part of the stats, so growth stays visible.
- **Loot feels flat** → affixes with small ranges or too many affix types per item. Fewer,
  larger affixes per rarity tier read better.
- **A quest breaks on reload** → only "completed" was saved. Save quest state and objective
  counters.

## References

- `godot-resources` / `unity-scriptableobjects`: content as data (items, enemies).
- `save-systems`: saving character, inventory, and quest state.

## Related skills

- **Composes with** (routing table §3d): `godot-resources`/`unity-scriptableobjects` +
  `dialogue-systems` + `save-systems` + `game-ui-ux`.
- **Ownership on overlap** (routing table §3c): items, equipment, and rarity belong to `rpg`;
  `survival-crafting` only joins for gathering, recipes, carry weight, and spoilage. A bare
  "inventory" request with no further detail doesn't go to a single skill — pick from these
  details or ask.
- `game-designer`: project-wide balancing and tone — `rpg` owns genre-specific combat and
  progression formulas, `game-designer` arbitrates cross-project choices.
- `lead-gameplay-programmer`: wiring the stat system into the game's architecture — `rpg`
  supplies the data model and formulas, not the final integration.
- `physics-engineer`: out of scope except combat with advanced physics (complex projectile
  trajectories) — hand off in that case.

## Version notes

Last checked: 2026-11-17.

- League of Legends armor multiplier `100 / (100 + armor)` and linear effective HP: the game's
  official wiki.
- Pokémon experience groups (Medium Fast = N^3, 1,000,000 XP at level 100): Bulbapedia.
- Path of Exile's default max resistance, 75%: the game's official wiki.
- The pacing-minute bands, hits-to-kill, and rarity weights are design starting points, not
  measurements from a specific game.
