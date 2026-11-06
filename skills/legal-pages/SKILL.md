---
name: legal-pages
description: "Generates the published legal documents for a web project for a European Union country (configurable, generic EU default; France/Luxembourg/Netherlands/Germany/other EU country as options): cookie consent banner, privacy policy, legal notices, Terms of Use, Terms of Sale with 14-day withdrawal, refund policy, and consumer mediator. Auto-invoke on mention of: cookies, consent banner, legal notices, privacy policy, Terms of Use, Terms of Sale, privacy policy, cookie banner, publisher, host, consumer mediator, right of withdrawal, refund policy, form consent."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies:
  - compliance-officer
conflicts: []
---

# Legal Pages — Published legal documents

Produces the legal documents a website or web application must publish before going live —
distinct from an internal GDPR audit: this skill writes the **pages the end user reads**, not
the compliance register. Business owner: `compliance-officer` for substance (legal basis,
retention periods, DPO); this skill for the published form.

**Legal framework: any European Union country, generic by default.** The substance varies
depending on the publication country chosen in Phase 1 — see
[`references/jurisdictions.md`](references/jurisdictions.md) for the full table (GDPR supervisory
authority, consumer mediator, local e-commerce transposition law, company identifier,
withdrawal specifics). ⚠️ Note: `references/jurisdictions.md` is not included in this porting
batch — check whether another skill batch ported it, or recreate it before relying on
country-specific detail; the mechanism and document structure below are complete regardless.
Three EU texts apply no matter which country is chosen and must be cited by name in the
produced documents:
- **GDPR (EU) 2016/679** — data protection, identical across the EU, only the competent
  supervisory authority changes by country.
- **e-Privacy Directive 2002/58/EC** — basis for cookie/tracker consent (banner, Phase
  3a), transposed differently per country but never to be reworded as a purely national rule.
- **Directive 2011/83/EU** — distance selling and 14-day withdrawal, transposed locally (consumer
  code variants per country — see the jurisdictions table).

If no country is specified in Phase 1, ask explicitly rather than defaulting silently — unlike
the original version of this skill, no single country is assumed.

## Optional input (orchestrable)

If invoked from `compliance-officer` (standard or `--gdpr` mode) or from `frontend-agent` at the
end of a delivery, receive directly:
- The data processing activities and legal bases already decided (`compliance-officer` Phase R2)
- The designated DPO contact (pillar R-07)
- The list of sub-processors / hosts / third-party tools already identified

If no context is provided, run Phases 1 to 3 to reconstruct it.

## Scope — what this skill doesn't do

- Doesn't compute legal bases or retention periods: `compliance-officer` is the sole source. A
  project with no prior GDPR audit gets pages marked `TO BE DETERMINED — see compliance-officer`.
- Doesn't model cookie consent in a database or its technical persistence: that's
  `frontend-agent`/`backend-agent`'s job, based on this skill's output (see Phase 4).
- Doesn't compute data minimization (which fields are actually necessary):
  `compliance-officer` remains the sole source (pillar R-02). This skill only publishes the
  consent text and flags fields collected with no declared purpose (Phase 2bis).

## Workflow

### Phase 1 — Scoping

If not supplied as input, ask via **AskUserQuestion**:
0. **Publication country**: ask explicitly which EU country (or jurisdiction) the project
   publishes in. This determines the variant read from
   [`references/jurisdictions.md`](references/jurisdictions.md) for every Phase 3 document —
   supervisory authority, mediator, company identifier, local transposition text.
1. Does the project have external (general public) users, or is it B2B/internal only?
   → determines whether Terms of Use/Terms of Sale are needed (skip for an internal tool with no
   external user accounts).
2. Does the site sell products/services to individuals (B2C), as a one-off purchase or a
   subscription/recurring payment?
   → determines whether Terms of Sale, 14-day withdrawal, a refund policy (Phase 3e), and a
   consumer mediator are needed.
3. Publisher / legal entity name, host, publication director, contact details.
4. Designated DPO: name/department and contact details (or `TO BE DESIGNATED` if not applicable
   at the GDPR threshold).

#### Simplified case — showcase site with no form or tracker

If the project is a pure showcase site: no form (contact, signup), no user account, no
third-party script (analytics, pixel, chat), no sale — Phase 2 grep comes back empty and Phase 1
confirms it — then:
- **Don't produce**: consent banner, Terms of Sale, consumer mediator mention.
- **Still produce**: legal notices + working contact details (the only obligations that remain
  regardless of the site).
- Explicitly note in the final report:
  `⏭️ Cookie banner / Terms of Sale / mediator not produced — showcase site with no form or
  tracker detected (Phase 1 + Phase 2). Reproduce as soon as a form, account, or third-party
  script is added.`

### Phase 2 — Cookie and third-party script inventory

Grep the project to detect already-integrated or planned third-party scripts:
`google-analytics`, `gtag`, `matomo`, `hotjar`, `facebook.*pixel`, `meta.*pixel`, `intercom`,
`hubspot`, `stripe`, `sentry`, `mixpanel`.

Classify each detected script into a category:

| Category | Consent required | Examples |
|---|---|---|
| Essential (session, auth, cart, language) | No — always active | session cookie, CSRF token, language preference |
| Analytics | Yes, off by default | Google Analytics, Matomo |
| Marketing | Yes, off by default | Meta Pixel, HubSpot |
| Personalization | Yes, off by default | Hotjar, recommendations |

If no third-party script is detected, still produce the banner (at minimum the Essential
category) — a project with no tracking today may add some tomorrow without the banner needing
to be rebuilt from scratch.

### Phase 2bis — Consent and minimization in forms

Grep the project for data-collection forms (excluding cookies): Blade/Filament Forms
components, React/Angular input components (`<form`, `useForm`, `FormGroup`,
`Forms\Components\`), creation endpoints (`store`, `POST /api/...`). For each detected form,
list the collected fields.

If `intake/data-dictionary.md` exists (produced at bootstrap by the `data-dictionary` skill),
cross-reference each field with its **PII** column and necessity justification — same principle
as `compliance-officer` Phase R1: prioritize this structured source over a fallback grep.
Otherwise, limit to the list of detected fields with no necessity status (note `TO VERIFY —
data-dictionary absent`).

For each form collecting a field not essential to immediate execution (e.g. newsletter,
profiling, marketing preferences — not an account email or a delivery address needed for the
requested service):
- Produce a consent text as a checkbox that's **never pre-checked**:
  `☐ I agree that my data be used for [precise purpose]. [Privacy policy link]`
- Produce the minimal GDPR Art. 13 notice to display at the collection point: purpose, legal
  basis, retention period, recipient, link to the full privacy policy.

Flag in the final report (Phase 5), without blocking the generation of other documents, any
field collected with no declared purpose in `data-dictionary.md` or in Phase 1's answers — this
is a minimization gap to pass on to `compliance-officer` (pillar R-02), not to fix yourself.

### Phase 3 — Document generation (5 possible, depending on applicability)

All documents go into `legal/` at the project root.

#### 3a — Consent banner (functional spec, not the component itself)

Write `legal/cookie-consent-spec.md`:

```markdown
# Cookie consent banner specification

## Mandatory rules
1. Essential cookies always active, no consent required.
2. Non-essential cookies off by default, enabled only after explicit consent.
3. Granular consent per category (not a single "Accept all").
4. Modifiable/withdrawable at any time via a "Cookie settings" link in the footer.
5. Persisted (a `consent_*` cookie or localStorage) to avoid re-asking on every visit.
6. No non-essential script loaded before the corresponding consent.

## Categories detected in this project
[Phase 2 table]

## Expected behavior
- First load with no recorded consent → banner shown, non-essential scripts blocked.
- Partial consent (e.g. Analytics yes, Marketing no) → only Analytics scripts load.
- Consent withdrawn → scripts unloaded / not reloaded on next refresh (verifiable in the browser's Network tab).

## Implementation
→ Component owned by `frontend-agent` (see Phase 4 of this skill for the hand-off).
```

#### 3b — Privacy policy

Write `legal/privacy-policy.md`, reusing — if available — the elements produced by
`compliance-officer` (legal bases from Phase R2, retention, rights):

```markdown
# Privacy Policy — [Project]

Last updated: YYYY-MM-DD

## Data controller
[Publisher / legal entity — Phase 1]

## Data Protection Officer (DPO)
[DPO contact — Phase 1, or "TO BE DESIGNATED — see compliance-officer pillar R-07"]

## Data collected and purposes
[Table reused from compliance-officer Phase R2, or "TO BE DETERMINED — GDPR audit required"]

| Data | Purpose | Legal basis | Retention period |
|---|---|---|---|

## Recipients and sub-processors
[Host, third-party tools from Phase 2]

## Transfers outside the EU
[Reused from compliance-officer if available]

## Your rights
Access, rectification, erasure, portability, objection — contact: [DPO or controller].
Response time: 1 month (GDPR Art. 12).
Right to lodge a complaint with the competent supervisory authority — see
[`references/jurisdictions.md`](references/jurisdictions.md) for the country chosen in Phase 1.

## Security
[Encryption measures — reused from compliance-officer pillar R-05 if available]

## Cookies
See [Cookie settings] — detailed banner in Phase 3a.

## Consent in forms
[If Phase 2bis detected non-essential forms: consent text and Art. 13 notice produced in
Phase 2bis, reused here or linked from each relevant form]
```

#### 3c — Legal notices

Write `legal/legal-notices.md`:

```markdown
# Legal Notices — [Project]

## Publisher
[Legal entity name, legal form, company identifier (format depends on country — see
`references/jurisdictions.md`), registered office address, contact — Phase 1]

## Publication director
[Name/role — Phase 1]

## Hosting
[Host name, address, contact — Phase 1]

## Contact details
A working, monitored email — [contact@…], consistent with the one shown in the footer and in
the privacy policy (one single reference address across the whole site, not several diverging
addresses per page).

## Intellectual property
[Trademarks, content, licenses — standard, to adapt]

## Legal basis
General online information obligations — see `references/jurisdictions.md` for the national
text applicable to the country chosen in Phase 1.
```

#### 3d — Terms of Use (only if external users are confirmed in Phase 1)

Write `legal/terms-of-use.md`:

```markdown
# Terms of Use — [Project]

## Purpose and acceptance
## Service access and user account
## User responsibilities
## Publisher responsibilities — limitations
## Account termination / suspension
## Governing law and competent jurisdiction
Law of the country chosen in Phase 1. Courts of the publisher's registered office have
jurisdiction absent an amicable resolution.
```

If the project is an internal tool with no external users: explicit skip, note
`⏭️ Terms of Use not produced — internal tool with no external users (confirmed in Phase 1)`.

#### 3e — Terms of Sale (only if B2C sales are confirmed in Phase 1)

Write `legal/terms-of-sale.md`:

```markdown
# Terms of Sale — [Project]

## Purpose and scope
## Products/services and pricing
Prices displayed tax-inclusive. [Detail — Phase 1]

## Order and payment
## Delivery / performance
[Timelines, covered areas]

## Right of withdrawal
A **14 calendar day** period from receipt (goods) or contract conclusion (service) — local
transposition of EU directive 2011/83 (see `references/jurisdictions.md` for the country
chosen). A standard withdrawal form is provided as an appendix. Legal exceptions to the right of
withdrawal to be listed if applicable (personalized goods, digital content delivered
immediately with express agreement, etc.).

## Refund policy
Beyond the legal 14-day withdrawal right above:
- **Subscription / recurring payment**: termination terms (notice period, effective at the end
  of the period or immediately), pro-rata calculation on mid-period termination, no refund for
  the already-consumed period unless stated otherwise.
- **Digital content delivered immediately**: non-refundable once performance has begun with the
  consumer's express agreement and explicit waiver of their withdrawal right (a condition to be
  documented at the time of purchase, not inferred after the fact).
- **Personalized / custom-made goods**: excluded from the right of withdrawal (legal exception),
  to be explicitly restated here rather than implying a refund is possible.
- Any refund granted beyond these cases is the publisher's own commercial policy (timeline,
  request channel) — to fill in during Phase 1 if the publisher offers one.

## Legal warranties
Conformity warranty — 2 years for goods sold to a consumer (see `references/jurisdictions.md`
for the country chosen).

## Consumer mediator
In the event of an unresolved dispute, the consumer may refer the matter to the consumer
mediator competent for the country chosen in Phase 1 — see
[`references/jurisdictions.md`](references/jurisdictions.md), or a sector-specific approved
mediator if one exists for the relevant sector. [The publisher's prior membership must be
verified before publication — a mediator can only be cited if the publisher has actually joined it.]

## Governing law and competent jurisdiction
Law of the country chosen in Phase 1.
```

If the project doesn't sell to individuals (B2B only, or no sales): explicit skip, note
`⏭️ Terms of Sale not produced — no confirmed B2C sales (Phase 1)`.

#### 3f — Content checks (a checklist, not a dedicated file)

Check and flag in the final report, without blocking document generation:
- **Customer reviews**: if the site displays reviews, verify they're real and not fabricated —
  an unfair commercial practice sanctioned under consumer law.
- **Quantified claims** (%, timelines, savings, performance): must be backed by verifiable
  evidence, otherwise reword or remove.
- **Image rights**: images/visuals used must be licensed or have documented usage rights — flag
  if the source isn't tracked in the project.
- **Contact consistency**: the same email/address everywhere (legal notices, footer, privacy
  policy, Terms of Sale) — a mismatch is a classic compliance red flag.

### Phase 3g — Filament admin interface (if a Laravel stack is detected)

If the project is Laravel (detection: `composer.json` contains `laravel/framework` and
`filament/filament`), the Phase 3 documents don't stay as simple Markdown files frozen at
generation time: they become the **seeded initial content** of an editable table, so the user
(or the AI, on explicit request) can revise them without going back through this skill.

Pattern to scaffold — **documented here only**, single source referenced (never duplicated)
from `skills/laravel-developer/SKILL.md` and `agents/backend-agent.md`:

- **Migration** `legal_documents`: `type` (enum `privacy-policy`, `terms-of-use`,
  `terms-of-sale`, `cookies`, `legal-notices`), `country` (the country chosen in Phase 1),
  `content` (long text, Markdown or HTML), `version` (incrementing integer), `published_at`
  (nullable — a draft until published), `is_current` (boolean, one current record per `type` +
  `country`).
- **Model** `LegalDocument` with a `current()` scope (`type` + `country` + `is_current = true`) —
  the frontend must consume this scope to display the published page, never a static file.
- **Filament Resource** `LegalDocumentResource`: a `RichEditor` or `MarkdownEditor` field for the
  content, a list with version history (each publication **creates a new versioned row** instead
  of overwriting the previous one — traceability of Terms of Use/privacy policy changes, useful
  in a dispute). A "Publish" action flips `is_current` to the new version and clears it on the
  old one, with a `published_at` timestamp.
- **Initial seed**: a seeder (or a dedicated Artisan command) inserts the Markdown content
  produced in Phase 3 as the first version (`version = 1`, `is_current = true`) for each
  applicable document — this skill doesn't write that seeder itself, it describes it in the
  Phase 4 hand-off for `backend-agent`.

**⚠️ Fallback**: if the project isn't Laravel/Filament, skip this phase and leave the Phase 3
documents as static Markdown files — to be published through the detected stack's own content
mechanism (CMS, static route, etc.), without forcing Filament outside its context.

### Phase 4 — Technical hand-off

Produce a summary of implementation obligations to pass to `frontend-agent` /
`backend-agent`:

```markdown
## Implementation hand-off — legal-pages

- [ ] Consent banner compliant with `legal/cookie-consent-spec.md`
- [ ] Non-essential scripts conditioned on consent (deferred or blocked loading)
- [ ] "Cookie settings" link accessible from every page (footer)
- [ ] Pages `legal/privacy-policy.md`, `legal/legal-notices.md` (and `terms-of-use.md`/
      `terms-of-sale.md` if applicable) published and linked from the footer
- [ ] Consent withdrawal verified in the browser's Network tab (manual or Playwright test)
- [ ] Consent texts and Art. 13 notices from Phase 2bis integrated into each relevant form,
      checkbox never pre-checked
- [ ] If Laravel/Filament stack: migration + `LegalDocument` Model + Resource + seeder from
      Phase 3g scaffolded, frontend consuming `LegalDocument::current()` rather than a static file
```

**⚠️ Fallback**: if `frontend-agent`/`backend-agent` are unavailable, leave this hand-off in
the final report — don't block generating the legal documents.

**Automatic invocation — accessibility**: as soon as this skill produces a consent banner
(Phase 3a) or a form consent text (Phase 2bis), **call the Skill tool with
`accessibility-lead`**, passing it these components (contrast, keyboard navigation,
screen-reader announcement of the banner — an accessibility defect on a consent component is a
frequent complaint, not a minor documentation footnote). **⚠️ Fallback**: if `accessibility-lead`
is unavailable, note in the final report `⚠️ accessibility-lead unavailable — consent
banner/forms not audited, manual WCAG 2.1 AA verification required before production`.

**Out of scope — handoff to other skills** (to mention in the report, never duplicated here):
- General interface accessibility (beyond the consent banner/forms, already covered above) →
  `accessibility-lead` skill. Reference standard: WCAG 2.1 AA, and the European Accessibility
  Act (EU) 2019/882, which makes it legally mandatory for certain B2C digital services in the EU.
- AI engine accessibility (`llms.txt`, semantic structuring, `robots.txt` openness) →
  `seo-geo` skill.

### Phase 5 — Report and persistence

- **Standalone**: create the folder via Bash (`mkdir -p legal`), write the Phase 3 files +
  a summary `legal/README.md` listing the produced documents and their status (complete /
  `TO BE DETERMINED` pending a GDPR audit).
- **Orchestrated from `compliance-officer`**: return the Markdown content of the produced
  documents + the Phase 4 hand-off; persistence stays with the caller if it already centralizes
  writing (otherwise write directly to `legal/`).
- **Orchestrated from `project-bootstrap-agent` (bootstrap, Phase 6b)**: produce the same
  documents but explicitly mark them as **draft** (header `> 📝 Bootstrap draft — finalize via
  team-dev --full before going live`) — legal bases aren't yet thoroughly audited at this stage.

## Completion criterion — definition of "done" for a web delivery

Reused from the cross-cutting `CLAUDE.md` rule ("Legal pages & consent" section): a web
delivery isn't done until
1. the consent banner is present and functional,
2. non-essential scripts are conditioned on consent,
3. withdrawing consent actually disables the scripts (verifiable on the network),
4. a "Cookie settings" link is accessible from every page,
5. every form collecting a non-essential field shows an explicit, **never pre-checked** consent
   checkbox and the corresponding Art. 13 notice (Phase 2bis),
6. no collected field lacks a declared purpose (minimization flagged otherwise),
7. the banner and consent forms have been audited by `accessibility-lead` (or the gap is
   explicitly flagged if the skill was unavailable).

A project that produces this skill's documents but hasn't checked these 7 points on the
frontend side isn't "done" — the final report must say so explicitly rather than reporting success.

## Skip memory

The `legal/*.md` documents are versioned project deliverables, not memories — don't record them
in `~/.claude/memory/`.
