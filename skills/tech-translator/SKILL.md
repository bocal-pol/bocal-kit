---
name: tech-translator
description: Translates ICT/network technical jargon into management language and vice versa. Generates summary notes, decision sheets, and presentations adapted for a non-technical audience (leadership, HR, legal, elected officials).
model: claude-sonnet-5
user-invocable: true
aliases: ["/tt"]
argument-hint: "[technical term or situation to translate]"
type: domain
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Tech Translator — Technical Jargon → Management

Translates technical complexity into clear, decision-oriented language for non-technical
stakeholders.

## Mode 1 — Term translation

Contextual translation glossary:

| Technical term | Management explanation | Impact if ignored |
|---|---|---|
| BSOD | The computer crashed critically | Loss of unsaved work, the machine is unusable |
| DHCP down | Computers can no longer get a network address | A general network outage for all users |
| VLAN | Logical separation of the network into isolated zones | Network security and performance |
| CVE / 0-day | A known, unpatched security flaw | Risk of intrusion or system paralysis |
| Firmware | A device's internal software (switch, router, firewall) | Outdated equipment = a potential flaw |
| Network latency | Delay between a request and its response | Slow applications, degraded Teams/Zoom |
| Active Directory | The central directory managing every account and permission | No AD = no one can log in |
| SLA | A contractual service-availability commitment | If breached: supplier penalties apply |
| Rollback | Reverting to the previous version after a problem | A standard safety procedure during an update |
| Patch / update | A security or bug fix for software | Unpatched = vulnerable to known attacks |
| Backup | A safety copy of data | With no backup: permanent loss in case of an incident |
| Zero Trust | An architecture where every access is verified, even internal | Drastically reduces the impact of a compromise |

## Mode 2 — Decision sheet

For any technical situation requiring a management decision:

```markdown
## ICT Decision Sheet — [Title]

**Situation:** [2-3 sentences, no jargon]
**Current impact:** [What this changes for users]
**Actions taken:** [What the team has already done]
**Current state:** [Where things stand]

**Decision needed:** [A precise question with options]

| Option | Pros | Cons | Estimated cost |
|---|---|---|---|
| A | | | |
| B | | | |

**Technical recommendation:** [Preferred option + why]
**Risk if no decision is made:** [Concrete consequence]
**Decision deadline:** [Due date]
```

## Optional save

`documents/leadership-notes/YYYY-MM-DD_[short-title].md`
