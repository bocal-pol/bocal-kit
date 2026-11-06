---
name: hardware-inventory
description: CMDB management for network and IT hardware fleet — switches, routers, servers, workstations, licenses, spares. CRUD, EOL/warranty audit, export. Stored in Markdown/CSV.
model: claude-sonnet-5
user-invocable: true
aliases: ["/inv"]
argument-hint: "[action: add|update|list|audit|export] [type: switch|router|server|workstation|license|spare]"
type: domain
priority: medium
scope: infra
dependencies: []
conflicts: []
---

# Hardware Inventory — Hardware Fleet CMDB

Hardware inventory management in Markdown. Structure suited to both network and user workstations.

## Target file

`inventory/hardware-inventory.md`

## Asset structure

| Field | Description |
|---|---|
| ID | INV-[TYPE]-[NUM] |
| Make / Model | e.g. Huawei S5735-L48T4X |
| Serial number | |
| Location | Room / Rack / Bay / Office |
| Management IP | |
| Management VLAN | |
| Purchase date | YYYY-MM-DD |
| Warranty end | YYYY-MM-DD |
| Support contract end | YYYY-MM-DD |
| Status | Active / Down / Spare / EOL |
| Notes | Firmware, config file, specifics |

## Actions

### `add` — Add an asset

Collect the required fields and append to `inventory/hardware-inventory.md`.

### `update` — Modify an asset

Search by ID or serial number → display → modify.

### `list` — List

Filters: by type / by location / by status.

### `audit` — Automatic audit

Detect:
- EOL in < 6 months 🚨
- Expired warranties ⚠️
- Assets with no management IP
- Duplicate serial numbers
- Assets with no active support contract

### `export` — Export

Output as a Markdown table, CSV, or HTML artifact.

## Integrations

- `network-report` → fleet figures for management reports
- `budget-plan` → renewals to budget (detected EOL)
- `contract-manager` → cross-check assets against support contracts
