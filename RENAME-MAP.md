# Rename Map

Mapping from the original `claude-config` names (French/code names) to `bocal-kit` names (clear
English names). Shares the same naming convention as the `antigravity-config` mirror.

This pass (structure + root docs) only ported and renamed items **referenced in root documentation**
(CLAUDE.md, README.md, CREDITS.md). The agents and skills porting passes must add their own rows as
they port each file, and must cross-check against the names already listed here for consistency.

## Agents

| Original name | New name | Notes |
| --- | --- | --- |
| `algorave-agent` (alias) / `zack-delarocha-agent` | `algorave-agent` | Alias eliminated, real agent keeps the clear name |
| `arcade-agent` | `game-dev-agent` | |
| `atlas-agent` | `infrastructure-agent` | |
| `avocat-du-diable-agent` | `devils-advocate-agent` | |
| `backend-agent` | `backend-agent` | Already clear, unchanged |
| `bard-agent` | `game-master-agent` | Persona covers tabletop RPG + camping cuisine |
| `bolt-agent` | `sprint-agent` | |
| `boussole-agent` | `product-agent` | |
| `canaveral-agent` | `release-agent` | |
| `cerbere-agent` | `security-agent` | |
| `commercial-agent` | `sales-offers-agent` | |
| `communication-agent` | `public-communications-agent` | |
| `compostel-agent` | `pilgrimage-route-agent` | |
| `consultant-agent` | `paid-consultant-agent` | |
| `directeur-creatif-agent` | `creative-director-agent` | |
| `formateur-agent` | `trainer-agent` | |
| `forge-agent` | `cli-forge-agent` | New in this pass; `cli-anything` and `cli-hub` skills keep their names |
| `frontend-agent` | `frontend-agent` | Already clear, unchanged |
| `gutenberg-agent` | `documentation-agent` | |
| `hermes-agent` | `integration-agent` | |
| `ict-agent` | `ict-director-agent` | Cross-cutting ICT orchestrator (network multi-vendor, Windows/AD support, server infra, security bulletins, inventory) — distinct from `infrastructure-agent` (cloud/containers/CI-CD) and `it-operations-agent` (L1/L2/L3 support/ITIL) |
| `iris-agent` | `design-agent` | |
| `maestro-agent` | `coordination-agent` | |
| `marches-agent` | `public-procurement-agent` | |
| `mentor-agent` | `mentor-agent` | Already clear, unchanged |
| `nomade-agent` | `mobile-agent` | |
| `pdg-agent` | `ceo-decision-agent` | |
| `policier-agent` | `legal-compliance-agent` | |
| `pythie-agent` | `data-agent` | |
| `rh-agent` | `hr-agent` | |
| `schumi-agent` | `race-engineering-agent` | |
| `sensei-agent` | `productivity-coach-agent` | |
| `sentinelle-agent` | `it-operations-agent` | |
| `socle-agent` | `project-bootstrap-agent` | |
| `socratique-agent` | `socratic-method-agent` | |
| `survivaliste-agent` | `survival-logistics-agent` | |
| `szikra-agent` | `creativity-theory-agent` | |
| `themis-agent` | `pr-review-agent` | |
| `vitruve-agent` | `architecture-agent` | |
| `argus-agent` | `qa-lead-agent` | |
| (all compatibility aliases, e.g. `security-agent`, `product-agent`, `mobile-agent`, `data-agent`, `design-agent`, `coordination-agent`, `documentation-agent`, `integration-agent`, `itops-agent`, `gamedev-agent`, `sprint-agent`, `release-agent`, `pr-review-agent`, `quartermaster-agent`, `race-engineer-agent`, `bard-chef-agent`, `infra-agent`, `architecture-agent` (old alias), `qa-agent`) | _eliminated_ | No instructions of their own in the source; merged into the real agent above |

## Skills

| Original name | New name | Notes |
| --- | --- | --- |
| `arcade-router` | `game-dev-router` | |
| `cadrage` | `upfront-alignment` | |
| `retro` | `friction-retro` | |
| `no` | `encode-correction` | |
| `memory-rituel` | `memory-ritual` | |
| `cahier-charges` | `spec-writer` | |
| `bon-commande` | `purchase-order` | |
| `bulletin-service` | `service-bulletin` | |
| `bulletin-analyser` | `bulletin-analyzer` | |
| `visiteurs` | `ai-visitor-simulation` | |
| `croquis-editorial` | `editorial-sketch` | |
| `human` | `structure-humanizer` | Rewrites the structure of a text, not its surface (that is `no-ai-slop`) |
| `ponytail` | `minimal-code-discipline` | |
| `szikra-*` (7 skills) | `creativity-theory-*` | e.g. `szikra-zettelkasten` → `creativity-theory-zettelkasten` — full per-file mapping pending the skills porting pass |
| `compostel-*` (7 skills) | `pilgrimage-*` | e.g. `compostel-route` → `pilgrimage-route` — full per-file mapping pending the skills porting pass |
| `team-dev` | `team-dev` | Already English, kept as-is — confirmed ported with all flags translated |
| `team-selector` | `team-selector` | Already English, kept as-is |
| `unlazy` | `unlazy` | Already English, kept as-is |
| `areopage` | `areopage` | Proper noun, kept as-is |
| `dpo-toolkit` | `dpo-toolkit` | Already English, kept as-is |
| `codex-bridge` | `codex-bridge` | New (Codex delegation). Already English, kept as-is |
| `codex-delegate` | `codex-delegate` | New (Codex delegation). Already English, kept as-is |
| `codex-review` | `codex-review` | New (Codex delegation). Already English, kept as-is |
| `codex-explore` | `codex-explore` | New (Codex delegation). Already English, kept as-is |
| `transfer` | `transfer` | New (Codex delegation). Already English, kept as-is |

_Remaining skills (already clear in English, e.g. `laravel-developer`, `react-developer`,
`code-review`) keep their name unchanged — only translated if their content was in French. This
table will be completed by the skills porting pass with every renamed or unchanged skill listed
explicitly, plus a verification pass confirming no stale cross-reference to an old name remains
anywhere in the repo._
