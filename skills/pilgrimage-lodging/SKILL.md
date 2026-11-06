---
name: pilgrimage-lodging
description: Pilgrim lodging — pilgrim hostels, donation-based stays, youth hostels, refuges + legal wild camping per country. Delegates to legal-compliance-agent for wild-camping legality in the jurisdiction being crossed.
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

> **Associated agent**: this skill is designed to be routed by `legal-compliance-agent`, which
> provides the legal framework. It remains invocable alone, but the answer will be less
> contextualized. This relationship doesn't go through `dependencies:`, which only references
> skills or MCPs.

# Pilgrimage Lodging — Where to Sleep on the Way

Produces `lodging/notebook-<leg>.md` with, for each stage: lodging options, rates, contacts, legal wild-camping rules.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Three families** | Pilgrim hostel / donation-based — commercial refuge/youth hostel — legal wild camping |
| **Strict legality** | Wild camp only in authorized zones, never private forest without permission |
| **Fresh contacts** | Phone numbers + hours + booking when needed; note the verification date |
| **50/50 mix by default** | Alternate indoor/outdoor nights for rest and hygiene |
| **Fallback solutions** | Always mention a plan B (hostile weather, closed hostel) |

## Workflow

### Phase 1 — Parameters

Collect via AskUserQuestion if not provided:
1. Leg (illustrative: first country | second country | third country)
2. Desired wild-camp / hostel ratio (100% camping | 50/50 | 25/75 | 100% hostel)
3. Indoor-night budget: donation-based (low) | hostel (medium) | comfort lodge (higher) | no constraint
4. Desired comfort: spartan | shower priority | WiFi essential | shared meal

### Phase 2 — Survey by stage

For each stage (cross-referenced with `pilgrimage-route`):

```
### DXX — Town X (arrival after km)

**Recommended pilgrim hostel**
- Name: [Name]
- Address: [Address]
- Contact: [Phone] · [Email]
- Rate: [amount or donation-based]
- Capacity: [number]
- Shower · WiFi · Kitchen · Credential stamp: ✅/❌
- Note: [arrival hours, languages, specifics]

**Alternative hostel / youth hostel**
- ...

**Nearby legal wild camp**
- Zone: [name + approximate GPS coordinates]
- Legal framework: [delegated to legal-compliance-agent, or the applicable official source]
- Distance from the hostel: [X km before/after]
- Water: [source or fountain within 1 km]
- Note: [risks, views, quiet]

**Plan B**
- [If full, if closed, if heavy rain]
```

### Phase 3 — Legal camping framework

**Delegate to `legal-compliance-agent`** with a brief:
- Context: a pilgrimage route crossing the jurisdiction in question
- Question: where can one legally wild-camp along the stages (public forests, marked areas, farm camping)
- Requested format: a brief (Legal Framework / Risk / Action Plan / Field Note)

For each country/region crossed, consult the applicable official sources (forestry agency, environmental code, regional decrees) rather than assuming a rule from another jurisdiction applies.

### Phase 4 — Cross-references

- Check that every stage from `pilgrimage-route` has **at least two options** (hostel + camp, or hostel + hostel)
- Flag to `pilgrimage-planner` the at-risk days (no hostel within 30 km)
- Mention the days where wild camping is **impossible** (strict ban, dense town) → force the hostel option

## Reference data

This skill ships with no baked-in lodging database — build one specific to the actual route (hostel names, contacts, camping tolerance) as you plan, rather than relying on a fixed list that goes stale and may misname real establishments. Treat the table structure in Phase 2 as the reusable template.

⚠️ Contacts and availability change — **verify 2 weeks before departure**.

## Fallback

- If `legal-compliance-agent` is unavailable → use the relevant official forestry/environmental authority's public guidance on wild camping directly, and explicitly cite "source not re-verified by the agent, confirm with the local authority before departure"

## Optional input

- Leg
- Camp/hostel ratio
- Special constraint: "no dorm" / "solo woman" / "with a dog" / "no religious hostel"
