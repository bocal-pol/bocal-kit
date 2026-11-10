---
name: dependency-updater
description: "Analyzes outdated dependencies, proposes safe updates, flags breaking changes. Auto-invoke on mention of: outdated dependencies, npm update, pip upgrade, package updates, outdated dependencies."
model: claude-haiku-4-5-20251001
user-invocable: true
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Dependency Updater

Audit of outdated dependencies with criticality classification and ready-to-run update commands.

## Optional input (if invoked from `release-agent`)

Receive: manifest paths. Return the report without writing a file.

## Workflow

### Phase 1 — Detection and audit

Check for manifests via Bash, then run the corresponding tool:

- `package.json` present → `npm outdated --json 2>/dev/null || true` — ⚠️ if output is empty or invalid: log `⚠️ npm unavailable` and continue
- `requirements.txt` present → `pip list --outdated --format=json 2>/dev/null` — ⚠️ on error: log `⚠️ pip unavailable` and continue
- `composer.json` present → `composer outdated 2>/dev/null` — ⚠️ on error: log `⚠️ composer unavailable` and continue

If no manifest found: display `⚠️ No dependency manifest detected` and stop.

### Phase 2 — Criticality classification

- **MAJOR**: major version bump — potential breaking change
- **MINOR**: minor version bump — new features, backward-compatible
- **PATCH**: patch bump — bugfix or security fix

### Phase 3 — Structured report

```
## Dependency Report — YYYY-MM-DD

### MAJOR (potential breaking changes)
| Package | Current | Available | Notes |
|---------|--------|-----------|-------|

### MINOR
| Package | Current | Available | Notes |

### PATCH
| Package | Current | Available | Notes |

### Update commands
# Safe PATCH updates
npm update [packages]

# MINOR — check changelogs
npm install package@latest

# MAJOR — migration required
# See changelogs before applying
```

### Phase 3bis — Unused dependencies (weight angle, not staleness)

> Different from the previous phases: a dependency can be perfectly up to date and still serve
> no purpose — every unused package adds weight to the bundle the user downloads without
> providing any value.

Detection depending on the manifest present:

- `package.json` → `npx depcheck 2>/dev/null` — lists declared dependencies never imported in
  the code
- `composer.json` → `composer-unused 2>/dev/null` (if installed) — otherwise report
  `⚠️ composer-unused not installed — manual detection required`

```
### Unused dependencies detected
| Package | Size (if available) | Last reference in code |
|---------|----------------------|--------------------------|
```

Only propose removal after confirming no dynamic import (conditional `require()`, a plugin
loaded by string name) uses it — `depcheck`/`composer-unused` can produce false positives on
this kind of usage.

### Phase 4 — Conditional persistence

- **Standalone**: create the folder via Bash (`mkdir -p reports/dependency-updater`), write `reports/dependency-updater/YYYY-MM-DD_dependency-updater.md`
- **Orchestrated from `release-agent`**: return the Markdown content without writing
