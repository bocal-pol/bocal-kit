---
name: game-ui-ux
description: "Engine-agnostic design rules for game HUDs and menus: anchors and containers, scaling, safe areas, gamepad focus, event-driven HUDs instead of polling, and accessibility minimums. Auto-invoke for menus, health bars, or inventory screens that break on ultrawide or mobile. Pair with `godot-ui-control` or `roblox-ui`. Not for button juice (`game-feel`) or rebinding (`input-systems`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Game UI/UX

Make every HUD and menu work on a phone, an ultrawide monitor, and a TV, with a mouse or with a
gamepad only. This skill decides layout, scaling, focus, screen flow, and how the UI listens to
game state; the engine's UI skill provides the nodes, components, and styles.

> Adapted and translated from the `game-ui-ux` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Building a HUD, menu, inventory or shop screen, or any overlay.
- Fixing a UI that breaks at other resolutions, ignores safe areas, blocks a gamepad player, or
  polls game state every frame.
- Structuring screen flow (title, gameplay, pause, settings, confirmation) as a stack.

**Not this skill**: widget and theme APIs (`godot-ui-control`, `roblox-ui`, Unity UGUI or UI
Toolkit through the Unity skills), visual juice (`game-feel`), conversation flow and choice logic
(`dialogue-systems`), rebind-screen input logic (`input-systems`), UI art and icons
(`create-game-assets`). For deep accessibility auditing (WCAG, ARIA, screen readers), see
`accessibility-lead` — this skill covers game-specific accessibility minimums (text size,
contrast, color independence, touch targets).

## Workflow

1. **Inspect the project's UI first**: stretch/CanvasScaler settings, existing theme, fonts,
   screen-switching code, and which input devices the game targets.
2. **Lay out with anchors and containers.** Anchor to edges, corners, or center; let rows,
   columns, and grids place children. A hard-coded `(x, y)` is only correct at one resolution.
3. **Fix a single scaling policy for the whole UI**: a reference resolution (usually 1920x1080)
   that scales, plus an aspect rule: `expand` and anchor HUD corners outward (default), or
   letterbox when the design genuinely needs a fixed frame.
4. **Keep critical UI inside the safe area** (health, timers, prompts); decorative art can
   bleed. Reapply on resize and orientation change.
5. **Make every screen gamepad-navigable**: a control with focus on open, fixed neighbors where
   the engine guesses poorly, a focus style distinct from hover, focus trapped inside modals.
6. **Model screens as a stack.** Push for overlays, pop to go back; only the top screen gets
   input, and the one below regains its focus.
7. **Drive the HUD by events.** Subscribe to `health_changed`, `score_changed`; set the initial
   value once on connect, since signals don't replay.
8. **Verify with an executable check, then on screens.**
   - Headless focus check: a script that opens each screen in turn and fails if
     `get_viewport().gui_get_focus_owner()` (Godot) or
     `EventSystem.current.currentSelectedGameObject` (Unity) is null.
   - Size sweep: run at 1280x720, 2560x1080, and 1080x2340 (Godot: `--resolution WxH`; needs a
     display or `xvfb-run`, since the headless renderer draws nothing) and save a viewport
     screenshot at each. Inspect them for clipped or overlapping elements.
   - Ask the user to unplug the mouse, navigate every menu with a gamepad, and report any screen
     where nothing is selected or focus escapes.

## Patterns

### 1. Anchors and containers

```gdscript
# Godot 4.7. Anchor the score to a corner; an HBoxContainer spaces the hearts.
func _ready() -> void:
    $Score.set_anchors_preset(Control.PRESET_TOP_LEFT)
    for i in lives:
        $Hearts.add_child(make_heart())
```

Unity UGUI: anchor the `RectTransform` to the corner and use a `HorizontalLayoutGroup`; set the
pivot to the same corner, or the element grows in every direction when its size changes.

### 2. Scaling settings

```text
Godot 4.7  project.godot [display]:
  window/stretch/mode="canvas_items"   window/stretch/aspect="expand"
  window/size/viewport_width=1920      window/size/viewport_height=1080
Unity 6.3  CanvasScaler: Scale With Screen Size, Reference Resolution 1920x1080,
  Match Width Or Height = 0.5 (1.0 if the layout must never crop vertically)
Unity 6.3  UI Toolkit: the same three settings live on the PanelSettings asset
```

### 3. Safe area inset

```gdscript
# Godot 4.7. Only Android and iOS report a real safe area; elsewhere the margins come out at ~0.
func _apply_safe_area() -> void:
    var safe := Rect2(DisplayServer.get_display_safe_area())           # screen pixels
    var win := Rect2(Rect2i(DisplayServer.window_get_position(), DisplayServer.window_get_size()))
    var inner := safe.intersection(win)
    var to_ui := get_viewport_rect().size / win.size    # window pixels -> UI units under stretch
    $Margin.add_theme_constant_override("margin_left", int((inner.position.x - win.position.x) * to_ui.x))
    $Margin.add_theme_constant_override("margin_top", int((inner.position.y - win.position.y) * to_ui.y))
    $Margin.add_theme_constant_override("margin_right", int((win.end.x - inner.end.x) * to_ui.x))
    $Margin.add_theme_constant_override("margin_bottom", int((win.end.y - inner.end.y) * to_ui.y))
```

Unity: read `Screen.safeArea` and set a panel's `anchorMin`/`anchorMax` to its corners divided by
`Screen.width`/`Screen.height`; recompute when the rect changes, not every frame.

### 4. Focus on open

```gdscript
# Godot 4.7. Set focus to something on open; fix neighbors only where auto-guessing gets it wrong.
func _on_screen_shown() -> void:
    $PlayButton.grab_focus()
    $PlayButton.focus_neighbor_bottom = $SettingsButton.get_path()
    $SettingsButton.focus_neighbor_top = $PlayButton.get_path()
```

Unity UGUI: `EventSystem.current.SetSelectedGameObject(playButton)` in `OnEnable`, with
`Navigation` set to Automatic or Explicit. UI Toolkit: call `Focus()` on the first element.

### 5. Event-driven HUD

```gdscript
# RIGHT: the HUD reacts to a signal; it only updates when health actually changes.
func _ready() -> void:
    player.health_changed.connect(_on_health_changed)     # emitted by gameplay
    _on_health_changed(player.hp, player.max_hp)           # signals don't replay initial state
func _on_health_changed(current: int, max_health: int) -> void:
    # ratio maps 0..1 to the bar's configured range (default value range 0..100).
    $HealthBar.ratio = clampf(float(current) / max_health, 0.0, 1.0) if max_health > 0 else 0.0
# WRONG: func _process(dt): $HealthBar.value = player.hp / player.max_hp  # polls every frame,
# couples the UI to the player's internals, and runs even when nothing changed.
```

## Pitfalls

- **Nothing focused on open** leaves a gamepad player stuck on the first menu. Each screen sets
  focus on a control when shown, and again when a screen above it closes.
- **Focus escapes a modal.** Showing a dialog and focusing its button doesn't stop neighbor
  search from reaching buttons behind it. Disable focus and mouse on the screen below (Godot
  4.5+: `focus_behavior_recursive` and `mouse_behavior_recursive`).
- **`set_process_input(false)` doesn't disable a Godot menu**: buttons receive GUI input, not
  `_input`. Use the recursive focus and mouse behaviors above.
- **Unity UGUI ignores the gamepad, or throws at startup**, after switching Active Input Handling
  to the Input System: the scene still has a `StandaloneInputModule`. Replace it with
  `InputSystemUIInputModule`. UI Toolkit reads the project-wide UI actions and needs no module.
- **Pixel-art UI at a fractional scale** flickers and blurs. Godot: set
  `window/stretch/scale_mode="integer"`; Unity: pick a reference resolution that divides target
  displays exactly and use a pixel-perfect canvas.
- **Text too small on a TV.** Default text should be at least 26 px at 1080p on console and TV,
  and 18 px at 1080p on PC, scalable to 200% without losing content.
- **Color as the only signal** (red means danger) fails for color-blind players. Add an icon,
  shape, or label. Text carrying gameplay information needs at least 4.5:1 contrast.
- **Hard-coded English sized to fit** overflows in German (often about 30% longer). Use string
  tables (`tr()`, Unity Localization) and containers that size to content.
- **Menu flow as booleans** (`is_paused`, `in_settings`, `confirm_open`) breaks at the third
  overlay. Use the screen stack.
- **Pausing freezes the pause menu.** Godot: `get_tree().paused = true` and `process_mode =
  PROCESS_MODE_ALWAYS` on the overlay; Unity: the menu animation must use unscaled time when
  pausing with `Time.timeScale = 0`.
- **Mouse movement clears gamepad focus.** Let the mouse move the selection, but never leave the
  screen with nothing selected after the mouse stops.

## References

- [`references/layout-and-flow.md`](references/layout-and-flow.md): read for per-engine stretch
  and scale settings, safe-area math, the full focus-trap and screen-stack code, diegetic vs
  non-diegetic UI, accessibility details, and localization-ready layout.

## Related skills

- `godot-ui-control`, `roblox-ui`: engine widgets, themes, and styles; load alongside this skill.
- `accessibility-lead`: deep accessibility auditing (WCAG, ARIA, screen readers).
- `game-feel`: button pops, transitions, and HUD juice on top of this layout.
- `dialogue-systems`: conversation and choice logic inside this UI shell.
- `input-systems`: device switching and rebind screens.

## Version notes

Last checked: 2026-11-11.

- Text size: Xbox Accessibility Guideline 101 sets 26 px at 1080p (52 px at 4K) for console,
  18 px at 1080p (36 px at 4K) for PC, and scaling up to 200%.
- Contrast: Xbox Accessibility Guideline 102, 4.5:1 for text, 3:1 for large text and key
  visuals.
- Godot 4.7: `Control.focus_behavior_recursive`/`mouse_behavior_recursive` (added in 4.5),
  `DisplayServer.get_display_safe_area()`.
- Unity 6.3 LTS with the Input System package (1.20.1, October 2026):
  `InputSystemUIInputModule` replaces `StandaloneInputModule`.
