# ADR 0005 — Mandatory 3-part error messages

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Error messages shown to users were either too technical (stack trace, raw SQL code, raw HTTP code), too vague ("An error occurred"), or silent (navigation with no message shown). The user knew neither what had failed, nor why, nor what to do.

## Decision

Every error message shown to a user (UI or API response) must contain **3 elements in this order**:

1. **What failed** — the operation in progress (e.g. "Couldn't save")
2. **Why** — the probable cause in plain language, never a raw technical message
3. **What to do** — a concrete proposed action (e.g. "Retry", "Check your connection")

### Forbidden anti-patterns

- Raw exception message (`error.message`, `stackTrace`) in production
- HTTP code or technical code alone (`"Error 500"`, `"SQLSTATE[23000]"`)
- Vague message with no cause or action (`"An error occurred"` alone)
- Silent navigation on error (redirect with no message shown)

## Positive consequences

- The user understands what happened and knows what to do
- Reduces support contacts for recurring errors
- Forces error-case thinking during development

## Alternatives considered

- **Raw technical message**: incomprehensible to the end user, an information-disclosure flaw in prod. Rejected.
- **A single generic message**: gives no actionable information. Rejected.

## Scope

All projects, frontend (Angular, React, Flutter) AND backend (API responses).
