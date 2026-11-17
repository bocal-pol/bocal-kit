# Raster, sprite, tile, background, and UI pipeline

Use this reference for production 2D art and raster textures. Generated output is source
material; dimensions, grids, alpha, anchors, and import settings stay deterministic engineering
concerns.

## Sprites and animation

1. Approve an idle/neutral seed at the final view and approximate game scale.
2. Lock canvas size, base/ground point, orientation, palette, outline, proportions, and
   costume.
3. For a short animation, ask for the whole action as a single strip or sheet referenced to the
   seed. Independent frame requests drift more. Treat a returned grid as a candidate, not exact
   data.
4. Slice and normalize frames with a shared scale and a shared anchor — usually bottom-center.
5. If frame 1 must equal a delivered idle pose, restore the exact seed after slicing.
6. Preview as a contact sheet and in motion. Check volume, foot sliding, silhouette, and
   cadence.

For real pixel art, enforce a true pixel grid after generation. Remove blended pseudo-pixels,
single-pixel noise, excess colors, banding, and inconsistent clusters. Only resize with
nearest-neighbor unless a deliberate preprocessing pass says otherwise.

## Tiles and repeatable textures

- Define tile dimensions and neighbor rules before creating art.
- Produce a base, transitions, corners, isolated pieces, and decoration as a single visual
  family.
- Keep gameplay edges and the collision reading legible; decorative shadows must not imply
  false walls.
- Test seamless materials in a full-size 3×3 repeat and at minified camera scale.
- Inspect terrain combinations in the engine's autotile/terrain system, not only on a sheet.
- Keep padding/extrusion compatible with the engine's/tool's atlas to avoid texture bleed.

## Backgrounds and parallax

- Separate sky, far, mid, near, and foreground layers by the intended parallax speed.
- Avoid unique landmarks near horizontal seams when layers must scroll/repeat.
- Preserve a low-contrast play field behind characters and projectiles.
- Keep focal detail away from HUD safe zones and critical navigation silhouettes.
- Export layers independently with overlap so camera movement can't expose gaps.

## UI art and icons

- Keep labels, numbers, dynamic text, focus state, and accessibility text native to code.
- Generate or draw ornament, frames, portraits, and texture — not rasterized functional text.
- Prefer an established icon family. Simple geometric symbols should usually be SVG/vector.
- Provide normal, hover/focus, pressed, disabled, selected, and warning states when the art
  changes.
- Design resizable panels as 9-slice/nine-patch assets; check corners and borders at several
  sizes.

## Import checkpoints

**Godot 4.7:** 2D filtering and repeat are not import options. Set
`rendering/textures/canvas_textures/default_texture_filter` to Nearest for a pixel-art project
(or `texture_filter` on a `CanvasItem` subtree), and enable
`rendering/2d/snap/snap_2d_transforms_to_pixel` when sprites shimmer while moving. Only enable
the `mipmaps/generate` import option for non-pixel textures that shrink substantially; set
`texture_repeat` (or the 3D material's repeat) only for textures designed to tile. Check
`Sprite2D`, `TileSet`, atlas regions, and animation frames in the editor.

**Unity 6.3 LTS:** set Texture Type to Sprite (2D and UI), choose Single/Multiple correctly,
set a consistent Pixels Per Unit, filter mode, compression, mipmaps, mesh type, and sprite
slicing. Disable Read/Write unless runtime pixel access is actually needed, since it adds a
memory cost.

**Phaser/PixiJS/web:** keep atlas metadata and image filenames stable; use nearest-neighbor
sampling and integer camera scale for pixel art; prevent browser/CSS resizing from introducing
blur; inspect texture bleed under the real renderer.

## Primary documentation

- Godot 4.7 Image
- Godot 4.7 Texture2D
- Unity sprite import settings
- Phaser asset concepts
- PixiJS Assets guide
