# Profiling and budgets

Targets Godot 4.7, Unity 6.3 LTS, and Unreal 5.8.

Content:
1. CPU-vs-GPU triage
2. Per-engine profiler quick start (Godot, Unity, Unreal, external tools)
3. Pooling manager
4. Batching and instancing rules
5. Allocation and GC advice
6. Do-less techniques
7. Asset budgets and mobile thermals

## 1. CPU-vs-GPU triage (decide before fixing)

```text
1. Read total frame time vs. budget (16.67 ms @60).
2. Compare CPU and GPU frame time:
     GPU >> CPU  → GPU-bound  → overdraw, shader cost, resolution, lights/shadows.
     CPU >> GPU  → CPU-bound  → inspect BOTH the main and render threads: scripts, physics,
                                pathfinding, allocations/GC, render submission, state changes.
     Both high / alternating → find the per-frame spike in the timeline (one function/system).
3. Within the limiting side, sort costs descending and attack only the top one.
4. Remeasure. If frame time didn't move, the wrong thing was fixed — revert and re-sort.
```

Optimize the measured bottleneck. Cutting draw calls or state changes can lower CPU render cost
when submission limits the frame, even if the GPU has headroom. Batching and instancing also
have costs, so compare main-thread, render-thread, and GPU time before and after the change.
Faster scripts alone generally won't help a frame limited by GPU work.

## 2. Per-engine profiler quick start

**Godot 4.7**
- Editor: **Debugger ▸ Profiler** (script + physics time per function, frame time),
  **Debugger ▸ Visual Profiler** (CPU and GPU time spent rendering — the Profiler tab doesn't
  show GPU cost), and the **Monitors** tab (FPS, draw calls, video/static memory, object/node
  counts).
- Code: `Performance.get_monitor(Performance.TIME_PROCESS)` (the slowest process frame of the
  last second, in **seconds**, refreshed once per second), `Performance.TIME_PHYSICS_PROCESS`,
  `Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME`,
  `Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME`, `Performance.MEMORY_STATIC`, and the
  `PIPELINE_COMPILATIONS_*` monitors (4.4+) for shader hitches: a jump in Surface or Draw counts
  outside a loading screen is a first-pass stutter.
- Visual debugging: 3D viewport overlays **View Information / View Frame Time**.
- Native-code traces: an engine built from source with `scons profiler=tracy` (or `perfetto`,
  `instruments`) streams engine zones to that profiler.

**Unity 6.3 LTS**
- **Profiler** window: CPU Usage, GPU Usage, Rendering, Memory modules. Use **Deep Profile**
  sparingly (high overhead, skews the numbers).
- **Frame Debugger** to step through draw calls and see what breaks batching (SetPass calls,
  batches).
- Code: `ProfilerRecorder` on the built-in counters `"CPU Main Thread Frame Time"`,
  `"GPU Frame Time"` (release players need **Frame Timing Stats** enabled) and
  `"GC Allocated In Frame"` (development players only) for an in-build HUD/CSV;
  `FrameTimingManager` for CPU/GPU frame times.
- **Profile a Development build on-device** (`Autoconnect Profiler`), not just the editor.
- **Project Auditor** (`com.unity.project-auditor` package) statically flags expensive code and
  settings before you profile.

**Unreal 5.8**
- Console: `stat unit` (ms Frame / Game / Draw / RHIT / GPU — Game is the game thread, Draw the
  render thread, both CPU), `stat fps`, `stat scenerendering` (draw calls, primitives),
  `stat game`, `stat gpu`, `stat hitches` (logs frames over `t.HitchFrameTimeThreshold`).
- **Unreal Insights** for full timeline traces; `ProfileGPU` (Ctrl+Shift+,) for a GPU breakdown.

**External tools (engine-agnostic)**
- **RenderDoc**: GPU frame capture for Vulkan, D3D11/12, and OpenGL/ES on Windows, Linux, and
  Android; no Metal. On Apple platforms use Xcode's Metal debugger and Instruments; on Windows
  D3D12, PIX.
- **Tracy**: instrumented CPU/GPU timeline for native code; keep the client library and viewer
  on the same version, since the network protocol can change.

## 3. Pooling manager (generic)

```text
class Pool<T>:
    free: list
    create_fn, reset_fn
    prewarm(n):  for n → free.push(create_fn())          # allocate ahead, off the hot path
    acquire():   t = free.pop() or create_fn(); activate(t); return t
    release(t):  reset_fn(t); deactivate(t); free.push(t)  # never destroy; recycle
```

Pool anything spawned frequently and briefly: projectiles, shell casings, particles, damage
numbers, wave enemies, one-shot audio. Prewarm on load to avoid first-use hitches. Cap the pool
and decide an overflow policy (grow, or recycle the oldest).

## 4. Batching and instancing rules

- **What breaks a batch:** a different material, texture, or render state between objects.
  Share materials and **atlas** textures so runs of objects submit in a single draw call.
- **Identical meshes, many instances** → GPU instancing: Unity (enable *GPU Instancing* on the
  material — but under URP/HDRP a SRP Batcher-compatible shader is drawn by the SRP Batcher
  instead; for large counts enable the **GPU Resident Drawer**, which needs the Forward+ path
  and a compute-capable graphics API other than OpenGL ES) / Godot `MultiMesh` +
  `MultiMeshInstance2D/3D` / Unreal Instanced Static Mesh or Hierarchical ISM.
- **Static geometry** → static batching (Unity), mark static; bake when possible. Unity's
  dynamic batching is no longer recommended outside low-end devices: its CPU cost can exceed
  the draw calls saved.
- **2D** → texture atlases + a shared material batches sprites; avoid per-sprite materials.
- **UI** → minimize canvas rebuilds (Unity: separate static/dynamic canvases); one changing
  element shouldn't dirty the whole canvas.
- **Lights/shadows** → bake static lighting; cap real-time shadow casters; cull small shadows.

## 5. Allocation / GC advice

- **C# (Unity):** no `new` per frame, no LINQ in `Update`, avoid boxing (e.g. an `enum` as a
  dictionary key), use `NonAlloc` physics queries, reuse `List`/arrays (`Clear()` not
  reallocation), prefer structs for small hot data, cache `GetComponent`/`Find` results. The
  goal is **0 B of GC.Alloc per frame** at steady state.
- **GDScript (Godot):** don't build new `Array`/`Dictionary` every `_process`; reuse; prefer
  typed arrays; avoid heavy work in `_process` that belongs on a timer/signal.
- **General:** strings are a classic hidden allocator (concatenation, formatting) — build them
  rarely, cache results.

## 6. Do-less techniques (algorithmic wins)

- **Run less often:** update expensive AI/HUD/controls on a timer or every N frames, not every
  frame; spread work across frames (time-slicing).
- **Spatial partitioning:** grid/quadtree/octree so queries only touch nearby objects, not all N.
- **LOD and culling:** less detail at distance; frustum/occlusion culling; disable far
  off-screen entities.
- **Cache results:** memoize pathfinding, line of sight, and derived data; invalidate on change.
- **Defer/amortize:** spread procedural generation and loading across several frames to avoid
  spikes.

## 7. Asset budgets (prevent regressions at the source)

| Asset | Typical desktop budget | Mobile budget | Notes |
|-------|------------------------|---------------|-------|
| Max texture size | 2048–4096 | 1024–2048 | use mipmaps; compress (BCn / ASTC) |
| Character triangles | 30k–80k | 5k–20k | LODs for distance |
| Draw calls / frame | a few thousand | a few hundred | the count that matters most on mobile |
| Real-time lights | a few | 1–2 + baked | bake the rest |
| Audio | streamed music, short SFX in memory | same | don't decompress everything on load |

Mobile adds **thermal throttling**: a game that hits 60 FPS for two minutes then drops is
overheating. Keep headroom, cap the framerate, and reduce sustained GPU load. The agent can't
feel a device heat up, so ask the user to play 15 minutes on the target phone and report frame
time (or FPS counter) in the first and last minute.
