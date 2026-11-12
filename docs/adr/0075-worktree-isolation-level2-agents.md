# ADR 0075 — `worktree` isolation for Level-2 agents writing code in parallel

- **Status**: accepted
- **Date**: 2026-11-12

## Context

A public write-up (Abyane Nabeebaccus, "Agents" guide, 2026-10-28) demonstrated the concrete risk:
four Claude Code sessions editing the same file at once (`build.py`, no isolation) produced a
working result but a tangled history — one commit contained another agent's work, impossible to
revert in isolation. `team-dev`/`architecture-agent` can already dispatch several Level-2 agents
from different domains in parallel (existing rule: "Never two Level-2 agents of the **same**
domain in parallel without Level-0 coordination" implies different domains, by contrast, can run
together). Two agents from different domains (e.g. `backend-agent` and `frontend-agent`) can touch
a shared monorepo file (a DTO, a config) at the same time.

Claude Code exposes this guard natively: a custom agent (`.claude/agents/<name>.md`) that declares
`isolation: worktree` always runs in its own git worktree, files isolated from the main checkout
(confirmed against [code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees)
on 2026-11-12). Without further configuration, that subagent worktree branches from the remote's
default branch (`worktree.baseRef: "fresh"`) — directly at odds with this ecosystem's Global Git
Workflow, where all work happens on an already-in-progress `feature/*`/`bugfix/*`/`hotfix/*`
branch: the isolated subagent would see neither local commits nor the active branch.

## Decision

1. `backend-agent`, `frontend-agent`, `mobile-agent` and `infrastructure-agent` — the Level-2
   agents that **write code** and are most likely to be dispatched in parallel across different
   domains of the same repository — declare `isolation: worktree` in their frontmatter.
2. `data-agent` (data) and `security-agent` (security) are **deliberately excluded**: mostly
   readers/reporters, the collision risk is low for them, while isolation adds real friction (a
   worktree stays locked until manual merge if it holds changes).
3. `worktree.baseRef: "head"` is set in `settings.json` (user scope, repository root): every
   worktree — an isolated subagent or a manual `claude -w` — now branches from local `HEAD` rather
   than the remote's default branch.
4. The equivalent manual method (several `claude -w <name>` terminals, one human per worktree,
   merge in a dedicated session) is documented in the new `worktree-agents` skill, directly
   invocable by the user on any project — not limited to this repository.

## Positive consequences

- Two Level-2 agents from different domains dispatched in parallel can no longer produce a commit
  mixing their two pieces of work — each commits on its own worktree branch.
- `worktree.baseRef: "head"` aligns Claude Code's native behavior with a rule already mandatory in
  this ecosystem (work on an in-progress `feature/*` branch), instead of silently contradicting it.
- The manual method (several terminals) becomes available as a reusable skill on any project,
  rather than only documented in an external guide.

## Negative consequences / risks

- A subagent worktree holding changes stays locked until a manual merge or the periodic sweep
  (`cleanupPeriodDays`) — `architecture-agent`/`team-dev` must plan an explicit merge step whenever
  several isolated Level-2 agents have worked in parallel, or the work stays on unintegrated
  `worktree-*` branches.
- `worktree.baseRef: "head"` applies to **every** worktree use on this machine, including a manual
  `claude -w` unrelated to `team-dev` — a global behavior change, not scoped to the case that
  motivates this decision.
- The convention applies to only 4 of 6 Level-2 agents: a new domain agent that writes code must
  redo this analysis explicitly (does it write code on potentially shared files?) rather than copy
  the field by reflex.

## Alternatives considered

- **Isolation on all 6 Level-2 agents**: rejected for `data-agent`/`security-agent` — the friction
  of a locked worktree outweighs the benefit for mostly-reading agents.
- **`worktree.baseRef` left at `"fresh"`**: rejected — directly contradicts the Global Git Workflow
  (work always happens on a `feature/*` branch); the isolated subagent would lose the active
  branch.
- **Documenting only, without wiring the agents**: rejected — a documented but unset field produces
  no effect, and this environment's failures are silent (see the canary rule in `CLAUDE.md`).

## Scope

`CLAUDE.md` (agent frontmatter section), `settings.json` (root), `agents/backend-agent.md`,
`agents/frontend-agent.md`, `agents/mobile-agent.md`, `agents/infrastructure-agent.md`, the
`worktree-agents` skill. Complements ADR 0014 (3-level hierarchy) and ADR 0047 (instruction
isolation — a related but distinct concept: isolating the *text* an agent receives, not the *files*
it edits).
