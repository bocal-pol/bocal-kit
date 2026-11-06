# ADR 0014 — 3-level agent/skill orchestration architecture

- **Status**: accepted
- **Date**: 2026-08-21

## Context

With 100+ skills and 24+ agents, a flat system generated confusion: who calls whom, how to avoid two agents in the same domain running in parallel, how to arbitrate a multi-domain request. Without a hierarchy, delegations were inconsistent.

## Decision

Enforce a strict 3-level hierarchy:

```
Level 0 — Coordination (root)
└── team-dev
    ├── Level 1 — Direction
    │   ├── product-manager   (vision, backlog, specs)
    │   └── tech-lead         (architecture, technical decisions)
    │       └── Level 2 — Implementation (leaves)
    │           ├── backend   → laravel-developer · dotnet-developer
    │           ├── frontend  → react-developer · angular-developer
    │           ├── infra     → sre · devops · cloud-engineer
    │           ├── mobile    → flutter-developer · react-native-developer
    │           ├── data      → data-scientist · data-engineer
    │           └── security  → appsec · security-architect
```

### Delegation rules

- Level 0 → Level 1: multi-domain or ambiguous requests go through `team-dev`
- Level 1 → Level 2: `tech-lead` chooses via the Skill Router
- Never two Level-2 agents in the same domain running in parallel without Level-0 coordination
- A clear single-domain request → invoke Level 2 directly

## Positive consequences

- Consistent, predictable delegation
- Prevents domain conflicts (two backend skills running at once)
- `team-dev` stays the single entry point for complex requests

## Negative consequences / risks

- Routing overhead for simple requests (mitigated by the direct-to-Level-2 rule)
- The hierarchy must be kept up to date as new domains are added

## Alternatives considered

- **Flat system**: all skills at the same level → cacophony, conflicts. Rejected.
- **2 levels**: insufficient to separate coordination, direction, and implementation. Rejected.

## Scope

Cross-cutting — all projects, all agents.
