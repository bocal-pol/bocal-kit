# Art direction and coherence

Use this reference when a game needs a new visual direction, a style refresh, or a way to keep
many assets coherent across generation sessions and contributors.

## Describe a system, not a mood word

Define each axis explicitly:

| Axis | Questions to settle |
|------|---------------------|
| Shape | Rounded, angular, stocky, slender, geometric, organic? Which shapes signal friendly, dangerous, rare, or interactive? |
| Silhouette | What must read at game scale? Which parts must never merge into the body mass? |
| Value | How many value bands? Is the subject legible in grayscale against common backgrounds? |
| Color | What roles do accent, danger, reward, neutral, environment, and UI colors play? |
| Edge | Hard pixel clusters, clean vector edges, ink line, painterly lost edges, soft 3D bevels? |
| Material | How do metal, cloth, skin, stone, foliage, glass, and magic differ? |
| Light | Direction, softness, contrast, ambient color, rim light, baked-shading policy? |
| Detail | Where is detail concentrated? What disappears at native viewing size? |
| Camera | Orthographic/perspective, angle, focal length, horizon, orientation and rotation conventions? |
| Motion | Snappy, elastic, weighty, restrained? How much can shapes deform in animation? |

Avoid formulas like "beautiful", "cinematic", or "high quality" without observable constraints.
Avoid using a living artist's name as a style definition. Translate references into properties
like palette, geometry, composition, material, lighting, and line craft.

## Building a visual target

1. Capture the game's real viewport and native resolution.
2. Place together a representative character/object, an environment fragment, an effect, and a
   HUD fragment.
3. Show common and worst-case backgrounds.
4. Add a small palette with semantic roles rather than an unlabeled color cloud.
5. Record do/don't examples: acceptable silhouette, forbidden outline drift, allowed texture
   noise.
6. Approve this target before producing a large catalog.

The target is a contract, not inspiration. Later outputs should be compared against it at the
same size and under the same background/light assumptions.

## Keeping a family coherent

- Reuse an approved seed/reference for related variants.
- Keep a stable prompt card with invariant blocks separated from the asset-specific block.
- Generate related items in small batches when shared scale and lighting matter.
- Change one variable per edit pass; broad "make it better" edits increase drift.
- Carry explicit color values or a palette image when color identity matters.
- Keep naming, pivots, canvas size, and padding deterministic outside the model.
- Reject outputs that are appealing on their own but belong to a different visual system.

## Evaluating at three distances

1. **Thumbnail/game-native scale:** gameplay identity and state must read immediately.
2. **Working scale:** edge quality, anatomy, seams, clusters, and material cues are
   inspectable.
3. **Context:** the asset sits in a real gameplay capture with lighting, effects, UI, and
   neighbors.

An asset that only succeeds zoomed in is not successful game art.

## Common drift signals

- character height, head ratio, limb thickness, or costume layers change between states
- outline color/width changes between adjacent assets
- highlights imply different light directions
- the palette grows with near-duplicate colors and muddy intermediates
- texture/noise density increases over later generations
- camera angle or object projection changes across an isometric/top-down set
- ground contact and shadow footprint shift unpredictably
- UI icons mix filled, outlined, beveled, and painterly treatments

When drift appears, go back to the approved seed and use a constrained edit. Don't keep editing
a derivative of a derivative until it becomes the new accidental reference.
