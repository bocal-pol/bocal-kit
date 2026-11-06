# ADR 0068 — Hick's Law: on-screen action hierarchy

- **Status**: accepted
- **Date**: 2026-10-28

## Context

Formulated by William Edmund Hick (1952) and later refined by Ray Hyman, the Hick-Hyman law states `T = a + b·log₂(n+1)`: decision time grows with the **logarithm** of the number of options, not linearly — doubling the options doesn't double the time, it adds a constant increment `b`. Two empirical nuances matter so the law isn't applied dogmatically:

- The effect assumes options that are **unfamiliar and of comparable perceived weight**. Options very unequal in usage frequency (one item used 95% of the time among ten) barely slow down the decision at all — which is precisely why visual hierarchy (rule 2 below) neutralizes Hick's Law more effectively than simply reducing the option count.
- **Chunking** reduces the effective `n`: a 20-item menu organized into 4 groups of 5 is decided faster in practice than a flat 20-item list, because the user first picks a group (log₂ 4) then an item within it (log₂ 5), and the sum of those two times is lower than log₂ 20 taken as one block. Hick's Law doesn't forbid functional richness: it penalizes the lack of structure, not the raw number of well-grouped options.

On a screen, the law gets violated silently: several buttons of equal visual weight, no clear hierarchy between the expected action and secondary ones, advanced settings shown permanently next to the primary action. Every option added at equal visual weight slows down the decision for all existing options, not just the new one — the effect isn't additive on reading time, it's logarithmic but genuinely real starting at 3-4 comparable-weight actions.

## Decision

On any screen with a primary action, apply 4 hierarchy rules:

1. **A single, obvious primary action** — every screen has a goal; the action that serves it gets visual treatment that designates it unambiguously. If two actions seem equally legitimate, the screen has a design problem to solve before adding a button, not by adding one.
2. **The primary button visually dominates** — greater weight (size, solid color vs. outline, position) than anything around it. A secondary CTA as a solid button in the same color as the primary one restores the ambiguity rule 1 just removed.
3. **Advanced options hidden by default** — collapsed under a disclosure ("Advanced options," an accordion, a secondary tab) until the user explicitly asks for them. Never show them flat next to the primary action just because they exist.
4. **Never two equal-weight actions side by side** — two solid buttons of the same size on the same row, even in different colors, force the user to compare them before choosing. One of the two must yield visual weight (a ghost button, a text link, a secondary position) or the two must be merged.

A fifth consideration from the original request — not showing an option with no business value — is **already covered by the Lazy Principle** ([ADR 0013](0013-lazy-principle-zero-unnecessary-input.md)) for forms; this ADR extends it to actions and interface options broadly (a button, a menu item, a toggle) rather than redefining the same decision hierarchy twice: an option that serves no real use case for the current user isn't shown, period.

### Agent obligations

- **frontend-agent** / **design-agent**: before shipping a screen with more than one clickable action, explicitly identify the primary action and justify the visual treatment of the others (secondary, tertiary, hidden). A screen with two visually equivalent CTAs is a finding to fix before delivery, not an acceptable design variant.
- **ux-designer**: wireframes annotate action hierarchy (primary / secondary / hidden by default) alongside component states.

## Positive consequences

- Faster decisions on high-traffic screens (checkout, onboarding, critical forms)
- Reduced choice-paralysis bias on screens with many options
- Cross-screen consistency: a single visual-hierarchy pattern applied everywhere

## Negative consequences / risks

- Requires an explicit product trade-off when two actions genuinely seem equal in business importance — the ADR doesn't settle that choice, it only forces it to be made consciously
- Risk of over-hiding: a useful but infrequent option relegated too deep becomes a discoverability problem of its own (see [ADR 0036](0036-keyboard-shortcuts-full-coverage.md) on keeping every shortcut accessible and documented even when collapsed)

## Alternatives considered

- **Let the user see everything, all the time** ("more transparency"): measurably slower to decide past 3-4 equal-weight options; rejected in favor of hierarchy and progressive disclosure.

## Scope

All projects with a user interface (web, mobile, back-office). Applies to `frontend-agent`, `mobile-agent`, `design-agent`, `ux-designer`.
