---
name: data-dictionary
description: "Data Dictionary — project-bootstrap business data dictionary (entities, attributes, types, required, PII/GDPR, description, source, validation). Auto-invoke on mention of: data dictionary, data model, business entities, fields, PII, data catalog."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: data
dependencies:
  - data-architect
conflicts: []
---

# Data Dictionary — Bootstrap data dictionary

Produces a **flat business data dictionary** (`intake/data-dictionary.md`): the list of entities and
their attributes, with a **systematic PII flag** to bootstrap GDPR compliance from the start.
Business owner: `data-agent` / `data-architect`.

## Optional input (orchestrable)

If project context (App Spec, known entities) is provided as input, use it without re-asking. If
`intake/data-dictionary.md` already exists, enrich it.

## Ownership delegation

The conceptual/logical/physical model and ERD diagrams belong to `data-architect` (invoke via
`Skill` to go deeper). This skill produces the **flat, governance-oriented dictionary**.
⚠️ Fallback: if `data-architect` is unavailable, produce the dictionary from the template, from
memory.
⚠️ GDPR: mark the PII column for **every** attribute (yes/no) — a PII attribute with no identified
legal basis is a signal to escalate to `compliance-officer`.

## Workflow

### Phase 1 — Collection
Identify business entities from the App Spec or via `AskUserQuestion` (list of handled objects:
user, order, product...).

### Phase 2 — Writing
For each entity, list the attributes. Don't invent unconfirmed attributes — mark `TO BE DETERMINED`.

## Template — `intake/data-dictionary.md`

```markdown
# Data Dictionary — [Project]

## Entities
List of entities and their business role:
- **[Entity]**: …

## Dictionary
### [Entity]
| Attribute | Type | Required | PII | Description | Source / System | Validation rules |
|----------|------|:-----------:|:---:|-------------|------------------|----------------------|
| id | uuid | yes | no | Identifier | internal | — |

## Relationships (summary)
| From | Cardinality | To | Note |
|----|-------------|------|------|

## GDPR notes
- PII attributes identified: …
- Retention period / legal basis: TO BE DETERMINED (→ compliance-officer)
```

## Persistence (conditional)
- **Standalone**: `mkdir -p intake` then write `intake/data-dictionary.md`.
- **Orchestrated**: return the Markdown, persistence handled by `project-bootstrap-agent`.

## Skip memory
The `intake/data-dictionary.md` artifact is the deliverable — versioned in the project, not in
`~/.claude/memory/`.
