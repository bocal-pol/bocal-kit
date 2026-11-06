---
name: iam-engineer
description: "Design and audit of authentication and authorization systems — OAuth2, OIDC, RBAC, ABAC, JWT, SSO, permissions. Auto-invoke on mention of: IAM, authentication, authorization, RBAC, OAuth, JWT, SSO, permissions, access management, access control."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: infra
dependencies: []
conflicts: []
---

# IAM Engineer — Auth/Authz Audit (Sonnet)

Audits and designs authentication systems (OAuth2, OIDC, JWT, SSO) and authorization systems (RBAC,
ABAC, permissions), identifies access control flaws.

## Optional input (if invoked from security-audit)

Use if provided by `security-audit`:
- Auth/Session Phase 3 findings: `verify: false`, `httpOnly: false`, `secure: false`, IDOR patterns
- Identified suspicious files: auth middlewares, session handlers, protected routes

If no context: scan the current directory to locate authentication and authorization files
(`auth/`, `middleware/`, `guards/`, `policies/`, `permissions/`, `roles/`).

## Workflow

### Phase 1 — Auth/authz mapping

Glob to identify the surface:
- Middleware: `**/middleware/**`, `**/middlewares/**`, `**/guards/**`
- Auth: `**/auth/**`, `**/authentication/**`, `**/login*`, `**/oauth*`
- Permissions: `**/policies/**`, `**/permissions/**`, `**/roles/**`, `**/rbac*`, `**/acl*`
- Token config: `**/*.config.*`, `**/jwt*`, `**/session*`

### Phase 2 — JWT / token audit

Grep the identified files:

| Risk | Pattern | Severity |
|--------|---------|----------|
| `alg:none` accepted | `algorithms.*none`, `verify.*false` — **and especially the absence** of an explicit algorithm allowlist at verification time (see below) | CRITICAL |
| RS256↔HS256 algorithm confusion | a verification that uses the RS256 public key as an HMAC secret if the token header's `alg` isn't pinned independently of the received token | CRITICAL |
| Weak JWT secret | `secret.*=.*["'].*["']` (< 32 chars) | CRITICAL |
| JWT with no expiration | missing `expiresIn` or `exp` | HIGH |
| Non-rotating refresh token | reuse logic with no invalidation | HIGH |
| Token in localStorage | `localStorage.*token`, `localStorage.*jwt` | HIGH |
| Symmetric algorithm in a multi-party context | `HS256` with a shared key | MEDIUM |

**`alg:none` — why grep alone isn't enough**: the flaw almost never comes from a literal
`algorithms: ['none']` (easy to grep, rarely present) but from the **absence** of an algorithm
allowlist explicitly passed to the verification call. Most JWT libraries (`jsonwebtoken`,
`firebase/php-jwt`, `lcobucci/jwt`, `Microsoft.IdentityModel.Tokens`) read the `alg` from the
**token's own header** if the caller doesn't restrict verification to a closed list — an attacker who
changes the header to `{"alg":"none"}` and empties the signature then passes verification without
knowing any secret.

Targeted grep by library, in addition to the table above:
- Node `jsonwebtoken`: `jwt.verify(` **without** an explicit second `{ algorithms: [...] }` argument
  (or with a list containing `'none'`) → CRITICAL finding.
- PHP `firebase/php-jwt`: `JWT::decode(` with a missing 3rd argument or one containing multiple
  algorithm families (`['HS256', 'RS256']` mixed) → enables algorithm confusion, CRITICAL finding; a
  single explicit algorithm consistent with the key type is expected.
- .NET `Microsoft.IdentityModel.Tokens`: `TokenValidationParameters` with no `ValidAlgorithms` set, or
  `RequireSignedTokens = false` → CRITICAL finding.
- Any lib: if the verification key is resolved **after** reading the received token's `alg` rather
  than being fixed by the service's configuration, that's the exact symptom of RS256↔HS256
  confusion — grep the `getKey`/`resolveKey`/dynamic callback functions passed to verify.
- Remediation rule to systematically recommend: fix the expected algorithm **once** in the service's
  configuration (never inferred from the token), and pass it explicitly to every verification call —
  never trust the token's `alg` header to decide how to verify it.

### Phase 3 — OAuth2 / OIDC audit

Grep the identified auth/oauth files:

| Risk | Pattern to look for | Severity |
|--------|--------------------|----------|
| Missing CSRF state | `state` absent from redirect generation | HIGH |
| Unvalidated redirect_uri | `redirect_uri.*req\.`, no whitelist | CRITICAL |
| Missing PKCE (public flow) | missing `code_challenge`, `code_verifier` in SPA/mobile flows | HIGH |
| Overly broad scopes | `scope.*\*`, `scope.*admin`, `scope.*write` with no restriction | MEDIUM |
| No revocation | missing `revoke`, `introspect` endpoint | MEDIUM |

### Phase 4 — RBAC / ABAC / ACL audit

Grep to detect:
- Bypassable authorization checks: `if (user.role === 'admin' || true)`, disabled controls
- IDOR: endpoints with `/:id` with no check that `id` belongs to the current user
- Privilege escalation: a user able to modify their own role
- Client-side-only authorization: permission logic in the frontend with no backend validation
- Hardcoded permissions: roles defined in code with no configurable system

### Phase 5 — Session audit

Grep session configuration and middleware files:

| Risk | Pattern | Severity |
|--------|---------|----------|
| Cookie without HttpOnly | `httpOnly.*false`, missing `httpOnly: true` | HIGH |
| Cookie without Secure | `secure.*false`, missing `secure: true` | HIGH |
| SameSite missing/None | `sameSite.*None` without `Secure`, missing `sameSite` | HIGH |
| Expiration not set | missing `maxAge`, `expires`, `ttl` in session config | HIGH |
| No regeneration | missing `session.regenerate`, `req.session.regenerate` after login | HIGH |
| Session not revoked | no server-side destruction in the logout handler | HIGH |

### Phase 6 — iam-engineer report

Generate `iam-findings.md` with:
- Findings classified by category (JWT / OAuth / RBAC / Session)
- CRITICAL / HIGH / MEDIUM / LOW severity
- OWASP references: A01:2021 (Broken Access Control), A02:2021 (Cryptographic Failures), A07:2021
  (Identification and Authentication Failures)
- Prioritized remediation recommendations

- If invoked from `security-audit`: don't write a file — the consolidated report is produced by
  `pentest`.
- If invoked standalone:
  1. Create the folder via Bash: `mkdir -p security/iam-engineer`
  2. Write via Write to `security/iam-engineer/YYYY-MM-DD_iam-engineer.md` (actual date at
     execution time)

### Phase 7 — Memory

> ⏭️ Skip if invoked from `security-audit` (memory delegated to `memory-rituel` Phase 10).

If invoked directly: append the detected patterns to `.claude/security-knowledge.md` under
`## IAM Findings — YYYY-MM-DD`.
