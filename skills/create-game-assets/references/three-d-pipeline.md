# 3D concept-to-runtime pipeline

Use this reference when the output is a 3D model, material, texture set, rig, animation, or
prop family. An appealing render only proves appearance; it does not prove production-ready
geometry.

## Default pipeline

1. Lock camera/view, scale, gameplay footprint, material language, polygon/texture budgets,
   target engine, renderer, and platform.
2. Create or choose orthographic/turnaround concepts with consistent proportions. Treat
   generated multi-view sheets as references that still need geometric interpretation.
3. Author or clean up the model in a DCC like Blender. Inspect topology, normals,
   watertightness, UVs, texel density, material slots, rig, weights, and animation clips.
4. Apply/normalize transforms and set a meaningful origin and pivot for gameplay.
5. Create simplified collision proxies. Don't use a detailed render mesh as collision by
   default.
6. Define LODs and material/texture reuse for repeated or distant objects.
7. Export using the engine's preferred exchange path. Use GLB/glTF 2.0 as the general default
   for runtime delivery when the target supports it; keep editable DCC sources separate.
8. Import into the real engine, verify scale/orientation/materials/animation, profile memory
   and draw calls, and capture representative screenshots before approval.

## Geometry gates

- the silhouette fits gameplay and LOD transitions preserve it
- no accidental internal faces, non-manifold regions, flipped normals, or degenerate geometry
- deformation loops support the required rig motion
- pivots/origins support doors, wheels, pickups, weapons, placement, and snapping
- units and forward/up axes match the project convention
- collision proxies match gameplay intent without excessive detail

## Material and texture gates

- use consistent PBR channel conventions and color spaces
- avoid baking lighting into base color unless the art direction explicitly requires it
- only pack channels when the target pipeline documents the mapping
- keep texel density consistent across an asset family
- size textures from on-screen coverage; source resolution is not a runtime budget
- reuse materials/atlases where it reduces draw calls without hurting iteration
- validate normal-map orientation and compression in the target renderer

## Caution on generated 3D

If a tool can generate meshes, inspect the result with the same gates as an authored mesh.
Never infer clean topology, UVs, rigging, license, or efficient materials from a preview
render. Keep the tool/version and generation input in the asset manifest.

## Primary documentation

- Khronos glTF 2.0.1 registry and specification
- Godot 4.7 3D scene import
- Unity 6.3 Model import tab settings
- Unreal Engine static mesh import
- three.js GLTFLoader
