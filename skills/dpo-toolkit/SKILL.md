---
name: dpo-toolkit
description: "Produces the real content of the documents a DPO must keep: Record of Processing Activities (RoPA, GDPR art. 30) and Data Protection Impact Assessment (DPIA, GDPR art. 35) — per processing activity, with a 9-criteria necessity test. Resolves jurisdiction from the project's `.claude/country.md` (ISO country code, or a region — EU/WORLD) ; for a region, applies the strictest known rule among the countries covered in depth. Belgium is covered in depth (law of 30/07/2018, APD/GBA, CCT 68/81, Camera Law) ; any other country gets the generic GDPR baseline with an explicit warning about uncovered local specifics. Auto-invoke on: RoPA, record of processing activities, processing register, DPIA, data protection impact assessment, data protection officer, DPO, prior consultation with the supervisory authority, GDPR art. 30, GDPR art. 35. Never replaces human legal validation — every generated document carries a mandatory review warning."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: medium
scope: security
dependencies:
  - compliance-officer
conflicts: []
---

# DPO Toolkit — Processing register and DPIA, real content

> ⚠️ **Warning**: this skill produces a **structured working draft aligned with the law**, not
> legal advice. Every generated document must be reviewed and validated by the DPO or a lawyer
> before any enforceable use (supervisory authority audit, review, litigation). Country-specific
> content beyond GDPR (the Belgium section in particular) may change over time — check the cited
> official sources before relying on it for a high-stakes decision.

Generates the real content of the **Record of Processing Activities** (RoPA, GDPR art. 30) and
the **Data Protection Impact Assessment** (DPIA, GDPR art. 35) for a project, accounting for the
jurisdiction declared in `.claude/country.md`. Reuses the legal bases/retention periods/transfers
already decided by `compliance-officer` instead of asking again.

## Optional input (if invoked from `socle-agent`/`compliance-officer`/`team-dev`)

If the project's jurisdiction and processing activities are already known (Data Dictionary, App
Spec, or an existing `compliance-officer --gdpr` report), pass them directly — skip Phase 1 and
the Phase 2 collection step.

## Workflow

### Phase 1 — Jurisdiction resolution

1. Read `.claude/country.md` at the project root.
2. **Missing**: ask a single grouped question (Lazy Principle — never ask again afterward):
   ```
   DPO Toolkit — Jurisdiction:
   Which country or zone covers this project?
   - ISO 3166-1 alpha-2 country code (e.g. BE, FR, DE, NL)
   - EU (European Union — common GDPR baseline shared by all member states)
   - WORLD (no specific zone — GDPR applied as a best-practice reference, without presuming it
     applies legally)
   ```
   Write the answer to `.claude/country.md` (plain text, just the code/zone, one line) so this
   skill and `legal-pages` never ask again on this project.
3. **Present**: resolve without asking again:
   - A single country code → that country.
   - `EU` → GDPR applies uniformly as an EU-wide text. For national margins (DPO appointment,
     penalties, sectoral regimes), only Belgium is covered in depth by this skill (see
     `references/belgium.md`) — the generated document must say so explicitly: *"National margins
     verified for: Belgium. Not verified for other EU member states — have a local correspondent
     validate per country."*
   - `WORLD`: treat GDPR as a default best-practice baseline, with the warning that no local law
     has been verified and that GDPR's actual legal applicability depends on the place of
     establishment/the data subjects concerned (art. 3 GDPR) — have a local lawyer decide if the
     project processes data of people outside the EU.
4. **Region rule — strictest wins**: if several countries covered in depth belong to the declared
   region and diverge on a given point (e.g. DPO appointment criterion, a sector's default
   retention period), keep the most stringent requirement for the generated document, and flag it
   line by line in a "Divergences retained" section. In this V1, only Belgium is covered in
   depth: this rule therefore has no visible effect yet beyond Belgium — the mechanism must still
   apply from now on so it stays correct as coverage expands.

### Phase 2 — Processing activity inventory

Lazy Principle: never ask again for information already available.

1. Look in this order (stop at the first found):
   - `.claude/gdpr-violations.md` or `security/compliance-officer/*_gdpr-audit.md` (an existing
     tracker/report from `compliance-officer --gdpr`) — extract legal bases (art. 6), data
     categories, retention periods, non-EU transfers already decided per processing activity.
   - `intake/data-dictionary.md` (entities + PII fields already qualified by `socle-agent`).
2. **Nothing found**: ask the user to list processing activities (one line per activity: name,
   purpose, data subjects) via a grouped question, then — for each activity with no known legal
   basis/retention period — invoke `compliance-officer --gdpr` rather than redoing that work here.
3. For any information still missing after these two sources (e.g. exact recipients, technical
   security measures), ask a single grouped question per activity — never a question per field.

### Phase 3 — Record of Processing Activities (RoPA)

For **each** processing activity identified in Phase 2, produce a complete entry per GDPR art. 30:

| Field (GDPR art. 30) | Content |
|---|---|
| Controller | Name, contact details, representative if applicable |
| DPO | Name/role and contact if appointed (otherwise: status of the appointment — see Phase 1 on the obligation to appoint a DPO) |
| Purpose(s) | Precise description, never generic ("HR management" → state the exact operation) |
| Legal basis (art. 6) | Reused from `compliance-officer`, never asked again |
| Categories of data subjects | |
| Categories of data | State if sensitive (art. 9) or criminal (art. 10) data — triggers Phase 4 |
| Recipients | Internal and external, named processors |
| Transfers outside EU/EEA | Country, safeguard (adequacy decision, standard contractual clauses, etc.) |
| Retention period | Per data category, reused from `compliance-officer` |
| Security measures | General description (art. 32) |
| Applicable national text | Filled from Phase 1 (e.g. Belgium: law of 30/07/2018 — see `references/belgium.md`) |

Persist to `privacy/dpo-toolkit/YYYY-MM-DD_processing-register.md` (or return directly if outside
a project context). One table per processing activity, never a single table that flattens nuance.

### Phase 4 — DPIA necessity test

For each processing activity in the register, document the test — **even when the conclusion is
negative**, for traceability (accountability principle, art. 5.2 GDPR):

**Cases where a DPIA is mandatory by law (GDPR art. 35.3)**:
- (a) systematic and extensive evaluation of personal aspects based on automated processing,
  including profiling, producing legal or similarly significant effects;
- (b) large-scale processing of sensitive data (art. 9) or criminal data (art. 10);
- (c) systematic monitoring of a publicly accessible area on a large scale.

**9 complementary criteria (EDPB guidelines WP248 — also used by the Belgian APD as a
decision-support grid)** — 2 or more criteria met = DPIA recommended by default:
1. Evaluation or scoring (including profiling).
2. Automated decision-making with a legal or similarly significant effect.
3. Systematic monitoring.
4. Sensitive data or data of a highly personal nature.
5. Data processed on a large scale.
6. Matching or combining datasets.
7. Data concerning vulnerable data subjects.
8. Innovative use or application of new technological/organisational solutions.
9. The processing prevents data subjects from exercising a right or using a service/contract.

**Belgium**: the APD adopted a list of processing types for which a DPIA is mandatory (in force
since April 1, 2019, subject to update) — do not copy its dated content, verify the version in
force on `autoriteprotectiondonnees.be` before concluding there is no obligation on this basis
alone. See `references/belgium.md`.

**Conclusion to document for each processing activity**:
- If ≥ 1 art. 35.3 criterion **or** ≥ 2 EDPB/APD criteria are met → DPIA mandatory, move to Phase 5.
- Otherwise → note explicitly "DPIA not required — [criteria assessed, none met]" in the register.

### Phase 5 — DPIA (if triggered in Phase 4)

For each processing activity requiring a DPIA, produce a complete document per GDPR art. 35.7
(structure aligned with the EDPB/CNIL methodology, recognized and used by the Belgian APD):

1. **Systematic description of the envisaged processing** — purposes, legitimate interest pursued
   where applicable, data flows (who sends what, to whom, through which channel).
2. **Necessity and proportionality** — is the processing adequate, relevant, and limited to what
   is necessary (minimization) relative to the purpose? Was a less intrusive alternative
   considered?
3. **Risk assessment for data subjects' rights and freedoms** — for each of the 3 feared events
   (illegitimate access, unwanted modification, data disappearance), estimate severity ×
   likelihood and identify risk sources (threats, vulnerabilities).
4. **Risk treatment measures** — technical/organisational measures envisaged to bring each risk
   down to an acceptable level; residual risk after measures.
5. **DPO opinion** on the analysis and its conclusions (to be completed by the actual DPO — this
   skill drafts the finding, not the opinion itself).
6. **Controller's decision** — approval, or **mandatory prior consultation of the supervisory
   authority** (art. 36 GDPR) if residual risk remains high after measures.

Persist to `privacy/dpo-toolkit/YYYY-MM-DD_dpia-<activity-slug>.md` — one file per processing
activity, never a catch-all document.

### Phase 6 — Summary report and conditional persistence

- **If the project has a `.claude/` folder**: write the register (Phase 3) and each DPIA (Phase 5)
  to `privacy/dpo-toolkit/`, plus a one-page summary (`privacy/dpo-toolkit/README.md`) listing each
  processing activity, its DPIA status, and the documents produced.
- **Otherwise**: return everything directly in the response, without writing a file.
- Repeat the mandatory review warning at the end of each document produced.

### Phase 7 — Memory (light)

If the same type of processing activity or country divergence recurs across several invocations in
the same project, note it in `<project>/.claude/life-knowledge.md` — never without explicit
confirmation.

## Scope — what this skill does not do

- Does not redo the general GDPR compliance audit (8 pillars, legal bases, retention periods):
  that is `compliance-officer`'s role, consumed here as input.
- Does not produce published pages (privacy policy, terms of service, cookie banner): that is
  `legal-pages`'s role, which reads the same jurisdiction from `.claude/country.md`.
- Only covers Belgium in depth in this version — any other country gets the generic GDPR baseline
  with an explicit warning, never an unverified claim of local compliance.
