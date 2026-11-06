# ADR 0006 — Resilience under load: mandatory checklist

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Backend implementations shipped with no load consideration caused timeouts, DB connections created on the fly per request, and slow operations (mail, PDF) run synchronously inside the HTTP request. These patterns collapse under moderate load.

## Decision

Every backend, infra, or mobile implementation must pass a resilience checklist before being marked "done":

- **DB pool**: pooled connection (`DB_POOL_SIZE`, `pool.max`) — never a connection created on the fly per request
- **Async**: slow operations (mail, PDF, webhook, image processing) offloaded to a job/queue — never synchronous inside the HTTP request
- **Explicit timeouts**: all external I/O (HTTP client, DB, Redis, S3) has a defined timeout — never an infinite default
- **Retry with backoff**: calls to third-party services use exponential backoff + jitter + a max attempt count
- **Rate limiting**: every exposed public endpoint is protected (throttle, middleware, API Gateway)
- **Cache**: frequently-read cold data is cached (Redis, in-memory) with a reasonable TTL
- **Graceful degradation**: if a secondary service is down (mail, notifications), the main flow must not fail

If a point isn't covered, flag it explicitly rather than shipping without warning.

## Positive consequences

- Applications hold up under load from the first delivery
- Secondary-service outages no longer take down the main flow
- Explicit timeouts prevent indefinite hangs

## Negative consequences / risks

- Initial development overhead (queue, cache, circuit-breaker setup)
- The DB pool needs per-environment configuration

## Alternatives considered

- **Optimize after the fact**: too late once it's in production under load. Rejected.
- **Optional checklist**: ignored in practice. Made mandatory instead.

## Scope

All backend and infra projects. Mobile for network operations.
