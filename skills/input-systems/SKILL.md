---
name: input-systems
description: "Engine-agnostic input architecture with Godot InputMap code: named actions, stick deadzones, buffered presses, and rebinding with conflict detection. Auto-invoke for gamepad support or a rebind menu, or a drifting stick, WASD on AZERTY, or a dropped press. Not for coyote time (`platformer`) nor Unity and Unreal input assets (`unity-input-system`, `unreal-enhanced-input`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Input systems

Gameplay reads named **actions** (`jump`, `attack`, `move`); bindings from keys, buttons, and
touch to those actions are data. Rebinding, multi-device support, and most input accessibility
flow from that single indirection. This skill is the engine-agnostic architecture with Godot 4.7
code. For engine-specific input assets, use `unity-input-system` or `unreal-enhanced-input`;
Godot's `InputMap` is covered here.

> Adapted and translated from the `input-systems` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Designing an input layer: actions, per-device bindings, device detection, and prompts.
- Stick handling: deadzones, response curves, sensitivity.
- Buffering discrete presses (an attack during recovery, a dodge, combo links, menu
  confirmation).
- A rebind screen with conflict handling, saved bindings, and reset to defaults.
- Accessible controls: full remap, toggle vs hold, no chord required, adjustable windows.

**Not this skill**: coyote time, jump buffering, and variable jump height belong to
`platformer`, which owns the jump controller. Hit-stop and other juice that interacts with
buffers is in `game-feel`. Writing the bindings file is `save-systems`. Menu focus and navigation
rules are in `game-ui-ux`.

## Main workflow

1. **Inventory before editing.** List existing actions (Godot: the `[input]` section of
   `project.godot`; Unity: the `.inputactions` file; Unreal: `IA_`/`IMC_` assets) and grep
   gameplay code for raw key reads (`is_key_pressed`, `KEY_`, `Input.GetKey`). Raw reads are the
   first thing to replace.
2. **Name actions by intent**, not by key, and give each a keyboard and gamepad binding. Touch
   goes through the same actions.
3. **Match the read to the action.** Edge (pressed this frame or tick) for discrete actions,
   held or axis for continuous ones.
4. **Filter analog input** with a radial deadzone and a separate response curve.
5. **Buffer discrete presses** that arrive a bit before they're legal, measured in game time and
   consumed when they trigger.
6. **Rebinding:** capture the next input, bind the physical key, reject or swap conflicts, save,
   and offer a reset to defaults. Keep a path back to the pause menu that can't be unbound.
7. **Verify it yourself, then ask for an on-device test** (see "Verify" below).

## Patterns

### 1. Actions instead of raw keys; edge vs held

```gdscript
if Input.is_action_just_pressed("jump"):      # edge: true only on the frame/tick of the press
    try_jump()
var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
# get_vector applies a radial deadzone, rescales past it, and caps length at 1,
# so diagonals aren't faster. Use get_axis for a single axis.
# WRONG: Input.is_key_pressed(KEY_SPACE): not rebindable, keyboard only, and it's a
# "held" control, so jump re-triggers every frame.
```

Engine equivalents: Unity Input System's `InputAction` and action maps; Unreal's Enhanced Input
Actions plus Mapping Contexts.

### 2. Analog deadzone and sensitivity

```gdscript
# Raw sticks never rest exactly at zero. Apply a RADIAL deadzone (on the vector's length),
# not per axis, so diagonals aren't clipped toward the axes.
func apply_deadzone(stick: Vector2, dead := 0.2, curve := 1.0) -> Vector2:
    # dead == 1 can't be rescaled; flag an invalid setting before blocking movement.
    if not (dead >= 0.0 and dead < 1.0 and curve > 0.0):
        push_error("apply_deadzone requires 0 <= dead < 1 and curve > 0.")
        return Vector2.ZERO
    var mag := stick.length()
    if mag <= dead:
        return Vector2.ZERO                      # inside the deadzone -> no movement
    # Rescale so movement rises from 0 at the deadzone edge, not from `dead`.
    var scaled := minf((mag - dead) / (1.0 - dead), 1.0)  # some gamepads report > 1 diagonally
    return stick / mag * pow(scaled, curve)      # curve > 1 = finer aim near the center
# WRONG: clamping each axis separately — this digs a square hole and snaps movement to the axes.
```

Keep the response curve (exponent) separate from sensitivity (a gain on the result, usually a
camera turn rate) and expose both in settings. An invalid setting flags an error and returns no
movement. Godot's `get_vector` already applies this deadzone and rescaling, averaging the
deadzones of the four actions (0.2 per action by default) unless one is passed.

### 3. Action buffer for discrete presses

```gdscript
# action_buffer.gd: briefly remember discrete presses so an early press still triggers.
extends RefCounted

var window := 0.15                        # seconds; 0.1-0.2 suits attacks and dodges
var _pressed_at := {}                     # action -> game time of its last press

func press(action: StringName, now: float) -> void:
    _pressed_at[action] = now

func consume(action: StringName, now: float) -> bool:
    if not _pressed_at.has(action) or now - _pressed_at[action] > window:
        return false
    _pressed_at.erase(action)             # one press triggers one action
    return true

func clear() -> void:                     # on death, pause, cutscene, scene change
    _pressed_at.clear()
```

Feed it from the input read (`if Input.is_action_just_pressed("attack"):
buffer.press(&"attack", clock)`) and call `consume` where the action becomes legal, like the
first frame after attack recovery. `clock` is the game time advanced in `_physics_process`, so
the window freezes during pause and hit-stop. When two buffered actions become legal on the same
tick, choose by a fixed priority, not dictionary order. Jump buffering and coyote time are the
same idea applied to the jump controller but belong to `platformer`.

### 4. Rebinding with conflict detection

```gdscript
# Godot 4.7. Capture the next physical input, reject conflicts, then persist.
var _waiting_for: StringName = &""               # set by the "press a key for Jump" button

func _unhandled_input(event: InputEvent) -> void:
    if _waiting_for != &"" and _is_bindable(event):
        get_viewport().set_input_as_handled()
        if not rebind(_waiting_for, event):
            show_conflict_warning(event)         # offer swap or cancel
        _waiting_for = &""

func _is_bindable(e: InputEvent) -> bool:
    if e is InputEventKey or e is InputEventJoypadButton or e is InputEventMouseButton:
        return e.pressed and not e.is_echo()     # ignore releases and key repeat
    return e is InputEventJoypadMotion and absf(e.axis_value) > 0.5  # ignore stick noise

func rebind(action: StringName, captured: InputEvent) -> bool:
    var event := _to_binding(captured)
    for other in InputMap.get_actions():
        if other != action and not String(other).begins_with("ui_") \
                and InputMap.action_has_event(other, event):
            return false                         # already used -> let the UI warn/swap
    for old in InputMap.action_get_events(action):
        if old.get_class() == event.get_class():  # only replace the binding of this device type
            InputMap.action_erase_event(action, old)
    InputMap.action_add_event(action, event)
    save_bindings()                              # persist (see save-systems)
    return true

func _to_binding(e: InputEvent) -> InputEvent:
    if e is InputEventKey:                       # bind the physical key, not the layout letter
        var k := InputEventKey.new()
        k.physical_keycode = e.physical_keycode
        return k
    var b := e.duplicate() as InputEvent
    b.device = -1                                # all devices: a gamepad binding shouldn't stick to gamepad 0
    if b is InputEventJoypadMotion:
        b.axis_value = signf(b.axis_value)       # keep only the direction
    return b
```

Keyboard bindings use `physical_keycode` with `keycode` left at 0, which makes Godot match by key
position, so WASD stays in place on AZERTY or Dvorak. Show the player-facing label with
`DisplayServer.keyboard_get_label_from_physical`. Reset to defaults with
`InputMap.load_from_project_settings()`. Unity: `PerformInteractiveRebinding()` and
`SaveBindingOverridesAsJson()`/`LoadBindingOverridesFromJson()`. Unreal: Enhanced Input User
Settings with player-remappable keys.

### 5. Binding audit (headless, exits with 1 on a problem)

```gdscript
# tools/audit_bindings.gd: godot --headless --path . --script res://tools/audit_bindings.gd
extends SceneTree

const KEYBOARD_ONLY := [&"toggle_console"]   # actions allowed to have no gamepad binding

func _initialize() -> void:
    var problems := PackedStringArray()
    var actions := InputMap.get_actions().filter(func(a): return not String(a).begins_with("ui_"))
    for i in actions.size():
        var action: StringName = actions[i]
        var events := InputMap.action_get_events(action)
        if not events.any(func(e): return e is InputEventKey or e is InputEventMouseButton):
            problems.append("%s: no keyboard or mouse binding" % action)
        if action not in KEYBOARD_ONLY and not events.any(
                func(e): return e is InputEventJoypadButton or e is InputEventJoypadMotion):
            problems.append("%s: no gamepad binding" % action)
        for other in actions.slice(i + 1):
            for e in events:
                for o in InputMap.action_get_events(other):
                    if e.is_match(o, true):       # exact: axis direction and modifiers count
                        problems.append("%s and %s share %s" % [action, other, e.as_text()])
    for p in problems:
        printerr("BINDING: ", p)
    print("Checked %d actions, %d problems" % [actions.size(), problems.size()])
    quit(1 if problems.size() > 0 else 0)
```

It reads the project's `[input]` section. Exact matching matters: with the default loose
matching, `move_left` and `move_right` on both directions of the same stick axis would count as
a conflict. Two actions never active at the same time (a menu action and a gameplay action) can
share a key; list those pairs rather than removing the control.

## Verify

1. Run the binding audit and fix every line it prints. Under Unity or Unreal, do the same review
   on the `.inputactions` JSON or by listing the mapping context's keys.
2. Unit test the pure parts headless with fixed inputs: deadzone outputs at 0, at the deadzone
   edge, and diagonally; a buffered press triggers once and expires after the window. Follow
   `godot-gdscript-headless-testing` for the runner and exit codes.
3. Grep gameplay code again for raw key reads; the count should be zero outside debug tools.
4. Ask the user to plug in a gamepad, rebind an action to a main button, restart the game, and
   report whether the new binding still works, whether prompts switch between keyboard and
   gamepad glyphs, and whether a second gamepad can use the rebound button. Never report device
   behavior that hasn't been confirmed, since the agent can't press the buttons itself.

## Pitfalls

- **Edge vs held confusion.** A "held" control for jump re-triggers every frame; a "edge"
  control for movement drops held input.
- **Per-axis deadzones** clip diagonals and snap movement to the axes. Use a radial deadzone.
- **A buffered press triggers twice** because `consume` never clears it, or it triggers after a
  respawn because nothing calls `clear()`.
- **A buffer that expires during hit-stop or pause** counts clock time
  (`Time.get_ticks_msec`). Use game time from the physics step.
- **Rebinding without conflict handling** lets two actions share a key, or locks out the player
  by unbinding the menu. Detect conflicts and keep a non-unbindable path back.
- **WASD in the wrong place on AZERTY or QWERTZ**: bindings stored by key letter follow the
  layout. Store physical positions and show the layout's label.
- **A rebound gamepad button only works for player 1**: the captured event kept gamepad 0's
  device ID. Store bindings for all devices (Godot `device = -1`) unless gamepads are assigned
  deliberately.
- **Comparing InputEvents with `==`** is always false for two separate objects. Use
  `action_has_event` or `is_match`.
- **"Press Space" shown to a gamepad player.** Track the last device that sent input and swap
  glyphs on every change, with no restart needed.
- **Steam Input reports every controller as Xbox** when enabled for that controller, so name and
  ID checks pick the wrong glyphs. Ask Steam for the real type (details in the reference).
- **Hold-only actions, required chords, and fixed sensitivity** block some players. Offer
  toggle vs hold, single-input alternatives, and sensitivity settings.

## References

- [`references/buffering-and-accessibility.md`](references/buffering-and-accessibility.md): read
  to tune buffer windows, choose button glyphs by controller family (SDL3 positions, Steam
  Input), build touch controls, or review a controls accessibility checklist.

## Related skills

- `platformer`: coyote time, jump buffering, variable jump height, and jump feel.
- `unity-input-system`, `unreal-enhanced-input`: engine input assets and APIs.
- `save-systems`: persisting bindings and input settings.
- `game-ui-ux`: focus and menu navigation; `camera-systems`: look sensitivity and inversion.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7: `Input.is_action_just_pressed` is true on the frame or physics tick of the press;
  `InputEvent.is_match(event, exact_match = true)`; `get_joy_info()` fills `raw_name`,
  `vendor_id`, and `product_id` on Windows, Linux, macOS, and iOS, and `steam_input_index` on
  desktop only.
- The binding audit and action buffer above were tested on Godot 4.7.2 headless.
