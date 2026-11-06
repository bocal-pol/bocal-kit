---
name: ai-visitor-simulation
description: "Simulates AI visitors testing a web app before it goes to production: a first screenshot glance (understood in 5 seconds, spots the action button), then real navigation (clicks, forms, scrolling) on a representative sample, following a profile and patience unique to each persona. Produces an aggregated UX feedback report (comprehension, friction, conversion). Auto-invoke on mention of: user test, visitor test, simulate visitors, crowd test, pre-launch UX feedback, 5-second first glance, conversion test, usability test, pre-launch UX feedback."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: high
scope: frontend
dependencies: []
conflicts: []
---

# AI Visitor Simulation — AI Visitor Simulation Before Production

Has an application tested by AI-simulated visitors before showing it to real people: a blind first
glance at a screenshot, then real navigation on a representative sample. Produces a friction and
conversion report — **these are AI opinions, not real users**, a first filter, never a replacement
for real tests.

## Optional input (orchestrable)

If invoked from `team-dev` (Phase D, step D1.7) or any other agent, receive directly:
- The URL of the application to test (a local dev server or a staging environment)
- The main goal of the tested page/app (sign-up, purchase, contact...) — read
  `intake/app-spec.md` first if available rather than asking again
- The detected stack (to adapt the navigation selectors in Phase 5)
- The number of personas if specified (otherwise the Phase 1 default)

If no context is provided, run Phase 1 to reconstruct it.

## Scope — what this skill doesn't do

- Doesn't replace real user tests — an AI-generated opinion stays a hypothesis to verify, never a
  final validation. The report (Phase 8) states this explicitly.
- Doesn't do a deep accessibility audit (contrast, ARIA, screen reader, keyboard navigation):
  delegated to the `accessibility-lead` skill (Phase 6), never reimplemented here.
- Doesn't test pages behind complex authentication (SSO, MFA) with no session already provided as
  input — flag the gap rather than attempting a workaround.

## Workflow

### Phase 1 — Scoping (if not provided)

If not provided as input, ask via **AskUserQuestion**:
1. URL to test (`http://localhost:3000` by default, or a staging URL).
2. The page's main goal: what a visitor should understand and do first.
3. Number of personas: **100 by default** (the reference for a pre-production validation) —
   propose `--quick` (20 personas) for a cheaper iteration during development.
4. Profiles to overrepresent if relevant (e.g. mobile only, senior B2B audience) — otherwise
   automatic generation covering desktop/mobile and the three categories from Phase 2.

⚠️ Explicitly warn about the token cost before launching 100 personas — proportional to the number
of Phase 4 subagent waves (5 batches of 20 for N=100).

### Phase 2 — Persona generation

Generate N varied profiles, each with: age, occupation, reason for visiting the site, device
(desktop/mobile), technical level, patience (low/medium/high), and one of three categories:

| Category | Indicative share | Role |
|---|---|---|
| Target audience | ~60% | Matches the product's target exactly |
| Curious | ~25% | Could convert but isn't convinced yet |
| Off-target | ~15% | Shouldn't convert — checks the page doesn't mislead anyone |

### Phase 3 — Initial capture

Via `mcp__playwright__browser_navigate` on the target URL, then
`mcp__playwright__browser_take_screenshot` at desktop viewport, then
`mcp__playwright__browser_resize` (mobile viewport) followed by a second capture. Keep both images
for Phases 4 and 7.

**⚠️ Fallback**: if the `mcp__playwright__*` tools are unavailable in the execution environment,
continue with static capture only (Phase 4) and skip Phase 5 (real navigation) — note the
limitation in the final report rather than failing silently.

### Phase 4 — Wave 1: first glance (all personas, on the capture)

Split the N personas into batches of 20 (5 batches for N=100, 1 single batch for `--quick`) and
launch one subagent per batch **in parallel** (a single level of orchestration, per `CLAUDE.md`'s
subagent discipline). Each subagent receives its batch of personas and both captures, and answers
for each:
- Understood in 5 seconds: yes/no + what they understood
- Finds the main action button: yes/no
- Would read further / would act, based on their patience: yes/no
- A verbatim quote of their first reaction

### Phase 5 — Wave 2: real navigation (a representative sample)

Select ~10% of the personas (10 of 100, minimum 5 for `--quick`), prioritizing: any "off-target"
persona who still says they want to convert (a signal of a misleading page to verify), a mix of
high/low patience, and a desktop/mobile balance. For this sample, actually navigate via
`mcp__playwright__browser_click`, `browser_type`, `browser_fill_form`, `browser_press_key`,
`browser_wait_for` — until the target action or abandonment (patience exhausted). Record the number
of steps before abandoning and the exact blocking point (selector, label).

`--full-navigation` parameter: extend Phase 5 to every persona rather than a sample — only on
explicit request, noticeably higher cost.

### Phase 6 — Additional checks

- **Accessibility**: call the Skill tool with `accessibility-lead` on the tested page (contrast,
  keyboard navigation, ARIA, screen reader). **⚠️ Fallback**: if unavailable, note the gap in the
  final report rather than improvising a partial check.
- **Technical**: perceived load time (Phase 3/5), broken links detected during Phase 5, visibility
  of prices and social proof (reviews, client logos) on the Phase 3 capture.

### Phase 7 — Variant testing (optional)

If the Phase 1 goal concerns a title/headline that converts poorly in Phase 4, propose 2-3
alternative variants and have them judged by a 10-persona sub-sample (same method as Phase 4, a
capture modified only on the tested title).

### Phase 8 — Report

Aggregate the results of Phases 4, 5, 6, and 7 (if run). Compute:
- % understood in 5 seconds, % finding the action button, % who would go through / convert
- The most-cited friction points, grouped, with the number of personas affected
- The most representative verbatim quotes
- Results by profile (desktop/mobile, target/curious/off-target)
- 5 priority fixes, each backed by a number (e.g. "42/100 can't find the button — move it above
  the fold")

Write:
- `ux-tests/ai-visitor-simulation/YYYY-MM-DD_ai-visitor-simulation.md` — a structured report with a
  synthetic ✅/⚠️/❌ status at the top of the file, consumable by `memory-ritual` and by `team-dev`'s
  master report
- `ux-tests/ai-visitor-simulation/YYYY-MM-DD_ai-visitor-simulation.html` — a standalone visual
  report (inline CSS, no external dependency), the same indicators presented as cards

A systematic reminder at the top of both reports: **"AI-simulated opinions, not real users — a
first filter, not a replacement for real user tests."**

**⚠️ Orchestration fallback**: if invoked from `team-dev` on a project with no publicly exposed
interface (pure API, an internal tool with no front end): explicitly skip starting at Phase 1, note
`⏭️ ai-visitor-simulation not run — no exposed user interface`.

## Skip memorization

The `ux-tests/ai-visitor-simulation/*.md`/`.html` report is a versioned project deliverable, not a
memory — don't log it in `~/.claude/memory/`.
