---
name: camera-systems
description: "Builds and tunes game cameras, engine-agnostic with Godot and Cinemachine 3 mappings: 2D follow with deadzone and look-ahead, third-person orbit, first-person view, and split screen. Auto-invoke when the camera lags, shakes while following, shows past the level edge, clips through walls, or changes with framerate. Not for shake (`game-feel`) nor physics-step jitter (`physics-tuning`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Camera systems

A good camera follows smoothly at any framerate, anticipates action, never shows past the level
edge, and never clips through walls. This skill owns these techniques and maps them onto each
engine's camera node or rig; prefer the engine's built-in rig before hand-rolling one.

> Adapted and translated from the `camera-systems` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- A 2D camera must follow smoothly, ignore small movements, anticipate motion, and stay within
  bounds.
- A 3D third-person orbit controller or first-person view, or framing multiple targets.
- Fixing shake, jitter, motion sickness, or a camera that looks past the level.

**Not this skill**: shake magnitude and triggers (`game-feel`; this skill only exposes the
offset), physics jitter of the body itself (`physics-tuning`), `Camera3D` and environment setup
(`godot-3d-essentials`), player movement (`godot-2d-movement` or the engine's movement skill),
look-sensitivity input curves (`input-systems`).

## Main workflow

1. **Decide what the camera serves.** Platformer (anticipate the jump, see hazards), top-down
   (center with deadzone), third person (orbit plus collision), first person (look only).
2. **Use the built-in rig first**: Godot's `Camera2D` smoothing, limits, and drag margins, or
   `SpringArm3D`; Unity Cinemachine 3 (`CinemachineCamera` plus Position Composer, Orbital
   Follow, Deoccluder, Confiner). Only hand-code what the rig doesn't do.
3. **Smooth with `1 - exp(-rate * dt)`** or a critically-damped spring (`SmoothDamp`), never a
   fixed per-frame `lerp(a, b, 0.1)`.
4. **Add a deadzone, then look-ahead** eased toward its target so direction changes don't whip
   the view.
5. **Clamp the view, not the center**, to the level rectangle, accounting for zoom.
6. **In 3D, separate look from collision**: yaw and pitch on a pivot, a spring arm or ray pulls
   the camera inward, pitch clamped.
7. **Update after the target has moved** (late update, or after physics) and follow the
   target's interpolated transform when physics interpolation is enabled.
8. **Verify with an executable check, then by eye.** Run the follow code headless with a target
   moving at 300 px/s for 2 s at `dt = 1/30` then `dt = 1/144`, and compare how far behind the
   camera lags. With exponential smoothing at `rate = 8` the lag is about 33 px and 37 px; a
   fixed `lerp(..., 0.1)` gives about 90 px and 19 px — a sign the follow depends on framerate.
   Then ask the user to run into corners, walls, and level edges at low and high framerate and
   report any shake, looking past the edge, or jumps.

## Patterns

### 1. Godot built-in 2D follow: smoothing + limits (don't hand-roll this first)

```gdscript
# Godot 4.7 Camera2D. Engine-provided smoothing + hard limits + drag margins.
@onready var cam := $Camera2D
func _ready() -> void:
    cam.make_current()
    cam.position_smoothing_enabled = true
    cam.position_smoothing_speed = 6.0           # higher = snappier; lower = floatier
    cam.limit_left = 0; cam.limit_top = 0        # clamp to the level rectangle (pixels)
    cam.limit_right = level_width; cam.limit_bottom = level_height
    cam.drag_horizontal_enabled = true           # built-in deadzone via drag margins
```

### 2. Framerate-independent smoothed follow (when hand-coding it)

```gdscript
# RIGHT: exponential smoothing — same feel at any FPS. `rate` ~ 5..12.
func _follow(dt: float) -> void:
    var t := 1.0 - exp(-rate * dt)               # converges correctly regardless of dt
    global_position = global_position.lerp(target.global_position, t)
# WRONG: global_position = global_position.lerp(target.global_position, 0.1)
#        → smooths faster at high FPS; feels different on every machine.
# Unity 6.3 LTS: Vector3.SmoothDamp(transform.position, target.position, ref vel, smoothTime)
# in LateUpdate gives the same spring behavior with built-in framerate correction.
```

### 3. Deadzone + look-ahead (anticipate the player, ignore jitter)

```gdscript
# The camera only chases once the target leaves the deadzone box, then aims AHEAD of the motion.
func _camera_target(dt: float) -> Vector2:
    var to := target.global_position - _focus
    var dz := deadzone_half_extents                  # e.g. Vector2(48, 32)
    # Only move the focus by the overshoot beyond the deadzone (per axis).
    _focus.x += clampf(absf(to.x) - dz.x, 0, INF) * signf(to.x)
    _focus.y += clampf(absf(to.y) - dz.y, 0, INF) * signf(to.y)
    var lead := target.velocity.normalized() * look_ahead_dist    # aim ahead of movement
    return _focus + lead
```

### 4. 3D third-person orbit with anti-collision pull-in

```gdscript
# Godot 4.7. Yaw/pitch on a pivot; a SpringArm3D automatically pulls the camera in if blocked.
func _unhandled_input(e):
    if e is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        # screen_relative is not scaled; `relative` is scaled by stretch settings, so
        # sensitivity would change with window size. The docs recommend screen_relative
        # for aiming with the mouse captured.
        _yaw -= e.screen_relative.x * sensitivity
        _pitch = clampf(_pitch - e.screen_relative.y * sensitivity,
                        deg_to_rad(-80.0), deg_to_rad(45.0))       # clamp pitch!
func _process(_dt):
    pivot.rotation = Vector3(_pitch, _yaw, 0)
    # $SpringArm3D handles wall collision: set spring_length + collision_mask; the child
    # Camera3D slides inward automatically. RIGHT: spring arm. WRONG: the camera clips through walls.
# Unity 6.3 LTS: a Cinemachine 3 CinemachineCamera (namespace Unity.Cinemachine) with an Orbital
# Follow + Cinemachine Deoccluder; the CinemachineBrain on the Camera blends automatically.
```

### 5. Screen shake hook (the trigger stays in `game-feel`)

```gdscript
# Expose an additive offset that game-feel's trauma model writes; follow + shake compose.
var shake_offset := Vector2.ZERO                 # set each frame by game-feel (trauma^2 * noise)
func _apply(final_focus: Vector2) -> void:
    global_position = final_focus + shake_offset  # shake layers ON TOP of smoothed follow
# Unity Cinemachine 3: CinemachineBasicMultiChannelPerlin (AmplitudeGain/FrequencyGain) for
# continuous trauma-driven noise; for one-off impacts, a CinemachineImpulseSource on the
# attacker plus a CinemachineImpulseListener on the camera.
```

## Pitfalls

- **`lerp(pos, target, const)` per frame** depends on framerate: floatier at 30 FPS, snappier
  at 144. Use `1 - exp(-rate * dt)` or `SmoothDamp`.
- **Jitter following a physics body**: the body moves on the physics tick (60 Hz) and the
  camera at display rate. Enable physics interpolation (Godot
  `physics/common/physics_interpolation`) and follow the body's interpolated transform in
  `_process` (`get_global_transform_interpolated()` in 3D), or follow during the physics step
  with `Camera2D.process_callback = CAMERA2D_PROCESS_PHYSICS`. Mixing both causes jitter.
- **One-frame lag** following in the normal update before the target has moved. Follow in
  `LateUpdate` (Unity) or after movement and physics are resolved.
- **Camera parented to the moving player** inherits every jolt and fights interpolation. Keep
  the camera on its own branch (or `top_level = true`) and follow in code or with a rig.
- **Clamping the center rather than the view** shows black past the edge. Clamp to
  `[min + half_view, max - half_view]`, and center on any axis where the level is smaller than
  the view.
- **No deadzone in a jittery game** makes the camera shake on every micro-movement; a box and a
  circular deadzone feel different, so choose deliberately.
- **Unclamped pitch** flips the camera over the top. About -80° to +45° for an orbit, ±80° for
  first person.
- **Mouse look sensitivity changes with window size** under Godot:
  `InputEventMouseMotion.relative` is scaled by stretch settings; read `screen_relative` for
  aiming with the mouse captured.
- **Clipping through walls** in 3D: use a spring arm or an occlusion ray, with a probe radius a
  bit larger than the camera's near-plane half-size.
- **Sling after teleport or respawn**: a smoothed camera whips across the level. Cut instantly
  and reset the smoothing state (Godot `Camera2D.reset_smoothing()`), or ease quickly and
  deliberately.
- **Shake written into the follow target** makes follow fight shake. Smooth the follow first,
  add the shake offset last.

## References

- [`references/follow-and-framing.md`](references/follow-and-framing.md): read for the
  smoothing derivation, a complete 2D rig with deadzone plus look-ahead plus limits, orbit and
  first-person detail, group framing and split screen, cinematic transitions, and the
  Godot/Cinemachine 3 component mapping table.

## Related skills

- `game-feel`: trauma and shake triggers; writes this skill's offset.
- `godot-2d-movement`, `godot-3d-essentials`: the player and world the camera frames.
- `physics-tuning`: timestep and interpolation for followed bodies.
- `input-systems`: look sensitivity, inversion, and stick response curves.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `Camera2D.position_smoothing_*`, `limit_*`, `drag_*`, `process_callback`,
  `reset_smoothing()`; `InputEventMouseMotion.screen_relative`; physics interpolation and manual
  camera interpolation.
- Unity 6.3 LTS with Cinemachine 3.1 (namespace `Unity.Cinemachine`). The 2.x names
  `CinemachineVirtualCamera`, `CinemachineCollider`, and `CinemachineFramingTransposer` are
  deprecated in 3.x.
- PhantomCamera (Godot addon), latest version v0.11.0.4, October 2026.
