---
name: knowledge-manager
description: "Knowledge Manager — project wiki, FAQ, glossary, decision log, knowledge map, lessons learned. Human organizational memory (distinct from memory-rituel, which manages the AI agent's memory). Auto-invoke on mention of: wiki, project FAQ, glossary, knowledge base, lessons learned, decision log, knowledge map, knowledge capitalization."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Knowledge Manager — Organizational Memory

Produces and structures the project's knowledge base for the human team.
Reference: SECI model (Nonaka & Takeuchi) — Socialization / Externalization / Combination / Internalization.

## Absolute boundary with `memory-rituel`

| | `knowledge-manager` | `memory-rituel` |
|--|---------------------|----------------|
| **Audience** | The human team | The Claude AI agent |
| **Storage** | `docs/wiki/`, `docs/decisions/`, `docs/lessons-learned/` | `.claude/memory/` |
| **Content** | Wiki, FAQ, glossary, decision log, knowledge map | Feedback, preferences, AI project context |
| **Trigger** | Request for organizational capitalization | AI memory consolidation |

**Non-negotiable rule**: `knowledge-manager` never reads or modifies `.claude/memory/`. `memory-rituel` never reads or modifies `docs/wiki/`. Both can coexist on the same project without interference.

## Optional input (if invoked from `documentation-agent`)

If scope + existing sources + `tech-writer` outputs are supplied:
- Use them directly without asking questions
- Start at Phase 2

Otherwise: run the full workflow from Phase 1.

## Workflow

### Phase 1 — Knowledge source audit

Glob and read scattered sources (exclude `node_modules/`, `vendor/`, `dist/`, `build/`):

1. **Existing documentation**: `docs/**/*.md`, root `*.md`, `README.md`
2. **Source code**: Grep `TODO|FIXME|HACK|XXX|NOTE:` in `**/*.{js,ts,php,py,java,go}` (exclude `*.test.*`) → implicit recurring questions
3. **Commits**: `git log --oneline -50` via Bash to identify past decision patterns
4. **AI memory** (reference reading only): read `.claude/memory/MEMORY.md` if present — extract organizational patterns (not AI preferences) useful for the wiki

**⚠️ Fallback**: if no source file is found → produce empty templates with `<!-- To fill in: ... -->` placeholders and display `⚠️ No knowledge source detected — templates produced for manual completion`

### Phase 2 — Artifact production

#### 2a — Wiki structure (`docs/wiki/README.md`)

Proposed tree depending on project complexity:

```markdown
# Wiki — [Project name]

## Navigation

- [FAQ](FAQ.md) — Frequently asked questions and answers
- [Glossary](Glossary.md) — Business and technical terms
- [Knowledge Map](knowledge-map.md) — Who knows what
- [Decisions](../decisions/) — Chronological decision log
- [Lessons learned](../lessons-learned/) — Post-event capitalization

## By domain

- [Architecture](architecture.md) — Links to `architecture/`
- [Security](security.md) — Links to `security/`
- [Processes](processes.md) — Team workflows and conventions
- [Tools](tools.md) — Stack, accounts, access
```

**Canonical location**: `docs/wiki/README.md` (stable, not timestamped).

#### 2b — FAQ (`docs/wiki/FAQ.md`)

Generate from the recurring patterns detected (TODO/FIXME in Phase 1, commits, code comments):

```markdown
# FAQ — [Project name]

## Installation & Setup

**Q: [Detected or frequent question]**
A: [Answer based on existing docs or a placeholder]

## Common errors

**Q: [Common error message]**
A: [Solution + link to reference doc]

## Process and conventions

**Q: [Process question]**
A: [Answer]
```

Flag unknown answers: `<!-- To fill in: @[go-to-person] -->`

**Canonical location**: `docs/wiki/FAQ.md`.

#### 2c — Glossary (`docs/wiki/Glossary.md`)

Extract business and technical terms from:
- The source code (class names, modules, meaningful business function names)
- Existing documentation (terms in **bold** or implicitly defined)
- Functional specs (`analyse/functional-analyst/`)

Format:

```markdown
# Glossary — [Project name]

## Business terms

| Term | Definition | Synonyms | Usage context |
|-------|-----------|-----------|-----------------|
| [Term] | [Precise definition in this context] | [Alt.] | [Where used] |

## Acronyms and abbreviations

| Acronym | Meaning | Description |
|----------|--------------|-------------|
| API | Application Programming Interface | ... |

## Technical terms (project-specific)

| Term | Definition | Source file |
|-------|-----------|----------------|
```

**Canonical location**: `docs/wiki/Glossary.md`.

#### 2d — Decision log (`docs/decisions/YYYY-MM-DD-decisions.md`)

Chronological trace of notable decisions (not just architectural — product, process, tooling):

```markdown
# Decision Log — YYYY-MM-DD

## DEC-XXX — [Decision title]

**Date**: YYYY-MM-DD
**Author(s)**: [Name / role]
**Context**: [Situation that required a decision]
**Decision made**: [What was decided]
**Rejected alternatives**: [And why]
**Consequences**: [Expected impact]
**Linked ADR**: [ADR-XXX if an architectural decision — see `architecture/`]
**Status**: Active / Revisited / Cancelled
```

Note: formal ADRs are produced by the `architect` skill. The decision log here covers all decisions, including non-architectural ones.

**Location**: `docs/decisions/YYYY-MM-DD-decisions.md` (timestamped, as a chronological snapshot).

#### 2e — Knowledge map (`docs/wiki/knowledge-map.md`)

Expertise directory by domain:

```markdown
# Knowledge Map — [Project name]

## Areas of expertise

| Domain | Go-to person | Level | Notes |
|---------|-------------|--------|-------|
| Architecture | <!-- To fill in --> | Expert | |
| Database | <!-- To fill in --> | | |
| Security | <!-- To fill in --> | | |
| [Business domain] | <!-- To fill in --> | | |

## Bus factor

> At-risk domains (single expert):
> - [Domain]: @[Person] — document as a priority

## Update process
Review at every new team member's onboarding and after each training session.
```

**Canonical location**: `docs/wiki/knowledge-map.md`.

#### 2f — Lessons learned template (`docs/lessons-learned/TEMPLATE.md`)

Template to duplicate after each incident, release, or project end:

```markdown
# Lessons Learned — [Event] — YYYY-MM-DD

## Context
[Describe the event: incident / release / sprint end / project end]

## What went well ✅
1. ...

## What went less well ⚠️
1. ...

## What didn't work ❌
1. ...

## Decided actions
| Action | Owner | Due date | Status |
|--------|------------|---------|--------|
| | | | |

## Decisions generated
[Link to `docs/decisions/` if a formal decision was made]
```

**Location**: `docs/lessons-learned/TEMPLATE.md` (stable, to duplicate with a date).

### Phase 3 — Notion delegation (optional)

If a Notion MCP is configured (Grep `notion` in `~/.claude.json` or environment variables), display:

```
→ Notion migration available via the connected Notion MCP.
  To import docs/wiki/ into Notion:
  1. Configure the target database in Notion
  2. Invoke: /team-dev --ask knowledge-manager [notion-migration]
  Do not run automatically — manual validation required before migration.
```

**⚠️ Fallback**: if no Notion MCP is configured → silently skip this phase.

### Phase 4 — Conditional persistence

- **Standalone**:
  1. Write the artifacts to their canonical locations (Phase 2)
  2. Bash: `mkdir -p docs/knowledge-manager` then Write a report `docs/knowledge-manager/YYYY-MM-DD_knowledge-manager.md`:
     - Inventory of files produced
     - Identified gaps with `<!-- To fill in -->` placeholders
     - Review recommendation (frequency, owner)
     - Note on the `knowledge-manager` vs `memory-rituel` boundary
- **Orchestrated** (invoked from `documentation-agent`): return Markdown content + file manifest, no separate report

**⚠️ Fallback**: if the `docs/` directory can't be created → display all content to the console output with the target paths annotated.

### Phase 5 — Memory

> ⏭️ Skip if invoked from `documentation-agent`.

If invoked directly: append to `.claude/memory/` a file `project_knowledge_base.md` (type `project`) noting the major identified gaps and the wiki's last review date.
