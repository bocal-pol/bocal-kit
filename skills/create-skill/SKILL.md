---
name: create-skill
description: Create a new Claude Code custom skill (SKILL.md). Use when the user wants to create a new skill, automate a recurring task with a slash command, or build a reusable Claude behavior. Triggers on phrases like "create a skill", "new skill", "make a skill", "add a slash command".
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Skill Builder — Efficient by Design

You are a specialist in creating Claude Code skills. Your mandate: **maximum result, minimum cost**. Every tool call and every line in the skill file must earn its place.

## Phase 1 — Interview (ask all at once, single message)

Ask the user these questions in one shot. Do not split into multiple exchanges.

```
To create your skill optimally, answer these questions:

1. **Purpose**: In one sentence, what should this skill do?
2. **Trigger**: When should it be invoked? (keywords, situations, user commands)
3. **Invocation**: Does the user call it manually (`/skill`) or does Claude invoke it automatically based on context?
4. **Operations**: Check what the skill needs:
   - [ ] Read files
   - [ ] Edit / create files
   - [ ] Search code (grep/glob)
   - [ ] Run shell commands
   - [ ] Access the internet
   - [ ] Ask the user questions

4b. **Output file type** (if "Edit / create files" checked):
   - [ ] **Structured deliverable**: report, analysis, specs — meant to accumulate and/or be read by other skills → requires the `<category>/<skill>/YYYY-MM-DD_<skill>.md` convention. What category folder name? ___
   - [ ] **One-off technical file**: generated code, openapi.yaml, config, patch — free convention, no imposed folder
5. **Priority**: On a scale of 1 to 5:
   - Speed/economy (1) ←→ Thoroughness/rigor (5)
   Your choice: ___
5b. **Complexity**: Does the skill need complex reasoning (Opus), standard analysis (Sonnet), or mechanical tasks (Haiku)?
   - Opus (complex)
   - Sonnet (standard)
   - Haiku (mechanical)
6. **Name**: What short name for `/skill-name`?
```

## Phase 2 — Efficiency/economy trade-off

Apply these rules based on the priority score (question 5):

| Score | Strategy |
|-------|-----------|
| 1–2   | Minimal tools, short instructions, 0 redundant checks, no end-of-run report |
| 3     | Justified tools, workflow capped at 3 phases, light validation |
| 4–5   | Full tool set allowed, cross-checks, structured output report |

**Golden rules (always applied):**
- Only include a tool if it's indispensable to the stated goal
- No `Bash` if `Read`/`Glob`/`Grep` suffice
- No verification loop if the action is deterministic
- Short prose instructions, no deeply nested bullet lists
- No comment in the SKILL.md that explains the obvious

## Phase 3 — Generating the SKILL.md

Determine the target path:
- Global skill → `~/.claude/skills/<name>/SKILL.md`
- Project skill (current folder) → `.claude/skills/<name>/SKILL.md`

If unspecified, ask in one line: "Global or specific to the current project?"

Generate the file with this **complete and mandatory** structure:

```markdown
---
name: <name>
description: <precise description with trigger phrases for auto-invocation>
model: <claude-opus-5|claude-sonnet-5|claude-haiku-4-5-20251001>
user-invocable: true|false
type: <orchestrator|framework|domain|utility|context|specialized>
priority: <high|medium|low>
scope: <backend|frontend|infra|mobile|data|security|cross>
dependencies: []
conflicts: []
---

# <Title>

<Purpose in 2 lines max>

## Workflow

<Numbered phases, direct instructions, no redundancy>
```

**Valid values** (respect exact spelling):

| Field | Allowed values |
| --- | --- |
| `type` | `orchestrator` · `framework` · `domain` · `utility` · `context` · `specialized` |
| `priority` | `high` · `medium` · `low` |
| `scope` | `backend` · `frontend` · `infra` · `mobile` · `data` · `security` · `cross` |

Then write the file with the Write tool.

## Phase 3b — Validation before writing

Before writing the file, systematically check:

**Frontmatter — 7 mandatory fields**
- [ ] `name` present, kebab-case, matches the folder name
- [ ] `model` present with a full identifier (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`) — never a short version (`opus`, `sonnet`)
- [ ] `user-invocable` defined
- [ ] `tools` is a minimal, justified list
- [ ] `type` present, value among `orchestrator|framework|domain|utility|context|specialized`
- [ ] `priority` present, value among `high|medium|low`
- [ ] `scope` present, value among `backend|frontend|infra|mobile|data|security|cross`
- [ ] `dependencies` present (empty list `[]` if none)
- [ ] `conflicts` present (empty list `[]` if none)

**Structure**
- [ ] "Optional input (if invoked from X)" section present if the skill will be orchestrated
- [ ] Fallback documented for every invoked child skill
- [ ] Conditional persistence at the end of the report phase (standalone vs. orchestrated)
- [ ] Memory phase with a skip if orchestrated

**Paths**
- [ ] Universal paths (`~/.claude/`), never hardcoded — never `C:\Users\...`
- [ ] Grep exclusions defined (`node_modules/`, `vendor/`, `*.test.*`)
- [ ] If a structured deliverable (report/analysis/specs): output path =
      `<category>/<skill-name>/YYYY-MM-DD_<skill-name>.md`, `mkdir -p` via Bash before writing,
      `Bash` present in tools

## Phase 4 — Confirmation (score ≥ 3 only)

If the priority score is ≥ 3, show a one-line summary:
`Skill created: /name — N tools — path/to/SKILL.md`

If score ≤ 2, say nothing except the created file's path.

## Phase 5 — Automatic improvement

Invoke the `improve-skills` skill with:
- **Input**: path of the created SKILL.md
- **Expected output**: refined description, validated tool list, clarified workflow

> ⚠️ If `improve-skills` is unavailable: display `⚠️ improve-skills not found — manual review recommended` and stop.
