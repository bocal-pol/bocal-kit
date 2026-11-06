# ADR 0055 — Public-procurement domain conventions

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The IT-administration skills (specifications, purchase order, contract manager, budget plan) produce documents with administrative weight in a regulated setting: public procurement. Two elements are hardcoded there and shape the content produced — procedure thresholds and identifier formats. They were scattered across the skills, with no trace of their origin or validity date.

## Decision

### 1. Procedure thresholds (by estimated amount)

Any procurement drafting starts with a **Phase 0 qualification** step that determines the applicable procedure, based on a threshold table appropriate to the deploying organization's jurisdiction:

| Estimated amount (excl. tax) | Procedure |
| --- | --- |
| Below the lowest threshold | Direct procedure (several informal quotes recommended) |
| Between the two thresholds | Negotiated procedure without publication |
| Above the highest threshold | Open procedure with public notice |

The estimated amount is set **before** drafting the specifications: it shapes the document's form, not the other way around. The actual threshold figures are jurisdiction- and currency-specific and must be looked up and documented per deployment — see the note on dated thresholds below.

### 2. Identifier formats

| Document | Format | Example |
| --- | --- | --- |
| Purchase order | `ICT-PO-YYYY-NUM` | `ICT-PO-2026-042` |
| Vendor contract | `ICT-CTR-YYYY-NUM` | `ICT-CTR-2026-007` |

A purchase order references its linked contract via `ICT-CTR-YYYY-NUM`. Filing convention: `documents/purchase-orders/YYYY-MM-DD_ICT-PO-YYYY-NUM_[vendor].md`.

### 3. Fiscal constants and structure

A sales-tax rate applicable to the jurisdiction, amounts expressed excluding tax within the thresholds, mandatory budget allocation, specifications structured into **Mandatory Minimum** and **Desired Optional** sections.

### 4. Thresholds are regulatory, hence dated

Procedure amounts come from public-procurement regulation and **change over time**. They must be verified before any high-stakes procurement, and this ADR is amended whenever they change — it documents a state, not a permanent truth.

## Positive consequences

- Identifiers are predictable and sortable; linking a purchase order to its contract is mechanical
- Phase-0 qualification avoids drafting a document in the wrong form
- Thresholds are gathered in a single place to amend

## Negative consequences / risks

- **Thresholds go stale**: an outdated amount produces a document under the wrong procedure, with a real legal risk
- No automated check cross-references the skills against current regulation
- Identifier formats assume manual numbering, with no central registry

## Alternatives considered

- **Thresholds entered by the user on every procurement**: shifts the memorization burden and produces inconsistencies. Rejected.
- **Live lookup of regulation on every use**: a network dependency and an unstable source for a frequent need. Rejected in favor of a documented, dated value.
- **Free-form identifiers**: loses the contract ↔ purchase-order link. Rejected.

## Scope

The specifications, purchase order, contract manager, and budget plan skills, and the procurement agent (ADR 0052). Context: public-sector procurement, jurisdiction to be configured per deployment.
