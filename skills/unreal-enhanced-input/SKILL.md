---
name: unreal-enhanced-input
description: "Unreal Engine 5 (UE 5.8) player input with Enhanced Input: Input Actions (IA_), Mapping Contexts (IMC_), `ETriggerEvent` bindings, and remappable keys. Auto-invoke to wire movement/aim/fire, build a rebind menu, or an input that doesn't respond, stops after a respawn, or fires every frame. Not for engine-agnostic input design (`input-systems`) or the Character class (`unreal-cpp-gameplay`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unreal Enhanced Input

Wire UE5 player input with data assets: Input Actions say *what* the player wants, Mapping
Contexts say *which keys* produce it, modifiers shape the value, and triggers decide *when* it
fires. Targets **UE 5.8**, where Enhanced Input is the default and the old axis/action mappings
are deprecated.

> Adapted/translated from the skill `unreal-enhanced-input` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Add or fix movement, aim, jump, or fire input; create `IA_`/`IMC_` assets; apply modifiers and
  triggers; add or swap mapping contexts at runtime.
- Bind actions in C++ (`UEnhancedInputComponent::BindAction`) or with Blueprint event nodes.
- Build a key-rebinding menu with Enhanced Input User Settings.

**Not this skill**: engine-agnostic input architecture, buffering, and rebind policy →
`input-systems`. The Pawn or Character class and module setup → `unreal-cpp-gameplay`. Coyote
time and jump buffering → the `platformer` genre.

## Main workflow

1. **Read the project.** Check `EngineAssociation`, find existing `IA_*`/`IMC_*` assets, and
   `grep -rn "AddMappingContext\|BindAction\|InputComponent" Source` to see where input is
   already wired. Extend that path rather than add a second one. C++ binding needs
   `"EnhancedInput"` in the module's `*.Build.cs`.
2. **One Input Action per intent**, with the right Value Type: `Digital (bool)` for buttons,
   `Axis1D (float)` for triggers or throttle, `Axis2D (Vector2D)` for movement and aim.
3. **Map keys in an IMC.** For WASD into an Axis2D action: W as-is, S with Negate, D as-is, A
   with Negate, and Swizzle Input Axis Values on W and S so they drive Y. Add Dead Zone on
   sticks. Triggers (Pressed, Released, Hold, Tap) go on the action or on a mapping.
4. **Add the context for the local player** via `UEnhancedInputLocalPlayerSubsystem::
   AddMappingContext(IMC, Priority)` at a point where the pawn is possessed on the owning
   client: `PawnClientRestart` on the pawn, or the PlayerController.
5. **Bind by trigger event.** `Triggered` for continuous values (movement, aim), `Started` and
   `Completed` for press and release (jump). Read the value with the `Get<T>()` matching the
   Value Type.
6. **Rebinding:** enable User Settings and give each rebindable mapping a Player Mappable Key
   Settings name; details in the reference.
7. **Verify (see Verify).**

## Patterns

### Add the context and bind (C++ Character)

```cpp
void AMyCharacter::PawnClientRestart()
{
    Super::PawnClientRestart();               // runs on the owning client after possession
    if (APlayerController* PC = Cast<APlayerController>(GetController()))
        if (ULocalPlayer* LP = PC->GetLocalPlayer())
            if (auto* Subsystem = LP->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
                Subsystem->AddMappingContext(DefaultMappingContext, /*Priority*/ 0);
}

void AMyCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    // Don't name the parameter InputComponent: it would shadow AActor::InputComponent.
    if (auto* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AMyCharacter::Move);
        EIC->BindAction(JumpAction, ETriggerEvent::Started,   this, &ACharacter::Jump);
        EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
    }
}

void AMyCharacter::Move(const FInputActionValue& Value)
{
    const FVector2D Axis = Value.Get<FVector2D>();   // IA_Move is Axis2D
    AddMovementInput(GetActorForwardVector(), Axis.Y);
    AddMovementInput(GetActorRightVector(),   Axis.X);
}
```

### Blueprint equivalent

```text
Event Possessed (or the PlayerController's BeginPlay)
  -> Get Controller -> Cast To PlayerController -> Get Local Player
  -> Enhanced Input Local Player Subsystem -> Add Mapping Context (IMC_Default, 0)
EnhancedInputAction IA_Move (Triggered) -> Action Value X/Y -> Add Movement Input
```

## Verify

Say which of these checks actually ran.

1. **Compile** the module (`Build.bat`/`Build.sh` as in `unreal-cpp-gameplay`) and fix errors; a
   missing `EnhancedInput` dependency shows up here as unresolved symbols.
2. **Validate assets**: `UnrealEditor-Cmd <Project>.uproject -run=DataValidation -unattended`.
3. **Regression test (optional but cheap once written)**: a functional test on a test map can
   inject an action with the subsystem's input injection functions (e.g.
   `InjectInputForAction`) and verify the pawn moved. Run it with
   `UnrealEditor-Cmd <Project>.uproject -ExecCmds="Automation RunTest Project.Functional Tests;Quit" -unattended -nullrhi -ReportExportPath="<dir>"`
   (swap `-nullrhi` for `-RenderOffscreen` if the map needs rendering).
4. **Ask the user** to run PIE, open the console, run `showdebug enhancedinput`, press the keys
   in question, and report which contexts are active, their priorities, and the action values.
   `Input.+key <Key>` injects a press from the console when no device is available. For a
   multiplayer bug, ask them to repeat it on a client window.

## Pitfalls

- **No input at all** → the context was never added, it was added before the pawn had a local
  player, or a UI-only input mode is set (`SetInputMode` in UI only).
- **Works solo, broken on a client or after a respawn** → the context was added in `BeginPlay`
  before possession, so `GetController()` was null. Add it in `PawnClientRestart` or the
  PlayerController.
- **`Get<FVector2D>()` always zero** → the action's Value Type isn't Axis2D.
- **Fires every frame** → `Triggered` repeats while held with the default Down trigger; use
  `Started`/`Completed`, or a Pressed or Tap trigger.
- **A key works in one mode and not another** → a higher-priority context maps the same key and
  consumes it. Adjust priorities or call `RemoveMappingContext` when leaving the mode.
- **The Combo trigger misfires or corrupts** → deprecated in 5.8 as unreliable. Build combos with
  your own sequence logic on `Started` events.
- **A boolean action bound to touch stays true after release (before 5.8)** → touch keys carry
  screen position as their value, and older versions evaluated that instead of the pressed
  state. 5.8 fixes this; on older engines, bind touch on `Started`/`Completed`.
- **Rebinding modifies the IMC asset** → that changes the default for everyone and isn't saved
  per player. Use User Settings instead (see the reference).

## References

- Read `references/cpp-setup.md` for a complete third-person Character (header, source, Build.cs,
  IMC asset checklist) and runtime rebinding steps with `UEnhancedInputUserSettings`.
- Epic docs: [Enhanced Input](https://dev.epicgames.com/documentation/unreal-engine/enhanced-input-in-unreal-engine),
  [Input Overview](https://dev.epicgames.com/documentation/unreal-engine/input-overview-in-unreal-engine).

## Related skills

- `input-systems`: engine-agnostic input architecture and rebind policy.
- `unreal-cpp-gameplay`: the Character, PlayerController, and module setup.
- `unreal-blueprints`: Blueprint equivalent of input bindings and event nodes.
- `game-ui-ux` with `unreal-blueprints`: menus that consume these actions.
- `camera-systems`: aim input that drives camera orientation.

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026); UE 5.9 is in Preview.
- 5.8: Common UI and Enhanced Input are unified (no more duplicate input data assets) with a new
  Input Debugger; the Combo trigger is deprecated; boolean touch-key actions now follow the
  pressed state; triggers and modifiers keep their state when mappings are rebuilt.
- Sources: [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [Enhanced Input docs, debug commands, and input injection](https://dev.epicgames.com/documentation/unreal-engine/enhanced-input-in-unreal-engine).
