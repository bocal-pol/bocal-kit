# ADR 0039 — Mandatory granular cookie consent

- **Status**: accepted
- **Date**: 2026-09-17

## Context

Web deliveries embedded third-party scripts (Google Analytics, Meta Pixel, Hotjar) directly in the `<head>`, loaded before any user interaction. When a banner existed, it was limited to an "Accept all" button that offered no real choice — a facade of consent, non-compliant with GDPR and the ePrivacy directive, with no withdrawal mechanism.

## Decision

Every web application (frontend, SaaS, public site) ships a **per-category granular** consent banner.

1. **Essential cookies** (session, auth, cart, language preference) — always active, no consent required.
2. **Non-essential cookies** (analytics, marketing, third-party tracking, A/B testing) — **disabled by default**, enabled only after explicit consent.
3. Consent is granular per category (Analytics | Marketing | Personalization). An "Accept all" button alone isn't enough.
4. The user can change or withdraw consent at any time via a "Cookie settings" link accessible from every page.
5. The choice is persisted (`localStorage` or a `consent_*` cookie) so it isn't asked again on every visit.
6. **No third-party script loads before the corresponding consent is given.**

### Definition of "done"

A web delivery is only done once the banner is functional, non-essential scripts are gated behind consent, withdrawal actually disables the scripts (verifiable in the Network tab), and the "Cookie settings" link is accessible everywhere.

## Positive consequences

- GDPR/ePrivacy compliance by default, no catch-up audit needed
- Withdrawal is genuinely effective, not just declarative
- Deferred loading of third-party scripts mechanically improves first-render time

## Negative consequences / risks

- Integration overhead: third-party scripts must be injected dynamically, not hardcoded in the template
- Loss of analytics data on the share of users who decline
- Requires a consent-management component maintained in the design system

## Alternatives considered

- **"Accept all" button alone**: no free choice, non-compliant. Rejected.
- **An informational banner with no blocking** ("by continuing, you accept"): scripts load before consent. Rejected.
- **A third-party CMP SaaS solution**: adds its own third-party script and a recurring cost; a viable option but not mandated.

## Scope

All web projects exposed to users — Angular/React frontends, SaaS, public sites. Out of scope: APIs with no interface, internal tools with no third-party tracking.
