---
name: security-audit
description: "Plan and run a complete security audit via Opus (OWASP Top 10 reconnaissance, dependencies, config, dynamic tests) then appsec and pentest. Triggers: security audit, security audit, OWASP analysis, security planning."
model: claude-opus-5
user-invocable: true
type: orchestrator
priority: high
scope: security
dependencies: []
conflicts: []
---

# Security Audit — Planning and orchestration (Opus)

Plans the current project's complete security audit, then orchestrates execution via the `appsec`
and `pentest` skills.

## Coverage and gating discipline (source: `bocal-pol/security-audit-skill`, a Cloudflare fork)

Principles adapted from this methodology, without reusing its strict OS sandbox framework (file
descriptors, anti-TOCTOU promotion) designed for an isolated hostile environment — here the audit
runs under local trust supervised by the user.

- **Deterministic coverage ledger**: before looking for flaws, establish the list of coverage units
  (surface × boundary × attack class — e.g. "public API × authorization × IDOR", "SSO callback ×
  CSRF"). Log a status for each unit: `planned` → `covered` / `candidate` / `blocked`. Never declare
  coverage complete while planned units remain without a verdict — an incomplete pass is reported as
  such (`incomplete run`), never as a clean audit.
- **Candidate → confirmed → to-validate gating**: a vector spotted by grep (Phase 3) is a
  **candidate**, not a finding. It becomes **confirmed** only after dynamic proof (Phase 6) or a
  complete source trace demonstrating the missing control. If it depends on a fact outside the repo
  (deployment behavior, proxy config, external IdP policy) that can't be verified locally, it
  becomes **to validate** — never given a severity, never presented as confirmed out of caution.
- **Separate priority from certainty**: severity can never exceed demonstrated impact. A
  `to-validate` candidate has no severity until it's resolved.
- **Stable fingerprint by root cause**: several entry paths sharing the same root cause (e.g. the
  same missing sanitizer exploited by 3 endpoints) are a single finding with its most complete
  trace, not three duplicate findings.
- **Anti-patterns to explicitly reject** (report "not confirmed" rather than letting them through):
  - a deviation from a generic checklist presented as a vulnerability with no trust boundary
    actually crossed;
  - defense-in-depth advice with no reachable boundary violation;
  - guessing a vendor/proxy/browser/identity behavior not present in the source code;
  - treating a self-inflicted action or an intentional authority of the same principal as a
    boundary crossing;
  - reporting a stronger effect than what was actually observed (e.g. presenting a parser crash as
    code execution with no proof);
  - writing the report before independent verification, or letting the prose and the evidence
    contradict each other.

## Workflow

### Phase 1 — Plan mode and context

Call `EnterPlanMode`. All subsequent phases are read-only. Via `AskUserQuestion`, gather in a single
question:
- Target URL(s) if the application is deployed
- Technical stack if not obvious
- Excluded scope (third-party services, external SSO, etc.)
- Cloud scope involved? (AWS / Azure / GCP / none)
- Regulatory constraints? (GDPR / ISO 27001 / NIS2 / none)
- Project structure: monorepo, microservices, or a single application?
  - If monorepo → ask which services are in scope
  - Adjust the Phase 2 Glob accordingly: `services/auth/**/*`, `services/api/**/*`, etc.
- **Explicit confirmation**: "Do you confirm you have written authorization to test this target?"

> ⛔ If authorization isn't confirmed, stop immediately and don't proceed to the dynamic phases (6).

### Phase 2 — Discovery

**Pass 1 — Structure mapping**: Glob `**/*` limited to 2 levels of depth to identify significant
directories. Exclude: `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `coverage/`.

**Pass 2 — Targeted sensitive files**: Glob on specific patterns:
- Configs: `**/.env*`, `**/config.*`, `**/appsettings*.json`, `**/secrets.*`
- Credentials: `**/*.key`, `**/*.pem`, `**/*.pfx`, `**/*.p12`
- Entry points: `**/routes.*`, `**/controllers/**`, `**/handlers/**`

### Phase 2b — "Declared control vs. implemented control" matrix (mandatory)

> Audit lesson from an earlier engagement: a project had 22 complete ADRs and a complete STRIDE
> model; CSP, timeouts, an SSO `state`, the `can_access` contract, and a Vault "with no silent
> fallback" existed **only in the documentation**. An ADR with no proof is a hypothesis, not a
> protection.

1. Collect the **declared** controls: Glob `**/docs/adr/*.md`, `**/ARCHITECTURE.md`,
   `**/SECURITY.md`, `**/CONTEXT.md`, "Security" / "STRIDE" / "Definition of Done" sections,
   integration contracts (`**/docs/contracts/*`, `shared/**/README.md`).
2. For **every** named control (header, timeout, throttle, sanitizer, `state` check, revocation,
   encryption, purge, Vault secret…), produce a row:

| Declared control | Source (ADR/§) | Implementation found (file:line) or **ABSENT** | Dynamic proof (Phase 6) | Verdict Compliant / Partial / Absent |

3. A control declared and absent = **at least Medium** finding (false assurance), High if it's an
   access, session, or secret barrier.
4. Look for **dead security code**: sanitization/validation/verification methods defined but never
   called (`grep -rn "function sanitize\|function verify\|function assert"` then grep their call
   sites). A security method with no caller = a finding.
5. The matrix is carried over as-is into the final report (Phase 11) and feeds Phase 6.

### Phase 2c — "SSO/IdP consumer" checklist (if the app delegates authentication)

Mandatory as soon as a central authentication service (Auth, Keycloak, Azure AD, Passport…) is
consumed. Read the **full contract** on the issuer side (`verify`/`userinfo` controller, access
resolver, application seeder) **and** on the consumer side (provisioner, callbacks), then check line
by line:

| # | Checkpoint | Where to look | Typical flaw |
|---|---|---|---|
| S1 | **The entire** access block returned by the IdP is applied: `can_access`, `status`
(suspended/pending), not just `role` | provisioner / callback | a suspended or profile-less user
keeps access |
| S2 | The access decision precedes local **provisioning** (no `upsert` before a refusal) | callback
| ghost accounts, workspaces created for refused users |
| S3 | Anti-CSRF `state`/`nonce` generated **server-side**, stored in session, verified **before**
`Auth::login`; never "best-effort" on the SPA side | login route + callback | login-CSRF, fixation
via forced login |
| S4 | Single-use exchange code + short TTL; `return`/`redirect_uri` restricted to an allowlist of
**origins**, path enforced | callback | replay, open redirect |
| S5 | Explicit timeouts (connect ≤ 3s, total ≤ 10s) on `exchange`/`verify`, circuit breaker, no
application-level retry | IdP HTTP client | self-inflicted DoS |
| S6 | **Central** revocation: back-channel logout receiver (HMAC + anti-replay) or periodic
re-verification; local logout calls the IdP logout; no `remember: true` on privileged accounts |
logout, middleware | zombie session after IdP revocation |
| S7 | The locally-copied application role is **re-resolved** (TTL or on every admin access), never
frozen for the cookie's lifetime | admin/panel middleware | a revoked role stays active |
| S8 | GDPR erasure compatible with re-login: `auth_user_id`/`sub` neutralized or a partial index;
test erase → relogin | erasure service + index | permanent 500 after `DELETE /me` |
| S9 | Authorization attributes (`is_super_admin`, `app_role`, `roles`) are **outside**
`$fillable` / mass-assignment; written only by the provisioner via `forceFill` | User model |
escalation via a future `update($validated)` |
| S10 | Automated local-revocation test (replayed cookie → 401) **and** IdP-refusal test (missing /
suspended profile → 401/403) | Feature / e2e tests | silent regression |

Every failing row becomes a finding with its evidence (Phase 6: D-SSO-1 missing profile, D-SSO-2
suspended profile, D-SSO-3 callback with no `state`, D-SSO-4 IdP logout then local API call, D-SSO-5
erase then relogin).

### Phase 3 — OWASP Top 10 static analysis

All Greps exclude: `node_modules/`, `vendor/`, `*.test.*`, `*.spec.*`, `dist/`, `build/`

Every row in the table below identifies a **candidate**, not a finding — its status only becomes
`confirmed` after dynamic proof (Phase 6) or a complete source trace demonstrating the expected
control is absent. Log candidates in the coverage ledger (see the methodology section above) before
moving to Phase 6.

| Vector | Targeted patterns | Target files |
|---------|----------------|-----------------|
| Incomplete IdP contract | `can_access`, `status`, `app_access`, `panel_access` → check they are
**read** (not just commented) | SSO provisioner, callbacks |
| Dead sanitizer | `function sanitize\w*` then grep its call sites; `Sanitizer::` with no call site |
services, FormRequests, controllers |
| Unbounded `array` validation (Laravel) | `'array'` / `'sometimes\|array'` **with no** associated
`field.*` rule; `array_merge(.*settings\|preferences`; `setTranslations\(` | controllers,
FormRequests |
| Authorization mass-assignment | `\$fillable` containing `is_super_admin\|is_admin\|app_role\|roles\|permissions`
| models |
| Secrets in plaintext outside `.env` | `TOKEN:\s*'[^$]`, `PASSWORD:\s*'[^$]`,
`TLS_SKIP_VERIFY:\s*'true'`, `dev-root-token` | `compose*.y*ml`, `docker-compose*`, `Dockerfile`,
`*.tfvars`, CI yaml |
| Silent secrets fallback | `fallback .env`, `keeping .env`, `catch (Throwable` around a Vault/KMS
client | secrets providers |
| SQL injection | `\.query\(.*\+`, `\.execute\(.*\+`, `\.raw\(`, `INTERVAL '\{\$` (interpolation in
`whereRaw`) | Backend only (`src/`, `api/`, `server/`, `app/`) |
| XSS | `innerHTML\s*=`, `dangerouslySetInnerHTML`, `document\.write\(`, `eval\(` | Frontend +
templates |
| Hardcoded secrets | `password\s*=\s*["']`, `api_key\s*=\s*["']`, `secret\s*=\s*["']` | All except
`.env.example` |
| Auth/Session | `verify\s*:\s*false`, `httpOnly\s*:\s*false`, `secure\s*:\s*false` | Auth config,
middlewares |
| JWT `alg:none` / algorithm confusion | `jwt\.verify\(` with no explicit 2nd `algorithms:`
argument; `JWT::decode\(` with no 3rd single-algorithm argument; `TokenValidationParameters` with no
`ValidAlgorithms` | JWT verification, auth middlewares — see `iam-engineer` Phase 2 for
per-library detail |
| IDOR | `/:[a-z]*id\b` with no adjacent auth middleware | Route files |
| SSRF | `fetch\(req\.`, `axios\.get\(req\.`, `http\.get\(.*req\.` | Backend only |
| Upload | missing `mimetype`, `extension` in upload handlers | Upload handlers |
| Prototype pollution (Node/JS) | `_.merge\(\|_.defaultsDeep\(\|_.extend\(` or
`Object.assign\(\|\.\.\.` on `req.body\|req.query\|req.params` **before** schema validation; a
homemade merge function with no `__proto__\|constructor\|prototype` key filter | Backend Node — see
`appsec` Phase 1 for detail |
| XXE | PHP `simplexml_load_\|new DOMDocument` with no `LIBXML_NONET` or with `LIBXML_NOENT`; .NET
`XmlDocument\|XmlReader.Create\(` with no `DtdProcessing.Prohibit`+`XmlResolver = null`; Java
`DocumentBuilderFactory` with no `disallow-doctype-decl`; Node XML parsers with external entities
enabled | Any XML parsing coming from a request — see `appsec` Phase 1 for per-stack detail |
| Weak crypto | `md5\(`, `sha1\(`, `createCipher\b`, `DES\|RC4` | All |
| MAC vulnerable to length extension | `hash\(.*secret.*\.\|md5\(.*\$secret\s*\.\|createHash\(.*\)\.update\(.*secret`
(secret+message concatenation) **with no** `hash_hmac\|createHmac\|hmac\.new` present elsewhere for
the same check | Homemade token signing/verification functions — see `appsec` Phase 1 for detail |
| ReDoS | regex on user input (`\.test\(\|\.match\(\|preg_match\(\|Regex\.`) with a nested
quantified group (`(a+)+\|(a*)*\|([a-zA-Z]+)*`) or overlapping alternation — often a homemade
email/URL validator | Backend/frontend — see `appsec` Phase 1 for detail |
| Origin spoofing (HTTP header) | access control/rate-limit based on
`X-Forwarded-For\|X-Real-IP\|Host` with no rewrite by a trusted proxy; unrestricted Express `trust
proxy`; .NET `ForwardedHeadersOptions` with no `KnownProxies` | Debug/admin/metrics routes, network
trust middlewares — see `appsec` Phase 1 for detail |
| Sensitive logging | `console\.log\(.*pass`, `console\.log\(.*token`, `logger\.\w+\(.*secret` | All
|

### Phase 4 — Manifest inventory

Identify and list only the manifests present — the actual dependency audit is delegated to the
`pentest` skill:

| Manifest found | Tool to be used |
|-----------------|----------------------|
| `package.json` | `npm audit` |
| `composer.json` | `composer audit` |
| `requirements.txt` / `Pipfile.lock` | `pip-audit` |
| `pom.xml` / `build.gradle` | OWASP Dependency-Check |

Pass the list of detected manifests to the `pentest` skill via context.

### Phase 5 — Configuration, headers, infrastructure secrets

- Analyze: `nginx.conf`, `.htaccess`, `web.config`, `Dockerfile`, **every infra's
  `compose*.yaml` / `docker-compose*.yml`**, `.github/workflows/*`.
- Check: wildcard CORS `*` **and dev fallbacks in prod**
  (`env('CORS_ALLOWED_ORIGINS', 'http://localhost…')`), missing CSP, X-Frame-Options, HSTS,
  Referrer-Policy.
- **If no reverse proxy serves the application** (grep for the port / service name in `nginx/`,
  `Caddyfile`, `traefik`): headers must come from an application middleware — check its existence
  (`grep -rn "X-Frame-Options\|Content-Security-Policy" app/ src/`). Absence = High finding.
- Detect: committed `.env` files, active debug modes (`DEBUG=true`, `NODE_ENV=development`), **a dev
  image shipped as the runtime** (`CMD ["npm","run","dev"]`, `vite --host`), `npm ci || npm install`,
  missing `.dockerignore`, missing versioned lockfile (`composer.lock`, `package-lock.json`).
- Infra secrets: root tokens, `TLS_SKIP_VERIFY`, literal passwords in compose files (the "a password
  in `.env` is a flaw" rule extended to versioned compose files). Check that the **expected secrets
  actually exist** in the secrets manager (e.g. `vault kv list secret/<project>/`) and that a
  missing secret **fails to start** outside `local` (no silent fallback).
- Support services declared essential (queue worker, scheduler, cache): check they're **running**
  (`docker compose ps` healthy) — a worker stuck in a restart loop makes GDPR purges and
  notifications inert.
- **Cache poisoning / deception** (if a reverse proxy/CDN/application cache is present): check that
  the cache key (nginx `proxy_cache_key`, `Vary` rule) includes every header the backend reads to
  build the response (`X-Forwarded-Host`, `X-Forwarded-Scheme`) — otherwise a request with a forged
  header can poison the response served to every visitor afterward. Also check that no
  extension-based cache rule (`location ~* \.(js|css|json)$`) applies to a protected route prefix
  (`/account/`, `/api/`, `/admin/`) without `Cache-Control: private, no-store` forced on the
  application side.

### Phase 6 — Dynamic tests (if authorization confirmed)

If no deployed URL is provided but a local stack exists (compose), **start the stack** and test
`localhost` with `curl` (not just WebFetch: raw headers, setting cookies, and replaying need to be
seen). Create dedicated test accounts per role (member, moderator, admin, **no profile**,
**suspended**).

Every scenario that confirms a Phase 3 candidate moves its status to `confirmed` in the ledger, with
severity calibrated to the **actually observed** impact (never beyond it): a candidate whose dynamic
test fails to reproduce the impact drops in severity or goes back to `to validate` if a fact outside
the repo (proxy/external IdP behavior not observable here) blocks the conclusion — it never stays at
the grep's default initial severity level.

**Mandatory** scenarios (each row = a command + an expected HTTP code in the report):

| # | Scenario | Expected |
|---|---|---|
| D-HDR | `curl -sI` on API, admin, SPA | CSP, XFO, nosniff, Referrer-Policy present |
| D-SSO-1 | login with an IdP account that has **no profile** for the app | refused (401/403 + a
3-field message) |
| D-SSO-2 | login with a **suspended** IdP account (admin role) → `/admin` | refused |
| D-SSO-3 | callback with a valid code and **no `state`** | no session |
| D-SSO-4 | **IdP** logout then a local API call with the cookie | 401 |
| D-SSO-5 | `DELETE /me` (GDPR) then IdP re-login | clean reconnection, no 500 |
| D-REV | local logout then replay of the captured cookie | 401 |
| D-JWT | if JWT is used: a forged `{"alg":"none"}` token with an empty signature from a captured
payload; if RS256 is in place, a second token signed with HS256 using the RS256 public key as the
secret | 401 on both — a success is CRITICAL (A02+A07) |
| D-PROTO | if backend is Node: JSON body `{"__proto__":{"polluted":true}}` on every endpoint
accepting an arbitrary body, then an unrelated neutral request (`/health`) to check for cross
contamination | no trace of `polluted` elsewhere — a success is CRITICAL (A03+A08), PoC = both
requests |
| D-HASHEXT | if a homemade MAC is detected (Phase 3): capture a legitimate `(message, signature)`
pair, run `hashpump -s <signature> -d <message> -a <data> -k <secret_length>` (try 16/32/64), replay
the forged message + forged signature | rejected (invalid signature) — a success (server processes
the extended message) is CRITICAL (A02+A08), PoC = hashpump command + forged message/signature +
server response. Skip if HMAC is confirmed (immune by construction) |
| D-IPSPOOF | if an IP/host control is detected (Phase 3): `curl -H "X-Forwarded-For: 127.0.0.1"`
(then `X-Real-IP`, `Host: localhost`, a doubled header `<attacker_ip>, 127.0.0.1`) from outside
toward the restricted route | unchanged refusal — a success (access granted or rate-limit bypassed)
is CRITICAL (A01+A05), PoC = curl command + response |
| D-REDOS | if a candidate regex is detected (Phase 3): an increasing backtracking payload (15→35
valid characters + 1 invalid, adapted to the pattern), measure response time at each size — **start
small, increase gradually, never a maximal payload right away** | stable response time — exponential
growth with size is CRITICAL if the process is single-threaded/shared or a public unauthenticated
endpoint, High otherwise; PoC = payload + measured times per size |
| D-XXE | if an XML endpoint exists (upload/webhook/SOAP/SAML/import): external entity
`file:///etc/passwd` (or `C:/Windows/win.ini` on IIS); if cloud is detected, an entity targeting
`169.254.169.254` (IAM metadata) | file/metadata absent from the response and logs — a success is
CRITICAL (A05+A10), PoC = XML payload + exfiltrated content |
| D-CACHE | if a reverse proxy/CDN is present: a request with `X-Forwarded-Host: evil-poc.test` on a
cached URL, then replayed by a clean client with no injected header; separately, an authenticated URL
with a fake static extension (`/account/profile.json`) replayed with no cookie | the `evil-poc.test`
marker never appears for the second client; private content is never served without auth — a success
is CRITICAL (A05, +A01 for the deception), mass impact |
| D-IDOR | per role: GET/PATCH/DELETE on a resource outside that scope (a real uuid) | opaque 404,
identical to a non-existent uuid |
| D-ESC | low-privilege role → every higher-role action | 403 |
| D-ENUM | invalid tokens/invitations (nonexistent, expired, revoked, exhausted) |
**byte-identical** responses + 429 past the quota |
| D-XSS | `<script>`, `<img onerror>`, `[l](javascript:)`, `<svg onload>`, `data:`, double encoding,
control characters payloads, on **every** free-text field (including patterns/comments/reasons) |
stored and neutralized |
| D-JSON | JSON payload with unknown keys and 50 KB values on every `array`/jsonb field | 422 |
| D-CSRF | POST with no CSRF token but a valid cookie | 419 |
| D-CORS | `Origin: http://evil.tld` (simple + preflight) | no `Access-Control-Allow-Origin` |
| D-RATE | exceed every declared limit (read, write, public) | 429 + a 3-field message |
| D-ANON | if anonymity/pseudonymity applies: read by every role (detail, list, history,
notifications, GDPR export, database) | no author identifier |

Via WebFetch/curl on each target URL, additionally:
- Access to sensitive resources: `/.env`, `/admin`, `/api/docs`, `/swagger`, `/actuator`,
  `/.git/config`
- Security flags on cookies (`Secure`, `HttpOnly`, `SameSite`)
- Error messages (information disclosure, exposed stack traces)

### Phase 6d — Test suite and CI health

- Run the existing suites (`php artisan test`, `npx vitest run`, Playwright if accounts are
  provided). A **red** suite or a test file with a syntax error is a finding (the protections it
  tests are no longer verified).
- Check that a CI workflow **covers this project** (paths/matrices): test, lint, `composer audit`,
  `npm audit`, SAST. A submodule outside CI = Medium finding.
- Check for the presence of tests required by the ADRs (per-vector XSS suite, headers, CSRF,
  throttle, revocation, IdP refusal).

### Phase 7 — Exit plan mode

Call `ExitPlanMode`. Present the structured findings plan (identified vectors, attack surfaces,
priorities), then proceed directly to execution.

### Phase 8 — AppSec execution

Invoke the `appsec` skill with:
- **Expected input**: the Phase 3 findings list, suspect file paths
- **Expected output**: a static review report classified by OWASP Top 10:2021 + threat model

> ⚠️ If `appsec` is unavailable: document the raw Phase 3 findings in a
> `## Static analysis (not deepened)` section of the final report and continue.

### Phase 9 — Pentest execution

Invoke the `pentest` skill with:
- **Expected input**: the manifest list (Phase 4), target URL(s), collected headers (Phase 6)
- **Expected output**: a consolidated `security-audit-report-YYYY-MM-DD.md` report

> ⚠️ If `pentest` is unavailable: generate the report directly from phases 3-5-6 with a
> `## Dependencies (audit not run — re-run manually)` section.

### Phase 9b — Cloud Security (if cloud scope confirmed in Phase 1)

Invoke the `cloud-security` skill with:
- **Expected input**: Phase 5 config findings (`.env`, `Dockerfile`, detected cloud configs), Phase
  6 headers
- **Expected output**: a `cloud-security-findings.md` report with IAM, network, secrets findings

> ⚠️ If `cloud-security` is unavailable or cloud scope = "none": note "cloud-security not run" in
> the final report.

### Phase 9c — IAM Review (if Auth/Session findings detected in Phase 3)

Invoke the `iam-engineer` skill with:
- **Expected input**: Phase 3 Auth/Session findings (`verify: false`, `httpOnly: false`, IDOR
  patterns), identified suspect files
- **Expected output**: an `iam-findings.md` report with JWT, OAuth, RBAC, Session findings

> ⚠️ If `iam-engineer` is unavailable or no Auth/Session finding exists: note "iam-engineer not run"
> in the final report.

### Phase 9d — Compliance (if regulatory constraints confirmed in Phase 1)

Invoke the `compliance-officer` skill with:
- **Expected input**: analyzed surface (modules, services, data types processed), critical findings
  from phases 3-5
- **Expected output**: a `compliance-gaps-YYYY-MM-DD.md` report with a gap matrix and roadmap

> ⚠️ If `compliance-officer` is unavailable or constraints = "none": note "compliance-officer not
> run" in the final report.

### Phase 9f — AI/Agent Security (if an LLM/agent surface is detected in Phase 2)

**Condition**: an LLM SDK (Claude/OpenAI/other), an MCP server or client, agent or sub-agent
configuration, a RAG pipeline detected in Phase 2.

Invoke the `ai-agent-security` skill with:
- **Expected input**: the LLM/agent surface identified in Phase 2, Phase 3 Auth/Session findings (to
  avoid double coverage with `iam-engineer`)
- **Expected output**: `ai-agent-security-findings-YYYY-MM-DD.md` — prompt injection, tool abuse,
  MCP/sub-agent trust, findings classified confirmed/to-validate

> ⚠️ If `ai-agent-security` is unavailable or no LLM/agent surface is detected: note
> "ai-agent-security not run" in the final report.

### Phase 9e — Vulnerability Management

Invoke the `vulnerability-management` skill with:
- **Expected input**: the full set of appsec (Phase 8) + pentest (Phase 9) + cloud-security (Phase
  9b) + iam-engineer (Phase 9c) + ai-agent-security (Phase 9f) findings
- **Expected output**: a `vuln-roadmap-YYYY-MM-DD.md` report with CVSS 3.1 scoring and a
  per-sprint remediation roadmap

> ⚠️ If `vulnerability-management` is unavailable: note "vulnerability-management not run" in the
> final report.

### Phase 9f — Priority-0 backlog (mandatory)

Every finding **must** be entered into the audited project's backlog, at the top, before any other
entry:

- If the project has a `BACKLOG.md`: add the `SEC-nn` rows **above** the first row of the "Overview"
  table and a `## SEC — Security (priority 0)` section **before** the first functional section, in
  the file's own format (`Why / What / Tasks / Done when` + a `CHECK` command). Priority `High
  (priority 0)`; a SEC item is only checked off with its green command.
- If the backlog lives in Notion / a tracker: create a "Security — priority 0" sprint at the top.
- Findings whose remediation belongs to **another** repository (IdP, shared infra, a shared library)
  get one line in that repository's backlog **and** are referenced in the current project's (as a
  dependency).
- The final report (Phase 11) references the backlog section; the backlog references the report.

### Phase 10 — Memory consolidation

Invoke the `memory-ritual` skill with:
- **Expected input**: the list of identified CVEs/flaws, recurring patterns detected
- cloud-security findings: IAM misconfigurations, network exposures, detected secrets (Phase 9b)
- compliance-officer gaps: GDPR/ISO27001/NIS2 gaps and maturity level (Phase 9d)
- vulnerability-management roadmap: consolidated CVSS scoring, prioritized remediation sprints
  (Phase 9e)
- **Expected output**: an update to `.claude/security-knowledge.md`

> ⚠️ If `memory-ritual` is unavailable: manually append a `## Session YYYY-MM-DD` block to
> `.claude/security-knowledge.md` (create the file if absent).
