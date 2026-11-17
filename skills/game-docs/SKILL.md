---
name: game-docs
description: "Write and maintain a game's design docs: a one-page GDD with a feature index and short per-feature notes, kept in sync with the code. Auto-invoke for \"write a GDD\", \"spec this mechanic\", or to update docs after a playtest or a code change. Not for building a game when no docs were requested (`prototype-fast`, `game-jam`), nor for technical code documentation (`tech-writer`) nor for level plans (`level-design`)."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Game docs

Keep a game's design written in as few words as possible so it stays true. The GDD fits on one
page, says what the game is, and maps its features; each feature's detail lives in its own
short note; and every number in the docs matches the code. Docs nobody keeps current are worse
than no docs: this skill writes less, edits in place, and resyncs after every change instead of
piling up text.

> Adapted from the `game-docs` skill of
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- The user explicitly asks for a GDD or design docs.
- The project already has a GDD and a feature is being designed, changed, built, or cut.
- The docs need to be resynced with code that was just written or changed.

**Not this skill**: never add a GDD unless something asks for one — a request to build a game
or a feature is not a request for docs, let the engine and genre skills build and offer the docs
in one line at the end only. Not for technical code documentation, READMEs, or comments
(`tech-writer`); not for level plans, pacing, or encounters (`level-design`).

## Main workflow

1. **Look before writing.** Search for existing docs (`GDD.md`, `*design*`, `*spec*`, `docs/`,
   `design/`, a wiki folder, spec-kit-style `specs/`) and keep their folder, file names,
   language, and format. Read the conversation (often the main source) and, if code exists, the
   repo and its history. Never ask what the repo or the conversation already answer.
2. **Sort the project into one of three cases**, which decides everything else:
   - **No GDD.** Only an explicit GDD request starts one.
   - **A GDD in the target layout** (feature index + per-feature design note). Use the modes
     below as-is.
   - **A GDD in another form** (a single long file, a wiki page, a spec-tool folder). **Edit it
     in place, in its own format.** Make the smallest possible change, in the user's style; don't
     add an index or folders unless they ask for it.
3. **Pick the mode** based on what the user wants:

   | The user wants | Mode |
   |---|---|
   | a GDD, and there isn't one | **A. Write the GDD** |
   | a new feature written up | **B. New feature** |
   | a feature changed after a playtest or a cut | **C. Change a feature** |
   | docs aligned with code that just changed | **D. Sync after coding** |
   | an existing GDD migrated to the target layout (explicitly requested) | **E. Migrate** |
   | a design decision recorded | **F. Record a decision** (also implicit in every other mode) |

4. **Write.** Change existing docs with small, targeted edits to the relevant section rather
   than regenerating a whole document, because the user's word choices are part of the design.
5. **Verify** every touched number against its source (the code, the diff, or the user's
   message) before concluding.
6. **Report back in a few lines**: docs created or changed, the substance in 2-4 lines,
   assumptions flagged and the questions that actually matter, and decisions recorded or
   statuses changed. No to-do list or offer of more docs unless asked.

## Patterns

### 1. What gets written, and when

| Moment | What gets written |
|---|---|
| Explicit request for a GDD | `GDD.md`, about one page, with the real design in it, plus a concrete design note (starting rules and numbers, marked `[ASSUMPTION]`) for the 2-3 features the core loop needs. The rest stay index lines at `idea` status |
| A feature gets designed | its design note |
| A feature gets its first code (`in progress` status) | short implementation and test notes, written against the real code |
| Code shared across features appears (save format, event bus) | a short architecture note; until then, one line in the GDD summary names the engine |

**Statuses**, always the same words: `idea` → `designed` → `in progress` → `implemented`, plus
`changed — code pending` and `cut`. A feature's status lives in two places (the GDD index line
and its note's Status header), and they must agree.

### 2. One-page GDD skeleton

```markdown
# <Game name> — GDD

## Pitch
<2-3 sentences: core fantasy, for whom, on which platform>

## Core loop
<the repeated verb, the session loop>

## Feature index

| Feature | Status | Note |
|---|---|---|
| Movement | designed | [detail](features/movement.md) |
| Inventory | idea | — |
| Combat | in progress | [detail](features/combat.md) |

## Decisions
- <date> — <decision> — <why> [ASSUMPTION if unconfirmed]
```

### 3. Short feature note (`features/<slug>.md`)

```markdown
# <Feature>

**Status:** designed

## Rules
<the concrete rules, starting numbers marked [ASSUMPTION] if unvalidated>

## Code link
<file or module path once in progress>
```

## Verify

1. Every number cited in the touched docs matches its source (code, diff, or user message) —
   reread after each section edit.
2. A feature's status is identical in the GDD index and in its detail note.
3. Existing docs weren't restructured (index added, folders created) without an explicit
   request.
4. The GDD still fits on about one page; if a section overflows, the detail goes in the feature
   note, not the GDD.
5. `[ASSUMPTION]` flags and real open questions are listed in the report, not only in the
   document.

## Pitfalls

- **"Write a GDD" produced 20+ files.** A design note, an implementation plan, and a test plan
  for every MVP feature before any code exists → one page of GDD plus notes for only the
  core-loop features.
- **The GDD came back as an empty template.** Pillars and a feature list with every rule
  deferred give nothing to build or debate against → propose the core mechanics with starting
  numbers, marked `[ASSUMPTION]`, and let the user change them.
- **Unrequested extras in the user's document.** To-dos added to their GDD, restructuring
  offers, "want me to write more docs?" → edit what was asked, put real open questions in the
  reply, not the document.
- **A simple GDD got restructured.** The user asked for a small update and the agent added an
  index or folders to look tidy → edit the GDD where it is, in its existing format.
- **Asking for numbers already in the code.** Playtest calibration often lands in the code
  before the docs → read the diff first, only mark `changed — code pending` if the code
  genuinely misses the change.
- **Two docs contradicting each other on a number.** It got copied → every fact has one home,
  everything else links to it.
- **Docs drift from the code for lack of an update.** A feature changes in code without its
  design note following → always resync after any code change touching a documented feature
  (mode D).

## References

- No external doc: this skill relies on internal discipline (one fact, one home), not a
  third-party tool or standard.

## Related skills

- `tech-writer`: technical documentation of the code (README, API docs) — distinct from the GDD.
- `level-design`: level plans, pacing, encounters — distinct from GDD features.
- `prototype-fast`: checking whether a mechanic is fun; write its note once it's kept.
- `game-jam`: scoping under a deadline — a jam's docs are limited to the GDD page, nothing more.
- `game-designer`: designing the mechanics themselves, upstream of documenting them.

## Version notes

Last checked: 2026-11-17. This skill depends on no external platform or rule whose pricing or
deadlines change; nothing to recheck on that account beyond the conventions of the specific
project involved.
