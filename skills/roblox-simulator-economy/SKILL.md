---
name: roblox-simulator-economy
description: "Roblox simulator/tycoon/idle economies in Luau: upgrade cost curves, income per second, rebirth pacing, big-number display, and paid-egg odds. Auto-invoke for baseCost or rebirth numbers, or unearned currency granted to a player. Not for DataStores (`roblox-datastores`), remote rate limits (`roblox-networking`), shop layout (`roblox-ui`), or tower-defense wave economies."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roblox simulator economy

Pick the economy's numbers with a pacing table before writing gameplay code, then implement them
so the server owns every amount.

> Adapted/translated from `roblox-simulator-economy` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Defining or tuning upgrade cost curves, income per second, rebirth pacing.
- Formatting big numbers (K, M, B...) for display without rounding bugs.
- Implementing paid eggs/crates with published odds and a server-side draw.
- Diagnosing unearned currency, a rebirth that takes weeks, or a server that hangs on a "max"
  purchase.

**Not this skill**: loading and saving themselves (`roblox-datastores`, whose values this skill
consumes and repairs), remote rate limits (`roblox-networking`), the shop's visual layout
(`roblox-ui`), tower-defense-style wave economies.

## Main workflow

1. **Inspect.** Find where currency, upgrades, and rebirth values currently live, and which
   scripts change them. List every RemoteEvent that touches currency and what each one sends.
2. **Write the numbers as a single config table**: base income; for each upgrade `baseCost`,
   `costGrowth`, effect, `maxLevel`; for rebirth `baseRequirement`, `requirementGrowth`,
   `multiplierPerRebirth`; for offline `maxHours`, `efficiency`. Server and client both read this
   same table.
3. **Run the pacing calculator** (if Lune is available in the project):
   `lune run scripts/balance.luau --print-defaults > economy.json`, edit the file, then
   `lune run scripts/balance.luau economy.json`. Read the `wait` and `vs prev` columns and adjust
   until they match the targets below.
4. **Implement server-side** with the patterns below. Keep the same math formula on both sides
   (ideally a single module copied as-is) so the math that's tested is the math that runs.
5. **Verify.** Rerun the calculator's test suite after any change to the math module. In Studio,
   with MCP connected, launch Play and trigger purchase handlers from `execute_luau` on `Server`
   with valid, unknown, `0`/`0`, `math.huge`, and negative values, then read `get_console_output`
   and the wallet. Two-player purchases, rebirth, and leaving/returning need Server & Clients.

## Formulas

| Quantity | Formula | Notes |
|---|---|---|
| Next level price | `floor(baseCost * costGrowth ^ owned)` | 1.07-1.15 for a frequently bought upgrade; 1.5-3 for a rare, expensive one |
| Cost from level a to b | `baseCost * g^a * (g^(b-a) - 1) / (g - 1)` | the player pays the per-level rounded sum, slightly less |
| Buy max | walk real prices until exceeding balance or `maxLevel` | safer than the log formula with rounded prices |
| Rebirth requirement k | `baseRequirement * requirementGrowth ^ k` | |
| Rebirth multiplier | `1 + k * multiplierPerRebirth` | additive grows slowly; multiplicative (`q ^ k`) grows exponentially |
| Offline income | `floor(min(away, maxHours * 3600) * rate * efficiency)` | an away time of 0 or less (clock turned back) pays 0 |

## Pacing targets (starting points, not rules)

- **The first upgrades take seconds.** With a reasonable default config, the first 10 levels take
  3-10 s each.
- **Each rebirth should take only a bit longer than the previous one**, e.g. x1.2-x1.5. With an
  additive multiplier, this ratio trends toward `requirementGrowth` over time —
  `requirementGrowth = 3` gives a ratio climbing from x2.0 to x2.7, and rebirth 8 can take over
  100 days at default income. `requirementGrowth = 1.8` gives a ratio climbing from x1.2 to x1.6.
- **Offline earns less than online.** A 0.25-0.5 efficiency and an 8-12 hour cap keep playing more
  rewarding than idling, without zeroing out disconnected players.

## Server-owned purchases

A RemoteEvent carries what the player wants ("buy the `Income` upgrade"), never an amount or a
price. The server looks up the price, checks the balance, spends, and grants without yielding
between the two.

```lua
-- ServerScriptService/Economy.server.luau (excerpt)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local EconomyMath = require(ReplicatedStorage.Shared.EconomyMath)
local Config = require(ReplicatedStorage.Shared.EconomyConfig)

ReplicatedStorage.Remotes.BuyUpgrade.OnServerEvent:Connect(function(player: Player, upgradeId: unknown)
    local session = sessions[player]
    if not session or type(upgradeId) ~= "string" then return end
    local upgrade = Config.upgrades[upgradeId]
    if not upgrade then return end -- unknown id
    local owned = session.levels[upgradeId] or 0
    if owned >= upgrade.maxLevel then return end
    local price = EconomyMath.levelCost(upgrade.baseCost, upgrade.costGrowth, owned)
    if EconomyMath.trySpend(session.wallet, { [upgrade.currency] = price }) then
        session.levels[upgradeId] = owned + 1
    end
end)
```

- `trySpend` checks every currency of a multi-currency cost before deducting any of them, and
  rejects negative or non-finite costs.
- **Server-side rebirth**: compare the server balance against the requirement, then reset wallet
  and levels and increment the counter. Never accept "I rebirthed" or a balance sent by the client.
- Rate-limit every remote per player with a token bucket (see `roblox-networking`).

## Save data and offline time

- **Repair on load; never error.** A `sanitizeAmount` function (non-numbers, NaN, infinity, and
  negatives become 0; fractions round down) and `sanitizeLevel` (also caps at the current
  `maxLevel`). Strip unknown upgrade ids and return the list of what was repaired, so old versions
  and edited data load cleanly.
- **Never save NaN or infinity.** A division by zero that reaches the wallet must be caught by the
  same sanitizers before saving.
- **Offline time comes only from the server clock**: save `os.time()` server-side when the player
  leaves; on join, `away = os.time() - lastSeen`. A missing or future `lastSeen` counts as now,
  which pays nothing.
- **Precision:** Luau numbers are doubles, exact for integers up to `2^53` (about `9e15`). If
  balances can exceed `1e15`, store a mantissa/exponent pair or a base-10 logarithm instead of a
  plain number.

## Big-number display

A `formatNumber(value, decimals?)` function uses the suffixes K, M, B, T, Qa, Qi, Sx, Sp, Oc, No,
Dc... then scientific notation beyond that.

- **The tier rounding bug:** `999950 / 1000 = 999.95`, which rounds to `"1000.0K"`. Round first; if
  the rounded value reaches 1000, move to the next suffix (`"1.0M"`).
- Format client-side for display only; never reparse a formatted string back into a number.

## Paid random items (eggs, crates, spins)

Roblox's paid random items policy applies when a random item is purchased with Robux, directly or
through in-game currency bought with Robux. Re-read the policy page before launch; the
implementation rule doesn't change: build the odds panel and the draw from the same single list.

Build the odds panel with an `oddsPercent(outcomes)` function and draw server-side with
`pickWeighted(outcomes, rng:NextNumber())` from the **same** list (after any boost is applied), so
the displayed and real odds can never diverge. Check
`PolicyService:GetPolicyInfoForPlayerAsync()` before spending and apply a restricted-player
treatment when `ArePaidRandomItemsRestricted` is true.

## Verify

1. Rerun the math module's test suite after any change (must exit successfully).
2. Studio MCP: trigger purchase handlers with valid/unknown/`0`/`math.huge`/negative ids via
   `execute_luau` on `Server`, read `get_console_output` and the wallet.
3. Server & Clients: two-player purchases, rebirth, leaving and returning — balance before/after
   reported by the user.
4. Grep economy remotes to confirm none accepts an amount or a price from the client (only ids).
5. Check that a `sanitizeAmount`/`sanitizeLevel` runs on every save load.

## Pitfalls

- **Rebirth 6 takes weeks** → `requirementGrowth` far above the multiplier's growth → read the
  `vs prev` column and lower `requirementGrowth` or switch to a multiplicative multiplier.
- **Prices outrun income after ~20 levels** → `costGrowth` of 1.5+ on an upgrade meant to be
  bought 50 times (level 50 costs about 637 million times level 0) → use 1.07-1.15.
- **The end-game breaks after a few rebirths** → multiplicative multiplier (`1.5 ^ k`) without a
  matching requirement curve → keep `requirementGrowth / q` close to the intended ratio.
- **Players gain unearned currency** → a remote accepts an amount or a price, or the check only
  happens client-side → send ids, compute the price server-side.
- **Two purchases pass a single balance check** → the handler yields between check and spend →
  spend before any `task.wait`, DataStore call, or other yield.
- **"Buy max" freezes the server** → unbounded loop or a price of 0 → pass `maxLevel`, keep
  `baseCost >= 1`.
- **Offline pays days of income** → client timestamp, no cap, or corrupted `lastSeen` → use the
  server clock, cap it, treat a future time as now.
- **The HUD shows "1000.0K"** → round before choosing the suffix.
- **A save fails or loads corrupted data** → NaN or infinity reached the wallet → sanitize before
  saving and on load.
- **The odds panel stays wrong after a "one per player" pet is owned** → outcomes a player can no
  longer get must leave both the displayed list and the drawn list → rebuild both from the same
  filtered list.

## References

- `https://create.roblox.com/docs/production/monetization/paid-random-items`,
  `https://create.roblox.com/docs/reference/engine/classes/PolicyService`,
  `https://create.roblox.com/docs/reference/engine/datatypes/Random`,
  `https://github.com/lune-org/lune/releases` (pure-Luau pacing calculator, outside Studio).

## Related skills

- `roblox-luau`: services, ModuleScripts, client/server separation.
- `roblox-networking`: remote validation and token-bucket rate limits.
- `roblox-datastores`: loading and saving the session this skill repairs.
- `roblox-ui`: shop, upgrade, and odds panels.
- `roblox-studio-workflow`: testing in Server & Clients.

## Version notes

Last checked: 2026-11-17.

- Paid random items policy, summarized from the Creator Hub page:
  - Show every outcome and its real odds as percentages totaling exactly 100% before purchase.
  - If the list doesn't fit on screen, open it from a control labeled "Info" or "Details" visible
    before purchase.
  - Luck boosts, pity systems, and other probability modifiers count: explain their numeric effect
    before purchase and show boosted odds while they're active.
  - When a player can only obtain an outcome once, update the remaining odds for that player.
  - `ArePaidRandomItemsRestricted`: give those players a listed treatment (equivalent free path,
    disclosed fixed order, direct purchase at expected value, masking, blocking with a message, or
    redirection).
