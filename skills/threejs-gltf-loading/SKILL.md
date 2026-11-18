---
name: threejs-gltf-loading
description: "Loads glTF/GLB models in three.js r187 and plays their animations: `GLTFLoader`, DRACO/Meshopt/KTX2 decoders, `AnimationMixer` cross-fades, and `SkeletonUtils` clones. Auto-invoke when a model is invisible or tiny, decoder files 404, animations never play, or clones share a single skeleton. Not for scene setup (`threejs-scene-setup`) or lighting (`threejs-materials-lighting`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# three.js glTF loading

Loads `.gltf` / `.glb` models, including compressed geometry (DRACO, Meshopt) and textures
(KTX2), and plays their animation clips. The patterns target **r187**; an existing project
keeps its pinned release unless the user asks for an update. glTF is the default runtime
format: OBJ has no scene graph or animation, and FBX is heavy to parse in a browser.

> Adapted/translated from `threejs-gltf-loading` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Importing a model or character, inspecting its node hierarchy, playing or blending clips,
  spawning several copies of an animated enemy, or fixing a model that does not display.
- Files are `.gltf` / `.glb`, or the code imports `GLTFLoader`, `DRACOLoader`, or
  `KTX2Loader` from `three/addons/loaders/...`.

**Not this skill**: the renderer, camera, and loop (`threejs-scene-setup`), the model's
lighting and materials (`threejs-materials-lighting`), or modeling and export settings in a
DCC tool. **Boundary with `threejs-3d`**: if a glTF model is loaded for a designer's
decorative scene (animated hero, product showcase) rather than a game, check `threejs-3d`
first — the two can complement each other, but `threejs-3d` drives design intent and brief
persistence.

## Main workflow

1. **Inspect the file before writing loader code** when `gltf-transform` is available:
   `npx @gltf-transform/cli inspect model.glb` lists meshes, extensions (for example
   `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_texture_basisu`), clips, and
   texture sizes. Each listed compression extension needs its decoder attached.
2. **Load with `GLTFLoader`** (`loadAsync` in async code). The result has `gltf.scene`, the
   root `Object3D`, and `gltf.animations`, an `AnimationClip[]`.
3. **Add `gltf.scene` and frame it.** glTF units are meters; log names and bounds to find the
   parts the code will control.
4. **One `AnimationMixer` per animated root**, actions via `mixer.clipAction(clip)`, and
   `mixer.update(seconds)` every frame.
5. **Attach decoders** for the extensions found in step 1. Since r185, `DRACOLoader` and
   `KTX2Loader` find their bundled decoder files with no path.
6. **Verify** with the [Verify](#verify) section.

## Patterns

### 1. Load and frame a model

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('assets/robot.glb');
const root = gltf.scene;
scene.add(root);

const box = new THREE.Box3().setFromObject(root);
console.log('size (m):', box.getSize(new THREE.Vector3()).toArray());
console.log('clips:', gltf.animations.map((c) => c.name));
```

### 2. Play a clip

```js
const timer = new THREE.Timer();            // THREE.Clock has been deprecated since r183
const mixer = new THREE.AnimationMixer(gltf.scene);
const run = THREE.AnimationClip.findByName(gltf.animations, 'Run') ?? gltf.animations[0];
mixer.clipAction(run).play();

renderer.setAnimationLoop(() => {
  timer.update();
  mixer.update(timer.getDelta());           // seconds, not milliseconds
  renderer.render(scene, camera);
});
```

### 3. Cross-fade between clips

```js
const actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
let current = actions.Idle;
current.play();

function transitionTo(name, duration = 0.3) {
  const next = actions[name];
  if (!next || next === current) return;
  next.reset().play();                      // rewinds and clears an old fade
  current.crossFadeTo(next, duration, false);
  current = next;
}
```

### 4. Compressed geometry and textures

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader()
  .setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG)) // glTF-only WASM build (r185+)
  .setKTX2Loader(new KTX2Loader().detectSupport(renderer))             // needs the renderer
  .setMeshoptDecoder(MeshoptDecoder);
// Share this single loader across every model: decoders and workers are created once.
```

On releases before r185, or when the host does not serve the bundled files, copy
`examples/jsm/libs/draco/` and `libs/basis/` from the installed `three` package and pass
those folders to `setDecoderPath` / `setTranscoderPath`.

### 5. Finding a named part

```js
const wheels = [];
gltf.scene.traverse((node) => {
  if (node.name.startsWith('Wheel')) wheels.push(node);
});
// In the loop: for (const w of wheels) w.rotation.x += dt * 4;
```

### 6. Shrinking a model without losing parts the code needs

```bash
# Meshopt compression, WebP textures capped at 1024 px, keeps named nodes and hierarchy.
npx @gltf-transform/cli optimize in.glb out.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --flatten false --join-named false
npx @gltf-transform/cli validate out.glb
```

`optimize` flattens the hierarchy and merges meshes, named ones included, by default. That
cuts draw calls, but code looking up `Wheel_FL` or animating a door node then finds nothing.
Keep the two flags above for any model the code will search inside. The output needs
`setMeshoptDecoder` (Pattern 4).

## Verify

1. **File check**: `npx @gltf-transform/cli validate model.glb` for every new or changed
   file; fix reported errors before debugging loader code.
2. **Build**: `npm run build` (or `npx tsc --noEmit`) passes.
3. **Runtime probe**: expose `scene` and the mixer on `window`
   (`Object.assign(window, { scene, mixer })`). Pass this expression to Playwright's
   `page.evaluate` as a string, so it runs in the page and not in Node (the
   `threejs-scene-setup` smoke script works), or ask the user to paste it into the browser
   console with `await` in front and report the output:

```js
(async () => {
  const before = window.mixer?.time ?? null;
  await new Promise((r) => setTimeout(r, 500));
  const meshes = [];
  window.scene.traverse((o) => { if (o.isMesh) meshes.push(o.name || o.type); });
  return { meshes: meshes.length, mixerAdvanced: before !== null && window.mixer.time > before };
})();
```

   Expect a non-zero mesh count and `mixerAdvanced: true`, then check a screenshot for scale
   and orientation.

## Pitfalls

- **The model loads but nothing displays** → PBR materials with no light or environment (see
  `threejs-materials-lighting`), or the scale is off by a factor of 100 (an export in
  centimeters). Log the bounding box from Pattern 1.
- **`gltf` is `undefined` outside the callback** → `load` is asynchronous. Use `loadAsync`, or
  assign shared references inside the callback.
- **The animation never moves** → `mixer.update` is not called every frame, receives
  milliseconds, or `play()` was never called.
- **404 for `draco_*` or `basis_*` files, or a decode error** → decoder files are not served,
  or come from a different three.js release. Serve the copies from the installed `three`
  package and point the loader at them.
- **`setKTX2Loader must be called before loading KTX2 textures`** or
  **`setMeshoptDecoder must be called before loading compressed files`** → the file uses
  `KHR_texture_basisu` or meshopt compression; attach the decoder (Pattern 4).
- **`.hasFeature() called before the backend is initialized`** → `KTX2Loader.detectSupport`
  ran on a `WebGPURenderer` before `await renderer.init()` finished.
- **Adding the same model twice moves it** → an `Object3D` has only one parent. Clone it, and
  use `SkeletonUtils.clone` for skinned meshes (see the reference).
- **Clones animate together, or only one moves** → a plain `.clone()` shares the skeleton;
  use `SkeletonUtils.clone` and a separate mixer per clone.
- **Named parts disappear after `gltf-transform optimize`** → the default flatten and join
  merged them. Rerun with `--flatten false --join-named false`.
- **Baked offsets conflict with runtime control** → exporters can bake scale or rotation into
  child nodes. First dump node names and local transforms; re-parent a part under a fresh
  `Object3D` for a clean pivot, or ask for a re-export with transforms applied.

## References

- Read [`references/loaders-and-animation.md`](references/loaders-and-animation.md) for a
  `LoadingManager` progress bar across multiple loaders, spawning many animated enemies with
  `SkeletonUtils.clone`, `AnimationAction` looping and blending detail, decoder hosting notes,
  and export checklists to hand an artist.

## Related skills

- `threejs-scene-setup`: renderer, camera, and loop.
- `threejs-materials-lighting`: lighting and environment so PBR models render correctly.
- `threejs-3d`: decorative 3D scenes for designers — a glTF loaded for marketing or a landing
  page belongs there instead.
- `create-game-assets`: briefing, sourcing, and checking the 3D assets themselves.
- `camera-systems`: framing and following the loaded model once it is in the scene.

## Version notes

Last checked: 2026-11-17, against three r187 (npm `three@0.187.0`, published 2026-10-30) and
`@gltf-transform/cli` 4.5.1.

- r185: `DRACOLoader` and `KTX2Loader` default to their bundled decoder folders;
  `DRACO_GLTF_CONFIG` added; `DRACOLoader.setDecoderConfig()` deprecated (removal planned for
  r194). r183: `KHR_meshopt_compression` supported alongside `EXT_meshopt_compression`. r181:
  `KTX2Loader.detectSupportAsync()` deprecated.
- gltf-transform 4.5.1 `optimize` defaults: `--compress meshopt`, `--flatten true`,
  `--join true`, `--join-named true`, `--simplify true`, `--texture-compress auto`.
  `--texture-compress ktx2` needs the `ktx` command from KTX-Software 4.4.0 or newer on the
  `PATH`.
- Sources: [r187 release notes](https://github.com/mrdoob/three.js/releases/tag/r187),
  [r187 DRACOLoader.js](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/loaders/DRACOLoader.js),
  [r187 GLTFLoader.js](https://github.com/mrdoob/three.js/blob/r187/examples/jsm/loaders/GLTFLoader.js),
  [glTF Transform CLI](https://gltf-transform.dev/cli), `npx @gltf-transform/cli optimize --help`.
