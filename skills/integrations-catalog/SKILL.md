---
name: integrations-catalog
description: "Integrations Catalog — plain catalog of a project's external integrations at bootstrap time (third-party systems, protocol, auth, direction, criticality, SLA, owner). Auto-invoke on mention of: integrations, external systems, third-party APIs, SSO, webhooks, integration catalog, connectors."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies:
  - integration-architect
conflicts: []
---

# Integrations Catalog — Bootstrap integrations catalog

Produces a **flat catalog of external integrations** (`intake/integrations.md`): an inventory of third-party systems to connect, locked down **before** the integration architecture. Business owner: `integration-agent` / `integration-architect`.

## Optional input (orchestrable)

If project context (App Spec, known systems) is supplied as input, use it without re-asking. If `intake/integrations.md` already exists, enrich it.

## Owner delegation

API contracts (OpenAPI/AsyncAPI), resilience patterns, and connector implementation belong to `integration-architect` / `integration-agent` (invoke via `Skill` for depth). This skill produces the bootstrap **inventory**.
⚠️ Fallback: if `integration-architect` is unavailable, produce the catalog from memory using the template.
⚠️ Security: never record a secret (key/token) in the catalog — only the **auth mode** and a reference to the secrets manager.

## Workflow

### Phase 1 — Collection
Identify external systems from the App Spec, or via `AskUserQuestion` (SSO, payment, mail, analytics, business APIs, storage…).

### Phase 2 — Writing
One line per integration. `TO BE DETERMINED` for any unconfirmed field.

## Template — `intake/integrations.md`

```markdown
# Integrations — [Project]

| System | Type | Protocol | Auth | Direction | Criticality | SLA | Owner | Env | Notes |
|---------|------|-----------|------|-----------|:---------:|-----|--------------|-----|-------|
| Keycloak | SSO | OIDC | OAuth2 | in | High | 99.9% | IAM team | prod/staging | — |

## Legend
- **Type**: SSO · payment · mail · analytics · business API · storage · notification
- **Protocol**: REST · GraphQL · SOAP · Webhook · Kafka · gRPC · SFTP/EDI
- **Direction**: in · out · bidir
- **Criticality**: High · Medium · Low

## Secrets
References to the secrets manager (never the material itself): …
```

## Persistence (conditional)
- **Standalone**: `mkdir -p intake` then write `intake/integrations.md`.
- **Orchestrated**: return the Markdown, persistence handled by `project-bootstrap-agent`.

## Skip memory
The `intake/integrations.md` artifact is the deliverable — versioned in the project, not in `~/.claude/memory/`.
