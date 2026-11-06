---
name: feature-backlog
description: "Feature Backlog — hierarchical, prioritized project-bootstrap product backlog (Epic → Feature → Story, MoSCoW + RICE score). Auto-invoke on mention of: feature backlog, product backlog, prioritization, MoSCoW, RICE, epics, features, functional roadmap."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies:
  - product-manager
conflicts: []
---

# Feature Backlog — Bootstrap prioritized backlog

Produces a **hierarchical, prioritized product backlog** (`intake/feature-backlog.md`): Epic →
Feature → Story, with **MoSCoW + RICE score** prioritization. Business owner: `product-manager`.

## Optional input (orchestrable)

If project context (App Spec, PRD, feature list) is provided as input, use it without re-asking
questions. If `intake/feature-backlog.md` already exists, enrich it.

## Ownership delegation

Product vision, detailed user stories, and acceptance criteria belong to `product-manager` (invoke
via `Skill` to go deeper). This skill produces the **prioritized bootstrap structure**.
⚠️ Fallback: if `product-manager` is unavailable, produce the backlog from memory per the template.

## Workflow

### Phase 1 — Collection
Infer features from the App Spec, or via `AskUserQuestion` (expected major functional blocks).

### Phase 2 — Structuring & prioritization
Group into Epics → Features → Stories. For each item, compute **RICE = (Reach × Impact ×
Confidence) / Effort** and tag with **MoSCoW** (Must / Should / Could / Won't).

## Template — `intake/feature-backlog.md`

```markdown
# Feature Backlog — [Project]

> Prioritization: MoSCoW (Must/Should/Could/Won't) + RICE = (Reach × Impact × Confidence) / Effort

## Epics
- **E1 — [Name]**: epic goal

## Prioritized backlog
| ID | Epic | Feature / Story | MoSCoW | R | I | C | E | RICE | Status |
|----|------|-----------------|:------:|:-:|:-:|:-:|:-:|:----:|--------|
| F1 | E1 | … | Must | 100 | 3 | 0.8 | 2 | 120 | To do |

## Prioritization notes
- Reach/Impact assumptions: …
- "Won't" items (out of v1 scope): …
```

## Persistence (conditional)
- **Standalone**: `mkdir -p intake` then write `intake/feature-backlog.md`.
- **Orchestrated**: return the Markdown, persistence handled by `project-bootstrap-agent`.

## Skip memory
The `intake/feature-backlog.md` artifact is the deliverable — versioned in the project, not in
`~/.claude/memory/`.
