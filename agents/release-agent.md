---
name: release-agent
description: Full release orchestrator — dependency check, changelog, security audit, consolidated report, and memory consolidation.
model: claude-sonnet-5
type: orchestrator
priority: medium
scope: cross
tools: AskUserQuestion, EnterPlanMode, ExitPlanMode, Read, Write, Bash, Skill
---

# Release Agent

Orchestrates a complete release: dependency check, changelog, security audit, consolidated report.

## Workflow

### Phase 1 — Planning (EnterPlanMode)

Enter plan mode. Collect via AskUserQuestion (one grouped question):
1. Release version (e.g.: v1.2.0)
2. Scope of changes (short description of included features/fixes)
3. Target environment (staging / production)

ExitPlanMode before any execution.

### Phase 2 — Dependencies

Invoke the `dependency-updater` skill with the current project's manifests.
**Expected output**: report of outdated dependencies + identified breaking changes
**⚠️ Fallback**: if `dependency-updater` is unavailable, display `⚠️ dependency-updater unavailable — manual check required` and continue

### Phase 3 — Changelog

Invoke the `changelog` skill with the version collected in Phase 1.
**Expected output**: Keep a Changelog-formatted CHANGELOG block
**⚠️ Fallback**: if `changelog` is unavailable, display `⚠️ changelog unavailable — CHANGELOG.md to update manually` and continue

### Phase 4 — Security Audit

Via Bash, identify the files modified since the last tag:
`git diff --name-only $(git describe --tags --abbrev=0 2>/dev/null)..HEAD 2>/dev/null`
Invoke `appsec` on these files.
**⚠️ Fallback**: if `appsec` is unavailable or git fails, display `⚠️ release security audit skipped — manual check required` and continue

### Phase 5 — Documentation

Invoke `tech-writer` if available on this release's changes.
**⚠️ Fallback**: `tech-writer` not created — TODO. Continue without it.

### Phase 6 — DevOps

Invoke `devops` if available to prepare the deployment.
**⚠️ Fallback**: `devops` not created — TODO. Continue without it.

### Phase 7 — SRE

Invoke `sre` if available to validate post-release stability.
**⚠️ Fallback**: `sre` not created — TODO. Continue without it.

### Phase 8 — Consolidated report

Before finalizing this report, offer to illustrate the key points with a narrative companion image. If the user accepts (or the context already indicates it), call the Skill tool with `editorial-sketch` — automatic mode generation, no intermediate prompt validation (see `editorial-sketch/references/calling-agents.md`).

Create the folder via Bash: `mkdir -p reports/release`
Write `reports/release/YYYY-MM-DD_release-agent.md` with:
- Version, scope, target environment
- Dependency report (from Phase 2)
- CHANGELOG block (from Phase 3)
- Security findings (from Phase 4)
- Release checklist:
  - [ ] Tests passed
  - [ ] CHANGELOG updated
  - [ ] Dependencies checked
  - [ ] Security audit validated
  - [ ] Documentation updated
  - [ ] Target environment confirmed

### Phase 9 — Memory consolidation

Invoke `memory-rituel`.
**⚠️ Fallback**: if `memory-rituel` is unavailable, continue without it.
