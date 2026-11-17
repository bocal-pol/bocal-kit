---
name: game-feel
description: "Adds engine-agnostic juice to a mechanic that already works: trauma-based screen shake, hit-stop, eased tweens, squash and stretch, and knockback. Auto-invoke when the game feels flat, weightless, or unsatisfying, or hits and jumps should feel satisfying. Not for coyote time (`platformer`), input buffering (`input-systems`), camera follow (`camera-systems`), or HUD layout (`game-ui-ux`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Game feel (juice)

Feedback sells an action: several small, brief, exaggerated responses triggered together on the
same event. This skill adds that layer on top of a mechanic that already works. It never changes
the simulation: shake moves the camera and hit-stop scales time; neither moves bodies or blocks
gameplay logic.

> Adapted and translated from the `game-feel` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- A hit, jump, landing, dash, pickup, death, or button press works but feels weak.
- Adding or tuning shake, hit-stop, easing, squash and stretch, flash, knockback, number popups.
- Deciding how much juice is enough, and adding shake/flash reduction options.

**Not this skill**: jump controller math (`platformer`), generic input buffering and rebinding
(`input-systems`), camera follow, deadzones, and lookahead (`camera-systems`, which exposes the
offset this skill writes), mixing and ducking (`audio-design`), shader dissolves
(`shader-programming`), engine tween-node and particle APIs (`godot-animation`,
`unity-animation`).

## Workflow

1. **Find the hooks.** Juice attaches to discrete events (`hit`, `landed`, `picked_up`, `died`).
   If the mechanic doesn't emit any, add signals or C# events first; never poll.
2. **Assign each event a tier** (table below), then trigger that tier's package from a single
   `feedback(tier, pos)` call so the whole game stays proportional.
3. **Start with 2-3 channels per event** (sound, particles, shake), play it, and add channels
   until the event reads clearly. Hit-stop and shake are the strongest and the most abused; save
   them for impacts.
4. **Ease everything that moves.** Overshoot (`back`) for pops, ease-out to settle, ease-in only
   for anticipation.
5. **Decide what runs during hit-stop.** The time scale slows timers, tweens, and the delta of
   `_process`/`Update`. Shake decay and UI tweens should generally use real time; the frozen pose
   should not.
6. **Ship accessibility toggles**: shake strength 0-100%, flash reduction, camera motion
   reduction.
7. **Verify with a headless check, then by eye.** Trigger the event twice 30 ms apart and check
   that the time scale returns to 1.0 after the longer freeze, that trauma reaches 0 within
   `1 / decay` seconds, and that every scale tween ends exactly at its rest value. Then ask the
   user to play and report whether the hit reads clearly, whether anything feels nauseating, and
   whether input is still registered during the freeze.

## Tiers

| Tier | Trauma | Hit-stop | Particles | Extra | Example events |
|------|:------:|:--------:|:---------:|-------|-----------------|
| small | 0.10-0.20 | none | 0-4 | light SFX | footstep, coin, UI hover |
| medium | 0.30-0.50 | 0.04-0.06 s | 6-12 | flash | normal hit, landing, pickup |
| large | 0.70-1.00 | 0.10-0.15 s | 20-40 | flash, zoom, number | critical, boss hit, death, explosion |

## Patterns

### 1. Screen shake from decaying trauma

```gdscript
# Godot 4.7 Camera2D script. Shake = trauma^2, so light hits barely move and heavy hits hit
# hard. Writes the camera OFFSET only (visual only). Uses real time so shake keeps decaying
# during hit-stop rather than freezing off-center. Camera2D.ignore_rotation defaults to true;
# set it to false or roll does nothing.
extends Camera2D
@export var decay := 1.2          # trauma lost per real second
@export var max_offset := Vector2(12, 8)
@export var max_roll := 0.1       # radians
@export var strength := 1.0       # player setting, 0..1
var trauma := 0.0
var _t := 0.0

func add_trauma(amount: float) -> void:
    trauma = clampf(trauma + amount, 0.0, 1.0)   # hits add; they don't reset

func _process(dt: float) -> void:
    if trauma <= 0.0:
        return
    var real_dt := dt / maxf(Engine.time_scale, 0.0001)
    trauma = maxf(trauma - decay * real_dt, 0.0)
    var shake := trauma * trauma * strength
    _t += real_dt * 30.0
    # Sine waves summed at unrelated rates: smooth, never a per-frame random buzz.
    offset = Vector2(max_offset.x * shake * sin(_t * 1.7), max_offset.y * shake * sin(_t * 2.3))
    rotation = max_roll * shake * sin(_t * 1.1)
    if trauma == 0.0:
        offset = Vector2.ZERO
        rotation = 0.0
```

Unity: drive `AmplitudeGain`/`FrequencyGain` on `CinemachineBasicMultiChannelPerlin` from
`trauma * trauma`, decaying with `Time.unscaledDeltaTime`; for one-off hits use a
`CinemachineImpulseSource` on the attacker and a `CinemachineImpulseListener` on the camera.

### 2. Hit-stop that survives overlapping hits

```gdscript
# Godot 4.7. Slow time down, restore after a delay in REAL TIME; only the latest call restores.
var _hit_stop_id := 0

func hit_stop(duration := 0.08, slow := 0.05) -> void:
    _hit_stop_id += 1
    var my_id := _hit_stop_id
    Engine.time_scale = slow
    # 4th argument ignore_time_scale=true: the timer still fires during the slowdown.
    await get_tree().create_timer(duration, true, false, true).timeout
    if my_id == _hit_stop_id:       # the most recent hit-stop owns the restore
        Engine.time_scale = 1.0
```

```csharp
// Unity. WaitForSecondsRealtime ignores Time.timeScale; WaitForSeconds never finishes at 0.
int _hitStopId;
IEnumerator HitStop(float duration = 0.08f, float slow = 0.05f) {
    int myId = ++_hitStopId;
    Time.timeScale = slow;
    yield return new WaitForSecondsRealtime(duration);
    if (myId == _hitStopId) Time.timeScale = 1f;
}
```

### 3. Squash, stretch, and overshoot

```gdscript
# Godot 4.7. Keep area roughly constant: stretch one axis, squash the other, spring back.
func pop(node: Node2D) -> void:
    node.scale = Vector2(1.3, 0.7)
    var tw := node.create_tween()
    tw.tween_property(node, "scale", Vector2.ONE, 0.18) \
      .set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)   # overshoots 1, then settles
```

Kill or reuse the previous tween on the same property (`if _tw: _tw.kill()`) when the event can
re-trigger, otherwise two tweens fight and the node ends up at the wrong scale.

## Pitfalls

- **Shaking the body instead of the camera** desyncs collision and aim. Shake the camera offset
  or a visual-only pivot instead.
- **Random offset every frame** buzzes like static. Use noise or summed sine waves under a
  decaying trauma value.
- **Hit-stop never ends**: Unity's `WaitForSeconds` or a Godot timer without `ignore_time_scale`
  doesn't advance at time scale 0, and barely advances at 0.05. Wait in real time.
- **Overlapping hit-stops** (two hits 30 ms apart) let the first timer restore time during the
  second freeze. Only the latest call restores.
- **Shake freezes off-center during hit-stop** when it decays with the scaled delta. Decay with
  real time (Godot `dt / Engine.time_scale`, Unity `Time.unscaledDeltaTime`).
- **UI and menu tweens crawl during hit-stop.** Godot `Tween.set_ignore_time_scale(true)`; Unity
  coroutines with `Time.unscaledDeltaTime`.
- **Time scale doesn't slow audio** under Godot or Unity, so a long freeze plays the impact sound
  over a frozen frame. Keep freezes short or also lower `AudioServer.playback_speed_scale`.
- **Hit-stop on every frame of a held or multi-hit attack** locks up the game. One per impact, and
  skip it on hits that land during an active freeze.
- **Juice that never settles** (scale drift, shake that never decays) stops reading as feedback.
  Return to rest value at the end of every effect.
- **Over-juicing routine actions** causes nausea and masks real impacts. Footsteps get the small
  tier or nothing.
- **Feedback that blocks input.** Long freezes and non-cancelable animations feel like lag; keep
  freezes under about 0.15 s and buffer input through them.
- **Flash beyond the photosensitivity threshold.** Large bright flashes should stay at three per
  second or fewer (WCAG 2.3.1), and a flash-reduction option should replace them with a tint.

## References

- [`references/feedback-recipes.md`](references/feedback-recipes.md): read for the easing cheat
  sheet, an eased pop for Unity without a tween package, flash/knockback/number
  popup/particle recipes, or the per-engine binding summary (Godot, Unity, Phaser).

## Related skills

- `camera-systems`: owns follow and framing; this skill only writes the shake offset.
- `godot-animation`, `unity-animation`: tween, AnimationPlayer, and particle APIs.
- `audio-design`: the sound layer of each feedback package.
- `physics-tuning`: knockback forces and stable timestep.
- `platformer`: the jump feel controls this juice layers on top of.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `SceneTree.create_timer(time_sec, process_always, process_in_physics,
  ignore_time_scale)`, `Tween.set_ignore_time_scale()`, `Camera2D.ignore_rotation` (default
  `true`); `Engine.time_scale` scales the `_process`/`_physics_process` delta, `Timer`, and
  `SceneTreeTimer` but not audio.
- Unity 6.3 LTS with Cinemachine 3.1: `CinemachineBasicMultiChannelPerlin`,
  `CinemachineImpulseSource`, `CinemachineImpulseListener`.
- WCAG 2.2 success criterion 2.3.1, three flashes or below the threshold.
- Trauma-based shake follows Squirrel Eiserloh's GDC 2016 talk "Math for Game Programmers:
  Juicing Your Cameras With Math".
