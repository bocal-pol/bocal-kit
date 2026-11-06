---
name: sdd-plan
description: "Spec-Driven Development — Plan Phase. Consumes spec.md and produces plan.md (stack, architecture, technical constraints, ADRs). Invoke from architecture-agent after the architecture. Auto-invoke on mention of: SDD plan, sdd-plan, spec-kit plan.md."
model: claude-sonnet-5
user-invocable: false
type: utility
priority: high
scope: cross
dependencies:
  - sdd-specify
conflicts: []
---

# SDD Plan — Spec-oriented technical plan

Translates `spec.md` into an actionable technical plan. The first step where the **how** is
allowed.

## SDD principle

`plan.md` inherits the constraints from `spec.md` and never contradicts them.
Every technical choice must reference the `spec.md` acceptance criterion or constraint that
justifies it.

## Optional input (invoked from architecture-agent)

If an architecture and a spec are provided as input, use them directly.
Otherwise, read `spec/spec.md` via Read. If absent: `⚠️ spec.md not found — run sdd-specify first`.

## Workflow

### Phase 1 — Reading the spec

Read `spec/spec.md` and `spec/constitution.md` if available.
Extract: non-negotiable constraints, acceptance criteria, out of scope.

### Phase 2 — Writing plan.md

Produce `spec/plan.md` in the following format:

```markdown
# Technical Plan — [Project name]
> Based on spec.md — [spec date]

## Chosen stack

| Layer       | Technology | Justification (spec ref.) |
|--------------|-------------|--------------------------|
| Backend      | ...         | Constraint §X            |
| Frontend     | ...         | Acceptance criterion §Y |
| Database | ...         | ...                      |
| Infra        | ...         | ...                      |

## Target architecture

[Prose description — 5-10 lines max]
[Level-1 C4 Mermaid diagram if relevant]

## ADRs (Architecture Decision Records)

### ADR-001 — [Decision title]
- **Status**: Accepted
- **Context**: [Why this decision was necessary]
- **Decision**: [What was chosen]
- **Rejected alternative**: [What wasn't chosen and why]
- **Consequences**: [Impact on the project]

## Technical constraints inherited from spec.md
- [spec constraint §X] → [Concrete technical implication]

## Technical risks
| Risk | Probability | Impact | Mitigation |
|--------|-------------|--------|-----------|
| ...    | Medium     | High  | ...       |

## Development standards
- Code conventions: ...
- Test strategy: ...
- Security: ...
```

### Phase 3 — Spec/plan consistency check

For each non-negotiable constraint in `spec.md`, verify a plan decision covers it.
If a constraint isn't covered, add a visible `⚠️ NOT COVERED` in `plan.md`.

### Phase 4 — Persistence (conditional)

- **Standalone**: write `spec/plan.md` via Write
- **Orchestrated** (from architecture-agent): return the Markdown content without writing —
  persistence handled by the orchestrator

### Phase 5 — Report

Display:

```
✅ SDD Plan complete
- spec/plan.md — [N] ADRs, [N] stack layers, [N] risks
- Spec coverage: [N/N] constraints covered
→ Ready for sdd-tasks (project-bootstrap-agent)
```
