---
name: roblox-datastores
description: "Roblox persistence via DataStoreService: load on join, save on leave and in BindToClose, UpdateAsync vs SetAsync, session locks, and OrderedDataStore leaderboards. Auto-invoke for lost player data, duplicated items after a teleport, or 'too many requests' errors. Not for engine-agnostic saving (`save-systems`), Luau basics (`roblox-luau`), or economy numbers (`roblox-simulator-economy`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox DataStores

Persist data across sessions without losing or duplicating it. Every DataStore call is a network
request from a server `Script`: it can fail, get throttled, and race another server writing the
same key.

> Adapted/translated from `roblox-datastores` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Loading/saving player progress (currency, level, inventory) via `DataStoreService`.
- Diagnosing rollbacks, duplicated items after a teleport, or rate-limit errors.
- Building a leaderboard with `OrderedDataStore`.

**Not this skill**: engine-agnostic serialization and schema versioning (`save-systems`, which
covers principles but not the Roblox API), Luau basics (`roblox-luau`), economy formulas and
repairing loaded values (`roblox-simulator-economy`).

## Main workflow

1. **Find the existing persistence layer.** Look for `DataStoreService`, `GetDataStore`, and any
   profile/session library before writing new code. If the project already uses one, extend it;
   two systems writing the same key is the most common cause of rollback.
2. **Use a test place for Studio work.** Studio reads and writes the same live data as players.
   On a separately published test place, enable File → Experience Settings → Security →
   *Enable Studio Access to API Services*; without it, requests fail with
   `StudioAccessToApisNotAllowed`.
3. **Key by `UserId`**, never by name: `"Player_" .. player.UserId`.
4. **Guard every call with `pcall`.** On a *load* failure, mark the session as not loaded and
   refuse to save, so default values never overwrite real data.
5. **Load on `PlayerAdded`, save on `PlayerRemoving` and in `game:BindToClose`**, plus a periodic
   save (every 60-120 s), never on every value change.
6. **Write with `UpdateAsync` and a session property.** `UpdateAsync` re-reads the latest value
   before writing; the session property (see pitfalls) stops a stale server from overwriting more
   recent progress.
7. **Use `OrderedDataStore` only for numeric leaderboards.**
8. **Verify before reporting.** Run the static check below and fix every hit. Then, with Studio MCP
   connected and API access enabled on a test place, play, change a value, stop, replay, and read
   it back without cache via `execute_luau` on the `Server` datamodel. Without MCP, ask the user to
   join, change, leave, and rejoin on the test place and report the value seen on return plus any
   Output warning. Rate-limit behavior needs Team Create, not Run mode.

```bash
# Every DataStore call should be inside a pcall; this lists the lines to inspect by hand.
rg -n ":(GetAsync|SetAsync|UpdateAsync|IncrementAsync|RemoveAsync|GetSortedAsync)\(" src
rg -n "BindToClose" src        # at least one global save handler is expected
rg -n ":SetAsync\(" src        # every call on a player-profile key deserves a reason
```

## Patterns

### Load on join

```lua
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local store = DataStoreService:GetDataStore("PlayerData")

local DEFAULT = { Coins = 0, Level = 1 }

Players.PlayerAdded:Connect(function(player)
    local key = "Player_" .. player.UserId
    local ok, data = pcall(function()
        return store:GetAsync(key)
    end)
    if not ok then
        warn("Load failed for", player.UserId, data)  -- network failure, not a new player
        player:SetAttribute("DataLoaded", false)
        return
    end
    player:SetAttribute("DataLoaded", true)
    applyToLeaderstats(player, data or table.clone(DEFAULT))  -- nil = genuinely new player
end)
```

### Save with UpdateAsync (the session property is still required)

This callback ignores `old`, so by itself it can still overwrite more recent progress from another
server. Before going live, add the session check (a `JobId` lock stored in the data, or a proven
profile library) inside the callback.

```lua
local function savePlayer(player)
    -- `~= true` also covers a player who left while GetAsync was still in flight.
    if player:GetAttribute("DataLoaded") ~= true then return end
    local key = "Player_" .. player.UserId
    local newData = gatherDataFor(player)    -- flat table, JSON-serializable

    local ok, err = pcall(function()
        store:UpdateAsync(key, function(old)
            -- Must never yield and may run more than once. Returning nil cancels
            -- the write once this session no longer owns the key.
            return newData
        end)
    end)
    if not ok then warn("Save failed for", player.UserId, err) end
end
```

### Save on leave and on server shutdown

```lua
Players.PlayerRemoving:Connect(savePlayer)

game:BindToClose(function()
    local players = Players:GetPlayers()
    local remaining = #players
    for _, player in players do
        task.spawn(function()
            savePlayer(player)
            remaining -= 1
        end)
    end
    while remaining > 0 do task.wait() end  -- the server has at most 30 s total
end)
```

### Retry limited to what's safe to repeat

```lua
local function withRetry(fn, attempts)
    attempts = attempts or 3
    for i = 1, attempts do
        local ok, result = pcall(fn)
        if ok then return true, result end
        if i < attempts then task.wait(2 ^ i) end
    end
    return false
end
```

A failed write doesn't prove the write didn't happen; the server may simply have missed the
response. Replaying an `UpdateAsync` that writes full state is safe; replaying `IncrementAsync` can
add twice. When the result matters, confirm with a cache-free read (`DataStoreGetOptions` with
`UseCache = false`) before retrying.

### Leaderboard with OrderedDataStore

```lua
local board = DataStoreService:GetOrderedDataStore("Coins")
pcall(function() board:SetAsync("Player_" .. player.UserId, coins) end)  -- on change, throttled

local ok, pages = pcall(function()
    return board:GetSortedAsync(false, 10)   -- false = descending, highest first
end)
if ok then
    for rank, entry in pages:GetCurrentPage() do
        print(rank, entry.key, entry.value)
    end
end
```

Values must be integers. For a small set of players (friends, a group), `BatchGetAsync(keys)` reads
up to 100 keys in one request instead of paging through the whole leaderboard.

## Verify

1. Run the three `rg` commands above and confirm no DataStore call lives outside a `pcall`, and at
   least one `BindToClose` saves everyone.
2. With Studio MCP connected: play, change a value, stop, replay, read back without cache via
   `execute_luau` on the `Server` datamodel.
3. Without MCP, ask the user to join → change → leave → rejoin on a test place with API access
   enabled, and report the observed value plus any Output warning.
4. Test rate-limit behavior in Team Create, never in solo Run.

## Pitfalls

- **Default values saved over real data** → a failed load treated as "new player" wipes progress
  on the next save → gate saving on "the load succeeded," not on "the load didn't fail."
- **`SetAsync` races between servers** → during a teleport or a quick rejoin, two servers can hold
  the same player; the last blind write wins → use `UpdateAsync` with a session property.
- **Yields or side effects in the `UpdateAsync` callback** → the callback must not yield, and
  Roblox retries it if another server changed the key first, so granting items, firing remotes, or
  incrementing counters inside it can happen twice → act after the call returns.
- **No save in `BindToClose`** → players present at shutdown lose everything since the last
  periodic save.
- **Saving on every change** → throttling queues then drops requests with 301-306 errors → batch
  changes and save on a timer plus on leave.
- **Stale reads** → `GetAsync` caches a key for about four seconds after the first read, so an
  immediate re-read after a write can return the old value.
- **Non-serializable values** → only JSON-shaped data persists (numbers, strings, booleans, tables
  with string or sequential-integer keys) → convert `Vector3`, `CFrame`, `Color3`, and Instances to
  flat tables first.
- **Metadata and UserIds wiped on write** → once a key has metadata or UserIds, every write must
  resupply them or they're stripped.
- **`DataStoreKeyInfo` is nil for ordered stores** → they have no versioning or metadata → use a
  regular `DataStore` when you need that.
- **Cross-server temporary state** → matchmaking queues and round data belong in
  `MemoryStoreService`, not DataStores.

## References

- `https://create.roblox.com/docs/cloud-services/data-stores`,
  `https://create.roblox.com/docs/cloud-services/data-stores/error-codes-and-limits`,
  `https://create.roblox.com/docs/reference/engine/classes/GlobalDataStore`,
  `https://create.roblox.com/docs/reference/engine/classes/DataModel` (BindToClose).

## Related skills

- `roblox-luau`: services, events, server/client model.
- `roblox-simulator-economy`: repairing loaded values and offline earnings.
- `save-systems`: engine-agnostic serialization, slots, schema migration.
- `roblox-networking`: rate limits on remotes that trigger a save.

## Version notes

Last checked: 2026-11-17.

- Since 2026-07-29, in-experience and Open Cloud requests share a single budget per experience and
  per request type: 300 per minute plus a per-CCU multiplier (reads 40, writes 20, listings 2 for
  standard and ordered stores). `UpdateAsync` spends from both the read and write budgets. Per-server
  limits apply on top.
- Storage limit per experience: 500 MB + 1 MB per unique lifetime user, measured on each key's most
  recently compressed version.
- Per key: roughly 25 MB/minute reads and 4 MB/minute writes. Value size limit: 4,194,304 characters.
  Key, store, and scope names: 50 characters.
- `BindToClose` handlers get 30 seconds total. Studio's Run mode has its own, lower static limits;
  test rate limits in Team Create.
- Automated right-to-erasure processing for data stores was in beta in 2026; check its status
  before relying on it.
