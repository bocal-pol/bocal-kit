# ADR 0076 — `.claude/country.md`, a jurisdiction file shared across skills

- **Status**: accepted
- **Date**: 2026-11-16

## Context

Three skills need to know which country or geographic zone covers a project: `legal-pages`
(published pages — privacy policy, terms of service, cookie banner), `compliance-officer` (GDPR
audit, deliberately country-agnostic by design since ADR 0069), and the new `dpo-toolkit`
(the real content of the processing register and DPIA, GDPR art. 30/35). Without a shared
convention, each would ask the question separately — a direct violation of the Lazy Principle
(ADR 0013) — and nothing would guarantee `legal-pages` and `dpo-toolkit` treat the same project
as covering the same country.

`compliance-officer` stays country-agnostic (the GDPR substance is identical across the EU,
ADR 0069's decision not revisited here) — but `legal-pages` and `dpo-toolkit` both need a concrete
country/zone to produce localized content.

## Decision

A single-line **`.claude/country.md`** file at the project root becomes the shared source of
truth for a project's jurisdiction:
- An ISO 3166-1 alpha-2 country code (`BE`, `FR`, `DE`...), or
- `EU` (European Union — common GDPR baseline, national margins vary by country), or
- `WORLD` (no specific zone — GDPR treated as a default best-practice reference, without
  presuming its actual legal applicability).

`legal-pages` (Phase 1) and `dpo-toolkit` (Phase 1) read this file before asking any jurisdiction
question. If it's missing, whichever of the two is invoked first creates it after a single
question; subsequent invocations, by either skill, never ask again.
`project-bootstrap-agent` (Phase 6b) also creates it, if needed, the moment it detects a need for
a legal compliance section.

**Region rule — strictest wins**: when `EU` (or a future region) is declared and several countries
covered in depth by `dpo-toolkit` diverge on a given point, the produced document keeps the most
stringent requirement among them, and lists the divergences retained explicitly rather than
silently arbitrating them.

**Deliberately limited V1 scope**: only Belgium has in-depth content
(`skills/dpo-toolkit/references/belgium.md`) in this first version. Any other country, or the
`EU` zone beyond Belgium, gets the generic GDPR baseline with an explicit warning that local
specifics (DPO appointment, sectoral regimes, the national list of mandatory DPIAs) haven't been
verified for that specific country.

## Positive consequences

- A single jurisdiction question per project, never repeated between `legal-pages` and
  `dpo-toolkit` — consistent with the Lazy Principle.
- Both skills produce consistent documents on a given project (same country, same transposition
  text cited).
- The "strictest wins" region mechanism is in place from this version on, even though it has no
  visible effect yet beyond Belgium — it stays correct by construction as more countries are
  added to `references/`.

## Negative consequences / risks

- A project that changes its target market mid-course must edit `country.md` by hand — nothing
  automatically detects a jurisdiction change.
- In-depth coverage of a single country (Belgium) limits the real value of the "strictest wins"
  rule until a second country is documented in depth — accepted as a V1 limitation, not a design
  flaw.
- The Belgian content (`references/belgium.md`) cites sources verified on 2026-11-16 (law of
  30/07/2018, the APD's DPIA list in force since April 1, 2019, CCT 68/81) but some specific
  points remain to be confirmed on the consolidated text — the file carries its own verification
  warning, not a guarantee of lasting accuracy.

## Alternatives considered

- **An argument passed explicitly on each invocation, with no shared file**: simpler to implement,
  but repeats the question at every skill and every session — rejected, contrary to the Lazy
  Principle.
- **Extending `skills/legal-pages/references/jurisdictions.md`** to also hold `dpo-toolkit`'s
  needs (DPO criteria, DPIA, sectoral laws): rejected — that table answers a different need
  (consumer/e-commerce law for published pages); merging would have mixed two unrelated data
  schemas. `dpo-toolkit` keeps its own reference (`references/belgium.md`), with a cross-reference
  comment rather than a shared schema.
- **`country.md` at the project root rather than in `.claude/`**: rejected by explicit choice of
  the repo owner — technical project configuration, not a business document visible at the same
  level as `DESIGN.md`/`PRODUCT.md`.

## Scope

Applies to `skills/dpo-toolkit/SKILL.md` (new), `skills/legal-pages/SKILL.md` (Phase 1),
`agents/project-bootstrap-agent.md` (Phase 6b), and the pointer added in
`skills/compliance-officer/SKILL.md` (pillars R-07/R-08). Ties into
[ADR 0069](0069-legal-pages-multi-jurisdiction-eu.md) (multi-jurisdiction `legal-pages`,
`compliance-officer` stays country-agnostic) and
[ADR 0070](0070-project-bootstrap-legal-compliance.md) (conditional legal section at bootstrap).
