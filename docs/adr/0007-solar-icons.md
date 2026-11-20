# ADR 0007 — Icon library: the single standard (Lucide, replaces Solar)

- **Status**: accepted — revised on 2026-11-20 (Solar replaced by Lucide)
- **Date**: 2026-08-21

## Context

Projects used different icon libraries depending on the developer or the tutorial followed: Lucide, Heroicons, Material Icons, Font Awesome. This fragmentation created visual inconsistency between screens and unnecessary duplicate imports. On 2026-08-21, Solar became the single standard.

Revision of 2026-11-20: `solar-icon-set` is published under **GPL-3.0**. The animated icons of the shared module copied its drawings. This makes the code impossible to distribute without placing it under GPL. Lucide is published under **ISC**, and Animate UI already ships 392 of its icons in animated form (MIT).

## Decision

Use the **Lucide** library (`lucide-react`, `lucide-angular`, `lucide-static`, or the official package of the platform) for every icon, across all projects and all layers (frontend Angular/React, backend Filament/Laravel, mobile Flutter).

- Never introduce Solar, Heroicons, Material Icons, or another lib without explicit agreement
- If a Lucide icon does not exist for a specific need: flag it and propose the closest Lucide alternative before using another library
- In React, animated icons come from the shared module (Animate UI), named `<LucideName>Icon`. The table that maps the old Solar names to Lucide is `scripts/solar-to-lucide.json` in that module

## Positive consequences

- ISC license: no distribution constraint
- 141 of the 222 icons in use exist as an animated version drawn by hand by Animate UI. The other 81 are generated with the identical Lucide drawing
- Guaranteed visual consistency across all projects, a single package to maintain and audit

## Negative consequences / risks

- The drawing changes (2 px rounded stroke): the Solar to Lucide equivalence is semantic, not graphical. 45 mappings are approximate
- Lucide has no `bold` or `duotone` variant: use color or size for a visual accent
- If Lucide lacks a specific icon, the exception process creates friction

## Alternatives considered

- **Keep Solar**: GPL-3.0 license, see the context.
- **Heroicons**: tied to the Tailwind/Headless ecosystem, not adopted.
- **Material Icons**: too closely tied to Google's identity. Not adopted.
- **Free choice per project**: visual fragmentation. Rejected.

## Scope

All projects with a user interface.
