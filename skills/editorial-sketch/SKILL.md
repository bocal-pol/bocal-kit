---
name: editorial-sketch
description: "Generate narrative companion illustrations for an article, post, or doc: black-and-white sketch, pure white background, recurring character, a few red/orange/blue handwritten annotations, one visual metaphor per image. Auto-invoke on: article illustration, companion image, sketch, visual metaphor, illustration shot list, blog image, Notion illustration. Do not use for technical diagrams (architecture, flowchart, C4) — see the `illustre` skill for that."
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: low
scope: cross
dependencies:
  - hf-image
conflicts:
  - illustre
---

# Editorial Sketch — Narrative companion illustrations

Port and translation of the "Ian Xiaohei Illustrations" skill
([github.com/helloianneo/ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations)),
adapted to this repo's Claude Code conventions.

## Positioning

This skill designs and generates 16:9 illustrations to accompany a text (article, post, doc, Notion
page). The goal is **not** to produce a commercial illustration, a PPT infographic, or a cute
drawing, but to turn a judgment, a process, a structure, a state, or a metaphor from the text into a
hand-drawn image — clear, a bit strange, memorable.

**This is not a technical-diagram tool.** For an architecture diagram, a flowchart, a C4, or any
schema that must stay legible as technical documentation, use the `illustre` skill (Excalidraw). The
two skills are deliberately in conflict: never activate both on the same image.

The default recurring character is a small, solid black character with white dot eyes, thin legs,
and a neutral expression. It's not a mascot or a decorative sticker: it's a small, serious operator
carrying out an absurd but coherent action at the heart of the image.

In one sentence: **don't just "illustrate a text" — draw the key cognitive action it contains.**

## Good fit

- Writing articles that need companion images
- Knowledge content, methodology, AI workflows
- Turning an abstract judgment into a concrete metaphor
- A lighter, stranger, more identifiable style than a PPT infographic

## Not a good fit

- Commercial illustration, brand key visual, polished flat-design illustration
- Classic PPT infographic, complex architecture diagram, flowchart → use `illustre`
- Childish cartoon style, cute mascot, sticker style
- Compressing a long article or a whole course into a single image
- Needing a strictly editable source vector file

## What this skill produces

By default:

- A horizontal 16:9 companion illustration
- A shot list of 4 to 8 images for an article
- For each image: theme, central idea, structure type, character action, suggested annotations in
  the source text's language (English by default)
- Final PNG, saved to `assets/<article-slug>-illustrations/`

By default, this skill does NOT produce:

- PPTX / PDF / Keynote
- SVG / HTML / editable Canvas
- Commercial poster or cover key visual
- Infographic with a large block of text

## Visual style

- Pure white background — no paper texture, no beige, no shadow, no gradient
- Hand-drawn black line, thin, slightly wobbly
- Lots of white space — the main subject occupies only about 40-60% of the image
- A few handwritten annotations in red, orange, blue
- One image = one single central action, structure, state, or metaphor
- The character must take part in the central action, never remain mere decoration
- Strange, creative, clean — never twee or childish

## Read as needed

Don't load everything at once — read according to the task:

- `references/style-dna.md`: style DNA, colors, text, forbidden elements
- `references/character.md`: appearance, personality, action repertoire, character prohibitions
- `references/composition-patterns.md`: structure types, original-metaphor method, anti-copying rule
- `references/prompt-template.md`: prompt template for image-by-image generation
- `references/qa-checklist.md`: checks and iteration after generation
- `references/calling-agents.md`: list of agents/skills authorized for automatic mode (without prompt validation)
- `assets/examples/`: low-frequency visual calibration only — never copy the composition

## Image generation

This skill relies on the `hf-image` MCP (Z-Image-Turbo, see `CLAUDE.md` section
"Hugging Face — Image & video generation").

**Default mode (direct user invocation)**: never generate automatically — propose the prompt built
from `references/prompt-template.md`, then wait for explicit validation before calling the
generation tool.

**Exception — invocation from a doc or report agent**: when this skill is called by an orchestrator
agent to illustrate its user doc or consolidated report (see the list in
`references/calling-agents.md`), generation happens **without waiting for intermediate validation**
on each prompt — the calling agent already has implicit approval to produce its final deliverable.
The prompt is still built per `references/prompt-template.md`, and the shot list plus delivery
summary remain mandatory (see "Output format" section). This exception is strictly limited to this
skill and this use case; it does not change the general `CLAUDE.md` rule for other Hugging Face
skills (`imagine`, `animate`, `design-agent`, `ux-designer`, etc.), which continue to require
systematic validation.

## Workflow

### 1. Digest the text

Read the provided text, link, Notion page, Markdown file, or screenshot content. Extract:

- the central idea
- the paragraphs carrying a cognitive turning point
- the passages that would benefit from being explained visually
- the passages that should stay text-only

Don't distribute images uniformly. Prioritize "cognitive anchor points": a key judgment, two
breaking points, an input/output loop, a sorting step, a before/after, a single element reused
multiple times, a transmission path, a common trap, a character's state change.

### 2. Propose an illustration strategy first

If the user only asks to "analyze where to illustrate / think about spots needing an image",
produce a shot list. For each image, specify:

- after which paragraph to place it
- the image's theme
- the central idea
- the structure type
- what the character does in the image
- suggested elements
- suggested annotation keywords

Default 4 to 8 images. Short article: 1 to 3 images. Long article: don't exceed 9 images without
reason. Enough beats overloaded — don't turn the text into a picture book.

### 3. Image-by-image generation

If the user explicitly asks to "generate / produce / make the images", don't stop to re-confirm the
strategy itself — but **propose each prompt and wait for validation** before the MCP call (see
"Image generation" above). Generate each image separately via `hf-image`. Never assemble several
images into a single composition.

Each image tells only one central structure. The prompt must always include (see
`references/prompt-template.md`):

- horizontal 16:9 companion illustration
- pure white background
- hand-drawn black line
- a few handwritten annotations in red/orange/blue (in the source text's language)
- lots of white space
- the character as the subject of the central action
- forbidden: PPT look, commercial illustration, cute-childish, complex architecture, title in the
  top-left corner

Don't copy past compositions. The examples are only there to calibrate style density and how the
character participates — don't directly reuse a composition already seen (see
`references/composition-patterns.md`), unless the user explicitly asks to reproduce a specific
image. Each time, reinvent a strange but coherent metaphor from the current text.

### 4. Verification and iteration

After generation, check against `references/qa-checklist.md`. If there's an issue, regenerate or
locally edit, prioritizing:

- the character is purely decorative
- the image is too cluttered
- it looks too much like a flowchart / PPT
- too much text or mistakes in the annotations
- a title like "common pitfalls / workflow / architecture" appears in the top-left
- the style is too cute, childish, rigid
- the background isn't a clean white

### 5. Save and deliver

If the user is working in a project space, copy the final image into:

```text
assets/<article-slug>-illustrations/
```

Name in order:

```text
01-subject-name.png
02-subject-name.png
```

Keep the originally generated files — never overwrite an existing asset unless explicitly asked to
replace it.

## Output format

The strategy output (before generation) must be short and precise. The delivery after generation
must state:

- how many images were generated
- the purpose of each
- the save path
- which images are the strongest, which are optional

Don't produce a long theoretical explanation about the style — let the images speak.
