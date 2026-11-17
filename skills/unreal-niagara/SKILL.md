---
name: unreal-niagara
description: "Niagara VFX for Unreal Engine 5 (UE 5.8): systems, emitters, User parameters, spawning from C++ or Blueprints, bounds, and GPU vs. CPU simulation. Auto-invoke for any Unreal particle effect, an NS_ asset, a muzzle flash or impact, or an effect that doesn't show, vanishes at the screen edge, or never stops. Not for Unity's VFX Graph, shader writing (`shader-programming`), or hit-stop (`game-feel`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unreal Niagara VFX

Build UE5 effects that gameplay can spawn, drive, and clean up, and that keep rendering wherever
the camera actually looks. Targets **UE 5.8**. Niagara replaced Cascade, now deprecated.

> Adapted/translated from the skill `unreal-niagara` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Create or edit Niagara Systems (`NS_`) and Emitters (`NE_`), module order, User parameters,
  renderers, bounds, and scalability.
- Spawn, attach, parameterize, pool, or stop effects from C++ or Blueprints.
- Debug effects that don't show up, get wrongly culled, leak, or cost too much.

**Not this skill**: Unity's VFX Graph or other engines' particles aren't covered here. Material
and shader logic → `shader-programming`. Juice like screen shake and hit-stop → `game-feel`.
Effect audio → `audio-design`.

## Main workflow

1. **Read the project.** Check `EngineAssociation`, list existing `NS_*`/`NE_*` assets and
   emitter templates, and grep `Source` for `UNiagaraComponent` to find the spawn path already in
   use. C++ access needs `"Niagara"` in the module's `*.Build.cs`; without it, includes compile
   and linking fails.
2. **Expose what gameplay changes as User parameters.** Only the `User` namespace can be set from
   Blueprint or C++; `System`, `Emitter`, and `Particle` values are internal to the simulation.
3. **Order modules deliberately.** Modules run top to bottom within each stage, so a force placed
   before the module that initializes velocity acts on zero.
4. **Choose the simulation target.** Default to CPU for small counts and anything gameplay reacts
   to (events, collision callbacks); GPU for large, purely visual counts, giving GPU emitters
   fixed bounds.
5. **Spawn from gameplay, never from the Construction Script.**
   `UNiagaraFunctionLibrary::SpawnSystemAtLocation` for world-space one-shots,
   `SpawnSystemAttached` for effects that follow a component or socket. For frequent one-shots
   (impacts, footsteps), use a pooling method rather than creating a component each time.
6. **Own the lifecycle.** One-shots use a non-looping system with auto-destroy or auto-release;
   looping effects keep the returned component and call `Deactivate()` when done.
7. **Verify (see Verify).**

## Patterns

### Pooled one-shot impact and a driven looping effect

```cpp
#include "NiagaraFunctionLibrary.h"
#include "NiagaraComponent.h"

void AProjectile::SpawnImpact(const FVector& Location, const FRotator& Rotation)
{
    // ImpactSystem: UPROPERTY(EditAnywhere) TObjectPtr<UNiagaraSystem>, non-looping.
    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
        GetWorld(), ImpactSystem, Location, Rotation, FVector(1.f),
        /*bAutoDestroy*/ true, /*bAutoActivate*/ true, ENCPoolMethod::AutoRelease);
    // With AutoRelease the component returns to the pool once finished:
    // don't keep the returned pointer.
}

void ATorch::BeginPlay()
{
    Super::BeginPlay();
    Fire = UNiagaraFunctionLibrary::SpawnSystemAttached(   // Fire: UPROPERTY TObjectPtr<UNiagaraComponent>
        FireSystem, RootComponent, NAME_None, FVector::ZeroVector, FRotator::ZeroRotator,
        EAttachLocation::KeepRelativeOffset, /*bAutoDestroy*/ false);
    if (Fire)                                              // null on server or if pre-culled
    {
        Fire->SetVariableFloat(TEXT("SpawnRate"), 250.f);  // the User.SpawnRate parameter
        Fire->SetVariableLinearColor(TEXT("FireColor"), FLinearColor::Red);
    }
}
```

Blueprints use the same nodes: Spawn System at Location or Spawn System Attached, then Set
Niagara Variable (Float, LinearColor, etc.) on the returned component.

## Verify

Say which of these checks actually ran.

1. **Compile** the module (`Build.bat`/`Build.sh` as in `unreal-cpp-gameplay`).
2. **Validate assets**: `UnrealEditor-Cmd <Project>.uproject -run=DataValidation -unattended`
   and fix errors in the touched systems.
3. **Functional test for gameplay-spawned effects**: spawn the system on a test map, verify the
   returned component is valid and active, then (for a one-shot) that it has finished after its
   lifetime. Niagara needs rendering, so run it with `-RenderOffscreen` rather than `-nullrhi`:
   `UnrealEditor-Cmd <Project>.uproject -ExecCmds="Automation RunTest Project.Functional Tests;Quit" -unattended -RenderOffscreen -ReportExportPath="<dir>"`.
4. **Ask the user** to run PIE and use the Niagara Debugger (Tools > Debug > Niagara Debugger) or
   the console: `fx.Niagara.Debug.Hud Enabled=1` for the debug HUD,
   `fx.Niagara.DumpComponents` to list live components in the log, `stat Niagara` for cost. Ask
   them to report whether the effect shows up, whether it vanishes when its origin leaves the
   screen (bounds), and the number of active components after a minute of play (leaks).
5. **Optional**: Epic's `unreal-mcp` skill can create and inspect Niagara systems in a running
   editor when installed; the checks above don't need it.

## Pitfalls

- **Setting a parameter does nothing** → it's not in the `User` namespace, or the name passed to
  `SetVariable*` doesn't match exactly.
- **Crash on the returned component** → spawn functions return `nullptr` when there's no system
  asset, on a dedicated server, or when scalability pre-culls the effect. Check for null before
  use.
- **The effect vanishes when its origin leaves the screen** → bounds are too small or dynamic
  bounds were never computed. GPU emitters need fixed bounds set on the emitter or system.
- **A looping effect never stops or components pile up** → spawned with auto-destroy off and
  never deactivated, or the system loops when it should be one-shot.
- **The pooled component changes under you** → with `AutoRelease` the pool reuses it once
  finished. Use `ManualRelease` (and release it yourself) to keep driving it.
- **Gameplay can't read the particles** → GPU simulation data isn't read back by the CPU. Use a
  CPU emitter for anything gameplay reacts to.
- **Following a Cascade tutorial** → different system. Port old assets with the Cascade To
  Niagara Converter plugin as a starting point.
- **Spawning from the Construction Script** → spawn functions are marked unsafe during actor
  construction. Spawn from BeginPlay or later.
- **An argument lands in the wrong slot** → `SpawnSystemAttached` takes `PoolingMethod` before
  `bAutoActivate`, unlike `SpawnSystemAtLocation`. Check the order in
  `NiagaraFunctionLibrary.h` before passing optional arguments.

## References

- Epic docs: [Overview of Niagara Effects](https://dev.epicgames.com/documentation/unreal-engine/overview-of-niagara-effects-for-unreal-engine),
  [Niagara Debugger](https://dev.epicgames.com/documentation/unreal-engine/niagara-debugger-for-unreal-engine),
  [Console commands reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-console-commands-reference).

## Related skills

- `shader-programming`: particle material and shader concepts.
- `game-feel`: shake, hit-stop, and timing around the effect.
- `unreal-cpp-gameplay`: module setup and actors that spawn the effects.
- `unreal-blueprints`: triggering effects from graphs.
- `unreal-behavior-trees`: AI that decides when to play an effect (e.g. a spell cast).
- `audio-design`: sound synced to the effect.

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026); UE 5.9 is in Preview.
- 5.8: new Spawn By Trigger module, Random Jitter and Ramp In/Out dynamic inputs, bitonic GPU
  sort for small particle counts, and a `FiltersEnabled=` option for the debug HUD command.
- 5.9 Preview: the Unreal Animation Framework gains a Play Niagara Effect notify handler, and
  AVBOIT (order-independent transparency) changes how overlapping translucent particles blend.
- Sources: [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [UE 5.9 Preview release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes),
  [Niagara Debugger](https://dev.epicgames.com/documentation/unreal-engine/niagara-debugger-for-unreal-engine).
