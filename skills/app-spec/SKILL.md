---
name: app-spec
description: "App Spec — compact application specification for project bootstrap (pitch, users, scope, features, key screens, technical & legal constraints, NFRs, risks). Auto-invoke on mention of: app spec, application specification, product scoping, project scope, application definition."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies:
  - functional-analyst
  - analyst
conflicts: []
---

# App Spec — Bootstrap application specification

Produces a **compact application specification** (`intake/app-spec.md`): the "what is this app" overview to lock down **before** launching the product chain. Intentionally concise — it's the foundation, not the full PRD (`product-manager`) nor the detailed use cases (`functional-analyst`).

## Optional input (orchestrable)

If project context is provided as input (from `project-bootstrap-agent` or `team-dev`), use it directly without asking questions. If `intake/app-spec.md` already exists, enrich it rather than overwrite it.

## Owning delegation

Detailed business content belongs to `functional-analyst` (use cases) and `analyst` (personas/market). This skill produces the **compact view** and invokes the owner via `Skill` to deepen a chapter if requested.
⚠️ Fallback: if `functional-analyst` / `analyst` are unavailable, produce the App Spec from memory using the structure below.

## Workflow

### Phase 1 — Collection
If no context is provided, ask a single grouped question via `AskUserQuestion`: name & pitch, business goal, target users, scope, known constraints.

### Phase 2 — Writing
Fill in the template. Mark `TO BE DETERMINED` for any undecided area rather than inventing one.

## Template — `intake/app-spec.md`

```markdown
# App Spec — [Name]

- **Pitch**: one sentence (the what + for whom + value)
- **Business goal**: the intended outcome, measurable if possible

## Users & roles
| Role | Description | Main need |
|------|-------------|------------------|

## Scope
- **In scope**: …
- **Out of scope (explicit)**: …

## Main features
1. …

## Key screens / flows
| Screen / flow | Purpose | Relevant role |
|------------------|-----|---------------|

## Constraints
- **Technical**: required stack, hosting, target browsers/OS, mandatory integrations
- **Legal / regulatory**: data protection, sector-specific rules, accessibility (WCAG)

## Non-functional requirements (NFR)
| Axis | Target |
|-----|-------|
| Performance | … |
| Availability | … |
| Security | … |
| Accessibility | … |

## Assumptions & risks
- **Assumptions**: …
- **Risks**: …
```

## Persistence (conditional)
- **Standalone**: `mkdir -p intake` then write `intake/app-spec.md`.
- **Orchestrated** (input received from `project-bootstrap-agent`): return the Markdown, persistence is handled by the orchestrator.

## Skip memorization
The `intake/app-spec.md` artifact is the deliverable — versioned in the project, not in `~/.claude/memory/`. See also [[cadrage]] (`CONTEXT.md`).
