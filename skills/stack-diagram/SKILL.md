---
name: stack-diagram
description: "Produces architecture/tech-stack/service-topology diagrams with official brand logos (AWS, GCP, Azure, svgl, devicon), grouped containers, and clean orthogonal arrows, delivered as self-contained HTML, PNG, a React/TSX component, or an Artifact. Auto-invoke on: architecture diagram, tech stack schema, service topology, cloud diagram, stack overview, tech logos arranged into a diagram — even without a stated output format, even if the technologies aren't cloud services."
model: claude-sonnet-5
type: specialized
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Stack Diagram

Produces engineering-drawing-style architecture diagrams: real logos on white tiles, labeled group boxes (like cloud-vendor VPC diagrams), orthogonal arrows with monospace labels, on a cool graph-paper background. One self-contained HTML file is the source of truth; PNG / TSX / artifact are derived from it.

Adapted from [caru-ini/stack-diagram](https://github.com/caru-ini/stack-diagram) (MIT) — the original's public-gallery sharing step (`stacks.caru.moe`) has been deliberately dropped: this skill never contacts a third-party service to publish anything. Only logo fetching (outbound read-only network to svgl.app, devicon, the official AWS/GCP/Azure packages) is kept.

## Requirements

- Python 3.9+ (standard library only for `fetch_icons.py` and `build.py`)
- Outbound network access to the icon sources (svgl.app, raw.githubusercontent.com, cdn.jsdelivr.net, and the official AWS/GCP/Azure packages) when fetching icons
- Playwright + Chromium for `render_png.py`: `pip install playwright && python3 -m playwright install --with-deps chromium` — if missing, say so explicitly and offer to deliver HTML/Artifact only rather than installing silently

## Workflow

1. Settle the content (nodes, groups, edges)
2. Fetch icons — `scripts/fetch_icons.py`
3. Plan coordinates — read `references/geometry.md`
4. Build the HTML from `assets/template.html` — `scripts/build.py`
5. **Render a PNG and look at it** before delivering
6. Deliver in the requested format(s)

## Step 1 — Content

From the user's list of technologies/services, decide:

- **Nodes**: each tech = one node (name + a short lowercase role, e.g. `http server`, `sqlite db`)
- **Groups**: draw a box around things that share a runtime, vendor, or repo (e.g. a cloud provider box containing a runtime box). Nesting one level deep is fine.
- **Edges**, three kinds: accent-colored solid = primary request/data flow (one continuous path reads best); neutral solid = secondary internal connections; neutral dashed = dev-time/deploy-time relationships (CI, git hooks, IaC deploy)

If the user gave only a flat list of tools, infer sensible groups and flows from what the tools are — only ask when a tool is ambiguous enough that the diagram would be wrong either way.

## Step 2 — Icons

```bash
python3 scripts/fetch_icons.py <icons-dir> tanstack hono drizzle "betterauth:better-auth"
python3 scripts/fetch_icons.py <icons-dir> "aws:aws/AWS-Cloud-logo" "vpc:aws/vpc" "fargate:aws/fargate"
```

Spec forms: `name` (name used as slug), `name:slug`, `name=URL` (explicit URL), `name:aws/<Name>` / `name:gcp/<Product>` / `name:azure/<Name>` (official cloud-vendor icons). The script tries, in order: **svgl → devicon → gilbarbara/logos**.

Rules that matter more than the mechanics:

- **Never recolor a logo.** If a logo is white or too light for a white tile, use a dark tile (`tile dark`) instead of touching its fill.
- **Official marks only.** simple-icons is deliberately not a source (monochrome redraws). When every source misses, find the official file and pass it as `name=URL`.
- **Abstract concepts** (dev environment, cron, queue, cache) get a Lucide pictogram (`name:lucide/<icon>`) — never text-in-a-tile, never emoji.
- **Generic nodes** (user, browser, internet, bare-metal server): copy a glyph from `assets/generic/`.
- The full AWS/GCP/Azure rules (subgroups, naming, region/VPC/subnet icons) follow each vendor's own conventions — read the comments in `scripts/fetch_icons.py` before a vendor-specific diagram.

## Step 3 — Layout

Read `references/geometry.md` for the coordinate system, spacing constants, and above all the **edge anchoring rules that prevent arrows from running through label text**. A node is its tile *plus* the text under it.

## Step 4 — Build

Copy `assets/template.html`, replace the GROUPS / EDGES / NODES sections with yours, then inline the assets:

```bash
python3 scripts/build.py my-diagram.html <icons-dir> out.html --fonts skills/stack-diagram/assets/fonts
```

Icons are referenced in markup as `%%ICON_<name>%%`; fonts as `%%FONT_DISPLAY%%` / `%%FONT_JBM%%`. The build fails loudly on any unresolved token.

## Step 5 — Verify by looking

```bash
python3 scripts/render_png.py out.html check.png --selector .canvas --scale 2
```

Checklist: no arrow crosses label text · labels readable (paper-colored halo) · every icon visible (white-on-white → dark tile) · group labels sit in their corner, clear of nodes · nothing sticks out of its group box.

## Step 6 — Deliver

- **HTML** (default): self-contained file, works offline
- **PNG**: always via `render_png.py` (headless Chromium screenshot of the built HTML) — never via matplotlib/PIL/a standalone SVG rasterizer. Delivers both themes (light + dark) by default.
- **TSX**: convert per `references/tsx.md` (self-contained React component, no dependencies)
- **Artifact**: publish the built HTML with the Artifact tool — everything is already inlined as data URIs, so a blocked-network sandbox is a non-issue. Prefer this when the user will iterate on the diagram in conversation.

In the footer, credit the icon sources actually used (the `source` field of each entry in the icons dir's `manifest.json`). Brand logos remain the trademarks of their respective owners.

## Out of scope (deliberately dropped from the original)

- **No external gallery sharing.** The original ships a `share.py` that posts the PNGs and metadata to `stacks.caru.moe`, a third-party service unrelated to this repository. That script is not ported: this skill never makes an outbound publishing call. If a public-sharing need ever comes up, it should go through an explicit user decision and a written record, not a silent dependency on a third-party service.

## Called from

`architecture-agent` can invoke this skill as a complement to its own C4 diagrams when the user wants a "tech stack with real logos" view rather than a formal C4. ⚠️ Fallback: if this skill is unavailable, `architecture-agent` stays on its existing Mermaid/diagram output.

## SkillSpector scan

Scanned 2026-11-10: score 42/100 (CAUTION), 5 MEDIUM findings. Manually re-verified one by one (per the "Verify agent findings" rule): all false positives — AST4/PE2/RA2 point at an inert `print()` help string in `render_png.py` (never executed), EA5/LP3 point at the mandatory `model:` frontmatter field / the absence of a `tools:` key, both required conventions of this repository's own skill format rather than a covert selection. No corrective action needed.
