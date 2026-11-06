---
name: format-wireframe
type: format
category: technical-product
tags: [technical, 3d, mesh]
compatible_with: [z-image-turbo, flux, sdxl, midjourney-v6]
---

# Wireframe — Hybrid mesh render

## Effect
Blends a finished surface render with a cyan polygon wireframe mesh, 3D modeling software look.

## Imposed structure (non-negotiable)
- Half of the subject in finished textured render
- Half in visible cyan wireframe mesh
- Neutral studio background, technical CGI aesthetic

## Positive Prompt (English skeleton)
`hybrid render of {{subject}}, half finished surface material and half cyan polygon wireframe
mesh, 3D modeling software aesthetic, clean studio background, technical CGI look, high detail`

## Negative Prompt
`fully wireframe, fully rendered without mesh visible, watermark, blurry`

## Variables to collect
1. Exact subject?
2. Vertical or diagonal split between the two renders?

## Combinable with
- `blueprint`, `isometric`

## Example
Subject "sports car" → half painted body, half cyan wireframe mesh.
