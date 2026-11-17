---
name: godot-physics
description: "Godot 4.7 physics API in 2D and 3D: body and Area types, `collision_layer`/`mask` bits, Area signals for hurtboxes, RayCast and space queries, and Jolt (3D default since 4.6). Auto-invoke when objects pass through each other, `body_entered` never fires, or a raycast hits itself. Not for engine-agnostic jitter and tunnelling (`physics-tuning`) or CharacterBody movement (`godot-2d-movement`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Godot Physics (4.x, 2D + 3D)

This skill owns choosing the body type, wiring collision layers and masks, overlap detection,
raycasts, and the differences specific to Jolt. Swap the `2D`/`3D` suffix as needed. Targets
**Godot 4.7** (see Version notes). 2D always uses Godot's own 2D engine.

> Adapted/translated from `godot-physics` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Choose a body type, set layers/masks so the right things collide, detect overlap (triggers,
  hurtboxes) with `Area`, apply forces/impulses on a `RigidBody`, or cast rays for line of sight
  and ground checks.

**Not this skill**: `move_and_slide` controllers (`godot-2d-movement`); tile collision
configuration (`godot-tilemap`); engine-agnostic feel (timestep, mass, jitter, CCD strategy)
(`physics-tuning`).

## Main workflow

1. **For 3D, check which engine is running** before debugging behavior. In `project.godot`,
   `[physics]` `3d/physics_engine="Jolt Physics"` means Jolt; no line (`DEFAULT`) means
   GodotPhysics3D. The API is identical, but joints, raycast face indices, kinematic contacts and
   margins differ (see Pitfalls).
2. **Choose the body type:** `StaticBody` never moves; `AnimatableBody` is moved by code or
   animation and pushes others (platforms, doors); `RigidBody` is simulated (move it via forces,
   impulses or `linear_velocity`, never `position`); `CharacterBody` is script-driven; `Area` only
   detects and can override gravity/damping. Every body needs a non-empty
   `CollisionShape`/`CollisionPolygon` child.
3. **Configure layers and masks.** Layers are what a body *is*; masks are what it *scans*. A
   detects B only if B's layer bit is in A's mask. Name the bits in `project.godot`:

   ```ini
   [layer_names]
   2d_physics/layer_1="player"
   2d_physics/layer_2="walls"
   2d_physics/layer_3="enemies"
   ```

4. **Detect overlaps** with `Area` signals (`body_entered`, `area_entered`); `monitoring` on the
   detecting Area, `monitorable` on the detected one.
5. **Cast rays** with a `RayCast2D/3D` node (polled every physics frame) or a one-off
   `direct_space_state` query.
6. **Run the checks** below before concluding.

## Patterns

### 1. RigidBody: impulse, force and safe teleport

```gdscript
extends RigidBody3D

var _teleport_to: Variant = null

func push(direction: Vector3) -> void:
    apply_central_impulse(direction * 8.0)      # one-off velocity change

func teleport(to: Transform3D) -> void:
    _teleport_to = to                           # applied in the solver step

func _integrate_forces(state: PhysicsDirectBodyState3D) -> void:
    if _teleport_to != null:
        state.transform = _teleport_to
        state.linear_velocity = Vector3.ZERO
        state.angular_velocity = Vector3.ZERO
        _teleport_to = null
```

### 2. One-off raycast that ignores the emitter

```gdscript
func ground_under(from: Vector2) -> Dictionary:
    var space := get_world_2d().direct_space_state
    var query := PhysicsRayQueryParameters2D.create(from, from + Vector2(0, 64))
    query.collision_mask = 0b10                  # layer 2 only ("walls")
    query.exclude = [get_rid()]                  # Array[RID], not nodes
    return space.intersect_ray(query)            # {} if missed, else collider/position/normal
```

### 3. Headless test that an Area sees a body

```gdscript
# res://tests/test_physics.gd
extends SceneTree

func _initialize() -> void:
    var level: Node = load("res://levels/test_arena.tscn").instantiate()
    root.add_child(level)
    for _i in 3:
        await physics_frame                      # overlap lists update per step
    var hurtbox: Area2D = level.get_node("Hurtbox")
    var player: Node2D = level.get_node("Player")
    var ok := hurtbox.overlaps_body(player)
    print("hurtbox sees the player: ", ok)
    quit(0 if ok else 1)
```

## Verify

1. Run the headless test and read the exit code and any `SCRIPT ERROR`/`ERROR:` line.
2. For a visual check, ask the user to run `godot --path . --debug-collisions` and report
   overlaps.
3. If `.tscn` files were hand-edited, also run `godot-nodes-scenes`'s path checker.

## Pitfalls

- **Layer vs. mask confusion** is the most common bug. Detection can be one-directional: A sees B
  if B's layer is in A's mask, regardless of B's mask.
- **Moving a RigidBody via `position`** fights the solver and causes tunnelling or jitter. Use
  impulses, forces, `linear_velocity`, `freeze`, or set `state.transform` in `_integrate_forces`
  (Pattern 1).
- **A RigidBody's `body_entered` never fires** unless `contact_monitor = true` and
  `max_contacts_reported > 0`.
- **An `Area` doesn't fire** when `monitoring` is off on it, `monitorable` is off on the other
  Area, or the bits don't overlap. Changing `monitoring` from an enter/exit signal handler is
  blocked; use `set_deferred("monitoring", false)`.
- **`get_overlapping_bodies()` is empty right after spawning** → the list updates once per physics
  step. Await a `physics_frame` or use the signals.
- **RayCast2D/3D read stale or missing data** if `enabled` is false or it's read before physics has
  run. Read in `_physics_process`; call `force_raycast_update()` after moving it in the same tick.
- **Fast objects pass through thin walls** → enable `continuous_cd` on the RigidBody or sweep with
  a ray/shape. Tuning strategy belongs to `physics-tuning`.
- **"Can't change this state while flushing queries"** → bodies or shapes were added/removed in a
  physics callback. Use `call_deferred` / `set_deferred`.

### Jolt Physics differences (3D)

- **`face_index` is always `-1`** in `intersect_ray()` / `RayCast3D` results. Enable
  `physics/jolt_physics_3d/queries/enable_ray_cast_face_index=true` in `project.godot` if needed.
- **A single-body joint gets inverted limits after switching engines.** Jolt treats a solo body as
  `node_b` with `node_a` as the world; GodotPhysics3D treats it as `node_a`.
- **Soft-limit joint properties do nothing** under Jolt: `bias`/`damping`/`impulse_clamp` on
  `PinJoint3D`; `bias`/`softness`/`relaxation` on `HingeJoint3D` and `ConeTwistJoint3D`; and other
  equivalent properties on `SliderJoint3D` and `Generic6DOFJoint3D`.
- **A frozen kinematic `RigidBody3D` reports no contacts** with static or kinematic bodies, even
  with `max_contacts_reported > 0`.
- **A `WorldBoundaryShape3D` floor sits at the wrong height after upgrading to 4.7** → under Jolt,
  4.7 reads `plane.d` with Godot's sign convention, the opposite of 4.6; flip the sign of `d` in
  projects tuned on 4.6.

## References

- The official docs cover the body type table, the full RigidBody control API, shape queries
  (`intersect_shape`, `cast_motion`), RayCast node options, joints, one-way collision, and
  Area gravity/damping overrides. Also read the "Using Jolt Physics" page for any Jolt
  difference not listed above.

## Related skills

- `godot-2d-movement` for `CharacterBody2D` controllers.
- `godot-tilemap` for tile collision shapes and their layers.
- `physics-tuning` for engine-agnostic feel: timestep, mass, drag, CCD, jitter.
- `godot-3d-essentials` for the 3D scene these bodies live in.
- `godot-gdscript-headless-testing` to keep Pattern 3 in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Jolt Physics is the default 3D engine for projects created on 4.6 or newer; older projects keep
  GodotPhysics3D until manually switched.
- 4.7 flipped Jolt's reading of `WorldBoundaryShape3D`'s `plane.d` and added
  `one_way_collision_direction` on 2D collision shapes.
