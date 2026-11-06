# ADR 0069 — Multi-jurisdiction EU support for legal-pages

- **Status**: accepted
- **Date**: 2026-10-30

## Context

The `legal-pages` skill targeted only one specific EU country's law by initial design choice, to avoid mixing references between two particular jurisdictions. That frozen scope became a blocker as soon as a project targeted a different EU country: the generated text cited the original country's regulator and consumer code even for a French or Dutch project — a substantive error, more serious than a cosmetic imprecision on a legal document.

## Decision

`legal-pages` selects the publication country in Phase 1 (no silent default — explicitly asked, or a generic EU template for a country not individually covered) and reads the corresponding variants (GDPR supervisory authority, consumer mediator, national transposition text, business identifier) from `skills/legal-pages/references/jurisdictions.md`. The three EU-wide texts that never vary (GDPR 2016/679, the ePrivacy directive 2002/58/EC, directive 2011/83/EU) are cited by name in the produced documents regardless of the chosen country.

## Positive consequences

- A project targeting any EU country gets legally correct documents on the first generation, with no manual correction pass for national references.
- The common EU foundations (GDPR, ePrivacy, directive 2011/83) are finally named explicitly.
- The jurisdiction table is a single extension point — adding a country doesn't require touching the document templates.

## Negative consequences / risks

- Increased maintenance: every national regulatory change (a new authority, a new transposition text) must be reflected in `references/jurisdictions.md`, country by country.
- The generic "other EU country" template stays incomplete by construction (placeholders to fill in) — a project in a country not explicitly covered gets partial documents, not publish-ready as-is.
- Risk of confusion if the country chosen in Phase 1 isn't clearly communicated in the final report — worth watching in real use.

## Alternatives considered

- **Stay single-country by default, only add the named EU foundations**: simpler to maintain, but doesn't fix the underlying problem for a project outside that one country — rejected in favor of explicit multi-country coverage.
- **An external translation/adaptation service at generation time** (e.g. a systematic call to a local law firm): out of scope for a bootstrap skill, doesn't remove the need for a correct first draft.

## Scope

Applies to `skills/legal-pages/SKILL.md` and its reference file. No effect on `compliance-officer` (which stays country-agnostic, since the GDPR substance is identical across the EU). Out of scope: non-EU countries, not covered by this skill.
