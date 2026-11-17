---
name: tower-defense
description: "Designs a tower defense in any engine: lane or maze paths, wave pacing, targeting, counters, gold economy, with a curve checker. Auto-invoke for a Bloons- or Kingdom Rush-like game, or late waves that are impossible/trivial, or a dominant tower. Not for the pathfinding itself (`game-ai`) or base building in survival (`survival-crafting`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Tower defense

This skill owns the TD loop: paths, waves, towers, targeting, and the economy linking them —
never engine code or the pathfinding algorithm itself. The core balancing question is whether
the DPS the player can afford keeps pace with the HP each wave sends, so design both curves
together and verify them before playtesting. Always load the detected engine skill together
with this genre skill.

> Adapted/translated from the `tower-defense` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Towers attack waves on their own, the player spends earned currency to build, upgrade, and
  sell, and leaks cost lives. Includes lane defense, maze TD, and TD-action hybrids.
- Balancing waves and economy, choosing targeting modes, adding enemy types, fixing pathing.

**Not this skill**: the player shoots directly (`fps-shooter`); free base building with needs
(`survival-crafting`); the A* or flow-field code itself (`game-ai`).

## Main workflow

1. **Choose the map model**: fixed lanes (most TDs; full pacing control), maze (towers shape the
   path; needs placement validation), or open terrain with flow fields (large crowds).
2. **Write towers, enemies, and waves as data.** Each tower has a role (single-target DPS, area,
   slow, anti-air, armor-piercing, support) and each enemy type exists to counter a lazy build:
   fast (beats slow single-target), armored (beats low-damage/fast), flying (ignores ground-only),
   swarm (beats single-target), boss (HP spike), regenerating or shielded (punishes slow DPS).
3. **Set the curves**: enemy HP per wave grows geometrically (start near 1.12-1.18x per wave) and
   income grows via a growing kill bounty plus enemy count. The two compound against each other,
   so small changes matter a lot: an HP growth of 1.15 might hold for 30 waves while 1.25 walls
   at wave 2.
4. **Verify the curve.** Simulate buying a reference tower with all available gold before each
   wave, and compute each wave's pressure (`DPS needed / DPS owned * efficiency`). Pressure above
   1.0 is a wall; a run of waves under 0.6 is trivial. Aim for 0.6-0.95 with breathers between
   spikes.
5. **Pace the session**: a short build phase between waves, a preview of the next wave, an
   early-call bonus for confident players, and a toggleable 2-3x speedup.
6. **Verify** with the checklist below.

## Economy rules

| Lever | Starting point | Why |
|---|---|---|
| Wave 1 | playable on starting gold at pressure ~0.5-0.7 | the first wave teaches, it doesn't test |
| Kill bounty | most of the early income; end-of-wave bonus grows later | late income should reward survival, not farming |
| Leaks | cost lives and the bounty | otherwise letting enemies through can become optimal |
| Sell refund | 50-80% of money spent | repositioning possible, never free |
| Interest | optional, capped | rewards saving but can snowball |
| Upgrades | DPS per gold competitive with new towers, diminishing returns per tier | both "tall" and "wide" stay viable |
| Early call | gold bonus proportional to time skipped | speeds the game up for experts |
| Targeting | per tower: first (default), last, strongest, weakest, closest | changes the game more than raw stats |

## Patterns

### 1. Wave data

```python
# A wave is data: groups spawn in order, each with its own spacing.
WAVES = [
    {"groups": [{"type": "soldier", "count": 10, "spacing": 0.6},
                {"type": "runner", "count": 6, "spacing": 0.3}], "end_bonus": 30},
    {"groups": [{"type": "armored", "count": 4, "spacing": 1.2}], "end_bonus": 35,
     "preview": "armored"},                   # shown one wave ahead in the UI
]
```

Telegraph every new enemy type one wave ahead, and introduce it alone before mixing it with
others, so the counter feels learnable rather than random.

### 2. Pressure model (pseudocode)

```python
# A wave's pressure = DPS needed to hold it, relative to DPS owned.
def wave_pressure(wave, dps_owned, efficiency=1.0):
    total_hp = sum(g["count"] * HP[g["type"]] for g in wave["groups"])
    crossing_time = PATH_LENGTH / AVERAGE_SPEED(wave)
    dps_needed = total_hp / crossing_time
    return (dps_needed / dps_owned) / efficiency
```

## Verify

1. Simulate the pressure model (Pattern 2) across all planned waves and report the curve (aim for
   0.6-0.95, with identifiable spikes and breathers).
2. A fast enemy (speed x10) on a sharp-cornered path keeps a total crossing time within one tick
   of `path_length / speed`.
3. On a maze map, any placement that would cut off the spawn or an enemy currently moving from
   the goal is rejected.
4. "First" targeting picks the enemy with the most path progress even when another is physically
   closer to the tower.

## Pitfalls

- **Late game impossible or trivial** → HP growth and income growth tuned separately. Tune them
  together with the curve checker; geometric HP needs geometric income or upgrade efficiency.
- **One tower wins everything** → no enemy counters it. Add the counter type (step 2) and
  diminishing returns on upgrades.
- **Enemies stuck, or goal unreachable** → a maze placement cut the path. Validate with a search
  from the goal before accepting a placement.
- **Fast enemies slow down at corners or overshoot** → movement stops at every waypoint. Carry
  remaining distance over to the next segment.
- **Towers ignore the enemy about to leak** → "closest" used by default. Default to "first" by
  path progress.
- **Wave timers drift on a slow machine** → spawn spacing counted in frames. Use the game clock;
  the speedup multiplies the clock, not the framerate.
- **Specials feel unfair** → no preview. Show the next wave's composition.
- **Monotonic ramp exhausts players** → every wave harder than the last. Alternate spike,
  breather, spike.

## References

- Pressure model and curve checker: see Pattern 2 above; adapt into a standalone script
  (`waves.json` as input) once the project has more than a few waves to tune.

## Related skills

- **Composes with** (routing table §3d): `game-ai` + engine movement + `level-design` +
  `game-ui-ux`.
- `game-ai`: the A* or flow-field pathfinding itself stays with `game-ai`; `tower-defense` only
  owns placement validation and per-tower targeting.
- `game-designer`: project-wide balancing and tone — `tower-defense` owns genre-specific wave and
  economy curves.
- `lead-gameplay-programmer`: integrating the wave and targeting systems into the code
  architecture — `tower-defense` supplies the data model and pseudocode.
- `physics-engineer`: out of scope for this genre except realistic physical projectile
  trajectories — hand off in that case.

## Version notes

Last checked: 2026-11-17.

- `Path2D`/`PathFollow2D` (`progress`, `progress_ratio`, `loop`) and `AStarGrid2D` in Godot 4 for
  path rendering and maze placement validation; `PathFollow2D.loop` defaults to `true`, set it to
  `false` for leak detection.
- The curve numbers (1.15 holds, 1.25 walls) are design starting points, not measurements from a
  specific game.
