---
name: threejs-3d
description: >-
  Three.js/WebGL expert for designers — interactive 3D scenes, GLSL shaders,
  post-processing, generative canvas, 3D animations. Invoke from design-agent or
  ux-designer when the design requires a 3D experience, WebGL effects,
  particles, a generated background, or visual computing. Also invocable
  standalone. Triggers: "3D scene", "WebGL", "Three.js", "shader", "generative canvas",
  "particles", "post-processing", "bloom", "3D animated background", "R3F", "fiber",
  "GLSL", "3D visual effects".
model: claude-sonnet-5
user-invocable: true
argument-hint: "[scene|shader|postfx|canvas|r3f|quick <description>]"
type: specialized
priority: high
scope: frontend
dependencies: []
conflicts: []
---

# Three.js / WebGL Designer

Designs and implements 3D experiences and WebGL effects for designers and frontend developers.
Covers Three.js fundamentals up to advanced GLSL shaders and post-processing. Inspired by patterns
from [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills).

> **Boundary with `ux-designer`**: `ux-designer` designs 2D interfaces with micro-interactions.
> `threejs-3d` adds the Z dimension — 3D scenes, WebGL, shaders, real-time rendering.
> **Boundary with `animate`**: `animate` generates videos (HF LTX-Video). `threejs-3d` creates
> real-time interactive 3D experiences in the browser.

## Optional input (if invoked from `design-agent`)

If the scene's intent and context are provided:
- Skip Phase 1, go directly to Phase 2 with the data
- Return ready-to-use Three.js code

## Workflow

### Phase 1 — Context & Intent

Gather via AskUserQuestion if not provided:
```
Three.js / WebGL — Brief:

1. Experience type:
   [ ] Interactive 3D scene (navigable 3D object)
   [ ] Animated background / hero section (particles, procedural geometry)
   [ ] Custom shader (a visual effect on a texture or mesh)
   [ ] Post-processing (bloom, DOF, glitch, color grading)
   [ ] Generative 2D canvas (patterns, noise, algorithmic shapes)
   [ ] React Three Fiber (R3F) — React + 3D
   [ ] GLTF/GLB model loading

2. Framework: Vanilla JS / React (R3F) / Vue / Svelte

3. Target performance:
   [ ] Mobile-first (tight 60fps budget — avoid shadows, too many lights)
   [ ] Desktop (a more generous budget)
   [ ] Premium desktop (postprocessing, HDR, shadows)

4. Visual style: [describe or reference the Design DNA if available]

5. Duration/complexity: [a one-page demo / integration into an existing app]
```

### Phase 2 — Scene architecture

Define the structure based on the type:

#### Template — Base scene (foundation for every type)

```javascript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2 for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, 5);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  // [animation logic here]
  renderer.render(scene, camera);
}
animate();
```

#### Specializations by type

**A — Particle background / animated hero**

```javascript
// Particle system — BufferGeometry for performance
const particleCount = 2000;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 20;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  size: 0.05,
  color: 0xffffff,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true,
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// Animation — slow rotation
// In animate(): particles.rotation.y = elapsed * 0.05;
```

**B — Custom shader (ShaderMaterial)**

```javascript
const vertexShader = `
  varying vec2 vUv;
  varying float vElevation;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Wavy distortion
    pos.z += sin(pos.x * 3.0 + uTime) * 0.1;
    pos.z += sin(pos.y * 2.0 + uTime * 0.8) * 0.1;
    vElevation = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying float vElevation;
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;

  void main() {
    float t = (vElevation + 0.2) / 0.4; // normalize
    vec3 color = mix(uColorLow, uColorHigh, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uColorLow:  { value: new THREE.Color(0x0a0a2e) },
    uColorHigh: { value: new THREE.Color(0x4169e1) },
  }
});

// In animate(): material.uniforms.uTime.value = elapsed;
```

**C — Post-processing (EffectComposer)**

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// In animate(): composer.render(); instead of renderer.render()
```

**D — GLTF Model Loader**

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load('/models/scene.glb', (gltf) => {
  const model = gltf.scene;
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(model);

  // Model animations
  if (gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    // In animate(): mixer.update(delta);
  }
}, undefined, (error) => console.error(error));
```

**E — React Three Fiber (R3F)**

```jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import { useRef } from 'react';

function AnimatedSphere() {
  const meshRef = useRef();
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#4169e1" metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}
            gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <AnimatedSphere />
      <OrbitControls enableZoom={false} />
      <Environment preset="city" />
    </Canvas>
  );
}
```

### Phase 3 — Lighting

Lighting recipes by mood:

| Mood | Setup |
|----------|-------|
| Neutral studio | `AmbientLight(0.4)` + `DirectionalLight pos(5,10,5) intensity(1)` |
| Premium dark | `AmbientLight(0.1)` + `PointLight pos(0,5,0) color(#4169e1) intensity(2)` + rim `PointLight(-3,3,-3)` |
| Outdoor | `HemisphereLight(sky, ground, 0.6)` + `DirectionalLight(1.2) castShadow` |
| Neon | 3× `PointLight` accent colors (red/cyan/magenta), `AmbientLight(0.05)` |

### Phase 4 — Performance optimization

**Mandatory rules:**

```javascript
// 1. Cap the pixel ratio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Dispose of unused resources
geometry.dispose();
material.dispose();
texture.dispose();

// 3. Frustum culling enabled by default — don't disable it
mesh.frustumCulled = true;

// 4. Always BufferGeometry (never the deprecated Geometry)
// 5. Avoid shadows on mobile
if (isMobile()) renderer.shadowMap.enabled = false;

// 6. Share identical materials
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
// Used on N meshes without creating N materials

// 7. Avoid allocations in the animation loop
// ❌ const vec = new THREE.Vector3() inside animate()
// ✅ const vec = new THREE.Vector3() outside animate()
```

**Mobile budget:**
- Max 500 visible triangles at once
- No shadows (`shadowMap.enabled = false`)
- Max 1 dynamic light
- Post-processing disabled
- Pixel ratio capped at 1

### Phase 5 — User interactions

```javascript
// Raycasting — object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (e) => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// In animate():
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(interactiveObjects);
if (intersects.length > 0) {
  intersects[0].object.material.color.set(0xff0000); // hover
}

// OrbitControls — camera navigation
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // smooth inertia
controls.dampingFactor = 0.05;
controls.enableZoom = false;        // disable if the page scrolls
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
// In animate(): controls.update();
```

### Phase 6 — Accessibility & Graceful degradation

```javascript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Stop automatic animations, keep interaction
  controls.autoRotate = false;
  // Reduce or disable animated shaders
  material.uniforms.uSpeed = { value: 0 };
}

// Fallback if WebGL isn't supported
if (!renderer.capabilities.isWebGL2) {
  document.getElementById('canvas-fallback').style.display = 'block';
  document.getElementById('canvas-container').style.display = 'none';
}

// aria-hidden on the canvas (decorative)
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.domElement.setAttribute('tabindex', '-1');
```

### Phase 7 — Conditional persistence

- **If invoked from `design-agent`**: return the code in Markdown — don't write a file.
- **If invoked standalone**:
  1. Write `design/threejs-3d/YYYY-MM-DD_<scene-slug>.html` (self-contained) or `.js` depending on
     the need.

### Phase 8 — Memory

> ⚠️ Skip if invoked from `design-agent`.

Record in `<project>/.claude/design-knowledge.md`:
- Scene type and stack used
- Implemented shaders/effects
- Chosen performance budget (mobile/desktop/premium)
