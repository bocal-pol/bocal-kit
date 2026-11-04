# Contributing to `bocal-kit`

This repository is a shared Claude Code environment: **skills** (capabilities invocable via
`/name`), **agents** (orchestrators that coordinate several skills), and the conventions that
govern them. It's also the actual content of `~/.claude/` on machines that use it — an accepted
contribution therefore runs for everyone on their next session.

Hence the underlying rule: **a skill that never self-invokes, or that references something that
doesn't exist, produces no visible error**. Failures in this environment are silent. That's why
validation checks the frontmatter as much as the content.

---

## 1. Before writing anything

| You want to… | Do this instead |
| --- | --- |
| Add a capability | Check [`skills/SKILLS_INDEX.md`](skills/SKILLS_INDEX.md) to confirm it doesn't already exist under another name |
| Correct a Claude behavior | `/encode-correction <description>` — the skill encodes the correction in the right file |
| Create a skill | `/create-skill`, then `/improve-skills` to refine it |
| Change a cross-cutting rule | Open an issue first: it touches everyone's sessions |

Duplicates are the most costly defect in this repo: two skills with overlapping triggers make
auto-invocation non-deterministic. If your capability overlaps an existing one, prefer enriching
it, or declare a cross `conflicts:` between the two.

---

## 2. Anatomy of a `SKILL.md`

A skill lives in `skills/<name>/SKILL.md`. The folder name and the `name` field must be identical.

```yaml
---
name: laravel-developer
description: "Laravel Developer — Laravel 9+, Eloquent, Sanctum… Auto-invoke on: Laravel, Eloquent, Artisan, migration, controller."
model: claude-sonnet-5
type: framework
priority: high
scope: backend
dependencies:
  - context7-mcp
conflicts:
  - dotnet-developer
---
```

**All seven fields are required.** CI rejects any PR where one is missing.

| Field | Constraints |
| --- | --- |
| `name` | kebab-case, identical to the folder name |
| `description` | **Oriented around concrete triggers** — this is what decides whether Claude proposes the skill spontaneously. **Quote it** as soon as it contains a `: ` or starts with a special character |
| `model` | A **full** identifier: `claude-opus-5`, `claude-sonnet-5`, or `claude-haiku-4-5-20251001`. Never bare `sonnet` |
| `type` | `orchestrator` · `framework` · `domain` · `utility` · `context` · `specialized` |
| `priority` | `high` (specialized, prioritized by the router) · `medium` (generalist) · `low` (last resort) |
| `scope` | `backend` · `frontend` · `infra` · `mobile` · `data` · `security` · `cross` (reserved for cross-cutting skills) |
| `dependencies` | Required skills or MCPs. Check their availability before invoking, warn if absent |
| `conflicts` | Skills never activated at the same time (same domain) |

### Frontmatter forbidden items

- **Never a `tools:` key** — that's an *agent* key, purely ignored in a skill.
- `allowed-tools:` **pre-authorizes** (removes the confirmation), it doesn't restrict. Use only
  with explicit justification. To restrict, use `disallowed-tools:`.
- An `argument-hint:` starting with `[` must be **quoted**: in YAML, an unquoted `[…]` parses as a
  sequence, breaking the value.

### Content rules

- **Paths**: `~/.claude/` only. **No user-specific absolute path** (`C:\Users\…`) — CI rejects it.
- **Grep**: systematically exclude `node_modules/`, `vendor/`, `*.test.*`.
- **Dependency between skills**: write explicitly "Call the Skill tool with `name`," one call per
  skill. Never a `/name` slipped into prose — it triggers nothing.
- **Accumulated knowledge**: a skill that writes a `*-knowledge.md` file writes it in
  `<project>/.claude/`, never in `~/.claude/`, which is the versioned, shared configuration.
- **Child skill**: document its input, its output, and a ⚠️ fallback if the child is absent.

---

## 3. Anatomy of an agent

An agent lives in `agents/<name>-agent.md`. It orchestrates, it doesn't implement.

```yaml
---
name: backend-agent
description: Principal Backend Director — orchestrates Laravel 9+ or .NET 10+ depending on the project.
model: claude-sonnet-5
tools: Glob, Grep, Read, Write, Bash, AskUserQuestion, Skill
---
```

Unlike skills, `tools:` is a **real** key here. Two verified pitfalls:

- An agent that invokes a skill **must** declare the `Skill` tool, or the invocation fails.
- An agent that reads files **must** declare `Read` — this omission has gone unnoticed for months
  in the past.

### Hierarchy — delegation never flows back up

```text
Level 0 — Coordination    team-dev
Level 1 — Direction       product-agent (product) · architecture-agent (architecture)
Level 2 — Implementation  backend · frontend · mobile · infrastructure · integration · data · design · qa-lead · security…
```

A single-domain request goes directly to level 2. A request touching two or more domains goes
through `team-dev`. A level-2 agent never calls level 0.

---

## 4. Git workflow

This is a public repository — you don't have push access to it, and you shouldn't try to get it.
Contribute through a fork:

1. **Fork** [`bocal-pol/bocal-kit`](https://github.com/bocal-pol/bocal-kit) to your own GitHub
   account (the "Fork" button on the repo page).
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/bocal-kit.git
   cd bocal-kit
   ```
3. **Add the original repo as `upstream`**, so you can stay in sync with it:
   ```bash
   git remote add upstream https://github.com/bocal-pol/bocal-kit.git
   ```
4. **Branch from an up-to-date `develop`**:
   ```bash
   git fetch upstream
   git checkout -b feature/short-name upstream/develop
   ```
5. **Push to your own fork**, never to the original repo (you have no write access there anyway):
   ```bash
   git push -u origin feature/short-name
   ```
6. **Open a Pull Request** on GitHub from `<your-username>/bocal-kit:feature/short-name` toward
   `bocal-pol/bocal-kit:develop`.

One branch = one single goal. Prefixes: `feature/*`, `bugfix/*`, `hotfix/*`.

`main` and `develop` on the original repo are protected and only merged into via a reviewed Pull
Request — never pushed to directly, by anyone, maintainer included.

Keeping your fork current before starting new work:

```bash
git fetch upstream
git checkout develop
git merge upstream/develop
git push origin develop
```

### Commit messages — strict Conventional Commits

Format: `type(scope): short description`

Types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore`

Rules: imperative present tense · no initial capital · no trailing period · 72 characters max · one
commit = one intent.

```text
feat(auth): add JWT authentication      # valid
Added authentication system             # invalid
```

**No `Co-Authored-By:` trailer nor "Generated with …" line** in a commit message or a PR
description. Every commit has a single human author.

---

## 5. Versioning

The repo is versioned at the repo level, not per skill:

- [`CHANGELOG.md`](CHANGELOG.md) in Keep a Changelog format, updated with each release.
- **Semver** tags on `main`: `v1.2.0`.
- **No per-skill `version:` field** — hundreds of files to maintain by hand for information
  `git log` already provides.

To check if your environment is behind: `git -C ~/.claude fetch && git -C ~/.claude status`.

---

## 6. What CI checks

The frontmatter validation workflow fails if, in a modified file:

1. A `SKILL.md` is missing one of the seven required fields.
2. A `SKILL.md` carries a `tools:` key.
3. A `description:` or `argument-hint:` value is improperly quoted.
4. A `model:` isn't a known full identifier.
5. The `name` field doesn't match the folder name.
6. A versioned file contains a user-specific absolute path (`C:\Users\…`).

CI doesn't judge content quality — that's the role of review.

---

## 7. Before opening the PR

- [ ] The skill or agent is invocable and does what its `description` announces
- [ ] No absolute path, no secret, no personal data
- [ ] No reference to a nonexistent skill, agent, or file
- [ ] `skills/SKILLS_INDEX.md` updated if you're adding a skill
- [ ] An ADR in `docs/adr/` if the decision is hard to reverse, surprising without context, and the
      result of a real trade-off — one to three sentences is enough
- [ ] Commits follow the convention above

---

## 8. What doesn't belong here

- Personal data, account credentials, organization names.
- Machine-specific files: they go in `settings.local.json` and in `memory/`, both git-ignored.
- Temporary files at the root: use `.claude/tmp/`, git-ignored.
