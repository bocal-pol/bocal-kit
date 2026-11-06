---
name: security-architect
description: "Security Architect — security by design, STRIDE/PASTA/LINDDUN threat modeling, zero-trust, cryptography, layered controls. Auto-invoke on mention of: security by design, threat modeling, STRIDE, zero trust, security architecture, security design, cryptographic controls, network segmentation, defense in depth."
model: claude-opus-5
user-invocable: true
type: domain
priority: medium
scope: security
dependencies: []
conflicts:
  - appsec
---

# Security Architect

Security built into design: threat modeling (STRIDE / PASTA / LINDDUN), cryptographic control
choices, zero-trust, segmentation, architecture-level identity management. Scope: upstream design —
for static review of implemented code, delegate to `appsec`.
Reference: OWASP SAMM, NIST SP 800-160 (Systems Security Engineering).

## Optional input (if invoked from `architecture-agent`)

If the target architecture is provided (output of the `architect` skill):
- Start directly at Phase 2 with that data
- Skip Phase 1

Otherwise: run the full workflow starting from Phase 1.

## Workflow

### Phase 1 — Context gathering

Read via Glob + Read:
- `architecture/architect/*.md` (target architecture — sorted descending)
- `architecture/architect/diagrams/*.drawio` (C4 if available)
- `analysis/product-manager/*.md` (PRD, to identify critical flows)

**Grep exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

If no target architecture is available, ask via AskUserQuestion:
- Description of the system and sensitive data flows
- Type of data processed (PII, financial, health, public)
- Planned authentication model
- Regulatory constraints (GDPR, ISO 27001, NIS2, eIDAS)

### Phase 2 — STRIDE Threat Model

Apply STRIDE to each container identified in the Level-2 C4 (or to the components described):

| Container / Component | S — Spoofing | T — Tampering | R — Repudiation | I — Info Disclosure | D — DoS | E — Elevation of Privilege |
|-----------------------|-------------|--------------|----------------|---------------------|---------|---------------------------|
| | | | | | | |

For every non-empty cell: risk identified + severity (H/M/L) + proposed control.

If flows involving **privacy** are detected (PII, GDPR): also apply **LINDDUN** (Linkability,
Identifiability, Non-repudiation, Detectability, Disclosure, Unawareness, Non-compliance) to
personal-data flows.

### Phase 3 — Security controls by layer

| Layer | Threats addressed | Controls chosen |
|--------|------------------|------------------|
| Network | DDoS, Man-in-the-Middle, scanning | WAF, rate limiting, internal mTLS, VPC segmentation |
| Application | Injection, XSS, CSRF, broken auth | Input validation, strict CSP, strict CORS, PKCE |
| Data | Unauthorized access, leak, tampering | Encryption at-rest (AES-256-GCM), at-transit (TLS 1.3), row-level isolation (see below) |
| Identity | Impersonation, credential stuffing | MFA, PKCE, token rotation, device trust |
| Logging | Non-repudiation, detection | Immutable audit logs, SIEM, alerting |

#### Row-level data isolation — table by table

As soon as the system is multi-tenant or multi-user (a user must only see their own data, or their
tenant's), isolation **never relies on application-level filtering alone** (a forgotten
`WHERE user_id = ?` in a query exposes everything): every table carrying scoped data has an
isolation mechanism explicitly enabled, at the lowest possible level — defense in depth, consistent
with the rest of this Phase 3.

Mechanism by stack:

| Stack | Mechanism | Example |
|---|---|---|
| Postgres / Supabase | Native RLS | `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY` per operation (SELECT/INSERT/UPDATE/DELETE) |
| Laravel / Eloquent | Global Scope | `protected static function booted() { static::addGlobalScope(new TenantScope); }` — applied on the Model, not reapplied per query |
| .NET / EF Core | Global Query Filter | `modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantId)` in `OnModelCreating` |

**Table-by-table discipline**: for every schema with user/tenant-scoped tables, produce an
exhaustive list of table → active isolation mechanism → status (`✅ active` / `⏭️ exempt — global
unscoped data, reason: …`). A table missing from this list isn't "probably covered" — it's a gap to
close before production, whether the table is new or old.

**Definition of "done"**: no table carrying an ownership column (`user_id`, `tenant_id`,
`organization_id`…) without an active isolation mechanism; every exemption is justified explicitly,
never implicit by omission.

### Phase 4 — Cryptographic strategy

| Use | Chosen algorithm | Rejected alternatives | Justification |
|-------|------------------|----------------------|---------------|
| Symmetric encryption | AES-256-GCM | AES-128-CBC | |
| Asymmetric encryption | RSA-4096 or ECDSA P-384 | RSA-2048 | |
| Hashing | SHA-256 / SHA-3 | MD5, SHA-1 | Deprecated (NIST deprecated) |
| Password hashing | Argon2id | bcrypt, PBKDF2 | |
| TLS profile | TLS 1.3 (TLS 1.2 min) | TLS 1.0/1.1 | |
| Key management | [KMS provider] | Hardcoded keys | |
| Token format | JWT (RS256 or ES256) / PASETO v4 | PASETO v2 sym | |

### Phase 5 — Applicable Zero-Trust patterns

Evaluate and select the patterns applicable to the design:
- **Never trust, always verify**: authenticate every service-to-service call (mTLS or signed JWT)
- **Least privilege**: granular RBAC/ABAC, limited OAuth scopes
- **Assume breach**: segmentation, lateral movement detection, honeytokens
- **Continuous validation**: step-up auth for sensitive actions, refresh token rotation
- **Micro-segmentation**: isolate workloads into distinct namespaces/VPCs

### Phase 6 — Security ADRs

One ADR per major security architecture decision. Format:

```
### ADR-SEC-001: [Title]
**Date**: YYYY-MM-DD
**Status**: Proposed / Accepted

**Context**: [Threat or constraint driving the decision]
**Decision**: [Control or pattern chosen]
**Consequences**: [Impact on implementation and performance]
**Rejected alternatives**: [Options considered and why they were rejected]
```

### Phase 7 — `appsec` delegation

> ⚠️ Only if invoked **standalone** — in orchestrated mode, `architecture-agent` manages the
> sequencing.

Invoke `appsec` to validate the proposed security patterns against existing code, if present.
⚠️ Fallback: note "appsec not run — re-run via /appsec once the code is implemented" in the report.

### Phase 8 — Conditional persistence

- **If invoked from `architecture-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p architecture/security-architect` via Bash
  2. Write `architecture/security-architect/YYYY-MM-DD_security-architect.md`

### Phase 9 — Memory

> ⚠️ Skip if invoked from `architecture-agent`.

Update `.claude/architecture-knowledge.md`:
- Critical STRIDE threats identified (H/H only)
- Chosen cryptographic stack (one line per use)
- Enabled zero-trust patterns
- Major security ADRs
- Per-table data isolation status (RLS/scopes) — exempt tables and their justification
