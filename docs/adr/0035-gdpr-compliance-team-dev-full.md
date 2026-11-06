# ADR 0035 — GDPR Compliance Officer integrated into team-dev --full

- **Status**: accepted
- **Date**: 2026-07-13

## Context

GDPR/ISO 27001/NIS2 compliance was handled externally or forgotten during development. Violations were discovered in a post-delivery audit, costly to fix.

## Decision

Add `compliance-officer --gdpr` as a mandatory step in the `team-dev --full` cycle (between security review and dev):

- **P0/P1 violations**: block progress — must be resolved before continuing
- **P2/P3**: listed in the report, non-blocking
- Covers: GDPR, ISO 27001, NIS2

The `compliance-officer` skill is also available for direct invocation (`/compliance-officer`) for a one-off audit.

## Positive consequences

- Compliance checked at every full development cycle
- Blocking violations are surfaced before delivery
- Findings are traceable in the session report

## Negative consequences / risks

- Lengthens the `team-dev --full` cycle (an extra step)
- Requires `compliance-officer` to be calibrated for the sector (public/private, country)

## Alternatives considered

- **External post-delivery audit**: too late and too costly. Rejected.
- **Optional**: consistently skipped under pressure. Made mandatory in `--full`.

## Scope

Security/compliance — all projects with personal data or in a regulated sector.
