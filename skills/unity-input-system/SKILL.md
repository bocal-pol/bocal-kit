---
name: unity-input-system
description: "Wires Unity 6.3 LTS player input with the Input System package: .inputactions assets, action maps, PlayerInput, and control schemes. Auto-invoke when input does nothing or fires under a menu, `FindAction` returns null, the old Input class throws, or `Input.GetAxis` code needs porting. Not for engine-agnostic buffering, rebinding, or deadzones (`input-systems`) nor jump feel (`platformer`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unity Input System

Read input via the Input System package (`com.unity.inputsystem`; Unity 6.3 LTS projects use
1.20.x), which replaces the old Input Manager's `Input.GetAxis`/`Input.GetKey`. Targets Unity
6.3 LTS (6000.3).

> Adapted/translated from the skill `unity-input-system` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Movement, jumping, and shooting; action maps and control schemes; a `PlayerInput` component;
  reading a `Vector2` from a stick or WASD; a single action set for gamepad, keyboard, and
  touch; Unity's rebinding API.
- `Packages/manifest.json` lists `com.unity.inputsystem`, or the project has a `*.inputactions`
  asset.

**Not this skill**: cross-engine input architecture (buffering, remapping screens, deadzone
design) → `input-systems`; moving the character once the vector is in hand →
`unity-physics` / `unity-csharp-scripting`.

## Main workflow

1. **Read Active Input Handling from the file.** `ProjectSettings/ProjectSettings.asset` has
   `activeInputHandler: 0` (old Input Manager only), `1` (Input System only), or `2` (both).
   The package receives nothing at `0`, and a forgotten `Input.GetAxis` call throws at `1`.
   Grep `Assets/` for `Input.Get` before choosing `1`; changing the value restarts the Editor,
   so warn the user.
2. **Reuse the project's global actions.** New Unity 6 projects usually ship
   `Assets/InputSystem_Actions.inputactions`, assigned as the project-wide actions, with a
   `Player` map (`Move`, `Look`, `Attack`, `Interact`, `Crouch`, `Jump`, `Previous`, `Next`,
   `Sprint`) and a `UI` map. Extend it rather than create a second asset.
3. **Edit the asset as JSON while the Editor is closed.** An `.inputactions` file is JSON:
   `maps[].actions[]` (`name`, `type`, `expectedControlType`) and `maps[].bindings[]`
   (`path` like `<Keyboard>/space`, `action`, `groups` for control schemes, `isComposite` and
   `isPartOfComposite` for WASD). Give every new action and binding a fresh `id` GUID like the
   existing entries, keep the JSON file valid, and re-read it after writing.
4. **Choose how to read it:**
   - **Project-wide actions in code**, `InputSystem.actions.FindAction("Player/Move")`: no
     asset reference to wire up, and the actions start enabled. The default for new code.
   - **`PlayerInput` component** when the project already uses it, or for local co-op
     (`PlayerInputManager` gives each device that joins its own player).
   - **An `InputActionReference` or a separate asset** when a tool or system needs its own
     actions; `Enable()`/`Disable()` them yourself.
5. **Switch action maps by context** (gameplay vs. menu) rather than keeping every handler
   behind a condition.
6. **Verify** with the checks below.

## Patterns

### 1. Project-wide actions, polling

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerControls : MonoBehaviour
{
    private InputAction _move, _jump;

    private void Awake()
    {
        _move = InputSystem.actions.FindAction("Player/Move");
        _jump = InputSystem.actions.FindAction("Player/Jump");
    }

    private void Update()
    {
        Vector2 move = _move.ReadValue<Vector2>();       // continuous value
        if (_jump.WasPressedThisFrame()) { /* jump */ }  // edge, true for one frame only
    }
}
```

### 2. Callbacks and map switching

```csharp
private InputActionMap _player, _ui;

private void Awake()
{
    _player = InputSystem.actions.FindActionMap("Player");
    _ui = InputSystem.actions.FindActionMap("UI");
}

private void Start() => _ui.Disable();   // project-wide actions enable every map on startup

private void OnEnable()  => _player.FindAction("Attack").performed += OnAttack;
private void OnDisable() => _player.FindAction("Attack").performed -= OnAttack;

private void OnAttack(InputAction.CallbackContext ctx) { /* attack once per press */ }

public void OpenMenu()  { _player.Disable(); _ui.Enable(); }
public void CloseMenu() { _ui.Disable(); _player.Enable(); }
```

### 3. `PlayerInput` with Send Messages

`PlayerInput` with Behavior = Send Messages calls `On<ActionName>(InputValue)` on scripts on
the same GameObject: `void OnMove(InputValue v) => _move = v.Get<Vector2>();`,
`void OnJump(InputValue v) { if (v.isPressed) Jump(); }`. Broadcast Messages also reaches
children; Invoke Unity Events and Invoke C# Events don't need any naming convention.

## Verify

- **Without an Editor:** parse the `.inputactions` JSON and confirm every name passed to
  `FindAction`/`FindActionMap` exists (for `"Player/Jump"`, a `Player` map with a `Jump`
  action), and that composites have all their parts. Confirm `activeInputHandler` matches the
  code.
- **Tests:** the package's `InputTestFixture` adds virtual devices and presses controls from
  code. List `com.unity.inputsystem` under `"testables"` in `Packages/manifest.json` and add
  `Unity.InputSystem` and `Unity.InputSystem.TestFramework` to the test `.asmdef` (assembly
  setup is in `unity-csharp-scripting`):

  ```csharp
  using NUnit.Framework;
  using UnityEngine.InputSystem;

  public class JumpInputTests : InputTestFixture
  {
      [Test]
      public void SpaceTriggersJump()
      {
          var keyboard = InputSystem.AddDevice<Keyboard>();
          var jump = new InputAction("Jump", InputActionType.Button, "<Keyboard>/space");
          int performed = 0;
          jump.performed += _ => performed++;
          jump.Enable();

          Press(keyboard.spaceKey);

          Assert.That(performed, Is.EqualTo(1));
      }
  }
  ```

- **Unity CLI with the game running:** `unity command runtime simulate_key` injects a key press
  (for example `Space`) through the Input System into the running app, if
  `unity command --query simulate` lists it for the target. Read the effect back with
  `unity command script eval`, and check options with `--help`.
- **Hardware:** ask the user to press the control and report what the Input Debugger
  (Window > Analysis > Input Debugger) shows for the device and action.

## Pitfalls

- **No input at all → cause**: `activeInputHandler` is `0`, or the action/map was never
  enabled. Project-wide actions and `PlayerInput`'s default map start enabled; actions in any
  other asset don't.
- **Gameplay actions fire under an open menu → cause**: project-wide actions enable every map
  on startup, including when `PlayerInput` uses that asset. Disable the maps you don't want in
  `Start` (pattern 2).
- **`FindAction` returns null → cause**: the `Map/Action` name or path doesn't exist in that
  asset, or the file you edited isn't the one assigned as project-wide actions (Project
  Settings > Input System Package).
- **`InvalidOperationException` on the `UnityEngine.Input` class → cause**: old
  `Input.GetAxis`/`GetKey` code runs while `activeInputHandler` is `1`. Port it, or set `2`
  during migration.
- **Buttons return 0 with `ReadValue` → cause**: presses are edges. Use `performed` or
  `WasPressedThisFrame()`, and read actions in `Update`: `WasPressedThisFrame` in `FixedUpdate`
  misses presses or sees them twice.
- **Send Messages handlers never fire → cause**: the script must be on the same GameObject as
  `PlayerInput`; Broadcast Messages reaches children.
- **Handlers run twice → cause**: `OnEnable` re-subscribed without an unsubscription in
  `OnDisable`.
- **Touch or gamepad not detected → cause**: the device isn't in any control scheme the
  `PlayerInput` allows, or a Vector 2D composite is missing a part.

## References

- Read `references/rebinding.md` to add "press a key to rebind," save and load binding
  overrides, or local split-screen multiplayer with `PlayerInputManager`.

## Related skills

- `input-systems`: cross-engine input architecture, buffering, and remapping design.
- `unity-csharp-scripting`: the MonoBehaviour around these handlers and the test assemblies.
- `unity-physics`: applying the input vector to a rigidbody.
- `unity-animation`: driving Animator parameters from the input read here.
- `game-feel`: making a button press satisfying once it's read.
- `platformer`: coyote time and jump buffering built on top of this reading.

## Version notes

Last checked: 2026-11-17.

- `com.unity.inputsystem` 1.20.1 (released 2026-10-05, minimum Unity 6000.0) is the latest
  version in the Unity package registry (https://packages.unity.com/com.unity.inputsystem).
  The project-wide actions template, the `activeInputHandler` 0/1/2 values, and
  `InputTestFixture` were checked against the 1.20.1 package source and its
  `Documentation~` pages (Testing, set-up-test-assemblies, write-tests).
- Manual: https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/manual/index.html
- `runtime simulate_key` is a `com.unity.pipeline` 1.0.0-pre.1 command (pre-release):
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
