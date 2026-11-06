---
name: service-bulletin
description: Writing and managing the daily service bulletin — daily intervention log. Modes append (add an intervention), finalize (close out the day), view (read), report (period summary).
model: claude-sonnet-5
user-invocable: true
aliases: ["/sb"]
argument-hint: "[mode: append|finalize|view|report] [optional date]"
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Service Bulletin — Daily Intervention Log

Manages the daily intervention journal. Used by both support technicians and network engineers to log activity.

## Target file

`reports/bulletins/YYYY-MM-DD_bulletin.md` (created automatically if absent)

---

## `append` mode — Add an intervention

Collect and append to the day's bulletin:

```markdown
### [HH:MM] — [Type: Hardware|Windows|Network|Software|Account|Printer|Other]

**User / Workstation / Equipment:** [identification]
**Action:** [short description of the intervention]
**Result:** Resolved ✅ / Partial ⚠️ / Unresolved ❌ / Escalated 🔄
**Estimated duration:** [N minutes/hours]
**Observations:** [points to watch, follow-up needed]
```

---

## `finalize` mode — Close out the day

Add the end-of-day summary:

```markdown
---
## Day summary — [date]

| Indicator | Value |
|---|---|
| Total interventions | [N] |
| Resolved | [N] (X%) |
| Escalated | [N] |
| Unresolved | [N] |
| Total estimated time | [Xh Ym] |

### Open items for tomorrow
- [item if applicable]
```

---

## `view` mode — Read

Read and display the bulletin for a given date (today by default).

---

## `report` mode — Period summary

Aggregate several bulletins and produce a summary:
- Total number of interventions
- Breakdown by type
- Recurring equipment / users
- Resolution rate

Redirects to `bulletin-analyzer` for in-depth analysis.

---

## Automatic invocation

This skill is called automatically at the end of intervention skills (`pc-repair`, `network-engineer`, `switch-audit`, `firewall-engineer`, etc.) to log activity.
