---
name: pilgrimage-poi
description: Points of interest along a pilgrimage route — religious heritage, civil heritage (fortifications, castles), remarkable landscapes, natural curiosities. Helps avoid missing anything between two stages.
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Pilgrimage POI — What to See Along the Way

Catalogs noteworthy points along the route, categorized and tied to their stage.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **On the route or ≤ 1 km off** | Don't suggest a detour > 3 km except for a major exception |
| **Priority to listed/protected sites** | Flag World Heritage sites, historical monuments, notable fortifications |
| **Verifiable opening hours** | Mention known hours + closing day (to be verified by the user before visiting) |
| **Wonder > exhaustiveness** | 1-3 POI per stage, not 15 |
| **Pilgrim-friendly** | Flag churches that stamp the pilgrim credential, miraculous fountains, pilgrimage-themed stained glass |

## Workflow

### Phase 1 — Parameters

Collect via AskUserQuestion if not provided:
1. Leg
2. Focus: religious priority | civil/history | nature/landscapes | mixed

### Phase 2 — Catalog by stage

Produce `poi/heritage-<leg>.md` with, for each stage:

```
### DXX — Town X

**Religious monument**
- Name + century
- What to see (rose window, portal, crypt, pilgrimage relic, carved shell motif)
- Hours + known closing day
- Credential stamp possible: ✅/❌

**Civil monument**
- Name + interest (fortification, town hall, covered market)

**Remarkable landscape**
- Viewpoint + orientation + ideal time (morning/evening)

**Curiosity / local secret**
- Something an ordinary tourist misses (hidden fresco, fountain, side trail, craft workshop)
```

### Phase 3 — Thematic threads

Also produce a cross-cutting reminder (recurring threads) at the top of the document:

- **Architectural thread**: notable period churches along the route (Romanesque, Gothic, etc.)
- **Fortification thread**: notable fortified towns along the way
- **Legend thread**: local legends tied to specific landmarks
- **Water thread**: miraculous springs and fountains tied to the pilgrimage tradition

## Reference data

This skill ships with no baked-in POI database — build one specific to the actual route being walked (real monument names, opening hours, local curiosities) as you research each leg, rather than relying on a fixed list that goes stale or misdescribes real places. Treat the Phase 2/3 structure as the reusable template.

## Fallback

No external dependency — if hours info changes, add a disclaimer "to be verified by the user, data compiled at planning time."

## Optional input

- Leg
- Focus (religious | civil | nature | mixed)
- Detail level (compact 1 per stage | standard 3 per stage | exhaustive)
