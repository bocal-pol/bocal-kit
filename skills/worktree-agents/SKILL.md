---
name: worktree-agents
description: "Isolates several Claude Code sessions working on the same repository at the same time — one git worktree per session, then a dedicated merge session. Auto-invoke on: agents in parallel, several Claude Code sessions, working on the same project at the same time, conflicts between agents, isolating a subagent, claude -w, worktree, merging agent branches."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# worktree-agents — Isolating several Claude Code sessions in parallel

> Method tested by Abyane Nabeebaccus ([@abyane_nb](https://instagram.com/abyane_nb)) on
> 2026-10-28 (Claude Code 2.1.280, Opus 5.5, high effort) and confirmed against the official
> documentation on 2026-11-12: [code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees).
> This skill adapts the method to this ecosystem's conventions (Global Git Workflow, `CLAUDE.md`).

## The problem this solves

Without isolation, two Claude Code sessions (or two subagents) editing the same file in the same
working directory step on each other. In the source trial — four agents each adding one function
to a single Python script, no isolation — the final result worked (4 functions out of 4), but the
first commit contained a piece of the other three agents' work: impossible to revert a single
function without undoing the other three. On a longer task, or if one agent runs tests while
another writes, nothing guarantees it holds together.

A **git worktree** is a second working directory, its own branch, sharing history and the remote
with the main checkout. One session per worktree = separate files, no possible collision.

## Two uses — human and automatic

### A. Several human terminals (you launching several `claude` sessions)

1. **A git repository with at least one commit.** Without a commit, `claude -w` fails with
   `Failed to resolve base branch "HEAD"`. Also run `claude` once in the folder to accept the trust
   screen — without that, `claude -w` stops with an error in interactive mode.

2. **One terminal per agent, one name per worktree**:
   ```bash
   claude -w toc
   claude -w page-numbers       # in another terminal
   ```
   Claude Code creates `.claude/worktrees/<name>/` and a `worktree-<name>` branch. With
   tmux/iTerm2: `claude -w <name> --tmux` opens a dedicated pane directly.

3. **Check where each worktree starts from.** By default (`worktree.baseRef: "fresh"`), a worktree
   branches from the remote's default branch (`main`/`master`), **not** from your current working
   branch: your unpushed commits aren't there. This ecosystem (`CLAUDE.md`, Global Git Workflow)
   requires always working on a `feature/*`/`bugfix/*`/`hotfix/*` branch — for worktrees to branch
   from it, set in `settings.json` (project or user scope):
   ```json
   { "worktree": { "baseRef": "head" } }
   ```
   This is already the global setting in this ecosystem (`settings.json` at the root) — see ADR
   0075.

4. **Copy over the gitignored files.** A fresh worktree only contains files tracked by git — no
   `.env`, no installed dependencies. Create a `.worktreeinclude` at the project root (`.gitignore`
   syntax):
   ```text
   .env
   .env.local
   ```
   Only files that are both listed **and** gitignored get copied. For dependencies (`npm install`,
   a Python venv), ask the agent to install them in its worktree at the start of the task.

5. **One task per agent, ending in a commit.** Give each session a bounded task, touching
   different files where possible (fewer conflicts at merge time), and always end it with "then
   make a git commit with a clear message."

6. **One last session to merge.** Open a session in the **main** folder (not in a worktree) and
   hand it the merge:
   > Several agents worked in parallel, each on its own git branch (`git worktree list` lists
   > them). Merge their branches into `<target branch>`, one by one. If there are conflicts,
   > resolve them keeping both sides' work, then verify that `<project test/run command>` passes.
   > Finish with a commit.

   In interactive mode, Claude Code cleans up the worktree on its own at exit if it's clean
   (otherwise it asks). In non-interactive mode (`claude -p`), nothing is cleaned up automatically:
   ```bash
   git worktree unlock .claude/worktrees/<name>
   git worktree remove .claude/worktrees/<name>
   git branch -d worktree-<name>
   ```

### B. Subagents inside a single session (`.claude/agents/<name>.md`)

Claude Code can isolate its own subagents without an extra terminal. Within a session, "use
worktrees for your agents" is enough for one-off use. To make isolation **permanent** for a given
custom agent, add `isolation: worktree` to its frontmatter:

```yaml
---
name: refactorer
description: Applies a mechanical refactor across many files
isolation: worktree
---
```

A subagent worktree with no changes is removed automatically at the end; if it holds changes, it
stays on disk until the periodic sweep (`cleanupPeriodDays`) or a manual merge. It inherits the
same `worktree.baseRef` as `--worktree`.

**In this ecosystem**: `backend-agent`, `frontend-agent`, `mobile-agent` and `infrastructure-agent`
(Level 2 of the `CLAUDE.md` hierarchy) already carry `isolation: worktree` — these are the leaf
agents most likely to be dispatched in parallel by `team-dev`/`architecture-agent` across different
domains that can touch the same shared files (DTOs, monorepo config). See ADR 0075 for the detail
of this choice and the agents deliberately left out of scope.

## Pitfalls hit during the source trial

- **`isolation: worktree` on a mostly-reading agent** (audit, reporting) adds friction (a worktree
  that stays locked, to merge by hand) with no real collision benefit — reserve this field for
  agents that **write code** on potentially shared files.
- **Default base branch**: without `worktree.baseRef: "head"`, a subagent dispatched mid-feature-
  branch restarts from `main`/`master` — it sees neither your local commits nor your active branch.
- **Tasks that deliberately touch the same file** (the worst-case scenario tested): the merge still
  succeeds in the end if each agent commits cleanly, but the merge session must keep both sides'
  work on conflict, not overwrite one with the other.
- **Verify after merging**: the merge session must re-run the project's test/run command before
  committing to the target branch — a conflict-free git merge is not proof the result works.

## Further reading

- Official documentation (authoritative technical source):
  [code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees)
- Source article for this method: Abyane Nabeebaccus, "Agents" guide, October 2026 edition
  (Instagram [@abyane_nb](https://instagram.com/abyane_nb))
- Anthropic post cited in the source trial on merging at scale (Scion, 30,000+ merges/day
  internally, not suited to repositories our size):
  [anthropic.com/research/redesigning-source-control](https://www.anthropic.com/research/redesigning-source-control)
