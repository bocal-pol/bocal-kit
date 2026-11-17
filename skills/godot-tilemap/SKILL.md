---
name: godot-tilemap
description: "Godot 4.7 tilemaps with `TileMapLayer`/`TileSet`: atlas sources, data layers, terrain autotiling, and runtime `set_cell`/`local_to_map`. Auto-invoke for a 2D tile-based level in Godot, tiles with no collision, a click hitting the wrong cell, or porting a deprecated `TileMap`. Not for Unity (`unity-tilemap-2d`), tile art (`create-game-assets`), or generation (`procedural-gen`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot TileMap (4.7 TileMapLayer)

This skill owns tile-based levels via `TileMapLayer` + `TileSet`: per-tile collision and data,
terrain autotiling, and runtime cell editing. Targets **Godot 4.7**, where `TileMapLayer` replaces
the deprecated `TileMap` node (see Version notes).

> Adapted/translated from `godot-tilemap` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- 2D levels on a tile grid, configuring a `TileSet` (collision, navigation, custom data, terrains),
  or reading/writing tiles in code.
- Migrating a `TileMap` node (one node, several layers) to `TileMapLayer` nodes.

**Not this skill**: moving the player over tiles (`godot-2d-movement`); general bodies and
raycasts (`godot-physics`); generation algorithms (`procedural-gen`); level design practice
(`level-design`); 3D grids (`godot-3d-essentials`, GridMap).

## Main workflow

1. **One `TileMapLayer` per layer** (background, walls, foreground), grouped under a `Node2D`. All
   layers share a `TileSet` saved as an external `.tres`.
2. **Build the TileSet.** The TileSet editor is mouse-only; when it can't be driven, generate the
   `.tres` with a headless script and keep that script in the repo.
3. **Add data layers on the TileSet**: physics layers (collision polygons plus their layer/mask
   bits), navigation layers, occlusion, and typed custom data layers (`damage: int`,
   `is_ladder: bool`).
4. **Place tiles from code** with `set_cell`, `set_cells_terrain_connect` or
   `set_cells_terrain_path`. Cells in a `.tscn` are a `tile_map_data` byte array; never edit them by
   hand.
5. **Enable collision/navigation per layer** with `collision_enabled` / `navigation_enabled` on
   each `TileMapLayer`.
6. **Run the checks** below before concluding.

## Patterns

### 1. Generate a `.tres` TileSet in code

```gdscript
# res://tools/make_tileset.gd
# Run: godot --headless --path . --script res://tools/make_tileset.gd
extends SceneTree

func _initialize() -> void:
    var tile_set := TileSet.new()
    tile_set.tile_size = Vector2i(16, 16)
    tile_set.add_physics_layer()
    tile_set.set_physics_layer_collision_layer(0, 1 << 1)   # bit 2 ("walls")
    tile_set.add_custom_data_layer()
    tile_set.set_custom_data_layer_name(0, "damage")
    tile_set.set_custom_data_layer_type(0, TYPE_INT)

    var atlas := TileSetAtlasSource.new()
    atlas.texture = load("res://art/tiles.png")
    atlas.texture_region_size = Vector2i(16, 16)
    tile_set.add_source(atlas, 0)                  # add before creating tiles
    atlas.create_tile(Vector2i(2, 1))              # texture column 2, row 1
    var wall := atlas.get_tile_data(Vector2i(2, 1), 0)
    wall.add_collision_polygon(0)
    wall.set_collision_polygon_points(0, 0, PackedVector2Array([
        Vector2(-8, -8), Vector2(8, -8), Vector2(8, 8), Vector2(-8, 8)]))  # centered on the cell
    wall.set_custom_data("damage", 0)

    var err := ResourceSaver.save(tile_set, "res://tiles/world_tileset.tres")
    print("tileset saved: ", error_string(err))
    quit(0 if err == OK else 1)
```

### 2. Mouse position to a cell, then reading custom data

```gdscript
extends TileMapLayer

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        # event.position is in viewport pixels and ignores Camera2D scroll/zoom.
        var local_event := make_input_local(event) as InputEventMouseButton
        var cell := local_to_map(local_event.position)
        var data := get_cell_tile_data(cell)       # TileData or null
        if data:
            var dmg: int = data.get_custom_data("damage")
            print("Cell %s deals %d damage" % [cell, dmg])
```

### 3. Placing, erasing and autotiling at runtime

```gdscript
func place_wall(cell: Vector2i) -> void:
    set_cell(cell, 0, Vector2i(2, 1))     # source 0, atlas tile column 2, row 1

func dig(cell: Vector2i) -> void:
    erase_cell(cell)                      # equivalent to set_cell(cell, -1)

func fill_with_grass(cells: Array[Vector2i]) -> void:
    set_cells_terrain_connect(cells, 0, 0, true)   # terrain set 0, terrain 0
```

### 4. Headless test: a wall tile has collision and data

```gdscript
# res://tests/test_tiles.gd
extends SceneTree

func _initialize() -> void:
    var layer := TileMapLayer.new()
    layer.tile_set = load("res://tiles/world_tileset.tres")
    root.add_child(layer)
    layer.set_cell(Vector2i(0, 0), 0, Vector2i(2, 1))
    var data := layer.get_cell_tile_data(Vector2i(0, 0))
    var failed := 0
    if data == null:
        failed += 1
        push_error("missing wall tile: wrong source id or atlas coords?")
    elif data.get_collision_polygons_count(0) == 0:
        failed += 1
        push_error("wall tile has no collision polygon on physics layer 0")
    print("Results: %d failed" % failed)
    quit(1 if failed > 0 else 0)
```

## Verify

1. Run `godot-nodes-scenes`'s path checker to catch a TileSet `.tres` whose texture or script has a
   broken path.
2. On a fresh clone, run `godot --headless --path . --import` first so the tile texture gets
   imported, then run the headless test and read the exit code.
3. For a visual check, ask the user to run `godot --path . --debug-collisions` and report whether
   walls show shapes.

## Pitfalls

- **The `TileMap` node has been deprecated since 4.3.** Use one `TileMapLayer` per layer. Old
  calls with a leading `layer` argument (`set_cell(layer, ...)`) don't apply to `TileMapLayer`.
- **`local_to_map` needs layer-local coordinates.** Convert a world position with `to_local(...)`
  first. A mouse event's `position` is in viewport pixels, so it breaks as soon as a `Camera2D`
  scrolls or zooms; use `make_input_local(event)` or `get_local_mouse_position()`.
- **`get_cell_tile_data` returns `null`** for empty cells and non-atlas sources; check before
  calling `get_custom_data`.
- **Custom data is typed and named.** Reading a layer name that doesn't exist errors; define the
  layer on the TileSet first.
- **"Cannot create tile. The tile is outside the texture..."** → the atlas has no texture yet, the
  coordinates fall outside it, or a tile already covers that spot. Set `texture` and
  `texture_region_size` before `create_tile`.
- **Terrains need every combination defined.** `set_cells_terrain_connect` places odd or
  placeholder tiles when the TileSet's neighbor bits are incomplete.
- **Runtime edits are batched at end of frame.** Call `update_internals()` only when immediately
  updated internals are needed to read (expensive in a loop).
- **Collision not working?** Check `collision_enabled` on the layer, that the tile has a polygon on
  a physics layer, and that the physics layer bits match the bodies' masks.

## References

- The official TileMap docs cover atlas sources vs. scene collections, per-tile data layer types,
  terrain set modes and painting, coordinate helpers, Y-sorting, runtime tile data overrides, and
  the TileMap-to-TileMapLayer migration steps.

## Related skills

- `godot-2d-movement` for characters walking on these tiles.
- `godot-physics` for the collision layers/masks these tiles participate in.
- `procedural-gen` for generating the cell layout.
- `create-game-assets` for drawing the tile sheet.
- `level-design` / `roguelike` for design practice and grid-based genres.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- `TileMap` was deprecated in favor of `TileMapLayer` since 4.3.
- `TileMapLayer.tile_map_data` is stored as a `PackedByteArray` in scenes.
