---
name: threat-intelligence
description: "Security watch: detects OWASP Top 10 changes (a new version, a modified category) and new CVEs/security advisories affecting the technologies actually in use (the current project's stack, or a global ecosystem list). Auto-invoke on: security watch, CVE watch, new flaw, what's new in security, new OWASP version, security advisory. Referenced by web-search as a consumer of contextual research."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[project|ecosystem]"
type: utility
priority: medium
scope: security
dependencies:
  - web-search
  - version-checker
conflicts: []
---

# Threat Intelligence — OWASP & CVE Watch

Monitors two things that one-off audits (`appsec`, `pentest`, `security-agent`) don't cover, because
they analyze a frozen snapshot of the code at a given moment: **the OWASP reference, which
evolves** (a new Top 10 version, a redefined category) and **newly published vulnerabilities** on
technologies the code hasn't changed but which became dangerous between two audits. A project
audited "clean" in January can be vulnerable in March with not a single line of code having moved —
that's the gap this skill closes.

Doesn't do code analysis, doesn't assign a severity per code finding: that's `appsec`'s role.
Doesn't update dependencies: that's `dependency-updater`/`version-updater`'s role. This skill
**flags**, it doesn't fix.

## Optional input (if invoked from `team-dev`)

If the project's stack is already known (output from `version-checker` or `architecture-agent`),
receive it directly and skip Phase 1.

## Two modes

- **`project`** (default if run from a project directory): detects the real stack via
  `version-checker` and cross-references it with recent advisories. Exact scope, never noise outside
  it.
- **`ecosystem`** (default if run outside a project context, or explicitly requested): scans a fixed
  list of technologies used across the `claude-config` ecosystem (see Phase 1b), for an overview
  independent of any specific project.

## Workflow

### Phase 1 — Stack detection (`project` mode)

Invoke the `version-checker` skill on the current directory — reuse its Phase 1 manifest-detection
logic (`composer.json`, `package.json`, `*.csproj`, `pubspec.yaml`, etc.) rather than duplicating it.
Retrieve the list of detected stacks with their current version.

If no manifest is found: silently switch to `ecosystem` mode.

### Phase 1b — Reference list (`ecosystem` mode)

A fixed list, maintained as real projects are encountered — add a technology as soon as a project
uses it, never ahead of need:

```
Backend    : Laravel (PHP 8+), .NET 10+
Frontend   : Angular 21+, React 18+
Mobile     : Flutter, React Native
Infra      : Docker, Kubernetes, Nginx, Redis, RabbitMQ/Kafka
Auth       : Laravel Sanctum, generic OAuth2/OIDC, JWT (jsonwebtoken, firebase/php-jwt)
CI/CD      : GitHub Actions, GitLab CI
```

### Phase 2 — Last pass state

Read `security/watch/.last-check.json` in the current project (`project` mode) or
`~/.claude/memory/threat-intelligence/.last-check.json` (`ecosystem` mode):

```json
{
  "owasp_top10_last_seen_version": "2021",
  "stacks": {
    "laravel": { "last_check": "2026-09-01", "cves_seen": ["CVE-2026-XXXXX"] },
    "jsonwebtoken": { "last_check": "2026-09-01", "cves_seen": [] }
  }
}
```

If the file doesn't exist: this is a first pass, search window = a rolling 90 days. Otherwise:
window = since `last_check` per stack, with a 7-day floor (to avoid missing an advisory published
just before the last pass and indexed late by the source).

### Phase 3 — OWASP Top 10 watch

Call the `web-search` skill with:
- `query`: "OWASP Top 10 latest version" + the currently known version
  (`owasp_top10_last_seen_version`)
- `context`: "check whether a new Top 10 version was published, or whether an existing category's
  content changed"
- Primary source: `owasp.org/Top10/` (the official, versioned page)

If a new version exists (e.g. a 2021 → 2025 jump) or a category was redefined:
- Compare the categories against those already covered by `architect` (Phase 2bis),
  `upfront-alignment` (axis 6), `logging-architect` (Phase 5bis), `appsec`, `security-agent`,
  `security-audit`, `iam-engineer`.
- Produce a gap: new categories not covered by the current ecosystem, renamed/merged categories
  whose existing coverage is still valid but mislabeled.
- **Don't modify skills automatically** — the gap is a finding to report (Phase 5); updating the
  skills stays a human decision via a dedicated session.

If no change is detected since the last pass: note `OWASP Top 10: no change (version X still in
effect)`.

### Phase 4 — Per-technology CVE watch

For each stack from Phase 1/1b, call the `web-search` skill with:
- `query`: "CVE <tech> <version>" + "security advisory <tech>"
- `context`: "CVE published since <Phase 2 window date>, severity, affected versions, fix
  available"
- Sources, in order of preference:
  1. **GitHub Advisory Database** (`github.com/advisories?query=ecosystem%3A<npm|composer|nuget|pip>`) — covers most package ecosystems.
  2. **NVD** (`nvd.nist.gov/vuln/search`) — the official CVE registry, useful for non-package CVEs
     (OS, engine, protocol).
  3. **A national/regional CERT relevant to the deployment's jurisdiction** — contextualized
     advisories for the sector the project operates in; check this systematically when the project
     has a public-sector or regulated context.
  4. **The project's official changelog/release notes** (`github.com/<org>/<repo>/releases`) —
     catches security fixes published before a CVE is formally assigned to them; look for
     "security", "CVE", "vulnerability" mentions in release notes within the window.

For each CVE/advisory found, extract: identifier (CVE-XXXX-XXXXX or GHSA-xxxx), severity (CVSS if
available), affected versions, fixed version, a one-sentence summary, the source link.

**Mandatory filtering before reporting**: a CVE is only relevant if the affected version range
overlaps the version actually used by the project (Phase 1) — never report a CVE on a version range
already superseded by the version in place. Compare explicitly.

### Phase 5 — Report

`project` mode: create the folder via Bash `mkdir -p security/watch`, write
`security/watch/YYYY-MM-DD_watch.md`:

```markdown
# Security watch — YYYY-MM-DD

## OWASP Top 10
[No change | Gap detected: see below]

### Coverage gap (if applicable)
| OWASP category | Status | Skills to update |
|---|---|---|

## CVEs / advisories by technology

### [Tech] [version in place]
| ID | Severity | Affected versions | Fixed in | Summary | Source |
|---|---|---|---|---|---|

[Repeat per detected tech]

## No new alert
[Technologies checked with no result, to trace that the watch actually covered the scope]
```

`ecosystem` mode: write `~/.claude/memory/threat-intelligence/YYYY-MM-DD_watch-ecosystem.md`, same
structure, with no backlog section (no project to attach it to).

### Phase 6 — Backlog entry (`project` mode, mandatory if an active CVE is found)

Any CVE whose affected version range overlaps the version in place is an **active** CVE — same
severity rule as `appsec` findings: it's entered into the project's `BACKLOG.md`, at the top of the
overview (`## SEC — Security (priority 0)` section, `SEC-nn` rows), with:
- The CVE's summary and its source link
- "Done when" = the fixed version is installed + `composer audit`/`npm audit` no longer shows it
- Priority `High (priority 0)` if CVSS ≥ 7 or if publicly exploited (an "actively exploited" mention
  in the source), otherwise `Medium`.

Never enter an OWASP coverage gap (Phase 3) into the project backlog — that's a `claude-config`
ecosystem topic, not a defect in the audited project; mentioning it in the report is enough.

### Phase 7 — State update

Rewrite the state file (Phase 2) with `last_check` = today's date for every checked stack, and
`cves_seen` enriched with the found identifiers (so they aren't re-reported identically next pass —
only **changes** to an already-known CVE, such as an updated CVSS severity, are re-flagged in that
case, not the CVE itself).

## Invocation from `team-dev`

- **`--full`**: invoke in Phase C (the quality loop), alongside `security-agent`, or right before —
  active CVEs join the same P0/P1 fix-dispatch mechanism (C4).
- **`--audit`**: invoke alongside `security-agent` in the relevant-profile selection (Phase A),
  systematically whenever a stack is detected.

## Fallback

If `web-search` is unavailable: note `⚠️ Watch not run — web-search unavailable` in the report, keep
the old state file unchanged (don't advance `last_check` with no real search, to avoid creating a
silent hole in the watch window).

## Memory

If a critical CVE (CVSS ≥ 9) or an OWASP version change is detected: record it in the project's
`.claude/security-knowledge.md` (`project` mode) or in `hindsight.md` if the lesson extends beyond a
single project (e.g. an entire ecosystem technology facing accelerated deprecation).
