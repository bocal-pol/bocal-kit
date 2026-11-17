---
name: shader-programming
description: "Cross-engine shader technique in GLSL with HLSL equivalents: how dissolve, outline, fresnel rim, and post-process effects work, and porting GLSL to HLSL. Auto-invoke when an effect's math is the question, or for mobile artifacts or flicker. For writing a shader in a given engine, its own skill is enough (`godot-shaders`, `threejs-materials-lighting`, `pixijs-rendering`). Not for particles (`unreal-niagara`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Shader programming (cross-engine)

Shaders run per vertex and per pixel on the GPU. The pipeline, coordinate spaces, UV tricks,
and math behind common effects port from one engine to another; only the dialect and
built-in names change. This skill owns that technique in GLSL with HLSL equivalents. Also load
the engine skill (`godot-shaders`, `threejs-materials-lighting`, `pixijs-rendering`) for syntax,
built-ins, and how the material is wired.

> Adapted and translated from the `shader-programming` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Designing or debugging an effect's math: tint, scroll, dissolve, outline, rim, vignette,
  grading.
- Reasoning about stages, spaces, interpolation, and precision.
- Porting a shader between GLSL and HLSL, or between engines.

**Not this skill**: Godot's shading language syntax and pipeline (`godot-shaders`),
three.js `ShaderMaterial` vs. TSL (`threejs-materials-lighting`), PixiJS filters
(`pixijs-rendering`), particle systems (`unreal-niagara`), post-process stack settings (the
engine's renderer docs), per-pixel cost in a profiler (`performance-optimization`).

## Main workflow

1. **Name the stage.** The vertex stage moves vertices into clip space and passes data along;
   the fragment stage runs per pixel and produces a color. Most game effects are fragment work.
2. **Pick a space** for lighting math (world or view) and convert every vector into it.
3. **Drive effects with UVs, uniforms, and time.** UVs are 0..1; uniforms are constant per draw;
   varyings are interpolated from vertex to fragment.
4. **Prefer `mix`, `step`, `smoothstep`, and `clamp` over branches** on per-pixel values: pixels
   run in lockstep, so a branch that differs between neighbors executes both sides. Branching
   on a uniform is cheap.
5. **Keep texture samples few**; that's usually the main cost.
6. **Compile before you look** (see "Verify").
7. **Ask for a visual check on the target device** with precise questions.

## Patterns

Fragment GLSL snippets for desktop `#version 330`; each compiles with `glslangValidator` under
that header. For GLSL ES 3.00 (WebGL 2, three.js `ShaderMaterial`, PixiJS filters) add
`precision highp float;` and set uniform defaults from code: ES rejects
`uniform float edge = 0.05;` with "cannot initialize this type of qualifier", while Godot's
shading language accepts it. HLSL forms and longer effects are in `references/effects.md`.

### 1. Sample, tint, combine

```glsl
uniform sampler2D tex;
uniform vec4 tint;          // multiplies tints without cutting; (1,1,1,1) = unchanged
in vec2 uv;
out vec4 frag;
void main() {
    vec4 c = texture(tex, uv);   // HLSL: tex.Sample(samp, uv)
    frag = c * tint;
}
```

### 2. Scrolling UVs, framerate-independent

```glsl
uniform sampler2D tex;
uniform float time;          // seconds since start, provided by the engine
uniform vec2 scroll_speed;   // UV units per second
in vec2 uv;
out vec4 frag;
void main() {
    vec2 scrolled = fract(uv + scroll_speed * time);  // HLSL: frac(...)
    frag = texture(tex, scrolled);
}
// Drive with an absolute time uniform, not a per-frame accumulator. With mipmaps,
// fract() leaves a thin seam where the UV jumps from 1 to 0; prefer a repeat sampler
// and drop fract().
```

### 3. Dissolve with a glowing edge

```glsl
// Hides pixels where noise < threshold; tints a thin band at the boundary.
uniform sampler2D tex;
uniform sampler2D noise_tex;     // grayscale noise, 0..1
uniform float amount;            // 0 = fully visible, 1 = fully dissolved
uniform float edge = 0.05;       // glow band width
uniform vec4 edge_color;
in vec2 uv;
out vec4 frag;
void main() {
    vec4 c = texture(tex, uv);
    float n = texture(noise_tex, uv).r;
    float cut = amount * (1.0 + edge) - edge;  // the band starts below 0 -> none at amount 0
    if (n <= cut) discard;                     // discards dissolved pixels (all at 1)
    float e = smoothstep(cut, cut + edge, n);  // 0 at edge -> 1 inside; keep edge > 0
    frag = mix(edge_color, c, e);              // HLSL: lerp(edge_color, c, e)
}
// WRONG: thresholding directly against `amount` — at amount 0 every pixel with n < edge
// is still tinted, so the "fully visible" sprite shows stray glowing spots.
```

### 4. Fresnel rim light

```glsl
in vec3 world_normal;        // world space, interpolated from the vertex stage
in vec3 view_dir;            // surface -> camera, world space
uniform float power = 3.0;
uniform vec3 rim_color;
out vec4 frag;
void main() {
    // Interpolation doesn't preserve unit length, even from normalized vertex outputs.
    vec3 normal = normalize(world_normal);
    vec3 view = normalize(view_dir);
    float f = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), power);
    frag = vec4(rim_color * f, 1.0);   // add to lighting; f peaks at the silhouette
}
```

## Verify

1. **Compile every GLSL file** with `glslangValidator path/to/effect.frag` (the stage comes
   from the suffix: `.vert`, `.frag`). Also compile the ES variant when shipping to web: put
   `#version 300 es` and `precision highp float;` at the top. For WGSL run
   `naga path/to/shader.wgsl`. For Godot `.gdshader` files use the headless compile check from
   `godot-shaders`.
2. **Check the extremes numerically** wherever the effect has parameters: dissolve at `amount`
   0 shows no edge color and at 1 discards everything; a vignette at `strength` 0 leaves the
   image unchanged. Read the math against the code, or render a test quad in the engine and
   read the pixels back.
3. **Ask the user to look on the target hardware** and report specifics: "Does the dissolve
   show stray dots at 0? Is the outline clipped at the sprite's edge? Does the effect flicker or
   band on your phone? Is the texture upside down?" Desktop drivers forgive things mobile GPUs
   don't.

## Pitfalls

- **Mixed coordinate spaces** (a world-space normal lit by a view-space light) give subtly
  wrong lighting. Convert everything into one space.
- **Unnormalized interpolated vectors** shorten between vertices, so `dot()` drifts. Normalize
  in the fragment stage.
- **Flipped V between engines or APIs.** Texture and framebuffer origins differ; a ported
  effect can appear upside down or mirrored.
- **Reversed `smoothstep` edges.** The GLSL spec leaves `smoothstep(e0, e1, x)` undefined when
  `e0 >= e1`, so `smoothstep(1.0, 0.5, d)` may work on one GPU and not another. Write
  `1.0 - smoothstep(0.5, 1.0, d)`.
- **`discard` disables early depth testing** and can cost more on tiled mobile GPUs; use alpha
  blending where the effect allows it.
- **Precision on mobile.** A time or large UVs in `mediump` flicker and jump. Use `highp` for
  coordinates and time, and wrap time in the engine before it grows too large.
- **GLSL isn't HLSL.** `mix`/`lerp`, `fract`/`frac`, `texture()`/`.Sample()`, `vec2`/`float2`,
  `M * v`/`mul(M, v)`, and `mod` vs. `fmod`, which differ for negative numbers. Keep the source
  engine's multiplication order rather than swapping operands by reflex.
- **Outline clipped at the quad's edge**: the sprite needs a transparent margin at least as
  wide as the outline, and atlas frames need UV clamping or neighbors bleed in.
- **A GLSL `ShaderMaterial` rendering nothing under three.js's `WebGPURenderer`**: that renderer
  only runs node materials (TSL) on either backend. Keep `WebGLRenderer` for raw GLSL or port
  the effect to TSL.
- **A PixiJS 8 GL filter with only a fragment shader**: `GlProgram` options also need a
  `vertex` string. Pass Pixi's default filter vertex shader (exported as `defaultFilterVert`)
  or your own.

## References

- [`references/effects.md`](references/effects.md): read for the GLSL-to-HLSL mapping table,
  clip-space and matrix-order notes for porting, the full 2D outline, vignette, and color
  grading shaders, per-engine notes (Godot, Unity URP, Unreal, three.js, PixiJS), or the
  performance checklist.

## Related skills

- `godot-shaders`: Godot's shading language, built-ins, render modes, and compile checking.
- `threejs-materials-lighting`, `pixijs-rendering`: material and filter wiring on the web.
- `procedural-gen`: the noise that drives dissolve and procedural textures.
- `performance-optimization`: measuring what an effect costs per frame.

## Version notes

Last checked: 2026-11-11.

- The seven GLSL blocks in this skill and its reference compile with glslangValidator 16.6.0
  under `#version 330`, and under `#version 300 es` once uniform initializers are removed; with
  initializers the ES compile fails with "cannot initialize this type of qualifier".
- three.js r187 (npm 0.187.0): `WebGPURenderer` only runs node materials.
- PixiJS 8.22.0: `Filter.from` passes `gl` to `GlProgram.from`, whose options type requires
  `vertex` and `fragment`; `defaultFilterVert` is exported from `src/filters/index.ts`.
- WebGPU in browsers: support varies by browser and OS (Chrome/Edge, Safari, Firefox) — keep a
  WebGL 2 path for a web game.
