---
name: format-patent
type: format
category: technical-product
tags: [technical, patent, line-art]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# Patent drawing

## Effect
Official patent-style drawing in black-and-white ink, hatching, numbered views.

## Imposed structure (non-negotiable)
- White background, thin black lines only
- Technical hatching for curved surfaces
- Numbered callouts connected by thin leader lines
- Views labeled "FIG. 1", "FIG. 2", etc.

## Positive Prompt (English skeleton)
`patent drawing of {{subject}}, black ink line art on white background, technical hatching for
curved surfaces, multiple numbered views labeled FIG. 1 and FIG. 2, numbered callout leader
lines, official patent illustration style`

## Negative Prompt
`color, photographic, shading gradients, watermark, blurry`

## Variables to collect
1. Exact subject?
2. Number of views (FIG.) to produce?

## Combinable with
- `blueprint`, `explodedview`

## Example
Subject "zipper mechanism" → FIG.1 overview, FIG.2 slider detail.
