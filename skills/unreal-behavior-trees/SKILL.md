---
name: unreal-behavior-trees
description: "Unreal Engine 5 (UE 5.8) NPC AI with Behavior Trees, Blackboards, EQS, and StateTree: decorators with Observer Aborts, C++ BTTask nodes, and driving it all from an AIController. Auto-invoke for Unreal enemy AI, BT_, BB_, or EQS_ assets, an AI that \"gets stuck\", or a failing MoveTo. Not for engine-agnostic BT or utility code (`ai-behavior-trees-utility-ai`) nor the FSM vs. BT choice (`game-ai`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unreal Behavior Trees, EQS, and StateTree

Write UE5 NPC decision-making: a Behavior Tree reads a Blackboard, decorators open or close
branches, services keep keys fresh, EQS picks positions or targets, and an AIController drives
the whole thing. StateTree is the alternative for mode-based AI. Targets **UE 5.8**.

> Adapted/translated from the skill `unreal-behavior-trees` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

**Boundary with `ai-behavior-trees-utility-ai`**: this skill owns everything built on Unreal's
native assets — Behavior Tree, Blackboard, EQS, StateTree, and the C++
`BTTask`/`BTService`/`BTDecorator` nodes that plug into them. `ai-behavior-trees-utility-ai`
covers only hand-written, engine-agnostic behavior tree and utility AI logic (a Blackboard and
reactive composites in portable code, with no dependency on Unreal). An Unreal AI that
reimplements a BT in plain C++ without going through `UBehaviorTree` belongs to
`ai-behavior-trees-utility-ai`, not this skill.

## When to use it

- Create or fix `BT_`/`BB_` assets, decorators, services, or custom C++
  `BTTask`/`BTService`/`BTDecorator` nodes, or the AIController that runs the tree.
- Write or debug EQS queries (`EQS_` assets, Run EQS Query, the EQS Testing Pawn).
- Build an AI with StateTree (`ST_` assets, `UStateTreeAIComponent`) or combine it with a BT.

**Not this skill**: writing your own behavior tree or utility AI runtime, outside Unreal's assets
→ `ai-behavior-trees-utility-ai`. Choosing an AI architecture or engine-agnostic
steering/pathfinding → `game-ai`. The pawn and controller classes themselves →
`unreal-cpp-gameplay`.

## Behavior Tree or StateTree?

Both exist under UE 5.8 and Behavior Trees are not deprecated. Default: **keep whatever the
project already uses**. For new AI, choose StateTree when the behavior is a set of modes with
explicit transitions (patrol, alert, combat), and a Behavior Tree when it's a priority list that
must re-evaluate as Blackboard values change. They also combine: the BT task `Run State Tree`
(`UBTTask_RunStateTree`) runs a StateTree inside a branch, and StateTree has its own Run Env Query
task for EQS. StateTree on an AI needs the **StateTree** and **GameplayStateTree** plugins, and a
`UStateTreeAIComponent` on the AIController, with an asset that uses the StateTree AI Component
schema. Ask before adding a second system alongside the first.

## Main workflow

1. **Read the project first.** Check `EngineAssociation` in the `.uproject` (this skill targets
   5.8). List existing AI assets and classes to extend rather than duplicate:
   `find Content -name "BT_*" -o -name "BB_*" -o -name "EQS_*" -o -name "ST_*"` and
   `grep -rn "AAIController\|RunBehaviorTree\|UStateTreeAIComponent" Source`. C++ AI code needs
   `"AIModule"` in the module's `*.Build.cs`.
2. **The Blackboard (`BB_`) first.** A typed key per fact the AI remembers (`TargetActor`,
   `LastKnownLocation`, `bIsInvestigating`). The tree references this asset.
3. **Run it from the controller.** The pawn's AIController calls `RunBehaviorTree(BT)` in
   `OnPossess`; this also initializes the Blackboard. Set the pawn's *Auto Possess AI* to "Placed
   in World or Spawned" and its *AI Controller Class*.
4. **Shape the tree.** A root Selector for priorities (combat, else investigation, else patrol);
   Sequences for steps that must all succeed. Put a Blackboard decorator on each priority branch
   and set **Observer Aborts** so a key change interrupts the running branch.
5. **Keep keys fresh with services** on the branch that needs them (perception, distance checks).
   A service only ticks while its branch is active.
6. **Use EQS for "where" and "which" questions** (cover point, nearest pickup): add a **Run EQS
   Query** task, set its Query Template and the Blackboard key that receives the best result, and
   pass parameters through Query Config.
7. **Write custom C++ nodes only when the native ones aren't enough**; read the reference below.
8. **Verify (see Verify).**

## Patterns

### AIController running the tree (C++)

```cpp
void AEnemyAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);
    if (BehaviorTree)                  // UPROPERTY(EditAnywhere) TObjectPtr<UBehaviorTree>
    {
        RunBehaviorTree(BehaviorTree); // also initializes the Blackboard referenced by the BT
    }
}

void AEnemyAIController::SetTarget(AActor* Target)
{
    if (UBlackboardComponent* BB = GetBlackboardComponent())
    {
        BB->SetValueAsObject(TEXT("TargetActor"), Target); // must match the BB key name
    }
}
// BB->ClearValue(TEXT("TargetActor")) drops the tree back to a lower-priority branch.
```

### A reactive priority tree

```text
ROOT
└── Selector
    ├── Sequence   [Blackboard: TargetActor Is Set, Observer Aborts: Both]
    │     ├── MoveTo (TargetActor)
    │     └── Attack
    ├── Sequence   [Blackboard: LastKnownLocation Is Set, Observer Aborts: Lower Priority]
    │     ├── MoveTo (LastKnownLocation)
    │     └── Wait 3s, then clear the key
    └── Sequence   (patrol)
          ├── Run EQS Query (EQS_NextPatrolPoint -> PatrolLocation)
          └── MoveTo (PatrolLocation)
```

`Both` on the combat branch means: start combat as soon as `TargetActor` is set, and leave it as
soon as it's cleared.

## Verify

Say which of these checks actually ran; reading the assets is not a test.

1. **Compile** the module (Windows: `Engine/Build/BatchFiles/Build.bat <Project>Editor Win64
   Development -Project="<path>.uproject" -WaitMutex`; Linux and macOS use
   `Engine/Build/BatchFiles/Linux/Build.sh` or `Mac/Build.sh` with the matching platform) and fix
   every error and warning in its files.
2. **Validate assets**: `UnrealEditor-Cmd <Project>.uproject -run=DataValidation -unattended`
   runs the project's asset validators; fix every reported error.
3. **Prove behavior with a functional test.** On a small test map, place the NPC, a target, and a
   Functional Test actor whose test waits a few seconds then checks the Blackboard key or the
   NPC's distance to the target before calling `FinishTest`. Run it headless and read the exit
   code and report:
   `UnrealEditor-Cmd <Project>.uproject -ExecCmds="Automation RunTest Project.Functional Tests;Quit" -unattended -nullrhi -ReportExportPath="<dir>"`.
   Run `-ExecCmds="Automation List;Quit"` first if the test's path is unclear. The **Functional
   Testing Editor** plugin must be enabled. If the map doesn't run without rendering, swap
   `-nullrhi` for `-RenderOffscreen` (needs a GPU).
4. **When a run inside the editor is needed, ask the user** to launch PIE, press the apostrophe
   key for the Gameplay Debugger (or open the Behavior Tree editor while PIE is running), and
   report which branch is highlighted and the live Blackboard values. EQS results also show up in
   the Visual Logger.
5. **Optional**: if Epic's `unreal-mcp` skill is installed and the editor's MCP server is
   running, BT and StateTree assets can be inspected live through it. The checks above don't
   need it.

## Pitfalls

- **The AI never starts** → the pawn isn't possessed by the expected AIController (Auto Possess
  AI, AI Controller Class), or `RunBehaviorTree` never ran.
- **`MoveTo` fails instantly** → no navmesh (add a Nav Mesh Bounds Volume and rebuild paths), or
  the destination is off the navmesh.
- **The tree ignores a key change** → the decorator's Observer Aborts is set to `None`. `Self`
  interrupts its own branch when the condition fails, `Lower Priority` lets it interrupt branches
  to its right, `Both` does both.
- **A task blocks the tree** → it returned `InProgress` and never called `FinishLatentTask`, or
  its abort path never completes.
- **Bugs only show up with several NPCs** → a custom task keeps its run state in member
  variables. Non-instanced nodes are shared by every AI using the asset; keep per-AI state in the
  node's instance memory.
- **A typo in a Blackboard key** → `SetValueAsObject("Taget", ...)` silently does nothing. Use an
  `FBlackboardKeySelector` or a shared constant for the key name.
- **Sequence and Selector reversed** → Sequence stops at the first failure (AND), Selector stops
  at the first success (OR).
- **EQS returns odd results** → only the leftmost generator connected to the root runs. Debug
  with an EQS Testing Pawn in the level before blaming the tree.
- **EQS missing on clients** → EQS is server-side AI. In 5.8 a query asset can be stripped from
  client builds (`bStripFromClientBuilds`), so client code must not run it.
- **StateTree edits don't show up in PIE** → 5.8 compiles StateTrees through a queue and the
  editor marks trees stale; recompile the asset before testing.

## References

- Read `references/custom-bttask.md` before writing a C++ `UBTTaskNode`: instant and latent
  tasks, per-AI node memory, `AbortTask`, typed Blackboard access, key selectors, and the base
  classes for custom services and decorators.
- Epic docs: [Behavior Trees](https://dev.epicgames.com/documentation/unreal-engine/behavior-trees-in-unreal-engine),
  [EQS user guide](https://dev.epicgames.com/documentation/unreal-engine/environment-query-system-user-guide-in-unreal-engine),
  [StateTree](https://dev.epicgames.com/documentation/unreal-engine/state-tree-in-unreal-engine),
  [Functional Testing](https://dev.epicgames.com/documentation/unreal-engine/functional-testing-in-unreal-engine).

## Related skills

- `ai-behavior-trees-utility-ai`: hand-written BT and utility AI runtimes, any engine — boundary
  detailed above.
- `game-ai`: choosing FSM, BT, steering, or pathfinding.
- `unreal-cpp-gameplay`: the AIController and pawn classes, module setup.
- `unreal-blueprints`: Blueprint equivalent of the tree and its simple decorators.
- `unreal-enhanced-input`: input that triggers behavior transitions (e.g. in co-op).

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026). UE 5.9 is in Preview (MegaJam Preview,
  November 2026); don't migrate a project onto it without a copy.
- 5.8: StateTree gains starting states, a compiler manager with queued compilation, and stale-tree
  tracking; `UEnvQuery` gains `bStripFromClientBuilds`.
- 5.9 Preview: StateTrees can be edited from Blueprint or Python scripts; the navmesh can build
  incrementally.
- Sources: [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [UE 5.9 Preview release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes),
  [GameplayStateTreeModule API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/GameplayStateTreeModule),
  [Run Automation Tests](https://dev.epicgames.com/documentation/unreal-engine/run-automation-tests-in-unreal-engine).
