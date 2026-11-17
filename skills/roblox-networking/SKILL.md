---
name: roblox-networking
description: "Roblox client-server networking and anti-cheat: RemoteEvent/RemoteFunction contracts, server authority, rate limits, hit validation, and replication. Auto-invoke when a remote trusts the client, an exploiter spams remotes or gains items, or hits register wrong. Not for Luau basics (`roblox-luau`), persistence (`roblox-datastores`), or force/raycast APIs (`roblox-physics`)."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Roblox networking

The server decides authoritative state; clients send input or intent. This skill owns the request
contract at that boundary: what's sent, who validates it, who receives the result, and how to test
it with more than one client.

> Adapted/translated from `roblox-networking` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Designing or auditing a RemoteEvent/RemoteFunction contract (purchase, combat, inventory).
- An exploiter picks a price, a damage amount, or an item; a remote is spammed; hits register
  wrong or twice.
- Deciding between reliable replication, unreliable replication, or request/response.

**Not this skill**: Luau basics and minimal remote mechanics (`roblox-luau`), DataStore persistence
(`roblox-datastores`), the force/raycast APIs themselves (`roblox-physics`, which supplies the
queries this skill uses to validate a hit).

**Absolute rule: the server never trusts the client.** Every price, damage amount, property
outcome, or gameplay decision must be computed and applied server-side — never received as-is from
a remote.

## Main workflow

1. **Inventory the existing protocol.** Find every remote and both of its ends before adding one:
   `rg -n "OnServerEvent|OnServerInvoke|OnClientEvent|InvokeClient|FireAllClients" src` (or the
   Studio MCP tool `script_grep`). For each one, note direction, sender, payload, frequency,
   validation, consumers. Reuse the project's canonical remotes folder; a duplicate remote created
   for lack of finding the original often signals two handlers applying the same action.
2. **Classify every message.** Client request, server fact, or ephemeral cosmetic sample. Derive
   reliable event, unreliable event, or request/response from that — never from convenience.
3. **Minimize the payload.** Send stable IDs and intent. Never send a price, a damage amount, a
   property outcome, an arbitrary path, or any result the server can derive itself.
4. **Validate in layers, cheapest first.** Rate budget, type/shape/finiteness, value in an
   allow-list, Instance class and ancestry, player permission and state, distance or line of
   sight, cooldown. Expensive work comes only after.
5. **Apply server-side.** The server resolves targets and changes health, inventory, currency,
   cooldowns, progress. Client-side checks exist only for UX.
6. **Replicate narrowly.** `FireClient` for a private or local fact; broadcast only shared facts.
   Replicated properties are already a state channel — don't mirror them through remotes.
7. **Handle timing and lifecycle.** Requests arrive after a death, a respawn, a streaming change,
   or a disconnect. Resolve the current character during processing and clear per-player tables on
   `PlayerRemoving`.
8. **Run the abuse matrix and capture Output on both sides.** With Studio MCP connected
   (`list_roblox_studios` returns a place), launch Play with `start_stop_play`, drive the pure
   validator from `execute_luau` on the `Server` datamodel with valid, malformed, NaN, wrong
   Instance-class, and burst inputs, then read `get_console_output`. `start_stop_play` is a single
   solo client, so for targeted-vs-broadcast delivery and two-player cases, ask the user to launch
   Server & Clients with two clients and paste the server and both clients' Output panels. Report
   each case as run, prepared but not launched, or unverified.

## Choosing the transport

| Primitive | Use for | Don't use for |
|---|---|---|
| `RemoteEvent` | ordered, reliable, one-way requests and facts | continuous samples where the latest replaces the old one |
| `UnreliableRemoteEvent` | ephemeral cosmetic or continuous state that tolerates loss and reordering | purchases, damage, inventory, one-shot transitions |
| `RemoteFunction` | bounded client-to-server request that genuinely needs a response | server-to-client invocation, long work, ordinary commands |

Never `InvokeClient` from the server: an erroring client makes the server error, a client that
leaves raises an exception, a client that never responds yields the server indefinitely. Use
`FireClient` plus a separate response event.

Delivery rules that shape handler design (per connection, per direction):

- `RemoteEvent` messages arrive in send order, even across different `RemoteEvent`s, but that
  order only covers when each handler *starts*. A handler that yields (`task.wait`,
  `WaitForChild`, a DataStore call) lets the same player's next message start before it resumes —
  check-then-yield-then-apply code can therefore approve two requests. Claim the cooldown or mark
  the request "in progress" before the first yield.
- A client firing a `RemoteEvent` faster than the throttle is delayed, not dropped; the backlog
  still arrives. `UnreliableRemoteEvent` traffic beyond the throttle or size limit, or with no
  handler connected, is dropped.
- Messages sent before a handler connects are queued (bounded) for `RemoteEvent`s and
  `RemoteFunction`s. There's no ordering guarantee between a `RemoteFunction` and a `RemoteEvent` —
  use a single remote type or your own sequence number when order matters.
- The client-to-server throttle is shared across every remote of the same type in the experience,
  so an honest player sending reliable events every frame hits it before any attacker does.

## Pattern: validate before resolving gameplay

```lua
-- ServerScriptService/CombatRequests.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local attack = ReplicatedStorage.Remotes.Attack
local lastRequest: {[Player]: number} = {}
local RANGE = 12
local COOLDOWN = 0.25

attack.OnServerEvent:Connect(function(player: Player, target: unknown)
    local now = Workspace:GetServerTimeNow()
    if now - (lastRequest[player] or -math.huge) < COOLDOWN then return end
    lastRequest[player] = now

    if typeof(target) ~= "Instance" or not target:IsA("Model") then return end
    if not target:IsDescendantOf(Workspace.Characters) then return end
    local targetHumanoid = target:FindFirstChildOfClass("Humanoid")
    local targetRoot = target:FindFirstChild("HumanoidRootPart")
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not targetHumanoid or not targetRoot or not root or not humanoid then return end
    if humanoid.Health <= 0 or targetHumanoid.Health <= 0 then return end
    if (root.Position - targetRoot.Position).Magnitude > RANGE then return end
    if not serverCombatStateAllowsAttack(player, now) then return end

    targetHumanoid:TakeDamage(serverDamageFor(player))
end)

Players.PlayerRemoving:Connect(function(player)
    lastRequest[player] = nil
end)
```

A single distance check is not security. A real melee system also needs server-known attack
windows, shape or line-of-sight checks, team rules, and an explicit lag policy.

**Hit validation for ranged weapons.** The client can report "I fired at time T toward D." The
server reconstructs the shot from server-known state: muzzle origin near the character's server
position, fire rate from the weapon's cooldown, ammo, and a direction within tolerance of the
claim. The server then runs its own raycast (query API in `roblox-physics`). Decide the lag policy
explicitly: either accept hits within a bounded rewind window using the target's recorded
positions, or only accept what the server sees right now. Never accept the Instance or hit
position reported by the client as the result.

## Pattern: token bucket at the boundary

```lua
type Bucket = {tokens: number, updatedAt: number}
local buckets: {[Player]: Bucket} = {}
local CAPACITY, REFILL_PER_SECOND = 6, 3

local function consume(player: Player, cost: number): boolean
    local now = os.clock()
    local bucket = buckets[player] or {tokens = CAPACITY, updatedAt = now}
    bucket.tokens = math.min(CAPACITY,
        bucket.tokens + (now - bucket.updatedAt) * REFILL_PER_SECOND)
    bucket.updatedAt = now
    if bucket.tokens < cost then buckets[player] = bucket; return false end
    bucket.tokens -= cost
    buckets[player] = bucket
    return true
end
```

Assign cost by server impact. Reject cheaply before DataStore calls, cloning, raycasts, or wide
replication. Log aggregated abuse signals, not one warning per dropped packet. Clear the bucket on
`PlayerRemoving`.

## Replication, streaming, and prediction

- With instance streaming, a valid server Instance may not exist client-side. Send a stable ID and
  tolerate its absence; don't wait indefinitely for optional streamed content.
- Make every unreliable sample self-contained and add a sequence number or timestamp so receivers
  ignore older arrivals. Never split a mandatory transition across multiple unreliable messages.
- Without Server Authority, only predict reversible, latency-sensitive presentation. Tag client
  commands with a sequence ID; the server sends back authoritative state plus an acknowledgment,
  and the client corrects smoothly. Prediction never grants damage, currency, inventory, or
  progress.
- Network ownership makes a client responsive but lets it influence physics. Ownership is not
  authorization: validate consequences server-side.

## Places using Server Authority

Read `Workspace.AuthorityMode` first (Properties panel, place file, or `execute_luau`). When it's
`Server`, the engine supplies client prediction, rollback, and resimulation, and gameplay objects
can stay server-owned without input latency. Work with this system rather than building a parallel
one:

- Put core gameplay in a ModuleScript required by both a server `Script` and a client
  `LocalScript`, with logic in `RunService:BindToSimulation()` callbacks. Only members marked
  *Simulation Access* work there. Use `time()` (synchronized and rewound during resimulation),
  never `os.clock()`, `tick()`, or `os.time()`.
- Send any input that affects simulation through `InputAction`s (their `InputContext` must be
  under the owning `Player`), not through `UserInputService` events. Keep custom state synchronized
  in Attributes on predicted instances and only write them inside bound functions.
- `Destroy()` and reparenting are not allowed inside bound functions. Record the intent in an
  Attribute and remove the instance in a server `PostSimulation` connection.
- Remotes still carry discrete facts and requests, but aren't ordered with property and attribute
  replication. Play effects and sounds from `RenderStepped` by reading simulation results, so a
  mispredicted frame doesn't trigger them twice.

Server Authority is a whole-project migration. Don't flip `AuthorityMode` on an existing place as a
side effect of another task; flag it to the user as an option.

## Verify

1. `rg` the remote inventory above and confirm no outcome (price, damage, property) arrives from
   the client without being recomputed server-side.
2. Studio MCP: launch Play, drive the validator with valid/malformed/NaN/wrong-class/burst inputs
   via `execute_luau` on `Server`, read `get_console_output`.
3. Server & Clients with two clients for targeted-vs-broadcast delivery, replication, and
   disconnect/respawn-during-a-pending-request cases.
4. Report each case as run, prepared but not launched, or unverified — never guessed.

## Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| exploiter picks the damage or price | outcome accepted from the client | send intent or ID; derive and apply server-side |
| an arbitrary object can be deleted | only `typeof(x) == "Instance"` checked | validate class, ancestry, ownership, state, and an allow-listed operation |
| the server hangs on one player | server calls `InvokeClient` | replace with events |
| an honest player gets throttled | reliable messages every frame | lower the rate, lean on replication, batch, or use cosmetic unreliable |
| an old packet cancels a more recent effect | unreliable samples treated as commands | version samples; use a reliable event for transitions |
| remote breaks after respawn | character or root cached | resolve the current character in the handler; reject stale state |
| private data leaks | `FireAllClients` by default | `FireClient` with a minimal payload |
| distance check bypassed | client-owned part moved near the target | the server owns critical parts; validate with server-observed state |
| a cooldown lets two requests through | the handler yields between check and apply | claim the cooldown or "in progress" state before the first yield |
| an effect plays twice under Server Authority | effect triggered inside resimulated code | trigger from `RenderStepped` by reading simulation state |
| a "lag" report | may be frame time, not network | check the MicroProfiler before redesigning remotes |

## References

- `https://create.roblox.com/docs/scripting/events/remote`,
  `https://create.roblox.com/docs/reference/engine/classes/UnreliableRemoteEvent`,
  `https://create.roblox.com/docs/projects/server-authority`,
  `https://create.roblox.com/docs/scripting/security/client-server-boundary`,
  `https://create.roblox.com/docs/physics/network-ownership`.

## Related skills

- `roblox-luau`: run locations and base remote mechanics.
- `roblox-characters`: resolving the character safely across respawns.
- `roblox-physics`: raycast/overlap APIs, network ownership mechanics.
- `roblox-studio-workflow`: Server & Clients testing, Studio MCP, honest evidence.
- `roblox-simulator-economy`: applying the server-authority contract to economy purchases.

## Version notes

Last checked: 2026-11-17.

- `UnreliableRemoteEvent` payloads beyond 1,000 bytes are dropped; Studio Output reports the
  overflow.
- Client-to-server throttle: roughly 500 requests per second per client, shared across every
  remote of the same type (`RemoteEvent` and `UnreliableRemoteEvent` each have their own pool).
- Server Authority reached full availability in July 2026 (opt-in). Setting `AuthorityMode = Server`
  also requires next-gen replication, `PlayerScriptsUseInputActionSystem`, deferred
  `SignalBehavior`, `UseFixedSimulation`, and `StreamingEnabled`. Tools aren't fully supported under
  this mode yet.
- Studio's Network Simulator was in beta (File → Beta Features → New Device Simulator).
