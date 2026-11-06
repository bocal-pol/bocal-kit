---
name: purchase-order
description: Writing IT purchase orders — reference IT-PO-YYYY-NUM, line items, VAT, budget allocation, delivery timeline, payment terms. Jurisdiction-neutral template, adapt tax rate and terms to the applicable jurisdiction.
model: claude-sonnet-5
user-invocable: true
aliases: ["/po"]
argument-hint: "[supplier] [items]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Purchase Order — IT Procurement

Writes structured purchase orders for IT purchases.

## Automatic reference

Format: `IT-PO-YYYY-NUM` — e.g. `IT-PO-2026-042`

The next number is determined by reading `documents/purchase-orders/` or `contracts/contracts.md`.

## Information collection

1. Supplier (name, address, tax ID, bank account, contact person)
2. Delivery address
3. Line items (description / quantity / unit price before tax)
4. Desired delivery timeline
5. Budget allocation (budget code / fiscal year)
6. Purchase order linked to a specification document? → give the reference

## Purchase order structure

```
PURCHASE ORDER NO. IT-PO-YYYY-NUM

Issuing department: [IT Department — Organization]
Date: YYYY-MM-DD
Supplier: [Name] — [Tax ID] — [Address]
Supplier contact: [Name] — [Email] — [Phone]

Delivery address: [...]

ORDER LINES
| # | Description | Qty | Unit price (ex. tax) | Total (ex. tax) |
|---|---|---|---|---|

Subtotal (ex. tax):   [amount]
Tax (rate):           [amount]
TOTAL (incl. tax):    [amount]

Budget allocation: [code]
Delivery timeline: [date or lead time]
Payment terms: [e.g. net 30]

Specification reference (if applicable): IT-SPEC-YYYY-NUM
Contract reference (if applicable): IT-CTR-YYYY-NUM

Authorized signature: [Name — Title]
```

## Saving

`documents/purchase-orders/YYYY-MM-DD_IT-PO-YYYY-NUM_[supplier].md`
