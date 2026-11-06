---
name: error-journal
description: "Error Journal — a living register of development errors (symptom, context, root cause, fix, prevention). Initialized at bootstrap, fed during development. Auto-invoke on mention of: error journal, error log, error register, technical lessons learned, bug history."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies:
  - knowledge-manager
conflicts: []
---

# Error Journal — Living error register

Initializes and maintains a **living error journal** (`intake/error-journal.md`): each dev incident
documented symptom → root cause → fix → prevention. At bootstrap it's **created empty**; it's then
fed throughout the dev cycle. Business owner: `knowledge-manager`.

## Optional input (orchestrable)

If invoked at bootstrap (from `project-bootstrap-agent`), create the empty register with a header and
legend. If `intake/error-journal.md` already exists, **add** an entry without overwriting previous
ones.

## Ownership delegation & links

- **Organizational memory / lessons learned** → `knowledge-manager`.
- **Validation & prevention rules** → [[bug-validator]] (a validated fix can become a memory rule).
- **Incident diagnosis** → [[debug]] (reproduce → minimize → hypothesis → fix → regression).
⚠️ Fallback: if `knowledge-manager` is unavailable, maintain the register from memory per the
template.

## Workflow

### "init" mode (bootstrap)
Create `intake/error-journal.md` with a header, legend, and an empty table.

### "add" mode (during development)
Add one line per incident. The root cause must be **confirmed** (not a hypothesis) — otherwise mark
`Status: under investigation`.

## Template — `intake/error-journal.md`

```markdown
# Error Journal — [Project]

> Living register. One line = one incident. Root cause confirmed before closing.

| ID | Date | Symptom | Context | Root cause | Fix | Prevention | Status |
|----|------|----------|----------|--------------|-----------|------------|--------|
| ERR-001 | YYYY-MM-DD | … | module/env | … | … | regression test / rule | Resolved |

## Status legend
- **Under investigation** · **Resolved** · **Workaround** · **Recurring** (→ escalate to
  knowledge-manager)
```

## Persistence (conditional)
- **Standalone**: `mkdir -p intake` then write/append to `intake/error-journal.md`.
- **Orchestrated**: on init, return the skeleton; persistence is handled by
  `project-bootstrap-agent`.

## Skip memory
The `intake/error-journal.md` artifact is the project deliverable. Durable **prevention rules**, on
the other hand, go up to memory via [[bug-validator]] / `knowledge-manager`.
