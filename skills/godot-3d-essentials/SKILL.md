---
name: godot-3d-essentials
description: "Godot 4.7 3D scene setup: `Camera3D`, lights, `WorldEnvironment` (sky, ambient, tonemap, fog), `StandardMaterial3D`, `GridMap` and local vs. global transforms, with a headless scene check. Auto-invoke when a 3D scene renders black or washed out, a mesh is invisible, or a child rotates on the wrong axis. Not for spatial shaders (`godot-shaders`), bodies and raycasts (`godot-physics`), or camera feel (`camera-systems`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot 3D Essentials (4.x)

This skill owns assembling a 3D scene that shows what it should in actual gameplay: a current
camera, real lights, an environment, materials and GridMap blockouts. Targets **Godot 4.7**; read
`config/features` and `rendering/renderer/rendering_method` in `project.godot` first, since
Forward+, Mobile and Compatibility differ in what they draw.

> Adapted/translated from `godot-3d-essentials` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Set up a 3D scene's camera, lights, environment and materials; blockout with GridMap; debug a
  black or washed-out render, or an invisible mesh.

**Not this skill**: spatial shaders (`godot-shaders`); bodies and raycasts (`godot-physics`);
camera feel (`camera-systems`).

## Main workflow

1. **Check the renderer** (`rendering/renderer/rendering_method`: `forward_plus`, `mobile` or
   `gl_compatibility`). Mobile and Compatibility (web, low-end) have no SDFGI, SSIL, screen-space
   reflections or volumetric fog, and Mobile also has no SSAO.
2. **Exactly one current `Camera3D` per viewport.** Set `current = true` on the one you want.
   Godot's convention is -Z forward, +Y up.
3. **Light the scene within the scene itself.** The editor's sun and preview environment don't
   exist at runtime. Add a `DirectionalLight3D` and a `WorldEnvironment` to the main scene.
4. **Configure the `Environment`:** background (sky or color), ambient source, tonemapper, then
   post-process effects. Choose the tonemapper before tuning light energy and glow.
5. **Materials:** `StandardMaterial3D` on `MeshInstance3D.material_override` (all surfaces) or
   `set_surface_override_material(i, mat)`; `ShaderMaterial` for a custom look.
6. **Blockout with `GridMap`** and a `MeshLibrary`.
7. **Run the checks** below before concluding.

## Patterns

### 1. Sun and environment from code

```gdscript
func _ready() -> void:
    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-50, -30, 0)   # points downward: -X tilt
    sun.shadow_enabled = true
    add_child(sun)

    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    env.sky = Sky.new()
    env.sky.sky_material = ProceduralSkyMaterial.new()
    env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
    env.tonemap_mode = Environment.TONE_MAPPER_AGX
    var world_env := WorldEnvironment.new()
    world_env.environment = env
    add_child(world_env)
```

Only one `WorldEnvironment` applies per world: the first keeps control and a later one is ignored
with no runtime message (the editor shows a node warning).

### 2. A material from code

```gdscript
func tint(mesh: MeshInstance3D, color: Color) -> void:
    var mat := StandardMaterial3D.new()
    mat.albedo_color = color
    mat.roughness = 0.6
    mesh.material_override = mat   # wins over surface and mesh materials
```

### 3. Filling a GridMap from code

```gdscript
@onready var grid: GridMap = $GridMap   # mesh_library and cell_size set on the node

func build_floor(width: int, depth: int, item_id: int) -> void:
    for x in width:
        for z in depth:
            grid.set_cell_item(Vector3i(x, 0, z), item_id)   # -1 clears a cell
```

## Verify

1. If `godot-nodes-scenes` is installed, run its path checker and fix every `ERROR`.
2. Run a GPU-free headless scene check that exits 1 when there's no current camera, nothing lights
   the meshes, a sky background has no `Sky`, or a mesh is hidden by the camera's `cull_mask`,
   behind it, or beyond `far`.
3. To see an image without a GPU, render a frame in software with Movie Maker and inspect it. This
   draws with the Compatibility renderer; judge the Forward+ look by asking the user for a
   screenshot.

## Pitfalls

- **Correct in the editor, dark or flat in game** → the editor's preview sun and environment were
  doing the lighting. Put a light and a `WorldEnvironment` in the scene.
- **Meshes are black** → nothing lights them. With no `Environment`, Forward+ and Mobile still add
  a flat ambient from `rendering/environment/defaults/default_clear_color`, but Compatibility adds
  none, so the same scene is dark gray on desktop and black on web.
- **Solid gray screen** → no current camera, so only the clear color shows; or the camera is inside
  a mesh with backface culling.
- **The wrong camera renders** → a camera in an instanced sub-scene also has `current = true`.
  Keep `current` on a single camera, or call `make_current()` after the scene loads.
- **A mesh is missing** → its `layers` don't overlap the camera's `cull_mask`, it's beyond `far`,
  or an imported mesh has flipped normals (test with `cull_mode = CULL_DISABLED`).
- **`look_at()` errors and does nothing** → the target equals the node's position, the up vector
  is parallel to the view direction, or the node isn't in the tree yet; use
  `look_at_from_position()` before `add_child()`.
- **Local vs. global confusion** → `position`/`rotation` are relative to the parent; `look_at()`
  and `global_position` are in world space.
- **Non-uniform scale distorts collision and lights** → scale the mesh resource or use a uniform
  scale on bodies.
- **Highlights washed out or blown out** → the tonemapper is `Linear` (no tonemapping) or glow
  thresholds are low; switch to AgX or Filmic and lower `glow_intensity`.
- **GridMap places nothing** → no `MeshLibrary` assigned, or the item id isn't in it.

## References

- The official docs on environment and post-processing cover Transform3D math, camera projection
  and picking, the light type table (including AreaLight3D cost), every Environment field,
  material fields, building a `MeshLibrary`, and baked vs. real-time GI.

## Related skills

- `camera-systems`: orbit, follow and first-person camera feel.
- `godot-physics`: 3D bodies, CharacterBody3D, areas and raycasts.
- `godot-shaders`: spatial shaders.
- `godot-animation`: AnimationTree for 3D characters.
- `performance-optimization`: draw calls, lights, LOD and frame budget.
- `fps-shooter`: a full 3D game on top of these building blocks.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- `AreaLight3D` and the dedicated MeshLibrary editor are new in 4.7.
- The AgX tonemapper exists since 4.4.
- Ambient with no environment: Forward+/Mobile fall back to the default clear color;
  Compatibility has no fallback.
