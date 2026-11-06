---
name: hairline-adopt
description: "Turns an existing SVG (icon, logo, illustration) into an interactive Hairline figure that responds to the cursor, by rebuilding the object on hairline-create's vendored engine — never by animating or tracing the original SVG. Auto-invoke on mention of: make this logo interactive, animate this SVG Hairline-style, turn this icon into a figure."
argument-hint: "<file.svg> [what the cursor should do]"
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: low
scope: cross
dependencies:
  - hairline-create
conflicts: []
---

# Hairline — adopt a drawing

The user has a drawing and wants to see it come to life, as a Hairline figure. This skill reads the
drawing, rebuilds its object as solids on `hairline-create`'s engine, and gives it a gesture. It
never animates the SVG itself and never traces it: the drawing gives the identity, the figure is
rebuilt from scratch, with its proportions and its parts.

## What's needed

- An `.svg` file: icon, logo, illustration. If several are provided, handle one figure at a time —
  ask which one first.
- Optionally, what the cursor should do to the drawing. With no guidance, the concepts will propose
  the gesture.

## What to do

Call the Skill tool with `hairline-create`, passing it the file's path and, afterward, what the
user said about the desired gesture, in their own words. `hairline-create`'s step 0 reads the
drawing and fixes the object and its parts; its concepts then keep them and only differ by the
gesture, or by the shape and the reader if the gesture was given here. Everything that follows —
construction, verification, delivery — belongs to `hairline-create`.

## What to say

When proposing the concepts, first say, in one line, how the drawing was read and which parts were
kept. If the user corrects the reading, redo it their way before building a concept.

If the drawing is a trademark belonging to someone else, say so at delivery: the page shows another
company's mark, and it's up to its owner to publish it or not.

## ⚠️ Fallback

If `hairline-create` is unavailable, display `⚠️ hairline-adopt requires hairline-create` and stop —
never reimplement its logic here.
