# ADR 0044 — Dependencies: maintained lineage and an end-of-session audit

- **Status**: accepted
- **Date**: 2026-09-17

## Context

Proposed package versions came from the model's memory or dated blog examples — sometimes a lineage abandoned two years ago, sometimes a version that never existed. Separately, a session could add three dependencies and end with no known vulnerability ever detected: nobody ran the audit, and the CVE surfaced at the next security scan, weeks later.

## Decision

### When adding a package

Check on Packagist / npm that the target version belongs to a **maintained lineage** — not a dated blog example, not an invented version. Use the `context7-mcp` skill for up-to-date documentation (see ADR 0022).

### At the end of any session touching the manifests

Any session that modifies `composer.json` or `package.json` ends with `composer audit` or `npm audit`, **and reports the result**. An audit run with no reported output doesn't count.

A detected vulnerability is explicitly flagged, even if not fixed within the session — the decision to address it or accept it belongs to the user.

## Positive consequences

- No more phantom version or dead lineage introduced by mistake
- CVEs in freshly added dependencies are known immediately, not at the next quarterly audit
- The reported audit output is a verifiable end-of-session trace

## Negative consequences / risks

- The audit adds a step to every session touching the manifests
- `npm audit` produces a lot of noise on transitive dev vulnerabilities — the report must distinguish what's exploitable in production
- The lineage check depends on network access (Packagist / npm / Context7)

## Alternatives considered

- **Audit only in CI**: useful, but decouples detection from the add decision — the developer who introduced the package is no longer in context. Kept as a complement, not a replacement.
- **Relying on the model's knowledge for versions**: the direct source of the observed problem. Rejected.
- **Dependabot / Renovate alone**: handle version bumps, not the initial choice. Complementary.

## Scope

All projects with a dependency manager — PHP/Composer, Node/npm, and by extension NuGet, pub, pip. Source: the "Dependencies" section of `CLAUDE.md`.
