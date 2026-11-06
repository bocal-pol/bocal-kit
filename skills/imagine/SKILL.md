---
name: imagine
description: "High-quality image generation via Hugging Face Z-Image-Turbo: wave-based interview, personal templates (characters/styles), + a bundled catalog of 27 structural formats (blueprint, xray, explodedview, infographic, tinyworkers...) and ~290 aesthetic modifiers (ghibli, cyberpunk, watercolor...), combinable with each other. Auto-invoke on: generate an image, illustration, visual, concept art, image template, image prompt, character sheet, Z-Image, blueprint, xray, infographic."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[quick|deep|template <name>|list-templates|format <name>|list-formats|modifier <name>|list-modifiers [category]]"
type: specialized
priority: high
scope: cross
dependencies: []
conflicts: []
---

# imagine — High-quality image generation (Claude Code)

An extreme prompt-crafting skill for generating very high-quality images. Interviews the user in
successive waves (up to 15 questions) to extract the exact intent, then generates the image via HF
(Z-Image-Turbo, free), or provides a copy-paste prompt if HF is unavailable.

Three template families coexist in `~/.claude/image-templates/`:
- **Personal** (`character`/`style`/`scene`/`pack`, no prefix): created by the user, to replay a
  character/style/mood (character-consistent).
- **Bundled formats** (`format-*.md`, reserved prefix): ~27 structural templates shipped with the
  skill, imposing a precise layout (exploded view, X-ray, technical blueprint, handwritten notes,
  tiny workers...).
- **Bundled modifiers** (`modifiers-*.md`, reserved prefix): ~19 catalogs (~290 entries) of pure
  aesthetic keywords (style/medium/mood), organized by category.

Formats and modifiers can be combined with each other and with a personal template in the same
prompt.

## Directives — Non-negotiable

| # | Rule |
|---|---|
| 1 | **Never generate automatically.** Always present the final prompt, wait for user validation before generating (CLAUDE.md rule). |
| 2 | **Interview first, prompt second.** In `deep` mode, waves aren't skipped without explicit consent. In `format`/`modifier` mode, only the loaded template's variables are asked (Phase 2bis) — never the full interview. |
| 3 | **Every final prompt = saved seed + params** for later rerolling, even if the user doesn't save a template. |
| 4 | **Personal templates are versioned.** If a template already exists, propose `<name>-v2.md` or an appended `## History` section. Never a silent overwrite. |
| 5 | **Backends**: 1) **HF `hf-image`** (free, default) → `mcp__hf-image__gr1_z_image_turbo_generate` (inline rendering); 2) **prompt-only** if HF is unavailable. |
| 6 | **Templates stored in `~/.claude/image-templates/`** — a global folder shared by all Claude Code projects. |
| 7 | **`format-` and `modifiers-` prefixes are reserved** for the skill's bundled files. A personal template must never start with these prefixes (avoids any collision). |
| 8 | **English** in all questions and deliverables; positive/negative prompts and format/modifier fragments stay in English (better rendering on the engines). |

## Selection log

Before entering the workflow, emit:

```yaml
# [SKILL-SELECT]
skill:      imagine
score:      92
reason:     "explicit request for image generation or a visual prompt"
matched_by: explicit
fallback:   false
```

## Workflow

### Phase 1 — Input dispatch

Read the argument passed via `argument-hint`.

| Argument | Behavior |
|---|---|
| *(empty)* or `deep` | Long wave-based interview (Phase 2) → recommended default. |
| `quick` | Short interview: 5 grouped questions (Intent + Subject + Style + Composition + Ratio) → go directly to Phase 3. |
| `template <name>` | Load `~/.claude/image-templates/<name>.md` (a **personal** template), present the character/style, ask for the desired variation (context, action, angle), go to Phase 3 inheriting the visual DNA. |
| `list-templates` | `Glob` on `~/.claude/image-templates/*.md` **excluding** `format-*.md` and `modifiers-*.md`, show a table (Name / Type / Last updated) of **personal** templates only. Stop here. |
| `format <name> [subject]` | Load `~/.claude/image-templates/format-<name>.md`. If `subject` is given inline, keep it; otherwise ask the file's "Variables to collect" in Phase 2bis. |
| `list-formats` | `Glob` on `~/.claude/image-templates/format-*.md`, read each file's frontmatter (`category`), show a table grouped by category (technical-product / pedagogy-diagram / note-annotation / staged-scene). Stop here. |
| `modifier <name> [subject]` | `Grep` the `<name>` slug across all `~/.claude/image-templates/modifiers-*.md`, retrieve the row (effect + prompt fragment). If `subject` is given inline, keep it; otherwise ask a short question about the subject in Phase 2bis. |
| `list-modifiers [category]` | With no argument: `Glob` on `modifiers-*.md`, show the list of categories with a row count. With an argument: show the full table of `modifiers-<category>.md`. Stop here. |
| `format <name1> modifier <name2> [subject]` | Explicit combination: load the format and the modifier, merge in Phase 3 (see that phase). |
| `<slug>` (shorthand, e.g. `blueprint my bike`) | If the first word exactly matches a `format-*.md` slug or a row in a `modifiers-*.md`, route as `format <slug> [rest]` or `modifier <slug> [rest]` respectively. If several bundled slugs follow each other at the start of the argument (e.g. `blueprint cyberpunk my bike`), load them all and treat the rest as the subject. |

### Phase 2 — Wave-based interview (`deep` mode)

Each wave is a grouped `AskUserQuestion` block. At the end of wave A, if the user chooses "let you
decide," **skip waves D-F** and go directly to Phase 3 with documented default values.

**Wave A — Intent** (3 grouped questions)
1. Target use? *(article illustration / character avatar / TTRPG card / concept art / poster /
   social media / other)*
2. Audience and tone? *(general public / technical niche / children / adult audience)*
3. Desired control level? *(I describe everything precisely / I let you decide the details / in
   between)*

**Wave B — Subject** (3 grouped questions)
1. Main subject: describe in 1-2 sentences (who / what / notable characteristics).
2. Action, pose, expression?
3. Secondary subjects, outfit, accessories, held objects?

**Wave C — Visual style** (3 grouped questions)
1. Medium and rendering? *(realistic photo / digital illustration / oil painting / watercolor /
   cel-shading anime / 3D render / pixel art / other — or a bundled modifier, see
   `list-modifiers`)*
2. Artistic reference or school? *(artist name, movement, film, game, manga artist…)*
3. Level of detail and palette? *(hyper-detailed / simple stylized / dominant palette or colors to
   avoid)*

**Wave D — Composition** (3 grouped questions, *skippable*)
1. Framing? *(close-up / medium shot / full body / wide / bird-eye / low angle / dutch angle)*
2. Simulated focal length and depth of field? *(35mm wide / 85mm portrait bokeh / macro / 24mm
   wide-angle)*
3. Dominant composition rule? *(rule of thirds / symmetric centering / leading lines / golden
   spiral)*

**Wave E — Light & mood** (3 grouped questions, *skippable*)
1. Direction and hardness? *(rim light / soft ambient / harsh sunlight / chiaroscuro / rembrandt)*
2. Color temperature and time of day? *(golden hour / blue hour / harsh midday / neon night /
   neutral studio)*
3. Overall mood in 3 words?

**Wave F — Technical constraints** (2 grouped questions, *skippable*)
1. Ratio and orientation? *(1:1 / 3:2 / 16:9 / 9:16 / 2:3 portrait)*
2. Elements to strictly forbid (negative prompt)? *(deformed hands, text, watermark, multiple
   faces, etc.)*

### Phase 2bis — Short interview (`format`/`modifier` mode)

Triggered as soon as one or more formats/modifiers are loaded (Phase 1). Fully replaces Phase 2 for
this turn.

1. Load the relevant file(s) (`format-<name>.md` and/or `modifiers-*.md` row(s)).
2. Group all their "Variables to collect" sections (dedupe if several formats share a similar
   question like "exact subject").
3. Ask these questions in **a single grouped wave** via `AskUserQuestion`. Always add an option
   "Also customize the staging (composition/light)" — if chosen, chain into waves D-F of Phase 2
   before Phase 3; otherwise, the structure/style imposed by the template(s) stays untouched.
4. **Never** re-ask style/medium/palette questions already fixed by an active modifier, nor the
   structure already fixed by an active format.
5. Go to Phase 3.

### Phase 3 — Prompt synthesis

Produce a structured block:

```markdown
## Candidate prompt — [short title]

**Positive** (structured tokens-first):
`[main subject], [subject details], [action/pose], [style/medium], [artistic reference],
 [composition/framing], [light/mood], [palette], [technical details], [ratio]`

**Negative**:
`[list of Wave F exclusions + defaults: lowres, bad anatomy, extra fingers,
 watermark, signature, jpeg artifacts, blurry, deformed]`

**Suggested params**:
- Ratio: `[value]`
- Guidance / CFG: `[value]`
- Steps: `[value]`
- Seed: `[to generate randomly or inherit from the template]`

**Ready-to-paste variants**:
- Midjourney v6+: `[compact reformulation + --ar --stylize]`
- Flux (dev/schnell): `[rich natural-language phrase]`
- SDXL: `[comma-separated tokens]`
```

**If a format and/or a modifier are active** (Phase 1/2bis), build the **Positive** prompt as
follows:
1. Start from the active format's "Positive Prompt (English skeleton)", substitute `{{subject}}`
   with the collected subject — enriched, if a personal `character`/`style` template is also
   combined, by its "Visual DNA"/"Positive Prompt" instead of a raw subject description.
2. Append each active modifier's prompt fragment(s) at the end of the chain (the "Prompt fragment"
   column of the `modifiers-*.md` files).
3. The **Negative** = the union of the active format's "Negative Prompt" + the global defaults +
   the combined personal template's negative, if any.
4. If no format is active but a modifier is, insert its fragment into the Style/Medium slot of the
   standard Phase 3 skeleton (subject comes from Wave B or the inline argument).

### Phase 4 — Image generation

Ask for validation before generating (Directive 1). Then, **in order — the first available backend
wins**:

1. **HF `hf-image` (free, default)** — call `mcp__hf-image__gr1_z_image_turbo_generate` with:
   - `prompt` = Phase 3 positive prompt (append the negative's exclusions at the end as "Avoid:
     …")
   - `resolution` = the value matching the chosen ratio (e.g. `1248x832 ( 3:2 )`, `832x1248 ( 2:3
     )`, `1280x720 ( 16:9 )`, `720x1280 ( 9:16 )`)
   - `steps` = 8 (Z-Image-Turbo default)
   The image comes back as **inline rendering + URL**. Note the returned **seed** (for coherent
   rerolling).
   ⚠️ Anonymous HF = limited ZeroGPU quotas; an `HF_TOKEN` (hf.co/settings/mcp) raises the limits.

2. **Prompt-only (fallback)** — if `hf-image` is unavailable: display the Phase 3 block to paste
   into Midjourney / Flux / SDXL / ComfyUI.

### Phase 5 — Saving a personal template (optional)

Ask via `AskUserQuestion`: "Save this character/style as a reusable template?" (yes / no /
yes-but-update-an-existing-one). Applies only to **personal** templates — bundled formats/modifiers
are never saved from this flow (they're files versioned with the skill).

**If yes**:
- Ask for the slug (kebab-case) — refuse a slug starting with `format-` or `modifiers-` (reserved
  prefixes, Directive 7).
- Check via `Glob` whether it already exists — if so, propose `-v2` or append to the `## History`
  section.
- Write `~/.claude/image-templates/<slug>.md` per the "Personal templates" schema below.

### Phase 6 — Fallback

If `AskUserQuestion` isn't available (non-interactive mode): switch to implicit `quick` mode with
the following defaults → Intent: general illustration · Subject: extracted from the user's message
· Style: detailed digital illustration · Composition: rule of thirds, medium shot · Light:
cinematic soft · Ratio: 3:2.

If `~/.claude/image-templates/` doesn't exist, or the bundled `format-*.md`/`modifiers-*.md` files
aren't synced there yet (the `bocal-kit` repo not yet pulled): silently fall back to classic
`deep`/`quick` mode (Phase 2), and for `list-templates`/`list-formats`/`list-modifiers` create the
folder + its `README.md` if absent (content documented in
`~/.claude/image-templates/README.md` if present, otherwise a minimal stub).

## Formats & modifiers — catalogs

### Bundled formats (`format-<slug>.md`) — 27, across 4 categories

| Category | Slugs |
|---|---|
| `technical-product` | explodedview, blueprint, crosssection, xray, turnaround-360, knolling, wireframe, patent, isometric, specsheet |
| `pedagogy-diagram` | anatomy, infographic, diagram, mindmap, flowchart, timeline, comparison, beforeafter, dashboard |
| `note-annotation` | handwritten, stickynotes, storyboard, comic |
| `staged-scene` | tinyworkers, figurine (+ actionfigure/funko/toybox variants), lego, miniature |

### Bundled modifiers (`modifiers-<category>.md`) — 19 catalogs, ~290 entries

`art-drawing` · `animation-cartoon` · `retro-futuristic` · `modern-design` · `fantasy-mythology` ·
`nature-space` · `architecture-interior` · `photography` · `materials-textures` ·
`light-cosmos` · `scifi-robots` · `gaming-pixel` · `places-adventure` · `craft-patterns` ·
`print-branding` · `ui-tech-science` · `music-objects` · `animals` · `time-imaginary`

The slug detail for each category is in its matching file — use `list-modifiers <category>` rather
than duplicating the list here (single source of truth).

## Personal templates — file schema

Canonical structure of `~/.claude/image-templates/<slug>.md` (character/style/scene/pack, **no
reserved prefix**):

```markdown
---
name: <slug>
type: character | style | scene | pack
created: YYYY-MM-DD
last_used: YYYY-MM-DD
tags: [tag1, tag2]
compatible_with: [flux, sdxl, midjourney-v6, z-image-turbo]
---

# <Readable name>

## Identity
- Type: character | style | scene | pack
- 1-sentence description
- Intended usage context

## Visual DNA
- Medium/rendering: ...
- Dominant palette: ...
- Artistic reference(s): ...
- Non-negotiable distinctive trait: ...

## Positive Prompt (block to inherit)
`[tokens to preserve across all variations]`

## Negative Prompt (block to inherit)
`[exclusions to preserve]`

## Params
- Default ratio: ...
- CFG / Steps: ...
- Reference seed: ...
- Favorite HF Space: `<url or id>`

## Variation history
| Date | Context / action | Seed | Output URL | Notes |
|------|-------------------|------|------------|-------|
| YYYY-MM-DD | ... | ... | ... | ... |
```

## Bundled formats & modifiers — file schemas

Canonical structure of `~/.claude/image-templates/format-<slug>.md`:

```markdown
---
name: format-<slug>
type: format
category: technical-product | pedagogy-diagram | note-annotation | staged-scene
tags: [...]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# <Readable name> — <one-sentence effect>

## Effect
## Imposed structure (non-negotiable format DNA)
## Positive Prompt (English skeleton, placeholder {{subject}})
## Negative Prompt
## Variables to collect
## Combinable with
## Example
```

Canonical structure of `~/.claude/image-templates/modifiers-<category>.md`:

```markdown
---
name: modifiers-<category>
type: modifier-catalog
category: <category>
---

# Modifiers — <Readable category name>

| Slug | Effect | Prompt fragment (English) |
|------|-------|-------------------------------|
| <slug> | <1-sentence effect> | `<fragment to inject>` |
```

## Global fallback

- **`hf-image` HF unavailable** → prompt-only mode, the user copy-pastes elsewhere.
- **`~/.claude/image-templates/` absent, or `format-*`/`modifiers-*` not yet synced** →
  create/bootstrap the folder on first personal access; for a `format`/`modifier` call on a missing
  bundled file, inform the user (the `bocal-kit` repo needs pulling) and fall back to classic
  `deep` mode.
- **Skill invoked in an autonomous loop** → force `quick` with documented defaults, never block on
  `AskUserQuestion`.

## Skip memory

This skill persists **nothing** to `~/.claude/memory/` by default. The only voluntary persistence =
the **personal** template files in `~/.claude/image-templates/`, at the user's explicit request in
Phase 5. The `format-*.md`/`modifiers-*.md` files are read-only for this workflow: they're shipped
and versioned with the skill, never written from a user session.
