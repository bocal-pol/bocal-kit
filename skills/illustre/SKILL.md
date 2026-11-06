---
name: illustre
description: "Generates valid Excalidraw diagrams (schemas, process flows, slides, comparisons) then exports them to PNG and SVG via Python/Playwright. Auto-invoke on: create a schema, make a diagram, generate an illustration, excalidraw, visual diagram, architecture schema, flowchart, visual slides."
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Illustre — Excalidraw Diagrams → PNG/SVG

## Philosophy

**Diagrams must ARGUE, not DISPLAY.**

Every visual must advance understanding through relationships, transformations, and causality that
text alone can't convey. Before generating, ask: what idea must this diagram prove?

---

## Default format

- **Resolution**: 1920×1080 (16:9)
- **Font**: Excalifont (`fontFamily: 5`) — always, never `fontFamily: 3`
- **Rendering**: `roughness: 0` (clean lines)
- **Minimum font size**: 24pt (readable on mobile, video, print)

---

## Color palette — diagram-design (adaptable)

Default palette aligned with the `diagram-design` system (bocal-pol/diagram-design). Replace with
the project's palette if a `DESIGN.md` is available.

| Usage | Token | Color |
|---|---|---|
| Background (paper) | `paper` | `#f5f5f5` |
| Secondary background | `paper-2` | `#ececec` |
| Main text (ink) | `ink` | `#2d3142` |
| Secondary text | `muted` | `#4f5d75` |
| Tertiary text | `soft` | `#7a8399` |
| Focal accent | `accent` | `#eb6c36` |
| Accent fill | `accent-tint` | `rgba(235,108,54,0.08)` |
| Link / reference | `link` | `#2e5aa8` |
| Success | — | `#16A34A` |
| Warning | — | `#D97706` |
| Error | — | `#DC2626` |
| Borders | `rule-solid` | `#bfc0c0` |

System rules (diagram-design ADR 0060):
- One accent maximum. Warm-neutral background (#f5f5f5), never pure white.
- WCAG AA required for ink/paper and muted/paper (11px+).
- Strict 4px grid: every Excalidraw coordinate divisible by 4.
- Border radius: 4px (tags), 6px (nodes), 8px (containers).
- Target density: 4/10 — "Every node earns its place".

> If the project has a `DESIGN.md`, read the defined palette and use it instead.
> Full system reference: the `diagram-design` skill (bocal-pol/diagram-design).

---

## Available visual patterns

| Pattern | When to use |
|---|---|
| Fan-out (1→N) | A concept splits into components |
| Convergence (N→1) | Several flows lead to one result |
| Sequential pipeline | Ordered steps of a process |
| Hierarchy | Parent/child structures |
| Cycle | Iterative processes or loops |
| Comparison (2 columns) | Before/After, Option A/Option B |
| Matrix (2×2) | Prioritization, quadrants |
| Timeline | Time sequences |
| Layer stack | Layered architectures (OS, network, app) |

---

## Generation workflow

### Step 1 — Clarify the concept (if ambiguous)

If the request is vague, ask a single targeted question:
> "What's the main message this diagram needs to convey?"

### Step 2 — Identify the relationships

List the entities and their connections before positioning anything.

### Step 3 — Choose the visual pattern

Select the pattern from the list above that best matches the data's structure.

### Step 4 — Generate the Excalidraw JSON

Produce the complete JSON following the templates in `references/element-templates.md`.

Envelope structure:
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "illustre-skill",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null
  },
  "files": {}
}
```

### Step 5 — Write the `.excalidraw` file

Write the JSON to a file named `<subject>.excalidraw` in the current directory or in
`docs/diagrams/` if that folder exists.

### Step 6 — PNG/SVG rendering (optional, if Python is available)

```bash
# Check if Python is available
python3 --version 2>/dev/null || python --version 2>/dev/null

# If available, run the render from the references/ folder
cd ~/.claude/skills/illustre/references
python3 render_excalidraw.py <path/to/file.excalidraw> <output.png>
```

> ⚠️ If Python or Playwright are unavailable, the `.excalidraw` file is the final output.
> It can be opened in [Excalidraw.com](https://excalidraw.com) or the Excalidraw VS Code extension.

---

## Batch mode (slide series)

For a series of related diagrams (e.g. a course, a presentation), stack all elements vertically
with an 800px gap between each slide, separated by a gray dotted line.

```json
{
  "type": "line",
  "y": [GAP_MIDPOINT_Y],
  "width": 1920,
  "strokeStyle": "dotted",
  "strokeColor": "#CCCCCC"
}
```

---

## References

Supporting files are in `~/.claude/skills/illustre/references/`:
- `element-templates.md` — copy-paste JSON templates for each element type
- `render_excalidraw.py` — Python PNG/SVG rendering script
- `render_template.html` — Playwright template (rendered via the Excalidraw CDN)
- `pyproject.toml` — Python dependencies (playwright ≥ 1.40)
- `Excalifont-Regular.woff2` — embedded font for rendering (download if absent)

To install Python dependencies:
```bash
cd ~/.claude/skills/illustre/references
pip install playwright
playwright install chromium
```
