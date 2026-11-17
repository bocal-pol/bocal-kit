---
name: unreal-blueprints
description: "Blueprint visual scripting for Unreal Engine 5 (UE 5.8): Blueprint Classes vs. Level Blueprint, Event Graph, Cast, Interfaces, and Event Dispatchers. Auto-invoke for a BP graph, how one Blueprint calls another, a \"cast failed\", a slow Event Tick, or a Blueprint compile error. Not for C++ (`unreal-cpp-gameplay`), input assets (`unreal-enhanced-input`), or AI trees (`unreal-behavior-trees`)."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unreal Blueprints

Structure UE5 gameplay in Blueprints: put logic in the right graph, expose data cleanly, and wire
Blueprints together without a hardwired reference web. Targets **UE 5.8**.

> Adapted/translated from the skill `unreal-blueprints` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Write a Blueprint Class, wire the Event Graph, use the Construction Script, add variables,
  functions, macros, or Event Dispatchers.
- Choose how two Blueprints communicate, or untangle slow loads caused by chained casts.
- Diagnose Blueprint compile errors and runtime "Accessed None" errors.

**Not this skill**: hot loops, heavy data, or code that needs diffs and unit tests →
`unreal-cpp-gameplay`. Input assets and bindings → `unreal-enhanced-input`. AI decisions →
`unreal-behavior-trees`.

## Main workflow

1. **Read the project.** Check `EngineAssociation` in the `.uproject`, and whether a `Source/`
   folder exists (C++ base classes may already provide what the Blueprint needs). Blueprints are
   binary `.uasset` files: they can't be edited or grepped as text. Default: write the change as
   an exact, node-by-node recipe the user applies, then verify it with the checks below.
   Fallbacks: Epic's `unreal-mcp` skill can create and edit graphs in a running editor, and UE 5.9
   adds Python and Editor Utility functions that edit Blueprints from scripts.
2. **Choose the container.** Reusable behavior goes in a Blueprint Class (Actor, Pawn, Character,
   or Actor Component). The Level Blueprint is reserved for one-off level scripting, since nothing
   else can reach it.
3. **Construction Script for setup, BeginPlay for gameplay.** The Construction Script replays on
   every placement, move, or edit of the actor in the editor: it must be repeatable and must
   never spawn gameplay actors or start a timer.
4. **Prefer events over Tick.** Overlaps, timers (`Set Timer by Event`), Timelines, and Event
   Dispatchers rather than polling every frame.
5. **Choose communication by coupling.** Default: an Interface call for "do this to what I just
   touched", and an Event Dispatcher for "tell whoever's interested". Only cast to a class the
   caller already depends on, since the cast loads that class alongside the caller.
6. **Expose data deliberately.** Instance Editable for per-instance values, Expose on Spawn for
   values set by `Spawn Actor`, categories for anything designers touch. Side-effect-free getters
   can be Pure.
7. **Verify (see Verify).**

## Patterns

### Event-driven door (no Tick)

```text
BeginPlay
  -> Bind Event to OnComponentBeginOverlap (TriggerBox)  [custom event OnEnterZone]

OnEnterZone (Other Actor)
  -> Does Object Implement Interface (BPI_CanOpenDoors) ?
       True -> Play Timeline 'DoorOpen' -> Set Relative Rotation (Lerp 0..90 by Alpha)
```

### Interface call (decoupled)

```text
// BPI_Interactable: function Interact(Instigator: Actor)
// BP_Door, BP_Chest: Class Settings -> Implemented Interfaces -> BPI_Interactable
Player Use pressed -> Line Trace -> Hit Actor -> Interact (Message) [Target = Hit Actor]
// The Message node does nothing on actors that don't implement it: no Cast required.
```

### Dispatcher broadcast (one to many)

```text
BP_Player : Event Dispatcher OnHealthChanged(NewHealth: float)
ApplyDamage -> Set Health -> Call OnHealthChanged(Health)
WBP_HUD Construct -> Get Player Pawn -> Cast To BP_Player -> Bind Event to OnHealthChanged
```

## Verify

Say which of these checks actually ran; describing a graph is not a test.

1. **Compile all Blueprints headless**:
   `UnrealEditor-Cmd <Project>.uproject -run=CompileAllBlueprints -unattended -nullrhi`
   (`UnrealEditor-Cmd.exe` on Windows). Read the log's end-of-run summary and every `Error` or
   `Warning` line that names its own assets; don't trust the exit code alone.
2. **Validate assets**: `UnrealEditor-Cmd <Project>.uproject -run=DataValidation -unattended`.
3. **Behavior**: if the project has functional or automation tests for this feature, run
   `UnrealEditor-Cmd <Project>.uproject -ExecCmds="Automation RunTest <Filter>;Quit" -unattended -nullrhi -ReportExportPath="<dir>"`
   and read the report. Otherwise, ask the user to run PIE with a breakpoint (F9) on the node in
   question, and report whether it was hit and the values in the Watch window. Print String on
   each branch is the quick fallback.
4. **Optional**: with Epic's `unreal-mcp` connected, compile the edited Blueprint and read its
   messages through the Blueprints toolset.

## Pitfalls

- **Slow loads and huge memory for a small Blueprint** → chains of `Cast To` and hardcoded object
  references pull entire asset trees in with it. Use the Reference Viewer (or Size Map) to see
  what's loading, then switch to Interfaces, Dispatchers, or soft references.
- **Runtime "Accessed None"** → a reference variable was never set, or the actor it pointed to was
  destroyed. Guard with `Is Valid` when the target can legitimately disappear.
- **Variable missing on the placed instance** → Instance Editable is off; for `Spawn Actor` pins,
  also check Expose on Spawn.
- **Construction Script side effects in the editor** → it runs on every edit, so spawned actors
  pile up and timers misbehave. Move gameplay init to BeginPlay.
- **The Interface call does nothing** → the target doesn't implement it, or the non-Message
  version was called on the wrong type.
- **A dispatcher listener fires after being destroyed or hidden** → unsubscribe on EndPlay or
  Destruct.
- **A local variable picks up an unrelated default value** → it shares a name with a member
  variable. 5.8 refuses these names for new locals, but old Blueprints keep the collision until
  one of the two is renamed.
- **Blueprint Nativization is gone under UE5** → move hot logic to C++.

## References

- Read `references/communication.md` to choose between Cast, Interface, and Event Dispatcher, or
  to wire/unsubscribe a dispatcher and handle soft references.
- Epic docs: [Blueprints Visual Scripting](https://dev.epicgames.com/documentation/unreal-engine/overview-of-blueprints-visual-scripting-in-unreal-engine).

## Related skills

- `unreal-cpp-gameplay`: C++ base classes for Blueprints and when to move logic to C++.
- `unreal-enhanced-input`: input events that feed these graphs.
- `unreal-behavior-trees`: AI decisions that Blueprints trigger.
- `unreal-niagara`: triggering Niagara effects from a graph.
- `unreal-packaging`: packaging the project that holds these Blueprints.
- `game-feel`, `game-ui-ux`, `camera-systems`, `input-systems`, `level-design`: engine-agnostic
  disciplines these graphs implement on the Unreal side.

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026); UE 5.9 is in Preview.
- 5.8: local variables can no longer reuse a member variable's name; existing collisions must be
  renamed by hand.
- 5.9 Preview: new Python and Editor Utility Blueprint functions create and edit Blueprints,
  graphs, nodes, and variables from scripts, and the editor's MCP gains a Blueprints toolset.
- Sources: [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [UE 5.9 Preview release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes),
  [Epic's unreal-mcp plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin).
