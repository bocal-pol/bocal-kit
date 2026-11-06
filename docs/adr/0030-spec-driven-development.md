# ADR 0030 — Integrated Spec-Driven Development (SDD) workflow

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Fuzzy or missing specifications generated gaps between what was expected and what was delivered. Code and specs diverged quickly, making conformance audits impossible.

## Decision

Integrate SDD as a cross-cutting discipline via 4 sequenced skills:

1. **`sdd-specify`** → `spec.md` + `constitution.md` (inputs: goals, constraints, vocabulary)
2. **`sdd-plan`** → `plan.md` with ADRs and decision traceability
3. **`sdd-tasks`** → `tasks.md` with testable tasks traced spec↔task
4. **`sdd-converge`** → a convergence report (spec vs. delivered code)

Integrated agents: `product-agent`, `architecture-agent`, `project-bootstrap-agent`, `sprint-agent` invoke the corresponding phases.

SDD phases are mandatory before dev when the specification is non-trivial. Skip allowed for mechanical changes.

## Positive consequences

- Provable spec↔code traceability before acceptance
- The convergence report acts as an objective delivery gate
- ADRs are produced during the plan phase, not after

## Negative consequences / risks

- Initial overhead for small features (mitigated by the allowed skip)
- Requires discipline to keep `spec.md` up to date

## Alternatives considered

- **Dev with no spec**: unavoidable divergence on projects over 2 weeks. Rejected.
- **A Word/Confluence spec**: not versioned, not linked to the code. Rejected.

## Scope

Cross-cutting — all projects with non-trivial specifications.

## Amendment 2026-09-11 — upstream alignment (spec-kit 1.0.1 → 1.0.6)

Two upstream changes carried into the local essence:

- **Field constraints quoted verbatim** (`sdd-tasks`): each task copies the data model's constraints (`intake/data-dictionary.md` or `data-model.md`) — length, required, enum, validation, PII — instead of leaving them to the implementer, who reinvents them silently.
- **Existing-project mode** (`sdd-specify`): a constitution drawn from the repo's own evidence, a first bounded change with explicit compatibility boundaries, no retro-specifying the whole system, an explicit choice of a spec-aging model.

Not adopted: the workflow engine, the bundler, presets/extensions/integrations, and community catalogs (roughly 130 of 141 upstream commits), which belong to the `specify` CLI's tooling rather than to the discipline itself. The upstream append-only convergence command (June 2026, append-only on `tasks.md`) stays distinct from this repo's `sdd-converge` (a gap report); the "spec of specs" approach (an epic roadmap, July 2026) is documented upstream and available if a project needs it.
