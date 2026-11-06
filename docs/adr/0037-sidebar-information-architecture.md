# ADR 0037 — Sidebar: information architecture by intent, max 7, primary feature

- **Status**: accepted
- **Date**: 2026-08-24

## Context

Back-office sidebars were built by technical feature: one item per model, table, or controller. Result: 12-15-entry navigations named after the code (`Users`, `Roles`, `Permissions`, `Invoices`, `Payments`…), incomprehensible to a business operator, with the primary feature buried in the middle.

## Decision

Three non-negotiable constraints on any navigation sidebar:

### 1. Grouping by intent

Labels describe what the operator wants to accomplish, never a table or model name. Two modes depending on the app's nature: by **user goal** (Access Management, Billing…) or by **workflow** (Request processing = intake + validation + closure).

### 2. Maximum 7 items at the root level (Miller's Law)

The root sidebar never exceeds 7 entries. If the need exceeds 7, group into submenus or collapsible sections — never add an 8th item without merging or removing an existing one.

Recommended slot order:
1. Primary feature (always first)
2–5. Business-intent groups
6. Reporting / Overview (if relevant)
7. Configuration / Settings (always last)

### 3. Highlighting the primary feature

Two combined mechanisms:
- **A position-1 item** with distinct visual treatment (accent color, a slightly larger Solar icon, a permanent selection background)
- **A fixed quick-action button** pinned at the top (`+ New request`, `+ Create a user`…) — the operator acts without navigating first

## Positive consequences

- Navigation understandable by a non-technical business operator
- Reduced cognitive load (7 choices max vs. 12-15)
- The most frequent action is 0 clicks away from any screen

## Negative consequences / risks

- Requires thinking through business intents before coding the navigation — moderate design overhead
- Groupings can be subjective: validate with the business side when ambiguous

## Alternatives considered

- **Item per model/table**: technical navigation, incomprehensible to the operator. Rejected.
- **Unlimited scrolling sidebar**: excessive cognitive load, important items buried. Rejected.
- **Quick-action button alone, with no distinct primary item**: insufficient to guide the eye. Rejected.

## Scope

Back-office (Filament/Laravel) as a priority. Also applies to frontend application sidebars (Angular, React, Flutter).
