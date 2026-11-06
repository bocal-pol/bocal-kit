# ADR 0042 — Monorepo: extract to `shared/` before any duplication

- **Status**: accepted
- **Date**: 2026-09-17

## Context

In multi-service monorepos, the default reaction to a shared need was copy-pasting from one service to another. The copies drifted silently: a fix applied to one class stayed invisible in its twin, and nothing told the reader a twin even existed. Bugs resurfaced in the forgotten service, months later.

## Decision

### Before copying a file from one service to another

First propose **extracting it to `shared/`** — or to a Composer path-repository package, an internal npm package, depending on the stack.

If duplication is adopted anyway (expected divergence, unacceptable coupling), it carries a mandatory header comment:

```php
// DUPLICATED FROM <path> — keep in sync
```

### Before modifying a file

Grep its class name across **the whole monorepo**. If a copy exists elsewhere:

- either apply the change to both,
- or explicitly flag the accepted divergence.

The usual search exclusions apply: `node_modules/`, `vendor/`, `*.test.*`.

## Positive consequences

- A fix reaches every consumer, or the gap is visible and accepted
- The "DUPLICATED FROM" comment makes the debt traceable with a simple grep
- Extraction to `shared/` is proposed at the point where it costs the least

## Negative consequences / risks

- `shared/` can become a catch-all coupling every service together — code shared by only two services rarely deserves to move there
- The upfront grep slows down every change
- A shared package imposes a versioning discipline that copy-paste never demanded

## Alternatives considered

- **Free duplication**: the initial state, source of the silent drift. Rejected.
- **Total ban on duplication**: forces premature abstractions on needs that were going to diverge anyway. Rejected in favor of the mandatory comment.
- **Automated duplication detection in CI**: useful as a complement, but doesn't replace the decision made at write time.

## Scope

All multi-service monorepos. See also ADR 0043 (new-service test harness) and ADR 0028 (minimal-code discipline). Source: the "Multi-service monorepos" section of `CLAUDE.md`.
