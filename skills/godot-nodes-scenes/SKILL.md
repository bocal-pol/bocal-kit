---
name: godot-nodes-scenes
description: "Godot 4.7 scene tree: reusable `.tscn` scenes, `instantiate()`, autoloads, and checking for broken `res://` paths and uids. Auto-invoke for spawning bullets or enemies, or on \"Node not found\", \"previously freed instance\", or a project broken after moving files, even if the user just says the project is broken. Not for GDScript syntax (`godot-gdscript`) or signals (`godot-signals-groups`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Godot Nodes & Scenes (4.x)

This skill owns composing games from small scenes, instancing them at runtime, and accessing nodes
without crashing on a freed or missing reference. Targets **Godot 4.7** (see Version notes).

> Adapted/translated from `godot-nodes-scenes` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Structure `.tscn` scenes, instance a `PackedScene` (bullets, enemies, UI), or set up autoload
  singletons.
- Debug `get_node()` / `$Path` returning `null`, "Attempt to call on a previously freed instance",
  or references broken by a moved/renamed file.

**Not this skill**: GDScript language/syntax (`godot-gdscript`); decoupling via signals
(`godot-signals-groups`); physics bodies and collisions (`godot-physics`).

## Main workflow

1. **Read the project first.** `project.godot` carries the main scene
   (`application/run/main_scene`) and the `[autoload]` list; `.tscn` files are text, so read the
   node tree there before proposing a new structure.
2. **Model by composition.** Small single-purpose scenes (Player, Bullet, Enemy) with a script on
   the root and `@export` config, composed into larger scenes. Prefer child nodes over deep
   inheritance.
3. **Instance at runtime** with `preload`/`load` → `instantiate()` → `add_child()`. Set the state
   `_ready()` needs before adding, and convert world positions into the future parent's local
   space.
4. **Access nodes safely.** `@onready var x = $Path` for fixed children, `%Name` for deep nodes in
   the same scene, `get_node_or_null()` for optional ones. Mark a unique name in the `.tscn` with
   `unique_name_in_owner = true` under that `[node ...]` line.
5. **Register autoloads in `project.godot`** for cross-scene services (game state, audio, scene
   switching).
6. **Free with `queue_free()`** and guard later access behind `is_instance_valid()`.
7. **Verify before concluding.** After creating, moving or renaming scenes, resources or scripts,
   run a path-checking script for `res://` paths, `ExtResource`/`SubResource` ids, and malformed
   `parent=` paths. Fix every `ERROR` and rerun until exit 0.

## Patterns

### 1. Instance a scene at runtime

```gdscript
extends Node2D

const BULLET := preload("res://bullet.tscn")   # preload: loaded at compile time

func shoot(at: Vector2, dir: Vector2) -> void:
    var bullet := BULLET.instantiate()         # creates a scene instance
    # at is in world space; this Node2D will be the parent (same canvas, not top-level).
    bullet.position = to_local(at)             # correct even with a transformed spawner
    bullet.direction = dir                      # exported/public state
    add_child(bullet)                           # _ready() already sees this state
```

### 2. Safe access: $, get_node_or_null, unique names

```gdscript
@onready var label: Label = $UI/Label            # $ is sugar for get_node("UI/Label")
@onready var health_bar: ProgressBar = %HealthBar # independent of its path in this scene

func update() -> void:
    var optional := get_node_or_null("Maybe/Missing")  # returns null instead of an error
    if optional:
        optional.queue_free()
```

### 3. An autoload singleton (global game state)

```gdscript
# res://autoload/game_state.gd, registered under [autoload] as GameState.
extends Node

signal score_changed(value: int)
var score := 0

func add_score(points: int) -> void:
    score += points
    score_changed.emit(score)         # any scene can: GameState.score_changed.connect(...)
```

### 4. Change the current scene

```gdscript
func go_to_level_2() -> void:
    get_tree().change_scene_to_file("res://levels/level_2.tscn")   # deferred, see Pitfalls
```

## Verify

1. Run the path-checking script after any file move/rename; fix every `ERROR` (missing or
   wrong-case `res://` path, undeclared `ExtResource`/`SubResource` id, invalid `parent=`, missing
   main scene or autoload).
2. If a Godot binary is available, briefly run the modified scene and treat any error line as a
   failure: `godot --headless --path . --import` on a fresh clone, then
   `godot --headless --path . --fixed-fps 60 --quit-after 300 --scene res://main.tscn > run.log 2>&1`,
   and `grep -nE "^ *(SCRIPT ERROR|ERROR):" run.log` (no output = success).
3. Without a Godot binary, ask the user to run these lines and paste `run.log`.

## Pitfalls

- **`$Path` / `get_node()` returns `null` or an error** when the path is wrong or the node isn't in
  the tree yet. Use `@onready`, check the path against the `.tscn` (`parent=` attributes spell it
  out), or `get_node_or_null()` for optional nodes.
- **Moving a node breaks `$Path`.** `%Name` survives moves within the same scene/owner, but
  renaming the node still breaks `%Name` references.
- **`free()` mid-frame can crash** code that still uses the node. Prefer `queue_free()` (end of
  frame) and check `is_instance_valid(node)`.
- **`add_child()` can run the child's `_ready()` before returning.** Supply initial state first,
  without touching its `@onready` variables. A `global_position` assignment with no parent acts as
  a local position; use the future parent's `to_local()` for world-space input.
- **Autoload order matters**: each autoload is instanced first, then all are added to the root in
  list order, before the main scene. In an autoload's `_ready()`, the main scene doesn't exist yet,
  and an autoload listed later exists as a global but isn't in the tree yet.
- **`instance()` was renamed** `instantiate()` in Godot 4. `preload` needs a constant path; `load`
  takes a variable path.
- **`change_scene_to_file()` is deferred, and the old scene leaves the tree immediately.** The
  outgoing scene is removed right away (`get_tree()` returns `null`), then freed at end of frame
  while the new one is added. Act on the new scene from its own `_ready()`, or from an autoload
  with `await get_tree().scene_changed`.
- **Files moved outside the editor break references.** Move the `.uid` sidecar (scripts, shaders)
  and the `.import` file along with their source, then rerun the checker.

## References

- Read the official docs on singletons (Autoload) and building a scene in code (`owner`) for scene
  inheritance, choosing between groups, unique names and autoloads, and deferring tree changes
  during physics callbacks.

## Related skills

- `godot-gdscript` for the language, lifecycle and `@onready`.
- `godot-signals-groups` for decoupling instanced scenes from their spawner.
- `godot-resources` for sharing data between instances without duplicating it.
- `godot-gdscript-headless-testing` for turning the smoke run into a CI test.
- `save-systems` for persisting scene/game state between launches.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- `SceneTree.scene_changed` exists since 4.5; `change_scene_to_node()` since 4.6.
- `.uid` sidecars for scripts and shaders exist since 4.4.
