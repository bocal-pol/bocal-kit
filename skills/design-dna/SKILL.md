---
name: design-dna
description: >-
  Extracts, structures, and applies a design's visual DNA across 3 dimensions:
  design system (measurable tokens), design style (qualitative perception),
  visual effects (Canvas, WebGL, 3D, particles, shaders, scroll-driven,
  glassmorphism, etc.). Invoke on: "extract the style", "analyze this design",
  "tokens from screenshot", "generate from JSON", "design DNA", "design
  system from reference", "visual profile", "visual effects", "JSON style guide".
  Invoke from design-agent if a visual reference or URL is provided.
model: claude-sonnet-5
user-invocable: true
argument-hint: "[structure|analyze <url_or_image>|generate <json>|full]"
type: domain
priority: high
scope: frontend
dependencies: []
conflicts: []
---

# Design DNA

Extracts, structures, and applies a design's visual identity across 3 complementary dimensions.
Inspired by the [zanwei/design-dna](https://github.com/zanwei/design-dna) skill.

> **Boundary with `ux-designer`**: `design-dna` *reads* an existing design and extracts its spec.
> `ux-designer` *designs* from scratch. The two can chain: DNA → ux-designer.
> **Boundary with `design-system`**: `design-dna` produces the DNA JSON from a reference.
> `design-system` industrializes that JSON into maintainable tokens and components.

## Optional input (if invoked from `design-agent`)

If a visual reference (URL, screenshot, brand description) is provided:
- Skip Phase 1 and go directly to Phase 2 with the reference
- Return the Design DNA JSON + CSS custom properties

Otherwise: run from Phase 1.

## The 3 dimensions

| Dimension | What it covers | Extraction method |
|-----------|-------------------|----------------------|
| **Design System** | Measurable tokens: color, typography, spacing, layout, shape, shadow, motion | Visual sampling, ratio measurement |
| **Design Style** | Qualitative perception: mood, visual language, brand personality, composition | Impressionistic synthesis |
| **Visual Effects** | Special rendering: Canvas, WebGL, 3D, particles, shaders, scroll effects, glassmorphism | Code detection + observation |

## Workflow

### Phase 1 — Dispatch

| Argument | Behavior |
|----------|-------------|
| `structure` | Present the full DNA schema and explain the 3 dimensions |
| `analyze <url_or_image>` | Phase 2 directly with the provided reference |
| `generate <json>` | Phase 3 directly with the provided DNA JSON |
| `full` or empty | Ask about the reference via AskUserQuestion, then Phase 2 → 3 |

### Phase 2 — Analyze — DNA extraction

**If no reference is provided**, collect via AskUserQuestion:
```
Design DNA — Visual reference:

1. URL of the site/product to analyze (or describe the brand)?
2. Screenshots available? (paste or describe)
3. Dimensions to go deep on: [ ] All  [ ] Design System only
   [ ] Qualitative style only  [ ] Visual effects only
4. Target use of the DNA: [ ] New app in this style  [ ] Enrich existing DS
   [ ] Brand documentation  [ ] Compare with our current DS
```

**Extraction by dimension:**

#### Dimension 1 — Design System (measurable)

- **Color**: dominant palette by area (primary), secondary palette (support), accent (CTA). Neutral
  scale from lightest background to darkest text. Light/dark modes if detected.
- **Typography**: families (geometric, humanist, serif...), heading/body size ratios, weight, line
  height, letter-spacing.
- **Spacing**: density by element proximity, rhythm by section-gap consistency.
- **Layout**: grid (alignments), max-width, number of columns, notable asymmetry.
- **Shape**: border-radius relative to element height, presence of borders/separators.
- **Shadow/elevation**: softness, spread, layering approach.
- **Motion**: if observable — easing curves, sense of duration.

#### Dimension 2 — Design Style (qualitative)

Synthesize overall impressions:
- Mood/personality (5 adjectives)
- Genre archetype (corporate SaaS / editorial / brutalist / playful / premium / minimalist...)
- Composition strategy (symmetry vs. asymmetry, density vs. breathing room)
- Ornamentation level (minimal / balanced / rich)
- Whitespace philosophy
- Brand visual voice

#### Dimension 3 — Visual Effects (observation)

**From code**: detect `<canvas>`, WebGL contexts, Three.js/Pixi.js/GSAP/Lottie imports, GLSL
shaders, IntersectionObserver scroll triggers, SVG `<animate>`.
**From screenshots**: describe visible effects beyond standard CSS — light particles, 3D renders,
noise textures, animated gradients, parallax, cursor trails, text distortions, glassmorphic
surfaces.
**Rating**: intensity (subtle / moderate / heavy) + performance tier (lightweight-CSS /
medium-Canvas-GSAP / heavy-WebGL).

**Output — Design DNA JSON:**

```json
{
  "meta": {
    "source": "<url or description>",
    "extracted": "YYYY-MM-DD",
    "confidence": "high | medium | low"
  },
  "design_system": {
    "color": {
      "primary": "<hex>",
      "primary_hover": "<hex>",
      "secondary": "<hex>",
      "accent": "<hex>",
      "neutral_scale": ["<lightest>", "...", "<darkest>"],
      "success": "<hex>",
      "error": "<hex>",
      "warning": "<hex>",
      "dark_mode": { "bg": "<hex>", "text": "<hex>", "surface": "<hex>" }
    },
    "typography": {
      "heading_family": "<family>",
      "body_family": "<family>",
      "scale_ratio": "<1.25 | 1.333 | custom>",
      "base_size": "<16px>",
      "heading_weight": "<700>",
      "body_weight": "<400>",
      "line_height_body": "<1.5>"
    },
    "spacing": {
      "base_unit": "<8px>",
      "density": "compact | comfortable | spacious",
      "section_gap": "<px>"
    },
    "layout": {
      "max_width": "<px>",
      "columns": "<12>",
      "gutter": "<px>",
      "asymmetric": "<true|false>"
    },
    "shape": {
      "border_radius_sm": "<px>",
      "border_radius_md": "<px>",
      "border_radius_lg": "<px>",
      "border_presence": "none | subtle | pronounced"
    },
    "elevation": {
      "shadow_style": "flat | soft | hard | layered",
      "shadow_md": "<css shadow value>"
    },
    "motion": {
      "easing_default": "<cubic-bezier or name>",
      "duration_micro": "<ms>",
      "duration_standard": "<ms>"
    }
  },
  "design_style": {
    "mood": ["<adj1>", "<adj2>", "<adj3>", "<adj4>", "<adj5>"],
    "genre_archetype": "<SaaS | editorial | brutalist | premium | ...>",
    "composition": "symmetric | asymmetric | grid-driven | organic",
    "ornamentation": "minimal | balanced | rich",
    "whitespace": "tight | breathing | generous",
    "brand_voice": "<1-sentence description>"
  },
  "visual_effects": {
    "enabled": true,
    "intensity": "subtle | moderate | heavy",
    "performance_tier": "lightweight | medium | heavy",
    "effects": {
      "particles": { "enabled": false, "library": null },
      "webgl_3d": { "enabled": false, "library": null },
      "scroll_driven": { "enabled": false, "type": null },
      "glassmorphism": { "enabled": false },
      "gradient_animated": { "enabled": false },
      "cursor_effects": { "enabled": false },
      "svg_animation": { "enabled": false },
      "noise_texture": { "enabled": false },
      "gsap": { "enabled": false, "plugins": [] },
      "lottie": { "enabled": false },
      "canvas_generative": { "enabled": false }
    },
    "composite_notes": "<observations that can't be codified>"
  }
}
```

### Phase 3 — Generate — Applying the DNA

From the DNA JSON + provided content:

**1. Build CSS Custom Properties from `design_system`:**

```css
/* Design DNA — Custom Properties */
:root {
  /* Colors */
  --color-primary: <hex>;
  --color-primary-hover: <hex>;
  --color-secondary: <hex>;
  --color-accent: <hex>;
  --color-neutral-50: <hex>;
  --color-neutral-900: <hex>;
  /* Typography */
  --font-heading: '<family>';
  --font-body: '<family>';
  --text-base: <px>;
  --text-h1: <px>;
  --text-h2: <px>;
  --font-weight-heading: <n>;
  --line-height-body: <n>;
  /* Spacing */
  --space-unit: <px>;
  --section-gap: <px>;
  /* Shape */
  --radius-sm: <px>;
  --radius-md: <px>;
  --radius-lg: <px>;
  /* Motion */
  --ease-default: <cubic-bezier>;
  --duration-micro: <ms>;
  --duration-standard: <ms>;
}
```

**2. Guide subjective decisions from `design_style`:**
- Mood → copywriting tone, illustrations, iconography
- Archetype → information density, layout patterns
- Composition → symmetric grid vs. offset components
- Ornamentation → level of component detail

**3. Implement `visual_effects` with the matching technology:**

| Tier | Technology | Use case |
|------|-------------|-------------|
| Lightweight | CSS animations, SVG, vanilla JS | hover, transitions, loading states |
| Medium | Canvas 2D, GSAP, Lottie | scroll-driven, parallax, orchestrated micro-anim. |
| Heavy | Three.js, GLSL shaders, Pixi.js | 3D scenes, particles, post-processing |

**4. Deliverable**: self-contained HTML output with inline CSS/JS by default.
If invoked from `design-agent`: return only the Design DNA JSON + CSS variables.

**⚠️ Rule**: fetch real assets from the source URL when possible. Never recreate/approximate an
image that can be loaded directly.

### Phase 4 — Conditional persistence

- **If invoked from `design-agent`**: return artifacts in Markdown/JSON — don't write a file.
- **If invoked standalone**:
  1. Write `design/design-dna/YYYY-MM-DD_<source-slug>_dna.json`
  2. Write `design/design-dna/YYYY-MM-DD_<source-slug>_tokens.css`

### Phase 5 — Memory

> ⚠️ Skip if invoked from `design-agent`.

Record in `<project>/.claude/design-knowledge.md`:
- Analyzed source and date
- Extracted dimensions (reliability)
- Detected visual effects
- Key retained tokens
