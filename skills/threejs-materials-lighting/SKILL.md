---
name: threejs-materials-lighting
description: "Lights and shades three.js r187 video-game scenes: standard, physical, and unlit materials, lights, shadows, HDR environment lighting, and tone mapping. Auto-invoke when a mesh renders black or washed out, shadows are missing or full of acne, or `EffectComposer` darkens the image. Not for renderer setup (`threejs-scene-setup`), model loading (`threejs-gltf-loading`), custom shaders (`shader-programming`), or lighting decorative design scenes (`threejs-3d`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# three.js materials and lighting

Gets three.js surfaces rendering correctly: the right material, a lighting rig, working
shadows, and image-based lighting (IBL). The patterns target **r187**. Lighting has been
physically based since r155, so intensities from old tutorials render far too dark.

> Adapted/translated from `threejs-materials-lighting` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- A mesh renders black or flat, a material choice needs making, lights or shadows are being
  added, or environment reflections (IBL) are being set up.
- The code builds `MeshStandardMaterial`, `DirectionalLight`, and similar, or sets
  `renderer.shadowMap.enabled`, `scene.environment`, or `renderer.toneMapping`.

**Not this skill**: the renderer, camera, and loop (`threejs-scene-setup`), model loading
(`threejs-gltf-loading`), or custom GLSL and node shaders (`shader-programming` for the
technique). **Boundary with `threejs-3d`**: lighting and materials for a designer's
decorative scene (hero, product showcase, brand mood) belong to `threejs-3d`, which already
has mood-based lighting recipes in its own brief. This skill targets gameplay lighting —
player readability, consistency with a level's light, and performance under a framerate
budget.

## Main workflow

1. **Rule out geometry first.** Swap the material for `MeshNormalMaterial`. If the mesh is
   still missing, the problem is the camera, scale, or loading, not lighting.
2. **Start from `MeshStandardMaterial` as the default.** It responds to lights and
   `scene.environment` and matches glTF's PBR model. Use `MeshPhysicalMaterial` only for
   clearcoat, transmission, or sheen, and `MeshBasicMaterial` for unlit UI, sprites, and flat
   color.
3. **Light the scene**: an environment map or a hemisphere fill, plus a directional key
   light. Start the key around 2 to 3.
4. **Enable shadows in three places**: the renderer, the light, and each mesh's `castShadow` /
   `receiveShadow`. Then fit the light's shadow camera to the play area.
5. **Tag color textures as sRGB** and leave data maps (normal, roughness, metalness) linear.
6. **Choose a tone mapping curve once**, and end any post-processing chain with
   `OutputPass`.
7. **Verify** with the [Verify](#verify) section.

## Patterns

### 1. PBR material under a key and fill

```js
import * as THREE from 'three';

const material = new THREE.MeshStandardMaterial({
  color: 0xcc4444,
  roughness: 0.5, // 0 = mirror, 1 = matte
  metalness: 0.0, // 0 = plastic, wood, skin; 1 = raw metal
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material));

scene.add(new THREE.HemisphereLight(0xbbddff, 0x443322, 1.0)); // sky, ground, intensity
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(5, 10, 7);
scene.add(key);
```

### 2. Unlit material with a color texture

```js
const tex = new THREE.TextureLoader().load('assets/logo.png');
tex.colorSpace = THREE.SRGBColorSpace; // color maps are sRGB
const logo = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); // ignores lights
```

### 3. Shadows with a fitted shadow camera

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;      // soft since r182

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(8, 12, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);                // default 512
const cam = sun.shadow.camera;                     // orthographic for a DirectionalLight
cam.near = 1; cam.far = 40;
cam.left = -15; cam.right = 15; cam.top = 15; cam.bottom = -15;
scene.add(sun);
// scene.add(new THREE.CameraHelper(cam));         // draws the frustum while tuning

mesh.castShadow = true;
ground.receiveShadow = true;
```

For a level larger than the shadow frustum, move the light and its `target` with the player
every frame rather than enlarging the frustum, which spreads the same map over more terrain.
Add the target to the scene (`scene.add(sun.target)`) so its world matrix updates.

### 4. PBR texture set

```js
const loader = new THREE.TextureLoader();
const colorMap = loader.load('assets/brick_color.jpg');
colorMap.colorSpace = THREE.SRGBColorSpace;
const brick = new THREE.MeshStandardMaterial({
  map: colorMap,
  normalMap: loader.load('assets/brick_normal.jpg'),   // data maps stay linear
  roughnessMap: loader.load('assets/brick_rough.jpg'),
  metalness: 0,
});
```

### 5. Image-based lighting from an HDR file

```js
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'; // RGBELoader before r180

new HDRLoader().load('assets/studio.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; // lights and reflects every PBR material
  scene.background = hdr;  // optional backdrop
});
renderer.toneMapping = THREE.ACESFilmicToneMapping; // default is NoToneMapping
renderer.toneMappingExposure = 1.0;
```

No HDR file? The reference shows `RoomEnvironment` via `PMREMGenerator`.

## Verify

1. `npm run build` (or `npx tsc --noEmit`) passes.
2. Probe the lighting state in the running page. Expose `renderer` and `scene` on `window`
   (`Object.assign(window, { renderer, scene })`). Then pass this expression to Playwright's
   `page.evaluate` as a string, so it runs in the page and not in Node (the
   `threejs-scene-setup` smoke script works), or ask the user to paste it into the browser
   console and report the output:

```js
(() => {
  const lights = [], casters = [], srgbMissing = [];
  window.scene.traverse((o) => {
    if (o.isLight) lights.push(`${o.type}:${o.intensity}${o.castShadow ? ':shadow' : ''}`);
    if (o.isMesh && o.castShadow) casters.push(o.name || o.type);
    for (const m of [].concat(o.material ?? [])) {
      if (m.map && m.map.colorSpace !== 'srgb') srgbMissing.push(m.name || m.type);
    }
  });
  return {
    lights,
    environment: !!window.scene.environment,
    shadowMap: window.renderer.shadowMap.enabled,
    shadowCasters: casters.length,
    toneMapping: window.renderer.toneMapping, // 0 = NoToneMapping
    colorMapsNotSRGB: srgbMissing,
  };
})();
```

   Expect at least one light or an environment, `shadowMap: true` with a `:shadow` light and
   at least one caster when shadows are wanted, and an empty `colorMapsNotSRGB`. Then take a
   screenshot and check that highlights face the key light and shadows fall under objects.

## Pitfalls

- **Mesh fully black** → a lit material with no light or `scene.environment`. Add one;
  confirm the geometry with `MeshNormalMaterial`.
- **Too dark even with lights** → intensities from pre-r155 tutorials. Raise the key light
  around 2 to 3 or add an environment map.
- **No shadows** → one of three switches is missing: `renderer.shadowMap.enabled`,
  `light.castShadow`, or the mesh's `castShadow` / `receiveShadow`.
- **Shadows cut off or blocky** → the directional light's orthographic shadow camera does
  not cover the scene, or covers far too much. Adjust `left/right/top/bottom/near/far`,
  raise `shadow.mapSize`, and visualize with `CameraHelper`.
- **Shadow acne or peter-panning** → adjust `shadow.bias` (small negative) and
  `shadow.normalBias`.
- **Washed-out or over-saturated colors** → self-loaded color textures need
  `colorSpace = THREE.SRGBColorSpace`; data maps stay linear. `GLTFLoader` already tags glTF
  textures.
- **Dark and tone-mapping-free once post-processing is added** → tone mapping and sRGB
  conversion only run on a direct render to the canvas. End the `EffectComposer` chain with
  `OutputPass`.
- **Environment light too strong or too weak** → scale it with
  `scene.environmentIntensity`; `material.envMapIntensity` only affects a material's own
  `envMap`.
- **`PCFSoftShadowMap` logs a warning** → since r182, `PCFShadowMap` is already soft and
  `PCFSoftShadowMap` just falls back to it.
- **Point-light shadows tank the framerate** → each one renders the scene six times. Keep a
  single shadow-casting directional light and fake the others.

## References

- Read [`references/materials-lights-table.md`](references/materials-lights-table.md) to
  choose between materials, look up light parameters and units, fix transparency sorting or
  `alphaTest` cutouts, build IBL from `RoomEnvironment` without an HDR file, or pick a tone
  mapping curve with post-processing.

## Related skills

- `threejs-scene-setup`: renderer, camera, and loop.
- `threejs-gltf-loading`: models arrive with PBR materials that this skill tunes.
- `threejs-3d`: mood-based lighting recipes for decorative design scenes — boundary detailed
  above.
- `shader-programming`: custom shader effects as a technique.
- `camera-systems`: the gameplay camera this lighting must stay readable under.

## Version notes

Last checked: 2026-11-17, against three r187 (npm `three@0.187.0`, published 2026-10-30).

- r155 made lighting physically based by default; r163 added
  `scene.environmentIntensity`; r180 deprecated `RGBELoader` in favor of `HDRLoader`; r182
  made `PCFShadowMap` soft; r183 repositioned `RoomEnvironment`; r187 rebuilt PMREMs on cube
  render targets and removed `CubeUVReflectionMapping`, so IBL renders slightly differently
  after an update.
- Shadow `mapSize` still defaults to 512 in r187.
- Sources: [r187 release notes](https://github.com/mrdoob/three.js/releases/tag/r187),
  [Migration Guide 186→187](https://github.com/mrdoob/three.js/wiki/Migration-Guide#186--187),
  [r187 sources](https://github.com/mrdoob/three.js/tree/r187/src).
