# Pending work

Tracking what's left after the structure + root-docs porting pass. See `PORTING-NOTES.md` for
context.

- [x] Port agents into `agents/*.md` — **partial, verified by a fresh diff of source vs. ported
      filenames against `RENAME-MAP.md` (not from memory)**. 17 of 39 real agents done (ported,
      renamed, translated, committed on `feature/port-agents`, pushed to origin):
      backend-agent, ceo-decision-agent (← pdg-agent), creative-director-agent (← directeur-creatif-agent),
      devils-advocate-agent (← avocat-du-diable-agent), game-master-agent (← bard-agent), hr-agent (← rh-agent),
      infrastructure-agent (← atlas-agent), mentor-agent, paid-consultant-agent (← consultant-agent),
      pilgrimage-route-agent (← compostel-agent, generalized away from the source's private named
      project — see `ANONYMIZATION-NOTES.md`), product-agent (← boussole-agent), qa-lead-agent (← argus-agent),
      release-agent (← canaveral-agent), security-agent (← cerbere-agent), socratic-method-agent (← socratique-agent),
      sprint-agent (← bolt-agent), trainer-agent (← formateur-agent).

      **22 real agents still to port** (source name → target name per `RENAME-MAP.md`; the 4 not yet
      in `RENAME-MAP.md`'s table — `commercial-agent`, `ict-agent` — need a row added, see below):
      - `arcade-agent` → `game-dev-agent`
      - `commercial-agent` → `sales-offers-agent` (NOT in RENAME-MAP.md yet — add it)
      - `communication-agent` → `public-communications-agent`
      - `frontend-agent` → `frontend-agent` (unchanged name; 350 lines)
      - `gutenberg-agent` → `documentation-agent`
      - `hermes-agent` → `integration-agent`
      - `ict-agent` → needs a name decision; NOT in RENAME-MAP.md yet. It's a real orchestrator
        (`type: orchestrateur, priority: high, scope: cross`) covering network/Windows-AD
        support/server infra/security/bulletins/inventory — distinct from `infrastructure-agent`
        (ex-atlas, cloud/container/CI-CD focus) and from the future `it-operations-agent` (ex-sentinelle,
        support/ITIL focus). Suggest `ict-infrastructure-agent` or similar — decide and add the row
        before porting.
      - `iris-agent` → `design-agent` (454 lines — **largest remaining agent**)
      - `maestro-agent` → `coordination-agent`
      - `marches-agent` → `public-procurement-agent`
      - `nomade-agent` → `mobile-agent`
      - `policier-agent` → `legal-compliance-agent`
      - `pythie-agent` → `data-agent`
      - `schumi-agent` → `race-engineering-agent`
      - `sensei-agent` → `productivity-coach-agent`
      - `sentinelle-agent` → `it-operations-agent`
      - `socle-agent` → `project-bootstrap-agent`
      - `survivaliste-agent` → `survival-logistics-agent`
      - `szikra-agent` → `creativity-theory-agent`
      - `themis-agent` → `pr-review-agent`
      - `vitruve-agent` → `architecture-agent`
      - `zack-delarocha-agent` → `algorave-agent`

      `team-dev` and `team-selector` are **skills**, not agents (confirmed: not present in
      `claude-config/agents/`, listed instead in the source's skills index) — they'll be ported in
      the skills pass, not here.

      To resume: `cd bocal-kit && git checkout feature/port-agents && git pull`, then continue
      reading each remaining source file from `c:\Projet\CLaude\claude-config\agents\<name>.md`,
      translating fully to English, applying the anonymization rules in `AGENTS.md`/`CLAUDE.md`'s
      security section, and writing to `agents/<new-name>.md`. Add the 2 missing rows to
      `RENAME-MAP.md`'s Agents table (commercial-agent, ict-agent) when you decide their final
      names. After all 22 are done, this pending-work line can be marked fully done.
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
