---
name: slop-score
description: "Score the AI-slop level of a frontend from 0 to 100, read-only: 17 patterns with fixed points, each proved by file and line, a verdict by band, and a before/after mode to measure an anti-AI cleanup. Auto-invoke on: slop score, does it look AI-made, rate my site, my site looks generated, measure the gain of an anti-AI audit, AI-slop score. Never edits a file; to fix, use impeccable, taste or design-agent."
model: claude-haiku-5-5
user-invocable: true
argument-hint: "[path] [before|after]"
type: utility
priority: medium
scope: frontend
dependencies: []
conflicts: []
---

# slop-score — Measure the AI slop of a frontend

> The scoring table comes from gabrielle-pch/reslop (MIT licence), through the fork
> bocal-pol/reslop. The upstream project is a parody that *makes* slop. This skill keeps only its
> detection table.

Read-only. Do not edit any file. This skill measures; it does not fix. Fixing belongs to
`impeccable` (rules), `taste` (direction) or `design-agent` (Anti-AI Audit mode).

## Proof rule

A pattern counts only if you can name the file and the line where you saw it. No file named means
0 points. You score the **source code**, not the render. Do not make a claim about how the page
looks unless you really rendered it (Playwright). If you read only code, say so in the report.

## Optional input (when called from `design-agent`)

`design-agent` sends the list of UI files found in Phase A2. At the end of the work it asks for a
second measure (`after`). If a list is given, scan only those files. Return only the score table
and the verdict (the caller builds the final report). Do not persist anything: return the score in
the answer and write no file.

## Procedure

1. **Scope**: pages, components, styles and copy that a user can see. Exclude `node_modules/`,
   `vendor/`, `dist/`, `build/`, `*.test.*` and this skill.
2. **Detect** each pattern of [`references/rubric.md`](references/rubric.md). Use a targeted Grep,
   then Read to confirm the context. A `backdrop-blur` on an opaque surface is not glass.
3. **Add** the points of the proved patterns. Maximum: 100.
4. **Recognize the dominant flavor** with [`references/flavors.md`](references/flavors.md). The
   table is calibrated on the "Indigo SaaS" flavor. A Terminal, Neo-brutalist or Warm editorial
   site can be as generic and still score lower. If the flavor is not Indigo SaaS, say so and list
   the cross-flavor "tells" found. Do not add points for them.
5. **Verdict** from the band, then the report.

## Before / after mode

- `before` (default): produce the reference score. Keep it in the answer.
- `after`: repeat the same detection, then show the change for each pattern:

```text
SLOP SCORE (before → after)

Slop Score: 64 → 18   (-46)

✓→✗ Purple gradients      10 → 0   app/page.tsx:42 removed
✓→✓ Inter or Geist         6 → 6   app/layout.tsx:3 (kept, justify in DESIGN.md)
```

A pattern kept on purpose is not an error. It must appear in `DESIGN.md` (for example a font that
the brand guide requires).

## Report format

All patterns, the found ones first:

```text
SLOP SCORE

Slop Score: 64/100

✓ Purple gradients      10   app/page.tsx:42
✓ Gradient text          8   app/page.tsx:18
✓ Inter or Geist         6   app/layout.tsx:3
✗ Infinite marquee       0
✗ Italic serif accent    0

Flavor recognized: Indigo SaaS
Verdict: Generic SaaS. Your visitors have seen this site before.
```

Add one line "Code read, nothing rendered" when no page was opened in a browser.

## ⚠️ Fallbacks

- Grep not available: read the style and page files one by one and say so.
- No UI file found: answer "No frontend detected in this scope" and give no score.
- Site rendered on the server with no source access: do not score. Ask for the repository.

## What this skill does not do

- Fix anything (read-only).
- Judge design quality. A low score does not prove that a site is good. It proves that the site
  has few known markers.
- Replace `impeccable`. Its binary rules stay the quality gate. This skill gives a number that you
  can compare over time.
