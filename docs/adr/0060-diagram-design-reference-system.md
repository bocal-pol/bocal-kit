# ADR 0060 — diagram-design as the visual reference system

**Date:** 2026-09-17
**Status:** Accepted

## Decision

Adopt the `diagram-design` visual system as the reference for palette, typography, and grid conventions for every skill that produces diagrams (`illustre`, `architect`, `design-dna`, and any future visualization skill).

## Reason

The system provides a coherent set of 39 diagram types, a WCAG AA semantic palette (ink/paper/accent/muted), a strict 4px grid, and three type families (Instrument Serif / Geist sans / Geist Mono). Centralizing this reference prevents every skill from inventing its own diverging palette.

## Consequences

- Diagram skills use the `paper` (#f5f5f5), `ink` (#2d3142), `accent` (#eb6c36), `muted` (#4f5d75) tokens by default.
- A project can override via `DESIGN.md` — the project's own palette always wins over the system palette.
- The `diagram-improve` skill maintains consistency by auditing drift when the reference system updates.
- Coordination: `diagram-improve` is the propagation tool for future updates to the system.
