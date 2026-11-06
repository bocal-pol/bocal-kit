# ADR 0065 — Lightening `CLAUDE.md`: one rule, one source

- **Status**: accepted
- **Date**: 2026-09-17

## Context

`CLAUDE.md` had grown to nearly a thousand lines, loaded in full at every session alongside `primer.md` and `hindsight.md` — well over a thousand lines of preamble before the first real question, multiplied by every session and by every person once the repo is shared.

A sharing audit showed this volume wasn't density but redundancy:

- A large consecutive block (roughly 40% of the file) detailed six product rules — SaveMe, Sidebar, keyboard shortcuts, the Lazy Principle, the impact radar, the IKEA effect — which only apply to deliveries with an interface, and each of which was **already documented in an ADR**.
- The Skill Router table copied `skills/.router.json` line for line, two lines after declaring that file the "single source of truth."
- A dozen convention blocks appeared in at least two of the three files loaded together, ten in all three.
- Two `hindsight.md` entries had been promoted **verbatim** into `CLAUDE.md` rules, so the same information was loaded twice.

## Decision

### 1. One rule has one source, other files point to it

| Topic | Single source |
| --- | --- |
| Skill, agent, git, security, and cost conventions | `CLAUDE.md` |
| Detail of the six product rules | `PRODUCT-RULES.md` (new) |
| Skill Router priorities | `skills/.router.json` |
| The motivation behind a decision | `docs/adr/` |
| How to contribute | `CONTRIBUTING.md` |

`README.md` becomes descriptive and points elsewhere; `primer.md` is trimmed to what no other file says — the repo's purpose, its mount pattern as a git checkout, its counters.

### 2. `PRODUCT-RULES.md`

The bulk of the product-rules content moves out of `CLAUDE.md`, which keeps a one-line-per-rule table with a link to the corresponding ADR and a one-sentence reminder. The file is read **before shipping** a screen, a form, a navigation, or a user action.

Its scope is made explicit, which it wasn't before: these rules don't apply to internal tools with no interface, to APIs, or to MVPs under two weeks. Declared as "cross-cutting, all projects" with no scope, they made it nearly impossible to call any screen done.

### 3. The canary moves to `CLAUDE.local.md`... then back

Claude Code automatically loads `CLAUDE.local.md` if it exists and ignores it otherwise — a native mechanism, with no `@import` whose behavior on a missing file isn't documented. The file is gitignored.

**Decision revised the same day**: the canary **stays in the shared `CLAUDE.md`**. It doesn't detect a deliberate deviation, it signals that the instructions were actually loaded — and that's true for every person, not just the repo's maintainer. Only the word itself changes, to `canary`: the previous word also named something else in the instructions, so it could legitimately appear in a response without being the canary. See the amended ADR 0025.

`CLAUDE.local.md` nonetheless stays the right place for any machine-specific instruction, and the mechanism is documented in `CLAUDE.md` for that purpose.

### 4. Purging `hindsight.md`

**A lesson promoted into a `CLAUDE.md` rule is removed from the journal.** The rule is stated at the top of the file.

### 5. Agent / skill naming

The hierarchy named its leaves after a **skill** (e.g. `laravel-developer`) while the same file's obligations addressed **agents** — to the point that two sections contradicted each other on who "the backend" even was. The hierarchy now names agents at every level, with the skills they invoke in parentheses.

## Positive consequences

- Session preamble shrank by roughly a third — less to load on every session, for every person
- A changed rule now only needs to be changed in one place
- The scope of the product rules is finally explicit

## Negative consequences / risks

- A pointer is only read if it's followed: a product rule could be forgotten where it used to sit in plain view. The reminder table in `CLAUDE.md` exists for that, and the ADRs remain the substantive reference.
- `CLAUDE.md` still carries a substantial line count. Most of what remains is genuinely cross-cutting convention; further lightening would mean arbitrating rules away, not just moving text.
- `CLAUDE.local.md`, being unversioned, isn't backed up.

## Alternatives considered

- **ADR pointers alone, no `PRODUCT-RULES.md`**: ADRs explain *why* a decision was made, not *how* to apply it; completion checklists wouldn't have fit there. Rejected.
- **Leaving it as-is**: an accepted cost, but multiplied by every person once the repo is shared. Rejected.
- **An `@import` to a gitignored personal file**: Claude Code's behavior on a missing import isn't documented; `CLAUDE.local.md` covers the case natively. Rejected.

## Scope

`CLAUDE.md`, `primer.md`, `hindsight.md`, `README.md`, `PRODUCT-RULES.md`, `CLAUDE.local.md`. See also ADR 0010 through 0013, 0036, 0037 (the six product rules) and 0063 (sharing the repo).
