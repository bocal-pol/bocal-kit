---
name: godot-resources
description: "Godot 4.7 data-oriented design with custom Resources: `class_name` and `@export` fields, `.tres` files, shared references vs. `duplicate_deep()`, uids, and threaded loading. Auto-invoke for items, stats or enemy configs as data, or when editing one enemy changes all enemies, or a `.tres` stops loading. Not for save slots (`save-systems`) or the C# version (`godot-csharp`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Resources (4.x)

This skill owns modeling game data as `Resource` objects saved as `.tres`/`.res`, sharing them
without surprises, and loading them without pitfalls. Targets **Godot 4.7** (see Version notes).

> Adapted/translated from `godot-resources` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Items, stats, enemy configs, dialogue lines or level metadata as data files; custom `Resource`
  subclasses; `ResourceLoader`/`ResourceSaver` code.

**Not this skill**: scene structure (`godot-nodes-scenes`); runtime player progression, slots and
migration (`save-systems`); C# (`godot-csharp`).

## Main workflow

1. **Subclass `Resource`** with `class_name` and typed `@export` fields (Pattern 1). The
   `class_name` is what lets the editor offer it in "New Resource" and as an export type.
2. **Create instances as text `.tres` files.** You can write them directly (Pattern 2) instead of
   clicking through the FileSystem panel and Inspector; reserve binary `.res` for large generated
   data.
3. **Reference resources from nodes** with `@export var data: ItemResource` or
   `@export var loot: Array[ItemResource]`, or load by path in code.
4. **Load** with `preload` (constant path) or `load` (variable path); use
   `ResourceLoader.load_threaded_request` for large scenes.
5. **Duplicate before mutating** a shared resource at runtime (Pattern 3); every node that loaded
   the same path holds the same object.
6. **Run the checks** below before concluding.

## Patterns

### 1. A custom data resource

```gdscript
# res://items/item.gd
extends Resource
class_name ItemResource

@export var id: StringName = &""
@export var display_name: String = "Item"
@export_multiline var description: String = ""
@export var icon: Texture2D
@export var max_stack: int = 99
@export var value: int = 0
```

### 2. The same object as a hand-written `.tres`

```ini
[gd_resource type="Resource" script_class="ItemResource" format=3]

[ext_resource type="Script" path="res://items/item.gd" id="1_item"]

[resource]
script = ExtResource("1_item")
id = &"sword"
display_name = "Sword"
max_stack = 1
value = 50
```

Omit `uid=` attributes; Godot adds them the next time it saves the file.

### 3. Duplicate before mutating shared data

```gdscript
func give_unique_copy(template: ItemResource) -> ItemResource:
    # true = deep: copies nested arrays/dictionaries and *embedded* sub-resources,
    # but a sub-resource saved as its own .tres stays shared. Use
    # template.duplicate_deep(Resource.DEEP_DUPLICATE_ALL) to copy those too.
    var copy: ItemResource = template.duplicate(true)
    copy.value += 5                # mutating the copy doesn't touch the original .tres
    return copy
```

### 4. Headless check: the file loads as its class, copies are independent

```gdscript
# res://tests/test_items.gd
extends SceneTree

func _initialize() -> void:
    var failed := 0
    var sword := load("res://items/sword.tres") as ItemResource
    if sword == null:
        failed += 1
        push_error("sword.tres didn't load as ItemResource")
    else:
        var copy: ItemResource = sword.duplicate(true)
        copy.value += 1
        if copy.value == sword.value:
            failed += 1
            push_error("duplicate(true) shares state with the template")
    print("Results: %d failed" % failed)
    quit(1 if failed > 0 else 0)
```

## Verify

1. After adding or moving `.tres`/`.gd` files, run `godot-nodes-scenes`'s path checker to catch
   broken `ext_resource` paths, uids and ids. Fix every `ERROR`.
2. On a fresh clone, run `godot --headless --path . --import` once (so `class_name` types
   resolve), then the headless test, and read the exit code.

## Pitfalls

- **Resources are shared by reference.** Every `load()` of a path returns the same cached object,
  so mutating it changes every user (and re-saving writes the change into the file). Duplicate for
  per-instance state, or set `resource_local_to_scene = true` for a copy per scene instance.
- **A deep copy still changes the original's sub-resource** → `duplicate(true)` only copies
  sub-resources embedded in the file; one saved as its own `.tres` (e.g. a shared `stats.tres`
  inside `goblin.tres`) stays the same object. Use `duplicate_deep(Resource.DEEP_DUPLICATE_ALL)` to
  copy those too.
- **`class_name` is required for editor and typed usage.** Without it, the class is missing from
  "New Resource" and can't be an `@export` type.
- **`class_name` "not declared" only in headless or CI** → the global class cache in `.godot/` is
  missing on a fresh clone. Run `--import` first.
- **`res://` is read-only in exported games.** Write runtime data to `user://`.
  `ResourceSaver.save` to `res://` only works when running from the project folder.
- **Moving a `.gd` or `.tres` outside the editor breaks `ext_resource` paths.** Move the `.uid`
  sidecar with scripts, then rerun the checker.
- **Nodes stored in a Resource don't serialize.** Resources hold data; reference scenes as
  `PackedScene`, not node instances.
- **Cyclic references** (A holds B holds A) can fail to save or load cleanly; keep data graphs
  acyclic or link by id.
- **`preload` vs. `load`.** `preload` needs a constant path and loads with the script; `load`
  takes a runtime path.
- **`.tres` files ship as readable text** in the export; keep secrets out of them.

## References

- The official resources docs cover threaded loading with progress, `resource_local_to_scene`,
  `@tool` resources, a custom `ResourceFormatLoader`/`Saver` for a new file type, uid management,
  and a registry plan for many data files.

## Related skills

- `godot-gdscript` for the `@export` annotations that define resource fields.
- `godot-nodes-scenes` for instancing scenes vs. sharing resource data.
- `save-systems` for persisting runtime progression (separate from static data).
- `godot-gdscript-headless-testing` to keep data tests in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- `Resource.duplicate_deep()` and `DEEP_DUPLICATE_ALL` exist since 4.5.
- `.uid` sidecars for scripts and shaders exist since 4.4; commit them.
- The text format writes `script_class` in the `[gd_resource]` header; since 4.6 it no longer
  writes or reads `load_steps`, so older files carrying it still load.
