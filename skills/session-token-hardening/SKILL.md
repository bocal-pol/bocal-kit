---
name: session-token-hardening
description: "Hardening of session cookies and JWT/API tokens — cookie flags (HttpOnly, Secure, SameSite, __Host- prefix), session ID regeneration, CHIPS partitioning, server-side JWT algorithm allowlist, protection against RS256/HS256 algorithm confusion and the alg:none attack. Prescriptive remediation with code examples per stack (Laravel Sanctum, Express/jsonwebtoken, .NET Microsoft.IdentityModel.Tokens). Auto-invoke on: session cookie, HttpOnly, Secure, SameSite, __Host-, cookie theft, session hijacking, JWT, alg none, algorithm confusion, algorithm allowlist, token rotation, session regeneration."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: security
dependencies: []
conflicts: []
---

# Session & Token Hardening

Hardens session cookie handling and JWT/API tokens against cookie theft and signature forgery. Prescriptive remediation with corrected code examples, not detection alone.

## Optional input (if invoked from `security-agent`)

If context is supplied (Phase 3 Auth/Session findings, identified backend stack):
- Start directly at Phase 2 with this data
- Skip Phase 1

Otherwise: run the full workflow starting at Phase 1.

## Workflow

### Phase 1 — Surface mapping

Glob to identify the surface:
- Session config: `**/session*`, `**/*.config.*` (cookie, Sanctum config, `appsettings*.json`)
- JWT config: `**/jwt*`, `**/*Jwt*`, auth middlewares
- Login/logout handlers: `**/auth/**`, `**/login*`, `**/logout*`

### Phase 2 — Session cookies (remediation, not detection alone)

For every application session cookie (not third-party analytics/marketing cookies, out of scope), verify and fix:

| Attribute | Requirement | Why |
|---|---|---|
| `HttpOnly` | always set on a session cookie | prevents the cookie from being read by JS — blocks theft via XSS |
| `Secure` | always set (except explicit local HTTP dev) | prevents transmission in clear text over an unencrypted connection |
| `SameSite` | `Strict` by default; `Lax` only if a legitimate cross-site flow requires it (e.g. SSO redirect); never `None` without `Secure` | limits sending the cookie on a cross-site request (CSRF, theft via a third-party link) |
| `__Host-` prefix | cookie name prefixed `__Host-` for every session cookie | the browser then refuses the cookie unless it has `Secure`, `Path=/` and no `Domain` — makes a misconfiguration impossible to deploy by mistake, not just detectable |
| ID regeneration | a new session identifier is generated after login, after a password change, and after any privilege elevation | prevents session fixation (an attacker who pushed a session ID to the victim before their login cannot reuse it afterwards) |
| CHIPS partitioning | `Partitioned` on any cookie served from a cross-site context (third-party iframe, embedded widget) | prevents a third-party cookie from being readable across different top-level sites — relevant only if the project embeds cross-site content, otherwise not applicable |

**Remediation per stack**:

- **Laravel Sanctum / session** (`config/session.php`):
  ```php
  'secure' => env('SESSION_SECURE_COOKIE', true), // never false in production
  'http_only' => true,
  'same_site' => 'strict', // 'lax' only if cross-site SSO is required
  'cookie' => '__Host-' . env('SESSION_COOKIE', 'laravel_session'),
  'path' => '/', // mandatory with __Host-
  // domain must stay null/unset with __Host-
  ```
  Regeneration after login: `$request->session()->regenerate();` in the login handler (before writing session data) — missing this call is a High finding.

- **Express / `express-session`**:
  ```js
  app.set('trust proxy', 1); // required behind a reverse proxy for Secure to work
  app.use(session({
    name: '__Host-session',
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      // no domain with __Host-
    },
  }));
  ```
  Regeneration after login: `req.session.regenerate(err => { /* then req.session.user = ... */ })` — a login that reuses the existing `req.session` without `regenerate` is a High finding (session fixation).

- **.NET / `CookieAuthenticationOptions`**:
  ```csharp
  options.Cookie.Name = "__Host-session";
  options.Cookie.HttpOnly = true;
  options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
  options.Cookie.SameSite = SameSiteMode.Strict;
  // Cookie.Path stays "/" by default; never set Cookie.Domain with __Host-
  ```
  Regeneration: call `HttpContext.SignOutAsync` then `SignInAsync` with a new principal after a privilege change, never a plain claims replacement on the existing ticket.

Supplementary detection grep: `httpOnly\s*:\s*false|secure\s*:\s*false|sameSite\s*:\s*['"]?[Nn]one['"]?` without an adjacent `Secure` within 3 lines; total absence of `__Host-` in the configured cookie name; absence of `regenerate|SignInAsync|session()->regenerate` in the login handler.

Severity: **High** for any missing attribute on a session cookie (HttpOnly, Secure, SameSite, regeneration); **Critical** if the cookie carries an admin role/privilege or protects an account with bulk access to personal data.

### Phase 3 — JWT: algorithm allowlist and strict rejection

The risk is almost never a hardcoded `alg: none` — it is the **absence of a server-side fixed algorithm allowlist**, which lets the library read the `alg` from the received token's header (attacker-controlled).

**Single remediation rule, per stack**:

- **Node `jsonwebtoken`**:
  ```js
  // WRONG — alg read from the token
  jwt.verify(token, secret);

  // CORRECT — algorithm fixed server-side, never derived from the token
  jwt.verify(token, secret, { algorithms: ['HS256'] });
  ```
  Never mix `HS256` and `RS256` in the same allowlist: if the API accepts both, an attacker holding the RS256 public key can sign an HS256 token using that public key as the HMAC secret, and the server will validate it if the code resolves the verification key after reading `alg` rather than before.

- **PHP `firebase/php-jwt`**:
  ```php
  // CORRECT — a single algorithm, consistent with the key type in use
  JWT::decode($token, new Key($publicKey, 'RS256'));
  ```
  Never `new Key($secretOrPublicKey, ['HS256', 'RS256'])` — one algorithm per key.

- **.NET `Microsoft.IdentityModel.Tokens`**:
  ```csharp
  var validationParameters = new TokenValidationParameters {
      ValidAlgorithms = new[] { "RS256" }, // never omitted
      RequireSignedTokens = true,           // never false
      ValidateIssuerSigningKey = true,
      IssuerSigningKey = fixedPublicKey,     // resolved from config, never from the token
  };
  ```

**`kid`/`jku` are not trustworthy without validation**: if the token carries a `kid` (key ID) or `jku` (JWK Set URL) header used to dynamically resolve the verification key, and that resolution is not bound to a fixed, server-side list of known keys, an attacker can point `jku` at a JWK Set they control, or forge a `kid` that resolves to a path/file they control (e.g. path traversal `kid: "../../../../dev/null"` on some historically vulnerable implementations). Grep: any `getKey`/`resolveSigningKey` function that makes an outbound HTTP request (`fetch(jku)`, `axios.get(header.jku)`) or a file read based on a value from the token header, without an allowlist of known `kid`/`jku` values. **Critical** finding.

General targeted grep:
- `jwt\.verify\(` without an explicit second `algorithms` argument, or with `'none'` in the list → **Critical**
- `JWT::decode\(` with several algorithm families mixed → **Critical**
- `TokenValidationParameters` without `ValidAlgorithms` or with `RequireSignedTokens = false` → **Critical**
- `kid`/`jku` read from the token and then used for a network request or file access without an allowlist → **Critical**

### Phase 4 — Dynamic tests (if authorization confirmed, see `security-agent` Phase 1)

- **Cookie**: real login, inspect the session cookie's attributes (`Set-Cookie` in the HTTP response) — confirm `HttpOnly`, `Secure`, `SameSite`, `__Host-` prefix are present. Logout then replay the captured cookie on a protected route → must return 401/login redirect, never silent access.
- **JWT `alg:none`**: capture a valid token, change the base64 header to `{"alg":"none","typ":"JWT"}`, remove the signature, replay on a protected endpoint → must be rejected (401).
- **JWT RS256/HS256 confusion** (if the API uses RS256): sign a token with the known RS256 public key as the HMAC secret (`HS256`), replay → must be rejected (401). A success on either of these two tests is a **Critical** finding (A02:2021 + A07:2021) with a full PoC (forged token, request, server response).
- **Session fixation**: note the session ID before login, log in, verify the ID changed after authentication (direct comparison of both cookie values) — an unchanged ID is a High finding.

### Phase 5 — Report

Generate `session-token-findings.md` with, for each finding: OWASP (A02:2021 Cryptographic Failures, A07:2021 Identification and Authentication Failures), severity, file:line, evidence (config/code excerpt), remediation with a corrected code example taken from Phase 2/3 above.

- If invoked from `security-agent`: do not write a separate file — findings feed the consolidated report of `security-agent`'s final phase.
- If invoked standalone:
  1. Create the folder via Bash: `mkdir -p security/session-token-hardening`
  2. Write via Write to `security/session-token-hardening/YYYY-MM-DD_session-token-hardening.md`
  3. Register each finding as priority 0 in `BACKLOG.md` (`SEC-nn` lines), in the same format as the rest of the security audit.

**Mandatory evidence**: no Critical/High finding without a directly replayed command or test (grep plus dynamic confirmation where possible). Without evidence → "unconfirmed".

### Phase 6 — Memorization

> ⏭️ Skip this phase if invoked from `security-agent` (memorization delegated to the memory ritual phase).

If invoked directly: append the detected patterns to `.claude/security-knowledge.md` under `## Session/Token Hardening — YYYY-MM-DD`.
