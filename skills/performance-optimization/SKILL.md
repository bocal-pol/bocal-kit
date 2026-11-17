---
name: performance-optimization
description: "Find and fix framerate problems by measurement in Godot, Unity, Unreal, or Roblox: CPU- vs. GPU-bound, then the single biggest fix (draw calls, pooling, GC spikes). Auto-invoke for low FPS, stutter, a first-use hitch, or requests to optimize or profile. Not for build size (`unity-build-size`), physics jitter (`physics-tuning`), or network lag (`roblox-networking`, `godot-multiplayer`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Performance optimization

The loop: **set a budget, measure, find the single bottleneck, fix it, remeasure, report the
numbers.** Guesses usually target the wrong system, so nothing changes until a profiler or a
frame-time capture says where the time is going. This skill is the cross-engine method and the
recurring fixes; each engine's profiler is listed below and in the reference.

> Adapted and translated from the `performance-optimization` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Framerate is low or uneven, or a target (60 FPS desktop, 30 or 60 on mobile) is missed.
- Hitches: first-time effects, in-game loading, periodic GC pauses, big fights.
- Deciding what to optimize, setting budgets, or adding a performance check to CI.

**Not this skill**: physics stability (`physics-tuning`), install or download size
(`unity-build-size`), network latency (`roblox-networking`, `godot-multiplayer`), shader math
(`shader-programming`).

## Main workflow

1. **Turn the complaint into a number.** The target FPS gives the budget: 60 FPS = 16.67 ms, 30
   = 33.3 ms, 120 = 8.33 ms. Find a reproducible worst-case scene and save it (a test level, a
   recorded input, a fixed seed).
2. **Uncap before measuring.** VSync and frame caps hide headroom: a 4 ms frame and a 15 ms
   frame both show 60 FPS. Godot `--disable-vsync` (and `--max-fps 0`); Unity
   `QualitySettings.vSyncCount = 0` with `Application.targetFrameRate = -1` on desktop; Unreal
   `r.VSync 0` and `t.MaxFPS 0`. Then read frame time in ms, not FPS.
3. **Profile a near-release build on target hardware.** Editor and debug builds add overhead and
   skip compiler optimization; use a Godot release export, a Unity Development build with the
   profiler attached, or an Unreal Development or Test build.
4. **Separate CPU and GPU.** Compare main-thread time, render-thread time, and GPU time. The side
   closer to the frame time is the bottleneck; fixing the other side changes nothing.
5. **Fix the single biggest cost**, preferring to do less work (cache, spatially partition, run
   less often) over polishing a hot line. Then apply the matching fix below.
6. **Remeasure the same scene on the same machine**, three runs each, and keep or revert based on
   the numbers.
7. **Set budgets** per subsystem and per asset so the fix stays fixed, and add a frame-time check
   to CI where the engine allows it.
8. **Report** the scene, hardware, build type, before and after (mean and p95 or p99 frame time),
   the bottleneck, and the fix. State what was measured headless or in the editor and what still
   needs the user's device.

## Patterns

### 1. Frame budget breakdown

```text
@60 FPS = 16.67 ms. The slower of CPU and GPU frame time sets the framerate.
Example sub-budgets: gameplay/scripts ~5 ms · physics ~3 ms · render submission ~4 ms · UI ~2 ms · headroom.
Mobile: keep 20-30% headroom so the game survives thermal throttling.
```

### 2. Where each engine reports the breakdown

```text
Godot 4.7     : Debugger > Profiler (script and physics), Visual Profiler (CPU vs. GPU render
                time per pass), Monitors (FPS, draw calls, memory, pipeline compiles).
                Performance.get_monitor(TIME_PROCESS) is the worst frame of the last second in
                SECONDS, refreshed once per second; time frames yourself for per-frame spikes.
Unity 6.3 LTS : Profiler window + Frame Debugger. ProfilerRecorder on "CPU Main Thread Frame Time"
                and "GPU Frame Time" (release players need Frame Timing Stats enabled in
                Player Settings).
Unreal 5.8    : stat unit (Frame / Game / Draw / RHIT / GPU), stat scenerendering (draw calls),
                Unreal Insights; `csvprofile frames=600` writes a readable CSV capture.
Roblox        : MicroProfiler (Ctrl+F6 in Studio and the desktop client; mobile via its web UI).
# Game and Draw are CPU threads; GPU is the graphics card. Whichever is closest to Frame wins.
```

**Roblox:** profile on a mid-range phone, since a capped desktop hides the problem. With Studio
Assistant, Roblox's built-in `rbx-perf-profiling` (reads MicroProfiler captures) and
`rbx-scene-analysis` (render cost, memory, leaked instances) give real data; use
`roblox-studio-workflow` to run the checks in Studio, `roblox-physics` for assembly and
simulation cost, and `roblox-networking` when "lag" means network delay rather than frame time.

### 3. Headless CPU frame-time check (Godot)

```gdscript
# tools/frame_stats.gd: CPU frame time of a scene, headless (no GPU work is measured).
# godot --headless --path . --script res://tools/frame_stats.gd -- res://levels/worst.tscn 600 16.6
extends SceneTree

func _initialize() -> void:
    var args := OS.get_cmdline_user_args()
    var scene_path := args[0] if args.size() > 0 else "res://main.tscn"
    var frames := int(args[1]) if args.size() > 1 else 600
    var budget_ms := float(args[2]) if args.size() > 2 else 16.6
    OS.low_processor_usage_mode_sleep_usec = 0          # headless sleeps ~6.9ms per frame otherwise
    root.add_child(load(scene_path).instantiate())
    for i in 60:                                       # skip loading and first-time spikes
        await process_frame
    var ms := PackedFloat64Array()
    var last := Time.get_ticks_usec()
    for i in frames:
        await process_frame
        var now := Time.get_ticks_usec()
        ms.append((now - last) / 1000.0)               # whole frame: scripts, physics, engine
        last = now
    ms.sort()
    var avg := 0.0
    for v in ms:
        avg += v / ms.size()
    var p95 := ms[int(ms.size() * 0.95)]
    var p99 := ms[int(ms.size() * 0.99)]
    var over := ms.size() - ms.bsearch(budget_ms, false)
    print("FRAME avg=%.2fms p95=%.2fms p99=%.2fms max=%.2fms over_budget=%d/%d"
            % [avg, p95, p99, ms[-1], over, ms.size()])
    quit(1 if p95 > budget_ms else 0)
```

Exits with 1 when p95 exceeds the budget, so it can gate CI for script and physics cost. Headless
mode has no renderer, so it says nothing about GPU time or draw calls; for that, ask the user to
run the game with `--disable-vsync --print-fps` or open the Visual Profiler and report CPU and
GPU ms for the same scene. A shared or loaded machine adds noise, so compare runs on a single
machine.

### 4. Object pooling (stop allocating and freeing in hot loops)

```gdscript
var _pool: Array[Node2D] = []                     # Node3D for 3D; both have `visible`
func acquire() -> Node2D:
    var n: Node2D = _pool.pop_back() if not _pool.is_empty() else bullet_scene.instantiate()
    n.set_process(true); n.visible = true
    return n
func release(n: Node2D) -> void:
    n.set_process(false); n.visible = false       # disable + hide; don't free
    _pool.append(n)
# Prewarm on load. Also reset velocity, timers, and signal connections on release.
```

### 5. Cutting draw calls and state changes

```text
- Atlas textures and shared materials so sprites and meshes batch.
- Identical meshes: GPU instancing (Unity; under URP/HDRP the SRP Batcher or GPU Resident
  Drawer takes over), MultiMesh/MultiMeshInstance (Godot), Instanced Static Mesh (Unreal).
- Static geometry: static batching or baking. Bake lighting that doesn't move.
- Overdraw: fewer large transparent layers and overlapping particles.
- Fill-rate bound: lower render resolution or scale (a 2x pixel ratio = 4x the pixels).
Measure draw calls and GPU ms before and after; both should drop.
```

### 6. Killing per-frame allocations (GC spikes are periodic hitches)

```csharp
// Unity 6.3 LTS. Steady state should be 0 B "GC Allocated In Frame".
void Update() {
    _hits = Physics.RaycastNonAlloc(ray, _hitBuffer);   // reuses a preallocated array
    for (int i = 0; i < _hits; i++) { /* ... */ }
}   // hit order isn't defined and a full buffer can miss the closest hit: size it, sort if needed
// No LINQ, string building, or FindObjectsByType in Update. Cache references once.
// GDScript: reuse Arrays/Dictionaries instead of building new ones every _process.
```

## Pitfalls

- **Measuring with VSync on.** Framerate locks to the refresh rate until already over budget, so
  fixes look like they did nothing. Uncap, then read the ms.
- **Reading `TIME_PROCESS` every frame under Godot.** It's the worst frame of the last second,
  updated once per second, so per-frame samples repeat a value. Time frames directly.
- **Shader and pipeline compile hitches** the first time an effect, enemy, or material appears,
  often gone on the second pass because the driver cached it. Godot 4.4+: watch the pipeline
  compile monitors, load features early, and keep hidden instances of effects spawned in the
  scene. Unity 6: trace and prewarm PSOs with `GraphicsStateCollection` (experimental) or
  prewarm shader variants on older APIs. Unreal: PSO precaching and a bundled PSO cache.
- **Thermal throttling on phones**: 60 FPS for two minutes, then a drop. Ask the user to run a
  15-minute session on the device and report frame time at the start and the end; cap the
  framerate and keep headroom.
- **Unity Android and iOS run at 30 FPS by default** (`targetFrameRate = -1`). Set
  `Application.targetFrameRate` deliberately before calling it a performance problem.
- **Fixing the wrong side.** CPU micro-optimizations do nothing for a GPU-bound frame, and vice
  versa.
- **Instantiating and freeing in hot loops** causes fragmentation and GC spikes. Pool them.
- **Unity's "Enable GPU Instancing" having no effect** under URP/HDRP: the SRP Batcher takes
  priority for compatible shaders. Check the Frame Debugger; for many identical meshes use the
  GPU Resident Drawer (Forward+, compute-capable API, not OpenGL ES).
- **Deep Profile or editor numbers reported as results.** Both distort timings; cite a build.
- **No budgets.** Without ms per subsystem and asset caps, performance regresses silently.
- **Optimizing a prototype** before it's fun or measured adds complexity that may get thrown
  away.

## References

- [`references/profiling-and-budgets.md`](references/profiling-and-budgets.md): read for a
  per-engine profiler guide, CPU-vs-GPU triage steps, a generic pool with prewarm and overflow
  policy, per-engine batching and instancing rules, allocation rules for C# and GDScript,
  do-less techniques (LOD, culling, time-slicing), or starting asset budgets.

## Related skills

- `physics-tuning`: fixed-step cost, sleeping bodies, broadphase layers.
- `shader-programming`: per-pixel cost of an effect; `godot-shaders` for Godot shader compiles.
- `godot-export`, `unity-build-pipeline`, `unreal-packaging`: building the release build to
  profile.
- `procedural-gen`, `game-ai`: common CPU hotspots (generation, pathfinding) to defer or slice.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `TIME_PROCESS` and `TIME_PHYSICS_PROCESS` are per-second maxima; headless sleeps
  `low_processor_usage_mode_sleep_usec` per frame; CLI `--disable-vsync`, `--max-fps`,
  `--print-fps`. Pipeline precompilation and its monitors arrived in 4.4, the shader baker in
  4.5. The frame-time script ran on 4.7.2 headless.
- Unity 6.3: `targetFrameRate` defaults and the 30 FPS mobile default;
  `GraphicsStateCollection` is experimental.
- Unreal: PSO precaching; `csvprofile`.
- Roblox: MicroProfiler shortcuts and mobile web UI; built-in Assistant skills
  `rbx-perf-profiling` and `rbx-scene-analysis`.
- RenderDoc 1.47 (2026-10-31), Tracy 0.15.0 (2026-11-05), Unity Project Auditor package 3.2.0
  (2026-11-03).
