# Credits — sources of inspiration

This ecosystem draws on several public repositories discovered, studied, and sometimes forked
([list of forks](https://github.com/bocal-pol?tab=repositories&type=fork)) before inspiring a skill
or convention in this repo. This page credits them explicitly, beyond the mentions already present
as comments in some `SKILL.md` files.

Only lists sources with an identifiable content link to a specific skill or rule in this repo — not
every fork on the GitHub account, some of which are unrelated (personal projects, isolated
experiments).

## Skills directly adapted or heavily inspired

| Source | Skill(s) in this repo | Nature of the link |
| --- | --- | --- |
| [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy) | `unlazy` | Acceptance-gates discipline, adapted to this ecosystem's multi-agent context |
| [Leonxlnx/taste-skill](https://github.com/bocal-pol/taste-skill) | `taste` | Generic anti-slop principle, reused and extended |
| [DietrichGebert/ponytail](https://github.com/bocal-pol/ponytail) | `minimal-code-discipline` | Minimal-code discipline, decision ladder |
| [unclebob/ub-mode](https://github.com/bocal-pol/ub-mode), `crapper`, `dryer`, `mutator` | `minimal-code-discipline`, `karpathy-guidelines` | Quality metrics (CRAP, duplication, mutation testing) referenced as target thresholds |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | `karpathy-guidelines` | Anti-over-engineering behavioral guardrails |
| [lucasmarkes/hairline](https://github.com/bocal-pol/hairline) | `hairline-create`, `hairline-adopt` | Interactive isometric figures, adapted into a generation skill |
| [helloianneo/ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) | `editorial-sketch` | Editorial illustration style convention |
| [zanwei/design-dna](https://github.com/zanwei/design-dna) | `design-dna` | Persistent stylistic fingerprint concept |
| [CloudAI-X/threejs-skills](https://github.com/bocal-pol/threejs-skills) | `threejs-3d` | Base of the Three.js skill |
| [cloudflare/security-audit-skill](https://github.com/bocal-pol/security-audit-skill) | `ai-agent-security`, `protocol-security` | Multi-phase audit methodology with verified findings |
| [public-apis/public-apis](https://github.com/bocal-pol/public-apis) | `api-finder` | Source catalog (maintained fork, static snapshot — see ADR 0066) |
| [pbakaus/impeccable](https://github.com/bocal-pol/impeccable) | `impeccable` integration (visual AI-slop detector), referenced in `CLAUDE.md` | UI quality detection hooks |
| [21st-dev/skill](https://github.com/bocal-pol/21st-dev) | `21st-ai`, `21st-cli-use`, `21st-design-sync`, `21st-registry`, `21st-ui-build`, `21st-ui-explore`, `21st-ui-review` | Component search/install CLI, skills built around it |
| [github/spec-kit](https://github.com/bocal-pol/spec-kit) | `sdd-specify`, `sdd-plan`, `sdd-tasks`, `sdd-converge` | Spec-Driven Development methodology adapted into skill phases |
| [usestrix/strix](https://github.com/bocal-pol/strix) | `strix` | AI pentest integrated as a complementary SAST scan |
| [cathrynlavery/diagram-design](https://github.com/bocal-pol/diagram-design) | `diagram-improve` | Editorial diagram types without Mermaid |
| [rebelytics/one-skill-to-rule-them-all](https://github.com/bocal-pol/one-skill-to-rule-them-all) | `friction-retro` | Continuous friction/pattern capture feeding memory |
| [naiersaidane/claude-mastery](https://github.com/bocal-pol/claude-mastery) | `upfront-alignment`, `illustre`, `investigue` | Claude Mastery training skills reused as a base for several guided-interview disciplines |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/bocal-pol/ui-ux-pro-max-skill) | `ux-designer`, `design-system` | Cross-platform UI/UX design intelligence |
| [mattpocock/skills](https://github.com/bocal-pol/skills-pocock) | General `SKILL.md` structuring conventions | Style reference for writing skills |

## Note on `public-apis`

The `api-finder` skill relies on a **frozen fork** of `public-apis/public-apis`
(see ADR 0066) rather than a live query — see that ADR for the design choice and its implication on
data freshness.

## How to add a new source

If a future skill or convention draws directly on a third-party repo: cite the source in the
relevant `SKILL.md` (comment or "Source" section) **and** add a line here.
