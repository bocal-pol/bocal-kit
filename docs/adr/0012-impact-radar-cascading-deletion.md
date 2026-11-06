# ADR 0012 — Impact radar: transparency for cascading deletions

- **Status**: accepted
- **Date**: 2026-08-24

## Context

A cascading deletion (a project that takes its tasks with it, a folder that takes its files) is opaque to the user if all they see is a "Delete" button. They confirm without gauging the consequences, then discover the loss afterward. This pattern breeds distrust toward the application.

## Decision

Any deletion modal whose action affects at least one related item must show an **impact radar**: a verbalized list of the affected entities, grouped by type, with their real names. The radar is read-only — it informs, it doesn't offer a choice.

- Triggered as soon as at least 1 related item exists
- Real names mandatory (no anonymous counters)
- Truncated to 5 items per group + "… and N more"
- Read-only — no checkboxes, no selection
- A dry-run endpoint or method computes the dependencies without performing the deletion (response < 500 ms)

## Positive consequences

- Increased trust: the user knows exactly what they're losing
- Fewer accidental deletions and support requests
- A consistent, predictable pattern across all projects

## Negative consequences / risks

- Requires a dry-run endpoint server-side
- Deep cascades (3+ levels) can be slow — cap at 2 levels if needed

## Alternatives considered

- **Counters alone**: too abstract. Rejected.
- **Confirmation with per-impact choice**: disproportionate UX complexity. Rejected.
- **No display at all**: a source of unintended loss. Rejected.

## Scope

All projects with a user interface, as soon as a deletion involves relationships between entities.
