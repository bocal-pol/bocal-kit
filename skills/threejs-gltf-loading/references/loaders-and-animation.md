# three.js glTF: loader, compression, and animation detail (r187)

A deeper look behind the glTF skill: combining decoders, async loading with progress, cloning
skinned meshes, and export hygiene. Notes flag where older versions differ.

Contents:

- Compression: DRACO, Meshopt, KTX2 (hosting decoder files, version matching)
- Async loading with a progress bar
- Reusing a model multiple times (`SkeletonUtils.clone`, `InstancedMesh`)
- AnimationMixer detail
- Export hygiene (Blender → glTF)

## Compression: DRACO, Meshopt, KTX2

A production glTF pipeline often compresses geometry (DRACO or Meshopt) and textures
(KTX2/Basis). Loader setup is Pattern 4 of `SKILL.md`; these notes cover hosting and version
matching:

- If the default files 404 (some bundler/hosting setups do not serve them), copy
  `examples/jsm/libs/draco/` and `examples/jsm/libs/basis/` from the installed `three`
  package into its static assets and call `draco.setDecoderPath('/decoders/draco/')` and
  `ktx2.setTranscoderPath('/decoders/basis/')`. A pinned CDN folder such as
  `https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/` also works; on
  versions before r185, one of these paths is required.
- Decoder/transcoder files must match the three.js version; a mismatch throws an error at
  load time.
- `ktx2.detectSupport(renderer)` requires the renderer to exist first. With `WebGPURenderer`,
  do `await renderer.init()` before calling it (`detectSupportAsync()` has been deprecated
  since r181).
- `DRACOLoader.setDecoderConfig()` has been deprecated since r185; the loader picks WASM or
  JS itself.
- Compression shrinks downloads but adds CPU/Worker decode time; measure both.

## Async loading with a progress bar

```js
import { LoadingManager } from 'three';

const manager = new LoadingManager();
manager.onProgress = (url, loaded, total) => {
  setBarWidth(`${(loaded / total) * 100}%`);
};
manager.onLoad = () => hideLoadingScreen();

const loader = new GLTFLoader(manager);

// Promise form — clean with async/await and Promise.all for several assets.
const [hero, level] = await Promise.all([
  loader.loadAsync('assets/hero.glb'),
  loader.loadAsync('assets/level.glb'),
]);
scene.add(hero.scene, level.scene);
```

A `LoadingManager` aggregates progress from every loader that shares it, so a single bar can
cover models, textures, and audio.

## Reusing a model multiple times

Adding the same `gltf.scene` to the scene twice does not duplicate it — it moves it. To place
several instances of an animated character, clone with `SkeletonUtils` so the skinned mesh and
its skeleton clone correctly (a plain `.clone()` does not duplicate the skeleton):

```js
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const enemy = await loader.loadAsync('assets/enemy.glb');
const mixers = [];
for (let i = 0; i < 10; i++) {
  const instance = skeletonClone(enemy.scene);
  instance.position.x = i * 2;
  scene.add(instance);
  const mixer = new THREE.AnimationMixer(instance);   // each clone needs its own mixer
  mixer.clipAction(enemy.animations[0]).play();       // clips can be shared
  mixers.push(mixer);
}
// In the loop: for (const m of mixers) m.update(dt);
```

For static meshes (non-skinned), prefer `InstancedMesh` for thousands of copies — it draws
them in a single call.

## AnimationMixer detail

- One `AnimationMixer` per animated root object; create every `AnimationAction` from that
  mixer (`mixer.clipAction(clip)`).
- `action.play()` starts it; `action.stop()`/`action.reset()` rewind it.
- Looping: `action.setLoop(THREE.LoopRepeat)` (default) or `THREE.LoopOnce` with
  `action.clampWhenFinished = true` to hold the final pose.
- `action.timeScale` speeds up/slows down a clip; `action.weight` blends two playing clips
  (e.g. walk↔run based on speed).
- Blend transitions with `from.crossFadeTo(to, duration, warp)` or
  `to.crossFadeFrom(from, duration, warp)`.
- Listen for the end: `mixer.addEventListener('finished', (e) => {...})`.

Always advance with real time: call `timer.update()` then `mixer.update(timer.getDelta())`
in the loop (`THREE.Timer`; `Clock` has been deprecated since r183).

## Export hygiene (Blender → glTF)

Most "the model looks broken" problems are authoring issues, not loader bugs:

- **Apply transforms** before export (Object → Apply → All Transforms) so nodes have
  identity position/rotation/scale; otherwise baked-in offsets conflict with runtime control.
- **One clean root.** Aim for a single root `Object3D` with no transform and meaningful child
  names, so parts can be cheaply re-parented to the scene.
- **Author in meters**, at real-world scale. Avoid scaling parents.
- **Name nodes and clips** — they will be looked up by name (`getObjectByName`,
  `AnimationClip.findByName`).
- Prefer `.glb` (single binary file) for the web; it bundles geometry, textures, and
  animation into one request.
