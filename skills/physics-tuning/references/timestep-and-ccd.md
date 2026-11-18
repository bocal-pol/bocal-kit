# Fixed timestep, interpolation, CCD, and stability

Content: why a fixed timestep; the accumulator loop; render interpolation; substepping;
continuous collision detection; solver iterations and stability; sleep; stability checklist.

## Why a fixed timestep

Numerical integration and collision resolution are sensitive to step size. With a variable
`dt`, the same scene behaves differently at 30 vs. 144 FPS — springs gain energy, fast objects
tunnel more, stacks settle differently. A **constant** `dt` makes the simulation consistent and
far more reproducible.

## The accumulator loop (engine-agnostic)

Engines implement this for you; understanding it explains the settings.

```python
PHYSICS_HZ = 60
FIXED_DT = 1.0 / PHYSICS_HZ
accumulator = 0.0
MAX_STEPS = 5            # cap to avoid the "spiral of death" after a hitch

def frame(render_dt):
    global accumulator
    accumulator += min(render_dt, FIXED_DT * MAX_STEPS)   # clamps giant dt spikes
    steps = 0
    while accumulator >= FIXED_DT and steps < MAX_STEPS:
        store_previous_state()        # for interpolation
        physics_step(FIXED_DT)        # ALL simulation uses the constant dt
        accumulator -= FIXED_DT
        steps += 1
    alpha = accumulator / FIXED_DT    # remaining fraction toward the next tick
    render(interpolate(prev_state, curr_state, alpha))
```

- Running 0, 1, or several physics steps per frame is normal and correct.
- Clamping `render_dt` (and `MAX_STEPS`) stops a slow frame from claiming dozens of steps, which
  would slow the game down even more — the "spiral of death."
- The cost of the clamp: once rendering drops below `PHYSICS_HZ / MAX_STEPS` FPS, the game runs
  in slow motion. Godot's equivalent is `physics/common/max_physics_steps_per_frame` (default 8;
  raise it if the tick rate is raised a lot); Unity's is *Maximum Allowed Timestep*, which bounds
  `FixedUpdate` calls per frame to `maximumDeltaTime / fixedDeltaTime`.

## Render interpolation

The render frame almost never lands exactly on a physics tick, so drawing the raw physics
transform stutters. Interpolate the *visual* between the previous and current physics states by
`alpha`:

```
visual_pos = lerp(prev_pos, curr_pos, alpha)
visual_rot = slerp(prev_rot, curr_rot, alpha)   # rotations: spherical lerp
```

This adds up to one physics step of latency but removes the stutter. Engines expose it
directly: Unity `Rigidbody.interpolation = Interpolate` (or `Extrapolate`), Godot
`physics/common/physics_interpolation` / `get_physics_interpolation_fraction()`. Prefer the
built-in; hand-code only for objects the engine doesn't cover. After a teleport, reset the
history (Godot `reset_physics_interpolation()` after moving it; in a hand-coded version set
`prev_state = curr_state`) or the object visibly slides from its old position.

## Substepping

For very fast bodies or rigid joints, subdivide each physics step into N substeps (a smaller
`dt`) for precision, at the cost of CPU. Many engines expose a max substep count / solver
substep. Raise it when fast or rigid systems misbehave; lower it to save CPU.

## Continuous collision detection (CCD)

Discrete collision tests positions once per step; a body that moves more than its own thickness
per step can pass entirely through a thin collider (tunneling). CCD sweeps the body along its
motion and catches the first contact.

- Only enable CCD on bodies that need it (small + fast: projectiles, bullets); it costs more
  than discrete checks.
- Modes vary: sweep only against static geometry, or also against dynamic bodies (more
  expensive). Use the cheapest mode that fixes the case. Unity names them `Continuous` (static
  geometry only), `ContinuousDynamic` (static and dynamic), and `ContinuousSpeculative` (static
  and dynamic, cheaper, but can cause "ghost collisions" where a speculative contact deflects a
  body that wouldn't have hit). Godot's `RigidBody3D.continuous_cd` is a boolean;
  `RigidBody2D.continuous_cd` is `CCD_MODE_DISABLED`, `CCD_MODE_CAST_RAY`, or
  `CCD_MODE_CAST_SHAPE`. In a Godot 4.7.2 test only the ray mode stopped a small fast circle at
  a thin wall.
- Complementary fixes: cap max velocity so `speed / PHYSICS_HZ < thinnest_collider`; thicken
  thin walls; raise PHYSICS_HZ. For projectiles, a ray or shape cast along the frame's motion is
  often simpler than a fast rigid body.

## Solver iterations and stability

The constraint solver runs a fixed number of iterations per step; more iterations = stiffer,
more stable stacks and joints, at a CPU cost.

- **Stacks exploding/penetrating**: raise solver iterations (position/velocity). Where the
  setting lives: Unity `Physics.defaultSolverIterations` (default 6) and
  `defaultSolverVelocityIterations` (default 1), or per body. Godot 4.6+ creates new projects on
  **Jolt Physics** (`physics/3d/physics_engine`); with Jolt use
  `physics/jolt_physics_3d/simulation/velocity_steps` (default 10, keep ≥ 2 or friction stops
  working) and `position_steps` (default 2) — `physics/3d/solver/solver_iterations` only affects
  GodotPhysics3D.
- **Extreme mass ratios** (a feather resting under a boulder) are inherently unstable — keep
  ratios within about 1:10 where possible.
- **Jittering resting contacts**: enable a small contact offset / allowed penetration, and let
  bodies sleep.

## Sleep

Resting bodies should **sleep** (stop being simulated) until disturbed. This saves CPU and stops
micro-jitter on objects at rest. Tune linear/angular sleep thresholds and time-before-sleep;
make sure gameplay-critical bodies wake on the right events (collisions, force application).

## Stability checklist

- Physics in the fixed step; rendering interpolated.
- `render_dt` and step count clamped against hitches.
- CCD on fast/small bodies; max velocity capped.
- Modest mass ratios; gravity_scale/drag tuned for feel, not mass.
- Enough solver iterations for stacks/joints.
- Sleep enabled with sane thresholds.
- Collision layer/mask matrix checked both directions.
- Tested at low and high framerate and under CPU load.
