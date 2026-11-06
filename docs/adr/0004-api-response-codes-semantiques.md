# ADR 0004 — Semantic HTTP codes and a unified API response format

- **Status**: accepted
- **Date**: 2026-08-21

## Context

APIs were returning `200` for errors, empty bodies with no explicit code, and exposing stack traces in production. This made debugging hard and created information-disclosure flaws (resource enumeration, exposure of internal details).

## Decision

Every API response must cover the 4 outcome cases with a semantic HTTP code:

| Case | HTTP code | Body |
| --- | --- | --- |
| Success with data | `200` / `201` | A resource object or list |
| Success with no data | `204` | Empty body — not an empty `{}` |
| Client error | `400` / `404` / `409` / `422` | `{ "message": "...", "errors": [...] }` |
| Server error | `500` | Generic message in prod; stack trace in internal logs only |

### Supplementary rules

- `404` if the resource doesn't exist **or** if the user lacks access to it (avoids enumeration)
- `401` for a missing/expired token, `403` for insufficient rights
- `422` for failed business validation, with per-field detail
- Always validate input server-side, independent of the frontend
- Never expose `exception.message` or `stackTrace` in production

## Positive consequences

- Predictable, unambiguously documentable APIs
- Stronger security (no resource enumeration)
- Easier debugging in dev, no info leak in prod

## Alternatives considered

- **`200` for everything**: masks errors on the client side. Rejected.
- **Empty `{}` body** for 204: ambiguous, causes client-side parsing errors. Rejected.

## Scope

All backend projects (Laravel, .NET).
