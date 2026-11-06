---
name: pilgrimage-gear
description: Weighed backpack list for a multi-thousand-km pilgrimage with camping. Two variants (Solo, Duo). Base weight ≤ 8 kg solo / ≤ 6.5 kg per person in duo. Goal durability across the full distance, repairability, planned consumable replacement. Delegates to survival-logistics-agent for the Rule of 3 and calorie calculation.
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

> **Associated agent**: this skill is designed to be routed by `survival-logistics-agent`, which
> provides the business framing. It remains invocable alone, but the answer will be less
> contextualized. This relationship doesn't go through `dependencies:`, which only references
> skills or MCPs.

# Pilgrimage Gear — Ultra-long-distance pilgrim backpack

Generates a **weighed**, **categorized** gear list, **calibrated for a multi-thousand-km route**. Priority: durability and weight. Every added item must be justified by the Rule of 3 or by the pilgrimage mission (20 km/day walking for 4 months straight).

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Base weight ≤ 8 kg solo** | Excluding water + food + daily consumables |
| **Full-distance durability** | High-end broken-in shoes; a reinforced pack; not a bargain-bin tent |
| **Repairability** | Sewing kit, fabric tape, Tenacious Tape, Aquaseal glue |
| **Planned replacement** | A 2nd pair of shoes planned partway through, spare pilgrim credentials |
| **Duo pooling** | One tent for two, one stove for two, one cookset for two → 1.5 kg saved per person |
| **Mandatory field test** | A 25 km outing with a loaded pack before the official departure |

## Workflow

### Phase 1 — Parameters

Collect via AskUserQuestion if not provided:
1. Configuration: Solo | Duo (generate both if requested)
2. Departure season: spring | summer | fall | other
3. Gear budget: tight (< 1000 currency units) | medium (1000-2000) | comfort (> 2000)
4. Gear already owned (audit): yes + list | no, build from scratch

### Phase 2 — Delegation to survival logistics

Invoke `survival-logistics-agent` with the brief:
- Mission: a multi-thousand-km pilgrimage, 4-5 months, spring departure, ~50% camping
- Max weight: 12 kg total (8 kg base + water + day)
- Configuration: solo and/or duo

Retrieve its weighed list by tier (Rule of 3) and its calorie calculation.

### Phase 3 — Categorization

Produce `gear/inventory.md` with 10 categories:

1. **Carry** — pack, hip belt, whistle
2. **Sleep** — tent/tarp, sleeping pad, sleeping bag
3. **Kitchen** — stove, cookset, spoon, water bottle
4. **Water** — capacity + filtration
5. **Hiking clothes** — t-shirts, pants, socks, shoes
6. **Camp clothes** — night change + fleece
7. **Rain/cold clothes** — hardshell, light gloves, beanie
8. **Hygiene + LNT** — soap, toothbrush, towel, trowel, paper
9. **Health** — first aid kit + foot-care kit (route-specific)
10. **Nav + admin** — phone, battery, maps, pilgrim credential, ID, cash

For each item:
- Name + suggested brand
- Weight (grams) real or estimated
- Indicative price
- Expected durability (km or months)
- Solo | Duo (pooled | ×2 | unchanged)
- Note (break-in required, purchasable en route, etc.)

Totals:
- Solo: base weight, fully-loaded weight (with 2L water + 1500 kcal), planned replacement.
- Duo: same, with pooling made explicit.

### Phase 4 — Pre-departure check

Produce `gear/pre-departure-check.md` — a D-30 checklist:

- [ ] Shoes broken in ≥ 100 km
- [ ] Pack tested loaded over 25 km
- [ ] Tent pitched and struck 5 times
- [ ] Stove lit at least 3 times
- [ ] Water filtration verified
- [ ] Pilgrim credential obtained
- [ ] Travel health insurance card
- [ ] Emergency numbers saved + on paper
- [ ] Will / power of attorney if a long trip ← legal reminder
- [ ] Repatriation insurance taken out
- [ ] Vaccinations up to date (tetanus)
- [ ] Long-term prescriptions packed (chronic treatments)

### Phase 5 — Consumables and en-route replacement

Plan a "To rebuy en route" section in `gear/inventory.md`:

- **2nd pair of shoes**: around 1500-2000 km in (somewhere partway through the route, or at the start of the final country)
- **Socks**: 500-800 km/pair → plan 2 spare pairs to mail ahead
- **Blister pads**: restock at each large town
- **Gas canister**: can't fly with it — rebuy at each flight/train leg; while walking, replace every 15-20 days
- **Pilgrim credentials**: rebuy at each major waypoint town

## Fallback — if survival-logistics-agent is unavailable

Produce the list directly with these reference values (recent hiking-gear market):

**Solo pack — target base weight 7.5 kg:**
- Carry: a ~48L ultralight pack (1150 g)
- Tent: a 1-person ultralight tent (1050 g)
- Pad: an inflatable ultralight sleeping pad (350 g)
- Sleeping bag: an ultralight quilt/bag, +5°C comfort (500 g)
- Gas stove: an ultralight canister stove (73 g) + canister (180 g full)
- Cookset: a 750 mL titanium pot (100 g)
- Shoes: breathable trail shoes (~800 g/pair) — worn, not packed
- Poles: carbon trekking poles (300 g the pair)
- Clothes worn outside the pack (shoes, pants, t-shirt, hat)
- Clothes in the pack: 1 t-shirt + 1 change + light fleece + hardshell (~800 g)
- Water: a 2L reservoir + a squeeze filter (170 g)
- First aid: ~250 g
- Nav/admin: phone + a 10000mAh power bank (180 g) + cables + credential + papers (~500 g)

**Duo pack — 6.5 kg per person** = pooled tent (2P instead of 2×1P), a single stove, a shared 1.3L cookset, one main first-aid kit + a light personal kit each.

## Optional input

- Configuration (`solo` | `duo` | `both`)
- Season (`spring` | `summer` | `fall`)
- Constraint (`tight-budget`, `bad-back`, `100%-camping`)
- Existing gear (audit)
