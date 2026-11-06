# ADR 0023 — Hugging Face MCP: free image/video generation

- **Status**: accepted
- **Date**: 2026-08-21 — updated 2026-10-02 (added `brag`)

## Context

Glif (the previous solution) was paid, proprietary, and incompatible with headless sessions. The need for image and video generation was real for the `imagine` and `animate` skills, and for design agents (design, ux-designer, public-communications).

## Decision

Replace Glif with two hosted Hugging Face MCPs (free, ZeroGPU quotas):

- **`hf-image`** (`mcp-tools/Z-Image-Turbo`) → images — `imagine` skill
- **`hf-t2v`** (`Lightricks/ltx-video-distilled`) → short generic videos (2-4 s, text-to-video and image-to-video) — `animate` skill

### Application rules

- **Never generate automatically**: propose the prompt + wait for approval
- Auth: browser OAuth on first call — doesn't work headless/in cron → a prompt-only fallback is mandatory
- Don't use HF for: plain text, code, technical diagrams (prefer Mermaid/draw.io)
- Also usable in Claude.ai via custom connectors

## Positive consequences

- Zero cost (ZeroGPU quotas)
- Available directly from Claude Code with no external setup
- `hf-t2v` supports both text-to-video AND image-to-video

## Negative consequences / risks

- Limited ZeroGPU quotas — possible queuing at peak times
- Browser OAuth incompatible with headless sessions (fallback needed)

## Alternatives considered

- **Glif**: paid, proprietary, not headless-friendly. Replaced.
- **Local generation**: too heavy for the workstation. Rejected.

## Scope

Media — `imagine`, `animate` skills, design agents.

## Addendum 2026-10-02 — `brag`: product-launch video (out of HF's scope)

A second video skill, `brag`, was added to the repo without replacing `animate` or depending on
the Hugging Face MCP. It serves a different need: `animate` produces a short, generic clip (2-4 s)
from a text prompt or an image, useful for one-off illustration; `brag` reads the **current
project's own code** directly to produce a scripted 15-25 s launch video (hook → reveal →
highlights → punchline), with a script, storyboard, music, and a shareable export.

| | `animate` | `brag` |
| --- | --- | --- |
| Engine | Hugging Face MCP (`hf-t2v`, distilled LTX-Video) | `hyperframes-cli` (a dedicated dependency, not HF) |
| Input | Free-form text prompt or an image | The current project's source code, read directly |
| Duration | 2-4 s | 15-25 s |
| Use case | One-off illustration (animated concept art, campaign visual) | A shareable, ready-to-post product launch video |
| Trigger | Always propose the prompt, never generate automatically | `/brag`, "make a launch video" — internal approval gates (storyboard, `hyperframes check`, render) |

Both skills declare each other as `conflicts:` in their frontmatter — never invoked together for
the same request. The choice between the two is based on intent: illustrating a concept
(`animate`) vs. announcing/sharing a shipped project (`brag`).

`brag` consumes no ZeroGPU quota and isn't subject to this ADR's browser-OAuth/headless
constraint — its dependency (`hyperframes-cli`) and its own limits (availability of
`npx hyperframes`) are documented in the skill itself, not here.

**Extended scope**: Media — `imagine`, `animate`, `brag` skills, design agents.
