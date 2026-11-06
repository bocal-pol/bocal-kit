# Pending work

Tracking what's left after the structure + root-docs porting pass. See `PORTING-NOTES.md` for
context.

- [x] Port agents into `agents/*.md` — **complete**. All 39 real agents ported, renamed,
      translated to English, anonymized, committed on `feature/port-agents`, pushed to origin.
      `team-dev` and `team-selector` are **skills**, not agents (confirmed: not present in
      `claude-config/agents/`, listed instead in the source's skills index) — ported in the
      skills pass, not here. Notable generalizations beyond straight translation (see
      `ANONYMIZATION-NOTES.md` for full detail): `pilgrimage-route-agent`, `race-engineering-agent`,
      `algorave-agent`, `survival-logistics-agent`, `creativity-theory-agent`, and
      `legal-compliance-agent` had their source content's private-project or single-jurisdiction
      specifics generalized into reusable, jurisdiction-neutral mechanisms. `ict-director-agent`
      and `public-procurement-agent` had internal personal-profile folder paths
      (`ProfilTechnique/`, `ProfilReseau/`, `ProfilDirICT/`) replaced with generic placeholders.
- [ ] Port all skills into `skills/*/SKILL.md`, renamed per `RENAME-MAP.md`, translated to English.
- [ ] Port `skills/.router.json` and `skills/SKILLS_INDEX.md`, updated with the new names.
- [ ] Port `docs/adr/*.md`, translated to English, numbering preserved.
- [ ] Port `image-templates/` (~30 markdown files for the `imagine` skill).
- [ ] Port or rewrite `install.ps1` (627 lines) — deferred to avoid a rushed translation of a script
      with real system effects.
- [ ] Final cross-reference verification: grep the whole repo for any stale reference to an old
      (source-repo) name, once agents and skills exist.
- [ ] Re-add the OpenSEO and codebase-mapping-plugin sections to `INSTALL.md` once (and if) their
      corresponding skills are ported — see `PORTING-NOTES.md`.
- [ ] Verify `stop.sh`'s English field names (`Status:`, `Skill:`, `Severity:`, `Observed:`,
      `Proposal:`) match what the ported `friction-retro` skill actually writes to
      `skill-observations/log.md` — the two files must agree on the field format.
