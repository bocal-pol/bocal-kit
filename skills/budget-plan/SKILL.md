---
name: budget-plan
description: Building IT budget plans — hardware/software investments, recurring costs, maintenance, services, contingency reserves. Multi-year projection, management summary note, actual vs. planned comparison.
model: claude-sonnet-5
user-invocable: true
aliases: []
argument-hint: "[fiscal year] [scope: full|hardware|software|maintenance]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Budget Plan — IT Budget Plan

Building and tracking the IT budget. Structured for a fiscal-year-based organization — adapt the fiscal year boundaries and tax rate to the applicable jurisdiction.

## Phase 0 — Scoping

1. Fiscal year (YYYY)
2. Scope (full / hardware only / software only / maintenance)
3. Sources to use: inventory (hardware-inventory), contracts (contract-manager), bulletins (bulletin-analyzer)
4. **Public procurement?** If a budget line individually exceeds the applicable public-procurement
   threshold (license purchase, hosting, external services), or the project is run by an entity
   subject to public procurement law: route that line to `public-procurement-agent` instead of
   costing it here. `budget-plan` remains the source for the overall costing and for lines below
   the threshold; `public-procurement-agent` (→ `spec-writer`) qualifies the procedure (direct /
   negotiated / open) for lines above it. Don't double-count: a line sent to
   `public-procurement-agent` appears in this budget as a reference
   (`→ see public-procurement-agent, ref. [spec document]`), not as a costed amount here.

## Budget categories

| Category | Examples |
|---|---|
| Hardware investment | Switches, servers, workstations, printers |
| Software investment | Licenses, SaaS subscriptions |
| Recurring costs | Annual support, preventive maintenance |
| Services | Consulting, training, assistance |
| Contingency reserve | 5–10% of the total excluding the reserve |

## Phase 1 — Collection

For each budget line:
- Description
- Category
- Estimated amount (before tax)
- Justification (EOL replacement / new infrastructure / contractual)
- Urgency (P1 mandatory / P2 planned / P3 desirable)
- Source (inventory ID / contract reference)

## Phase 2 — Budget table

```
# IT Budget Plan — Fiscal Year YYYY

## Summary
| Category | Amount (ex. tax) | % |
|---|---|---|

Total (ex. tax):  [X]
Tax:              [X]
Total (incl. tax): [X]

## Line detail
| # | Description | Cat. | Priority | Amount (ex. tax) | Justification |
|---|---|---|---|---|---|
```

## Phase 3 — Multi-year projection (optional)

| Line item | YYYY | YYYY+1 | YYYY+2 | Trend |
|---|---|---|---|---|

## Phase 4 — Management summary note (1 page)

- Context and stakes
- Priorities for the fiscal year
- Numeric summary
- Risks if the budget is reduced

## Saving

`documents/budgets/YYYY_it-budget-plan.md`
