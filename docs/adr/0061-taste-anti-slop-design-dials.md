# ADR 0061 — Taste: anti-slop dials as design quality-control metadata

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The design ecosystem had UI quality rules (ADR 0040 — the impeccable detector) but no way to calibrate a project's **stylistic ambition**. Result: agents produced technically correct but visually generic interfaces, with no defined personality. Analysis of a third-party "taste" skill identified three calibratable control parameters (the "dials") that give concrete direction on a project's level of experimentation, animation, and density.

## Decision

### 1. Three taste dials as metadata in DESIGN.md

Every frontend project records its visual ambitions in `DESIGN.md` under a `taste:` key:

```yaml
## Taste

```yaml
taste:
  variance: 5      # 1-10: conservative → experimental
  motion: 4        # 1-10: static → kinetic
  density: 4        # 1-10: airy → compact
  style: minimalist-ui  # reference style (optional)
  updated: YYYY-MM-DD
```
```

**Design Variance (1–10)**
Controls layout and composition experimentation.
- 1–3: strict grid, predictable compositions, no surprises
- 4–6: a few distinctive elements, slight asymmetries
- 7–10: experimental, broken grid, expressive typography, unusual compositions

**Motion Intensity (1–10)**
Controls the level of animation and kineticism.
- 1–3: static or minimal micro-feedback (< 100ms)
- 4–6: standard transitions — hover, focus, toast, modals (150–300ms ease-out)
- 7–10: kinetic — scroll-driven, stagger, parallax, orchestrated page transitions

**Visual Density (1–10)**
Controls the amount of information per unit of surface.
- 1–3: lots of white space, one idea per screen
- 4–6: standard dashboard density — information and breathing room balanced
- 7–10: very compact, small typography, tight grid, maximum visible info

### 2. Defaults by Surface-mode (ADR 0040)

| Surface-mode | Variance (default) | Motion (default) | Density (default) |
|-------------|-------------------|-----------------|-----------------|
| **Persuade** | 7 | 6 | 3 |
| **Operate** | 3 | 3 | 7 |
| **Read** | 2 | 2 | 5 |
| **Experience** | 8 | 7 | 4 |

If `DESIGN.md` has no `taste:` section, agents apply the declared Surface-mode's defaults.

### 3. Mandatory read before any design work

`design-agent` and `ux-designer` read the dials in Phase 1 and account for them:
- The dials steer layout (variance), animation (motion), and spacing (density) decisions
- The reference style guides the palette, typography, and visual effects
- The `taste` skill is the entry point for adjusting the dials and applying the transformations

### 4. Available reference styles

The `taste` skill exposes 50 active styles (partial list below):
glassmorphism · claymorphism · brutalism · neumorphism · minimalist-ui · high-end-visual-design · industrial-brutalist · stitch · futurism · organic · dark-premium · swiss-international · retro/vaporwave · techy/dev · coquette · corporate-flat · …

## Positive consequences

- Agents get concrete direction on stylistic ambition, not just prohibition rules
- The `taste:` section in `DESIGN.md` persists intent across sessions
- Surface-mode defaults avoid systematic manual calibration

## Negative consequences / risks

- A Variance=9 value with no human designer in the loop can produce unusable layouts
- The dials are subjective — two agents can interpret the same score differently
- The style catalog is large: choosing a style with no visual reference stays approximate

## Alternatives considered

- **Prose instructions in DESIGN.md**: not machine-readable, every agent interpreted them differently. Rejected in favor of numeric values.
- **Mandating a single required style**: too constraining for back-office projects where style doesn't matter. Rejected.

## Scope

All frontend projects. Read by `design-agent`, `ux-designer`, `taste`.
