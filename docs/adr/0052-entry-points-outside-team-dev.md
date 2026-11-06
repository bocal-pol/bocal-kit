# ADR 0052 — Business entry points outside the `team-dev` hierarchy

- **Status**: accepted
- **Date**: 2026-09-17

## Context

ADR 0014 establishes `team-dev` as the single entry point, with a 3-level hierarchy: Coordination → Direction → Implementation. This structure is calibrated for software development — product, architecture, backend, frontend, infra, data, security.

Two domains don't fit it. IT support (multi-vendor networking, Windows/AD, service bulletins, hardware inventory, recurring outages) and administrative procurement work (vendor contracts, specifications, purchase orders, budget plans) don't produce software. Routing them through `product-manager` then `tech-lead` added two levels of delegation with no value: neither has any arbitration to make on a purchase order.

## Decision

`ict-director-agent` and a procurement-focused agent are **standalone agents, outside the `team-dev` hierarchy**, invoked directly:

```bash
/ict [--mode | -alias]      # network, switches, firewall, support, bulletins, inventory
  -r network · -fw firewalls · -sw switch audit · -sup Windows/AD/PC support
  -bs bulletins · -inv inventory · -rp reports · -ip recurring outages
  -sec security · -a auto (ICT Skill Router)

/procurement [--mode | -alias]  # procurement & ICT administration
  -ctr contracts · -spec specifications · -po purchase order · -bg budget plan
```

Each embeds its own internal alias-based routing, and `ict-director-agent` has a dedicated ICT Skill Router (`-a`).

**This exception is bounded**: it applies to domains that don't produce software. A new domain isn't added to it for convenience — if it produces code, it goes through `team-dev`.

Both agents can delegate into the common ecosystem (e.g. `ict-director-agent -sec` invokes `security-agent`); the reverse never happens.

## Positive consequences

- Two levels of delegation avoided on every IT-support or procurement request
- Short aliases match the user's own business vocabulary, not software-development jargon
- Delegating out to `security-agent` avoids duplicating security expertise

## Negative consequences / risks

- **Three entry points instead of one**: the user has to know which to target, exactly what ADR 0014 was trying to avoid
- A mixed request (deploying an internally built IT tool) falls between the two scopes
- The exception can set a precedent and fragment the ecosystem if not kept in check

## Alternatives considered

- **Integrate IT support and procurement as `team-dev` modes**: formally consistent, but imposes a software-development hierarchy on administrative domains. Rejected.
- **A third root orchestrator unifying IT support + procurement**: a coordination level for two domains with no real overlap. Rejected.
- **Skills with no agent**: would lose alias-based routing and domain memory. Rejected.

## Scope

`ict-director-agent` and the procurement agent. An explicit, bounded exception to ADR 0014.
