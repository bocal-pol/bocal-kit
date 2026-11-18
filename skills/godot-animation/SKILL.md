---
name: godot-animation
description: "Godot 4.7 animation API: `AnimationPlayer`, `AnimationTree` state machines, `AnimatedSprite2D` and `create_tween()` Tweens, with a headless state test. Auto-invoke when `travel()` does nothing, an animation doesn't play, a tween snaps backward, or the log says \"Animation not found\". Not for easing choice (`game-feel`), sprite art (`create-game-assets`), or Unity (`unity-animation`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Animation (4.x)

This skill owns driving clips, blends and tweens the way Godot expects, plus proof of names and
states via a headless test. Targets **Godot 4.7**; check `config/features` in `project.godot`
first.

> Adapted/translated from `godot-animation` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Wire up clips, animation state machines, animated sprites or code-driven tweens.
- Debug `travel()` doing nothing, an animation not playing, a tween snapping back abruptly, or
  "Animation not found".

**Not this skill**: easing choice and juice timing (`game-feel`); sprite art
(`create-game-assets`); Unity (`unity-animation`).

## Main workflow

1. **Pick one owner per property.** `AnimationPlayer` stores keyframed clips. An active
   `AnimationTree` plays those clips and owns their tracks, so code talks to the tree. `Tween` is
   for short code-driven motion (UI pop, fades, one-off movement).
2. **Characters:** clips in an `AnimationPlayer`, then an `AnimationTree` with `anim_player`
   pointing at it, `active = true`, and an `AnimationNodeStateMachine` or blend space as
   `tree_root`. Sprite-only leaves: `AnimatedSprite2D` + `SpriteFrames`, or a `frame` key in a
   clip.
3. **Drive from gameplay state**, not input: pick the state from velocity and floor checks each
   physics tick and call `travel()`; set blend positions via `parameters/` paths.
4. **Events:** `animation_finished` for non-looping clips, Call Method tracks for frame-accurate
   hits and footstep sounds.
5. **Run the checks** below before concluding.

## Patterns

### 1. Play a clip and continue on finish

```gdscript
@onready var anim: AnimationPlayer = $AnimationPlayer

func attack() -> void:
    anim.play("attack")                 # must not loop, or the signal never arrives
    await anim.animation_finished
    anim.play("idle")
```

### 2. State machine: traveling between states

```gdscript
@onready var tree: AnimationTree = $AnimationTree
@onready var playback: AnimationNodeStateMachinePlayback = tree.get("parameters/playback")

func _physics_process(_delta: float) -> void:
    var moving := velocity.length() > 5.0
    playback.travel(&"run" if moving else &"idle")   # follows the shortest path of enabled transitions
```

`travel()` takes the shortest path of enabled transitions; `start(&"state")` jumps there directly.
Calling `travel()` every tick with the state already active doesn't restart it.

### 3. Blend space: blending run direction via a 2D parameter

```gdscript
# tree.tree_root is an AnimationNodeBlendSpace2D with idle/run points placed in it.
func update_locomotion(input_dir: Vector2) -> void:
    tree.set("parameters/blend_position", input_dir)
```

### 4. Tween: popping in a UI element

```gdscript
func pop_in(node: Control) -> void:
    node.pivot_offset = node.size / 2                 # scale from the center
    node.scale = Vector2.ZERO
    node.modulate.a = 0.0
    var tw := create_tween().set_parallel(true)
    tw.tween_property(node, "scale", Vector2.ONE, 0.2) \
        .set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
    tw.tween_property(node, "modulate:a", 1.0, 0.2)   # sub-property via ":"
```

## Verify

1. If `godot-nodes-scenes` is installed, run its path checker after editing `.tscn` files.
2. Run the scene headless and read the log, since Godot exits 0 even after these errors:
   `godot --headless --path <project> --quit-after 300 res://player.tscn > run.log 2>&1`, then
   `grep -nE "SCRIPT ERROR|^ERROR:" run.log`.
3. Copy a headless state test, list the clip and state names the code uses, and run it. Exit 0
   means every clip exists, the tree is active and wired, and every state is reachable.
4. Timing and feel need human eyes: ask the user to play the scene.

## Pitfalls

- **Nothing animates and `travel()` does nothing** → `AnimationTree.active` is false, or
  `anim_player` is empty or points at the wrong node.
- **`await anim.animation_finished` never returns** → the clip loops; looping clips don't emit
  this signal. Await a non-looping clip, or use a Call Method key at the end of the loop.
- **`play("run")` doesn't restart the clip** → playing an already-running clip continues from the
  current position. Call `stop()` first or `seek(0.0, true)` to restart.
- **The tree and code fight each other** → while an `AnimationTree` is active,
  `AnimationPlayer.play()` on the same clips gets overridden. Change state via the tree.
- **Wrong parameter path** → root parameters start with `parameters/` (`parameters/playback`,
  `parameters/blend_position`); a named child adds its name
  (`parameters/Move/blend_position`).
- **`Tween (bound to ...): started with no Tweeners`** → `create_tween()` was called and nothing
  was added that frame, often in a branch that returns early. Create the tween right before adding
  steps.
- **`Infinite loop detected` and the tween dies** → `set_loops()` (0 = infinite) on a tween whose
  steps take no time, like only `tween_callback()`. Add a `tween_interval()`.
- **A tween stalls** → `node.create_tween()` pauses while that node is outside the tree and dies
  when it's freed; `get_tree().create_tween()` isn't bound. Create a new tween for each animation
  and `kill()` the old one.
- **A scale or rotation tween on a `Container` child snaps back** → containers reset children's
  transforms. Since 4.7, set `offset_transform_enabled = true` and tween
  `offset_transform_scale`/`_rotation`/`_position`, which are visual-only.
- **A `modulate` tweener overwrites other channels** → tween `"modulate:a"` instead.
- **3.x code** → there's no `Tween` node or `yield`; use `create_tween()` and
  `await anim.animation_finished`.

## References

- The official docs on `AnimationTree` and `Tween` cover transitions and advance conditions, root
  motion, one-shot and blend-tree nodes, Call Method tracks, `SpriteFrames`, and the full Tween
  API including 4.7's `tween_await()`.

## Related skills

- `godot-2d-movement`: the velocity and floor state that pick animations.
- `game-feel`: which easing, squash and stretch, and timing to use.
- `godot-ui-control`: the UI these tweens animate.
- `godot-3d-essentials`: 3D character scenes driven by AnimationTree.
- `godot-gdscript-headless-testing`: running the animation test in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- New in 4.7: `Tween.tween_await()` with `AwaitTweener.set_timeout()`, and Control's
  `offset_transform_*` properties.
