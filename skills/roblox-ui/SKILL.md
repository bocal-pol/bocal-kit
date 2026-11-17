---
name: roblox-ui
description: "Roblox UI with ScreenGui and PlayerGui: ResetOnSpawn, UDim2 scale/offset, flexible UIListLayout, safe zones, StyleSheet, gamepad selection, and touch controls. Auto-invoke for a HUD, a shop or settings menu, or UI that clips on phone, resets on respawn, or loses gamepad focus. Also load `game-ui-ux`. Not for input mapping (`input-systems`) or purchase checks (`roblox-networking`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox UI

Build editable Roblox interfaces that keep the experience's visual language and work on every
supported device. This skill owns Roblox Instances and API; `game-ui-ux` owns design rules — load
both for menu and HUD work.

> Adapted/translated from `roblox-ui` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Building or fixing a HUD, shop, or settings menu in `StarterGui`.
- UI that clips on phone, resets on respawn, or loses gamepad focus.
- Making an interface playable with keyboard/mouse, gamepad, and touch alike.

**Not this skill**: generic information-hierarchy and accessibility rules (`game-ui-ux`, to load
alongside this one), gameplay action mapping (`input-systems`), server-side purchase checks
triggered from the UI (`roblox-networking`), careful editing of a place
(`roblox-studio-workflow`).

## Main workflow

1. **Inspect before designing.** Inventory existing `ScreenGui`s, UI modules, fonts, colors, icon
   family, spacing, corners, strokes, animation timing, naming convention, and any
   `StyleSheet`/`StyleLink` token. Capture two viewports (`screen_capture` via Studio MCP, or ask
   the user for screenshots). Extend this visual language, don't invent a new one.
2. **Define ownership and lifecycle.** `StarterGui` is the edited template; Roblox clones it into
   each `PlayerGui`. Decide per `ScreenGui` whether it survives respawn (`ResetOnSpawn = false`)
   and never keep a reference to a destroyed clone.
3. **Build a readable hierarchy.** Named Instances over small behavior modules. A screen should be
   understandable from the Explorer; procedural creation is reserved for data-driven repetition.
4. **Build a responsive structure.** `UDim2` in scale for placement, bounded offsets for
   components, consistent `AnchorPoint`s, layouts, padding, and size constraints. Design an
   explicit narrow layout rather than shrinking the desktop panel.
5. **Handle obstructions.** Keep interactive UI inside `CoreUISafeInsets` (the default
   `ScreenInsets`) and away from touch movement/jump controls; plan for TV overscan.
6. **Wire state and input.** Render from a small view state. Use `Activated` for buttons, explicit
   selected states, and a reachable gamepad path. Bind screen actions only while the screen owns
   them.
7. **Polish with restraint.** Hover, pressed, selected, disabled. Animate state transitions,
   respect `GuiService.ReducedMotionEnabled`, cancel tweens and connections on close.
8. **Verify before reporting.** Build level: `rojo build <project>.project.json -o out.rbxlx` must
   succeed for Rojo projects. Live, with Studio MCP connected: launch Play, open the screen from
   `execute_luau` on the `Client` datamodel, print `GuiService.SelectedObject` and `AbsoluteSize`
   of the root and scroll canvas, then `screen_capture`; Studio's built-in
   `rbx-device-simulator-lua` skill (via the `skill` tool) changes device presets for the viewport
   matrix. Without MCP, ask the user to check the matrix with Device Simulator and Controller
   Emulator and report clipping, overlap, focus path, and respawn behavior.

## Production structure

```text
StarterGui
└── InventoryGui (ScreenGui; ResetOnSpawn = false)
    ├── Root (Frame)
    │   ├── Header
    │   ├── Content
    │   │   ├── CategoryList
    │   │   ├── ItemGrid (ScrollingFrame)
    │   │   └── DetailsPanel
    │   └── Footer
    └── InventoryController (LocalScript)
ReplicatedStorage
└── UI
    ├── Components
    └── Theme
```

Names describe roles, not colors or positions. Repeated cells are templates or components; the
shell stays visible in the Explorer.

## Patterns

### Layout that survives content and viewport changes

```lua
-- On ItemGrid (ScrollingFrame):
--   AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.fromOffset(0, 0)
-- Children: UIPadding + UIGridLayout
local grid = itemGrid.UIGridLayout
local projectBreakpoint = 700 -- where this composition stops being usable, not a device name

local function applyComposition()
    local narrow = root.AbsoluteSize.X < projectBreakpoint
    categoryList.UIListLayout.FillDirection = if narrow
        then Enum.FillDirection.Horizontal
        else Enum.FillDirection.Vertical
    categoryList.Size = if narrow then UDim2.new(1, 0, 0, 40) else UDim2.new(0, 148, 1, 0)
    itemGrid.Position = if narrow then UDim2.fromOffset(0, 52) else UDim2.fromOffset(164, 0)
    itemGrid.Size = if narrow then UDim2.new(1, 0, 1, -52) else UDim2.new(0.58, -164, 1, 0)
    detailsPanel.Visible = not narrow -- narrow screens open details as a separate state

    local width = itemGrid.AbsoluteSize.X
    local columns = if width < 520 then 2 elseif width < 820 then 3 else 4
    local gap = 12
    local usable = width - itemGrid.UIPadding.PaddingLeft.Offset
        - itemGrid.UIPadding.PaddingRight.Offset - gap * (columns - 1)
    grid.CellSize = UDim2.fromOffset(math.floor(usable / columns), 112)
    grid.CellPadding = UDim2.fromOffset(gap, gap)
end

root:GetPropertyChangedSignal("AbsoluteSize"):Connect(applyComposition)
applyComposition()
```

`UIListLayout` for one-dimensional flow (with flex for shared space), `UIGridLayout` for uniform
cells, `UITableLayout` only for real tables. `AutomaticSize` fits content; `AutomaticCanvasSize`
fits scroll content. Bound extremes with `UISizeConstraint`, `UIAspectRatioConstraint`, or
`UITextSizeConstraint` rather than a single global `UIScale`. In a styled project, a `StyleQuery`
can change rules at a size breakpoint without a resize script.

### A single activation path and explicit gamepad entry

```lua
local GuiService = game:GetService("GuiService")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local function usesDirectionalFocus(): boolean
    local preferred = UserInputService.PreferredInput
    return preferred == Enum.PreferredInput.Gamepad
        or preferred == Enum.PreferredInput.MicroGamepad
end

local function focusFirstItem()
    task.spawn(function()
        RunService.RenderStepped:Wait() -- the target must be rendered and selectable
        if root.Visible and usesDirectionalFocus() then
            GuiService.SelectedObject = firstItemButton
        end
    end)
end

local function openInventory()
    root.Visible = true
    focusFirstItem()
end

local function closeInventory()
    GuiService.SelectedObject = nil
    root.Visible = false
end

-- Owned by the screen's lifecycle; disconnect on teardown.
local inputConnection = UserInputService:GetPropertyChangedSignal("PreferredInput"):Connect(function()
    if root.Visible and GuiService.SelectedObject == nil then focusFirstItem() end
end)

firstItemButton.Activated:Connect(function()
    selectItem(firstItemButton:GetAttribute("ItemId"))
end)
```

Choose input-dependent UI from `UserInputService.PreferredInput`, which tracks the player's primary
device. `TouchEnabled` and `GamepadEnabled` are capabilities (a touch laptop reports touch), and
`GetLastInputType()` flips on every discrete input. Set `NextSelection*` where automatic navigation
is ambiguous (grids, sidebars, modals). A modal traps focus with `SelectionGroup = true` plus
`SelectionBehavior*` set to `Stop`, and restores a sensible selection on close.

### State transition without animation noise

```lua
local TweenService = game:GetService("TweenService")
local GuiService = game:GetService("GuiService")
local fade = TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local activeTween: Tween? = nil

local function setPanelVisible(visible: boolean)
    if activeTween then activeTween:Cancel(); activeTween = nil end
    local target = if visible then 0 else 1
    panel.Visible = true -- panel is a CanvasGroup
    if GuiService.ReducedMotionEnabled then
        panel.GroupTransparency = target
        panel.Visible = visible
        return
    end
    local tween = TweenService:Create(panel, fade, { GroupTransparency = target })
    activeTween = tween
    tween.Completed:Once(function(state)
        if state == Enum.PlaybackState.Completed and not visible then panel.Visible = false end
    end)
    tween:Play()
end
```

Animate the panel once, not every descendant, and cancel the previous tween so a quick
open/close never leaves the panel invisible but still interactive.

## Verify

1. `rojo build <project>.project.json -o out.rbxlx` succeeds.
2. Studio MCP: launch Play, open the screen via `execute_luau` on `Client`, print
   `GuiService.SelectedObject` and `AbsoluteSize`, capture the screen.
3. Without MCP: ask for a pass over the viewport matrix with Device Simulator and Controller
   Emulator — clipping, overlap, focus path, respawn behavior.
4. Check that no persistent `ScreenGui` keeps a reference to a cloned and destroyed `PlayerGui`
   (`ResetOnSpawn`).

## Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| UI disappears or duplicates after respawn | wrong `ResetOnSpawn` policy or stale clone | choose the policy; re-acquire from `PlayerGui`; clean old bindings |
| layout clips on phone | desktop offsets or a single global `UIScale` used as layout | narrow composition, layouts, bounds, Device Simulator checks |
| content under the topbar or notch | insets ignored or `ScreenInsets = None` | `CoreUISafeInsets` for interactive UI; let only decoration overflow |
| scrolling stops too early | fixed `CanvasSize` | `AutomaticCanvasSize` or the layout's `AbsoluteContentSize` |
| gamepad gets stuck or escapes a modal | no input selection or wrong neighbor graph | set `SelectedObject`; define edges; `SelectionGroup` with `Stop` |
| panel invisible but still blocks clicks | interrupted tween left `Visible = true` | cancel the previous tween; hide on `Completed` |
| UI looks AI-generated | decoration substituted for hierarchy | remove effects; align, reduce nesting, fix density and roles |
| Explorer shows only one script | the whole interface built at runtime | build the shell as named Instances |
| connection or tween count keeps growing | the screen rebinds without cleanup | own connections per screen; disconnect and cancel on teardown |

## References

- `https://create.roblox.com/docs/ui/on-screen-containers`,
  `https://create.roblox.com/docs/ui/position-and-size`,
  `https://create.roblox.com/docs/ui/size-modifiers`,
  `https://create.roblox.com/docs/reference/engine/enums/PreferredInput`,
  `https://create.roblox.com/docs/reference/engine/classes/GuiService`.

## Related skills

- `game-ui-ux`: information hierarchy, screen flows, accessibility, design rules.
- `input-systems`: gameplay action mapping and device switching.
- `roblox-networking`: server-authoritative requests launched from the UI.
- `roblox-studio-workflow`: Explorer-first editing and Studio verification.

## Version notes

Last checked: 2026-11-17.

- `StyleQuery` and the enhanced style system reached full availability in May 2026; style
  transitions did too.
- `Enum.PreferredInput` values: `KeyboardAndMouse`, `Gamepad`, `Touch`, `MicroGamepad` (a
  stick-less controller, like a TV remote).
- `GuiBase2d.SelectionGroup` and `SelectionBehaviorUp/Down/Left/Right` are the per-property method
  for containing navigation. `GuiService:AddSelectionParent()` and `AddSelectionTuple()` still
  exist.
- Rojo 7.7.1 verified at source.
