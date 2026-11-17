---
name: godot-2d-movement
description: "Godot 4.7 `CharacterBody2D` movement in GDScript: platformer run/jump, top-down 8-direction movement, slopes and one-way platforms, with a headless landing test. Auto-invoke when a 2D controller doesn't move, walks through the floor, or `is_on_floor()` is always false. Not for coyote time and jump feel (`platformer`), RigidBody2D, raycasts or 3D (`godot-physics`), or tile-based levels (`godot-tilemap`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Godot 2D Movement (4.x)

This skill owns writing `CharacterBody2D` controllers that land, run, jump and slide the way the
engine expects, plus proof via a headless test. Targets **Godot 4.7**; check `config/features` in
`project.godot`.

> Adapted/translated from `godot-2d-movement` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Write a `CharacterBody2D` controller: platformer (run/jump) or top-down (8-direction).
- Debug a character that doesn't move, walks through the floor, slides on slopes, or whose
  `is_on_floor()` always stays false.

**Not this skill**: coyote time, jump buffering and jump feel (`platformer`); RigidBody2D,
raycasts and 3D (`godot-physics`); tile-based levels (`godot-tilemap`).

## Main workflow

1. **Read the scene first.** Open the player's `.tscn`: the root should be a `CharacterBody2D` with
   a child `CollisionShape2D`/`CollisionPolygon2D`, and the action names used by the script must
   exist under `[input]` in `project.godot`.
2. **Choose the motion mode.** Platformers keep the default `MOTION_MODE_GROUNDED`; top-down games
   switch to `MOTION_MODE_FLOATING`, which has no floor, wall or ceiling.
3. **Set `velocity`, then call `move_and_slide()` once per `_physics_process()`.** It takes no
   arguments, applies the physics delta itself, and rewrites velocity after collisions.
4. **Read the results after the call**: `is_on_floor()`, `is_on_wall()`, `get_wall_normal()`,
   `get_slide_collision(i)`. They describe the last `move_and_slide()`, not the current frame.
5. **Delegate feel.** Coyote time, jump buffering, variable jump height and apex tuning belong to
   `platformer`; this skill provides the Godot hooks it reads (`is_on_floor()`, `velocity`).
6. **Run the checks** below before concluding.

## Patterns

### 1. Platformer controller

```gdscript
extends CharacterBody2D

@export var speed := 200.0
@export var jump_velocity := -400.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity += get_gravity() * delta   # project gravity, plus any Area2D override

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    var dir := Input.get_axis("move_left", "move_right")
    if dir != 0.0:
        velocity.x = dir * speed
    else:
        velocity.x = move_toward(velocity.x, 0.0, speed)   # stops in one tick

    move_and_slide()
```

### 2. Top-down 8-direction movement

```gdscript
extends CharacterBody2D

@export var speed := 220.0

func _ready() -> void:
    motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

func _physics_process(_delta: float) -> void:
    # get_vector applies action deadzones and clamps length to 1.
    velocity = Input.get_vector("move_left", "move_right", "move_up", "move_down") * speed
    move_and_slide()
```

### 3. Reacting to what the body hit

```gdscript
func _physics_process(delta: float) -> void:
    # ... set velocity ...
    move_and_slide()
    for i in get_slide_collision_count():
        var other := get_slide_collision(i).get_collider()
        if other and other.is_in_group("enemies"):
            take_damage(1)
```

## Verify

1. If `godot-nodes-scenes` is installed, run its project-checking script after adding/moving
   scenes and scripts; fix every `ERROR`.
2. Copy a headless controller test, set the action names at the top of the file to the project's,
   and run `godot --headless --path <project> --script res://tests/test_character_controller.gd -- res://player.tscn`.
   Exit 0 means the body landed, jumped and ran (or, in floating mode, moved on both axes without
   drift); each `FAIL` line names the broken behavior.
3. On a fresh clone, run `godot --headless --path <project> --import` first.
4. For feel, ask the user to play and report jump height and stop speed; the test only proves the
   mechanics.

## Pitfalls

- **The character crawls** → `velocity` was multiplied by `delta`. `move_and_slide()` already
  scales by the physics step; only `move_and_collide()` takes a per-frame movement.
- **`is_on_floor()` is always false** → the body is in `MOTION_MODE_FLOATING`, `up_direction` isn't
  `Vector2.UP`, there's no collision shape, the floor's layer isn't in this body's mask, or
  `move_and_slide()` hasn't run yet this tick.
- **It walks through the floor or teleports** → some code moves it with `position +=` or
  `global_position =`, which skips collision. Only move via `velocity`; teleport only for respawns.
- **Movement is jerky or framerate-dependent** → movement runs in `_process()`. Use
  `_physics_process()`; for smooth high-refresh rendering, enable
  `physics/common/physics_interpolation` instead of moving the body in `_process()`.
- **Slides on slopes while standing still** → keep `floor_stop_on_slope` enabled (default) and
  increase `floor_snap_length` (default 1 px) so the body sticks going downhill. Slopes beyond
  `floor_max_angle` (default 45°) count as walls.
- **3.x code doesn't parse** → `move_and_slide(velocity, Vector2.UP)` is gone; set `velocity` and
  `up_direction` as properties and call `move_and_slide()` with no argument.
- **`The InputMap action "jump" doesn't exist` in the log, and the character ignores input** → the
  action is missing from `project.godot`. The test itself supplies empty actions when they're
  missing, so it can pass while the game fails — read the notes and fix the Input Map.

## References

- The official `CharacterBody2D` docs cover one-way platforms (including
  `one_way_collision_direction` in 4.7), moving platforms, `move_and_collide()` bounces,
  acceleration ramps, and the main properties.

## Related skills

- `platformer`: coyote time, jump buffering, variable jump and jump feel on top of Pattern 1.
- `godot-physics`: collision layers and masks, areas, raycasts, rigid bodies, 3D characters.
- `physics-tuning`: engine-agnostic diagnosis of tunnelling and jitter.
- `godot-animation`: driving sprites and state machines from `velocity` and floor state.
- `camera-systems`: a follow camera for this character.
- `godot-gdscript-headless-testing`: running the controller test in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- `CollisionShape2D`/`CollisionPolygon2D.one_way_collision_direction` is new in 4.7 (default
  `Vector2(0, 1)`); earlier versions always blocked from the shape's local top side.
- `get_gravity()` on physics bodies exists since 4.3.
