---
name: task-tracker
description: "Markdown task list management — ICT, projects, admin, meetings. Actions: add, list, complete, update, report. Local task-list.md file. Auto-incremented IDs. Weekly report available."
model: claude-haiku-4-5-20251001
user-invocable: true
aliases: ["/task"]
argument-hint: "[action: add|list|complete|update|report] [description or ID]"
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Task Tracker — Task Management

An operational task list in Markdown. Simple, portable, versionable with Git.

## Target file

`tickets/task-list.md` (created automatically if absent)

## Task structure

```markdown
### [TASK-NNN] — [Short title]
- **Category:** Network / Support / Project / Admin / Meeting / Purchase / Security
- **Priority:** P1 (blocking) / P2 (urgent) / P3 (planned)
- **Status:** TODO / IN PROGRESS / BLOCKED / DONE
- **Deadline:** YYYY-MM-DD (optional)
- **Notes:** [details, dependencies, observations]
```

## Actions

### `add` — Add a task

Gather: title, category, priority, deadline (optional). Auto-increment the ID.

### `list` — List

Optional filters: by status, by category, by priority.
Default display: all non-completed tasks.

### `complete [ID]` — Mark as done

Set the status to DONE + timestamp.

### `update [ID]` — Modify

Change a task's status, notes, or deadline.

### `report` — Weekly report

```markdown
## Task Report — Week [N] — [dates]

| Status | Count |
|---|---|
| Done | X |
| In progress | X |
| Blocked | X |
| TODO | X |

### To follow up
[Unfinished P1/P2 tasks]

### Completed this week
[List]
```

## Link with incident-pattern

The `incident-pattern` skill reads this file to detect incident clusters. Keep titles descriptive
with keywords (equipment, user, symptom).
