---
name: format-specsheet
type: format
category: technical-product
tags: [technical, product, catalog]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# Specsheet

## Effect
Centered product sheet with callouts pointing to key features, catalog style.

## Imposed structure (non-negotiable)
- Subject centered on a neutral background
- 6 leader lines to feature labels around the image
- Catalog/e-commerce layout, studio lighting

## Positive Prompt (English skeleton)
`product spec sheet of {{subject}}, centered on neutral background, 6 leader lines pointing to
labeled feature callouts around the image, clean catalog/e-commerce layout, studio lighting,
high detail`

## Negative Prompt
`cluttered layout, missing callouts, busy background, watermark, blurry`

## Variables to collect
1. Exact subject?
2. The 6 features to highlight?

## Combinable with
- `knolling`, `turnaround-360`

## Example
Subject "headphones" → callouts for battery life, material, Bluetooth, weight, foldable, built-in mic.
