---
name: changelog
description: "Generates a structured CHANGELOG.md from git commits following Conventional Commits / Keep a Changelog. Auto-invoke on mention of: changelog, release notes, change history, version notes."
model: claude-haiku-4-5-20251001
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Changelog

Generates or updates `CHANGELOG.md` from git history.

## Optional input (if invoked from release-agent)

Receive: target version. Return the CHANGELOG block without appending to the file.

## Workflow

### Phase 1 — Commit retrieval

Via Bash, run this script (avoids fragile substitution if no tag exists):

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$LAST_TAG" ]; then
  git log --pretty=format:"%h %s" "$LAST_TAG..HEAD"
else
  git log --pretty=format:"%h %s" -50
fi
```

⚠️ Global fallback: if git returns a fatal error ("not a git repository"), display `⚠️ git unavailable — manual changelog required` and stop.

### Phase 2 — Classification by category

Classify by Conventional Commits prefix:
- `feat:` → **Added**
- `fix:` → **Fixed**
- `perf:` / `refactor:` → **Changed**
- `docs:` → **Documentation**
- `test:` → **Testing**
- `chore:` / `ci:` → **Maintenance**
- CVE mentions or `security:` → **Security**
- No prefix → **Uncategorized**

### Phase 3 — Keep a Changelog block generation

```
## [version] — YYYY-MM-DD

### Added
- Change description (#hash)

### Fixed
- ...
```

Use `[Unreleased]` if no version is provided.
Only include non-empty categories.

### Phase 4 — Persistence

- **Standalone**: prepend the block at the top of `CHANGELOG.md` (create the file if absent). Read the existing content via Bash (`cat CHANGELOG.md 2>/dev/null`), then write with the new block first.
- **Orchestrated from release-agent**: return the Markdown block without modifying any file
