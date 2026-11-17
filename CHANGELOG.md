# Changelog

All notable changes to `bocal-kit`. Format
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
[SemVer](https://semver.org/).

**Versioning applies to the repository, not to each skill.** A `version:` field across hundreds of
frontmatters would be that many values to maintain by hand for information `git log` already
provides. To check if your environment is behind:

```bash
git -C ~/.claude fetch && git -C ~/.claude status
```

What counts as a **breaking** change (major): a `team-dev` mode removed or renamed, a skill removed
or merged, an agent renamed, a frontmatter convention that invalidates existing files. A skill can
be added or enriched without being a breaking change.

## [Unreleased]

### Added

- `unlazy`: `NOT YET:` section in `GATES.md`, symmetric to `ABANDON:` — bounds over-completion
  (unrequested work an agent would do "to be thorough") the way `ABANDON:` bounds
  under-completion (an unproven gate explicitly waived). Step 6 (final report audit) now checks
  that nothing listed under `NOT YET:` happened along the way. Inspired by the "Not required
  yet" convention found in `bocal-pol/ai-hero` course material.
- `session-token-hardening`: prescriptive remediation for session cookies (HttpOnly, Secure,
  SameSite, `__Host-` prefix, ID regeneration after login/privilege elevation, CHIPS
  partitioning) and JWT (server-side algorithm allowlist against `alg:none` and RS256/HS256
  confusion, `kid`/`jku` validation) with corrected code examples for Laravel Sanctum,
  Express/`jsonwebtoken`, and .NET `Microsoft.IdentityModel.Tokens`. Coexists with
  `iam-engineer` (broad OAuth/RBAC detection) without replacing it. `security-agent` now
  invokes this skill in Phase 9c bis, alongside `iam-engineer` (Phase 9c).

## [1.3.0] - 2026-11-16

### Added

- `areopage`: decision panel skill.
- `dpo-toolkit`: real processing register and DPIA, wired into `project-bootstrap-agent` (Phase 6b)
  and `compliance-officer` (R-07/R-08 gaps); shared `.claude/country.md` jurisdiction convention
  (ADR 0076).

### Fixed

- `create-skill`: `tools` removed from the required skill frontmatter fields.
- `semgrep`: added a direct `docker run` fallback for stale compose mounts.
- Co-authorship guard in hooks scoped to actual commit/PR writes.

### Documentation

- `git-workflow`: documented the empty-repo bootstrap path.
- `laravel-developer`: documented Filament Wizard cross-step pitfalls.
- `team-dev`: documented background sub-agent tool limitations.
- `worktree-agents`: documented a submodule monorepo incompatibility.
- `react-developer`: respects existing project folder conventions.
- `hindsight`: logged frozen PATH detection at session startup.

## [1.2.0] - 2026-11-12

### Changed

- `backend-agent`, `frontend-agent`, `mobile-agent`, `infrastructure-agent`: isolated in git
  worktrees to avoid collisions when dispatched in parallel.

## [1.1.0] - 2026-11-10

### Added

- `skillspector`: security scanner for third-party skills, agents, and MCP servers.
- `impeccable`: non-waivable floor rules ported from hallmark.
- `stack-diagram`: architecture diagram skill using real technology logos.
- `animate-lemo`: coded short-film skill (Lemo-Opuscar format).
- ASD-STE100 (Simplified Technical English) convention documented for English technical writing.
- Web performance checklists added across the stack and infrastructure skills.
- Anthropic prompt library wording discipline added to `team-dev` and `upfront-alignment`.

### Fixed

- `improve-skills`: now requires a skillspector scan and a fork PR after a fix.
- Protected-branch guard scoped to `origin` only (was tripping on unrelated remotes).

## [1.0.0] - 2026-11-06 - Initial public English release

### Added

- Initial public release: a full English translation, anonymization, and clear-function rename of
  a private personal Claude Code configuration.
- `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CREDITS.md`.
- `PRODUCT-RULES.md` — the product rules referenced from `CLAUDE.md`.
- `RENAME-MAP.md` — the full mapping from the source repo's original names to this repo's clear
  English names, for anyone tracking the two in parallel.
- `ANONYMIZATION-NOTES.md` and `PORTING-NOTES.md` — the decisions made while anonymizing and
  porting content from the private source.

### Changed

- **Every agent and skill renamed** to a clear, functional English name — no persona or
  code-name identifiers. See `RENAME-MAP.md` for the full mapping.
- **Every document translated to English** — `CLAUDE.md`, `primer.md`, `hindsight.md`, `README.md`,
  `PRODUCT-RULES.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CREDITS.md`, and every `docs/adr/` entry.
- **All identifying content removed or generalized** before publication — no email address, no
  institutional domain, no personal file path. See `ANONYMIZATION-NOTES.md`.

---

## Before this changelog

This repository's own history starts here. Its content is forked from a private configuration with
a longer prior history — see that repository's own changelog for anything predating this public
release.
