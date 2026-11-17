# three.js scene graph, cameras, and cleanup (r150+)

A deeper look behind the scene-setup skill: coordinate conventions, the `Object3D` hierarchy,
the orthographic camera, resource disposal, and resolution budget.

Contents:

- Coordinates and conventions
- The Object3D hierarchy
- PerspectiveCamera vs OrthographicCamera
- Disposing resources (avoiding leaks)
- Stopping and restarting the loop
- Render on demand
- Adaptive resolution

## Coordinates and conventions

- Right-handed coordinate system: **+X right, +Y up, +Z toward the viewer**. A fresh
  `PerspectiveCamera` looks down **-Z**.
- Rotations are in **radians** (except `PerspectiveCamera`'s `fov`, which is in degrees). Use
  `THREE.MathUtils.degToRad(deg)` when reasoning in degrees.
- Units are arbitrary but stay consistent. glTF models are authored in meters; pick a scale
  and stick to it across the project.

## The Object3D hierarchy

Every visual thing (`Mesh`, `Group`, `Camera`, `Light`) extends `Object3D` and has `position`,
`rotation`, `quaternion`, and `scale`. Children inherit their parent's transform.

```js
import * as THREE from 'three';

const turret = new THREE.Group();         // empty transform node
turret.add(barrelMesh);                   // child, positioned relative to turret
scene.add(turret);
turret.rotation.y = Math.PI / 4;          // rotates the whole group

barrelMesh.removeFromParent();            // detach (r129+)
scene.add(barrelMesh);                    // re-parent to the scene root
```

Useful traversal/lookup helpers:

```js
scene.getObjectByName('Player');          // first descendant with that .name
root.traverse((obj) => { /* visit every descendant */ });
obj.getWorldPosition(new THREE.Vector3()); // world-space position
```

Avoid scaling the parents of physics/gameplay objects: a non-unit parent scale compounds
through children and makes world-space math (raycasts, distances) unreliable.

## PerspectiveCamera vs OrthographicCamera

- **PerspectiveCamera(fov, aspect, near, far)** — objects shrink with distance. The default
  for 3D. Keep `near`/`far` as tight as the scene allows; a huge far/near ratio destroys
  depth precision (z-fighting).
- **OrthographicCamera(left, right, top, bottom, near, far)** — no perspective; good for
  2.5D, isometric, or CAD-style views. Size the frustum to the aspect ratio:

```js
const aspect = window.innerWidth / window.innerHeight;
const d = 5;
const cam = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
// On resize, recompute left/right from the new aspect, then updateProjectionMatrix().
```

After changing a projection property (`aspect`, `fov`, frustum extents, `zoom`), call
`camera.updateProjectionMatrix()`.

## Disposing resources (avoiding leaks)

three.js cannot reclaim GPU memory on the developer's behalf. Removing an object from the
scene frees nothing on the GPU; geometries, materials, and textures must be disposed
explicitly.

```js
// Disposes everything under obj. Skip geometries/materials/textures still shared by other
// objects, or they will be re-uploaded (or break) on the next frame.
function disposeObject(obj) {
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of materials) {
      if (!mat) continue;
      for (const key of Object.keys(mat)) {
        const value = mat[key];
        if (value && value.isTexture) value.dispose(); // map, normalMap, etc.
      }
      mat.dispose();
    }
    if (node.isSkinnedMesh) node.skeleton.dispose();    // bone texture
    node.dispose();   // Object3D.dispose() (r186+): shadow maps, instancing buffers
  });
  obj.removeFromParent();
}
```

`Object3D.dispose()` is present on every object since r186 (before that, only lights,
`InstancedMesh`, and `BatchedMesh` had it — guard with `node.dispose?.()` on older versions).
The base method frees no geometry, material, or texture; that stays manual (`BatchedMesh` is
the exception: it owns and disposes its own geometry).

Also dispose render targets (`renderTarget.dispose()`) and, for a full teardown, the renderer
(`renderer.dispose()`). When changing levels, dispose the old level's subtree before loading
the next one, or memory grows with every transition.

## Stopping and restarting the loop

`renderer.setAnimationLoop(fn)` starts the loop; `setAnimationLoop(null)` stops it (e.g. when
the tab is hidden via the Page Visibility API, or a menu is open). This is also the loop
required by WebXR — `requestAnimationFrame` does not drive XR frames.

## Render on demand

For static scenes or editors, a continuous loop is not needed. Render only when something
changes (input, a controls `change` event, a tween step):

```js
let needsRender = true;
controls.addEventListener('change', () => { needsRender = true; });
renderer.setAnimationLoop(() => {
  controls.update();          // keeps damping active; emits 'change' while moving
  if (!needsRender) return;
  needsRender = false;
  renderer.render(scene, camera);
});
```

This drastically cuts GPU/battery use for non-animated content.

## Adaptive resolution

The pixel ratio is a fill-rate budget: a ratio of 2 draws four times the pixels of a ratio of
1 at the same CSS size. Lowering it helps when the GPU is the bottleneck, not when the
simulation is.

To adapt it at runtime:

- Measure several seconds of frame time after assets have loaded and shaders have warmed up.
  Ignore hidden-tab intervals and loading stalls.
- If sustained GPU pressure exceeds the budget, lower the ratio in steps of 0.25 down to a
  chosen floor (for example 1). Never exceed the device ratio or the user's own setting.
- Wait for a settling period and use a separate, higher resume threshold before raising it
  again, or the ratio oscillates.
- Reapply the chosen ratio when the display or `devicePixelRatio` changes, and resize render
  targets and post-processing buffers to match the renderer.
