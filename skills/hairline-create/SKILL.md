---
name: hairline-create
description: "Draws an isometric line-art figure that responds to the cursor, in the style and on the engine of @lucasmarkes/hairline (vendored in this skill, integrity verified by SHA-256 hash), delivered as a single standalone HTML file. Auto-invoke on mention of: Hairline figure, interactive isometric illustration, visual that responds to the cursor, create a Hairline figure."
argument-hint: "[idea]"
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Hairline — create a figure

Draws a figure in the Hairline style: an isometric line drawing built from rounded solids in a
single trace, that responds to the cursor. Delivered as a single HTML file with nothing to install.

**Origin and audit**: this skill vendors the engine and scripts from the
[`bocal-pol/hairline`](https://github.com/bocal-pol/hairline) project (a fork of
`lucasmarkes/hairline`, MIT). Before integration, every executable file (`kernel.js`, `build.mjs`,
`validate.mjs`, `read.mjs`, `look.mjs`) was audited line by line: no outgoing network request, no
`eval`/`Function()` on dynamic content, the only subprocess launched is `npm install
playwright-core` (a test tool, never run with user content) and `node --check` (local syntax
validation). A source SVG is rendered with `javaScriptEnabled: false, offline: true` — a booby-trapped
SVG cannot execute a script. `validate.mjs` itself forbids any generated figure from any network
access, `eval`, storage, or cookies.

You write exactly one thing: the figure. The engine (`kernel.js`) and the page (`bench.html`) are
frozen. Never edit them, never paste a modified copy of them, never rewrite what the engine already
provides.

**Engine integrity**: `kernel.js` carries a SHA-256 hash of its own content on its first line.
`validate.mjs` recomputes this hash on every validation and rejects any page whose kernel has been
altered. Never modify `kernel.js`: if an engine change is needed, it comes from a vendored update
from the source repo, never from a local edit.

All files referenced below are in this skill's folder. The figure and the page are written into the
user's working directory: run `build.mjs`, `validate.mjs`, and `look.mjs` from that directory, by
their path into this folder.

## Optional input (if invoked from team-dev or an agent)

- `idea`: a one-sentence description of what the figure should represent and what the cursor should
  trigger on it.
- `--source <file.svg>`: if the user provides an existing SVG logo/icon, see step 0.

## 0. Source (only if the request comes with an `.svg` file)

Run `node read.mjs <file.svg>`: it writes the image and a sheet of what it measured, into the
working directory. Then read `source.md` and answer its questions. The object and its parts are
then fixed: every concept in step 1 keeps them.

## 1. Concept

Read `concepts.md` (one section for starting from a blank slate, one for a figure drawn from a
logo). Then propose two or three concepts, one line each:

> **Name.** The object. What the cursor does to it. What the read-out says. Where the guided tour
> stops.

Wait for the user to choose. Skip this step only if the object and the gesture are already given.
With no one to ask, take the concept with the strongest rest pose and say so.

With a source (step 0), every concept keeps the object and its parts: they only differ by the
gesture, or by the shape and the reader if the gesture was already given.

One figure, one idea. A concept that needs a label to be understood isn't one yet.

## 2. Construction

1. Read `rules.md`. The ten rules aren't advice: a figure that breaks one isn't finished.
2. Read the index at the top of `kernel.js` (the comment under the hash line, up to `var HL`). It
   lists everything that can be called. Don't read the code below it.
3. Read the example closest to the concept: `examples/terrain.js` for a continuous field,
   `examples/riffle.js` for discrete items.
4. Write the figure as `<name>.js` in the working directory, following the examples' model: take
   what's needed from `HL`, define `mount({ stage, svg, read }, value)` that returns
   `{ set, destroy }`, and end the file with `hairline({ name, means, rules, range, tour, mount })`.
   - `name`: lowercase, one word or hyphenated.
   - `means`: one sentence, 140 characters max, stating what the figure shows.
   - `rules`: the numbers of the rules the figure relies on most.
   - `range`: the single number the cursor drives, at intensity 0, 0.5, and 1 — the middle is the
     default value, and all three move in the same direction.
   - `tour`: three to six `[x, y]` points of the viewBox that the invisible cursor visits when the
     page plays on its own, or `null`. The figure never plays itself: it's the page's play button
     that does.
5. Assemble: `node build.mjs <name>.js` writes `hairline-<name>.html`.

## 3. Verification

1. `node look.mjs <name>.js --answer x,y,z --edge x,y,z [--source <file.svg>]` — builds the page,
   validates it, takes eight shots on a sheet, and checks the framing, the reader, and the console.
   Fix every flagged failing line and rerun until exit 0.
2. Read `look.md`, then the sheet, and answer its questions. Fix whatever fails, go back to step 1.

`look.mjs` needs a browser and installs `playwright-core` once, outside this folder. Without a
browser, verify with `node validate.mjs hairline-<name>.html` after each build.

Never deliver a page the validator rejects.

## 4. Delivery

Publish `hairline-<name>.html` via the Artifact tool if possible. Otherwise, leave the file where
the user can open it and say where it is. Then state, one line each:

- the metaphor: the object, and what the cursor does to it;
- the rules the figure relies on;
- the guided tour: its stops, in order;
- what couldn't be verified (no Node, no browser), explicitly.

## 5. Adjustment

When the user asks for a change, edit only `<name>.js`, then rerun `look.mjs` and read the new
sheet.

## ⚠️ Fallback

- Node missing → `build.mjs`/`validate.mjs`/`look.mjs` can't run; display
  `⚠️ Node.js required for hairline-create` and stop.
- `look.mjs` can't install `playwright-core` (network unavailable) → fall back to
  `node validate.mjs` and explicitly flag that no visual check took place.
- `kernel.js` flagged as altered by `validate.mjs` → never fix the hash yourself; flag
  `⚠️ kernel.js corrupted — re-vendor from bocal-pol/hairline` and stop.
