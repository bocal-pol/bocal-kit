# ADR 0015 — Centralized Skill Router with a weighted strategy

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Skill priorities were hardcoded in `CLAUDE.md`, `team-dev`, and each agent separately. Changing a priority required editing several files, with a risk of divergence. There was no single source of truth for domain arbitration.

## Decision

Centralize conflict resolution in `.router.json` (single source of truth) with a `weighted` strategy and a `general-engineer` fallback.

### Per-domain priority matrix

| Domain | Decreasing priority |
| ------- | --------------------- |
| `frontend` | `react-developer` › `angular-developer` › `frontend-updater` |
| `backend` | `laravel-developer` › `dotnet-developer` › `backend-updater` |
| `infra` | `sre` › `devops` › `cloud-engineer` |
| `mobile` | `flutter-developer` › `react-native-developer` › `mobile-updater` |
| `data` | `data-scientist` › `data-engineer` › `analytics-engineer` |
| `security` | `appsec` › `security-architect` › `pentest` |

Changing a priority: edit `.router.json` only — never `CLAUDE.md` or agents directly.

## Positive consequences

- A single place to change when updating a priority
- No possible divergence between agents
- An explicit, documented fallback

## Alternatives considered

- **Hardcoded tables per agent**: impossible to maintain at scale. Rejected.

## Scope

Cross-cutting — orchestration, all agents.
