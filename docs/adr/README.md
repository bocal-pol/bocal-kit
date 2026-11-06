# Architecture Decision Records

Structural decisions for this ecosystem and the cross-cutting conventions applied to every project.

- **74 ADRs** — 0000 to 0073, one superseded (0032) and one partially superseded (0048 §2, by 0062)
- **Template**: [0000-template.md](0000-template.md) — includes the "when an ADR is justified" rule
- An ADR is never deleted: an abandoned decision moves to `superseded by` or `deprecated` status

---

## Security, secrets, and compliance

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0001](0001-session-revocation-auth-logout.md) | Mandatory session revocation after logout | accepted | Auth — front + back |
| [0002](0002-secrets-out-of-env.md) | Secrets out of `.env`: a manager is mandatory | accepted | All projects |
| [0034](0034-semgrep-sast-ci-scan.md) | Semgrep SAST + CI-Scan: security gates on PRs | accepted | CI |
| [0035](0035-gdpr-compliance-team-dev-full.md) | GDPR Compliance Officer integrated into `team-dev --full` | accepted | Orchestration |
| [0039](0039-granular-cookie-consent.md) | Mandatory granular cookie consent | accepted | Public web |
| [0044](0044-dependencies-maintained-lineage-audit.md) | Dependencies: maintained lineage and an end-of-session audit | accepted | All projects |
| [0045](0045-subagent-findings-reverification.md) | Direct re-verification of Critical/High subagent findings | accepted | Audits |
| [0058](0058-settings-permissions-by-class.md) | `settings.json` permissions as generic classes | accepted | Config |
| [0059](0059-laravel-security-guardrails.md) | Laravel: mandatory API Resources, default auth, secret-free logs | accepted | Laravel backend |
| [0069](0069-legal-pages-multi-jurisdiction-eu.md) | `legal-pages`: multi-jurisdiction EU support | accepted | Legal pages |

## Frontend, UX, and design

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0003](0003-ui-states-4-mandatory-states.md) | 4 mandatory UI states for every asynchronous render | accepted — canonical | Frontend |
| [0005](0005-error-messages-3-parts.md) | Mandatory 3-part error messages | accepted | UI + API |
| [0007](0007-solar-icons.md) | Solar icon library: the single standard | accepted | All projects |
| [0010](0010-ikea-effect-progressive-ownership.md) | IKEA effect: progressive ownership | accepted | B2C |
| [0011](0011-saveme-pattern-feedback-non-modal.md) | SaveMe: non-modal feedback for reversible actions | accepted | UI |
| [0012](0012-impact-radar-cascading-deletion.md) | Impact radar: transparency for cascading deletions | accepted | UI + back |
| [0013](0013-lazy-principle-zero-unnecessary-input.md) | Lazy Principle: zero unnecessary input | accepted | Forms |
| [0032](0032-4-mandatory-ui-states-superseded.md) | 4 mandatory UI states: Loading / Error / Empty / Success | **superseded by 0003** | — |
| [0033](0033-seo-geo-bootstrap-phase-0.md) | SEO/GEO bootstrap: mandatory Phase 0 before frontend dev | accepted | Public frontend |
| [0036](0036-keyboard-shortcuts-full-coverage.md) | Keyboard shortcuts: full coverage + a command palette | accepted | Any interface |
| [0037](0037-sidebar-information-architecture.md) | Sidebar: intent-based, max 7, primary feature | accepted | Back-office + front |
| [0040](0040-per-project-design-context.md) | `DESIGN.md`, `PRODUCT.md`, and the Surface-mode taxonomy | accepted | Frontend projects |
| [0060](0060-diagram-design-reference-system.md) | `diagram-design` as the visual reference system | accepted | Diagrams |
| [0061](0061-taste-anti-slop-design-dials.md) | `taste`: anti-slop dials and visual styles | accepted | Frontend |
| [0068](0068-hicks-law-action-hierarchy.md) | Hick's Law: on-screen action hierarchy | accepted | Any interface |
| [0071](0071-perceived-performance-reactivity.md) | Perceived performance: instant reactivity and success confirmation | accepted | Any interface |
| [0072](0072-ai-visitor-simulation-team-dev.md) | `ai-visitor-simulation`: hybrid UX simulation, wired into `team-dev` | accepted | Projects with an interface |

## Backend, API, and infrastructure

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0004](0004-api-response-semantic-codes.md) | Semantic HTTP codes and a unified API response format | accepted | API |
| [0006](0006-resilience-under-load.md) | Resilience under load: mandatory checklist | accepted | Back + infra + mobile |
| [0031](0031-dto-architect-single-source.md) | DTO Architect: a single source for cross-stack DTO conventions | accepted | Cross-stack |
| [0041](0041-infra-done-consumer-proof.md) | Definition of "done" for infra: service + consumer + proof | accepted | Infra |
| [0067](0067-logging-architect-cross-stack-skill.md) | Logging Architect: a cross-cutting skill instead of per-stack | accepted | Cross-stack |
| [0042](0042-monorepo-extraction-shared.md) | Monorepo: extract to `shared/` before duplicating | accepted | Monorepos |
| [0043](0043-new-service-test-harness.md) | New service: inherit the test harness from its sibling | accepted | Monorepos |

## Working method

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0008](0008-upfront-alignment.md) | Upfront alignment before any non-trivial change | accepted | All projects |
| [0009](0009-unlazy-acceptance-gates.md) | Unlazy: acceptance gates before any substantial task | accepted | All projects |
| [0019](0019-session-hygiene-compaction.md) | Session hygiene and context compaction | accepted | Sessions |
| [0028](0028-ponytail-minimal-code.md) | Minimal Code Discipline before writing | accepted | All code |
| [0029](0029-karpathy-guidelines-guardrails.md) | Karpathy Guidelines: behavioral guardrails | accepted | All code |
| [0030](0030-spec-driven-development.md) | Integrated Spec-Driven Development (SDD) workflow | accepted | Product chain |
| [0038](0038-friction-retro-environment-retrospective.md) | Friction Retro: end-of-session environment retrospective | accepted | Sessions |
| [0046](0046-subagent-discipline-mcp-hygiene.md) | Subagent discipline and MCP hygiene | accepted | Sessions |
| [0056](0056-project-bootstrap-kit.md) | Project bootstrap kit produced by `project-bootstrap-agent` | accepted | New projects |
| [0070](0070-project-bootstrap-legal-compliance.md) | `project-bootstrap-agent`: conditional legal-compliance phase (complements 0056) | accepted | New projects |

## Orchestration — agents and skills

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0014](0014-3-level-orchestration-architecture.md) | 3-level orchestration architecture | accepted | Ecosystem |
| [0015](0015-skill-router-weighted.md) | Centralized Skill Router with a weighted strategy | accepted | Ecosystem |
| [0016](0016-model-tiering-haiku-sonnet-opus.md) | Model tiering: Haiku / Sonnet / Opus | accepted | All skills |
| [0018](0018-logging-skill-selection.md) | Skill invocation log | accepted | Observability |
| [0021](0021-mandatory-skill-md-frontmatter.md) | Mandatory frontmatter metadata in SKILL.md | accepted | All skills |
| [0025](0025-canary-drift-detection.md) | Canary: instruction-drift detection | accepted | All sessions |
| [0047](0047-subagent-stop-isolation.md) | `<SUBAGENT-STOP>`: isolating root-agent-only instructions | accepted | Bootstraps |
| [0049](0049-personal-agents-registry.md) | `personal-agents.json` registry and guided PO creation | accepted | Personal POs |
| [0050](0050-skill-md-writing-conventions.md) | SKILL.md writing conventions beyond the frontmatter | accepted | All skills |
| [0052](0052-entry-points-outside-team-dev.md) | Business entry points outside the `team-dev` hierarchy | accepted | IT support + procurement |
| [0054](0054-project-specific-domain-skills.md) | Project-specific domain skills hosted in the global config | accepted | Domain-specific skills |

## Environment and configuration

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0017](0017-security-modes-safe-dev-audit.md) | Security modes: safe / dev / audit | accepted | All sessions |
| [0020](0020-git-workflow-conventional-commits.md) | Global Git workflow and Conventional Commits | accepted | All repos |
| [0073](0073-local-validation-before-pr.md) | Mandatory local validation before any PR (complements 0020) | accepted | All repos |
| [0022](0022-context7-up-to-date-docs.md) | Context7 MCP: systematically up-to-date documentation | accepted | Third-party libraries |
| [0023](0023-hugging-face-mcp-image-video.md) | Hugging Face MCP: free image/video generation | accepted | Media |
| [0024](0024-memory-system-primer-hindsight.md) | Cross-session memory system | accepted | Ecosystem |
| [0026](0026-global-hooks-stop-pretooluse.md) | Global hooks (SessionStart, Stop, PreToolUse) | accepted — amended 2026-09-17 | Global config |
| [0027](0027-temporary-file-hygiene.md) | Temporary file hygiene | accepted | All projects |
| [0048](0048-claude-config-mirror-repo.md) | This repo is a versioned mirror of `~/.claude` | **§2 superseded by 0062** | Ecosystem |
| [0051](0051-private-tag-collision-safe-logs.md) | The `<private>` tag and collision-safe writes for shared logs | accepted | Memory + logs |
| [0053](0053-mcp-fleet-selective-activation.md) | MCP fleet: a versioned scope and selective activation | accepted | MCP tooling |
| [0057](0057-memory-reports-naming.md) | Memory and report naming conventions | accepted | Memory |
| [0062](0062-claude-dir-checkout-git.md) | `~/.claude` is a git checkout of this repo, not a copy | accepted | Ecosystem |
| [0063](0063-mit-license-sharing.md) | MIT license and contribution governance | accepted | Shared repo |
| [0064](0064-personal-scope-separation.md) | Personas named by function, a separate overlay for personal data | accepted | `~/.claude` |
| [0065](0065-claude-md-lightening.md) | Lightening `CLAUDE.md`: one rule, one source | accepted | Instructions |
| [0066](0066-api-finder-static-snapshot.md) | `api-finder`: a static snapshot rather than a runtime clone | accepted | Skills |

## Business domain

| # | Title | Status | Scope |
| --- | --- | --- | --- |
| [0055](0055-procurement-domain-conventions.md) | Public-procurement domain conventions | accepted — dated thresholds | Procurement domain |

---

## Dependency chains worth knowing

Some ADRs complement each other and read together:

- **Orchestration** — 0014 (hierarchy) → 0015 (router) → 0047 (leaf isolation) → 0052 (IT/procurement exception)
- **Session cost** — 0016 (tiering) + 0019 (compaction) + 0046 (subagents & MCP) + 0053 (MCP fleet)
- **Skills** — 0021 (frontmatter) + 0050 (SKILL.md body)
- **Memory** — 0024 (system) + 0051 (`<private>`, collision-safe) + 0057 (naming)
- **Upfront work** — 0008 (alignment, before deciding) then 0009 (gates, before implementing)
- **Monorepo** — 0042 (duplication) + 0043 (test harness)
- **Secrets & config** — 0002 (secrets) + 0026 (hooks) + 0058 (permissions)
- **Git workflow** — 0020 (branches, commits) + 0073 (local validation before PR)
- **Legal compliance** — 0069 (multi-jurisdiction `legal-pages`) → 0070 (bootstrap integration, complements 0056)
- **Perceived UX before production** — 0071 (reactivity/confirmation) + 0072 (`ai-visitor-simulation`), both complementary to 0003/0005/0006/0011 without duplicating them
