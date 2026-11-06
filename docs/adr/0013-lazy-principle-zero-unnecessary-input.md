# ADR 0013 — Lazy Principle: zero unnecessary input

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Forms accumulate fields out of habit or caution: everything is asked for "just in case." Result: the user re-types their name while logged in, enters a date by hand when a picker would do, sees required fields whose value will be ignored in the database.

## Decision

Introduce the **Lazy Principle**: before showing a field, walk a 5-step decision hierarchy. A field only exists if it passes the test.

### Hierarchy (strict order)

1. Data already in the database for the user → silently pre-fill
2. A reliable contextual default value → pre-select
3. The business value is null for this flow → remove the field
4. Data already entered in this session → reuse it
5. Otherwise → show the field with the most suitable component

### Mandatory components by type

Forbid free-text input when a specialized component exists: date picker, duration picker, select/segmented control, color picker, geographic autocomplete, people picker, formatted numeric input.

### Agent obligations

- **frontend-agent**: justify every field against the hierarchy before coding the form
- **backend-agent**: endpoints accept optional fields with server-side defaults; never reject a request for a missing field that has a known default

## Positive consequences

- Reduced friction and input time
- Fewer input errors (pickers constrain the format)
- Higher form completion rate

## Negative consequences / risks

- Field-by-field analysis at design time (moderate design overhead)
- Incorrect pre-filled values must stay easy to edit

## Alternatives considered

- **Exhaustive forms**: maximum friction, high abandonment. Rejected.

## Scope

All projects with a user interface. Applies to `frontend-agent` (frontend) and `backend-agent` (backend).
