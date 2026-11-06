---
name: format-xray
type: format
category: technical-product
tags: [technical, radiograph, triptych]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# X-ray

## Effect
Triptych: normal subject / translucent X-ray view / internal-detail close-up, high-contrast black background.

## Imposed structure (non-negotiable)
- 3 side-by-side panels
- Center panel in blue/white X-ray style radiograph
- Right panel in macro close-up on one internal detail
- Black background, high contrast

## Positive Prompt (English skeleton)
`triptych of {{subject}}: left panel normal photo, center panel x-ray radiograph view showing
internal structure in blue-white tones, right panel macro close-up of one internal detail, black
background, high contrast, medical imaging aesthetic`

## Negative Prompt
`single panel only, color radiograph, watermark, blurry, low contrast`

## Variables to collect
1. Exact subject?
2. Internal detail to highlight in the macro panel?

## Combinable with
- `crosssection`, `anatomy`

## Example
Subject "human hand" → normal photo / bone radiograph / joint macro.
