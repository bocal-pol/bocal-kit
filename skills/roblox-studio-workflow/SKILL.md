---
name: roblox-studio-workflow
description: "Safely edit an existing Roblox place or Rojo project: find the source of truth and prove changes with the right test mode or Studio MCP (execute_luau). Auto-invoke when an agent edits a .rbxl or Rojo project, works via Studio MCP tools, or must report what was tested. Not for installing Studio MCP (official Roblox skill) or feature code itself (`roblox-luau`, `roblox-ui`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox Studio workflow

Work like a collaborator inside an existing place, not as if it were a blank text repo. This skill
owns how changes are made and proven; domain skills own what the code does.

> Adapted/translated from `roblox-studio-workflow` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Editing a `.rbxl` place or a Rojo project already in production without breaking sync.
- Deciding whether a subtree belongs to Studio, Rojo, Script Sync, or a package.
- Honestly reporting what was tested (and at what level) after a change.

**Not this skill**: installing or connecting Studio MCP (Roblox's official `roblox-get-started`
skill), the content of feature code (`roblox-luau`, `roblox-ui`, `roblox-networking`, etc. — this
skill frames *how* to touch them safely).

## Main workflow

1. **Establish the source of truth.** Decide whether Studio, Rojo files, Script Sync, a package,
   or a generated build owns each subtree (`*.project.json` mappings, `PackageLink` objects). Edit
   only the owner; a Studio edit on a Rojo-mapped script is overwritten on the next sync.
2. **Inventory before proposing a structure.** Search scripts, modules, remotes, tags, and
   Attributes to find the current owner of a feature (`rg` on the Rojo tree, or `script_grep` and
   `search_game_tree` via Studio MCP). Run once and note existing warnings, so new ones are
   genuinely new.
3. **Plan the smallest compatible change.** Name the Instances and run locations that will
   change. Reuse existing remotes, components, cleanup utilities, tags, folders, and config
   patterns. State any unresolved ownership question.
4. **Create real, meaningful objects.** Edited UI, folders, attachments, constraints, remotes, and
   config stay inspectable in the Explorer. Scripts add genuinely dynamic behavior and repetition;
   they don't hide a whole feature inside runtime construction.
5. **Respect execution and replication.** Authoritative logic in server containers, persistent
   client logic in `StarterPlayerScripts`, per-character logic in `StarterCharacterScripts`, UI
   templates in `StarterGui`, shared modules and remotes in `ReplicatedStorage`, server secrets and
   assets in server-only containers. Check the `RunContext` of every `Script`.
6. **Test the real risk** with the smallest verification rung that covers it.
7. **Clean up the experiment.** Remove temporary parts, test remotes, Command Bar fixtures, debug
   UI, prints, disabled duplicate scripts, placeholder assets, and diagnostic tags/Attributes. Stop
   the session and confirm the edit-mode hierarchy is clean (`search_game_tree` or Explorer).
8. **Report evidence precisely.** Instances and files changed; modes and client count; cases run;
   Output observed; failures and fixes; what wasn't run. Label every claim as run, statically
   checked, prepared but not launched, or unverified. "Looks right" and static inspection are never
   "tested in Studio."

## When Studio MCP is connected

If tools like `list_roblox_studios` and `execute_luau` are available, drive the same ladder through
them rather than asking the user to click: pick the place with `list_roblox_studios`, inventory,
edit with `multi_edit`, launch with `start_stop_play` and `execute_luau`, and collect evidence with
`get_console_output` and `screen_capture` from server and client. For live debugging, unit tests,
device capture, and profiling, call Studio's built-in skills (`rbx-debug`, `rbx-unit-test`,
`rbx-device-simulator-lua`, `rbx-perf-profiling`) via the `skill` tool.

When the tools are absent, the manual Studio/Rojo path is the full default; nothing here requires
MCP.

## Run-location map

| Location | Typical role | Key constraint |
|---|---|---|
| `ServerScriptService` | authoritative scripts and modules | not replicated to clients |
| `ServerStorage` | server-only assets and data | inaccessible to clients |
| `ReplicatedStorage` | shared modules, assets, remotes | visible to clients; no secrets |
| `StarterPlayerScripts` | client systems across respawns | cloned into `PlayerScripts` |
| `StarterCharacterScripts` | per-character client behavior | recreated for every character |
| `StarterGui` | edited UI templates | cloned into `PlayerGui`; lifecycle depends on `ResetOnSpawn` |
| `Workspace` | replicated world and live characters | streaming and ownership change what clients see |

## Reuse before adding

Before creating a RemoteEvent, search by purpose and read both ends. Before adding a "manager"
module, find the current owner of the feature. Before adding folders or tags, read the existing
naming and lookup conventions. Duplicate systems double-bind input, save twice, create two UI
clones, or apply gameplay twice.

```lua
local CollectionService = game:GetService("CollectionService")

local function setupDoor(instance: Instance)
    if not instance:IsA("Model") then return end
    local accessLevel = instance:GetAttribute("AccessLevel")
    if type(accessLevel) ~= "number" then
        warn(`Door {instance:GetFullName()} needs numeric AccessLevel`)
        return
    end
    attachDoorBehavior(instance, accessLevel)
end

for _, door in CollectionService:GetTagged("Door") do setupDoor(door) end
CollectionService:GetInstanceAddedSignal("Door"):Connect(setupDoor)
```

The owning system also tears down behavior when a tagged Instance is removed.

## Verification ladder

1. **Static:** the project JSON and models build
   (`rojo build default.project.json -o check.rbxlx`), links resolve, selene and
   luau-lsp pass wherever the project uses them.
2. **Single session:** right run context and hierarchy, no new Output error or warning, happy
   path and cleanup.
3. **Lifecycle:** respawn, reset, rejoin, streaming, or character replacement as relevant.
4. **Server & Clients:** at least two clients for remotes, replication, ownership, player
   interaction, joins and leaves, and targeted state.
5. **Device and input:** representative device profiles, orientation, touch, gamepad.
6. **Stress and failure:** malformed input, spam, empty and full content, rapid transitions,
   simultaneous actions, disconnects.

Use the smallest rungs that cover the change, and never report a lower rung as a higher one.
Rungs 4-5 often need the user: ask them to run the named mode and paste the server and client
Output.

## Verify

1. `rojo build default.project.json -o check.rbxlx` succeeds (when the project uses Rojo).
2. selene and luau-lsp pass on the touched files.
3. Studio MCP (when connected): a single session with no new Output error, then the next relevant
   rung (lifecycle, Server & Clients).
4. Post-session hierarchy inspected (`search_game_tree` or Explorer): no test residue.
5. Final report labeled by the rung actually reached — never rounded up.

## Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| a Studio edit disappears after sync | a Rojo-generated or -mapped subtree was edited directly | change the source files and resync |
| a feature runs twice | duplicate Script, remote, or controller | inspect first; consolidate under the existing owner |
| the client can't reach a module or object | wrong storage location | move shared content deliberately; keep secrets server-only |
| an edited screen is unreadable in the Explorer | everything built by a single LocalScript | shell of named Instances plus small behavior modules |
| a test only passes in solo Test | replication or lifecycle untested | Server & Clients plus the relevant simulators |
| a "clean" Output hides client errors | only the server Output was read | read every client and the server |
| a shipped place has a DebugFolder or prints | cleanup skipped | keep a cleanup list; inspect the hierarchy after the session |
| `list_roblox_studios` is empty | Studio closed, no place open, or MCP server disabled | ask the user to open a place and enable the server |
| an MCP edit lands in the wrong place | multiple Studio windows open | pass the `studio_id` from `list_roblox_studios` |
| an Attribute or tag behavior fails silently | schema or class unvalidated | validate at setup; warn with the Instance's full path |

## References

- `https://create.roblox.com/docs/studio/testing-modes`,
  `https://create.roblox.com/docs/studio/mcp`,
  `https://create.roblox.com/docs/reference/engine/classes/StudioTestService`.

## Related skills

- `roblox-luau`: services, Instances, events, run model.
- `roblox-ui`, `roblox-networking`, `roblox-characters`, `roblox-physics`, `roblox-datastores`,
  `roblox-simulator-economy`: feature work that uses this inspection and verification discipline.

## Version notes

Last checked: 2026-11-17.

- Studio MCP tool names and the built-in `rbx-` skills change with Studio versions.
- Server & Clients and `StudioTestService:ExecuteMultiplayerTestAsync()` both support up to eight
  clients.
- The toolbar's Device Simulator and Network Simulator were in Studio beta (File → Beta Features →
  New Device Simulator).
- Rojo 7.7.1 verified at source.
