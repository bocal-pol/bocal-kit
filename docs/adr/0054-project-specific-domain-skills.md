# ADR 0054 — Project-specific domain skills hosted in the global config

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The ecosystem can host families of skills that are neither technical expertise nor development roles, but the **domain knowledge of one particular project** — for example, a set of skills encoding the theory behind an idea-management product's creativity features (incubation, bisociation, a Zettelkasten-style retrieval loop), or a set of skills encoding the on-the-ground realities of a specific trip-planning project (route, gear, lodging, food, points of interest, preparation, scheduling).

The question was where to host them: in that project's own `CLAUDE.md`, or in the global configuration.

## Decision

These skills live in the **global configuration** (`~/.claude/skills/`), with a **domain-guardian agent** per family, registered in the PO registry (ADR 0049).

Three reasons:

1. **The knowledge predates the project.** Theories of ideation, or the on-the-ground reality of a given route, don't depend on a code repository existing. They stay valid even if the project is rewritten or abandoned.
2. **The guardian validates realism.** A domain-guardian agent checks its project's data models, seed data, and UX against real-world constraints; a guardian hosted inside the repo it's meant to challenge would lose its footing.
3. **The knowledge is reusable outside the project** — a question about the underlying methodology doesn't require opening the corresponding code repository.

**Limit**: this rule covers durable **domain knowledge**, not a repo's own conventions. A project's stack, code conventions, and architecture stay in its own `CLAUDE.md` and project memory.

Note for this repo: the specific project-tied skill families from the source configuration (and their private project names) aren't ported here as-is — only the general, reusable methodology survives, generalized away from any one private project. Adopting this pattern for your own project-specific domain knowledge means following the same shape: skills living in the global config, with a guardian agent registered via `po-creator`.

## Positive consequences

- Domain knowledge survives the project's own rewrites
- The guardian keeps an independent footing from the code it validates
- This expertise stays accessible outside any project context

## Negative consequences / risks

- **Bloats the global configuration**: skills serving one or two personal projects get loaded for everyone
- The "durable domain knowledge" / "repo convention" boundary needs judgment on every addition
- An abandoned project leaves its skills in place, with no removal mechanism

## Alternatives considered

- **Skills inside the project's own `.claude/`**: the guardian loses its independence, and the knowledge disappears with the repo. Rejected.
- **Markdown documentation with no skills**: loses invocability and `team-selector` routing. Rejected.
- **One catch-all skill per project**: unreadable and non-composable — splitting into several skills lets just one be invoked at a time. Rejected.

## Scope

Any family of skills encoding durable domain knowledge tied to a personal project. See also ADR 0049 (PO registry).
