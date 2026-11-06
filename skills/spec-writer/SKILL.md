---
name: spec-writer
description: "Writing specification documents for public procurement — technical specifications, award criteria, administrative conditions. Jurisdiction-neutral template; thresholds and procedure names must be adapted to the applicable public procurement law."
model: claude-sonnet-5
user-invocable: true
aliases: ["/spec"]
argument-hint: "[procurement subject] [estimated amount]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Spec Writer — Public Procurement Specifications

Writes specification documents compliant with the applicable public procurement law. The thresholds and procedure names below are illustrative — adapt them to the jurisdiction in force.

## Phase 0 — Procurement qualification

1. Subject and summary description
2. Estimated amount (before tax) → determines the applicable procedure
3. Procurement type (supplies / services / works)

| Amount (ex. tax) | Procedure |
|---|---|
| Below the low-value threshold | Direct procedure (several quotes recommended) |
| Between the low-value and the publication threshold | Negotiated procedure without publication |
| Above the publication threshold | Open procedure with official publication |

## Phase 1 — Technical specifications

Structure into Mandatory Requirements (MR) and Desired Optional items (DO):

| # | Specification | Type | Justification |
|---|---|---|---|
| 1 | ... | MR / DO | |

Rule: every MR must be objectively justifiable to avoid discrimination between bidders.

## Phase 2 — Quantities and delivery

- Exact quantities or ranges (min/max)
- Delivery location
- Delivery / go-live timeline
- Acceptance conditions (acceptance tests)

## Phase 3 — Award criteria

Total weighting = 100%

| Criterion | Weight | Evaluation method |
|---|---|---|
| Price | X% | Proportional formula |
| Technical value | X% | Scoring grid |
| Timeline | X% | |
| After-sales service | X% | |

## Phase 4 — Administrative conditions

- Contract duration
- Performance bond (if applicable, typically a percentage of the amount above a threshold)
- Payment terms: adapt to local practice (e.g. net 30 end of month)
- Applicable law: [jurisdiction]
- Dispute resolution: [competent courts]

## Phase 5 — Final document structure

```
# SPECIAL SPECIFICATIONS DOCUMENT
Reference: IT-SPEC-YYYY-NUM

## 1. Subject of the procurement
## 2. Procedure
## 3. Technical specifications
## 4. Quantities and delivery
## 5. Award criteria
## 6. Administrative and legal conditions
## 7. Submission form
```

## Saving

`documents/specifications/YYYY-MM-DD_[short-subject].md`
