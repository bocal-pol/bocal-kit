---
name: unity-tilemap-2d
description: "Unity 6.3 LTS 2D tilemaps: Tile Palette, Tilemap Collider 2D with Composite Collider, Rule Tiles, and runtime `SetTile`. Auto-invoke to paint or generate a tile level, seams between tile colliders, a missing RuleTile, or hex/isometric grids. Not for level design (`level-design`), generation (`procedural-gen`), movement (`unity-physics`), or Godot (`godot-tilemap`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unity 2D Tilemap

Create and script 2D tile levels in Unity 6.3 LTS (6000.3) with `Grid` and `Tilemap`, merged
colliders, and runtime painting, and verify the result by reading the map back.

> **Package note:** `Grid`, `Tilemap`, `Tile`, and `TilemapCollider2D` are built in. The Tile
> Palette window and the default brush come from the 2D Tilemap Editor package
> (`com.unity.2d.tilemap`, included in the 2D templates). Rule Tiles, Animated Tiles, and the
> extra brushes (Random, Line, GameObject, Group) are in **2D Tilemap Extras**
> (`com.unity.2d.tilemap.extras`, 6.0.x line for Unity 6.3).

> Adapted/translated from the skill `unity-tilemap-2d` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Laying out a 2D tile level, a `Grid` with `Tilemap` children, collision for the map,
  auto-tiling with Rule Tiles, generating or editing tiles from script.
- Scenes contain a `Grid` with `Tilemap` children, or tile and palette `.asset` files exist.

**Not this skill**: layout and pacing → `level-design`; noise, rooms, and dungeon generation
that produce the tile data → `procedural-gen`; the character walking on the tiles →
`unity-physics`; 3D grids have no dedicated skill here. If the official Unity skill
`create-tile-palette-or-rule-tiles` is installed with a connected Editor, use it to build
palettes and Rule Tile assets; this skill stays the owner of runtime code and colliders.

## Main workflow

1. **Check packages before writing.** Before writing `RuleTile` or `AnimatedTile` code, confirm
   `com.unity.2d.tilemap.extras` is in `Packages/packages-lock.json`; ask before adding it.
2. **Set up the grid.** A `Grid` with one `Tilemap` (plus `TilemapRenderer`) per layer:
   background, ground, foreground. The `Grid`'s Cell Layout is Rectangle, Hexagon, Isometric,
   or Isometric Z As Y. Give each `TilemapRenderer` an explicit Sorting Layer and Order.
3. **Make the tiles.** Designers drag a sliced sprite sheet into the Tile Palette. From code,
   an editor script can create `Tile` assets from the sheet's sprites (pattern 3).
4. **Add collision to the solid layer.** `TilemapCollider2D`, plus a `CompositeCollider2D`
   (which adds a `Rigidbody2D`: set it to `Static`), and set the tilemap collider's Composite
   Operation to Merge. A merged shape is cheaper and has no seam.
5. **Edit at runtime in cell coordinates** (`Vector3Int`): `WorldToCell`, `SetTile`, `GetTile`,
   `SetTilesBlock`, then `RefreshTile` for only the edited cells.
6. **Verify** with the checks below.

## Patterns

### 1. Paint and query at runtime

```csharp
using UnityEngine;
using UnityEngine.Tilemaps;

public class TilePainter : MonoBehaviour
{
    [SerializeField] private Tilemap tilemap;
    [SerializeField] private TileBase groundTile;

    public void PaintAt(Vector3 worldPos) => tilemap.SetTile(tilemap.WorldToCell(worldPos), groundTile);

    public bool IsSolid(Vector3 worldPos) => tilemap.HasTile(tilemap.WorldToCell(worldPos));
}
```

### 2. Fill a region in a single call

```csharp
// SetTilesBlock writes a whole BoundsInt at once: use for generated rooms and floors.
public static void FillFloor(Tilemap map, TileBase tile, int width, int height)
{
    var bounds = new BoundsInt(0, 0, 0, width, height, 1);
    var tiles = new TileBase[width * height];
    for (int i = 0; i < tiles.Length; i++) tiles[i] = tile;
    map.SetTilesBlock(bounds, tiles);
}
```

`SetTile(cell, null)` clears a cell. `RefreshTile(cell)` re-evaluates that cell and its rule
neighbors; `RefreshAllTiles()` re-evaluates the whole map, kept for full regenerations.

### 3. Create Tile assets from a sliced sheet (editor code)

Put this in an `Editor` folder; run it from the menu, via
`unity command script eval --code 'TileAssets.FromSheet("Assets/Art/terrain.png", "Assets/Tiles");'`,
or with `-executeMethod` from a parameterless wrapper.

```csharp
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Tilemaps;

public static class TileAssets
{
    public static void FromSheet(string sheetPath, string outFolder)
    {
        if (!AssetDatabase.IsValidFolder(outFolder))   // e.g. "Assets/Tiles"; the parent must exist
        {
            int slash = outFolder.LastIndexOf('/');
            AssetDatabase.CreateFolder(outFolder.Substring(0, slash), outFolder.Substring(slash + 1));
        }

        foreach (Sprite sprite in AssetDatabase.LoadAllAssetsAtPath(sheetPath).OfType<Sprite>())
        {
            var tile = ScriptableObject.CreateInstance<Tile>();
            tile.sprite = sprite;
            AssetDatabase.CreateAsset(tile, $"{outFolder}/{sprite.name}.asset");
        }
        AssetDatabase.SaveAssets();
    }
}
```

The sheet must already be imported as Sprite (Multiple) and sliced; the slices are the sprite
sub-assets.

## Verify

1. **Without an Editor:** the scene YAML carries the map. A `Tilemap:` document lists painted
   cells under `m_Tiles:` (`- first: {x: 0, y: 8, z: 0}`), and a `TilemapCollider2D` in merge
   mode has `m_CompositeOperation: 1`. Grep these values to confirm the layer has tiles and the
   collider merges.
2. **Unity CLI with a ready Editor:**

   ```bash
   unity command script eval --code 'var t = GameObject.Find("Ground").GetComponent<UnityEngine.Tilemaps.Tilemap>(); t.CompressBounds(); return t.GetUsedTilesCount() + " tiles, bounds " + t.cellBounds;'
   unity command script eval --code 'var c = GameObject.Find("Ground").GetComponent<CompositeCollider2D>(); return "paths=" + c.pathCount;'
   ```

   A merged layer of one connected area should report a handful of paths, not one per tile.
   For Rule Tiles, paint a small block in a throwaway tilemap and read `GetSprite(cell)` for
   corner, edge, and center cells.
3. **Without the CLI:** a PlayMode or EditMode test can build a `Grid` and `Tilemap` in code,
   call `SetTilesBlock`, and check `GetUsedTilesCount()` and `GetSprite` results (setup in
   `unity-csharp-scripting`).
4. **Visual:** ask the user to enter Play mode and report any visible seam or sorting issue,
   with a screenshot if possible.

## Pitfalls

- **`RuleTile` type not found → cause**: 2D Tilemap Extras isn't installed or not resolved
  yet.
- **A collider per tile is slow and snags characters on seams → fix**: merge via a
  `CompositeCollider2D` with a static `Rigidbody2D` and Composite Operation = Merge.
- **No "Used By Composite" checkbox, or an obsolescence warning on `usedByComposite` →
  cause**: Unity 6 replaced it with `Collider2D.compositeOperation`;
  `usedByComposite = true` becomes `CompositeOperation.Merge`.
- **Small gaps remain after merging → fix**: raise the Tilemap Collider 2D's Extrusion Factor
  so neighboring shapes fall within the composite's Vertex Distance.
- **World and cell coordinates mixed up → fix**: `SetTile`/`GetTile` take a cell `Vector3Int`.
  Convert with `WorldToCell`/`CellToWorld` (or `GetCellCenterWorld` for a tile's center).
- **Tiles draw above or below sprites unexpectedly → fix**: explicitly set each
  `TilemapRenderer`'s Sorting Layer and Order in Layer; multiple tilemaps need an explicit
  order.
- **Rule Tiles or animated tiles don't update after a script edit → fix**: refresh the edited
  cells with `RefreshTile`; `RefreshAllTiles()` on a large map stalls.
- **`cellBounds` bigger than the painted area → cause**: bounds don't shrink when tiles are
  cleared until `CompressBounds()` is called.
- **Painting lands on the wrong layer → cause**: the Tile Palette paints into its Active
  Tilemap; check that dropdown, or set the tilemap reference explicitly in code.

## Related skills

- `level-design`: blockout, pacing, and layout practice.
- `procedural-gen`: generating the tile data passed to `SetTilesBlock`.
- `unity-physics`: `Rigidbody2D` movement and 2D queries against the merged collider.
- `unity-csharp-scripting`: the MonoBehaviour around these scripts and the `.meta` checker.
- `create-game-assets`: building the sprite sheet before slicing and importing it.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1.

- 2D Tilemap Extras 6.0.3 (2026-08-12) is the latest release of the 6.0.x line, which targets
  Unity 6000.3; 4.1.x targets 6000.0 and 10.0.x targets 6000.7. Source: Unity package registry,
  https://packages.unity.com/com.unity.2d.tilemap.extras. Package manual:
  https://docs.unity3d.com/Packages/com.unity.2d.tilemap.extras@6.0/manual/index.html
- `Collider2D.CompositeOperation` (`Merge = 1`), `usedByComposite`'s deprecation,
  `Tilemap.GetUsedTilesCount`, `CompressBounds`, `GetSprite`, and
  `CompositeCollider2D.pathCount` were checked against the Unity C# reference source at tag
  6000.3.28f1 (`Modules/Physics2D/`, `Modules/Tilemap/`).
- Manual: https://docs.unity.com/en-us/engine/6000.3/manual/unity2d/tilemaps/reference/tilemap
- `script eval` is a `com.unity.pipeline` 1.0.0-pre.1 command (pre-release):
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
