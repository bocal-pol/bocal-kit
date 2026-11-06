# ADR 0010 — IKEA effect: progressive ownership in B2C projects

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Projects with mass-market end users suffer from weak ownership of the tool. The user is using a generic product, not "their" product. This feeling reduces adoption and accelerates churn. The psychological principle known as the "IKEA effect" (Norton, Mochon, Ariely 2012) shows that people value more highly what they've partly built or configured themselves.

## Decision

Every B2C application must expose a progressive customization surface, split into three layers:

1. **Visual identity** (avatar, theme, colors)
2. **Content & data** (favorites, shortcuts, widgets)
3. **Behavioral** (language, notifications, density)

Trigger it through an optional onboarding (1–3 skippable steps) complemented by contextual nudges. Customization is gated behind auth — preferences must survive a logout/login.

## Positive consequences

- Increases the sense of ownership and retention
- Reduces early churn via the user's initial investment
- Differentiates the product without complex features

## Negative consequences / risks

- Adds backend complexity (per-user preference storage)
- Requires careful UX design to avoid friction

## Alternatives considered

- **Mandatory onboarding (forced steps)**: generates friction and drop-off before first use. Rejected.
- **Zero discovery (no onboarding)**: ownership stays weak. Rejected.
- **localStorage without auth**: ephemeral customization, frustration on re-login. Rejected.

## Scope

B2C / mass-market projects only. Excluded: internal tools, APIs, single-client B2B, MVPs under 2 weeks.
