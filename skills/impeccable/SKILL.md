---
name: impeccable
description: "UI quality review with 24 design commands and 61 deterministic anti-slop rules. Auto-invoke on: UI quality review, interface audit, improve design, fix visual, AI-slop, purple gradient, polish, bolder, quieter, distill, UX critique, interface accessibility audit, impeccable."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: frontend
dependencies: []
conflicts: []
argument-hint: "[craft|audit|critique|polish|bolder|quieter|distill|harden|animate|colorize|typeset|layout|delight|overdrive|clarify|adapt|optimize|shape|document|extract|onboard|live|generate] [target]"
---

# Impeccable — Design Guidance

Applies the 24 design guidance commands and the 61 deterministic anti-slop rules to any interface.
Based on bocal-pol/impeccable (fork of the upstream impeccable, an extended Anthropic
frontend-design skill).

## Optional input (if invoked from `design-agent` or `ux-designer`)

If the command and target are provided directly, skip Phase 1 and run Phase 2.

## Workflow

### Phase 1 — Command routing

If no argument is passed, ask a single question:

```
Which impeccable operation?

Review and quality:
  audit     — Technical checks (a11y, perf, responsive)
  critique  — UX review (hierarchy, clarity, emotional resonance)
  polish    — Final pass, DS alignment, ready to ship

Visual adjustments:
  bolder    — Amplify a design that's too timid
  quieter   — Calm down an overloaded design
  distill   — Strip down to the essentials
  colorize  — Introduce strategic color
  typeset   — Fix typography, hierarchy, sizing
  layout    — Fix layout, spacing, visual rhythm

Construction:
  craft     — Full shape→build flow with visual iteration
  shape     — Plan UX/UI before writing code
  harden    — Error handling, i18n, text overflow, edge cases
  onboard   — First-run flows, empty states, activation paths
  animate   — Add intentional motion
  delight   — Moments of joy and micro-interactions
  overdrive — Technically extraordinary effects

System:
  document  — Generate DESIGN.md from existing code
  extract   — Extract reusable components and tokens
  clarify   — Improve unclear UX copy
  adapt     — Adapt for different devices
  optimize  — Performance improvements

Target (optional): file, component, or URL
```

### Phase 2 — Execution by command

#### audit
Technical checks on the target:
- Accessibility: heading hierarchy, alt text, aria-labels, visible focus, tap targets ≥ 44×44px
- Performance: unoptimized images, blocking scripts, expensive animations
- Responsive: breakpoints covered, readable text at 320px, horizontal overflow
- Contrast: ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text ≥18px or bold 14px)

#### critique
Qualitative UX review:
- Visual hierarchy: does the eye know where to go in < 3 seconds?
- Clarity: is every action obvious without a label?
- Consistency: same visual language everywhere?
- Emotional resonance: does the interface match the Surface-mode
  (Persuade/Operate/Read/Experience)?

#### polish
Final pass before delivery:
1. Run `audit` + `critique` on the target
2. Fix critical findings
3. Check the 61 rules (Phase 3)
4. Validate alignment with `DESIGN.md` if present

#### bolder
Amplify a too-generic design:
- Increase heading contrast (H1 ≥ 3rem desktop)
- Strengthen the accent color (use the 60-30-10 rule)
- Enlarge whitespace (section padding × 1.5)
- Make the primary CTA more prominent (+8px height, drop shadow)

#### quieter
Calm down an overloaded design:
- Reduce the number of colors to 3 max per screen
- Unify typographic weights (max 2 per page)
- Increase inter-section spacing
- Remove non-functional decorative borders

#### distill
Strip to the essentials:
- Identify the 3 main actions — remove everything that doesn't lead there
- A single primary CTA per screen
- Reduce the number of distinct components on the page

#### shape
Plan before coding:
- Define the hierarchy (H1 → H2 → body → CTA)
- Sketch the layout as a grid (Mermaid or table)
- Validate the chosen Surface-mode
- List the needed components

#### document
Generate `DESIGN.md` from code:
1. Read the project's CSS/Tailwind/token files via Glob + Read
2. Extract palette, typography, breakpoints, border radius
3. Write `DESIGN.md` at the root, including the `taste:` section

#### extract
Pull out reusable components:
1. Identify repeated patterns (same HTML/JSX structure ≥ 2×)
2. Propose extraction into a named component
3. Document props and variants

#### harden
UI robustness:
- Test long text (50+ characters in fields)
- Check error states (3-part message: what / why / what to do)
- Cover the empty state with 3 causes (no-data / filtered / search)
- i18n: no hardcoded text, variable length supported

For other commands (animate, colorize, typeset, layout, delight, overdrive, clarify, adapt,
optimize, onboard): apply domain-specific transformations to the designated target, relying on
`DESIGN.md` tokens if present.

### Phase 3 — 61 deterministic rules (post-edit check)

After any UI file modification, check these anti-patterns:

**AI-slop indicators (always to be banned):**
- Purple-to-blue gradient (`#7c3aed` → `#2563eb` or similar)
- Bounce / elastic easing on navigation transitions
- Dark glow (`box-shadow: 0 0 20px rgba(124,58,237,0.5)` or similar)
- Arial, Inter, or `system-ui` font with no distinct alternative defined
- Gray text on a colored background (contrast < 4.5:1)
- Pure black (`#000000`) or pure gray (`#808080`) — use tinted shades
- Card inside a card inside a card (nesting ≥ 3 levels)
- All colors saturated at 100%

**General quality:**
- Line length > 80ch (body text readability)
- Internal padding < 12px on interactive components
- Tap target < 44×44px on mobile
- Heading level skip (H1 → H3 with no H2)
- `color: gray` on a white background (#f0f0f0 or similar — insufficient contrast)
- `font-size < 14px` on informational text
- Animations with no `prefers-reduced-motion` guard
- `overflow: hidden` on containers with no scroll fallback
- Images with no `alt` (except explicit `alt=""` for decorative ones)
- Button with no `aria-label` when it only has implicit text (icon only)
- Removed focus outline with no replacement (`:focus { outline: none }`)
- `z-index > 9999` with no justification

**Floor (inspired by nutlope/hallmark, non-waivable):**
- `transition: all` — target the animated properties explicitly
- Animating `width`, `height`, `top` or `left` (expensive, jank) — prefer `transform`/`opacity`
- `overflow-x: hidden` or `100vw` on `html`/`body` — use `overflow-x: clip` instead (avoids breaking
  scroll-into-view focus)
- An eyebrow or tracked-capitals / small-caps label above a heading — labels, captions, table
  headers and tags stay in normal case, body text size
- Template punctuation: meta strings joined by middle dots, arrows glued to link text, decorative
  status dots with no function
- An invented number, testimonial, logo or logo wall — any social proof must come from real data
  supplied by the user, never generated
- A hero whose headline, one-sentence pitch and primary action don't fit visible at 1280×800
  without scrolling
- An uncapped container on large screens — at 1920px the gutters should grow, never the reading
  measure or the grid width

Each violated rule → flag with context (file, approximate line) and propose a fix.

**Suppression**: an anti-pattern can be ignored on a case-by-case basis with
`<!-- impeccable-disable <rule>: <reason> -->`.

### Phase 4 — Output

Inline report in the conversation (no file written except for `document` and `extract`).
Format: list of findings grouped by severity (critical → moderate → cosmetic) + applied or proposed
fixes.
