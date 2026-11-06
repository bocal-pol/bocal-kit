# ADR 0041 — Definition of "done" for infrastructure: service + consumer + proof

- **Status**: accepted
- **Date**: 2026-09-17

## Context

An infrastructure service was regularly declared "in place" as soon as its container started: Redis was running but no application connected to it, a queue was declared but no worker consumed it, a MinIO instance was provisioned with not a single file ever passing through it. `docker compose ps` was green, yet nothing was actually wired up — the failure only surfaced in production, on first real use.

## Decision

Adding an infra service (Redis, queue, MinIO, mailer…) is only done once **all three** conditions are met:

1. **The application config points to it** — `.env` **and** `.env.example` updated (`.env.example` shapes the next developer's own setup).
2. **A consumer runs when needed** — for example a queue worker declared in the compose file, not just the broker.
3. **A check proves real usage** — observed traffic (`redis-cli MONITOR`), a test job processed (`php artisan queue:work`), an object written then read back.

> A service running with no consumer = an unfinished task.

The proof of use is an observation, not a claim: it produces a citable command output, in the spirit of the acceptance gates from ADR 0009.

## Positive consequences

- Eliminates the "the service was there but nobody used it" class of incidents
- `.env.example` stays in sync, making new-machine bootstrap more reliable
- The usage proof serves as a reusable CI gate

## Negative consequences / risks

- Lengthens the task: starting a service is no longer enough, it must be wired up and proven
- Some proofs require a full environment (worker + broker + app), costly locally
- Connection secrets must be managed outside `.env` (see ADR 0002), which complicates point 1

## Alternatives considered

- **Container healthcheck as the only criterion**: proves the process is alive, not that it serves any purpose. Rejected.
- **Integration test deferred to the next sprint**: exactly what produced the production failures. Rejected.

## Scope

Any infrastructure task, across all projects — backend, DevOps, platform. Source: the "Definition of done for infrastructure" section of `CLAUDE.md`.
