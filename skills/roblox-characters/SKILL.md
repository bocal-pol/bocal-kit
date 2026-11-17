---
name: roblox-characters
description: "Roblox player characters: CharacterAdded lifecycle, Humanoid and HumanoidRootPart, R6/R15/custom rigs, respawn, and Tools. Auto-invoke when a character script breaks after respawn, animations don't play or replicate, or sprint code conflicts with the Humanoid. Not for hit validation (`roblox-networking`), forces and raycasts (`roblox-physics`), or cameras (`camera-systems`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox characters

A `Player` is the durable identity; each `Character` is a replaceable session with its own
references, connections, animation tracks, and cleanup. Most character bugs come from one
character's state leaking into the next.

> Adapted/translated from `roblox-characters` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Wiring or fixing `CharacterAdded`, `Humanoid`, R6/R15/custom rigs, respawn, Tools.
- A system breaks after the first respawn, animations stop playing, or sprint code conflicts with
  Humanoid movement.

**Not this skill**: deciding whether a hit counts (`roblox-networking`), raw forces/
constraints/raycasts (`roblox-physics`), cameras that follow the character (`camera-systems`),
input-side action mapping (`input-systems`).

## Main workflow

1. **Read the character contract.** Avatar Settings (rig type, movement system),
   `StarterCharacter`, `StarterCharacterScripts`, `Players.CharacterAutoLoads`,
   `Workspace.PlayerCharacterDestroyBehavior`, existing Animate or controller scripts, tools, tags,
   collision groups. Extend the existing setup; don't add a second controller.
2. **Separate scopes.** Player-scoped state survives respawn; character-scoped state doesn't. Put
   each character's temporary connections, tracks, and instances in a single cleanup scope.
3. **Bind existing and future characters.** Connect `CharacterAdded`, then bind `player.Character`
   if it already exists. Server-side, do the same for players already in
   `Players:GetPlayers()`.
4. **Resolve parts defensively.** `WaitForChild` with a timeout for `Humanoid`, the root part, and
   `Animator`; after every yield, check the character is still current before acting.
5. **Pick a single movement owner per state.** Standard avatars use Humanoid movement or the
   Character Controller Library. Physical mechanics (dash, knockback, grapple) use an impulse or a
   constraint for their duration and hand control back cleanly afterward.
6. **Own the animation lifecycle.** Load through the rig's `Animator`, keep tracks and marker
   connections in the character's scope, stop them on cleanup. Markers drive presentation; any
   gameplay effect they trigger is validated server-side.
7. **Run the lifecycle check.** With Studio MCP connected, launch Play, respawn the player
   multiple times from `execute_luau` on `Server`
   (`for _ = 1, 5 do player:LoadCharacterAsync() task.wait(1) end`), then read
   `get_console_output`: expect no errors and exactly one setup log per spawn. Without MCP, ask the
   user to reset five times in Test and once with two players in Server & Clients, and report
   duplicate logs, frozen animations, or errors.

## Patterns

### Replaceable character scope

```lua
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local generation = 0
local connections: {RBXScriptConnection} = {}
local currentCharacter: Model? = nil

local function clearCharacter()
    generation += 1
    for _, connection in connections do connection:Disconnect() end
    table.clear(connections)
    currentCharacter = nil
end

local function bindCharacter(character: Model)
    -- Guard against a stale call wiping an already-current binding.
    if player.Character ~= character or currentCharacter == character then return end
    clearCharacter()
    currentCharacter = character
    local thisGeneration = generation
    local humanoid = character:WaitForChild("Humanoid", 10)
    local root = character:WaitForChild("HumanoidRootPart", 10)
    -- A respawn during WaitForChild bumps generation and makes this call stale.
    if not humanoid or not root or generation ~= thisGeneration then return end

    table.insert(connections, humanoid.Died:Connect(function()
        if generation ~= thisGeneration then return end
        setCharacterUiEnabled(false)
    end))
    attachCurrentCharacterSystems(character, humanoid, root)
end

player.CharacterRemoving:Connect(function(character)
    if currentCharacter == character then clearCharacter() end
end)
player.CharacterAdded:Connect(bindCharacter)
if player.Character then task.defer(bindCharacter, player.Character) end
```

Use the project's cleanup utility when one exists instead of introducing a framework for three
connections. Server systems repeat this binding per `Player` and clear player-scoped tables on
`PlayerRemoving`.

### Animation via Animator and markers

```lua
local animation = Instance.new("Animation")
animation.AnimationId = "rbxassetid://1234567890"
local track = animator:LoadAnimation(animation)
local markerConnection = track:GetMarkerReachedSignal("Commit"):Connect(function(parameter)
    playLocalSwingEffect(parameter) -- presentation only; the server validates any hit
end)

track:Play(0.1)
-- On character teardown:
markerConnection:Disconnect()
track:Stop(0.1)
animation:Destroy()
```

Rigs without a `Humanoid` need an `AnimationController` with an `Animator`.
`Humanoid:LoadAnimation()` is deprecated; always load through the `Animator`.

## Movement and rig rules

- If R6 is supported, don't hardcode R15 member names. Prefer attachments, tags, or a small rig
  adapter; only branch on `Humanoid.RigType` where topology genuinely differs.
- `HumanoidRootPart` is the usual assembly root, not a guarantee for a custom model. Document the
  custom rig's contract and validate it at spawn.
- Setting `AssemblyLinearVelocity` is an instant change; use `ApplyImpulse` for a one-shot push and
  a `LinearVelocity` constraint for sustained control (details in `roblox-physics`).
- For new actions like sprinting or rebinding jump, use the Input Action System (`InputContext`,
  `InputAction`, `InputBinding`) rather than raw `UserInputService` hooks. Give your context a
  higher `Priority` (and `Sink`) than the default player contexts so it wins.
- If the place uses the Character Controller Library (Avatar Settings → Movement → Abilities) or a
  `ControllerManager`, extend its abilities and controllers. Stacking `HumanoidStateType` changes
  on top conflicts with the library.
- Tools move between `Backpack` and the character on equip. Listen to the tool's ancestry and
  `Equipped`/`Unequipped` events rather than assuming a single parent.
- Change appearance with `Humanoid:ApplyDescriptionAsync()` and keep the applied
  `HumanoidDescription` up to date.
- Under Server Authority (`Workspace.AuthorityMode = Server`), gameplay animation runs in bound
  simulation functions and the client may swap tracks during a rollback; look up tracks every
  frame with `Animator:GetTrackByAnimationId()` rather than caching them.

## Verify

1. Studio MCP: repeated respawn (5x) via `execute_luau` on `Server`, read `get_console_output` —
   no errors, one setup log per spawn.
2. Without MCP: ask the user for 5 resets in Test, then a two-player test in Server & Clients;
   report duplicate logs, frozen animations, errors.
3. Grep tables indexed by Instance to confirm they're cleared on
   `CharacterRemoving`/`PlayerRemoving`.
4. Test every supported rig (R6, R15, custom) through the same respawn scenario.

## Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| works once, breaks after a reset | cached character, Humanoid, or root | rebuild on every `CharacterAdded`; clean up on leave |
| callbacks fire twice after a death | old character's connections survived | character-scoped cleanup plus generation checks |
| memory grows with every respawn | old characters just unparented, tables still reference them | clear Instance-indexed tables; check `PlayerCharacterDestroyBehavior` |
| a deferred setup edits the wrong rig | async work outlived its spawn | compare current character or generation after every yield |
| animation plays only locally or not at all | wrong Animator, side, or asset permission | inspect the rig's Animator, who loads it, the asset owner |
| a hit marker grants impossible hits | marker treated as authority | marker for timing; the server validates combat state |
| errors on R6 or custom rig | R15 names assumed | rig contract and adapter; test every supported rig |
| a tool disappears from a system | fixed Backpack or Character parent assumed | handle equip, unequip, character replacement |
| a custom force conflicts with the Humanoid | two controllers own movement | one movement owner per state; restore on exit |

## References

- `https://create.roblox.com/docs/characters`,
  `https://create.roblox.com/docs/animation/using`,
  `https://create.roblox.com/docs/characters/character-controller-library`,
  `https://create.roblox.com/docs/reference/engine/classes/Humanoid`,
  `https://create.roblox.com/docs/projects/server-authority`.

## Related skills

- `roblox-physics`: forces, constraints, assemblies, network ownership.
- `roblox-networking`: validating character actions and rejecting stale requests.
- `input-systems`: action mapping and responsive movement intent.
- `camera-systems`: cameras that follow a replaceable character.

## Version notes

Last checked: 2026-11-17.

- `Player:LoadCharacter()`, `Humanoid:ApplyDescription()`, and `Humanoid:PlayEmote()` are
  deprecated in favor of `LoadCharacterAsync()`, `ApplyDescriptionAsync()`, and `PlayEmoteAsync()`.
- The Character Controller Library was announced production-ready in April 2026; its doc page
  still carried a beta note as of the source's check date. Avatar Settings needs a saved or
  published place.
- `Workspace.PlayerCharacterDestroyBehavior`, when enabled, destroys the old character on respawn
  and the `Player` object on leave.
