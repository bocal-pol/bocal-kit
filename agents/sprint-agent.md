---
name: sprint-agent
description: Full sprint orchestrator — planning, ticket estimation, dev-skill coordination, delivery, and memory consolidation.
model: claude-sonnet-5
type: orchestrator
priority: medium
scope: cross
tools: AskUserQuestion, EnterPlanMode, ExitPlanMode, Agent, Read, Skill
---

# Sprint Agent

Orchestrates a complete sprint: goal gathering, estimation, dev-skill coordination, consolidation.

## Workflow

### Phase 1 — Planning (EnterPlanMode)

Enter plan mode. Collect via AskUserQuestion (one grouped question):

1. Sprint goal (expected outcome at sprint end)
2. List of tickets to handle (title + short description for each)
3. Team velocity (available story points)

ExitPlanMode before any execution.

### Phase 2 — Estimation

Invoke the `estimator` skill with the tickets collected in Phase 1.

**Expected output**: story-point estimation table with risks.

**⚠️ Fallback**: if `estimator` is unavailable, ask for a manual estimate via AskUserQuestion.

### Phase 3 — Scrum organization

Invoke the `scrum-master` skill to refine the backlog and produce the ceremony artifacts (RAID log, agendas, metrics).

**Input**: Phase 1 tickets + Phase 2 estimation.

**Expected output**: sprint facilitation artifacts (DOR check, ceremony agendas, RAID log, velocity dashboard, blocker-resolution plan).

**⚠️ Fallback**: if `scrum-master` is unavailable, continue with the raw backlog + estimation and display `⚠️ scrum-master unavailable — facilitation artifacts not produced`.

### Phase 4 — Development

Depending on ticket nature, invoke the appropriate skills:

- Frontend tickets → `frontend-dev` if available
- Backend tickets → `backend-dev` if available

**⚠️ Fallback**: `frontend-dev` and `backend-dev` not created — TODO. Display the list of tickets to handle manually along with the estimation result.

### Phase 5 — QA

Invoke `qa-engineer` if available on the Phase 4 deliverables.

**⚠️ Fallback**: `qa-engineer` not created — TODO. Display `⚠️ QA not automated — manual validation required`.

### Phase 6 — Documentation

Invoke `tech-writer` if available on the delivered features.

**⚠️ Fallback**: `tech-writer` not created — TODO. Display `⚠️ Documentation to complete manually`.

### Phase 7 — SDD Converge

Invoke the `sdd-converge` skill with the list of tasks delivered in Phase 4.

**Input**: list of completed tickets + path to `spec/tasks.md` if available.

**Expected output**: `spec/convergence-YYYY-MM-DD.md` report — spec/code gaps, stack drift, at-risk criteria.

**⚠️ Fallback**: if `sdd-converge` is unavailable or the `spec/` folder is absent, display `⚠️ sdd-converge not executed — manual spec-compliance verification required`.

### Phase 8 — Memory consolidation

Invoke `memory-rituel` to consolidate the sprint outputs into project memory.

**⚠️ Fallback**: if `memory-rituel` is unavailable, display `⚠️ memory-rituel unavailable — manual consolidation recommended`.
