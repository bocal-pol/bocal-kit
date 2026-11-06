# ADR 0067 — `logging-architect`: a cross-cutting logging skill instead of one per stack

- **Status**: accepted
- **Date**: 2026-10-02

## Context

The need for structured logging (levels, format, correlation, PII masking, an audit trail) was real on both backend (Laravel/.NET) and frontend (Angular/React), but no skill covered it. The repo's default pattern is one skill per stack (`laravel-developer`, `angular-developer`, etc.), each carrying its own doctrine.

## Decision

Create a single `logging-architect` skill (`scope: cross`), modeled on `dto-architect`: a shared doctrine (levels, structured JSON, `request_id`/`trace_id` correlation, mandatory PII masking, an audit trail distinct from the technical log) followed by per-stack sections. The four framework skills (`laravel-developer`, `dotnet-developer`, `angular-developer`, `react-developer`) declare it as a `dependencies:` entry instead of duplicating the doctrine. `backend-agent` and `frontend-agent` each gain a `--logging` mode that invokes it.

## Positive consequences

- The shared doctrine (front↔back correlation, PII masking) exists in exactly one place — a fix or addition (e.g. a new log aggregator) benefits both stacks with no resync needed.
- Consistent with the earlier `dto-architect` precedent, already accepted as a cross-stack utility skill.

## Negative consequences / risks

- A `cross`-scoped skill doesn't appear under any domain in the Skill Router, like `dto-architect` before it — it's only reached via explicit declaration in dependent skills, not by domain resolution.

## Alternatives considered

- **Two separate skills (`backend-logging` / `frontend-logging`)**: simpler to route by domain, but duplicates the shared doctrine (structured format, correlation, GDPR). Rejected after discussion with the user, who settled on the cross-cutting option.

## Scope

Backend + Frontend — the `logging-architect` skill, `backend-agent` and `frontend-agent` agents.
