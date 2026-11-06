---
name: pilgrimage-route
description: "Stage breakdown for a pilgrimage route by leg. Produces distances, elevation, GPX waypoints, route crossings."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Pilgrimage Route — Stage Mapping

Breaks the route down into reasonable daily stages, with estimated elevation gain, main waypoints, and GPX references. Each stage should suit a walker who already has some distance in their legs (progressive adaptation at the start of a leg).

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **15-22 km days** | A sensible max at peak fitness, never two long days back to back |
| **Adaptation** | The first 3 days of a leg = short stages |
| **Elevation counts** | Significant elevation gain reduces the effective equivalent distance |
| **Waypoints, not tracks** | Generate GPX waypoints (towns, water points, hostels) — continuous tracks via official sources |
| **Official waymarking** | Refer to the relevant pilgrim association for waymarking freshness |

## Workflow

### Phase 1 — Parameters

Collect via AskUserQuestion if not provided:
1. Leg
2. Specific route if several options exist
3. Target pace (relaxed | standard | fast)
4. Desired rest days (0 | 1 per week | 2 per week)

### Phase 2 — Master table

Produce the stage table with, for each day:

| Column | Content |
|---------|---------|
| Day | D01, D02… |
| From → To | Start and end towns |
| Distance | km, rounded |
| Elevation | +xxx m / -xxx m estimated |
| Route | Named route/path for that stage |
| Likely night | Type (hostel/camp) + suggestion |
| Key POI | Just 1 major point, to avoid overload |

### Phase 3 — Detailed sheets

One sheet per stage in `stages/DXX_town-town.md`, or a single compact `stages/stages-<leg>.md`. Each sheet contains:

- Route description (scenery, difficulties, technical sections)
- Waymarking to follow
- Known water points (fountains, cemeteries, cafés)
- Shortcut / extension options for bad weather
- Where to have lunch (cross-reference with `pilgrimage-food`)
- Where to sleep (cross-reference with `pilgrimage-lodging`)
- What to see (cross-reference with `pilgrimage-poi`)

### Phase 4 — GPX

Generate `gpx/waypoints-<leg>.gpx` — waypoints for stage towns + notable points in GPX 1.1 format (readable in Komoot, Locus, Gaia, Garmin).

XML structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="pilgrimage-route" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="LAT" lon="LON">
    <name>NAME</name>
    <desc>DESC + cumulative distance</desc>
    <sym>Waypoint</sym>
  </wpt>
  ...
</gpx>
```

Also produce `gpx/README.md` with:
- Explanation: these GPX files are waypoints, NOT tracks
- Links to the official sources to download continuous tracks for the specific route being walked (the relevant national/regional pilgrim association and hiking federation)

### Phase 5 — Cross-references

Verify deliverables are consistent with the other skills:
- Every stage has a night suggestion → see `pilgrimage-lodging`
- Every stage has a meal suggestion → see `pilgrimage-food`
- Every stage has a POI → see `pilgrimage-poi`

## Reference data

This skill ships with no baked-in city/route database — build the actual stage breakdown (towns, distances, elevation) specific to the real route being walked, rather than relying on a fixed itinerary that may not match the user's actual plan. Treat the Phase 2-4 structure as the reusable template.

## Fallback

If the user wants an adjustment (injury, hostile weather, wanting to linger somewhere): propose a rebalancing (merging short stages, splitting long ones, adding a rest day).

## Optional input

- Leg
- Specific route
- Pace (`relaxed` | `standard` | `fast`)
- Constraint (`with-a-child`, `knee-injury`, `weekends-only`)
