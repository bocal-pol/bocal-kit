---
name: ux-details-audit
description: "Hunt for small UX defects on a rendered interface (edges, touch targets, line wraps, icons, overflows, labels): measure the DOM at 390 and 1440 px with Playwright, judge each candidate on a screenshot, rank the findings. Auto-invoke on: small UX defects, finishing touches, interface details, review of the rendered result before delivery, pixel-perfect."
model: claude-sonnet-5-5
user-invocable: true
type: domain
priority: high
scope: frontend
dependencies: []
conflicts: []
argument-hint: "[url|static] [screen or journey]"
---

# UX Details Audit — Small defect hunt

Check the **real rendering** of an interface and report the defects that an exacting designer would send back with "what is this?": a dot off its avatar, a unit alone on its line, a text that touches the edge of its card. Prove each defect **on a screenshot**, never from the code alone.

> Method inspired by the "film" check of the Stageshow skill by Benji Taylor (MIT licence, see `CREDITS.md`): detectors that measure CSS boxes, then a human eye that decides on the image. Here it is adapted to real interfaces instead of interface illustrations.

> **Boundary with `ux-designer`**: `ux-designer` designs (specs, wireframes). `ux-details-audit` checks the built result, or the spec when nothing is rendered yet (static mode).
> **Boundary with `impeccable`**: `impeccable` applies style rules (AI-slop, contrast, gradients) to code and artifacts. `ux-details-audit` measures what the browser really draws.
> **Boundary with `accessibility-lead`**: the detector finds obvious a11y defects (field without a label, control without a name, touch target) but does not replace the full WCAG audit (axe-core, screen reader, contrast).
> **Boundary with `frontend-agent`**: this skill does not fix. It returns a ranked list; the code is fixed through `frontend-agent`.

## Optional input (if invoked from `design-agent` or `frontend-agent`)

If the URL (or the dev server), the screens to cover and the surface mode are passed: skip Phase 1 and start at Phase 2. If only `ux-designer` specs are passed: static mode. Otherwise: run from Phase 1.

## Workflow

### Phase 1 — Target and mode

Decide without asking when the context gives the answer:
- **Rendered mode**: a URL or a dev server is reachable → Phases 2 to 6.
- **Static mode**: only specs, wireframes or code exist → Phase 4 alone, applied to the specs, plus a `Grep` of the code (exclusions `node_modules/`, `vendor/`, `*.test.*`).
- Screens and states to cover: at least the main screen, one empty state, one error state. If the scope is not clear → ask the user.

**⚠️ Fallback**: if the Playwright MCP is unavailable → static mode, and say so: `⚠️ Playwright unavailable — static audit only, nothing is measured on the rendering`.

### Phase 2 — Measure (rendered mode)

For each screen and each width **1440** (desktop) then **390** (mobile):
1. `browser_resize` to the width, `browser_navigate` to the screen, wait until the content is settled (`browser_wait_for`).
2. Read `~/.claude/skills/ux-details-audit/scripts/ux-details.js` and pass its content **as is** as the `function` parameter of `browser_evaluate`. The script does not change the page; it returns `counts` and `findings` (`kind`, `el`, `detail`).
3. `browser_take_screenshot` of the full screen, at the same width.
4. For a state that needs an action (open menu, form error): reach it with Playwright, then run the script again.

### Phase 3 — Judgment on screenshot

A script finding is a **candidate**, not a verdict: it measures CSS boxes, not taste.
- Look at the screenshot where the script points. The defect is confirmed, intentional (platform convention, iMessage blue, a tight chip on purpose) or a false positive.
- A candidate judged intentional goes in the report with its screenshot and its reason. Never make it disappear by hiding the element or by changing a threshold.
- A defect that the script does not report but that you see on the screenshot is a finding like the others.

### Phase 4 — Exacting-eye pass

What the script does not measure, to review on the screenshots (or on the specs in static mode):

| Area | Question |
|---|---|
| Hierarchy | One main action per screen (ADR 0068)? Never two buttons of equal weight side by side? |
| Feedback | A click reacts in under 100 ms, a long task shows its progress, a success is confirmed (ADR 0071)? |
| Reversibility | A reversible action = toast with Undo, not a modal (ADR 0011)? A cascade delete = real names listed (ADR 0012)? |
| States | Empty, loading (skeleton at the content's geometry), error (3 elements: what, why, what to do)? |
| Input | No data requested that is already known (ADR 0013)? A specialized component rather than a text field? |
| Alignment | Even inner margins, icon centered in its button, text on the same baseline as its neighbor? |
| Icons | One family (Lucide), same stroke weight, no invented logo (a letter in a colored square)? |
| Keyboard | `Tab` follows the visual order, focus visible everywhere? (full audit: `accessibility-lead`) |
| Density | No void under a list, no row three times taller than its text? |

### Phase 5 — Fresh-eye review (optional)

Costly: run it only if the user asks or if the delivery is important. Launch **one** sub-agent and give it only the screenshots, the URL and the Phase 4 grid — never the builder's reasoning nor the Phase 3 list. Instruction: "Fix nothing. For each defect: the screenshot, the reason, the fix in one line. Say what you could not check." Compare its list with yours and justify each difference.

### Phase 6 — Report

List **ranked by the share of the screen that it spoils**, not by ease of fix: layout (overflow, edge, cut), hierarchy and density, interaction and states, finishing touches (icons, orphans, units).

```markdown
## UX details audit — [screen / journey]
Widths: 1440, 390 | States covered: [list] | Script: N candidates, M confirmed

### 1. [Defect title] — [width] — Serious | Medium | Minor
- Where: [element or selector] — screenshot: [file]
- Seen: [what you see]
- Fix: [one line]

### Judged intentional
[candidate → screenshot → reason]

### Not checked
[what was not looked at: hover, focus, animation, other widths, states not reached]
```

Rules: "nothing to report" is written only with the list of the screens, widths and states that were really looked at. Never "clean" with a defect left. Always say what was not looked at.

### Phase 7 — Conditional persistence

- **If invoked from `design-agent` or `frontend-agent`**: return the report as Markdown, without writing a file.
- **If invoked standalone**: create `design/ux-details-audit/` if absent, then write `design/ux-details-audit/YYYY-MM-DD_ux-details-audit.md`.

### Phase 8 — Memorization

> ⚠️ Skip if invoked from `design-agent`.

Write in `<project>/.claude/design-knowledge.md`: the recurring defects of the project (for example "icon buttons are 32 px") and the conventions judged intentional, so they are not proposed again.

## What the script detects

`scripts/ux-details.js` measures the candidate families below, one row per `kind`.

| `kind` | Detects | What to do |
|---|---|---|
| `horizontal-scroll` | The page overflows in width | Find the element that is too wide (the script names three), constrain it; 16 px gutter |
| `touch-target` | Control under 44 px (mobile) or 24 px (desktop, WCAG 2.5.8) | Enlarge the clickable area, not necessarily the icon |
| `small-text` | Text under 12 px | Raise the size, or remove the text if it is not useful |
| `clipped-text` | Text cut without an ellipsis or `line-clamp` | Ellipsis or line wrap; never cut silently |
| `text-touching-edge` | Text within 5 px of its card edge, or 8 px of the page edge | 12 px inner margin (8 px when dense), page gutter |
| `text-spill` | Text wider than its surface | Width, line wrap or ellipsis |
| `uneven-padding` | Left and right padding of a control differ by more than 2 px | Equalize, unless a chevron or icon on one side is intended |
| `unit-wrapped` | Number and unit split by a line break | Non-breaking space between the number and the unit |
| `orphan-word` | Short word alone on the last line | `text-wrap: balance` (headings) or `pretty` (paragraphs) |
| `emoji-icon` | Emoji used as an interface icon | Lucide icon; the emoji stays for messages and reactions |
| `clipped-glyph` | SVG icon stroke that goes past its `viewBox` | Fit the stroke inside the `viewBox` or use the Lucide icon |
| `dead-link` | `href="#"`, empty or `javascript:` | A real target, or a `button` if it is an action |
| `unlabeled-field` | Field without a label (the placeholder is not one) | Visible `label` or `aria-label` |
| `unnamed-control` | Icon button or link without an accessible name | Explicit `aria-label` |
| `image-unsized` / `layout-shift` | Image without dimensions; cumulative shift > 0.1 | `width` and `height` or `aspect-ratio`; reserve the space |

**Limits, to state in the report**: the script measures CSS boxes, not the optical centering of a glyph nor visual balance; it tests no hover, focus, animation or contrast; `layout-shift` only sees what happened before the call. A threshold is never tuned to make a screen pass.

## Anti-patterns

- Declaring a screen clean without having looked at it on a screenshot.
- Making a candidate disappear by hiding the element instead of fixing the cause.
- Ranking the findings by ease of fix.
- Fixing the code from this skill: it audits, `frontend-agent` fixes.
- Running Phase 5 by reflex: a sub-agent bills its own context window.
