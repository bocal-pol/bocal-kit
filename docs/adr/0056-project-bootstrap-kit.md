# ADR 0056 — Project bootstrap kit produced by `project-bootstrap-agent`

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The product chain (`product-agent` → Project Brief, PRD, functional specs) assumes a foundation already in place: who the users are, what business entities exist, which integrations are mandated, what the brand looks like. On a brand-new project, none of this exists yet — and the PRD got written on implicit assumptions, discovered wrong partway through development.

Symmetrically, the development-error register was never initialized: every project rediscovered the same pitfalls.

## Decision

`project-bootstrap-agent` produces the **full intake kit before the product chain**. Six deliverables, six dedicated skills:

| Deliverable | Content |
| --- | --- |
| **App Spec** | Pitch, users, scope, features, key screens, technical & legal constraints, NFRs, risks |
| **Brand Brief** | Mission, values, personality, tone & voice, positioning, visual identity |
| **Data Dictionary** | Entities, attributes, types, required flag, PII/GDPR tagging, source, validation |
| **Feature Backlog** | Epic → Feature → Story, prioritized via MoSCoW + a RICE score |
| **Integrations Catalog** | Third-party systems, protocol, auth, direction, criticality, SLA, owner |
| **Error Journal** | A living error register — initialized at bootstrap, fed throughout development |

### Sequencing

`new-app` (framing the idea) → **`project-bootstrap-agent`** (the intake kit) → `product-agent` (Brief, PRD, specs) → `architecture-agent` (architecture).

The kit also feeds the `DESIGN.md` / `PRODUCT.md` design context files (ADR 0040) and the `sdd-specify` phase (ADR 0030).

### PII tagging from the dictionary onward

The Data Dictionary carries PII/GDPR tagging **at the attribute level**, from bootstrap — not at compliance-audit time, when the fix costs a migration.

## Positive consequences

- The PRD gets written on established facts rather than implicit assumptions
- Upfront PII tagging avoids later compliance migrations
- The Error Journal exists before the first error, so it's actually fed over time

## Negative consequences / risks

- **Six documents before the first line of code**: heavy for a throwaway prototype or a validation MVP
- The deliverables go stale if nobody updates them during development
- Overlap with `sdd-specify` (ADR 0030) and `new-app` needs attention to avoid producing the same thing twice

## Alternatives considered

- **Going straight to the PRD**: the initial state, implicit assumptions discovered wrong along the way. Rejected.
- **A single intake document**: unreadable, and impossible to update partially. Rejected in favor of six targeted deliverables.
- **Producing the kit after the first sprint**: the Data Dictionary would arrive after the migrations it was meant to guide. Rejected.

## Scope

Any new application project. See also ADR 0030 (SDD), 0040 (design context), and 0035 (GDPR compliance).
