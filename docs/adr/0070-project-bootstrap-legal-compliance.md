# ADR 0070 — Conditional legal-compliance phase in project-bootstrap-agent

- **Status**: accepted
- **Date**: 2026-10-30

## Context

ADR 0056 described the bootstrap kit's 6 deliverables (`project-bootstrap-agent`) as exhaustive. In practice, legal compliance (`compliance-officer`, `legal-pages`) and accessibility (`accessibility-lead`) only kicked in late: in the quality-loop phase of `team-dev --full` (after the data model and forms were already coded) or in `--audit` mode, after the fact. Fixing data minimization or adding a form consent checkbox after the fact costs a rework of the data model and UI; thinking about it at bootstrap time, while the Data Dictionary and App Spec are still being written, costs one extra question.

## Decision

`project-bootstrap-agent` gains a **conditional phase**: if the App Spec or Data Dictionary indicates external forms, payment, or external users with personal data, `project-bootstrap-agent` invokes `compliance-officer` (legal bases + minimization, a lightweight pass) then `legal-pages`, and persists the result as a **draft** in `intake/legal-compliance.md` — explicitly not final. The corresponding `team-dev --full` compliance phase (`compliance-officer --gdpr`) **finalizes** this draft instead of starting from scratch. An internal project with no public exposure skips this phase silently (no legal section to produce).

This decision complements ADR 0056 (which stays valid for the 6 fixed deliverables) without replacing it: the bootstrap kit now counts 6 fixed deliverables + 1 conditional one.

## Positive consequences

- Data minimization and form consent get designed before the data model and forms are coded, not patched afterward.
- The later `team-dev --full` compliance pass becomes a faster finalization (legal bases already sketched) rather than a first production.
- A project that stops after bootstrap (without chaining into `--full`) still has a first draft of legal documents available, instead of none.

## Negative consequences / risks

- Lengthens bootstrap with one extra conditional step — a project misqualified in Phase 1 (forms/payment not anticipated) can trigger or skip this phase wrongly.
- The draft produced at bootstrap can go stale if the legal bases change mid-project before the later finalization pass — hence the requirement to explicitly mark it "draft," never final.
- `compliance-officer`/`legal-pages` get invoked twice on the same project (bootstrap + the later full pass) — accepted as the cost of triggering early, since the second pass is a targeted finalization, not a full repeated audit.

## Alternatives considered

- **Keep the current late trigger** (quality-loop phase / `--audit` only): simpler, but doesn't address the expressed need to design for compliance from the start rather than catch up on it later. Rejected.
- **Make the legal phase unconditional in `project-bootstrap-agent`**: would produce useless documents for internal tools with no public exposure. Rejected; the trigger stays conditional on an actual detection of forms/payment/external users.

## Scope

Applies to `agents/project-bootstrap-agent.md` and the corresponding phases of `skills/team-dev/SKILL.md`. Complements [ADR 0056](0056-project-bootstrap-kit.md) (the bootstrap kit) and connects with [ADR 0035](0035-gdpr-compliance-team-dev-full.md) (GDPR compliance integrated into `--full`) and [ADR 0069](0069-legal-pages-multi-jurisdiction-eu.md) (multi-jurisdiction `legal-pages`).
