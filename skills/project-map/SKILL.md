---
name: project-map
description: "Generates or updates an interactive HTML map of the codebase via the Floorplan plugin (parts, files, HTTP routes, security health check, guided flows, recent-change tracking), or a planned blueprint from a PRD if no code exists yet. Auto-invoke on mention of: interactive project map, visualize the architecture, visual onboarding, floorplan, application blueprint, map the code, see how the app is connected, blueprint from a PRD."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies:
  - floorplan (Claude Code plugin — claude plugin marketplace add haydenschmitty/floorplan)
conflicts: []
---

# Project Map

Orchestrates the **Floorplan** Claude Code plugin (`haydenschmitty/floorplan`, official marketplace)
to produce `floorplan/index.html`: an interactive, zoomable codebase map, with a security health
check, detected screens, guided flows, and recent-change tracking. This skill doesn't reimplement
anything from the plugin — it checks for its presence, invokes it in context, and documents the
fallback if absent.

**Difference from [`project-graph`](../project-graph/SKILL.md)**: `project-graph` produces a text
report (`GRAPH_REPORT.md`) persisted into Claude's memory, for the agent's internal use.
`project-map` produces an interactive HTML map meant for a human (visual onboarding,
exploration, security health check). The two are complementary and can coexist on the
same project — don't disable one in favor of the other.

## Optional input (if invoked from team-dev or `architecture-agent`)

- `target`: root path of the codebase (default: current directory). For multi-repo setups
  (frontend + backend side by side), pass the parent folder containing both.
- `--refresh`: updates an existing map rather than generating a new one.
- `--from-prd <file>`: generates a **blueprint** (a plan, not a map of real code) from a
  PRD or spec, when the code doesn't exist yet. Relevant for greenfield work from `architecture-agent`.

## Workflow

### Phase 1 — Plugin check

Via Bash, check that the Floorplan command is available in the session:

```bash
claude plugin list 2>/dev/null | grep -i floorplan
```

If absent: display

```
⚠️ Floorplan plugin not installed — run once:
  claude plugin marketplace add haydenschmitty/floorplan
  claude plugin install floorplan@floorplan
then restart the Claude Code session.
```

and stop. Never attempt to install the plugin yourself via Bash: that's an action that modifies the
machine's global configuration, outside the scope of a project skill (see `install.ps1` for the
one-shot install at machine bootstrap).

### Phase 2 — Existing status

Check whether a map already exists: `floorplan/index.html` at the root of `target`.

- If absent and `--from-prd` isn't supplied → Phase 3 (first generation, existing code).
- If absent and `--from-prd <file>` is supplied → Phase 3b (blueprint).
- If present → Phase 4 (refresh), unless the user explicitly asks to regenerate from scratch.

### Phase 3 — First generation (existing code)

Call the plugin's native command, in natural language, equivalent to:

> Make me a floorplan of this application. (root: `target`)

The plugin itself handles the scan, describing files/routes, building the map, and opening it in
the browser — follow its own `SKILL.md` (`/floorplan:floorplan` or `/floorplan`), don't duplicate
its phases here.

### Phase 3b — Blueprint (`--from-prd`)

Supply the PRD/spec to the plugin and ask, in natural language:

> Here's my PRD. Make me a floorplan of what would need to be built. (document: `--from-prd`)

The plugin produces a plan marked as such (dashed-outline cards), not a map of real code.

### Phase 4 — Refresh (`--refresh` or an already-existing map)

Ask in natural language: "Update the floorplan." The plugin only re-reads what changed and
highlights the modified cards under **Recent work**.

### Phase 5 — Report

If invoked standalone (not from `team-dev`/`architecture-agent`), relay as-is the report the
plugin produces at the end of its own workflow (map URL, 3-5 line architecture summary, high-severity
Health items). Don't rephrase or summarize further: the plugin has already produced the format
expected for the user.

If invoked from an orchestrator (`team-dev`, `architecture-agent`), only keep for the calling
report: the map URL, the count of high-severity Health items, and a link to `floorplan/` —
the detail stays available to the user within the map itself.

## ⚠️ Fallback

- Plugin absent → Phase 1 message, don't attempt a workaround (no ad hoc reimplementation of the
  scan/description).
- Scan failure (monorepo too large, timeout) → relay the plugin's error as-is and suggest
  limiting `target` to a subfolder.
