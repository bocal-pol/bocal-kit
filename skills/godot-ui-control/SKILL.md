---
name: godot-ui-control
description: "Godot 4.7 `Control` node API for menus and HUDs: anchors, Containers, Theme and StyleBox, focus neighbors and stretch settings, with a headless layout check. Auto-invoke when a Godot UI overlaps or drifts on resize, buttons ignore the gamepad, or an invisible panel swallows clicks. Not for engine-agnostic UI rules (`game-ui-ux`, load both) or rebinding (`input-systems`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot UI / Control nodes (4.x)

This skill owns responsive layout with `Control` anchors and `Container` nodes, styling via
`Theme`, keyboard/gamepad navigability, and proof the layout holds at more than one screen size.
Targets **Godot 4.7** (see Version notes). Design rules (what a good HUD or menu needs) live in
`game-ui-ux`; load both for engine UI work.

> Adapted/translated from `godot-ui-control` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- HUDs, menus, inventories, dialogs or settings screens built with `Control` nodes; UI that must
  adapt to window size; theming; focus navigation for gamepad/keyboard.

**Not this skill**: `Node2D`/sprites in the world (`godot-nodes-scenes`); UI tweens
(`godot-animation`); rebinding (`input-systems`); card hands and VN text boxes
(`card-game` / `visual-novel`).

## Main workflow

1. **Read the stretch settings first.** `project.godot` `[display]` carries
   `window/size/viewport_width`/`viewport_height` (base size, default 1152x648),
   `window/stretch/mode` (`canvas_items` is the usual choice for UI-heavy games) and
   `window/stretch/aspect` (`expand` lets UI use extra width/height).
2. **Use `Control` nodes for UI**, not `Node2D`, and put HUDs under a `CanvasLayer` so the game
   camera doesn't move them.
3. **Anchor top-level panels; let Containers place their children.** Outside containers, set
   anchors with presets (`set_anchors_and_offsets_preset()`). Inside a `VBoxContainer`,
   `HBoxContainer`, `GridContainer` or `MarginContainer`, the container owns position and size;
   drive it via `size_flags_*`.
4. **Style with a single `Theme`.** Set a global theme with
   `gui/theme/custom="res://ui/theme.tres"` in `project.godot`, or assign `theme` on the top
   Control; children inherit it. Only use per-node `add_theme_*_override` for exceptions.
5. **Wire up focus.** Give focus to the first button when a menu opens (`grab_focus()`), keep
   `focus_mode = FOCUS_ALL` on anything a gamepad must reach, and set `focus_neighbor_*` only where
   automatic geometry gets it wrong.
6. **Connect signals** (`pressed`, `toggled`, `text_submitted`, `value_changed`).
7. **Run the checks** below before concluding.

## Patterns

### 1. Full Rect from code (anchors *and* offsets)

```gdscript
extends Control

func _ready() -> void:
    # Setting only anchors (or anchors_preset) keeps the old offsets, so the rect
    # wouldn't match the preset. This moves anchors AND offsets.
    set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
```

### 2. A menu from containers, with initial focus

```gdscript
extends VBoxContainer    # children stack vertically, auto-sized

func _ready() -> void:
    for child in get_children():
        if child is Button:
            child.pressed.connect(_on_button_pressed.bind(child.name))
    # Give focus to the first button so a gamepad can navigate immediately.
    if get_child_count() > 0:
        (get_child(0) as Control).grab_focus()

func _on_button_pressed(which: StringName) -> void:
    match which:
        "PlayButton":  get_tree().change_scene_to_file("res://game.tscn")
        "QuitButton":  get_tree().quit()
```

### 3. A child takes the remaining space

```gdscript
func _ready() -> void:
    $Label.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
    $Spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL   # grows to fill
```

### 4. Headless layout test at several sizes

```gdscript
# res://tests/test_ui_layout.gd
extends SceneTree

# The sizes the UI actually receives. In canvas_items mode + "expand" aspect, a
# 2560x1080 window on a 1152x648 base gives the UI 1536x648, not 2560x1080.
const SIZES: Array[Vector2i] = [Vector2i(1152, 648), Vector2i(1536, 648), Vector2i(1152, 864)]

func _initialize() -> void:
    var failed := 0
    for size in SIZES:
        var vp := SubViewport.new()
        vp.size = size
        root.add_child(vp)
        var ui: Control = load("res://ui/main_menu.tscn").instantiate()
        vp.add_child(ui)
        await process_frame
        await process_frame                      # containers re-sort one frame later
        var screen := Rect2(Vector2.ZERO, Vector2(size))
        for node in ui.find_children("*", "Control", true, false):
            var c := node as Control
            if c.is_visible_in_tree() and not screen.encloses(c.get_global_rect()):
                failed += 1
                push_error("%s off screen at %s: %s" % [ui.get_path_to(c), size, c.get_global_rect()])
        if vp.gui_get_focus_owner() == null:
            failed += 1
            push_error("nothing has focus at %s, a gamepad can't navigate" % size)
        vp.free()
    print("Results: %d failed" % failed)
    quit(1 if failed > 0 else 0)
```

## Verify

1. Run the headless layout test and read the exit code; it flags controls pushed off screen and
   menus with nothing focused, at each size.
2. If `.tscn`/`.tres` files were edited (themes, StyleBox, fonts), also run `godot-nodes-scenes`'s
   path checker.
3. For an image, on a machine with a GPU (not `--headless`), capture frames and inspect them;
   repeat at several resolutions.
4. Ask the user to try the menu with a gamepad and report any unreachable button.

## Pitfalls

- **Mixing manual position and Containers.** A container child can't keep its own position or
  anchors; the container overwrites them on every sort. To push, rotate or scale a single element
  (a hover pop), set `offset_transform_enabled = true` and use `offset_transform_position`/
  `_rotation`/`_scale`, which the container leaves alone.
- **Anchors vs. offsets.** Anchors are fractions of the parent; offsets are pixels from the
  anchored point.
- **UI under a `Node2D`** doesn't theme, anchor or take focus correctly. Keep UI in a `Control`
  subtree, under a `CanvasLayer` for HUDs.
- **The gamepad does nothing** → nothing has focus. Call `grab_focus()` when the screen opens;
  plain `Control`s default to `FOCUS_NONE`.
- **An invisible full-rect panel swallows clicks** → its `mouse_filter` is `STOP`. Set
  `MOUSE_FILTER_IGNORE` on decorative panels and HUD roots.
- **Correct in the editor, cramped or off screen on ultrawide or 4:3** → `aspect` is `keep` (black
  bars) or the panel is anchored to a corner instead of the edge it should follow.
- **Theme vs. override.** Per-node `add_theme_*_override` calls beat the inherited `Theme`;
  overusing them defeats central theming.
- **`rect_*` properties were renamed.** Godot 3's `rect_size`/`rect_position`/`rect_min_size`
  became `size`/`position`/`custom_minimum_size`.

## References

- The official `Control` node docs cover anchor/offset math, every Container type, size-flag
  values, building a Theme and StyleBox in code, wiring focus neighbors, offset transforms, and
  common Control signals.

## Related skills

- `game-ui-ux` for engine-agnostic rules: scaling, safe areas, focus flow, screen stack.
- `godot-animation` for UI transitions via Tween.
- `godot-signals-groups` for wiring UI events to game logic.
- `input-systems` for rebindable input and multi-device focus.
- `card-game` / `visual-novel` for UI-heavy genre templates.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- `Control.offset_transform_*` and the `VirtualJoystick` node are new in 4.7.
- The default base size is 1152x648 and the default stretch mode is `disabled`, aspect `keep`.
