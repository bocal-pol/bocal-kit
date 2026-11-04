# ~/.claude — Claude Code ecosystem

A public, English, anonymized Claude Code configuration — skills, orchestrator agents, and
conventions to automate development, security, infrastructure, data, design, and project
management workflows. Maintained by Bocal (`bocal-pol` on GitHub) as the public fork of a private
personal setup.

Single entry point: `/team-dev <mode> [context]`

To contribute: [CONTRIBUTING.md](CONTRIBUTING.md) · Report a security issue:
[SECURITY.md](SECURITY.md) · License: [MIT](LICENSE) · Sources of inspiration: [CREDITS.md](CREDITS.md)

---

## Structure

```text
~/.claude/
├── CLAUDE.md               # Global instructions: conventions, invocation rules
├── settings.json           # Claude Code configuration (permissions, MCP, hooks)
├── skills/                 # Skills invocable via /skill-name
│   └── SKILLS_INDEX.md     # Navigation map — every skill by type and scope
├── agents/                 # Orchestrator agents
├── docs/adr/               # Documented architecture decisions
├── .github/                # Frontmatter validation CI, PR and issue templates
├── logs/                   # skill-selection.log — written by the skill-log.sh hook (not versioned)
├── projects/               # Per-project memory (auto-memory, sessions) — not versioned
│   └── <letter>--<path>/
│       └── memory/         # Persistent cross-session memories
└── .gitignore              # Excludes credentials, sessions, runtime cache
```

> This repository is meant to be cloned directly as your `~/.claude/` directory. There is no
> overlay repository and no excluded personal-scope content here — unlike the private source this
> was forked from, everything checked in is meant to be public and reusable as-is.

---

## Orchestrator agents

Entry point via `/team-dev --<mode>` or direct invocation.

### Routing hierarchy

```text
Level 0 — team-dev (root)              → multi-domain or ambiguous requests
Level 1 — product-agent / tech-lead    → product or technical direction
Level 2 — specialized skills           → implementation (laravel-developer, react-developer…)
Fallback — general-engineer            → no skill matches
```

For a clear single-domain request, invoke the Level 2 skill directly without going through
`team-dev`. Check `skills/SKILLS_INDEX.md` to identify the right skill.

### Technical agents

| Agent | team-dev mode | Description |
| ------- | --------------- | ------------- |
| `product-agent` | `--product` | Full brief + PRD + functional specs |
| `architecture-agent` | `--architecture` | Target architecture (C4), ADRs, tech stack |
| `security-agent` | `--security` | OWASP Top 10 audit + pentest + cloud + IAM |
| `qa-lead-agent` | `--qa` | Test plan + E2E Playwright + performance, consolidated report |
| `documentation-agent` | `--documentation` | Tech writing + dev advocacy + knowledge management |
| `infrastructure-agent` | `--infrastructure` | Platform Director — Linux/Docker/K8s/CI-CD/SRE/IaC/network |
| `integration-agent` | `--integration` | REST/ESB Camel/Kafka/EDI, API lifecycle |
| `it-operations-agent` | `--it-operations` | L1-L3 support, ITIL Change/Problem, CMDB |
| `frontend-agent` | `--frontend` | Frontend Director — Angular 21/React 18, --build/--update/--review |
| `backend-agent` | `--backend` | Backend Director — Laravel 9+/.NET 10+, --build/--update/--review |
| `mobile-agent` | `--mobile` | Mobile Director — Flutter/React Native, --build/--update/--review |
| `data-agent` | `--data` | Data Engineering + Architecture + Science + BI |
| `design-agent` | `--design` | UX Research + UI/Interaction + UX Writing + Design System |
| `coordination-agent` | `--coordination` | Organizational diagnosis, Agile/project/governance roles |
| `sprint-agent` | `--sprint` | Full sprint — planning → estimation → delivery |
| `release-agent` | `--release` | Release — deps + changelog + security audit |
| `pr-review-agent` | `--pr-review` | PR review — code review + appsec + report |

### Public-sector agents

Reusable by a comparable service, removable with no impact on the rest.

| Agent | team-dev mode | Description |
| ------- | --------------- | ------------- |
| `ict-agent` | direct `/ict` | Principal ICT Director — multi-vendor network, Windows/AD support, bulletins, inventory, security |
| `public-procurement-agent` | direct `/procurement` | ICT public procurement — contracts, specs, purchase orders, budget |
| `hr-agent` | `--ask hr` | Public-sector HR — recruitment, labor law, well-being |
| `public-communications-agent` | `--ask communications` | Institutional and press communications |
| `legal-compliance-agent` | `--legal-compliance` | Legal compliance — weapons, forestry, camping, civil safety |

### Persona agents

Domain expertise framed around a persona. Invocable like any other agent, excluded by default from
development cycles by `team-selector`.

| Agent | team-dev mode | Description |
| ------- | --------------- | ------------- |
| `game-dev-agent` | `--game-dev` | Studio Director — gameplay, shaders, physics, game design |
| `survival-logistics-agent` | `--survival` | Survival logistics, weighed bug-out bag, camping, garden |
| `race-engineering-agent` | `--race-engineering` | F1/WEC/FE strategy, tire degradation, Rubik's cube |
| `game-master-agent` | `--game-master` | Tabletop RPG, complex board games, camping cuisine |
| `algorave-agent` | `--algorave` | Strudel live-coding, algorithmic patterns |
| `pilgrimage-route-agent` | `--pilgrimage` | Long-distance pilgrimage route planning — itinerary, gear, stops |
| `creativity-theory-agent` | `--creativity` | Idea-creation theories, idea box |
| `mentor-agent` | `--mentor` | Blunt, experienced mentor, one action per week |
| `socratic-method-agent` | `--socratic` | Maieutics — one question at a time, never the answer |
| `trainer-agent` | `--trainer` | Teaching one concept at a time, checked before continuing |
| `paid-consultant-agent` | `--consultant` | One priced recommendation, max 3 options, decisive |
| `creative-director-agent` | `--creative-director` | Direct verdict on a visual/text: publish, fix, redo |
| `ceo-decision-agent` | `--ceo` | Decisive call, metric to watch, deadline |
| `devils-advocate-agent` | `--devils-advocate` | Honest counter-argument before investing or hiring |

> **Naming convention**: a persona is named after its **function**, never after a real person.

### What's not in this repository

Nothing — unlike the private source this was forked from, there is no excluded personal-scope
content here.

---

## ICT entry points (independent of team-dev)

`ict-agent` and `public-procurement-agent` are standalone agents, outside the `team-dev` hierarchy.
Invoke them directly:

```bash
/ict [--mode | -alias]         # ICT Director — network, switches, firewall, support, bulletins
  -r    multi-vendor network (network-engineer, sysadmin)
  -fw   firewalls (firewall-engineer)
  -sw   switch audit (switch-audit)
  -sup  Windows/AD/PC technical support
  -bs   service bulletins (writing + analysis)
  -inv  hardware inventory (hardware-inventory)
  -rp   management report (network-report)
  -ip   serial-incident detection (incident-pattern)
  -sec  security (security-agent)
  -a    auto — ICT Skill Router

/procurement [--mode | -alias]  # Public procurement & ICT administration
  -ctr  supplier contracts (contract-manager)
  -cdc  specifications (spec-writer)
  -bc   purchase order (purchase-order)
  -bg   budget plan (budget-plan)
  -tt   technical-to-management translation (tech-translator)
  -mail official email (mail-writer)
  -a    auto
```

---

## team-dev modes

Short aliases are accepted in place of the long mode (e.g. `/team-dev -back` = `/team-dev --backend`).

```bash
# ─── Routing (no alias) ──────────────────────────────────────────────────────
/team-dev --auto  <description>      # Smart routing via team-selector
/team-dev --full  <description>      # Full lifecycle (automatic quality loop)
/team-dev --audit [target]           # Post-dev multi-profile audit (read-only)
/team-dev --bootstrap [description]  # Project bootstrap kit (specs, backlog, data dict…)

# ─── Product · Architecture · Security ──────────────────────────────────────
/team-dev --product       / -prj   [description]  # Product brief (product-agent)
/team-dev --architecture  / -arch  [target]        # C4 architecture + ADRs (architecture-agent)
/team-dev --security      / -sec   [target]        # OWASP audit + pentest (security-agent)
/team-dev --compliance    / -co    [context]       # GDPR / ISO 27001 / NIS2 compliance
/team-dev --gdpr          / -rg    [target]        # GDPR audit + remediation cycle
/team-dev --pr-review     / -rev   [files]         # PR / code review (pr-review-agent)

# ─── Development ─────────────────────────────────────────────────────────────
/team-dev --backend        / -back  [target]        # Backend Laravel 9+ / .NET 10+
/team-dev --frontend       / -front [target]        # Frontend Angular 21 / React 18
/team-dev --mobile         / -mob   [target]        # Mobile Flutter / React Native
/team-dev --infrastructure / -infra [description]   # Infra Linux / Docker / K8s / network
/team-dev --design         / -ux    [description]   # UX/UI design & design system
/team-dev --data           / -data  [description]   # Data Engineering + Science + BI
/team-dev --integration    / -integ [description]   # REST/ESB/Kafka/EDI integration
/team-dev --it-operations  / -ops   [context]       # IT Ops — ITIL support, CMDB
/team-dev --coordination   / -agile [goal]          # Agile coordination & management

# ─── Quality · Release · Docs ────────────────────────────────────────────────
/team-dev --qa         / -qa    [target]       # Test plan + E2E (qa-lead-agent)
/team-dev --bug        / -b     [desc|file]    # Bug validation (bug-validator)
/team-dev --fix        / -fx    [BUG-XXX,...]  # QA re-test → re-validation
/team-dev --sprint     / -sprint [goal]        # Full sprint (sprint-agent)
/team-dev --release    / -rel   [version]      # Release — changelog + security audit
/team-dev --documentation / -doc [target]      # Documentation (documentation-agent)

# ─── Utilities (no alias) ────────────────────────────────────────────────────
/team-dev --ask <skill> [context]    # Delegate directly to a skill
/team-dev --query <question>         # Architecture question via the graph (read-only)
/team-dev --graph-impact <file>      # Measure the impact of a change
/team-dev --onboarding               # Project onboarding guide
/team-dev --deps                     # Update dependencies
```

### Product Owners — Phase 0b selection

A Product Owner is a specialized persona, automatically activated via Phase 0b (`--auto` /
`--full`) when one of its trigger keywords appears in the request, or explicitly via
`--ask <name>`.

The registry declares them with their trigger keywords (see `CONTRIBUTING.md` for how to add your
own — the personal-agents registry format is project-specific and isn't shipped pre-filled in this
public kit beyond the persona agents above).

| PO | Domain |
| --- | --- |
| `legal-compliance` | Belgian-style legal compliance — weapons, forestry, camping |
| `survival` | Prepping, bug-out bag, camping, garden |
| `race-engineering` | F1/FE/WEC strategy, Rubik's cube |
| `game-master` | Tabletop RPG + camping cuisine |
| `algorave` | Strudel live-coding / algorave |
| `pilgrimage` | Long-distance pilgrimage route planning |
| `creativity` | Idea box, creativity theories |
| `productivity-coach` | GTD / Kanban, personal organization |
| `hr` | Public-sector HR — labor law |
| `public-communications` | Institutional and press communications |
| `mentor` | Blunt, experienced mentor |
| `socratic` | Maieutics — one question at a time |
| `trainer` | Teaching one concept at a time |
| `consultant` | Priced recommendation, max 3 options |
| `creative-director` | Direct verdict on a visual/text |
| `ceo` | Decisive call, metric to watch |
| `devils-advocate` | Counter-argument before investing |

To create your own: `/po-creator`, which adds the agent and its registry entry.

---

## Skills by group

### Security

| Skill | Description |
| ------- | ------------- |
| `security-audit` | Full security audit orchestrator (OWASP + pentest + cloud + IAM) |
| `appsec` | Application analysis — OWASP Top 10, SAST/DAST, injection, auth |
| `pentest` | Penetration testing — reconnaissance, exploitation, report |
| `cloud-security` | Cloud IAM/network/secrets audit (AWS/Azure/GCP) |
| `iam-engineer` | IAM review — OAuth2, OIDC, RBAC, ABAC, JWT, SSO |
| `compliance-officer` | GDPR, ISO 27001, NIS2 compliance |
| `legal-pages` | Privacy policy, Terms, cookies, refund — multi-jurisdiction EU, editable Filament pattern |
| `vulnerability-management` | CVSS scoring, prioritization, remediation plan |

### Architecture

| Skill | Description |
| ------- | ------------- |
| `architect` | Software & Solution Architect — C4, ADRs, tech stack |
| `enterprise-architect` | Enterprise Architecture — TOGAF, urbanization, capability mapping |
| `cloud-architect` | Cloud Architecture — HA/DR, FinOps, multi-cloud IaC |
| `security-architect` | STRIDE/PASTA threat modeling, zero-trust, cryptography |
| `data-architect` | ER modeling, engine choice, governance, PII by design |
| `integration-architect` | API-led/EDA/ESB, OpenAPI/AsyncAPI, saga/outbox/CQRS |
| `tech-lead` | Code standards, Definition of Done, Tech Radar, technical debt |

### Infrastructure & Ops

| Skill | Description |
| ------- | ------------- |
| `devops` | CI/CD (GH Actions/GitLab), non-root multi-stage Docker, K8s+HPA+PDB, DevSecOps |
| `sre` | SLO/SLI/Error Budget, Prometheus alerting rules, blameless post-mortems, DBA |
| `cloud-engineer` | Terraform IaC — remote state, workspaces, least-privilege IAM, FinOps tagging |
| `sysadmin` | Linux hardening (Debian/RHEL), SSH/PAM, firewalld, idempotent Ansible |
| `kubernetes-engineer` | Docker, K8s manifests, Helm, container hardening, secrets management |
| `network-engineer` | Cisco/Huawei/Juniper/Alcatel — VLAN, STP, LACP, ACL, inter-VLAN routing |
| `network-checker` | Pre-flight check before switch config — mode/VLAN/description + multi-vendor rollback |
| `it-support` | L1/L2/L3, app support, ITIL Change/Problem Management, CMDB |
| `integration-developer` | REST/GraphQL, Camel/MuleSoft, Kafka/RabbitMQ, EDI EDIFACT/X12 |

### Mobile development

| Skill | Description |
| ------- | ------------- |
| `flutter-developer` | Flutter/Dart — Freezed, BLoC/Riverpod, go_router, strict null-safety, flutter_test |
| `react-native-developer` | React Native — strict TypeScript, Zustand, React Navigation, Expo, Testing Library |
| `mobile-updater` | Mobile tech watch — obsolete Flutter/RN patterns, migration report |

### Frontend development

| Skill | Description |
| ------- | ------------- |
| `angular-developer` | Angular 21 — components, services, NGXS stores, forms, internal conventions |
| `react-developer` | React 18+ — TanStack Query, Zustand, shadcn/ui, Vitest, hook patterns |
| `frontend-updater` | Frontend tech watch — obsolete Angular/React patterns, migration report |
| `21st-cli-use` | Search, install, and fetch code from the 21st.dev catalog (components/themes/templates) |
| `21st-ai` | Sketch/iterate/fetch UI code via the 21st AI CLI (generate/iterate/take) |
| `21st-ui-explore` | Explore 3 comparable UI directions when the visual direction isn't settled |
| `21st-ui-build` | Build/modify a production layout with the project's design context and the 21st catalog |
| `21st-ui-review` | Deterministic UI audit (`21st review`) — design system, a11y, responsive, missing states |
| `21st-registry` | Publish/edit/delete your own components, themes, and templates on 21st.dev |
| `21st-design-sync` | Publish the project's design tokens (shadcn/Tailwind) as a public 21st.dev theme |

### Backend development

| Skill | Description |
| ------- | ------------- |
| `laravel-developer` | Laravel 9+ PHP 8+ — business logic in models, transactions, Swagger OA, PHPUnit, multi-DB |
| `dotnet-developer` | .NET 10+ — Clean Architecture, `Result<T>`, Injectable, FluentValidation, MSTest |
| `backend-updater` | Backend tech watch — obsolete Laravel/.NET patterns, migration report |

### Specialized development

| Skill | Description |
| ------- | ------------- |
| `blockchain` | Solidity/OpenZeppelin, ERC-20/721, Hardhat/Foundry, DeFi, security audit |
| `ar-vr-developer` | Unity XR, WebXR/A-Frame, mandatory 90fps, locomotion, hand tracking |
| `computer-vision` | YOLO/OpenCV/PyTorch, OCR, segmentation; NLP HuggingFace/spaCy/NER |
| `rpa-developer` | UiPath, Power Automate, SAP/Excel/PDF automation; Power Apps/OutSystems |
| `ai-product-engineer` | LLMs in products, RAG, prompt engineering, RAGAS evaluation, token FinOps |
| `laravel-api` | Laravel API — Eloquent, Sanctum, Microsoft OAuth, OpenAPI |

### Data & Analytics

| Skill | Description |
| ------- | ------------- |
| `data-engineer` | Medallion Architecture, PySpark, Airflow, Great Expectations, partitioning |
| `analytics-engineer` | dbt — stg/int/fct/dim, schema.yml tests, SCD Type 2, macros |
| `data-scientist` | Feature engineering, MLflow, drift monitoring (PSI/KS), ML CI/CD |
| `bi-developer` | Star schema, SCD, Power BI DAX, Tableau, KPIs, OLAP |

### Product & Management

| Skill | Description |
| ------- | ------------- |
| `analyst` | Project brief, personas, user research, needs analysis |
| `product-manager` | PRD, MoSCoW prioritization, user stories, roadmap |
| `functional-analyst` | Use cases, business rules, flow diagrams |
| `product` | Orchestrator — analyst + product-manager + functional-analyst in sequence |
| `scrum-master` | Backlog refinement, DOR/INVEST, RAID log, sprint metrics |
| `agile-coach` | Agile maturity diagnosis, transformation, Scrum/Kanban/SAFe/LeSS |
| `engineering-manager` | People management, career ladder, 1:1s, hiring |
| `delivery-manager` | Flow management, DORA metrics, capacity planning, stakeholders |
| `project-manager` | WBS, Mermaid Gantt, RACI, risk register, reporting |
| `program-manager` | Multi-project coordination, WSJF, portfolio roadmap |
| `it-governance` | COBIT 2019/ITIL 4, IT processes, metrics, CMMI maturity |

### QA & Performance

| Skill | Description |
| ------- | ------------- |
| `qa-engineer` | Test plans, Given/When/Then cases, coverage matrix |
| `qa-automation` | Playwright/Cypress/Selenium E2E, page-object, screenshots |
| `perf-tester` | k6/JMeter/Locust, p50/p95/p99 metrics, bottlenecks |
| `bug-validator` | Tester bug validation, memory prevention rules, report |

### Design & UX

| Skill | Description |
| ------- | ------------- |
| `ux-researcher` | User testing, behavioral personas, journey maps, Nielsen heuristics |
| `ux-designer` | Mermaid wireframes, user flows, UI token specs, micro-interactions, a11y |
| `ux-writer` | Voice & tone, microcopy, actionable error messages, in-app onboarding |
| `design-system` | 3-tier tokens, P0/P1/P2 component catalog, theming, Storybook |
| `service-designer` | Service blueprint, ecosystem map, moments of truth, bottlenecks |

### Documentation

| Skill | Description |
| ------- | ------------- |
| `tech-writer` | README, API docs (OpenAPI/GraphQL), user guides — Diátaxis |
| `dev-advocate` | DevEx scorecard, technical blog posts, talks, contribution guidelines |
| `knowledge-manager` | Wiki, FAQ, glossary, decision log, lessons learned |
| `training-specialist` | Bloom's taxonomy learning paths, hands-on exercises, quizzes, per-profile plans |
| `onboarding` | Onboarding guide — architecture, stack, conventions, required access |

### Cross-cutting

| Skill | Description |
| ------- | ------------- |
| `accessibility-lead` | WCAG 2.1/2.2 AA, ARIA patterns, screen readers, audit |
| `ai-visitor-simulation` | AI-visitor simulation (capture + real navigation via Playwright MCP), UX report — invoked at the end of `team-dev --full` |
| `green-it` | SCI formula, cloud carbon footprint, eco-design, 115 best practices |
| `ethical-ai` | EU AI Act, bias (demographic parity/equalized odds), model card, red-teaming |
| `innovation-manager` | Technology radar, POC Go/No-Go, Build/Buy/Partner/Open, H1/H2/H3 horizons |
| `open-source-lead` | MIT/Apache/GPL/AGPL licenses, CycloneDX SBOM, OSS contribution, InnerSource |

### Game development

| Skill | Description |
| ------- | ------------- |
| `lead-gameplay-programmer` | C#/GDScript — movement, combat, inventory, state machines, object pooling |
| `technical-artist` | HLSL/GLSL shaders (Godot/Unity), particle systems, visual optimization |
| `game-designer` | Balancing, progression curves, juiciness (coyote time, screenshake) |
| `physics-engineer` | Vectors, quaternions, ballistics, guided projectiles, IK |

### ICT — Network & Infrastructure

| Skill | Description |
| ------- | ------------- |
| `firewall-engineer` | Fortinet/pfSense/ASA/Palo Alto — rules, NAT, IPsec/SSL VPN, zones, hardening |
| `switch-audit` | Switch audit, Huawei VRP (priority) / Cisco / Juniper — VLAN, STP, LACP, hardening |
| `hardware-inventory` | Hardware CMDB — add/update/list/audit EOL-warranty/export |
| `network-report` | Network management reports — availability, incidents, capacity, changes, budget |
| `service-bulletin` | Daily service bulletin — append/finalize/view/report for a day of interventions |
| `bulletin-analyzer` | Multi-profile service-bulletin analysis — patterns, recurrences, resolution rate, management summary |
| `incident-pattern` | Serial-outage detector — 48h ticket clustering, network/app/hardware alerting |

### ICT — Technical Support

| Skill | Description |
| ------- | ------------- |
| `pc-repair` | Windows workstation diagnosis and repair — BSOD, slowness, boot, disks, RAM |
| `windows-admin` | Windows Server/workstation administration — GPO, WSUS, shares, services, PowerShell |
| `ad-basic` | Active Directory — password reset, unlock, groups, account audit, OU moves |
| `printer-support` | Network printers — stuck queue, drivers, GPO, deployment, IP diagnosis |
| `software-deploy` | Software deployment — silent MSI/EXE, winget, GPO, Intune, multi-machine scripts |
| `script-helper` | PowerShell / Bash / Python scripts — generation, debugging, scheduling |
| `procedure-builder` | Operational procedures and runbooks — install, troubleshooting, maintenance |
| `user-call` | Non-technical phone support — jargon-free questions, simple visual instructions |

### ICT — Administration & Public Procurement

| Skill | Description |
| ------- | ------------- |
| `contract-manager` | ICT supplier contracts — coverage check, list, expiring, add/update |
| `spec-writer` | Public procurement specifications — tiered procedures by contract value |
| `purchase-order` | Purchase orders — line items, VAT, budget allocation |
| `budget-plan` | ICT budget plans — investment, recurring costs, maintenance, management note |
| `tech-translator` | Technical-jargon-to-management translation — terms, decision sheets, management notes |
| `mail-writer` | Professional emails — formal/neutral/urgent registers, public-sector context |
| `task-tracker` | Markdown task management — add/list/complete/report, linked to incident-pattern |
| `web-vanilla` | Standalone HTML/CSS/JS web tools — calculators, dashboards, forms — zero dependency |

### Utilities

| Skill | Description |
| ------- | ------------- |
| `team-dev` | **Main orchestrator** — unified entry point for every mode |
| `team-selector` | Smart selection of the optimal agent/skill combination |
| `general-engineer` | **Global fallback** — cross-stack generalist, activated when no skill matches |
| `po-creator` | Creates a new personal Product Owner (agent + persona + keywords) |
| `create-skill` | Guided creation of new SKILL.md files (then `improve-skills` to refine) |
| `improve-skills` | Optimizes existing SKILL.md files |
| `encode-correction` | Encodes a behavior correction into the environment (CLAUDE.md, memory, skill) |
| `git-workflow` | Installs the standard Git workflow in a project (hooks, commitlint, README) |
| `memory-ritual` | Consolidates and reorganizes cross-session memory |
| `project-graph` | Maps the project's architecture via Graphify |
| `context7-mcp` | Up-to-date documentation via Context7 MCP (libraries, frameworks) |
| `estimator` | Fibonacci story points, poker planning, risk identification |
| `changelog` | CHANGELOG.md from commits (Conventional Commits / Keep a Changelog) |
| `dependency-updater` | Outdated npm/pip/composer dependencies, breaking changes |
| `version-checker` | Current vs. latest stable version detection + EOL status, all stacks |
| `version-updater` | Multi-stack update plan, delegates to the existing `*-updater` skills |
| `code-reviewer` | In-depth review — readability, conventions, technical debt |

---

## Installation (new machine)

### 1. Make `~/.claude` a checkout of this repository

```bash
cd ~/.claude
git init && git remote add origin https://github.com/bocal-pol/bocal-kit.git
git fetch origin && git checkout -f -B main origin/main
```

See [INSTALL.md](INSTALL.md) for the full procedure (a fresh machine **or** an existing `~/.claude`,
without losing authentication). Runtime files (`.credentials.json`, `projects/`, `memory/`…) are
git-ignored and stay in place.

### 2. Required MCPs

#### Context7 — up-to-date documentation

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

Provides up-to-date library documentation (React, Express, Django...), instead of potentially
stale training data.

#### Sequential Thinking — structured reasoning

```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

Enables multi-step reasoning for architecture decisions, complex debugging, and complexity
estimation.

#### Hugging Face — image & video generation (free)

```bash
claude mcp add --transport http hf-image "https://huggingface.co/mcp?gradio=mcp-tools/Z-Image-Turbo" --scope user
claude mcp add --transport http hf-t2v   "https://huggingface.co/mcp?gradio=Lightricks/ltx-video-distilled" --scope user
```

Free **image** generation (Z-Image-Turbo) and **video** generation (LTX-Video distilled) via
[Hugging Face](https://huggingface.co) Spaces, exposed as MCP tools. Browser OAuth on first call
(`claude mcp login hf-image` / `hf-t2v`). **`--scope user` is required**: the repo's
`~/.claude/.mcp.json` file is only read when the current directory is `~/.claude` itself — it
declares nothing for other projects.

### 3. Verify

```bash
claude
/team-dev --auto "test the environment"
```

---

## Conventions — where they're written

This README **describes** the ecosystem; it doesn't legislate. Rules have a single source, to
avoid two versions that drift out of sync.

| Topic | Single source |
| --- | --- |
| Security modes `safe` / `dev` / `audit` | [`CLAUDE.md`](CLAUDE.md) § Security modes |
| Git workflow, protected branches, Conventional Commits | [`CLAUDE.md`](CLAUDE.md) § Global Git Workflow — and [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributing here |
| Mandatory skill frontmatter, model identifiers, paths, grep exclusions | [`CLAUDE.md`](CLAUDE.md) § Skill conventions |
| Skill Router priorities per domain | [`skills/.router.json`](skills/.router.json) |
| Product rules (SaveMe, Sidebar, Lazy Principle…) | [`PRODUCT-RULES.md`](PRODUCT-RULES.md) |
| Architecture decisions and their rationale | [`docs/adr/`](docs/adr/README.md) |

Two mechanisms no other file describes:

- **Observability** — every call to the Skill tool is logged by the `PreToolUse` hook →
  `skill-log.sh` into `logs/skill-selection.log` (timestamp, skill, project, arguments). The
  harness writes it, not the model: the log doesn't depend on any prompt discipline.
- **Installing git hooks in a third-party project** — `/git-workflow`.

---

## Cross-session memory

Claude accumulates durable rules, corrections, and preferences in a `memory/` folder **specific to
each project**, indexed by a `MEMORY.md`. The harness loads it at startup, not a directive from
this repo: `CLAUDE.md` only imports `@primer.md` and `@hindsight.md`.

**This folder is not versioned** — it holds personal preferences and project state. A fresh clone
therefore starts with empty memory, and that's intentional.

To consolidate and clean up memory: `/memory-ritual`
