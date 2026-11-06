---
name: bulletin-analyzer
description: Analyzes IT service bulletins (support and/or network technicians) to extract patterns, trends, recurring equipment, frequent users, workload. Produces a management-readable summary report.
model: claude-sonnet-5
user-invocable: true
aliases: []
argument-hint: "[period: month|week|quarter] [team: support|network|all] [optional path]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Bulletin Analyzer — IT Service Bulletin Analysis

Reads service bulletins from one or more IT teams, extracts key data, and produces a report of patterns and trends.

## Default sources

- Support technicians: `SupportTeam/reports/bulletins/`
- Network: `NetworkTeam/reports/bulletins/`
- Or any explicitly provided path

## Phase 0 — Parameters

1. Period? (week / month / quarter / [start date] → [end date])
2. Team(s)? (support / network / both)
3. Focus? (recurring equipment / frequent users / workload / incident types / all)

## Phase 1 — Reading and extraction

Read the period's files, extract per bulletin:
- Date, technician, intervention type, user/workstation, outcome, observations

## Phase 2 — Pattern analysis

### Recurring equipment
Alert threshold: **3 interventions or more** → candidate for preventive maintenance or replacement.

### Frequent users
Alert threshold: **4 calls or more** → need for training or unsuitable equipment.

### Dominant incident types
Breakdown in % by category (Hardware / Windows / Software / Accounts / Printers / Network).

### Workload
By technician + identification of peaks (busy days/weeks).

### Resolution rate
Resolved on first call / after multiple interventions / unresolved / escalated.

## Phase 3 — Summary report

```markdown
# IT Activity Report — [Period]

## Overview
[Total interventions, teams, period]

## Points of attention
### Equipment to monitor
[List with recommendations: maintenance / replacement]

### Users needing follow-up
[Context — training / unsuitable equipment]

## Incident breakdown
[Table by type]

## Team workload
[By technician + comment on peaks]

## Resolution rate
[Figure + comment]

## Recommendations
[3 to 5 concrete, quantified actions if possible]
```

## Phase 4 — Saving

Offer to save to `reports/YYYY-MM_it-activity.md`.
