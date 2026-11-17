# Layout, scale, and flow

Contents:
1. Per-engine scaling modes
2. Safe-area math
3. Focus navigation (full pattern, modal focus trap)
4. Screen/menu stack
5. Diegetic vs non-diegetic UI
6. Accessibility
7. Localization-ready layout

Snippets target Godot 4.7 and Unity 6.3 LTS.

## 1. Per-engine scaling modes

**Godot 4.7** (Project Settings → Display → Window → Stretch):

| Setting | Choose | Effect |
|---------|--------|--------|
| Mode | `canvas_items` | UI scales with the window (vs `viewport` = pixel-exact, `disabled` = none) |
| Aspect | `expand` | shows more world/UI space on odd ratios; `keep` letterboxes |
| Scale | `1.0`+ | global UI multiplier |
| Scale Mode | `fractional` / `integer` | `integer` keeps pixel-art UI crisp by scaling in whole steps |

Anchor HUD corners so `expand` puts the extra space where you want it. `keep_width`/`keep_height`
fixes one axis for strict 16:9 designs.

**Unity 6.3 LTS** (`CanvasScaler` on each Canvas):

- `UI Scale Mode = Scale With Screen Size`.
- `Reference Resolution = 1920×1080` (or the art's design size).
- `Screen Match Mode = Match Width Or Height`, `Match = 0.5` (blend). Use `1.0` if the vertical
  layout must never crop, `0.0` if the horizontal must not.
- `Reference Pixels Per Unit = 100` for a sprite-based UI.

## 2. Safe-area math

The OS reports a safe rectangle inside the screen (excludes the notch, rounded corners, and —
on TV — overscan margins). Only keep **critical** UI (health, timers, prompts) inside it;
decorative art can bleed to the edge.

```text
# Normalized anchors from a safe rect in pixels (engine-agnostic):
anchorMin = (safe.x / screenW,                 safe.y / screenH)
anchorMax = ((safe.x + safe.w) / screenW,       (safe.y + safe.h) / screenH)
# Reapply on resolution/orientation change, not just once at startup.
```

- **Godot:** `DisplayServer.get_display_safe_area()` → `Rect2i` in pixels; reapply on
  `size_changed`.
- **Unity:** `Screen.safeArea` → `Rect` in pixels; recompute when `Screen.width/height` or
  `Screen.orientation` changes (cache the last applied rect to avoid per-frame work).

## 3. Focus navigation (full pattern)

Prerequisites for gamepad/keyboard usability:

1. **Initial focus** on every screen open (`grab_focus()` /
   `EventSystem.SetSelectedGameObject`).
2. **Explicit neighbors** for predictable movement (Godot `focus_neighbor_*`; Unity
   `Navigation` = Explicit with up/down/left/right, or Automatic for simple grids).
3. **Visible focus style** distinct from hover (theme focus stylebox / Unity Selectable
   transition). Never rely on color alone (see accessibility).
4. **Loop or stop** deliberately at list ends; trap focus inside modal dialogs.
5. **Device coexistence:** moving the mouse can update the selection; a gamepad press acts on
   the focused control. Don't clear focus when the mouse moves.

```gdscript
# Godot 4.7: trap focus inside a modal so the stick can't escape to the menu behind it.
var _prev_focus: Control

func open_modal() -> void:
    _prev_focus = get_viewport().gui_get_focus_owner()
    $Menu.focus_behavior_recursive = Control.FOCUS_BEHAVIOR_DISABLED   # Godot 4.5+
    $Menu.mouse_behavior_recursive = Control.MOUSE_BEHAVIOR_DISABLED
    $Modal.show()
    $Modal/OK.grab_focus()

func close_modal() -> void:
    $Modal.hide()
    $Menu.focus_behavior_recursive = Control.FOCUS_BEHAVIOR_INHERITED
    $Menu.mouse_behavior_recursive = Control.MOUSE_BEHAVIOR_INHERITED
    if is_instance_valid(_prev_focus): _prev_focus.grab_focus()
```

Showing the modal and focusing its button isn't a trap by itself: Godot's neighbor search still
reaches visible controls behind it. Both `*_behavior_recursive` toggles disable an entire subtree
without touching each button.

## 4. Screen/menu stack

Model screens as a stack of UI states; the top one owns input and is visible. Push for overlays,
pop to go "back". This generalizes pausing, settings on top of pause, and confirmation dialogs.

```gdscript
# Godot 4.7 sketch: screens are Controls under a CanvasLayer; only the top one is interactive.
# Each screen scene marks its default control with the unique name %DefaultFocus.
var _stack: Array[Control] = []

func push(screen: Control) -> void:
    if not _stack.is_empty():
        _set_interactive(_stack.back(), false)
    _stack.append(screen)
    add_child(screen)
    screen.get_node("%DefaultFocus").grab_focus()

func pop() -> void:
    var top: Control = _stack.pop_back()
    top.queue_free()
    if not _stack.is_empty():
        var below: Control = _stack.back()
        _set_interactive(below, true)
        below.get_node("%DefaultFocus").grab_focus()

func _set_interactive(screen: Control, on: bool) -> void:
    # Godot 4.5+. set_process_input(false) wouldn't do this: buttons receive GUI input, not _input.
    screen.focus_behavior_recursive = Control.FOCUS_BEHAVIOR_INHERITED if on else Control.FOCUS_BEHAVIOR_DISABLED
    screen.mouse_behavior_recursive = Control.MOUSE_BEHAVIOR_INHERITED if on else Control.MOUSE_BEHAVIOR_DISABLED
# Pause overlay: get_tree().paused = true and set process_mode = PROCESS_MODE_ALWAYS on the overlay.
```

## 5. Diegetic vs non-diegetic UI

- **Non-diegetic:** drawn on the screen plane, outside the fiction (most HUDs). Cheapest,
  clearest.
- **Diegetic:** UI that exists in the world (ammo counter on the weapon, health on the suit).
  More immersive, more work, can hurt readability. For key elements, keep a non-diegetic
  fallback.
- **Spatial/world-space:** floating health bars, damage numbers — anchor to the world position,
  clamp to screen edges when off-screen, and scale with distance (3D).

## 6. Accessibility (build in, don't bolt on)

- **Text size option** and never hard-code small fonts; size as a percentage of the reference
  height. Xbox Accessibility Guideline 101 floors: 26 px at 1080p (52 px at 4K) on console/TV,
  18 px at 1080p on PC, and scaling up to 200% without clipping or loss of meaning.
- **Contrast and color independence:** text carrying gameplay information needs at least 4.5:1
  contrast with its background, large text and key visuals at least 3:1 (Xbox Accessibility
  Guideline 102). Don't encode state in color alone — add icon/shape/text. Provide
  colorblind-safe palettes.
- **Scalable touch targets** (≥ ~9 mm); margin around small buttons.
- **Reduced motion / flash toggles** (coordinate with `game-feel`).
- **Full keyboard + gamepad accessibility** (section 3); never lock an action behind the mouse
  alone.

## 7. Localization-ready layout

- Externalize strings (Godot `tr()` + translation CSV/PO; Unity Localization package). Never
  bake display text into layout logic.
- Let containers **size to content** so longer translations (German runs ~30% longer) don't
  clip. Avoid fixed-width buttons sized for English.
- Leave room for RTL mirroring and different number/date formats.
- Keep icons separate from text so only strings need translation.
