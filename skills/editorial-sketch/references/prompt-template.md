# Generation prompt template

Each image is generated separately. Replace the variables based on the source text's content —
never assemble several images into a single composition.

The prompt is written in English (better rendering fidelity on text-to-image models), but the
handwritten annotations in the image stay in the source text's language (English by default). Always
**propose the prompt and wait for explicit validation** before calling the `hf-image` MCP generation
tool — never generate automatically (see `CLAUDE.md`, Hugging Face section).

```text
Generate one standalone 16:9 horizontal editorial illustration accompanying a written text.

Visual DNA:
Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red/orange/blue handwritten annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic UI.

Recurring character required:
A small solid-black absurd creature with white dot eyes, tiny thin legs, blank serious expression, slightly uneven hand-drawn body shape. The character must perform the core conceptual action, not decorate the scene. Keep it serious, deadpan, and slightly bizarre — never cute.

Theme:
{illustration theme}

Structure type:
{structure type: Workflow / System component / Before-after / Character state / Conceptual metaphor / Methodological stack / Path-map / Storyboard panels}

Core idea:
{central idea the image must express}

Composition:
{precise scene: where the character is, what it's doing, what the main object is, how information flows}

Suggested elements:
{element 1} / {element 2} / {element 3} / {element 4}

Handwritten labels:
{keyword 1} / {keyword 2} / {keyword 3} / {keyword 4} / {optional keyword 5}

Color use:
Black for main line art and the character. Orange for main flow/path/arrows. Red only for key warnings/problems/results. Blue only for secondary notes or feedback/system state.

Constraints:
One image explains only one core structure. Keep the main subject around 40%-60% of the canvas. Preserve at least 35% blank white space. Use at most 5-8 short handwritten labels. Do not write a title in the top-left corner. Do not write the structure type on the image. Do not make it a formal diagram, course slide, or dense explainer. Do not copy prior examples or reuse known case compositions unless explicitly requested; invent a fresh visual metaphor for this specific text. It should be clear but not instructional, interesting but not childish, strange but clean.
```

## Image editing

Removing a top-left title:

```text
Edit the provided image. Remove only the handwritten title "{text to remove}" and its underline from the top-left corner. Fill that area with the same clean white background, matching the surrounding blank paper. Preserve everything else exactly: character, labels, paths, line style, composition, aspect ratio, and image quality. Do not add any new text or objects.
```

Reinforcing the strangeness:

```text
Regenerate this illustration with the same core meaning and simple layout, but make the character more central to the conceptual action. It should be doing the strange work that explains the idea, not standing beside the diagram. Keep it clean, sparse, hand-drawn, and not cute.
```

## Technical note — generation via MCP

This repo uses the `hf-image` MCP (tool `mcp__hf-image__gr1_z_image_turbo_generate`) rather than a
built-in `image_gen` tool. Provide the full prompt above as that tool's text input. Rendering is
inline (no asynchronous generation to poll). The ZeroGPU quota is free; an `HF_TOKEN` raises the
limits if needed (see `CLAUDE.md`).
