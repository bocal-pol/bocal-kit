# ADR 0028 — Minimal Code Discipline: a decision ladder before writing

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Development agents tended toward over-engineering: introducing unnecessary dependencies, creating premature abstractions, writing more code than needed. This behavior increases technical debt and maintenance costs.

## Decision

Before writing or modifying code, walk the `minimal-code-discipline` decision ladder in this order:

1. Does this feature need to exist at all?
2. Is it already in the codebase?
3. Does the stdlib cover it?
4. Does a native framework feature cover it?
5. Does an already-present dependency cover it?
6. Does a single line of code cover it?
7. Otherwise → write the minimum necessary

**Be lazy about solutions, never about reading.** Read the existing code before writing.

Non-negotiable: validation, error handling, security, accessibility — these are never sacrificed in the name of brevity.

## Positive consequences

- Reduces technical debt from the first commit
- Fewer dependencies = smaller attack surface, fewer updates
- More readable, more maintainable code

## Alternatives considered

- **Write then refactor**: the refactoring rarely happens. Rejected.

## Scope

Cross-cutting — `backend-agent`, `frontend-agent`, `mobile-agent`, all projects.

## Amendment 2026-09-11 — upstream alignment (v4.9)

Three upstream rules absent from the initial version were added:

1. **Bug fix = root cause**: grep all callers before editing; a guard in the shared function beats a guard per caller.
2. **Minimal verification**: any non-trivial logic leaves an executable check (assert / `__main__` / a `test_*`); a trivial one-liner doesn't need one.
3. **A restricted shortcut marker** for genuine shortcuts with a known ceiling, naming the upgrade path; a native or stdlib choice isn't marked this way.

The skill also gets a model-oriented `description:` frontmatter (explicit triggers), absent until then.
