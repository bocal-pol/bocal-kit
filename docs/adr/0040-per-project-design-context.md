# ADR 0040 — Per-project design context: DESIGN.md, PRODUCT.md, and the Surface-mode taxonomy

- **Status**: accepted
- **Date**: 2026-09-17

## Context

Design agents (`design-agent`, `ux-designer`, `artifact-design`) rediscovered the project's palette, typography, and audience in every session — or, lacking that information, invented visual choices inconsistent from one session to the next. No reference file persisted design decisions, and no classification guided density, animation, or typography trade-offs based on the nature of the screen.

## Decision

### 1. Two context files at the root of every frontend project

Scaffolded by `project-bootstrap-agent` or `/init`, read directly by design agents before any work:

- **`DESIGN.md`** — color palette (OKLCH recommended), typography stack, component-kit rules, critical visual constraints, icon library (Solar, see ADR 0007)
- **`PRODUCT.md`** — target audience, success metrics, brand voice, accessibility floor (WCAG AA minimum)

If missing, the design agent creates them in Phase 1 — it doesn't start without them.

### 2. Surface taxonomy (Surface-mode)

Before any design work or UI generation, classify the surface:

| Mode | Use case | UX priority |
| --- | --- | --- |
| **Persuade** | Landing pages, marketing, conversion | Impact, emotion, a strong CTA |
| **Operate** | Back-office, dashboards, business forms | Density, efficiency, reduced cognition |
| **Read** | Documentation, articles, reports | Readability, typographic hierarchy |
| **Experience** | Games, onboarding, mass-market products | Pleasure, discovery, engagement |

The mode drives density, animation, palette, and typography trade-offs. A single project can span several modes.

### 3. Taste dials (ADR 0061)

The `taste:` section in `DESIGN.md` records the project's stylistic ambitions (see ADR 0061 for the full format):

```yaml
taste:
  variance: 5   # 1-10: conservative → experimental
  motion: 4     # 1-10: static → kinetic
  density: 4    # 1-10: airy → compact
  style: minimalist-ui
  updated: YYYY-MM-DD
```

`design-agent` and `ux-designer` read these values in Phase 1 and apply them. The `taste` skill is the entry point for adjusting the dials and applying the corresponding transformations.

### 4. A shared design vocabulary — 24 impeccable commands

The `impeccable` skill exposes 24 commands shared by `design-agent` and `ux-designer`:

| Category | Commands |
|-----------|-----------|
| Quality review | `audit`, `critique`, `polish` |
| Visual adjustments | `bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout` |
| Construction | `craft`, `shape`, `harden`, `onboard`, `animate`, `delight`, `overdrive` |
| System | `document`, `extract`, `clarify`, `adapt`, `optimize` |

After generating specs or code, `design-agent` invokes `impeccable audit` + `impeccable critique` before delegating to `frontend-agent`.

### 5. Industry-specific reasoning rules

For projects with an industry declared in `PRODUCT.md`, `design-system` applies the corresponding reasoning rules (192 rules spanning 8 categories: tech/SaaS, finance, healthcare, e-commerce, services, creative, lifestyle, emerging tech). These rules guide: color palette, font pairing, landing-page patterns, visual effects, and sector-specific anti-patterns.

### 6. UI quality detector

`frontend-agent` and `design-agent` propose `npx impeccable install` on every frontend project: a fast `PostToolUse` hook on UI files (contrast, overflow, purple-to-blue gradients) and a full-scan `Stop` hook at end of session.

## Positive consequences

- Design decisions survive across sessions — no more rediscovery or visual drift
- Surface-mode makes an until-now implicit trade-off explicit (a back-office isn't designed like a landing page)
- The detector catches visual AI-slop before human review

## Negative consequences / risks

- Two more files to maintain per project, which go stale if nobody updates them
- `impeccable` is an external dependency: verify it before mandating it in CI
- Surface-mode classification can be ambiguous on hybrid screens

## Alternatives considered

- **Design context inside the project's `CLAUDE.md`**: mixes agent instructions with a design reference, unreadable for a human designer. Rejected.
- **Design tokens alone (no `PRODUCT.md`)**: gives the "how" with no "for whom." Insufficient.
- **No surface classification**: the status quo, source of the observed inconsistencies. Rejected.

## Scope

All frontend projects and any design work produced. Source: the "Per-project design" section of `CLAUDE.md`.
