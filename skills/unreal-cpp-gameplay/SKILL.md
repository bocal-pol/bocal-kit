---
name: unreal-cpp-gameplay
description: "Unreal Engine 5 (UE 5.8) C++ gameplay code: UCLASS/UPROPERTY reflection, Gameplay Framework, GC-safe pointers, Build.cs, and command-line builds. Auto-invoke for GENERATED_BODY, Live Coding, an \"unresolved external symbol\", or a UHT error. Not for Blueprints (`unreal-blueprints`), Enhanced Input (`unreal-enhanced-input`), or packaging (`unreal-packaging`); engine source builds are out of scope."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unreal C++ Gameplay

Write UE5 gameplay C++ that compiles on the first try, survives the garbage collector, and is
testable from a terminal. Targets **UE 5.8**.

> Adapted/translated from the skill `unreal-cpp-gameplay` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Create or fix C++ gameplay classes (`AActor`, `APawn`, `ACharacter`, `AGameModeBase`,
  `UActorComponent`), reflection macros, or a module's `*.Build.cs`.
- Diagnose compile, UHT, or linker issues, Live Coding problems, and crashes caused by freed
  `UObject`s.
- Write C++ automation tests and run them headless.

**Not this skill**: designer-facing visual logic → `unreal-blueprints`. Input assets and bindings
→ `unreal-enhanced-input`. Behavior Trees and EQS → `unreal-behavior-trees`. Cook and packaging →
`unreal-packaging`. Compiling Unreal Engine itself from source is not covered; follow Epic's
source build instructions on the engine's GitHub repo.

## Main workflow

1. **Read the project.** `EngineAssociation` in the `.uproject` gives the engine version; the
   `Modules` list and `Source/<Module>/<Module>.Build.cs` give module names and dependencies;
   existing base classes under `Source/` show what to extend. Respect the existing API macro
   (`MYGAME_API`) and folder layout (`Public/`, `Private/`).
2. **Declare reflected types correctly.** The prefix follows the base (`A` for actors, `U` for
   other `UObject`s and components, `F` for structs, `E` for enums, `I` for interfaces).
   `GENERATED_BODY()` is the first line of the body and `#include "Name.generated.h"` is the last
   include.
3. **Make every `UObject` pointer visible to the GC.** Members holding a `UObject` are
   `UPROPERTY()` with `TObjectPtr<T>`; non-owning references are `TWeakObjectPtr<T>`. This is the
   single most common source of random crashes.
4. **Create default components in the constructor** with `CreateDefaultSubobject`, attach them
   with `SetupAttachment`, and set `RootComponent`. Components created at runtime go through
   `NewObject` then `RegisterComponent`.
5. **Put logic where the framework expects it.** Rules and default classes in the GameMode
   (server only), per-player data in the PlayerState, input and UI ownership in the
   PlayerController, the body in the Pawn or Character, reusable behavior in components.
6. **Add module dependencies** to `PublicDependencyModuleNames` (or `Private...` if only `.cpp`
   files use them) as soon as another module's headers are included, e.g. `EnhancedInput`,
   `AIModule`, `Niagara`, `UMG`.
7. **Build and test from the command line (see Verify).** Live Coding (Ctrl+Alt+F11) only for
   function-body changes while the editor is running.

## Patterns

### Reflected actor with a GC-safe component

```cpp
// Pickup.h
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Pickup.generated.h"            // last include

UCLASS()
class MYGAME_API APickup : public AActor
{
    GENERATED_BODY()
public:
    APickup();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pickup")
    int32 ScoreValue = 10;

    UFUNCTION(BlueprintCallable, Category = "Pickup")
    void Collect();

protected:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UStaticMeshComponent> Mesh;  // UPROPERTY keeps it alive and visible in the editor
};
```

### An automation test

```cpp
// Source/MyGame/Private/Tests/ScoreTests.cpp
#include "Misc/AutomationTest.h"

#if WITH_DEV_AUTOMATION_TESTS
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FScoreAddsTest, "MyGame.Score.Adds",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

bool FScoreAddsTest::RunTest(const FString& Parameters)
{
    FScoreBoard Board;                       // pure logic: no world needed
    Board.Add(10);
    TestEqual(TEXT("score after one add"), Board.Total(), 10);
    return true;                             // a failed Test* still marks the test failed
}
#endif
```

Keep rules testable in plain structs or functions so most tests don't need a world; use
functional tests on a test map for behavior that needs actors.

## Verify

Say which of these checks ran and paste the relevant result lines; "it should compile" is not a
check.

1. **Compile the editor target, editor closed**:
   `Engine/Build/BatchFiles/Build.bat <Project>Editor Win64 Development -Project="<abs path>.uproject" -WaitMutex`
   (Linux: `Engine/Build/BatchFiles/Linux/Build.sh <Project>Editor Linux Development ...`;
   macOS: `Engine/Build/BatchFiles/Mac/Build.sh <Project>Editor Mac Development ...`). Fix every
   error and warning in the touched files.
2. **Run tests headless**:
   `UnrealEditor-Cmd <Project>.uproject -ExecCmds="Automation RunTest MyGame;Quit" -unattended -nullrhi -nosplash -ReportExportPath="<dir>"`.
   `RunTest` accepts a full name, a dotted prefix, `Test1+Test2`, or `Group:<name>`. Read the JSON
   report or the log's `Test Completed` lines, and confirm the expected tests actually ran: a bad
   filter runs nothing and still looks clean.
3. **When behavior needs a person,** ask the user to open the editor, confirm the new class and
   its properties show up, run PIE, and report the Output Log lines for its category.
4. **Optional**: with Epic's `unreal-mcp` skill connected to a running editor, its test toolset
   can discover and run automation tests and return detailed results.

## Pitfalls

- **"Cannot open include file ...generated.h" or UHT errors** → the generated include isn't
  last, `GENERATED_BODY()` is missing, or the file was added while the editor was running and
  project files were never regenerated.
- **Unresolved external symbol** → the module that defines the symbol isn't in `Build.cs`. Find
  the header's path under `Engine/Source/` or `Engine/Plugins/` to get the module name.
- **Random crash on a pointer "that was valid"** → a raw `UObject*` member without `UPROPERTY`,
  or a container of those, so the GC freed the object. `IsValid()` on a dangling raw pointer
  doesn't help.
- **Live Coding after a header change** → new `UPROPERTY`s or functions rely on Object
  Reinstancing, on by default but less reliable; pointers cached to reinstanced objects go stale.
  If the editor or Blueprints misbehave afterward, close the editor and do a full build.
- **Building from the IDE or command line while the editor is running** → with Live Coding
  active, the build is refused or conflicts with the editor's loaded modules. Close the editor
  first, or compile via Live Coding.
- **`CreateDefaultSubobject` outside the constructor** → assert. At runtime, use `NewObject` and
  `RegisterComponent`, or the component never ticks or renders.
- **Overrides that skip `Super::`** (`BeginPlay`, `Tick`, `EndPlay`,
  `GetLifetimeReplicatedProps`) silently skip engine initialization.
- **GameMode logic on a client** → the GameMode only exists on the server. Use GameState or
  PlayerState for data clients need to see.

## References

- Read `references/components-and-gc.md` to create or attach components at runtime, choose
  between `TObjectPtr`, `TWeakObjectPtr`, `TStrongObjectPtr`, and `FGCObject`, add
  `USTRUCT`/`UENUM` data, or replicate a property with `OnRep_`.
- Epic docs: [Gameplay Framework](https://dev.epicgames.com/documentation/unreal-engine/gameplay-framework-in-unreal-engine),
  [Write C++ Tests](https://dev.epicgames.com/documentation/unreal-engine/write-cplusplus-tests-in-unreal-engine),
  [Run Automation Tests](https://dev.epicgames.com/documentation/unreal-engine/run-automation-tests-in-unreal-engine).

## Related skills

- `unreal-blueprints`: exposing C++ to designers.
- `unreal-enhanced-input`: binding input in a C++ Pawn or Character.
- `unreal-behavior-trees`: AIControllers and custom BT nodes in C++.
- `unreal-niagara`: spawning effects from C++ code.
- `unreal-packaging`: cooking and shipping the build that carries this code.
- `performance-optimization`, `physics-tuning`, `save-systems`: engine-agnostic disciplines whose
  Unreal implementation goes through this C++ code.

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026); UE 5.9 is in Preview.
- Windows 5.8 toolchain: Visual Studio 2022 17.14 or newer (2026 recommended), MSVC 14.38 minimum
  (14.50 recommended), Windows SDK 10.0.22621.0 minimum. 5.8.4 adds Visual Studio 2026 `.slnx`
  solution support.
- macOS 5.8: Xcode 15.2 minimum (15.4 or newer recommended). Linux: clang 20.1.8.
- The 5.9 Preview adds the Modular Test Framework for scoped plugin tests.
- Sources: [UE 5.8 release notes, Platform SDK Upgrades](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [5.8.4 hotfix announcement](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775)
  and [5.8.4 summary](https://www.digitaldeveloper.io/releases/unreal-engine/5-8-4),
  [UE 5.9 Preview release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes),
  [Write C++ Tests](https://dev.epicgames.com/documentation/unreal-engine/write-cplusplus-tests-in-unreal-engine).
