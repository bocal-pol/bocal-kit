# ADR 0036 — Keyboard shortcuts: full coverage + a command palette

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Interfaces were designed exclusively for the mouse. Advanced users (back-office operators, power users) wasted time on repetitive actions with no shortcuts. Discoverability of existing shortcuts (when they existed) was nonexistent.

## Decision

Every action accessible by mouse must have a keyboard shortcut. Three coverage levels:

1. **Global actions** — navigation, create, save, undo
2. **Contextual actions** — every button, menu, table action
3. **Command palette** (`Cmd+K` / `Ctrl+K`) — a universal, searchable entry point

### Discoverability: two mandatory mechanisms

- **Hover tooltip**: shortcut shown to the right of the label (`"Archive  ⌘⇧A"`)
- **`?` panel**: a centralized list of every active shortcut, organized by section, filterable

### Back-office (Filament/Laravel)

Tables: `↑↓` navigation, `E` edit, `D` delete, `Space` select, `Enter` open, `Escape` deselect.

Forms: strict `Tab`/`Shift+Tab`, `Ctrl+Enter` submit, `Escape` cancel.

### Frontend (Angular / React / Flutter)

A centralized shortcut service (e.g. `useHotkeys`) — never scattered `keydown` listeners. Context priority: modal > drawer > page. Single-letter shortcuts disabled when focus is in an input field.

## Positive consequences

- Advanced users can work mouse-free on their common flows
- The `Cmd+K` palette reduces discovery time to zero — everything is searchable
- Cross-app convention consistency reduces the learning curve

## Negative consequences / risks

- Initial development overhead (centralized service, tooltips, `?` panel)
- Single-letter shortcuts can conflict with IMEs (Asian languages) — disable in those contexts
- The command palette is a global component — must be kept in sync with every new action

## Alternatives considered

- **Ad hoc shortcuts with no centralized service**: scattered listeners, conflicts, impossible to maintain. Rejected.
- **Partial coverage (main actions only)**: insufficient for back-office power users. Rejected.
- **Tooltip alone, no reference panel**: passive discovery only, hard to learn. Rejected.

## Scope

All projects with a user interface — frontend (Angular, React, Flutter) AND back-office (Filament/Laravel).
