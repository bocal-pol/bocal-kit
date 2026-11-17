---
name: fps-shooter
description: "Designs first-person shooter combat in any engine: hitscan vs. projectiles, time-to-kill, damage falloff, recoil patterns, aim-down-sights sensitivity, and lag-compensated hits. Auto-invoke for a Doom- or Counter-Strike-like game, or weapons that feel weak or shots that don't register. Not for the camera rig (`camera-systems`), screen shake and hit-stop (`game-feel`), or the engine's raycast API."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# FPS shooter

This skill owns how shooting works and feels: the shot model, damage and TTK numbers, recoil and
spread, fire rate, aim scaling, and how enemies fight back — never engine code. Engine skills
supply the controller body, raycasts, and networking. Always load the detected engine skill
together with this genre skill.

> Adapted/translated from the `fps-shooter` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- First-person games whose central verb is aiming and shooting; also third-person shooters for
  the shot model and numbers.
- Tuning TTK, recoil, spread, fire rate, or aim feel, or fixing shots that miss.

**Not this skill**: camera follow, orbit, and smoothing (`camera-systems`); juice (`game-feel`);
the raycast API (the detected engine's physics skill); network replication and prediction (the
engine's multiplayer skill, `roblox-networking` under Roblox).

## Main workflow

1. **Name the reference game** and its TTK band: fast (tactical; body kill in ~0.3 s, one-shot
   headshot on rifles), medium (military; ~0.2-0.5 s), slow (arena and hero shooters; ~0.8 s and
   up, where tracking and movement matter).
2. **Write every weapon as data** (damage per distance band, head and limb multipliers, fire
   rate, magazine, reload, spread, recoil pattern) and generate a per-weapon TTK table against
   each target HP (Pattern 2). Tune the table, not individual numbers.
3. **Shot model**: hitscan from the camera for bullets; projectiles for rockets, grenades, and
   anything the target should be able to dodge. In third person: one ray from camera to the
   aimed point, then a second ray from the muzzle toward that point, so cover in front of the
   weapon always blocks.
4. **Fire rate on a scheduled clock** (Pattern 1), never "if enough time has passed."
5. **Aim scaling**: expose FOV and sensitivity; scale aim-down-sights (ADS) sensitivity (formula
   below).
6. **Enemies (PvE)**: a reaction delay before the first shot, telegraphed attacks, and
   deliberate early misses.
7. **Verify** with the checklist below.

## Numbers that matter

| Setting | Starting point | Notes |
|---|---|---|
| Headshot multiplier | x2-4 | Valorant's Vandal: 160 head, 40 body, 34 legs, no falloff, 9.75 shots/s |
| Falloff | full up to 20-30 m, floor 50-70% at 50-60 m (rifles) | shotguns and SMGs fall off much earlier |
| First-shot spread | near zero | the tap should feel accurate; spread grows with each shot and with movement |
| Recoil | fixed pattern, mostly up then sideways, resets after ~0.3-0.5 s without firing | learnable beats random |
| Pitch limit | ±89° | prevents the view from flipping |
| FOV | 90° horizontal on PC, 70-80° on TV | Godot's `Camera3D.fov` (default 75) and Unity's `Camera.fieldOfView` are vertical by default |
| Enemy reaction | 0.3-0.6 s before the first shot after spotting the player | human reaction time is ~0.2-0.25 s |
| Lag-compensation window | cap the rewind | Source's `sv_maxunlag` defaults to 1 s |

Computed TTK: the Vandal against 150 HP kills in 4 body shots, so `(4 - 1) / 9.75 = 0.31 s`, or a
single headshot at any range.

**Vertical and horizontal FOV**: `h = 2 * atan(tan(v / 2) * aspect)`. Godot's default vertical 75°
gives ~107.5° horizontal at 16:9. Store the player's FOV setting as horizontal at a reference
aspect and convert, otherwise ultrawide players end up with a zoomed-in view.

**Aim-down-sights (ADS) sensitivity**: multiply look speed by `tan(fov_ads / 2) /
tan(fov_hipfire / 2)` (same axis on both sides). The reticle then crosses targets at the same
on-screen rate near center.

## Patterns

### 1. Fire rate that survives low framerate (pseudocode)

```python
# Pseudocode, per frame. Schedule shots on a clock; never reset the timer to "now".
interval = 1.0 / FIRE_RATE                     # 9.75 shots/s -> 0.1026 s
if trigger_held and ammo > 0:
    if next_shot < now - interval:              # idle gap: don't provision shots
        next_shot = now
    while next_shot <= now and ammo > 0:         # multiple shots in one long frame
        fire(spread_for(shot_index)); ammo -= 1; shot_index += 1
        next_shot += interval
```

Resetting with `last_shot = now` discards the rest of every frame, so a 600 RPM weapon fires at
~450-600 RPM depending on framerate.

### 2. TTK table

```python
def ttk(hp, damage_per_shot, fire_rate):        # first shot at t = 0
    shots = ceil(hp / damage_per_shot)
    return shots, (shots - 1) / fire_rate

for weapon in weapons:
    for hp in TARGET_HP:                        # e.g. 100, 150 (armor), boss values
        for zone, mult in (("head", weapon.head), ("body", 1.0), ("legs", weapon.legs)):
            print(weapon.id, hp, zone, *ttk(hp, weapon.damage(band) * mult, weapon.fire_rate))
```

## Verify

1. Generate and report the TTK table (Pattern 2) for every weapon and HP; flag weapons outside
   the chosen band.
2. Fire 10 s on full auto at 30, 60, and 144 simulated FPS; shot count must match `fire_rate *
   10` within 1.
3. A shot fired from inside the player's own collider against a wall 1 m away hits the wall.
4. A shot through a trigger volume (pickup, zone) still hits the target behind it.
5. ADS sensitivity: a mouse move that turns X degrees from the hip turns X * ratio while aiming.

## Pitfalls

- **Lower fire rate at low FPS** → timer reset to "now" on every shot (Pattern 1).
- **Shots do nothing** → the ray hits the shooter, ignores hitboxes built as trigger/zone
  volumes, or stops on an invisible trigger zone. Exclude the shooter and set the trigger rule
  per engine.
- **Sensitivity changes with framerate** → mouse delta multiplied by `dt`. Mouse delta is
  already a distance; only gamepad input (a rate) needs `dt`.
- **Recoil recovery fights the player** → recoil written directly into the look angle. Keep it
  as an offset that decays toward zero.
- **Square spread pattern** → yaw and pitch randomized independently. Sample a disk instead.
- **Aiming zoomed in feels too fast** → sensitivity not scaled with FOV (formula above).
- **Ultrawide players see less** → a vertical FOV setting treated as horizontal, or the reverse.
- **"I shot first"** → client-side hit authority. The server should rewind targets to the
  shooter's view time, capped, and decide.
- **Enemies look like aimbots** → instant reaction and perfect first shots. Add reaction delay,
  telegraphs, and early misses.

## References

- Horizontal/vertical FOV and ADS sensitivity formulas: see above, derived from camera
  projection trigonometry, valid regardless of engine.

## Related skills

- **Composes with** (routing table §3d): the detected 3D engine skill (`godot-3d-essentials` /
  `unreal-cpp-gameplay`) + `input-systems` + `game-ai` + `camera-systems` + `game-feel`.
- `camera-systems`: camera rig (follow, orbit, first-person view) — `fps-shooter` owns aim
  numbers (FOV, sensitivity), `camera-systems` owns the rig itself.
- `game-feel`: out of scope for this genre — shooting juice (screen shake on impact, hit-stop)
  stays with `game-feel`.
- `game-ai`: enemy decisions and perception — `fps-shooter` owns reaction delay and early misses
  at the combat-number level, `game-ai` owns the state machine.
- `game-designer`: project-wide balancing and tone — `fps-shooter` owns weapon-specific TTK and
  recoil formulas.
- `lead-gameplay-programmer`: integrating the shot model into the code architecture —
  `fps-shooter` supplies formulas and pseudocode, not the project's networking or ECS wiring.
- `physics-engineer`: out of scope except advanced-physics projectiles (realistic ballistics,
  destructibles) — hand off in that case.

## Version notes

Last checked: 2026-11-17.

- Valorant Vandal damage (160/40/34, no falloff) and 9.75 shots/s: official game data, subject
  to patch changes.
- Default `sv_maxunlag` and 1 s maximum in Source: Valve's lag-compensation documentation.
- Godot 4's `Camera3D` default vertical FOV of 75°.
- The TTK, falloff, and reaction-distance bands are design starting points, not measurements
  from a specific game.
