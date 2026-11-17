---
name: roblox-luau
description: "Luau scripting on Roblox: services via game:GetService, Instance types, Script/LocalScript/ModuleScript, the task library, and selene/luau-lsp checks. Auto-invoke when a LocalScript never fires, a client reads nil right after joining, or legacy wait() needs replacing. Not for remotes (`roblox-networking`), persistence (`roblox-datastores`), or editing a live place (`roblox-studio-workflow`)."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Roblox Luau

Write Luau that runs in the right place, owns its own connections, and passes static checks before
anyone hits Play. Remote events only show up here as base mechanics; contract design and
validation belong to `roblox-networking`.

> Adapted/translated from `roblox-luau` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Structuring a Roblox script: where it should live, `Script` vs `LocalScript` vs `ModuleScript`.
- A `LocalScript` that never fires, or a client reading `nil` right after joining.
- Replacing legacy `wait()`/`spawn()`/`delay()` with the `task` library.
- Setting up `selene` and `luau-lsp` on a Rojo project.

**Not this skill**: remote contract design and server-side validation (`roblox-networking`),
DataStore persistence (`roblox-datastores`), careful editing of an already-published place
(`roblox-studio-workflow`).

## Main workflow

1. **Read the project config first.** Rojo `*.project.json`, `selene.toml`, `.luaurc`,
   Wally/pesde manifests, and the place's `Workspace.SignalBehavior` / `LuauTypeCheckMode`. Follow
   the existing module layout instead of inventing a new one.
2. **Decide where the code runs** (table below). Check `RunContext` on any `Script` before
   assuming it's server code.
3. **Fetch services with `game:GetService("Name")`** at the top of the file, never by indexing
   `game` directly.
4. **Create Instances deliberately.** Set properties, then `Parent` last, so the Instance
   replicates once in its final state and change handlers don't fire for every property.
5. **Own every connection.** Keep what `:Connect` returns and disconnect it with the object or
   screen that created it; use `:Once` for a one-shot handler.
6. **Share code through ModuleScripts.** A module runs once per context (server, and each client
   separately) and `require` returns the cached result — so module-level state is per context,
   never shared between server and client.
7. **Verify before reporting.** Run the project's static tools (below). With the Studio MCP server
   connected, `start_stop_play`, exercise the change with `execute_luau` on the relevant
   datamodel, then read `get_console_output` and report any new error or warning. Without MCP, ask
   the user to press Play and paste the Output, server and client side when both changed.

### Where code runs

| Container | Runs | Use for |
|---|---|---|
| `ServerScriptService` | server `Script`s | authoritative logic; never replicated |
| `ServerStorage` | doesn't run; server-only storage | assets and data clients must never see |
| `ReplicatedStorage` | a `Script` with `RunContext = Client` runs here client-side | shared remotes, modules, and assets |
| `StarterPlayerScripts` | `LocalScript`, once per player | persistent client systems |
| `StarterCharacterScripts` | `LocalScript`, once per character | per-character client logic |
| `StarterGui` | `LocalScript` in UI, cloned into `PlayerGui` | UI behavior |

A `LocalScript` in `Workspace` (outside the player's character) or in `ServerScriptService` never
runs. A `Script` with `RunContext = Client` in a `Starter*` container runs twice (the original and
the clone): keep it in `ReplicatedStorage` instead.

## Patterns

### Server script: per-player setup that also covers early joiners

```lua
-- ServerScriptService/Leaderboard.server.luau
local Players = game:GetService("Players")

local function onPlayerAdded(player: Player)
    local stats = Instance.new("Folder")
    stats.Name = "leaderstats"          -- this exact name shows on the default leaderboard
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Parent = stats
    stats.Parent = player               -- Parent last
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in Players:GetPlayers() do  -- players who joined before this script connected
    task.spawn(onPlayerAdded, player)
end
```

### Connection owned by its object

```lua
local touchedOnce: {[Humanoid]: boolean} = {}
local connection = part.Touched:Connect(function(hit: BasePart)
    local humanoid = hit.Parent and hit.Parent:FindFirstChildOfClass("Humanoid")
    if not humanoid or touchedOnce[humanoid] then return end
    touchedOnce[humanoid] = true
    humanoid:TakeDamage(10)
    task.delay(1, function() touchedOnce[humanoid] = nil end)
end)
part.Destroying:Once(function() connection:Disconnect() end)
```

A single shared `debounce` boolean would block every other player while one touches the part; key
the debounce by the target instead (here the `Humanoid`), never globally.

### Base remote mechanics (the full contract lives in `roblox-networking`)

```lua
-- LocalScript: request only. The client can send anything.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local buyItem = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("BuyItem")
buyButton.Activated:Connect(function() buyItem:FireServer("sword") end)
```

```lua
-- Script: the server looks up the price and decides.
local PRICES = { sword = 100, shield = 75 }
buyItem.OnServerEvent:Connect(function(player: Player, itemId: unknown)
    if type(itemId) ~= "string" then return end
    local price = PRICES[itemId]
    local coins = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("Coins")
    if not price or not coins or coins.Value < price then return end
    coins.Value -= price
    grantItem(player, itemId)
end)
```

Rate limits, Instance-type arguments, yields in handlers, multi-client testing: all of that
belongs to `roblox-networking`.

### Frame loop and shared module

```lua
local RunService = game:GetService("RunService")
RunService.Heartbeat:Connect(function(dt: number)   -- after physics, every frame
    spinner.CFrame *= CFrame.Angles(0, math.rad(90) * dt, 0)
end)
```

```lua
-- ReplicatedStorage/Shared/GameConfig (ModuleScript)
local GameConfig = table.freeze({
    MaxHealth = 100,
    WeaponDamage = table.freeze({ sword = 25, bow = 15 }),
})
return GameConfig
```

Freezing shared config turns an accidental write into an immediate error, instead of a silent
divergence between contexts.

## Verify

1. `selene .` — the root `selene.toml` needs `std = "roblox"`.
2. `rojo sourcemap default.project.json --output sourcemap.json`, then
   `luau-lsp analyze --sourcemap=sourcemap.json src` (add Roblox type definitions; see `--help`).
3. Only run tools the project already uses; Studio Script Sync projects sometimes have no
   sourcemap.
4. With Studio MCP connected: launch Play, exercise the change via `execute_luau`, read
   `get_console_output`, and report any new error/warning. Without MCP, ask for a manual test with
   the Output pasted.

## Pitfalls

- **A `LocalScript` never fires** → placed in `Workspace` outside the character, or in
  `ServerScriptService` → move it to `StarterPlayerScripts`, `StarterCharacterScripts`, or
  `StarterGui`.
- **`Deferred` events change ordering.** When `Workspace.SignalBehavior` is `Deferred` (forced by
  Server Authority, and the announced future default), handlers run at the next resumption point,
  not inside the call that triggered them. Code that sets a property and assumes its `Changed`
  handler already ran by the next line breaks; a handler may see an Instance already destroyed.
  Read state inside the handler and check `instance.Parent` before use.
- **`nil` client-side right after connecting** → replication and streaming deliver objects
  progressively → use `WaitForChild` (with a timeout for optional content) client-side; server-side,
  objects you just created exist immediately.
- **Legacy globals `wait()`, `spawn()`, `delay()`** → legacy, rate-limited scheduling → use
  `task.wait`, `task.spawn`, `task.defer`, `task.delay`.
- **`type` vs `typeof`**: `type(v)` can't distinguish Roblox types (an Instance and a CFrame both
  return `"userdata"`) → use `typeof(v)` to get `"Instance"`, `"CFrame"`, etc.
- **`...Async` methods replace the old form** (`Player:LoadCharacterAsync()`,
  `Humanoid:ApplyDescriptionAsync()`) → check the API page before using an old name in new code.
- **`BindableEvent` is not a security boundary.** It only works inside a single machine
  (server-to-server, or client-to-client) and never replaces a remote.
- **Type warnings that disagree depending on the solver** → sort against the solver and mode the
  place actually uses (`Workspace.UseNewLuauTypeSolver`, `Workspace.LuauTypeCheckMode`, or a
  `--!strict` / `--!nonstrict` comment), never against an assumed older behavior.

## References

- Official docs: add `.md` to any Creator Hub URL, or start from
  `https://create.roblox.com/docs/llms.txt`.
- `https://create.roblox.com/docs/reference/engine/classes/Workspace`,
  `https://create.roblox.com/docs/reference/engine/enums/SignalBehavior`,
  `https://create.roblox.com/docs/scripting/events/deferred`.

## Related skills

- `roblox-networking`: remote contracts, validation, rate limits, Server Authority.
- `roblox-datastores`: persistence (server-only).
- `roblox-studio-workflow`: editing an existing place, Studio MCP, test evidence.
- `roblox-characters`, `roblox-ui`, `roblox-physics`: domains built on these foundations.
- `save-systems`, `input-systems`, `game-ai`: engine-agnostic patterns to implement in Luau.

## Version notes

Last checked: 2026-11-17.

- Luau's New Type Solver reached general availability in November 2025 for `nocheck` and
  non-strict scripts. Strict-mode places opt in with
  `Workspace.UseNewLuauTypeSolver = Enabled`; `Workspace.LuauTypeCheckMode` sets the default mode.
- `SignalBehavior.Default` currently behaves like `Immediate`; Roblox has announced a future switch
  to `Deferred`.
- `Player:LoadCharacter()` is deprecated in favor of `LoadCharacterAsync()`.
- Tool versions verified at source: Rojo 7.7.1, selene 0.32.0, luau-lsp 1.70.1, Luau 0.746.
