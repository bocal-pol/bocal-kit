---
name: create-game-assets
description: "Plans, generates or sources, and validates coherent game art: style guides, sprites, pixel art, tilesets, icons, and textures, with QA and license traceability. Auto-invoke to create or AI-generate game art, fix fake transparency, or check the Steam AI disclosure. Not for engine import (`godot-tilemap`, `godot-animation`, `unity-tilemap-2d`), UI layout (`game-ui-ux`), nor sound (`audio-design`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Create Game Assets

Turn a game's visual intent into a coherent, engine-ready asset set. Treat image generation as
one production tool among others in a controlled pipeline, never as proof that an asset is
shippable.

> Adapted and translated from the `create-game-assets` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Define or refresh an art direction, or write a style guide other contributors follow.
- Produce a family of sprites, tiles, icons, backgrounds, or textures that must match.
- Generate art with an image tool, or source licensed packs, and make the result usable.
- Audit what was generated or licensed before a release.

**Not this skill**: engine import (`godot-tilemap`, `unity-tilemap-2d`, `pixijs-rendering`,
`threejs-gltf-loading`), animating sprites (`godot-animation`, `unity-animation`), runtime atlas
and texture-memory budgets (`performance-optimization`).

## Main workflow

1. **Inspect before inventing.** Find existing screenshots, concept art, sprites, models,
   fonts, import settings, camera framing, target resolution, and naming conventions. Preserve
   an existing coherent direction unless the user asks for a redesign.
2. **Lock the technical frame.** Note engine, 2D/3D, camera/view, native display size, asset
   dimensions, world scale, transparency, palette, filtering, animation frames, texture budget,
   and target platforms. Use `assets/art-direction-brief.md` as a copyable brief.
3. **Name the visual system.** Define shape language, silhouette priorities, value structure,
   palette roles, materials, lighting, detail density, and edge treatment. Use concrete visual
   properties; never substitute a living artist's name for an art direction.
4. **Make an asset manifest.** Copy `assets/asset-manifest.json`, then list every required
   asset, state, variant, size, pivot, collision role, source, license, and approval status.
   Separate production assets from disposable greybox placeholders.
5. **Approve a single visual target.** Create or choose a representative hero asset or a small
   style board before producing a full set. Judge it at the game's real scale and against a
   gameplay background. If the user delegated the choice, pick the strongest viable direction
   and record the decision rather than blocking.
6. **Produce related assets as families.** Reuse the approved target as an edit/reference
   input. Keep palette, view, proportions, lighting, outline, and texture density invariant.
   Generate small coherent batches; avoid isolated, unrelated prompts that drift.
7. **Normalize deterministically.** Crop, resize, anchor, slice, name, compress, and verify
   alpha with ordinary image/DCC tools. Never trust generated grids, transparency, seams,
   pivots, topology, or dimensions without inspection. Use the provided scripts for raster QA
   and contact sheets.
8. **Import with the engine's native settings.** Deliberately set filtering, mipmaps,
   pixels-per-unit/world scale, color space, compression, sprite slicing, texture types,
   materials, and collision. Read the relevant engine skill before editing engine files.
9. **Validate in context.** Inspect a contact sheet and the real game at native resolution.
   Check silhouette, scale, animation stability, seams, legibility, palette, collision fit,
   memory, and compression artifacts. Iterate on the source asset, not only on runtime
   compensations.
10. **Record provenance.** Keep the source URL/tool, license or generation note, edit history,
    and restrictions next to the manifest. Preserve embedded provenance metadata when the
    pipeline allows it.
11. **Finish with the checks.** Run `scripts/asset_report.py` on every file in the batch with
    the manifest's size, alpha, and color limits and `--json`; it must exit 0. Build a contact
    sheet with `scripts/build_preview_sheet.py` and look at it. Confirm every delivered
    manifest entry has a source, a license, and `technical_checks_passed: true`. Then ask the
    user to see the assets in the running game at native resolution and report anything that
    doesn't read well.

## Choosing the production path

| Need | Default path |
|------|--------------|
| An existing asset needs a controlled change | Edit the original/reference; state what must stay unchanged |
| New 2D visual family | Approve a seed → generate/source the family → normalize → preview → import |
| Real pixel art | Use generated work as a draft; enforce grid, palette, clusters, and frames with pixel tools |
| Repeatable surface or tileset | Produce a small family; fix seams; test the 3×3 tile before approval |
| UI art or icons | Keep text and interaction code native to code; prefer SVG/vector for simple geometric symbols |
| 3D model or material | Use concepts as reference; author/clean up in a DCC; validate topology, UVs, scale, pivots, and LODs |
| No generation/editing tool available | Build the brief and manifest; source licensed assets or keep explicit greybox placeholders |
| Audio asset | Route sound implementation and mixing to `audio-design`; still track source/license in the manifest |

## Image-generation hand-off

When a capable image generation or editing tool is installed, use it for live visual creation.
If the workspace exposes an `imagegen` skill (or `imagine` in this ecosystem), read and follow
it for the actual generate/edit call; this skill owns the game-art brief, constraints,
normalization, and acceptance gates. Generation APIs usually bill per image: tell the user the
batch size and ask before large or repeated runs.

Build prompts from these blocks:

```text
ROLE/PURPOSE: production asset for [gameplay role]
SUBJECT: [precise object/character and action]
VIEW: [orthographic/top-down/side/three-quarter], [camera and orientation]
ART DIRECTION: [shape language], [palette roles], [materials], [edge treatment]
GAME-SCALE READING: [silhouette and focal detail that must survive at WxH]
TECHNICAL OUTPUT: [dimensions/ratio], [transparent or scene background], [frame/slot count]
LOCKS: preserve [identity, proportions, palette, costume, lighting, line thickness]
EXCLUDE: text, labels, mockup frames, props, duplicated objects, cut-off edges, signatures
```

For edits, state both what changes and what stays fixed. Ask for transparent output via the
tool's native transparency option when available, then verify the alpha channel — prompt
wording alone doesn't guarantee transparency.

## Raster QA recipes

Inspect constraints and produce a machine-readable report. `--require-alpha` also fails an RGBA
file where every pixel is opaque, which is how a baked background or a fake checkerboard shows
up:

```bash
python scripts/asset_report.py assets/player-idle.png \
  --expect-size 64x64 --require-alpha --max-colors 48 --json
```

Build a nearest-neighbor contact sheet on a checkerboard:

```bash
python scripts/build_preview_sheet.py output/player/*.png \
  --out output/player-preview.png --columns 4 --cell-size 192
```

Run script paths relative to this skill folder, or resolve the installed skill path first. Both
scripts need Python and Pillow (see Version notes). Install the single dependency with
`python -m pip install -r scripts/requirements.txt` when not already available.
`asset_report.py` exits 1 when an explicit constraint fails, so it can gate a build.

## Quality gates

- **Cohesion:** related assets share palette roles, line/edge treatment, view, light direction,
  scale, and detail density.
- **Gameplay reading:** silhouettes and state changes stay clear at native resolution, in
  motion, and against real backgrounds.
- **Technical fitness:** exact size/frame count, usable alpha, stable anchors/pivots, correct
  color space/filtering, no cropped content, no accidental mockup labels or chrome.
- **Animation:** identity, volume, proportions, costume, orientation, and baseline don't drift;
  timing and anticipation read correctly in an in-engine preview.
- **Tiles/backgrounds:** required edges tile seamlessly; repetition is tolerable; parallax
  layers have intentional depth and no baked collision hints.
- **3D:** transforms, scale, pivot, normals, UVs, materials, topology, rig, collision proxies,
  LODs, and runtime format are checked rather than inferred from a render.
- **Rights:** every delivered file has recorded provenance and terms compatible with the
  project.

Never declare an asset production-ready from a prompt result alone. Approval requires the
relevant technical checks plus an in-engine or native-scale visual inspection.

## Pitfalls

- **Fake transparency.** Image models often paint a gray-and-white checkerboard or a flat
  background rather than alpha. `asset_report.py --require-alpha` fails a file without an alpha
  channel or with every pixel opaque; remove the background with a real matte, never by trusting
  the prompt.
- **Halos around cutouts.** Semi-transparent edges keep the old background color and show up as
  a light or dark fringe in the engine. Extend the edge color outward into transparent pixels
  (or export premultiplied when the engine expects it) and check against a contrasting
  background.
- **Fake pixel art.** Generated "pixel art" has blended intermediate colors, off-grid pixels,
  and hundreds of near-duplicates. Resize to the real grid with nearest-neighbor, quantize to
  the palette, then verify with `--max-colors`.
- **Mipmaps or linear filtering on pixel art** blurs and makes it shimmer. Nearest filtering, no
  mipmaps, integer camera scale.
- **Sprite sheets that don't slice.** Generated grids drift by a few pixels per cell and frames
  change size. Re-slice onto a fixed canvas with a shared anchor (usually bottom-center) before
  import.
- **Character drift across frames or batches** (head size, outline width, palette). Edit from
  the approved seed every time rather than from the last output.
- **Texture bleed at tile and atlas edges** under zoom or mipmaps. Pad or extrude tiles by 1-2
  px and test a 3x3 repeat at the game's camera scale.
- **Block compression sizes.** BC and ETC2 compress in 4x4 blocks (ASTC in its chosen block
  size); other dimensions get padded, or rejected by stricter paths like compressed WebGL
  textures. Keep textures in multiples of 4, and in powers of two where mipmaps are needed.
- **Normal and data maps imported as sRGB** shade incorrectly. Only color textures are sRGB.
- **Generated text and logos** come out as near-letters and invite branding trouble. Keep text
  native to code and remove brands before approval.
- **Licenses that don't survive packing.** Attribution and terms must follow the asset through
  atlasing and renaming; record them in the manifest, not in a filename.
- **Undeclared AI content.** Steam's Content Survey asks about AI-generated content shipped
  with the game; answer it from the manifest's `source.kind`, so track generation per asset.

## References

- For visual-system decisions and maintaining coherence, read
  [`references/art-direction.md`](references/art-direction.md).
- For sprites, animation strips, tiles, backgrounds, UI art, and engine import settings, read
  [`references/raster-pipeline.md`](references/raster-pipeline.md).
- For concept-to-mesh, textures, glTF/GLB, LOD, collision, and runtime validation, read
  [`references/three-d-pipeline.md`](references/three-d-pipeline.md).
- For licenses, generated-media records, and provenance, read
  [`references/provenance.md`](references/provenance.md).

## Related skills

- `game-ui-ux` for layout, navigation, legibility, and accessible interaction.
- `game-feel`, `shader-programming`, and `audio-design` for presentation once the source art is
  in place.
- Engine import/render skills like `godot-tilemap`, `unity-tilemap-2d`, `pixijs-rendering`, and
  `threejs-gltf-loading`.

## Version notes

Last checked: 2026-11-11.

- Scripts: Python 3.10+ with Pillow 10 to 13 (`scripts/requirements.txt` pins
  `Pillow>=10,<14`). Pillow 13.0.0 is the latest version and requires Python 3.11+.
- Steam Content Survey: the generative-AI section separates pre-generated content (made during
  development and shipped) from live-generated content (made while the game runs, which also
  needs a description of its guardrails); AI tools used only for efficiency are not its
  concern.
- The engine import settings in `references/raster-pipeline.md` target Godot 4.7 and
  Unity 6.3 LTS.
