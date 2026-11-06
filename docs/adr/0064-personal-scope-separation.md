# ADR 0064 — Personas named by function, and a separate overlay for personal profile data

- **Status**: accepted
- **Date**: 2026-09-17
- **Complements**: ADR 0049 (PO registry), ADR 0062 (`~/.claude` as a git checkout), ADR 0063 (MIT license)

## Context

Opening this repo to other people (ADR 0063) forced a decision on what could stay versioned in the shared repo. A sharing audit identified several persona agents and their satellite skills, a personal-PO registry, and a "personal context" skill as candidates for removal.

A first pass moved all of it out to a separate private repo. On review, **that was too broad**: an agent that knows how to compute a weighed survival pack, or compare motorsport tire strategies, is domain expertise, not personal data. What actually caused the problem wasn't the subject matter, but **the name**: some personas carried the first or last name of a real person from the original author's life.

The real criterion isn't "private vs. professional" but: **does this file identify someone, or does it describe a skill?**

## Decision

### 1. A persona is named after its function

Any agent named after a real person is renamed by what it does. Renaming it touches the filename, the `name` field, the description, the headings, and **every occurrence of the name in the body** — not just the header. An alias pointing to a pre-rename file carrying a person's name is deleted rather than redirected.

Personas named after a nickname, a public figure, or an archetype (a motorsport commentator persona, a tabletop game-master persona, a pilgrimage-route guide persona) stay unchanged: they don't identify anyone from the author's personal life.

### 2. Agents and their skills stay in the shared repo

Persona agents, their aliases, and their satellite skills are reusable content as long as they meet the naming rule above. They stay versioned here, with one guardrail: `team-selector` excludes persona agents from a development cycle by default.

### 3. Only genuinely personal data moves out

Content that describes no skill at all — a family profile, personal location, named personal preferences — doesn't belong in a shared repo, regardless of a persona's name. It lives in a separate, private overlay, outside this repo's scope.

### 4. Mounting a personal overlay without duplicating files

Claude Code only reads skills from one fixed location (`~/.claude/skills/<name>/SKILL.md`). A file placed in a personal subfolder would never load, and two git repos can't share the same `.git` location.

The standard **dotfiles pattern** solves this: a **bare** repo for the personal overlay, whose work-tree points at the same `~/.claude` directory used by this repo's own checkout.

```bash
git clone --bare <your-personal-repo-url> ~/.claude-personal.git
git --git-dir=$HOME/.claude-personal.git --work-tree=$HOME/.claude config status.showUntrackedFiles no
git --git-dir=$HOME/.claude-personal.git --work-tree=$HOME/.claude checkout
```

The two repos share the same working tree: the shared repo lists the personal path in its `.gitignore`, the personal repo disables `showUntrackedFiles`. Files stay physically in place — **no copy, no symlink, hence no double-writing to maintain**, which is exactly the failure mode ADR 0062 removed.

### 5. A `scope: personal` value

A dedicated `scope` value, reserved for content belonging to a personal overlay. No skill in this shared repo should ever carry it. A frontmatter validator can accept the value while only judging files **tracked by this repo's own git**, so it doesn't flag personal skills that are present on disk but owned by the other repo.

## Positive consequences

- No real person's name anywhere in the shared repo
- Domain expertise stays reusable instead of being exiled along with private data
- A personal-context file can no longer load into an unrelated session
- Only a small amount of content needs a second repo at all — the overlay pattern stays lightweight

## Negative consequences / risks

- **Two repos on each machine**, with two distinct commands. A shell alias reduces the friction without removing it — worth re-evaluating if the personal repo never grows beyond a file or two.
- Renamed personas **change their invocation mode**. Old modes aren't kept as aliases: they carried exactly the names the rule forbids. A prompt or script using the old mode stops working, and that's accepted.
- **Already-published history isn't cleaned up by this decision alone.** Old names and personal content can remain in earlier commits on any remote the repo was pushed to before this rule existed; cleaning that up is a separate history-rewrite operation.

## Alternatives considered

- **Moving everything to a personal repo**: the first attempt, reverted. Exiled reusable expertise and emptied a meaningful share of the orchestrator's modes over a naming issue alone. Rejected.
- **Keeping everything with no renaming**: would leave real people's names in a repo meant to be shared. Rejected.
- **`git rm --cached` + `.gitignore` alone** for personal content: simplest, but the file would lose its history and backup. Rejected.
- **Windows junctions/symlinks**: work for a skill folder, not for a single isolated agent file, which would require a symlink and therefore developer mode. Rejected.
- **A deployment script** copying the personal repo into `~/.claude`: reintroduces the double-writing that ADR 0062 removed. Rejected.

## Scope

`~/.claude` as a whole. See also ADR 0049, 0062, and 0063.
