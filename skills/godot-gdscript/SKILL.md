---
name: godot-gdscript
description: "GDScript 2.0 for Godot 4.7: static typing, `@export`/`@onready`, `await`/coroutines, and porting 3.x code. Auto-invoke on a `.gd` parse error (\"Cannot infer the type\"), a coroutine that never resumes, a null `@onready` variable, or breakage after a version migration. Not for signals (`godot-signals-groups`), scenes (`godot-nodes-scenes`), C# (`godot-csharp`), or CI tests (`godot-gdscript-headless-testing`)."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Godot GDScript (4.x)

This skill owns writing typed GDScript that parses on the project's version and behaves as the
engine schedules it, plus proof that each script compiles. Targets **Godot 4.7**; read
`config/features` in `project.godot` and keep an older project on its own version.

> Adapted/translated from `godot-gdscript` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Write or fix a `.gd` script: parse errors, typing, `@export`/`@onready`, lifecycle callback
  order.
- A coroutine (`await`) that never resumes, or code after `await` that never runs.
- Port Godot 3.x code (`export`, `onready`, `setget`, `yield`) to 4.x syntax.

**Not this skill**: signals and groups (`godot-signals-groups`), scene structure and autoloads
(`godot-nodes-scenes`), C#/.NET (`godot-csharp`), test runners and CI
(`godot-gdscript-headless-testing`).

## Main workflow

1. **Align the version and project settings.** Check `config/features` and any
   `debug/gdscript/warnings/*` entry in `project.godot`: a warning set to Error (2) fails parsing,
   and `inference_on_variant` is an error by default.
2. **Type by default.** Annotate members, parameters and return values; reserve `:=` for cases
   where the right-hand side already has a static type (see Pitfalls). Typed code catches errors at
   parse time and runs faster.
3. **Put code in the right callback.** `_init()`: no tree, no children. `_ready()`: after children,
   only the first time the node enters the tree (`request_ready()` re-arms it).
   `_physics_process()`: movement and physics. `_process()`: visuals and UI.
4. **Write coroutines defensively.** Anything after an `await` may run frames later, or never.
5. **Run the checks** below before concluding.

## Patterns

### 1. A typed node script

```gdscript
class_name Spinner
extends Node2D

@export var speed_deg: float = 90.0
@export_range(0.0, 10.0, 0.5) var wobble := 2.0
@onready var sprite: Sprite2D = $Sprite2D   # resolved just before _ready()

func _ready() -> void:
    sprite.modulate = Color.AQUA

func _process(delta: float) -> void:
    rotation_degrees += speed_deg * delta
```

### 2. Typing values that come back as Variant

```gdscript
var scores: Dictionary[String, int] = {}      # typed dictionary, since 4.4

func best(name: String) -> int:
    var s: int = scores.get(name, 0)          # get() returns Variant: annotate, not :=
    return s

func label_text() -> String:
    var label := get_node_or_null("UI/Score") as Label   # returns Node: cast to type it
    return label.text if label else ""
```

### 3. A coroutine that survives its node being freed

```gdscript
func flash() -> void:
    modulate = Color.RED
    await get_tree().create_timer(0.2).timeout
    if not is_inside_tree():
        return          # removed during the wait (a freed node doesn't even reach here)
    modulate = Color.WHITE
```

## Verify

1. On a fresh clone, import first: `godot --headless --path <project> --import`.
2. Run a compile script that loads every `.gd` with autoloads and `class_name` registered; a
   nonzero output should list every `BROKEN` file with its parse error and line. Fix the first
   error in a file first.
3. Briefly run the main scene and read the log, since Godot exits 0 even after runtime errors:
   `godot --headless --path <project> --quit-after 300 > run.log 2>&1`, then
   `grep -nE "SCRIPT ERROR|^ERROR:" run.log`.
4. For behavior, write a test with `godot-gdscript-headless-testing`.

## Pitfalls

- **`Cannot infer the type of "x"...`** → `:=` received a Variant: an untyped function's return
  value, an untyped `Dictionary`/`Array` subscript, or a member of a value typed as its base class
  (`get_node("X").position`, since `get_node()` returns `Node`). Write the type explicitly
  (`var p: Vector2 = ...`) or cast with `as`.
- **`The variable type is being inferred from a Variant value`** → `max()`, `min()`, `clamp()` and
  `abs()` return Variant, and this warning is an error by default. Use `maxi`, `maxf`, `clampf`,
  `absf` and friends.
- **Code after `await` that never runs, with no error** → the object that emits the signal was
  freed first (a `Timer`, an enemy), or the awaiting node itself was freed. The coroutine is
  silently abandoned. Await `SceneTreeTimer`s for delays and check validity on wake (Pattern 3).
- **`Identifier "X" not declared in the current scope` on a fresh clone or in CI** → the
  `class_name` cache in `.godot/` doesn't exist yet. Run `--import` once.
- **`--check-only` reports `Identifier not found: SomeAutoload`** → `--check-only` parses a single
  file without registering autoloads. Use a full compile script.
- **`Not all code paths return a value` after upgrading to 4.7** → an override now inherits the
  parent method's return type even without declaring it. Return on every path.
- **A setter stopped running after upgrading to 4.7** → assigning a packed array element through a
  property (`points[0] = v`) no longer calls that property's setter. Reassign the whole array.
- **Null `@onready` variable** → incorrect node path, or code running before `_ready()` (from
  `_init()` or a setter during scene load). Use `%UniqueName` for deep nodes.
- **`5 / 2 == 2`** → integer division truncates; write `5 / 2.0` or `float(a) / b`.
- **3.x scripts don't parse** → `export`, `onready`, `tool` and `yield(obj, "sig")` became
  `@export`, `@onready`, `@tool` and `await obj.sig`; `setget` became `set`/`get` blocks.

## References

- The official docs on GDScript static typing and the warning system cover every `@export_*`
  variant, other annotations (`@tool`, `@icon`, `@rpc`, `@warning_ignore`), typed collections, and
  the full lifecycle order.

## Related skills

- `godot-signals-groups`: signals, Callables and groups.
- `godot-nodes-scenes`: scene trees, instancing, autoloads and node paths.
- `godot-resources`: custom `Resource` classes with `class_name`.
- `godot-gdscript-headless-testing`: test runners and CI.
- `godot-csharp`: the same engine via C#.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- Typed dictionaries exist since 4.4; `@abstract` classes and methods since 4.5.
- Behavior changes in 4.7: overrides inherit their return type, and packed array element writes no
  longer call the property setter.
