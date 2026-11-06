---
name: version-updater
description: "Builds a consolidated update plan for a multi-stack project: delegates to backend-updater/frontend-updater/mobile-updater/dependency-updater for already-tooled stacks, and handles uncovered languages/frameworks itself (new features and obsolete/deprecated features). Never modifies code — produces a plan. Auto-invoke on: update plan, update the project, multi-stack migration, plan a version upgrade, new features available, obsolete features."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[target]"
type: orchestrator
priority: medium
scope: cross
dependencies:
  - version-checker
conflicts: []
---

# Version Updater — Consolidated Update Plan

Builds, for each stack detected by `version-checker`, a prioritized update plan (Breaking →
Important → Recommended) including available new features and deprecated features to fix. Never
modifies code — this is a plan, not an execution.

## Optional input (if invoked from team-dev)

Receive the `version-checker` report already produced (table + `major_gap`) to avoid re-running it.
Return the consolidated plan in Markdown, with no file written.

## Workflow

### Phase 1 — Gap assessment

If no `version-checker` report was provided, call the Skill tool with `version-checker` to get one.
Only process stacks with a minor or major gap (ignore patches — out of scope for a migration plan).

### Phase 2 — Per-stack delegation

Delegation table to already-tooled skills — call the Skill tool with the exact name, one call per
skill:

| Detected stack | Child skill | Input to pass |
|---|---|---|
| Laravel, .NET | `backend-updater` | framework, current version, target version |
| Angular, React | `frontend-updater` | framework, current version, target version |
| Flutter, React Native | `mobile-updater` | framework, current version, target version |
| Third-party packages/dependencies (all stacks) | `dependency-updater` | — |

**⚠️ Fallback**: if a child skill is unavailable, handle that stack via Phase 3 (generic analysis)
and flag it `⚠️ <skill> unavailable — generic analysis applied`.

### Phase 3 — Generic analysis (uncovered stacks)

For stacks with no dedicated skill (Python, Node.js runtime, Vue, Go, Ruby/Rails, Java/Kotlin/Spring,
etc.):

1. Retrieve the release notes between the current and target version via `context7-mcp` or
   `WebFetch` (official changelog / release notes).
2. List separately:
   - **New features** relevant to this project (to be evaluated, not applied by default)
   - **Obsolete/deprecated features** used in the project
3. Scan the code (Grep/Glob, excluding `node_modules/`, `vendor/`, `*.test.*`) to locate usages of
   deprecated patterns.
4. Classify each item as 🔴 Breaking / 🟠 Important / 🟡 Recommended / ℹ️ Watch, with a
   BEFORE/AFTER example and an estimated effort in hours — the same grid as
   `backend-updater`/`frontend-updater` to stay legible across reports.

### Phase 4 — Multi-stack consolidation

Merge Phase 2's outputs (child skills) and Phase 3's (generic analysis) into a single plan,
sequenced by technical dependency order (runtime/language before framework, framework before
application libraries):

```markdown
## Update Plan — <project> — YYYY-MM-DD

### Recommended order
1. [Stack] X.X → Y.Y — <n> Breaking, <n> Important, total effort ~Xh
2. ...

### Per-stack detail
[backend-updater / frontend-updater / mobile-updater / generic-analysis report, inserted as-is]

### Risks of skipping
- [EOL stack]: <concrete consequence — end of security patches, future dependency
  incompatibility>
```

### Phase 5 — Presentation and decision

Never apply the plan's commands automatically. Present the consolidated plan and, if standalone,
ask via AskUserQuestion: start the migration now (dispatch to the relevant stack agent) / keep the
plan for later / ignore it.

### Phase 6 — Conditional persistence

- **Standalone**: create the folder via Bash (`mkdir -p reports/version-updater`), write
  `reports/version-updater/YYYY-MM-DD_version-updater.md`
- **Orchestrated from team-dev**: return the Markdown with no file written
