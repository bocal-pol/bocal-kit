---
name: 21st-ai
description: >-
  Generate and iterate on UI with 21st AI from the terminal via the `21st` CLI
  (`@21st-dev/cli`): sketch a UI from a prompt, preview the variants in the
  browser, edit any variant in place with a natural-language change, and pull
  the final code into the project. Use whenever the user wants to BUILD / SKETCH
  new UI ("sketch a pricing page", "generate a hero with 21st", "make me a <X>
  section"), ITERATE on a generated draft ("edit the third variant", "add a
  toggle to that take"), or GRAB the code of a draft ("pull that variant's
  code"). For finding/installing existing components use the `21st-cli-use`
  skill; to publish your own, `21st-registry`.
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: frontend
dependencies:
  - 21st-cli-use
conflicts: []
---

# 21st AI — sketch, iterate & grab code from the terminal

21st AI is a fast UI-drafting board. Mental model: **draft it here, then finish
it** — sketch a few variants from a prompt, preview them, refine the one you like
with plain-English edits, and pull its code into the repo. The whole loop runs
from the `21st` CLI, so you never leave the editor.

Sketch mode produces self-contained **HTML + Tailwind** drafts (fast, no build).
The recommended handoff is the **copy-prompt**: a spec that tells you to rebuild
the design in the target project's real stack — not paste raw HTML verbatim.

## Auth

Same credential as the rest of the CLI: `21st login` (saved token) or a
`21st_sk_` key via `--api-key` / `TWENTYFIRST_TOKEN`. `21st usage` shows tier +
remaining quota. (See the `21st-cli-use` skill for the full auth notes.)

## The loop

```bash
# 1) Sketch — generate variants ("takes") from a prompt. Opens the preview in
#    the browser and prints the projectId.
21st generate "a pricing section with 3 tiers and a monthly/annual toggle"

# 2) List the takes (1-based numbers + whether each has rendered yet).
21st generation <projectId>

# 3) Edit ONE take in place with a natural-language change (PAID — see Metering).
21st iterate <projectId> "make it enterprise-flavored, add an annual toggle" --take 3

# 4) Grab the code to bring into the project (FREE).
21st take <projectId> --take 3            # paste-ready copy-prompt (recommended)
21st take <projectId> --take 3 --code     # raw self-contained HTML instead
```

Open the preview URL (printed by `generate`, and returned by `iterate`) in the
editor's built-in browser to watch the variants render and update in place.

## When to use which

| Command | When |
|----------|-------|
| `generate` | Start from scratch from a prompt — returns a preview URL + projectId |
| `generation` | List the takes to know which `--take N` to target |
| `iterate` | Refine an EXISTING take (in-place edit, PAID) |
| `take` | Pull a take's code — copy-prompt (default) or raw HTML (`--code`), FREE |

## Metering

- **generate** — daily quota (`21st usage` to check)
- **iterate** — real token cost — group changes into one clear instruction
- **generation** (listing) and **take** (code) — **free and unlimited**

## Tips

- A sketch is a **draft, not production code** — treat the copy-prompt as a design spec and rebuild it with the project's real components; don't paste the raw HTML as-is.
- Reference takes by their 1-based number from `generation` / the "Take N" label in the preview.
- Only the sketches you created can be listed, edited, or pulled.
