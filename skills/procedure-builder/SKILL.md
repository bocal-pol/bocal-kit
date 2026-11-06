---
name: procedure-builder
description: Writing operational procedures, runbooks, and knowledge base articles — installations, configurations, troubleshooting. Technical step-by-step format with suggested screenshots, validation conditions, and rollback.
model: claude-sonnet-5
user-invocable: true
aliases: ["/proc"]
argument-hint: "[procedure title or operation to document]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Procedure Builder — Writing Procedures and Runbooks

Writes clear, reproducible, maintainable operational procedures.

## Phase 0 — Collection

1. Procedure title
2. Type (installation / configuration / troubleshooting / maintenance / migration)
3. Audience (L1/L2 technician / network expert / end user)
4. Prerequisites (rights, tools, access)
5. Target environment (Windows / Linux / network / cloud)

## Procedure structure

```markdown
# [Procedure title]

**Version:** 1.0 — [date]
**Author:** [name]
**Audience:** [L1/L2/Expert]
**Estimated time:** [N minutes]

## Prerequisites
- [Required rights]
- [Needed tools]
- [Network or system access]

## Context
[When to use this procedure — 2-3 sentences]

## Steps

### Step 1 — [Title]
**Action:** [What to do — imperative sentence]
```[command if applicable]```
**Expected result:** [What you should see]
**⚠️ If error:** [What to do]

### Step 2 — ...

## Final validation
- [ ] [Success criterion 1]
- [ ] [Success criterion 2]

## Rollback / cancellation
[How to revert to the previous state if needed]

## History
| Version | Date | Change |
|---|---|---|
| 1.0 | [date] | Creation |
```

## Common procedure types

- **Software installation**: prerequisites → download → install → config → test
- **Troubleshooting**: symptom → diagnosis → possible causes → solutions in order
- **Maintenance**: planning → backup → operation → verification → log
- **Workstation onboarding**: BIOS → OS → drivers → software → account → final test

## Save

`knowledge-base/procedures/[category]/YYYY-MM-DD_[short-title].md`
