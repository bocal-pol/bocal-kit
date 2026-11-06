# ADR 0057 — Memory and report naming conventions

- **Status**: accepted
- **Date**: 2026-09-17

## Context

ADR 0024 sets up the cross-session memory system and its four types (`user`, `feedback`, `project`, `reference`), declared in each file's frontmatter. But the **filename** stayed free-form: files existed whose name alone told nothing about their nature. Finding "the rule the user set about commits" meant opening files one by one.

Same problem for reports produced by audit skills: with no convention, they piled up with no way to tell two runs of the same skill apart by date.

## Decision

### 1. The memory filename carries its type

`<type>_<subject>.md` — the prefix echoes the type declared in the frontmatter:

| Prefix | Content |
| --- | --- |
| `user_` | Who the user is — role, expertise, preferences |
| `feedback_` | A correction or confirmed approach, with its why |
| `project_` | Work in progress, a goal or constraint not deducible from the code |
| `reference_` | A pointer to an external resource |
| `skill_` | An observation about a skill in the ecosystem |
| `bug_rule_` | A rule drawn from a bug, to avoid repeating it |

The filename and the frontmatter's `name:` field stay consistent.

### 2. `MEMORY.md` is an index, never content

One line per memory — `- [Title](file.md) — hook`. No memory content is ever copied there: it's the file loaded every session, so it must stay short.

### 3. Skill reports

`<category>/YYYY-MM-DD_<skill>.md` — the date first, for natural chronological sorting, then the producing skill.

### 4. Absolute dates

Any date in memory is absolute (`2026-09-17`), never relative ("last week"): memory gets re-read months later, outside its writing context.

## Positive consequences

- An `ls` of the memory folder is enough to find the right category without opening a file
- `MEMORY.md` stays light even though it's loaded on every startup
- Reports from the same skill sort and compare over time

## Negative consequences / risks

- The prefix duplicates information already present in the frontmatter — two places to keep consistent
- The `feedback_` / `project_` boundary stays debatable on some entries
- A misfiled memory becomes invisible in practice, even if correctly written

## Alternatives considered

- **Free-form names + an index**: the index goes stale, and an orphaned memory becomes unfindable. Rejected.
- **Subfolders per type**: more rigid, and complicates `[[name]]` links between memories. Rejected in favor of the prefix.
- **Everything in `MEMORY.md`**: the file loaded every session would grow without bound. Rejected.

## Scope

Cross-session memory and reports produced by skills. Complements ADR 0024. See also ADR 0051 (the `<private>` tag).
