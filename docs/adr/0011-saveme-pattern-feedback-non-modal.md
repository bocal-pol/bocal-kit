# ADR 0011 — SaveMe: non-modal feedback pattern for reversible actions

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Interfaces pile up confirmation modals for every action, even the most trivial ones. This pattern creates friction: the user clicks "Confirm" reflexively, without reading. Conversely, zero feedback leaves the user uncertain. A third path is needed for low-criticality actions.

## Decision

Introduce the **SaveMe** pattern: an auto-dismissing toast (5–8 s) with an Undo button, paired with a persistent history of recent actions (bell icon or sidebar). The routing criterion is **business criticality**: any action with no financial or legal consequence goes through SaveMe; the rest stay in a modal.

| Criticality | Pattern |
| --------- | ------- |
| Low — no financial/legal consequence | SaveMe |
| High — irreversible destruction, external distribution, financial/legal impact | Modal |

**SaveMe examples**: archive, change a status, pin, remove a tag, disable.
**Modal examples**: permanently delete, send, publish, pay, sign.

## Positive consequences

- Reduces modal fatigue
- The user stays in their workflow
- The action history provides a re-engagement and trust surface

## Negative consequences / risks

- Requires a soft-delete or deferred-execution implementation server-side
- The action history must be persisted and accessible

## Alternatives considered

- **Toast alone, with no undo**: irreversible. Rejected.
- **Modal for everything**: excessive friction. Rejected.
- **Global undo (Ctrl+Z)**: not suited to multi-tab web usage. Rejected.

## Scope

All projects with a user interface (web, mobile).
