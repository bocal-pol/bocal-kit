---
name: project-graph
description: "Maps the current project's structure via Graphify and integrates the result into Claude's memory. Auto-invoke on mention of: project mapping, knowledge graph, project graph, graphify, project structure, project map."
model: claude-haiku-4-5-20251001
user-invocable: true
type: utility
priority: low
scope: cross
dependencies: []
conflicts: [graphify]
---

# Project Graph

Maps the current project's structure via Graphify and persists the result to `.claude/project-graph.md`.

## Optional input (if invoked from team-dev)

No argument required. Always runs in the current directory.
Pass `--silent` to suppress the final report (Phase 5).

## Workflow

### Phase 1 — Graphify check

Via Bash, check that Graphify is available:

```bash
graphify --version 2>/dev/null || python -m graphify --version 2>/dev/null
```

If the command fails: display `⚠️ Graphify not installed — run: pip install graphifyy && graphify install` and stop.

### Phase 2 — Preparation and generation

If `.graphifyignore` is absent from the current directory, create it via Write with this content:

```
.claude/
node_modules/
vendor/
.git/
dist/
build/
```

Run via Bash:

```bash
graphify .
```

On failure (non-zero exit code): log the error message and stop cleanly with `⚠️ Graphify failed — see error above`.

Check that `graphify-out/GRAPH_REPORT.md` exists. If absent, stop with `⚠️ Graphify report not generated`.

### Phase 3 — Memory integration

Read `graphify-out/GRAPH_REPORT.md` via Read.

Write `.claude/project-graph.md` in the current directory via Write:

```markdown
# Project Graph — YYYY-MM-DD

## God nodes (central concepts)
<excerpts from GRAPH_REPORT.md — god nodes or key nodes section>

## Surprising connections
<excerpts from GRAPH_REPORT.md — connections or unexpected links section>

## Suggested questions
<excerpts from GRAPH_REPORT.md — suggested questions section>

## Generated files
- graphify-out/graph.html — interactive visualization
- graphify-out/graph.json — queryable graph
- graphify-out/GRAPH_REPORT.md — full report
```

Replace `YYYY-MM-DD` with the current date.

### Phase 4 — Updating MEMORY.md

Read `.claude/memory/MEMORY.md` if it exists.
If absent, create it directly with the following entry as its only content.
If present, add or replace the existing project-graph entry:

```
- [Project Graph](../project-graph.md) — structural mapping YYYY-MM-DD
```

Write the updated file via Write.

### Phase 5 — Report (skip if `--silent` or invoked from an orchestrator)

If invoked standalone, display:
- Path: `.claude/project-graph.md`
- The 3 main god nodes identified
- `graphify-out/graph.html` available for visualization
