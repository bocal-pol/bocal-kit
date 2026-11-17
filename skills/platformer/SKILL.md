---
name: platformer
description: "Designs 2D platformer jump feel in any engine: coyote time, jump buffer, variable height, fall gravity, wall jumps, hazards and checkpoints, with a jump calculator (`scripts/jump_tuner.py`). Auto-invoke for a Mario- or Celeste-like game, or a jump that feels soft, heavy, or does not trigger at a platform edge. Not for generic input buffering (`input-systems`), generic juice (`game-feel`), or top-down movement without gravity (engine movement skill)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Platformer

This skill owns jump feel and how levels are built around it, never engine code. Numbers are
engine-agnostic, expressed in tiles and seconds, so they survive a change of tile size or
engine. The detected engine skill supplies the physics-body API (2D movement, Rigidbody,
Arcade Physics) — always load it together with this genre skill.

> Adapted/translated from the `platformer` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Building a side-view game whose central verb is jumping between surfaces.
- Fixing the feel: "soft", "heavy", "the jump didn't trigger", "I fell and couldn't jump",
  "I get stuck on corners", small jumps that are too high or too short.

**Not this skill**: top-down movement without gravity (the detected engine's movement skill),
3D traversal (`fps-shooter` or the engine's 3D skill), grid or turn-based movement (`roguelike`,
`puzzle`), generic input buffering outside jump context (`input-systems`), generic juice —
screen shake/hit-stop (`game-feel`).

## Main workflow

1. **Read the controller first.** Find where velocity is integrated and at what rate:
   `_physics_process` in Godot (60 Hz by default), `FixedUpdate` in Unity (0.02 s = 50 Hz by
   default), Phaser Arcade's fixed step (enabled by default). Note tile size, Y-axis direction,
   and current constants. Ask which game the feel should resemble if not specified: "Mario-like"
   (inertia, heavy fall) and "Celeste-like" (instant, precise) target different feels.
2. **Choose targets** from the table below, in tiles and seconds.
3. **Derive the constants** with the calculator (path relative to this skill's folder):
   `python3 scripts/jump_tuner.py --height 3.5 --apex-time 0.35 --tile 16 --tick 60
   --run-speed 8`. It prints rise/fall gravity and launch velocity, simulates the jump at the
   project's tick, and warns on apex error from the integrator, grace windows that lose a tick,
   the tap-hop ratio, and tunnelling risk. Add `--json` for script-consumable output.
4. **Implement the core feel** (Pattern 1) in this order: buffer, coyote, variable height, apex
   hang, fall cap, then corner correction. Run it on the fixed tick.
5. **Size the level to the measured reach.** Critical-path platforms sit at least half a tile
   below the reached apex, and gaps at least one tile shorter than the jump reach the tool
   reports. Optional paths can use the full reach.
6. **Verify.** Add a debug switch that writes `t,y` on every physics tick of a jump (starting on
   the tick the jump fires) to a CSV, run the scene (headless if the engine allows it: `godot
   --headless`), then run `python3 scripts/jump_tuner.py <same targets> --log jump.csv`. Exit
   code 1 = measured apex or time-to-apex deviates by more than 5%. Then script these edge cases
   as tests and report what each produced: press 1 tick before landing, press N ticks after
   leaving a platform (N = coyote ticks, then N + 1), tap vs. hold, jump into a ceiling corner
   2 px from the edge.

## Feel targets

Starting points. The Celeste column comes from its published `Player.cs` (8 px tiles, 60 Hz);
use it as a "precise and snappy" reference, not as the only correct answer.

| Setting | Starting point | Range | Celeste |
|---|---|---|---|
| Full jump height | 3.5 tiles | 2-5 | ~3.5 tiles (28 px) |
| Time to apex | 0.35 s | 0.25-0.45 | ~0.37 s |
| Airtime on flat ground | 0.6-0.7 s | 0.5-0.9 | ~0.68 s |
| Tap hop (short jump) | 30% of full | 15-60% | ~20% |
| Fall gravity | 1.8x rise | 1.3-2.5 | same as rise, but terminal velocity capped low |
| Terminal fall speed | 18-25 tiles/s | stay under half a tile per tick | 20 tiles/s, 30 fast-falling |
| Apex hang | half gravity while held and vertical speed under ~40% of launch | 0.4-0.6x | half gravity under 40 of 105 px/s |
| Coyote time | 0.1 s | 0.06-0.15 | 0.1 s |
| Jump buffer | 0.1-0.15 s | 0.05-0.2 | not present in the published file |
| Ground acceleration | reach top speed in 0.05-0.1 s | instant to 0.2 s | 0.09 s |
| Air control | 0.65x ground acceleration | 0.5-1.0 | 0.65x |
| Ceiling corner correction | up to half a tile sideways | 1/4-1/2 tile | 4 px |
| Direction lock after wall jump | 0.15 s | 0.1-0.2 | 0.16 s |

Softness usually comes from a long apex hang, a low terminal velocity, or a long time-to-apex —
not just symmetric gravity. Change one setting at a time and rerun the calculator.

## Patterns

### 1. Core feel (pseudocode)

Count grace windows in whole ticks, at the fixed rate. A floating countdown like `timer -= dt;
if timer > 0` silently loses a tick at some rates (0.1 s at 50 Hz gives 4 ticks, not 5), so the
same build feels different under Unity and under Godot. Tick buffers avoid this and also let
Unity's `Update` record a press for `FixedUpdate` to consume.

```python
# Fixed-tick pseudocode. Y points DOWN. Constants come from jump_tuner.py.
COYOTE_TICKS = round(COYOTE_TIME * TICK_RATE)     # 0.1 s at 60 Hz -> 6
BUFFER_TICKS = round(JUMP_BUFFER * TICK_RATE)     # 0.12 s at 60 Hz -> 7
NEVER = -10**9                                     # initial value of both buffers

tick += 1
if on_floor and velocity.y >= 0:
    last_ground_tick = tick                        # only refreshed on ground, not while rising
if jump_pressed_this_tick:
    last_press_tick = tick

if tick - last_press_tick <= BUFFER_TICKS and tick - last_ground_tick <= COYOTE_TICKS:
    velocity.y = JUMP_VELOCITY                     # negative = upward
    last_press_tick = last_ground_tick = NEVER      # consumes both: no second jump via coyote
    if not jump_held:                               # buffered press already released: short hop
        velocity.y *= JUMP_CUT

if jump_released_this_tick and velocity.y < 0:
    velocity.y *= JUMP_CUT                          # 0.4-0.6; rising only

g = FALL_GRAVITY if velocity.y > 0 else RISE_GRAVITY
if jump_held and abs(velocity.y) < APEX_THRESHOLD:
    g *= APEX_HANG                                  # 0.5
velocity.y = min(velocity.y + g * dt, MAX_FALL_SPEED)
# then move and resolve collisions once; on a ceiling corner, try corner
# correction (see reference), otherwise cancel vy
```

Variable height has three common models. Use the release cut above by default: one line, fixed
minimum hop. For a precise platformer, prefer the Celeste model: hold launch velocity for up to
~0.2 s while pressed, then let gravity act; releasing ends the hold. The third model increases
gravity (2-3x) while rising once the button is released; it gives the softest arc but is the
hardest to reason about. Pick one; mixing two models doubles the effect.

### 2. Engine landmarks (load together with the detected engine skill)

- **Godot 4**: controller in `_physics_process`; `Input.is_action_just_pressed()` reports presses
  per physics tick, so it is reliable there. `is_on_floor()` is valid after `move_and_slide()`.
  Body API, slopes, moving platforms: Godot engine skill.
- **Unity 6**: `Rigidbody2D.linearVelocity` (`velocity` is deprecated). Record the press in
  `Update` (a flag or tick number) and consume it in `FixedUpdate`; polling "pressed this frame"
  directly in `FixedUpdate` can miss or repeat presses. Y points up, flip the signs above.
  One-way platforms: `PlatformEffector2D`.
- **Phaser Arcade**: `body.blocked.down` or `body.onFloor()`, `Phaser.Input.Keyboard.JustDown` in
  `update`; Y points down.

## Verify

1. Run the round-trip test on the CSV log: `jump_tuner.py --log jump.csv` must exit 0 (apex and
   time-to-apex within 5% tolerance).
2. Script the edge cases (press 1 tick before landing, press N and N+1 ticks after leaving a
   platform, tap vs. hold, ceiling corner at 2 px) and report each outcome.
3. Have the user play the real sequence: jump off a platform edge, jump into a low ceiling, chain
   a wall jump; report any difference from the chosen targets.
4. Grep the controller code for a floating-point grace-window countdown (`timer -= delta`):
   replace it with a whole-tick count.

## Pitfalls

- **Jump height changes with framerate** → integration on a variable `dt`. Fix the physics tick
  and design against the simulated apex, or use the half-step integrator (`--integrator half`).
- **Double jump during the coyote window** → coyote wasn't reset when the jump fired, or it keeps
  refreshing while rising on the first tick. Consume both timers on jump and only refresh coyote
  if `velocity.y >= 0`.
- **Buffered jump always at full height** → the release happened before landing, so the release
  edge never reaches the jump that's mid-rise. Check held state when the buffered jump fires.
- **Hitting your head on a ceiling keeps the jump going** → a ceiling impact must cancel upward
  velocity and end the variable-height hold.
- **Player gets launched or doubles speed leaving a moving platform** → platform velocity was
  added twice.
- **Wall jump eats the ground jump or double jump** → resolve a buffered press in the order
  ground/coyote, then wall, then air, with an explicit rule for refreshing the air jump.
- **Snags on tile seams** → per-tile colliders. Merge level collision into larger shapes and use
  a single capsule or rounded box for the player.
- **Falls through thin floors** → terminal velocity exceeds half a tile per tick. Cap the fall or
  enable continuous collision detection (`physics-tuning`).

## References

- [`scripts/jump_tuner.py`](scripts/jump_tuner.py) `--help`: all calculator and log-check
  options.

## Related skills

- **Composes with** (routing table §3d): the detected engine movement skill
  (`godot-2d-movement` / `phaser-arcade-physics` / `unity-physics`) + `level-design` +
  `camera-systems` + `game-feel`.
- **Ownership on overlap** (routing table §3c): coyote time, jump buffer, and variable jump
  height belong to `platformer`; `input-systems` only joins for generic input
  buffering/rebinding, `game-feel` only for juice (landing dust, squash).
- `game-designer`: project-wide balancing and game feel — `platformer` owns jump-specific
  numbers, `game-designer` arbitrates the overall game tone.
- `lead-gameplay-programmer`: broader gameplay code implementation (character states, system
  integration) — `platformer` supplies formulas and pseudocode, not the project's code
  architecture.
- `physics-engineer`: advanced physics (solvers, complex constraints) — `platformer` stays in
  simple character kinematics; hand off as soon as the request leaves the jump controller
  (ragdoll, vehicles, destructibles).

## Version notes

Last checked: 2026-11-17.

- Celeste numbers: `Source/Player/Player.cs` from the `NoelFB/Celeste` repository (MIT):
  `JumpGraceTime` 0.1, `JumpSpeed` -105, `VarJumpTime` 0.2, `Gravity` 900, `HalfGravThreshold` 40,
  `MaxFall` 160, `FastMaxFall` 240, `MaxRun` 90, `RunAccel` 1000, `AirMult` 0.65,
  `UpwardCornerCorrection` 4, `WallJumpForceTime` 0.16, `CeilingVarJumpGrace` 0.05. Height,
  time-to-apex, and tap hop computed from these constants at 60 Hz.
- Jump height/time method: Kyle Pittman, "Math for Game Programmers: Building a Better Jump",
  GDC 2016.
