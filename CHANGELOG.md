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

## [Unreleased] - Initial public English release

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
