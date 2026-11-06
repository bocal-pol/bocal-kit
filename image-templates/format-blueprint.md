---
name: format-blueprint
type: format
category: technical-product
tags: [technical, engineering, plan]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# Blueprint — Technical plan

## Effect
Turns the subject into an engineering blueprint: orthographic views, dimensions, title block, blue plan background.

## Imposed structure (non-negotiable)
- Blueprint-blue background with fine grid
- White lines/thin strokes, dimension lines with arrows
- Title block bottom right (fictional name/scale/date)
- Front view + side view minimum, top view if relevant

## Positive Prompt (English skeleton)
`technical blueprint drawing of {{subject}}, orthographic front and side views, white line art
on blueprint blue background, dimension lines with arrows and measurements, parts list, title
block bottom right, engineering schematic style, precise linework, high detail`

## Negative Prompt
`color photo, realistic shading, watermark, signature, blurry, low detail lines, no dimensions`

## Variables to collect
1. Exact subject (object/character/place)?
2. Desired number of views (2 or 3)?

## Combinable with
- Technical formats: `turnaround-360`, `specsheet`
- Palette modifiers discouraged (the blue background is non-negotiable)

## Example
Subject "electric folding bike" → 3-view plan with frame dimensions, title block "MODEL EB-01".
