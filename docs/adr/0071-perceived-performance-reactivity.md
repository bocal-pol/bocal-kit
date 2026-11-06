# ADR 0071 — Perceived performance: instant reactivity and success confirmation

- **Status**: accepted
- **Date**: 2026-10-30

## Context

ADR 0003 covers rendering asynchronous data (Loading/Error/Empty/Success) and ADR 0005 covers error message format. Neither covers the fraction of a second **between the user's click and the first visual feedback**: a button that doesn't change state until the server response arrives feels slow even when the server responds quickly, and leaves the door open to a double submission. Similarly, a task offloaded to a job/queue (see the "Resilience under load" rule) only gets a progress indicator if an exact percentage is known — a long process with no `%` (report generation, a large import) stays silent until it finishes, which looks like the interface has frozen. Finally, an important successful action (a payment, submitting an application, creating an account) has no dedicated confirmation pattern: the SaveMe pattern is reserved for reversible, cancelable actions, not for acknowledging a significant but non-reversible, legitimate step.

## Decision

Every interface with a user action applies, in addition to ADR 0003 and ADR 0005 (never duplicating them):

1. **Immediate reaction to the click (< 100 ms)**: a "pressed"/pending visual state shown before any server response, the button disabled immediately to prevent a double submission.
2. **A loading state** for any content fetch — refer to the "UI state components" rule (ADR 0003), not restated here.
3. **Long-task progress extended beyond a known `%`**: a job/queue-offloaded task with no exact percentage shows an indeterminate indicator **and** a step label ("Step 2/4: generating the PDF…") or a status poll — never total silence after it's triggered.
4. **Explicit confirmation of important successful steps**, a pattern distinct from SaveMe: a persistent banner or success screen (not a toast lasting a few seconds), with a success symbol and, when relevant, the next proposed action.
5. **Error messages with no over-disclosure**: the 3-part rule (ADR 0005) stays the reference, completed with an explicit guard — the "why" never reveals an exploitable technical or sensitive detail (a stack trace, whether an account exists, the database structure, a server path).

### Completion criteria

A screen is only "done" if a click produces immediate visual feedback, every long task (known `%` or not) shows continuous progress, important successful steps are explicitly confirmed, and no error message discloses exploitable technical information.

## Positive consequences

- A feeling of speed even on a slow network — visual feedback no longer depends on server latency.
- Eliminates a class of double-submission bugs (a duplicated payment, a form sent twice).
- Long tasks with no known `%` stop looking like a frozen interface.

## Negative consequences / risks

- Implementation overhead: a "pressed" state distinct from the existing "loading" state, a new success-banner component to add to the design system.
- Risk of over-notification if "important step" is poorly calibrated — not everything deserves a persistent banner, only genuinely significant steps (payment, submission, account creation), not every minor save (which stays covered by SaveMe).

## Alternatives considered

- **Extend the SaveMe pattern to important successes**: SaveMe implies a cancellation window, incompatible with an already-executed, non-reversible action (a payment, a send) — rejected, a distinct pattern is needed.
- **Change nothing, a spinner is enough for tasks with no `%`**: leaves the user with no indication of duration or real progress on long tasks — rejected.

## Scope

All projects with an interface (web, mobile). Out of scope: APIs with no interface, purely server-side batch processing with no associated UI. Complements [ADR 0003](0003-ui-states-4-mandatory-states.md) and [ADR 0005](0005-error-messages-3-parts.md), connects with [ADR 0006](0006-resilience-under-load.md) (offloading long tasks to a job/queue) and [ADR 0011](0011-saveme-pattern-feedback-non-modal.md) (SaveMe, for reversible actions).
