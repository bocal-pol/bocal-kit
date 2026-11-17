---
name: physics-tuning
description: "Engine-agnostic physics tuning with Godot controls: fixed timestep and interpolation, CCD against tunneling, damping, solver iterations, and collision layer matrices. Auto-invoke when bodies shake, fast objects pass through walls, or physics feels mushy or wrong. Not for the engine's physics API (`godot-physics`, `unity-physics`, `roblox-physics`, `phaser-arcade-physics`) or jump feel (`platformer`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Physics tuning

Most "bad physics" comes from a mismatch between the fixed-rate simulation and the
variable-rate render loop, or from untuned CCD, mass, damping, and layer settings. This skill
owns those engine-agnostic decisions and the checks that prove them. Bodies, callbacks, and
engine settings come from `godot-physics`, `unity-physics`, or `roblox-physics`; load both when
tuning inside an engine.

> Adapted and translated from the `physics-tuning` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Movement shakes, bodies pass through walls, stacks explode, joints vibrate, or speed depends
  on the framerate.
- Deciding what runs in the fixed step vs. the render frame, and how to interpolate.
- Tuning gravity, mass, damping, restitution, solver iterations, sleep, and the layer matrix.

**Not this skill**: engine API (`godot-physics`, `unity-physics`, `roblox-physics`), character
controller code (`godot-2d-movement`), jump arcs and tolerance windows (`platformer`), camera
smoothing (`camera-systems`), simulation CPU cost (`performance-optimization`).

## Main workflow

1. **Read the current settings first**: tick rate, max step per frame, interpolation, physics
   engine (Godot `[physics]` in `project.godot`; Unity `ProjectSettings/TimeManager.asset` and
   `DynamicsManager.asset`). Change one setting at a time.
2. **Simulate in the fixed step.** Forces, velocities, and collision reads go in
   `_physics_process` / `FixedUpdate` and use that step's `dt`.
3. **Interpolate rendering** between ticks with the engine's built-in option before hand-coding
   it.
4. **Stop tunneling**: keep `speed / tick_rate` under the thinnest wall, or enable CCD on small
   fast bodies, or use a ray or shape cast for projectiles.
5. **Tune the body, not the scene**: mass for relative weight, damping for drag, per-object
   gravity scale, bounce and friction in a physics material.
6. **Stabilize stacks and joints** with modest mass ratios, more solver iterations, and sleep.
7. **Plan the layer matrix** as a named table: what each layer is, and what it scans.
8. **Run the checks** below, then ask the user to judge the feel with precise questions.

## Patterns

### 1. Fixed step for simulation, interpolation for display

```gdscript
func _physics_process(dt):                  # Unity: FixedUpdate()
    velocity += gravity * dt                # integrates with the FIXED dt
    move_and_slide()
# WRONG: forces or movement in _process/Update with the frame dt: velocity and
# collisions then depend on the framerate.
```

Enable built-in interpolation: Godot `physics/common/physics_interpolation = true` (disabled by
default; covers 2D and 3D nodes), Unity `Rigidbody.interpolation = Interpolate` on the player
and bodies the camera follows. Hand-code it (`Engine.get_physics_interpolation_fraction()`, lerp
from previous to current) only for something the engine doesn't cover, and never both on the
same node.

### 2. Tunneling: CCD and a speed cap

```gdscript
body.continuous_cd = true                    # RigidBody3D: a boolean
body2d.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY   # RigidBody2D: an enum; see Pitfalls
# Unity: CollisionDetectionMode.ContinuousSpeculative (cheap, covers dynamic bodies)
# or ContinuousDynamic (fast against fast). Plain Continuous only sweeps against
# static colliders.
const MAX_SPEED := 40.0
if velocity.length() > MAX_SPEED:
    velocity = velocity.normalized() * MAX_SPEED
# Rule of thumb: speed / ticks_per_second < thinnest wall, or CCD, or a ray cast.
```

### 3. Body tuning

```gdscript
body.mass = 2.0               # relative weight in collision; doesn't change fall speed
body.linear_damp = 0.5        # drag (Unity 6: linearDamping, formerly drag)
body.gravity_scale = 1.5      # per-object gravity (Unity: Rigidbody2D.gravityScale)
var material := PhysicsMaterial.new()
material.bounce = 0.2         # restitution 0..1 (Unity: PhysicsMaterial.bounciness)
material.friction = 0.8
body.physics_material_override = material
```

### 4. Collision layer matrix as data

```gdscript
# A body IS on its layers and SCANS its mask. Name the bits once and build masks from names.
const LAYER := { "world": 1 << 0, "player": 1 << 1, "enemy": 1 << 2, "pickup": 1 << 3 }
player.collision_layer = LAYER.player
player.collision_mask  = LAYER.world | LAYER.enemy
pickup.collision_layer = LAYER.pickup
pickup.collision_mask  = LAYER.player        # the pickup only reacts to the player
```

Write the same table into the engine's layer names (Godot `[layer_names]` in `project.godot`;
Unity's physics collision matrix) so the editor and code agree.

### 5. Tunnel test (headless, exits with 1 on failure)

```gdscript
# tools/tunnel_test.gd: godot --headless --path . --script res://tools/tunnel_test.gd
# Fires a small fast body at a thin wall; exits with 1 if it ends up on the other side.
extends SceneTree

const SPEED := 3000.0                          # px/s: the game's fastest body
const WALL := 4.0                              # px: the thinnest wall it must not cross
const RADIUS := 4.0                            # px: this body's collision radius
const MODE := RigidBody2D.CCD_MODE_CAST_RAY    # the CCD mode used by the game

func _initialize() -> void:
    var wall := StaticBody2D.new()
    var wall_shape := CollisionShape2D.new()
    wall_shape.shape = RectangleShape2D.new()
    wall_shape.shape.size = Vector2(WALL, 400)
    wall.add_child(wall_shape)
    wall.position = Vector2(500, 0)
    root.add_child(wall)
    var body := RigidBody2D.new()
    var shape := CollisionShape2D.new()
    shape.shape = CircleShape2D.new()
    shape.shape.radius = RADIUS
    body.add_child(shape)
    body.gravity_scale = 0.0
    body.continuous_cd = MODE
    body.position = Vector2(23, 0)             # not a multiple of the step distance
    body.linear_velocity = Vector2(SPEED, 0)
    root.add_child(body)
    for i in 60:
        await physics_frame
    var crossed := body.position.x > wall.position.x
    print("TUNNEL mode=%d x=%.1f %s" % [MODE, body.position.x, "FAIL: crossed" if crossed else "ok"])
    quit(1 if crossed else 0)
```

Set the constants to the game's fastest body and thinnest wall. For 3D, use `RigidBody3D` with
`continuous_cd = true`, `BoxShape3D`, and `SphereShape3D`; this passed here on both
GodotPhysics3D and Jolt.

### 6. Framerate-independence probe

```gdscript
# tools/rate_probe.gd: prints a node's position after 2s of game time. Run at two framerates:
#   godot --headless --path . --fixed-fps 30  --script res://tools/rate_probe.gd -- res://main.tscn Player
#   godot --headless --path . --fixed-fps 144 --script res://tools/rate_probe.gd -- res://main.tscn Player
extends SceneTree

func _initialize() -> void:
    var args := OS.get_cmdline_user_args()
    var scene: Node = load(args[0]).instantiate()
    root.add_child(scene)
    var target: Node = scene.get_node(args[1]) if args.size() > 1 else scene
    for i in Engine.physics_ticks_per_second * 2:  # 2s of simulated time at any framerate
        await physics_frame
    print("RATE position=%s" % [target.position])
    quit(0)
```

Movement done in the physics step shows the same position at both rates. A falling body moved
in `_process` landed about 23 px apart after 2s at 30 and 144 FPS in a test here, while the same
code in `_physics_process` matched to the last digit. Any difference means the simulation code is
reading the frame `dt`.

## Verify

1. Run the tunnel test with the game's fastest body and thinnest wall; it must print `ok`.
2. Run the rate probe at `--fixed-fps 30` and `--fixed-fps 144` on the player or a thrown body;
   positions must match.
3. Grep for forces, `velocity` writes, and `move_and_slide` in `_process` / `Update`; move them
   to the fixed step.
4. Ask the user to play at a low capped framerate and a high uncapped one (Godot `--max-fps 30`,
   then `--disable-vsync`), throw the fastest object at the thinnest wall, stack ten crates and
   push them, and report any shaking, crossing, or exploding, and whether movement feels mushy
   or heavy. Feel is their judgment; the numbers above are yours.

## Pitfalls

- **Shaking even with a fixed step** usually means no render interpolation: the physics and
  display rates beat against each other.
- **Godot's 2D `CCD_MODE_CAST_SHAPE` didn't stop tunneling** in a GodotPhysics2D 4.7.2 test: a
  4px circle at 600-6000 px/s crossed a 4px wall exactly as with CCD disabled, while
  `CCD_MODE_CAST_RAY` stopped it every time. Use the ray mode and prove it with the tunnel test.
- **Discrete collision pushes a body to the other side** once its center passes the midpoint of
  a thin wall in one step, so it tunnels even at speeds where the shapes overlap.
- **Expecting heavier objects to fall faster.** Gravity is an acceleration; mass changes the
  collision response. Shape the feel with gravity scale and damping.
- **Stacks that explode and joints that vibrate**: extreme mass ratios (stay within about 1:10)
  or too few solver iterations.
- **Bodies that never sleep** burn CPU and jitter. Enable sleep and check the thresholds.
- **One-way layer setup**: A scans B but B doesn't scan A. Check both directions of the matrix.
- **A huge `dt` after a hitch** launches bodies. Cap steps per frame (Godot
  `physics/common/max_physics_steps_per_frame`, default 8; Unity Maximum Allowed Timestep). The
  cost is slow motion below `tick_rate / max_steps` FPS.
- **Teleports trail across the screen** with interpolation enabled. Godot: call
  `reset_physics_interpolation()` after moving the node. Unity: with interpolation on, the
  physics system owns the transform and ignores a direct `transform` write unless followed by
  `Physics.SyncTransforms()`; move the Rigidbody instead.
- **Feel changes after raising the tick rate**: Godot (GodotPhysics and Jolt alike) damps by
  multiplying velocity by `1 - damp * step` each tick, clamped to 0, so large damping values
  behave differently at a different tick rate. Re-tune them after changing
  `physics_ticks_per_second`.
- **Raising Godot's `solver_iterations` with no effect**: that setting only affects
  GodotPhysics3D. Jolt uses its own `velocity_steps` and `position_steps` (see the reference).

## References

- [`references/timestep-and-ccd.md`](references/timestep-and-ccd.md): read for the accumulator
  loop and clamping trade-off, interpolation math and teleport resets, substepping, per-engine
  CCD modes, solver iterations (including Jolt settings), sleep, or the stability checklist.

## Related skills

- `godot-physics`, `unity-physics`, `roblox-physics`: engine bodies, colliders, and callbacks.
- `platformer`: jump arcs, coyote time, and jump buffering on top of this tuning.
- `camera-systems`: following an interpolated body without shaking.
- `performance-optimization`: when the physics step itself is too slow.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `physics/common/physics_interpolation` (default false),
  `max_physics_steps_per_frame` (default 8), `physics_ticks_per_second` (default 60); damping is
  `velocity *= max(1 - damp * step, 0)` in both Jolt and GodotPhysics3D at the 4.7-stable tag.
- The tunnel test, CCD mode results, and rate probe ran on Godot 4.7.2 headless.
- Unity 6.3: interpolation takes over the transform and needs `Physics.SyncTransforms` after a
  direct write.
