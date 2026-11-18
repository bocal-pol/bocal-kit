---
name: roblox-physics
description: "Roblox physics and spatial queries: assemblies, constraints, collision groups, Raycast/Shapecast, and network ownership. Auto-invoke when parts fall through the floor or jitter, Touched is unreliable, a ray hits the shooter itself, or BodyMovers need replacing. Not for hit legitimacy (`roblox-networking`), Humanoid movement (`roblox-characters`), or engine-agnostic tuning (`physics-tuning`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox physics

Simulation, character control, hit detection, and purely visual movement are different jobs. Pick
the mechanism first, then the API. Whether a hit counts is a server-validation decision that
belongs to `roblox-networking`; this skill supplies the queries it uses.

> Adapted/translated from `roblox-physics` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Choosing between a physical assembly, an impulse, a scripted platform, or a Humanoid controller.
- Parts jitter, pass through walls, or `.Touched` fires inconsistently.
- Configuring filtered collision groups, a raycast or overlap, or managing an assembly's network
  ownership.

**Not this skill**: deciding whether a hit counts for gameplay (`roblox-networking`, which consumes
the queries supplied here), Humanoid movement and rigs (`roblox-characters`), engine-agnostic
timestep/jitter/CCD tuning (`physics-tuning`, whose principles apply but not the Roblox API).

## Main workflow

1. **Inspect the mechanism.** In Studio, enable assembly, constraint, and network-owner
   visualizations; or read `part.AssemblyRootPart`, `part.AssemblyMass`, `part.Anchored`, and
   `part:GetNetworkOwner()` from code. Identify the assembly root and who should own it.
2. **Write the interaction policy.** A collision-group matrix, then `CanCollide`, `CanTouch`, and
   `CanQuery` decided separately by role. Register groups once with
   `Workspace:RegisterCollisionGroup()` and `CollisionGroupSetCollidable()` (or the Collision
   Groups editor), from a single script so assignment never races registration.
3. **Choose simulation or query.** A ray for a line, a shapecast for a moving volume, an overlap
   for a static volume, and simulation contacts only when a physical response is wanted.
   `.Touched` is neither reliable nor safe as a hit detector.
4. **Apply movement at the assembly level.** Forces on any part act on the whole assembly. Use
   `LinearVelocity`, `AngularVelocity`, `VectorForce`, `AlignPosition`, and `AlignOrientation`;
   migrate BodyMovers as soon as you touch this system.
5. **Set ownership deliberately.** The server owns gameplay-critical assemblies when needed;
   client ownership improves responsiveness but never authorizes an outcome.
6. **Bound cost and lifetime.** Reuse query parameters, cap frequency and result count, destroy
   temporary constraints, attachments, and connections together.
7. **Verify from code.** With Studio MCP connected, launch Play and use `execute_luau` on `Server`
   to print the facts the change depends on: `AssemblyRootPart`, `AssemblyMass`,
   `GetNetworkOwner()`, `workspace:CollisionGroupsAreCollidable(a, b)`, and the result of a test
   query; then read `get_console_output`. Without MCP, ask the user to run the same snippet from
   the Command Bar during Play and paste the Output.

## Choosing the mechanism

| Goal | Mechanism |
|---|---|
| sustained physical interaction | unanchored assembly plus modern constraints or forces |
| one-shot physical change | `ApplyImpulse` / `ApplyAngularImpulse` |
| platform or kinematic path | scripted pivot or CFrame with an explicit passenger policy |
| character locomotion | Humanoid or Character Controller Library (`roblox-characters`) |
| hit test | server-side raycast, shapecast, or overlap with explicit filters |
| cosmetic trail or recoil | local visual movement only; no gameplay authority |

## Patterns

### Filtered server raycast

```lua
local Workspace = game:GetService("Workspace")

local params = RaycastParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = {shooterCharacter}
params.IgnoreWater = true
params.CollisionGroup = "WeaponQuery"

local direction = aimDirection.Unit * MAX_RANGE   -- direction's length is the range
local result = Workspace:Raycast(muzzlePosition, direction, params)
if result then
    local model = result.Instance:FindFirstAncestorOfClass("Model")
    local humanoid = model and model:FindFirstChildOfClass("Humanoid")
    if humanoid and serverCanDamage(shooter, model, result.Position) then
        humanoid:TakeDamage(serverWeaponDamage(shooter))
    end
end
```

`muzzlePosition` and `aimDirection` must come from server-known character and weapon state. A
raycast from a client-supplied origin is not validation (see `roblox-networking`).

### Overlap volume with an explicit policy

```lua
local params = OverlapParams.new()
params.FilterType = Enum.RaycastFilterType.Exclude
params.FilterDescendantsInstances = {sourceCharacter}
params.CollisionGroup = "DamageQuery"
params.MaxParts = 64

local seen: {[Model]: boolean} = {}
for _, part in Workspace:GetPartBoundsInBox(hitboxCFrame, hitboxSize, params) do
    local model = part:FindFirstAncestorOfClass("Model")
    if model and not seen[model] then
        seen[model] = true
        validateAndApplyHit(model)
    end
end
```

Bounds queries test bounding boxes and can return several parts per target; deduplicate by model.
`WorldRoot:GetPartsInPart()` is exact but costs more. `OverlapParams.RespectCanCollide` switches
the query from `CanQuery` to `CanCollide` — set it deliberately or it silently overrides the flag
policy.

## Assemblies, force, and ownership

- Welded parts form one rigid assembly; force, impulse, velocity, mass, and ownership act on the
  whole assembly. A single anchored part anchors the entire assembly.
- Calibrate forces and impulses from the target acceleration times `AssemblyMass`, not by trial
  values.
- Automatic ownership moves nearby unanchored assemblies to clients. Call `SetNetworkOwner(nil)`
  for critical objects, then measure server cost and responsiveness. Recheck ownership after an
  anchor change; it isn't always preserved.
- A client that owns an assembly can simulate fake physics results and fake `.Touched` events. The
  server independently validates hits, positions, timing, and permissions.
- If `Workspace.AuthorityMode` is `Server`, the server owns simulation and clients predict nearby
  assemblies with rollback. Drive predicted forces and constraints from
  `RunService:BindToSimulation()` on both sides, not from `Heartbeat` or client-only scripts.

## Verify

1. Studio MCP: print `AssemblyRootPart`, `AssemblyMass`, `GetNetworkOwner()`, and a test query's
   result via `execute_luau` on `Server`, read `get_console_output`.
2. Without MCP: ask the user to run the same snippet from the Command Bar during Play.
3. Check the three flags `CanCollide`, `CanTouch`, `CanQuery` independently on every part involved
   in a query.
4. For fast movement, confirm the use of a swept query (`Shapecast`/`Spherecast`) rather than
   discrete contact sampling.
5. Test network ownership handoff and two-client interaction in Server & Clients.

## Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| a welded mechanism refuses to move | one part is anchored | inspect the whole assembly; anchor only world roots |
| force too strong or too weak | assembly mass ignored | read `AssemblyMass`; calibrate force for the target acceleration |
| a fast projectile misses its target | discrete contact sampling | swept query (`Blockcast`, `Spherecast`, `Shapecast`) per step; see `physics-tuning` |
| a ray hits the shooter or its effects | no filter or query group | reuse explicit params and a query collision group |
| a single target takes damage multiple times | the overlap returned several body parts | deduplicate by model; attack ID or cooldown |
| an exploit triggers impossible hits | the client owns the involved part | server query plus context validation; deliberate ownership |
| an invisible trigger blocks players or dodges queries | the three Can* flags confused | set `CanCollide`, `CanTouch`, `CanQuery` independently |
| attachments pile up | missing temporary constraint lifecycle | create and destroy constraint, attachments, and connections together |
| collision group "doesn't exist" at startup | groups registered from multiple scripts | register from a single script before assigning |

## References

- `https://create.roblox.com/docs/physics/assemblies`,
  `https://create.roblox.com/docs/physics/network-ownership`,
  `https://create.roblox.com/docs/workspace/raycasting`,
  `https://create.roblox.com/docs/workspace/collisions`.

## Related skills

- `physics-tuning`: timestep, jitter, tunnelling, mass ratios, and feel (engine-agnostic).
- `roblox-characters`: Humanoid and custom movement across respawns.
- `roblox-networking`: authoritative validation of client-requested physical actions.
- `roblox-studio-workflow`: visualization, Output, multi-client verification.

## Version notes

Last checked: 2026-11-17.

- Collision groups register on `Workspace` or a `WorldModel` (`WorldRoot` methods);
  `PhysicsService`'s collision-group methods are deprecated.
- BodyMovers (`BodyPosition`, `BodyVelocity`, `BodyGyro`, and others) are deprecated in favor of
  constraint-based movers.
- Server Authority reached full availability in July 2026; see `roblox-networking` for its rules.
