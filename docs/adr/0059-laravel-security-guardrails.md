# ADR 0059 — Laravel: mandatory API Resources, default auth, secret-free logs

- **Status**: accepted
- **Date**: 2026-09-17

## Context

An audit of generated Laravel code revealed three recurring flaws. Their origin wasn't carelessness: they were **prescribed by the skills themselves**. `laravel-developer` and `laravel-api` laid down as an absolute rule returning data "without API Resources," didn't plan for any authentication zone check, and nowhere forbade logging secrets.

Skills meant to produce secure code were therefore producing the same three vulnerabilities on every endpoint.

## Decision

Three absolute rules on any generated Laravel code.

### 1. Never a raw Model in a response

Always go through an **API Resource** (`JsonResource`) as soon as a Model carries sensitive fields or relations.

`response()->json($model)` serializes the whole object: `remember_token`, the password hash, internal columns, and any relations loaded alongside it. The resource explicitly defines what goes out.

### 2. Authentication by default

Every route is `auth:sanctum` **unless explicitly justified otherwise** — login, an OAuth callback, a signed webhook. No dynamic public route.

The exception is justified in writing, at the moment it's written; a missing middleware is never an acceptable default.

### 3. Secret-free logs

Never a plaintext password, hash, token, or personal data in `Log::`, **even for debugging**. Prefer `$e->getMessage()` over the full exception when it can carry credentials (a `QueryException` contains the query, hence its bound parameters).

## Positive consequences

- Closes the internal-field leak from automatic serialization
- Authentication becomes the default, and public exposure an explicit, traceable decision
- Logs stop being a secondary exfiltration vector

## Negative consequences / risks

- One `JsonResource` class per exposed entity: a real overhead on small APIs
- `auth:sanctum` by default breaks legitimate public endpoints until the exception is declared
- Reducing exception logging complicates production diagnosis — a correlation ID must be logged instead

## Alternatives considered

- **`$hidden` on the Model**: covers fields known at write time, but a column added later leaks by default. Insufficient alone.
- **Authentication middleware applied route by route**: the state that produced the flaw — an omission is silent. Rejected in favor of the inverted default.
- **Post-processing log filtering**: the secret has already been written to disk. Rejected.

## Scope

Any generated Laravel code, across all projects. See also ADR 0004 (API response format), 0002 (secrets), and 0006 (resilience). Operational detail: the "Security guardrails" section of `skills/laravel-developer/SKILL.md`.
