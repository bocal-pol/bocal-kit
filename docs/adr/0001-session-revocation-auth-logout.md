# ADR 0001 — Mandatory session revocation after logout

- **Status**: accepted
- **Date**: 2026-08-20

## Context

Flaw discovered in production: after logging out, a protected URL copied before logout remained accessible. The session wasn't revoked server-side — only localStorage was cleared client-side. The user believed they were logged out, but their data remained exposed.

## Decision

Every login/logout flow must be followed by an **automated revocation test via Playwright**: login → copy a protected URL → logout → navigate to the URL → verify access is denied (401/302, no sensitive content).

Invalidation must happen server-side (token/cookie invalidated in a database or blocklist), not merely a client-side localStorage clear.

### Mandatory completion criteria

1. After logout, any protected URL returns a redirect to login (not a silent access, nor a 403 with sensitive content)
2. The revocation test is automated via Playwright
3. Invalidation happens server-side
4. The test covers both directions: frontend (redirect) and backend (HTTP 401/302)

An auth flow without a revocation test = an unfinished task.

## Positive consequences

- Eliminates an entire class of post-logout session-hijacking flaws
- The Playwright test acts as a permanent CI safeguard

## Negative consequences / risks

- Requires a token blocklist or database-backed invalidation (moderate backend overhead)
- Stateless JWT tokens need either a blocklist or a very short lifetime

## Alternatives considered

- **localStorage clear alone**: insufficient — the token remains valid server-side. Rejected.
- **Short token lifetime without revocation**: improves the situation but doesn't guarantee immediate revocation. Insufficient on its own.

## Scope

All projects with authentication, frontend AND backend.
