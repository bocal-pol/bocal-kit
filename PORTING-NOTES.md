# Porting notes

`bocal-kit` is ported from a private personal Claude Code configuration repository. This fork
keeps the Claude Code format fully intact — unlike the sibling `antigravity-config` mirror, there's
no format uncertainty to document here: every skill, agent, and hook mechanism works exactly as it
does in the source repo.

## Status

**Phase 1 (this commit): repository structure + root documentation only.** The following root
files have been fully translated to English, anonymized, and adjusted for the new naming
convention:

- `CLAUDE.md` (full translation of all sections, including the agent hierarchy using the new names)
- `primer.md`, `hindsight.md`
- `README.md` (full catalog of agents/skills translated and renamed per `RENAME-MAP.md`)
- `PRODUCT-RULES.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `INSTALL.md`
- `CREDITS.md`
- `LICENSE`, `.gitignore`, `.gitattributes`, `keybindings.json`, `.mcp.json`, `settings.json`
- Hook scripts: `pre-tool-use.sh`, `stop.sh`, `skill-log.sh`, `memory.sh`, `play-alert.ps1`

## What's left (tracked in `PENDING-WORK.md`)

- All agents (`agents/*.md`) — content not yet ported, only referenced by name in root docs.
- All skills (`skills/*/SKILL.md`) — content not yet ported, only referenced by name in root docs.
- `docs/adr/` — architecture decision records not yet ported.
- `image-templates/` — ~30 markdown template files for the `imagine` skill, not yet ported.
- `install.ps1` — 627-line installer script, deferred to avoid a rushed, unverified translation of
  a script with real system effects (installs software, clones repos).
- A final cross-reference verification pass once agents and skills exist: grep the whole repo to
  confirm no stale reference to an old (source) name remains anywhere.

## Simplifications made relative to the source repo

A few source-repo-specific `.gitignore` lines were dropped as not applicable to `bocal-kit`:
example-project scaffold folders tied to the source repo's own working history, and the private
overlay repo's exclusion lines (`PERSO.md`, `skills/family-context/`, `skills/ig-*/`, a persona
agent referencing a community-manager role, `instagram/`) — `bocal-kit` has no overlay repo and no
excluded personal-scope content, so documenting exclusions for files that don't exist here would be
noise.

`INSTALL.md`'s optional-MCP section dropped two source-specific integrations (a paid third-party
SEO data service, and a third-party codebase-mapping plugin) since their skill/plugin dependencies
aren't confirmed ported in this fork yet — adding install steps for tools that may not exist here
would mislead a reader. Re-add them once (and if) their corresponding skills are ported.
