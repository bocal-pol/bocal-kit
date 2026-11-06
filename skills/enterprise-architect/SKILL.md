---
name: enterprise-architect
description: "Enterprise Architect — aligning the IS with company strategy, urbanization, capability mapping, transformation roadmap. Auto-invoke on mention of: IS urbanization, enterprise architecture, TOGAF, capability map, application mapping, IS roadmap, digital transformation."
model: claude-opus-5
user-invocable: true
type: domain
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Enterprise Architect

Aligns the information system with company strategy: urbanization, capability mapping, overall
application vision, transformation roadmap. Methodological reference: TOGAF ADM phases B (Business)
and C (Information Systems).

## Optional input (if invoked from `architecture-agent`)

If the target architecture is provided (output of the `architect` skill):
- Start directly at Phase 2 with that data
- Skip Phase 1

Otherwise: run the full workflow from Phase 1.

## Workflow

### Phase 1 — IS context gathering

Read via Glob + Read:
- `architecture/architect/*.md` (target architecture if available)
- `analysis/analyst/*.md` (Project Brief)
- `analysis/product-manager/*.md` (PRD)

If insufficient, ask via AskUserQuestion in a single question:
- Existing applications and platforms in the IS (list or description)
- Business capabilities already covered (e.g. CRM, billing, authentication, reporting)
- Known application duplicates or identified IS debt
- Target transformation horizon (12 months / 24 months / 36 months)

**Grep exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

### Phase 2 — Capability Map

Produce a capability map matrix in draw.io XML format:

```xml
<mxfile host="app.diagrams.net">
  <diagram name="Capability Map">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10"
                  pageWidth="1169" pageHeight="827">
      <root>
        <mxCell id="0"/><mxCell id="1" parent="0"/>
        <!-- Row 1: Strategic capabilities (fillColor=#dae8fc) -->
        <!-- Row 2: Operational capabilities (fillColor=#d5e8d4) -->
        <!-- Row 3: Support capabilities (fillColor=#fff2cc) -->
        <!-- For each capability: a rectangle cell labeled [Name] / [Covering application] -->
        <!-- Uncovered capability: fillColor=#f8cecc to flag the gap -->
        <mxCell id="cap1" value="&lt;b&gt;[CapabilityName]&lt;/b&gt;&lt;br/&gt;[Application]"
          style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=11;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="80" width="200" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

File: `architecture/enterprise-architect/diagrams/YYYY-MM-DD_capability-map.drawio`
- Organize into 3 horizontal tiers: strategic / operational / support
- Color gaps in red (business capabilities not covered by any application)
- Color application duplicates in orange

### Phase 3 — Urbanization target

Describe the solution's positioning in the IS:
1. **What it replaces**: decommissioned applications or absorbed functions
2. **What it complements**: integrations with the retained existing system
3. **What it creates**: new capabilities that didn't exist before

Produce a before/after draw.io diagram if a significant transformation is identified:
- File: `architecture/enterprise-architect/diagrams/YYYY-MM-DD_urbanization.drawio`
- Left = current state (AS-IS), Right = target (TO-BE), migration arrows between the two

### Phase 4 — Transformation roadmap

Milestone table across 3 horizons:

| Horizon | Period | Milestones | IS deliverables | Dependencies |
|---------|---------|--------|-------------|-------------|
| H1 — Short term | 0–6 months | | | |
| H2 — Medium term | 6–18 months | | | |
| H3 — Long term | 18–36 months | | | |

### Phase 5 — IS alignment risks

| Risk | Type | Probability (H/M/L) | Impact (H/M/L) | Mitigation |
|--------|------|---------------------|----------------|------------|
| | IS debt | | | |
| | Application redundancy | | | |
| | Strategic dependency | | | |

### Phase 6 — Conditional persistence

- **If invoked from `architecture-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p architecture/enterprise-architect/diagrams` via Bash
  2. Write the `.drawio` files via Write
  3. Write `architecture/enterprise-architect/YYYY-MM-DD_enterprise-architect.md`

### Phase 7 — Memory

> ⚠️ Skip if invoked from `architecture-agent`.

Update `.claude/architecture-knowledge.md`:
- Identified capability gaps (list)
- Planned decommissioned applications
- Chosen transformation horizon
