---
name: godot-shaders
description: "Godot 4.7 Shading Language syntax and pipeline: `canvas_item`, `spatial` and particle shaders, built-ins, wiring `ShaderMaterial`, headless compile checks, and porting 3.x. Auto-invoke for a `.gdshader` file, a `SHADER ERROR`, shader parameters set from GDScript, or a washed-out or wrongly sorted effect. Not for effect math like dissolve or outline (`shader-programming`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Shaders (4.x)

This skill owns writing `.gdshader` files in Godot's Shading Language, wiring them into
materials, and proof that they compile. Targets **Godot 4.7** (see Version notes). Effect
technique (the math of a dissolve, outline, toon ramp) lives in `shader-programming`; this skill
covers Godot's own syntax, built-ins and pipeline.

> Adapted/translated from `godot-shaders` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Write or port `.gdshader` code, fix a `SHADER ERROR`, wire a `ShaderMaterial`, choose render
  modes, or set uniforms from code.

**Not this skill**: cross-engine shading technique (`shader-programming`);
`StandardMaterial3D`, lights and environment (`godot-3d-essentials`). `GPUParticles` node
properties (as opposed to a `particles` shader) are out of scope here.

## Main workflow

1. **Choose the shader type** on the first line: `shader_type canvas_item;` for anything
   `CanvasItem` (Sprite2D, TextureRect, Control), or `shader_type spatial;` for 3D meshes.
   `particles`, `sky` and `fog` also exist.
2. **Write the output the type expects:** `COLOR` in `canvas_item`; `ALBEDO`, `EMISSION`,
   `ROUGHNESS`, `METALLIC` in `spatial`. `vertex()` moves geometry; `light()` replaces lighting.
3. **Expose settings as `uniform`** with hints (`source_color` for colors, `hint_range` for
   sliders) so they show up in the Inspector and get color-managed correctly.
4. **Wire the material.** In a `.tscn` it's plain text, so no Inspector clicking is needed.
5. **Run the checks** below before concluding.

## Patterns

### 1. canvas_item: tint and scrolling UV

```glsl
shader_type canvas_item;

uniform vec4 tint : source_color = vec4(1.0);
uniform float scroll_speed : hint_range(0.0, 2.0) = 0.3;

void fragment() {
    vec2 uv = UV + vec2(TIME * scroll_speed, 0.0);
    COLOR = texture(TEXTURE, uv) * tint;          // TEXTURE = the node's own texture
}
```

The node's texture must repeat for the scroll to loop: set `texture_repeat` on the CanvasItem, or
sample your own `uniform sampler2D tex : repeat_enable;`.

### 2. spatial: emissive rim on an opaque material

```glsl
shader_type spatial;

uniform vec4 base_color : source_color = vec4(0.2, 0.5, 1.0, 1.0);
uniform vec3 rim_color : source_color = vec3(0.6, 0.8, 1.0);
uniform float rim_power : hint_range(0.5, 8.0) = 3.0;

void fragment() {
    ALBEDO = base_color.rgb;
    float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), rim_power);  // view space
    EMISSION = rim_color * rim;                   // no ALPHA write: stays opaque
}
```

### 3. Post-process effect reading the screen (4.x hint, not SCREEN_TEXTURE)

```glsl
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float blur : hint_range(0.0, 4.0) = 1.0;

void fragment() {
    vec2 px = SCREEN_PIXEL_SIZE * blur;
    vec4 c = texture(screen_tex, SCREEN_UV);
    c += texture(screen_tex, SCREEN_UV + vec2(px.x, 0.0));
    c += texture(screen_tex, SCREEN_UV - vec2(px.x, 0.0));
    COLOR = c / 3.0;
}
```

### 4. Headless compile check for every `.gdshader`

```gdscript
# res://tests/compile_shaders.gd
extends SceneTree

func _initialize() -> void:
    var paths := _find("res://", "gdshader")
    for path in paths:
        print("compiling ", path)                 # a SHADER ERROR shows up right after
        var shader := load(path) as Shader
        shader.get_shader_uniform_list()         # forces compilation; load() alone is lazy
    print("%d shaders compiled" % paths.size())
    quit(0)

func _find(dir: String, ext: String) -> PackedStringArray:
    var found := PackedStringArray()
    for file in DirAccess.get_files_at(dir):
        if file.get_extension() == ext:
            found.append(dir.path_join(file))
    for sub in DirAccess.get_directories_at(dir):
        if not sub.begins_with("."):             # skip .godot/ and hidden folders
            found.append_array(_find(dir.path_join(sub), ext))
    return found
```

Shaders embedded in a `.tscn` (`[sub_resource type="Shader"]`) aren't files; cover them by
smoke-running that scene and grepping the same way.

## Verify

1. Compile every shader headless with Pattern 4, then grep the log:
   `grep -nE "SHADER ERROR|Shader compilation failed" shaders.log` (no output = success). Headless
   (dummy) rendering always compiles with the real shader compiler, so syntax, unknown built-ins,
   wrong output variables and invalid hints all surface.
2. This doesn't cover the GPU driver: ask the user to open the scene with the project's renderer
   (Forward+, Mobile or Compatibility) and report the rendering and any Output panel errors.
3. If a material was wired in a `.tscn`, also run `godot-nodes-scenes`'s path checker.

## Pitfalls

- **3.x → 4.x renames.** `SCREEN_TEXTURE` and `DEPTH_TEXTURE` are removed; declare
  `uniform sampler2D x : hint_screen_texture;` (or `hint_depth_texture`) and sample with
  `SCREEN_UV`. `hint_color`/`hint_albedo` become `source_color`; `hint_white`/`hint_black` become
  `hint_default_white`/`hint_default_black`.
- **Wrong output variable.** In a spatial `fragment()`, `COLOR` is the read-only vertex color, so
  assigning it is a compile error; write `ALBEDO`.
- **Color uniforms without `source_color`** are treated as raw linear values and look washed out
  or dark.
- **Object drawn in the wrong order, doesn't cast a shadow, or skips SSAO (3D)** → the spatial
  shader reads or writes `ALPHA`, which switches the whole material to the transparent pipeline
  even if the value is always `1.0`. For clean cutouts, set `ALPHA_SCISSOR_THRESHOLD`, which stays
  in the opaque pass.
- **Sampling outside [0,1] UV clamps** unless the sampler uniform has `repeat_enable` (or, for
  `TEXTURE`, the node's `texture_repeat` is enabled).
- **The effect jumps once an hour** → `TIME` wraps at `rendering/limits/time/time_rollover_secs`
  (3600 by default). Choose periods that divide this rollover, or supply your own time uniform.
- **`load()` alone doesn't compile a shader.** The `Shader` creates its GPU-side object on first
  use, hence calling `get_shader_uniform_list()` in Pattern 4.
- **`discard` breaks early depth testing** and costs more on some GPUs; prefer alpha when the
  blend mode allows it.

## References

- The official Shading Language docs cover built-ins per shader type, render-mode names, sampler
  filter/repeat qualifiers, `varying`, displacement in `vertex()`, a custom `light()` function, 2D
  normal maps, and performance rules.

## Related skills

- `shader-programming` for effect technique (dissolve, outline, fresnel, vignette).
- `godot-3d-essentials` for materials, environment, and where spatial shaders live.
- `godot-ui-control` for applying shaders to UI.
- `godot-gdscript-headless-testing` for running Pattern 4 in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Headless (dummy) rendering compiles shaders with the engine's own compiler and shows
  `SHADER ERROR:` lines; a `Shader` resource compiles lazily on first use.
