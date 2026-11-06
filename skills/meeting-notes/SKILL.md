---
name: meeting-notes
description: "Structures meeting notes for a project meeting outside the Scrum ceremony framework: attendees, decisions made, actions assigned with a due date. Auto-invoke on mention of: meeting notes, meeting, minutes, decisions made, client meeting, DPO meeting, supplier meeting."
model: claude-haiku-4-5-20251001
user-invocable: true
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Meeting Notes — Meeting Minutes

Structures the notes for any project meeting that isn't a Scrum ceremony handled by
`scrum-master` (Sprint Planning, Daily, Review, Retrospective) — typically a client meeting,
a DPO check-in, a supplier exchange, a steering committee, or any ad hoc meeting.

## Scope — when to use this skill instead of `scrum-master`

| Situation | Skill |
|---|---|
| Tooled Scrum ceremony (Planning, Daily, Review, Retro) | `scrum-master` |
| Client meeting, steering committee, DPO check-in, supplier exchange, ad hoc meeting | `meeting-notes` (this skill) |

Both produce persisted, searchable artifacts — no meeting should disappear into a calendar event
with no trace.

## Optional input (orchestrable)

If invoked with already-structured context (attendees, raw notes, relevant project), use it
directly without re-asking the Phase 1 questions.

## Workflow

### Phase 1 — Collection

If not supplied as input, ask via **AskUserQuestion**:
1. Relevant project (for filing the entry).
2. Attendees (names/roles).
3. Meeting type: client / DPO-compliance / supplier / steering committee / other.
4. Raw notes or an oral summary of what was said.

### Phase 2 — Structuring

Extract three distinct categories from the raw notes, without mixing them:
- **Decisions made**: what was settled during the meeting (not just discussed).
- **Actions**: each action with an owner and a due date — an action with no owner or due date
  isn't an action, it's an intention; flag it as incomplete rather than omitting it.
- **Open items**: what remains open, to be addressed in a future meeting.

### Phase 3 — Writing

```markdown
# Meeting Notes — [Meeting type] — [Project] — YYYY-MM-DD

## Attendees
- ...

## Decisions made
| # | Decision | Scope |
|---|----------|--------|

## Actions
| # | Action | Owner | Due date | Status |
|---|--------|-------|----------|--------|

## Open items
- ...

## Next meeting
[Planned date, or "To be scheduled"]
```

### Phase 4 — Conditional persistence

- **Standalone**: create the folder via Bash (`mkdir -p meetings`), write
  `meetings/YYYY-MM-DD_[type]-[project-slug].md`.
- **Orchestrated**: return the Markdown content, persistence handled by the caller.

Explicitly tie the entry to a project in the filename — the goal is for a project management
app to list a given project's meeting history without having to parse the content.

## Note on the GDPR/DPO angle

A `DPO-compliance` meeting (e.g. DPO contact made, a legal basis validated) should be referenced
from `compliance-officer` as evidence of the process — mention the path of the file produced here
in the GDPR report rather than duplicating its content.

## Skip memory

The `meetings/*.md` minutes are versioned project deliverables, not memories — don't record them
in `~/.claude/memory/`.
