---
name: level-design
description: "Engine-agnostic level design with Godot controls: player metrics from the real controller, key/ability gating with anti-soft-lock checks, and pacing. Auto-invoke for laying out a level or metroidvania gates, or when players get lost or a key sits behind its own door. Not for generation (`procedural-gen`), painting tiles (`godot-tilemap`, `unity-tilemap-2d`), or jump tuning (`platformer`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Level design

A level is a sequence of intended experiences delivered through space. The order that works:
measure the character, block out with primitives, verify reachability and pacing, get playtest
reports, then dress. This skill is engine-agnostic with Godot 4.7 controls. Painting the grid is
`godot-tilemap` or `unity-tilemap-2d`; generating layouts is `procedural-gen`.

> Adapted and translated from the `level-design` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Planning a level's structure: critical path, optional branches, gating order, encounters, and
  where a mechanic is taught vs tested.
- Building a blockout and verifying every required jump and door is possible.
- Reviewing a level that confuses, bores, or soft-locks players.

**Not this skill**: layout generators and dungeon algorithms (`procedural-gen`), jump and
movement tuning (`platformer`, the engine's movement skill), enemy behavior in space
(`game-ai`), camera framing (`camera-systems`).

## Main workflow

1. **Measure metrics from the game, not from memory.** Read movement constants from the player
   script, then run the jump measurement (Pattern 1) to get the real apex, range, and air time.
   Size every gap, ledge, and corridor in those units.
2. **Block out the whole level** with untextured primitives at real scale: Godot's `CSGBox3D`
   and friends with `use_collision` on, Unity ProBuilder (`com.unity.probuilder`), Unreal
   Modeling Mode, or a simple gray tileset in 2D. CSG is for prototyping only; bake it with
   `bake_static_mesh()` and `bake_collision_shape()` before shipping.
3. **Write the room graph** (rooms, exits, what each exit needs, what each room grants) and the
   beat list alongside the level. Both are small data files that the checks below read.
4. **Trace the critical path, then the golden path** (the route most players actually take),
   then the optional branches that rejoin it.
5. **Pace and teach.** Intensity rises in a sawtooth with a rest before each peak. Every
   mechanic appears first where failure costs little, then under pressure.
6. **Gate with intent** using keys, abilities, and one-way drops. Guide with light, leading
   lines, and landmarks rather than walls.
7. **Run the checks** (see "Verify"), fix the blockout, and only then ask the user for a
   playtest with precise questions.
8. **Dress last**, and rerun the checks after any geometry change.

## Patterns

### 1. Measure the real jump (headless)

```gdscript
# tools/measure_jump.gd: godot --headless --path . --script res://tools/measure_jump.gd
# Runs the real player scene on flat ground with run + jump held and prints the range.
extends SceneTree

const PLAYER := "res://player.tscn"            # the game's player scene
const RUN := &"move_right"
const JUMP := &"jump"

func _initialize() -> void:
    var ground := StaticBody2D.new()
    var shape := CollisionShape2D.new()
    shape.shape = WorldBoundaryShape2D.new()     # infinite ground at y = 0, normal up
    ground.add_child(shape)
    root.add_child(ground)
    var player: CharacterBody2D = load(PLAYER).instantiate()
    player.position = Vector2(0, -64)
    root.add_child(player)
    for i in 30:                                 # let the player land and settle
        await physics_frame
    Input.action_press(RUN)
    for i in 30:                                 # reach full run speed
        await physics_frame
    var start := player.position
    Input.action_press(JUMP)
    var apex := 0.0
    var ticks := 0
    var airborne := false
    while ticks < 600:
        await physics_frame
        ticks += 1
        apex = maxf(apex, start.y - player.position.y)
        if not player.is_on_floor():
            airborne = true
        elif airborne:
            break                                # landed again at the same height
    Input.action_release(JUMP)
    Input.action_release(RUN)
    var dt := 1.0 / Engine.physics_ticks_per_second
    print("JUMP apex=%.1f distance=%.1f airtime=%.3fs" % [apex, player.position.x - start.x, ticks * dt])
    quit(0 if airborne else 1)
```

Holding the jump measures the full jump; releasing it after one tick measures the short jump if
the controller has variable height. The formulas `h = v² / 2g` and `d = run_speed * 2v / g` are
only the ideal arc: a controller with `RUN_SPEED` 240, `JUMP_VELOCITY` 420, and gravity 980 gives
90 px and 206 px on paper and 93.6 px of apex and 212 px of range measured here, because the
fixed step integrates in whole ticks. Falling gravity, air acceleration, collider width, and a
higher landing shift the number further. Size required gaps at about 0.7 of the measured range
and keep gaps near 0.95 for optional challenges. For 3D, swap in `StaticBody3D`,
`WorldBoundaryShape3D`, and `CharacterBody3D`.

### 2. Pacing as data, with a check

```gdscript
# Write the level as beats with an intended intensity (0..1), then check the curve.
const BEATS := [
    { "room": "entry",      "type": "teach",   "intensity": 0.1 },
    { "room": "hall_1",     "type": "combat",  "intensity": 0.5 },
    { "room": "vista",      "type": "rest",    "intensity": 0.1 },  # breather + reward
    { "room": "gauntlet",   "type": "combat",  "intensity": 0.8 },
    { "room": "save_room",  "type": "rest",    "intensity": 0.2 },  # before the boss
    { "room": "boss",       "type": "climax",  "intensity": 1.0 },
]

# Returns pacing problems in a beat list; empty means it passes.
func pacing_problems(beats: Array, high := 0.7, max_high_run := 2) -> PackedStringArray:
    var problems := PackedStringArray()
    var run := 0
    for i in beats.size():
        var beat: Dictionary = beats[i]
        run = run + 1 if beat["intensity"] >= high else 0
        if run > max_high_run:
            problems.append("%s: %d high-intensity beats in a row" % [beat["room"], run])
        if beat["type"] == "climax" and (i == 0 or beats[i - 1]["type"] != "rest"):
            problems.append("%s: no rest beat right before the climax" % beat["room"])
    if not beats.is_empty() and beats[0]["type"] != "teach":
        problems.append("%s: the level does not open with a teach beat" % beats[0]["room"])
    return problems
```

The thresholds are a starting point for the user's game. Drive spawn density and musical
intensity from the same table so the built level matches the plan.

### 3. Gating and the critical path (a small graph)

```gdscript
# Model the level as rooms + filtered connections. Validate that the goal
# is reachable with the keys/abilities the player can actually get, in order.
const ROOMS := {
    "entry":   { "exits": [ { "to": "hall_1" } ] },
    "hall_1":  { "exits": [ { "to": "vista", "needs": "double_jump" },
                            { "to": "side_room" } ] },           # optional branch
    "side_room": { "exits": [ { "to": "hall_1" } ], "grants": "double_jump" },
    "vista":   { "exits": [ { "to": "boss", "needs": "red_key" } ] },
}

# Explores states (room, keys held): keys coming from mutually exclusive
# one-way branches must not be combined. Keys are never consumed and doors
# never relock; model consumable keys as counts and persistent door changes
# as extra state. States grow exponentially with the number of distinct
# keys; this fits hand-built room graphs.
func goal_reachable(rooms: Dictionary, start: String, goal: String) -> bool:
    var pending: Array[Dictionary] = [{"room": start, "keys": {}}]
    var visited := {}                             # "room|sorted keys" -> true
    while not pending.is_empty():
        var state: Dictionary = pending.pop_back()
        var room: String = state["room"]
        var have: Dictionary = state["keys"].duplicate()
        var info: Dictionary = rooms.get(room, {})
        var grant = info.get("grants")
        if grant != null:
            have[grant] = true
        var names := PackedStringArray(have.keys())
        names.sort()
        var id := room + "|" + ",".join(names)
        if visited.has(id):
            continue                              # cycles only stop at an equivalent state
        visited[id] = true
        if room == goal:
            return true
        for exit in info.get("exits", []):
            var open: bool = not exit.has("needs") or have.has(exit["needs"])
            if open:
                pending.append({"room": exit["to"], "keys": have})
    return false
# goal_reachable(ROOMS, "entry", "boss") is FALSE for the table above: no
# room grants "red_key". That is exactly the soft-lock this check exists to catch.
```

Exits are one-way: write both directions for a normal door and only one for a one-way drop. Also
call `goal_reachable` from every room the player must be able to reach back to the start or a
save point if the level must never trap them; a one-way drop into a dead end fails this call.

## Verify

1. **Reachability:** run `goal_reachable` from start to goal in a headless test (follow
   `godot-gdscript-headless-testing`), plus from each one-way drop's landing room to a save or
   exit. Any `false` is a soft-lock to fix before anything else.
2. **Metrics:** run Pattern 1 after every movement change. List every required gap and ledge in
   the blockout and compare it to the measured range; anything past about 0.7 of the range on
   the critical path needs a reason.
3. **Pacing:** `pacing_problems(BEATS)` returns empty, or every remaining line is a deliberate
   choice the agent can explain to the user.
4. **Proxy playtest.** The agent can't watch players, so ask the user for precise reports, for
   example: "Play from the start to the boss once without help. Tell me where you weren't sure
   where to go, any jump you missed more than three times, any room that felt like a chore, and
   how long the run took." Map each report to the room graph and fix the blockout, not the art.

## Pitfalls

- **Dressing before it plays.** Art on an unvalidated blockout is the most expensive work on the
  layout most likely to change.
- **Metrics from formulas alone.** The ideal arc over- or underestimates the real range
  depending on the step, falling gravity, and collider. Measure the real controller.
- **Validating connectivity but not order.** A flood fill says every room is connected while the
  key is still behind its own door. Track held keys, as Pattern 3 does.
- **Bidirectional edges written as one-way** (or the reverse) make the check pass on a level
  that traps players, or fail on one that doesn't. Write each exit as the player can actually
  use it.
- **Flat pacing.** Wall-to-wall combat or wall-to-wall calm numbs players. Alternate, and put a
  rest and a save before the climax.
- **Testing a mechanic before teaching it.** The first encounter with a danger should be safe.
- **Guidance by wall.** Lost players usually need a sightline, a light, or a landmark, not a
  barrier.
- **Unsignposted one-way drops** trap or surprise players. Telegraph irreversible moves.
- **Expecting authored pacing from a generator.** Generation gives variety, not intent; use
  `procedural-gen` for variety and write the beats that need intent.

## References

- [`references/pacing-and-flow.md`](references/pacing-and-flow.md): read to shape the tension
  curve, design the introduce-build-return-test loop for a new mechanic, choose gating tools,
  guide players through 2D or 3D space, or run a blockout review.

## Related skills

- `platformer`: the jump tuning that produces the metrics; remeasure after a change.
- `procedural-gen`: generated layouts that complement authored structure.
- `godot-tilemap`, `unity-tilemap-2d`: painting the 2D grid.
- `game-ai`: enemies that navigate the space; `camera-systems`: what the player can see.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `CSGShape3D` docs say CSG has a significant CPU cost and is meant for prototyping;
  `bake_static_mesh()` and `bake_collision_shape()` turn it into static resources.
- The jump measurement, pacing check, and reachability check ran on Godot 4.7.2 headless.
