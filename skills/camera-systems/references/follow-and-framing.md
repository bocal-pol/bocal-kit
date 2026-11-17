# Follow and framing

Contents:
1. Why `1 - exp(-rate*dt)` (framerate-independent smoothing)
2. Complete 2D rig: deadzone, look-ahead, limits
3. 3D third-person orbit
4. First-person view
5. Multi-target and group framing, split screen
6. Cinematic fades and transitions
7. Per-engine rig summary (Godot 4.7, Cinemachine 3)

The snippets target Godot 4.7 and Unity 6.3 LTS with Cinemachine 3.

## 1. Why `1 - exp(-rate*dt)` (framerate-independent smoothing)

A naive `pos = lerp(pos, target, k)` applies `k` *per frame*, so at 144 FPS it smooths far more
per second than at 30 FPS — the feel changes with hardware. Exponential smoothing fixes the rate
*per second*:

```text
t = 1 - exp(-rate * dt)      # rate ≈ 5 (floaty) .. 12 (snappy)
pos = lerp(pos, target, t)   # identical convergence at any framerate
```

A critically-damped spring (Unity `Vector3.SmoothDamp`, or a hand-coded spring with
`smoothTime`) gives the same framerate independence plus velocity continuity (no overshoot).
Prefer the engine's built-in spring/smoothing before hand-coding one.

## 2. Complete 2D rig: deadzone + look-ahead + limits

Order of operations each frame, after the target has moved:

1. Compute the target's overshoot beyond the **deadzone** (box or circle) → move the focus by
   only the overshoot.
2. Add **look-ahead**: `focus += move_dir * lookAheadDist`, but **ease the look-ahead offset
   itself** toward its target so a direction change doesn't snap the view.
3. **Smooth** the camera toward the focus (section 1).
4. **Clamp** so the *visible rectangle* stays within bounds: clamp the camera center to
   `[min + half_view, max - half_view]` per axis (clamp the view, not the center).

```gdscript
# Godot 4.7: clamp the VIEW, accounting for zoom and viewport size.
func _clamp_to_level(center: Vector2) -> Vector2:
    var half := get_viewport_rect().size * 0.5 / zoom
    return Vector2(
        clampf(center.x, level_rect.position.x + half.x, level_rect.end.x - half.x),
        clampf(center.y, level_rect.position.y + half.y, level_rect.end.y - half.y))
# If the level is smaller than the view on an axis, center on that axis instead of clamping.
```

Tuning: deadzone `32-64 px`, look-ahead `40-120 px` eased over `0.2-0.4 s`, smoothing
`rate 6-10`.

## 3. 3D third-person orbit

- **Rig:** an invisible pivot at shoulder/head height on the character; yaw on the pivot, pitch
  on a child; the camera sits at `-springLength` on local Z.
- **Collision:** a spring arm (Godot `SpringArm3D`) or an occlusion ray casts from the pivot
  toward the desired camera position and shortens at the first hit so the camera never clips
  through walls.
- **Pitch clamp:** ~`[-80°, +45°]` so the camera can neither flip over nor dig into the ground.
- **Sensitivity and inversion:** expose look sensitivity and Y-inversion (see `input-systems`).
- **Cinemachine 3 (Unity 6.3 LTS):** a `CinemachineCamera` (namespace `Unity.Cinemachine`) with
  an **Orbital Follow** component and a **Cinemachine Deoccluder** (collision); the
  `CinemachineBrain` on the `Camera` blends between cameras. Replaces the v2 names
  `CinemachineVirtualCamera` / `CinemachineCollider`.

## 4. First-person view

- Yaw rotates the body (movement aligns with the view); pitch only rotates the camera head.
- Clamp pitch; never let roll accumulate.
- Mouse: capture the cursor (`Input.mouse_mode = Input.MOUSE_MODE_CAPTURED`) and read
  `InputEventMouseMotion.screen_relative`, which is not scaled by stretch settings.
- Stick: apply a response curve + deadzone (see `input-systems`) and a framerate-scaled
  rotation rate.

## 5. Multi-target / group framing

- Compute the bounding box of all targets; place the camera at the box's center.
- **2D:** set zoom so the box (plus margin) fits the viewport; clamp min/max zoom.
- **3D:** dolly the camera back / adjust FOV to frame the box. In Cinemachine 3, point the
  camera's Tracking Target at a `CinemachineTargetGroup` and add `CinemachineGroupFraming`.
- **Split screen:** one camera per player rendering to a viewport rectangle; budget the extra
  rendering cost (`performance-optimization`).

## 6. Cinematic fades and transitions

- Fade between gameplay and cinematic cameras over a short delay (ease-in-out). Cinemachine
  fades automatically when active camera priority changes; under Godot, tween a rig between
  marker transforms, or swap `current` cameras with a fade.
- Reset smoothing state on hard cuts/teleports so the camera doesn't sling across the map.

## 7. Per-engine rig summary

Unity column: Cinemachine 3.x, namespace `Unity.Cinemachine`. The v2 components
(`CinemachineVirtualCamera`, `CinemachineCollider`, `CinemachineFramingTransposer`) are marked
deprecated in 3.x and point to `CinemachineCamera`, `CinemachineDeoccluder`, and
`CinemachinePositionComposer`; don't use them in new code. `CinemachineDeoccluder` keeps the
target in line of sight; `CinemachineDecollider` only pulls the camera out of geometry it's
intersecting.

| Need | Godot 4.7 | Unity 6.3 LTS |
|------|-----------|---------|
| 2D follow + smoothing + limits | `Camera2D` (`position_smoothing_*`, `limit_*`, `drag_*`) | `CinemachineCamera` + `CinemachinePositionComposer` (Damping, Dead Zone, Lookahead) + `CinemachineConfiner2D` |
| 3D follow/orbit | pivot + `SpringArm3D` + `Camera3D` | `CinemachineCamera` + `CinemachineOrbitalFollow` + `CinemachineDeoccluder` (or `CinemachineDecollider`) |
| Shake | additive `offset` from `game-feel` | `CinemachineBasicMultiChannelPerlin` (noise); `CinemachineImpulseSource` + `CinemachineImpulseListener` (impacts) |
| Limits | `limit_*` / manual clamp | `CinemachineConfiner2D/3D` |
| Group framing | manual bounding box + zoom | `CinemachineTargetGroup` + `CinemachineGroupFraming` |
| Addon option | `PhantomCamera` (declarative 2D/3D rigs) | built-in Cinemachine |
