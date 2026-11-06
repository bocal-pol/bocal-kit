# ADR 0007 — Solar icon library: the single standard

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Projects used different icon libraries depending on the developer or the tutorial followed: Lucide, Heroicons, Material Icons, Font Awesome. This fragmentation created visual inconsistency between screens and unnecessary duplicate imports.

## Decision

Use the **Solar** library (`solar-icon-set` npm, or Solar SVG sprites) for every icon, across all projects and all layers (frontend Angular/React, backend Filament/Laravel, mobile Flutter).

- Never introduce Lucide, Heroicons, Material Icons, or another lib without explicit agreement
- If a Solar icon doesn't exist for a specific need: flag it and propose the closest Solar alternative before using another library

## Positive consequences

- Guaranteed visual consistency across all projects
- A single package to maintain and audit
- Solar covers common use cases with several variants (outline, bold, duotone)

## Negative consequences / risks

- If Solar lacks a specific icon, the exception process creates friction
- Migrating existing projects to Solar requires an audit of icons in place

## Alternatives considered

- **Lucide**: popular but not adopted — standardization on Solar decided globally.
- **Heroicons**: tied to the Tailwind/Headless ecosystem, not adopted.
- **Material Icons**: too closely tied to Google's identity. Not adopted.
- **Free choice per project**: visual fragmentation. Rejected.

## Scope

All projects with a user interface.
