---
name: format-crosssection
type: format
category: technical-product
tags: [technical, cutaway, interior]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# Crosssection / Cutaway

## Effect
Reveals the subject's interior by cutting away a portion of the outer shell.

## Imposed structure (non-negotiable)
- Clean cut (vertical, horizontal, or diagonal)
- Realistic rendering outside, technical/schematic rendering inside
- Callouts on visible internal components

## Positive Prompt (English skeleton)
`cross-section cutaway of {{subject}}, clean cut revealing internal structure and components,
labeled callout lines, realistic exterior with technical interior rendering, studio lighting,
high detail illustration`

## Negative Prompt
`fully opaque object, no visible interior, watermark, blurry, low detail`

## Variables to collect
1. Exact subject?
2. Cut type (vertical / horizontal / diagonal)?

## Combinable with
- `explodedview`, `xray`, `wireframe`

## Example
Subject "house" → vertical cut showing rooms, foundations, roof.
