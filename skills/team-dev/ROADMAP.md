# team-dev — Integrated modules & roadmap

> Extracted from `SKILL.md` to keep the skill lighter (loaded in full on every `/team-dev`).
> Reference, not instruction: `team-dev` only reads this file on user request.

## Integrated modules

### Active

| Mode | Agent/Skill | Group |
|------|------------|--------|
| `--auto` | `team-selector` + selected agents | Smart routing |
| `--full` | `team-selector` (filter) + full sequence | Lifecycle |
| `--audit` | `team-selector` (exhaustive) + multi-agent read-only sequence | Post-development audit |
| `--bootstrap` | `project-bootstrap-agent` + 6 intake skills | Bootstrap / Intake |
| `--product` | `product-agent` | Product |
| `--architecture` | `architecture-agent` | Architecture |
| `--security` | `security-agent` | Security |
| `--compliance` | `compliance-officer` | Security |
| `--pr-review` | `pr-review-agent` | Quality |
| `--sprint` | `sprint-agent` | Coordination |
| `--release` | `release-agent` | Release |
| `--onboarding` | `onboarding` | Release |
| `--deps` | `dependency-updater` | Release |
| `--qa-lead` | `qa-lead-agent` | Quality |
| `--bug` | `bug-validator` | Quality |
| `--fix` | `qa-lead-agent` (retest) + `bug-validator` | Quality — re-test cycle |
| `--investigate` | `investigate` | Quality — 4-phase root-cause analysis |
| `--documentation` | `documentation-agent` | Documentation |
| `--frontend` | `frontend-agent` + `refacto` | Frontend Development ✅ |
| `--seo` | `open-seo` (live MCP) → `seo-geo` (static artifacts) | SEO / GEO / LLM discovery ✅ |
| `--no-slop` | `no-ai-slop` | Anti-AI-slop prose editing ✅ |
| `--adhd` | `i-have-adhd` | Action-first session mode ✅ |
| `--backend` | `backend-agent` + `refacto` | Backend Development ✅ |
| `--mobile` | `mobile-agent` + `refacto` | Mobile Development ✅ |
| `--coordination` | `coordination-agent` | Coordination |
| `--infrastructure` | `infrastructure-agent` | Infrastructure & Network ✅ |
| `--integration` | `integration-agent` | Integration & Middleware ✅ |
| `--it-operations` | `it-operations-agent` | IT Operations & Support ✅ |
| `--game-dev` | `game-dev-agent` | Game Dev |
| `--algorave` | `algorave-agent` | Algorave / Live-Coding |
| `--survival` | `survival-logistics-agent` | Survival, prepping, bivouac |
| `--race-engineering` | `race-engineering-agent` | Motorsport & puzzles |
| `--game-master` | `game-master-agent` | Tabletop RPG & cooking |
| `--legal-compliance` | `legal-compliance-agent` | Legal compliance |
| `--creativity-theory` | `creativity-theory-agent` | Ideas & creativity |
| `--pilgrimage-route` | `pilgrimage-route-agent` | Pilgrimage & itinerancy |
| `--design` | `design-agent` | Design & UX |
| `--diagram` | `illustre` | Excalidraw diagrams → PNG/SVG |
| `--data` | `data-agent` | Data & Analytics |
| *(end of session)* | `explain-diff` | Pedagogical wrap-up — recap + anchoring questions |
| *(end of session)* | `friction-retro` | Retrospective — agent environment improvements (navigation, checks, no-ops, tools) |
| *(auto)* | `project-graph` + `GRAPH_CONTEXT` | Phase 0 — Mapping + topological context |
| *(auto)* | `team-selector` + `personal-agents.json` | Phase 0b — PO selection |
| *(auto)* | `GRAPH_CONTEXT` + `DOMAIN_MAP` | Phase 0e — Topological analysis (graph-aware) |
| `--query` | `graphify query` (via graph.json) | Graph — Architecture question (read-only) |
| `--graph-impact` | `graphify path` (vs god nodes) | Graph — File impact analysis |

> The `--dev` and `--mgmt` modes were removed: they pointed to agents that were never created.
> Development goes through the agent matching the stack (`--backend`, `--frontend`, `--mobile`,
> `--integration`) and management through `--coordination`.

---

## Roadmap — Profiles to implement

Profiles organized by group and future orchestrator agent.
Each group will become an agent in `~/.claude/agents/` and a mode in this file.

### Frontend Development Group → `frontend-agent` → `--frontend` ✅ Created

Encoded Frontend rules: systematic OnPush (Angular) · Functional components (React) · Strict
TypeScript · Server state in TanStack Query · UI state in Zustand or NGXS · WCAG 2.1 AA

| Profile | Role | Status |
|--------|------|--------|
| `frontend-agent` | Orchestrator — --build / --update / --review | ✅ Created |
| `angular-developer` | Angular 21+ standalone, OnPush, signals, NGXS, Material, Tailwind 4 | ✅ Created |
| `react-developer` | React 18+, hooks, TanStack Query, Zustand, shadcn/ui, Vitest | ✅ Created |
| `frontend-updater` | Angular/React migration — Breaking/Important/Recommended report | ✅ Created |

### Mobile Development Group → `mobile-agent` → `--mobile` ✅ Created

Encoded Mobile rules: Dart null-safety / strict TypeScript · BLoC or Riverpod (Flutter) · Zustand
(RN) · mandatory 60fps · `accessibilityLabel` / `Semantics` on every interactive element · tests
with `bloc_test`/`mocktail` (Flutter) or Testing Library (RN)

| Profile | Role | Status |
| ------ | ---- | ------ |
| `flutter-developer` | Flutter/Dart development — Freezed, BLoC/Riverpod, go_router, flutter_test | ✅ Created |
| `react-native-developer` | React Native development — Zustand, React Navigation, Expo, Jest | ✅ Created |
| `mobile-updater` | Technology watch + Flutter/RN migration — Breaking/Important/Recommended report | ✅ Created |

### Backend Development Group → `backend-agent` → `--backend` ✅ Created

Encoded Backend rules: Result<T> pattern (.NET) · logic in the Models (Laravel) · inline validation
/ FluentValidation · mandatory transactions · Swagger/OpenAPI annotations on every endpoint

| Profile | Role | Status |
|--------|------|--------|
| `backend-agent` | Orchestrator — --build / --update / --review | ✅ Created |
| `laravel-developer` | Laravel 9+, Eloquent, Sanctum, inline Validator, OpenAPI L5-Swagger, PHPUnit | ✅ Created |
| `dotnet-developer` | .NET 10+, Clean Architecture, Result<T>, EF Core, FluentValidation, Aspire, Keycloak | ✅ Created |
| `backend-updater` | Technology watch + Laravel/.NET migration — Breaking/Important/Recommended report | ✅ Created |

### Full-Stack Development Group → split between `backend-agent`, `frontend-agent`, and `mobile-agent`

| Profile | Role | Priority |
|--------|------|---------|
| `fullstack-dev` | Full-stack generalist | P1 |
| `mobile-dev` | iOS / Android / React Native / Flutter apps | P2 |
| `integration-developer` | REST/GraphQL + ESB (MuleSoft/Camel) + Kafka/RabbitMQ + EDI (EDIFACT/X12) | ✅ Created |
| `api-manager` | API governance, developer portal, API lifecycle | Merged into `integration-developer` |

### Infrastructure Group → `infrastructure-agent` → `--infrastructure` ✅ Created

Encoded ICT rules: Idempotence · Safety First + Rollback · Multi-vendor Cisco/Huawei/Juniper/Alcatel
· IaC First · Network Design-First

| Profile | Role | Status |
|--------|------|--------|
| `sysadmin` | Linux (Debian/RHEL), hardening, Ansible playbooks | ✅ Created |
| `kubernetes-engineer` | Multi-stage Docker + docker-compose + K8s manifests | ✅ Created |
| `network-engineer` | Multi-vendor VLAN/STP/LACP/ACL (Cisco/Huawei/Juniper/Alcatel) | ✅ Created |
| `network-checker` | Port check (mode/VLAN/description) — "Key Skill" | ✅ Created |
| `devops` | CI/CD (GitHub Actions/GitLab CI), rootless Docker, K8s HPA/PDB, DevSecOps (Trivy/SAST), ESO Secrets | ✅ Created |
| `sre` | SLO/SLI/error budgets, PrometheusRules, blameless post-mortem, DBA tuning, 3-2-1 backup | ✅ Created |
| `cloud-engineer` | Terraform modules, S3+DynamoDB remote state, least-privilege IAM, FinOps tagging | ✅ Created |
| `platform-engineer` | Internal Developer Platform (IDP), golden paths | To create |
| `storage-engineer` | Storage solutions (SAN, NAS, Object Storage) | To create |
| `finops-engineer` | Cloud cost optimization and governance | To create |
| `devsecops-engineer` | Security built into the DevOps pipeline | To create |
| `messaging-specialist` | Kafka, RabbitMQ, Azure Service Bus | To create |

### Data Group → `data-agent` → `--data` ✅ Created

Encoded CDO rules: systematic [PROFILE ACTIVATED] tag · EXPLAIN ANALYZE on every SQL query · quality
tests on every pipeline · automatic PII/GDPR masking · Mermaid/Draw.io diagrams (never text alone)

| Profile | Role | Status | Note |
|--------|------|--------|------|
| `data-engineer` | Medallion Bronze/Silver/Gold, PySpark ETL/ELT, Airflow DAGs, SQL optimization, Great Expectations | ✅ Created | Covers big-data + database-developer |
| `analytics-engineer` | dbt stg_/int_/fct_/dim_, schema.yml tests, incremental models, SCD snapshots | ✅ Created | |
| `data-architect` | Conceptual/logical/physical modeling, Draw.io/Mermaid ERD, governance, lineage | ✅ Exists (standalone) | Invoked from data-agent |
| `data-scientist` | Feature engineering, MLflow tracking, PSI/KS drift monitoring, ML CI/CD (focus: science/mlops/full) | ✅ Created | Covers ml-engineer |
| `ai-product-engineer` | RAG architecture, chunking, Claude prompt caching, RAGAS evaluation, token cost | ✅ Created | |
| `bi-developer` | Star schema, SCD Type 2, Power BI DAX, OLAP, KPI catalog (focus: analysis/bi/full) | ✅ Created | Covers data-analyst |

### Design Group → `design-agent` → `--design` ✅ Created

Encoded Design rules: Mermaid wireframes + tables (never ASCII art) · UX+UI+Interaction merged into
`ux-designer` (focus param) · Figma/Canva MCP detected with no auto-execution · a11y delegated to
`accessibility-lead` · code delegated to `frontend-agent` (`--frontend`)

| Profile | Role | Status |
|--------|------|--------|
| `ux-researcher` | Downstream qualitative research — tests, interviews, behavioral personas, journey maps, Nielsen heuristics | ✅ Created |
| `ux-designer` | UX + UI + Interaction — wireframes, user flows, sitemap, UI token specs, micro-interactions, states, a11y (focus: ux/ui/interaction/full) | ✅ Created |
| `ux-writer` | Voice & tone, microcopy, actionable errors, in-app onboarding, UI glossary | ✅ Created |
| `design-system` | 3-level token architecture, P0/P1/P2 component catalog, theming, governance, legacy migration, Storybook | ✅ Created |
| `service-designer` | Service blueprint (frontstage/backstage), Mermaid ecosystem map, moments of truth, bottlenecks, cross-team plan | ✅ Created |

### Coordination Group → `coordination-agent` → `--coordination` ✅ Created

| Profile | Role | Status |
|--------|------|--------|
| `scrum-master` | Agile Scrum facilitation, continuous improvement | ✅ Created |
| `agile-coach` | Agile transformation support (incl. SAFe/RTE) | ✅ Created |
| `engineering-manager` | People management, career ladder, hiring (incl. VP Engineering) | ✅ Created |
| `delivery-manager` | Continuous flow, DORA metrics, capacity planning (incl. Resource Manager) | ✅ Created |
| `project-manager` | Project planning, WBS, Gantt, RACI, risk register | ✅ Created |
| `program-manager` | Multi-project coordination, WSJF, portfolio (incl. Portfolio Manager) | ✅ Created |
| `it-governance` | COBIT, ITIL, IT process governance | ✅ Created |

### Management Group → attached to `coordination-agent` (`--coordination`)

| Profile | Role | Priority | Note |
|--------|------|---------|------|
| `cto` | Technical direction, technology vision | P2 | |
| `cio` | Information systems direction | P3 | |
| `vp-engineering` | Engineering team management, organization | — | Merged into `engineering-manager` (vp scope) — Coordination Group |
| `engineering-manager` | Direct developer management, technical HR | — | Migrated to Coordination Group ✅ |
| `portfolio-manager` | Strategic view across all projects | — | Merged into `program-manager` (portfolio scope) — Coordination Group |

### Game Dev Group → `game-dev-agent` → `--game-dev` ✅ Created

Encoded Studio rules: Game Feel First · Performance First (zero allocation in _process) · Modular
Architecture (signals) · Multi-Platform (InputAction)

| Profile | Role | Status |
|--------|------|--------|
| `lead-gameplay-programmer` | Movement, combat, inventory, state machine, Object Pooling — GDScript/C# | ✅ Created |
| `technical-artist` | Shaders (.gdshader/HLSL), particles, visual optimization — Godot 4/Unity | ✅ Created |
| `game-designer` | Game Feel (juiciness, coyote time, input buffer, squash&stretch), balancing, progression | ✅ Created |
| `physics-engineer` | Ballistics, target prediction, missile homing, Slerp quaternions, Bézier | ✅ Created |
| `level-designer` | Level design, difficulty curves, level layout, greyboxing | To create |
| `ai-programmer` | Navigation (A*, navmesh), enemy behaviors, BehaviorTree, GOAP | To create |
| `audio-designer` | Audio mixing, procedural sound effects, adaptive music | To create |
| `ui-programmer` | HUD, menus, dialogue systems, localization | To create |
| `network-programmer` | Multiplayer (Godot Multiplayer API, Mirror/FishNet Unity), netcode, lag compensation | To create |

### Algorave Group → `algorave-agent` → `--algorave` ✅ Created

Encoded Studio rules: Think in Cycles · Polyrhythm · Drums/Bass/Lead Modularity · Live-Ready · Safety
Limiter (.gain ≤ 0.9)

| Profile | Role | Status |
|--------|------|--------|
| `algorave-agent` (Strudel Maestro) | Orchestrator — composes full algorithmic patterns | ✅ Created |
| `strudel-patterns` | Key Skill — mini-notation library, euclidean, scales, LFO, safety limiter | ✅ Created |
| `tidal-cycles-hs` | Native Haskell patterns (TidalCycles Haskell vs Strudel JS) | To create |
| `live-set-architect` | Live set architecture — transitions, cues, full performance structure | To create |

### Survival & Passions Group → `--survival` / `--race-engineering` / `--game-master` ✅ Created

Optional context: `family-context`, provided by the overlaid personal repository.
The agents read it if present, with no warning otherwise.

| Agent | Role | Status |
|-------|------|--------|
| `survival-logistics-agent` | Prepping, weighed Bug Out Bag, hiking/bivouac, survival garden, calories | ✅ Created |
| `race-engineering-agent` | F1/FE/WEC strategy, tire degradation, FE energy, Rubik's CFOP/OLL/PLL | ✅ Created |
| `game-master-agent` | Tabletop RPG, complex board games, bivouac cooking, playlists | ✅ Created |

### Legal Compliance Group → `legal-compliance-agent` → `--legal-compliance` ✅ Created

Service Note format: Legal Framework (statute/regulation) → Risk Assessment → Action Plan →
Inspector's Note

| Agent | Role | Status |
|-------|------|--------|
| `legal-compliance-agent` | Weapons law, forestry code, crime-prevention-through-design, wildlife/forestry authority compliance | ✅ Created |
| `real-estate-notary` | Real estate law, inheritance, contracts | To create |
| `local-tax-advisor` | Local taxation — deductible expenses, benefits, income tax | To create |

> **Naming convention**: a persona agent carries the name of its **function**, never that of a real
> person. Several agents were renamed accordingly.

### IT Operations Group → `it-operations-agent` → `--it-operations` ✅ Created

| Profile | Role | Status |
|--------|------|--------|
| `it-support` | L1/L2/L3 Support + App Support + ITIL Change/Problem + CMDB (focus param) | ✅ Created |

### Specialized Development Group (standalone skills)

| Profile | Role | Status |
|--------|------|--------|
| `blockchain` | Solidity, ERC-20/721/1155, Hardhat/Foundry, DeFi, on-chain security | ✅ Created |
| `ar-vr-developer` | Unity XR, WebXR, A-Frame, spatial UX, 90fps, plane detection | ✅ Created |
| `computer-vision` | YOLO, OpenCV, PyTorch Vision, OCR, NLP HuggingFace/spaCy (focus cv/nlp/full) | ✅ Created |
| `rpa-developer` | UiPath, Power Automate, n8n, Power Apps, Low-Code | ✅ Created |

### Cross-cutting profiles (standalone skills)

| Profile | Role | Status |
|--------|------|--------|
| `accessibility-lead` | WCAG 2.1/2.2 AA + local accessibility mandate equivalent, ARIA patterns, audit + report | ✅ Created |
| `green-it` | IT carbon footprint (SCI), web eco-design, Green IT audit | ✅ Created |
| `ethical-ai` | EU AI Act, bias detection, model card, AI red-teaming | ✅ Created |
| `innovation-manager` | Technology radar, POC evaluation, build-buy-partner-open | ✅ Created |
| `open-source-lead` | OSS licenses (GPL/MIT/Apache), SBOM, InnerSource governance | ✅ Created |
| `procurement-manager` | Vendor and software license management | To create |

---

<!-- ─────────────────────────────────────────────────────────────────────────
     INTERNAL ORCHESTRATOR — To implement once the development groups
     are created

     --full mode will need an internal `orchestrator` skill responsible for:
       - Maintaining the sequence's overall state (completed / running / failed steps)
       - Passing one step's outputs as the next step's inputs (chaining)
       - Detecting inter-group dependencies (e.g. architecture before development)
       - Producing the master report in real time (not only at the end)
       - Handling retries and partial resumption (if --full is interrupted at step 7,
         being able to resume from step 7 without replaying 1-6)
         → DONE without a dedicated skill: SKILL.md's "State and resumption" Phase A-1
           (the .claude/tmp/team-dev-full-state.md file, per-step statuses, resuming at
           the first running/failed step, archiving at closure). The other points
           (chaining, inter-group dependencies, real-time report) remain open.

     Implementation priority: now that infrastructure-agent exists and step B5
     routes to the stack agents,
     since that's when the full sequence becomes genuinely useful.
     ───────────────────────────────────────────────────────────────────────── -->
