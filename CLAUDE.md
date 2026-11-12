# Claude Instructions

## Canary — verify these instructions are loaded

Start **every response** with the word `canary` in lowercase, alone on the first line, before any
other content.

```text
canary
[normal response here]
```

Its absence signals that this file was not loaded, or was truncated. Failures in this environment
are silent — a hook that doesn't fire, a missing MCP, a lost instruction produce no visible error.
This word is the only immediate signal.

## Session context (auto-loaded)

@primer.md
@hindsight.md

Claude Code also loads `CLAUDE.local.md` if it exists, and ignores it otherwise. This file is not
versioned: it's where machine-specific instructions go. Never put anything there that should hold
for everyone — that belongs in this file.

## Skill conventions

Every SKILL.md must follow:

- `model`: full identifier required — `claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5-20251001`
- **Never a `tools:` key in a SKILL.md**: that's an **agent** frontmatter key (`agents/*.md`),
  ignored by Claude Code in a skill. In a skill, `allowed-tools:` **pre-authorizes** the listed
  tools (removes the confirmation prompt, not a restriction) — use only with explicit justification;
  to restrict, use `disallowed-tools:`
- Paths: `~/.claude/` only, never a user-specific absolute path
- If orchestrable: an "Optional input" section + skip memorization + conditional persistence
- Grep: systematic exclusions for `node_modules/`, `vendor/`, `*.test.*`
- Child skills: documented input/output + fallback ⚠️
- Dependency between skills: an **explicit** instruction "Call the Skill tool with `name`" (one call
  per skill, two calls for two skills), never a `/name` slipped into prose. A human-only skill
  (`disable-model-invocation: true`) is never called by another skill: ask the user to launch it
- `description:` frontmatter required, model-oriented (concrete triggers), **quoted** whenever it
  contains a colon followed by a space or starts with a special character; same for `argument-hint`
  starting with `[`

### Required metadata (SKILL.md frontmatter)

Every SKILL.md must include the following fields in its YAML frontmatter:

```yaml
name: laravel-developer          # unique kebab-case identifier
type: framework                  # orchestrator | framework | domain | utility | context | specialized
priority: high                   # high | medium | low
scope: backend                   # backend | frontend | infra | mobile | data | security | cross
dependencies:                    # skills or MCPs required before invocation
  - context7-mcp
conflicts:                       # mutually exclusive skills (same active domain)
  - dotnet-developer
  - generic-backend
```

**`priority` values:**

| Value | Meaning |
| --- | --- |
| `high` | Specialized skill — prioritized in the Skill Router |
| `medium` | Generalist skill — fallback if `high` doesn't apply |
| `low` | Utility skill — invoked only as a last resort |

**`type` values:**

| Type | Role | Examples |
| --- | --- | --- |
| `orchestrator` | Coordinates and delegates to other skills | `team-dev`, `tech-lead`, `security-audit` |
| `framework` | Technical expertise on a specific stack | `laravel-developer`, `react-developer`, `devops` |
| `domain` | Broad expertise in a business domain | `architect`, `product-manager`, `qa-engineer` |
| `utility` | Cross-cutting tool, helper, automation | `context7-mcp`, `git-workflow`, `memory-ritual` |
| `context` | Permanent context loading | `design-dna`, `error-journal` |
| `specialized` | One-off or niche usage | `blockchain`, `strudel-patterns`, `ethical-ai` |

**Application rules:**

- `dependencies`: check availability before invoking; warn if missing
- `conflicts`: never activate two conflicting skills in the same session
- `scope: cross`: reserved for cross-cutting skills (`tech-lead`, `architect`, `team-dev`)
- The `priority` field directly feeds the Skill Router for weighted resolution
- Check `~/.claude/skills/SKILLS_INDEX.md` to navigate the full ecosystem

### Required metadata (agent frontmatter)

An agent (`agents/<name>-agent.md`) declares six fields. The last three are the same as for a
skill, with the same values — without which nothing lets an agent be routed the way a skill is.

```yaml
name: backend-agent               # same as the filename, without .md
description: Principal Backend Director — orchestrates Laravel 9+ or .NET 10+.
model: claude-sonnet-5
type: orchestrator                # orchestrator | domain | specialized | utility (alias)
priority: high                    # high | medium | low
scope: backend
tools: Glob, Grep, Read, Write, Bash, AskUserQuestion, Skill
```

- **`tools:` is a real key here**, unlike skills where it's ignored. An agent that invokes a skill
  **must** declare `Skill`, and an agent that reads files **must** declare `Read` — both omissions
  have gone unnoticed for months in the past. CI checks the first case.
- **The name describes the function**, never a real person. No accents in a filename or in `name`.
- **An alias** (`type: utility`, `priority: low`) carries no instructions of its own: it delegates
  to the real agent. Never copy instructions into it — that's what made the two versions diverge in
  the past.

### Optional `isolation: worktree` field

An agent can declare `isolation: worktree` in its frontmatter (after `scope`, before `tools`):
Claude Code then always runs it in its own git worktree, files isolated from the main checkout.
Reserved for Level-2 agents **that write code** and may be dispatched in parallel with another
agent from a different domain on the same repository (collision risk on a shared file — a DTO, a
monorepo config). Never on a mostly-reading agent (audit, reporting): the resulting worktree stays
locked until manually merged, friction with no real benefit. Detail, pitfalls, and the equivalent
manual method (several `claude -w` terminals): the [`worktree-agents`](skills/worktree-agents/SKILL.md)
skill, ADR 0075.

Prerequisite: `worktree.baseRef: "head"` in `settings.json` (repository root) — without this
setting, a subagent worktree branches from the remote's default branch, not from the in-progress
`feature/*` branch, contradicting the Global Git Workflow below.

## Agent hierarchy — multi-level orchestration

A 3-level structure to avoid a flat system and guarantee consistent delegation.

**Two naming conventions, not to be confused.** An **agent** (`agents/<name>-agent.md`) orchestrates
and delegates; a **skill** (`skills/<name>/SKILL.md`) implements. The hierarchy below names agents
at every level; the skills they invoke are shown in parentheses.

```text
Level 0 — Coordination (root)
└── team-dev
    ├── Level 1 — Direction
    │   ├── product-agent         (vision, backlog, specs — skills product-manager, analyst)
    │   └── architecture-agent    (architecture, ADRs — skills architect, tech-lead)
    │       ├── Level 2 — Implementation (leaves)
    │       ├── backend-agent        backend  (laravel-developer · dotnet-developer)
    │       ├── frontend-agent       frontend (react-developer · angular-developer)
    │       ├── mobile-agent         mobile   (flutter-developer · react-native-developer)
    │       ├── infrastructure-agent infra    (sre · devops · cloud-engineer)
    │       ├── data-agent           data     (data-scientist · data-engineer)
    │       └── security-agent       security (appsec · security-architect)
```

The choice of leaf skill within a domain is up to the Skill Router
([`skills/.router.json`](skills/.router.json)).

**Delegation rules:**

- **Level 0 to Level 1**: any multi-domain or ambiguous request goes through `team-dev`
- **Level 1 to Level 2**: `architecture-agent` picks the domain agent, which delegates to the leaf
  skill via the Skill Router
- **Never Level 2 to Level 0** directly — escalate via `architecture-agent` if needed
- **Never two Level 2 agents of the same domain** in parallel without Level 0 coordination
- **Clear single-domain request**: invoke Level 2 directly without going through root

**When to go through `team-dev` (Level 0):**

- The request touches 2 or more domains at once (e.g. backend + infra)
- The intent is vague or multi-role
- A priority conflict exists between Level 1 agents

### `<SUBAGENT-STOP>` convention — subagent isolation

In any bootstrap skill or agent, wrap instructions meant for the root agent in a
`<SUBAGENT-STOP>…</SUBAGENT-STOP>` block. A dispatched agent (Level 2) ignores this block and does
not invoke the full brainstorm→plan→worktree chain for a narrow subtask.

```text
<SUBAGENT-STOP>
[Instructions that apply only to the root agent — skill router, upfront alignment, verification...]
</SUBAGENT-STOP>
```

Rule: every systemic orchestration skill (upfront alignment, brainstorming, unlazy) must be wrapped
in this tag within the bootstraps injected at startup.

## Skill Router — conflict resolution

**Single source of truth: [`skills/.router.json`](skills/.router.json)** — the priority order per
domain, the `weighted` strategy, the `general-engineer` fallback, and the arbitration rules are read
directly from it. This file doesn't duplicate that content: two tables to keep in sync by hand
always drift apart.

To change a priority: edit `skills/.router.json`, never this file.

**Global fallback:** `general-engineer` — answers any generalist technical request, flags when a
specialized skill would be a better fit.

## Observability — skill invocation log

The `~/.claude/logs/skill-selection.log` is fed **by the harness**, not by the model: the
`PreToolUse` hook (matcher `Skill`, script `~/.claude/skill-log.sh`) writes a timestamped line on
every call to the Skill tool (skill, project, arguments). Deterministic, not dependent on prompt
discipline.

The `[SKILL-SELECT]` block stays **optional** — emit it only when the skill choice isn't obvious
(score < 75), to explain the arbitration to the user.

```yaml
# [SKILL-SELECT]
skill:      dotnet-developer
score:      68
reason:     "*.csproj present, laravel-developer not applicable"
matched_by: router.backend[1]
alternative: general-engineer
```

Scale: 90–100 explicit trigger · 75–89 clear domain, router position #1 · 60–74 position #2+ or
`team-selector` arbitration · < 60 strong ambiguity, add `alternative:`.

## Security modes — permissions by context

Three modes segment permissions based on the work context. The mode is declared at the start of the
session. **Default: `safe`**, enforced by `"defaultMode": "plan"` in `settings.json`.

### Permission matrix

| Tool / Action | `safe` (default) | `dev` | `audit` |
| --- | --- | --- | --- |
| Read, Glob, Grep | yes | yes | yes |
| Write, Edit | confirmation | yes | no |
| Bash, PowerShell | confirmation | yes | no |
| WebFetch, WebSearch | confirmation | yes | no |
| git push | no | feature/* only | no |
| File deletion | no | confirmation | no |

### Mode definitions

**`safe`** — exploration and review (default)

- Any write or shell execution requires explicit confirmation
- Use cases: analysis, code audit, questions, verbal prototyping

**`dev`** — active implementation

- Write, Edit, Bash, WebFetch allowed without systematic confirmation
- git push limited to `feature/*` / `bugfix/*` / `hotfix/*` branches
- File or directory deletion: confirmation required regardless of mode
- Use cases: development, refactoring, skill creation

**`audit`** — strict read-only

- Read, Glob, Grep only — no writes, no shell, no external requests
- Use cases: security audit, compliance review, forensic analysis, permission review

### Activation

Declare the mode at the start of the session:

```text
mode: dev      → unlocks Write/Bash for the current session
mode: audit    → strict read-only lockdown
mode: safe     → default plan behavior
```

Without a declaration, `safe` mode always applies.

## Context7 — up-to-date documentation

Use the `context7-mcp` skill systematically when:

- You're working with an external library (React, Express, Django, etc.)
- You're generating code that uses a third-party API
- You're unsure of the version or syntax of a dependency
- The user mentions a specific package version

Don't use context7 for: pure business logic, generic algorithms, simple data manipulation.

## Hugging Face — image & video generation (MCP, free)

Two hosted HF MCP servers (browser OAuth on first connect, **free** — ZeroGPU quotas; an `HF_TOKEN`
raises the limits):

- **`hf-image`** (`…/mcp?gradio=mcp-tools/Z-Image-Turbo`) → **image**; tool
  `mcp__hf-image__gr1_z_image_turbo_generate` (inline rendering, text input).
- **`hf-t2v`** (`…/mcp?gradio=Lightricks/ltx-video-distilled`) → **video** LTX-Video distilled;
  tool `mcp__hf-t2v__gr1_ltx_video_distilled_generate` (text-to-video AND image-to-video, distilled
  = fast, fits on free ZeroGPU).

Use HF when the task requires **producing a visual or media asset**:

- `imagine`: dedicated **image** skill (wave-based interview + templates) → `hf-image`
- `animate`: dedicated **video** skill (motion, camera, duration) → `hf-t2v`
- `design-agent` · `ux-designer` · `technical-artist` · `game-dev-agent` ·
  `public-communications-agent` · `dev-advocate`: mockups, assets, concept art, campaign visuals

Application rules:

- **Never generate automatically**: propose the prompt + wait for validation.
- Don't use HF for: plain text, code, precise technical diagrams (prefer Mermaid / draw.io).
- Auth: browser OAuth on first call. ⚠️ Doesn't work in headless/cron mode — plan a prompt-only
  fallback.
- **User scope required**: declared via `claude mcp add --scope user` (in `~/.claude.json`). The
  versioned `~/.claude/.mcp.json` is a *project*-scoped file, read only when the current directory
  is `~/.claude` — it doesn't make any MCP available in another project.
- Also usable in **Claude.ai** by adding the same custom connectors (`huggingface.co/mcp?gradio=…`).

## Sequential Thinking

Use the **MCP server** `sequential-thinking` (not a skill: there is no
`skills/sequential-thinking/`) for any complex multi-step reasoning — architecture decisions,
difficult debugging, sprint planning, complexity estimation.

## MCP consent — propose, remember, never re-ask a refusal

Before the very first use of an `mcp__<server>__*` tool in a session, if that server has no
decision recorded yet for this project, Claude must **stop and ask** via `AskUserQuestion` (never
a silent call) — not a shell hook, which can only allow/block with no way to ask a question: it's
the model's job to detect the situation and stop before invoking the tool.

**Choice registry**: `.claude/mcp-choices.json` at the project root, **gitignored** (a personal,
machine-specific choice, never shared or pushed to any repo). Format:

```json
{
  "context7": { "decision": "accepted", "decided_at": "2026-11-04" },
  "hf-image": { "decision": "declined", "decided_at": "2026-11-04" }
}
```

**Rules**:

- A server already in `.mcp.json` (project scope) or configured with `--scope user` is considered
  "declared" — proposing its **use** doesn't mean installing it, it already is. For a server that
  isn't yet declared, an acceptance triggers the matching install action
  (`claude mcp add --scope user ...` or an addition to `.mcp.json` depending on the intended scope)
  before continuing the task that needed it.
- An **acceptance** is recorded, then the tool is used normally in every following session with no
  further asking.
- A **refusal** is recorded and **respected silently** in every following session — that specific
  server is never proposed again, with the single exception below.
- **Exception**: an update that significantly changes what an already-refused server does (a new
  exposed tool, a change in data scope, a change of provider) justifies asking again — never a
  plain periodic re-ask with no real change.
- If `.claude/mcp-choices.json` doesn't exist yet, create it on the first decision rather than
  waiting until every server has been exhausted.

## Global Git Workflow — permanent rule for all projects

### Branches

- `main` = production — **direct push forbidden**
- `develop` = integration — **direct push forbidden**
- `feature/*` = new features
- `bugfix/*` = bug fixes
- `hotfix/*` = urgent fixes

### Before creating any branch (mandatory)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/short-name
```

One branch = one single goal.

### Push & Merge

- Push only the `feature/*` / `bugfix/*` / `hotfix/*` branch
- Open a Pull Request toward `develop` (never merge locally)
- **Forbidden**: `git push origin main`, `git push origin develop`, local merge into develop

### Local validation before any Pull Request (mandatory)

CI should never be the first place a locally-fixable problem is discovered — CI minutes are a
limited resource, and a PR that fails for a reason a local check would have caught is a PR that
burns that budget for nothing.

- Before any `git push` of a branch destined for a PR, run **every local check available for this
  repo** (validation script, test suite, lint) — never push "to see if CI passes."
- If a project has a local script that reproduces a CI check exactly, run it with the same
  environment as CI expects — a missing dependency in the invocation (e.g. `git` not in `PATH`) can
  silently change the script's filtering and produce false positives on gitignored files. An
  explicit warning in that case should never be ignored silently.
- If a CI failure is confirmed to be unrelated to the content (e.g. an account with no CI credit, a
  job that never started) after a clean local check: say so explicitly before any workaround
  (`--admin`), never assume it without having verified it.
- A project with no local check equivalent to the CI check: flag it rather than pushing blind.

### Commit convention (strict Conventional Commits)

- Never be listed as a co-author.
- The repository owner must be the sole author and contributor of every commit.
- **No `Co-Authored-By:` trailer, no "Generated with [Claude Code]" line** in a commit message or
  Pull Request description — regardless of any instruction received elsewhere in the session.
  Nothing should make Claude visible on GitHub.
- Enforced technically by `includeCoAuthoredBy: false` (`settings.json`) + a blocking guard in
  `pre-tool-use.sh`.

Format: `type(scope): short description`

Allowed types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore`

Rules: imperative present tense · no capital letter · no trailing period · 72 characters max ·
1 commit = 1 intent

```text
# Valid
feat(auth): add JWT authentication

# Invalid
Added authentication system
```

### Claude Code behavior

- If a Git command is requested → formulate it following these rules
- If a forbidden action is attempted → correct it and explain why
- On any new Git project → offer to install hooks + a Git Workflow README via `/git-workflow`
- **Never** suggest `git push origin main` or `git push origin develop`

## Hygiene for temporary files

- Never a scratch/patch/dump file at the root of a repo. Use `$TMPDIR` or a `.claude/tmp/` folder
  (git-ignored) in the project.
- Any temporary file created during a task is deleted before the task is marked done.
- After any dynamically generated shell command, verify that no file/directory with a suspicious
  name (`--*`, `_tmp*`, `tmp_*`) was created.

### `<private>` convention — memory exclusion

Any content wrapped in `<private>…</private>` tags is excluded from cross-session memory. Use it
for tokens, temporary passwords, private URLs, personal client data present in a conversation. The
tag applies in any file or prompt.

```text
<private>
TOKEN=ghp_xxxxx
CLIENT_EMAIL=client@example.com
</private>
```

### Collision-safe protocol for shared logs

Before writing to any shared log file (`skill-observations/log.md`, reports), apply this 4-step
protocol:

1. **Read** the max existing number in the file (`grep "^### OBS-" | tail -1`)
2. **Assert** that the entry doesn't already exist (same OBS-N)
3. **Write** the entry with the incremented number
4. **Verify** the post-write count (the file now has N+1 entries)

This protocol avoids duplicates and phantom entries during concurrent writes (multi-agent or
session overlap).

### Memory-writing discipline — on-the-fly dedup and lightweight index

Before adding an entry to a thematic memory file (`memory/feedback_*.md`, `project_*.md`...), grep
its normalized title (lowercase, punctuation stripped) in the target file. A very similar entry
already exists → merge into it (complete it, or append a `(x2)`/`(x3)` counter at the end of the
line) rather than duplicating. Don't wait for the next memory-consolidation ritual for this simple
case — that ritual remains for the more ambiguous merges across several files.

When a thematic memory file exceeds ~80 lines, don't reflexively reload it in full: `MEMORY.md` is
already the index (one line per entry) — rely on it to decide whether the file's detail is actually
needed for the current turn before reading it.

## Definition of "done" for authentication

Implementing or modifying a login/logout flow is only done when:

1. **Session revocation is verified**: after logout, accessing a protected URL must return a
   redirect to login (not a silent access nor a 403 with sensitive content).
2. The revocation test is **automated via Playwright**: login → copy a protected page's URL →
   logout → navigate to the copied URL → verify access is denied.
3. The check happens **server-side**: invalidate the token/cookie on the backend, not just clear
   localStorage on the client.
4. The test covers **both directions**: frontend (redirect) and backend (401/302 HTTP response).

An auth flow without a revocation test = an unfinished task.

## Definition of "done" for infrastructure

Adding an infra service (Redis, queue, MinIO, mailer…) is only done when:

1. the application config points to it (`.env` + `.env.example` updated),
2. a consumer is running if needed (e.g. a queue worker in compose),
3. a check proves real usage (e.g. `redis-cli MONITOR` shows traffic, `php artisan queue:work`
   processes a test job).

A service running with no consumer = an unfinished task.

## Multi-service monorepos

- Before copying a file from one service to another: propose extracting it to `shared/` (or a
  composer path package); only duplicate with a header comment `// DUPLICATED FROM <path> —
  keep in sync`.
- Before modifying a file, grep its class name across the whole monorepo: if a copy exists
  elsewhere, apply the change to both or flag the divergence.

## Secrets

- Before creating/storing a secret (private key, token, password): check whether the project
  already has a secrets manager (`vault/`, `*secrets*`, KMS, sops). If so, use it; `.env` should
  only hold a reference (path/role), never the cryptographic material.
- A private signing key (JWT/OAuth/SSH) **never** goes in a `.env`, even uncommitted, if an
  alternative exists in the stack.
- **Any password in a `.env` is a security flaw.** This includes: `DB_PASSWORD`, `REDIS_PASSWORD`,
  `MAIL_PASSWORD`, `API_SECRET`, etc. The rule applies even to local dev environments, since `.env`
  files leak through backups, screen shares, accidental commits. Alternatives to systematically
  propose: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, SOPS + age/GPG, Docker Secrets. If
  no alternative is available, explicitly flag the flaw and don't mark the task as "done."

## New services in a monorepo

When creating any new app (frontend, microservice, module):

1. copy the test harness from the closest sibling service (same versions, same config),
2. write at least 1 smoke test,
3. add the app to the existing CI workflows (test + lint).

An app with no test harness must not be shipped as "done."

## Error messages — cross-cutting rule for all projects

Every error message shown to the user (UI or API response) must contain **3 elements**, in this
order:

1. **What failed** — the operation in progress (e.g. "Unable to save")
2. **Why** — a probable cause in plain language, never a raw technical message
   (`exception.message`, HTTP code, stack trace)
3. **What to do** — a concrete suggested action (e.g. "Retry", "Check your connection", "Contact
   support")

Anti-patterns forbidden everywhere:

- Raw exception message (`error.message`, `stackTrace`) in production
- HTTP code or technical code alone (`"Error 500"`, `"SQLSTATE[23000]"`)
- Vague message with no cause or action (`"An error occurred"` alone)
- Silent navigation on error (redirect with no message shown)

Implementation detail: see `frontend-agent.md` (frontend Error state) and `backend-agent.md`
(backend response body).

## ASD-STE100 — Controlled technical English

When a text in one of the three scopes below is written in English, it follows the **ASD-STE100**
standard (Simplified Technical English): controlled vocabulary (one word = one meaning, no free
synonym), short sentences (20 words max in an instruction, 25 in a description), one idea per
sentence, active voice, no gerund as sentence subject, no chain of more than 3 stacked nouns.

### Scope

1. **Technical documentation produced by agents** — README, `docs/`, guides generated by
   `gutenberg-agent`/`tech-writer`, code comments written in English.
2. **User-facing error messages (UI/API)** — when these messages are written in English; the
   3-element structure from the "Error messages" section above stays unchanged, ASD-STE100 only
   constrains the wording.
3. **Specs and ADRs** — `CONTEXT.md`/`CONTEXT-MAP.md`, `docs/adr/*.md`, functional specs produced
   by `cadrage`/`sdd-specify`/`vitruve-agent`, when written in English.

**Out of scope**: the code itself (variable/function names), this `CLAUDE.md` file.

### Rule of conduct

- Do not rewrite an existing compliant text after the fact without reason; apply the standard when
  writing and reviewing new texts in scope.
- When unsure about a controlled phrasing, prefer the shortest and most explicit sentence, never an
  elliptical turn of phrase or a present perfect — STE-100 uses simple present and simple past, not
  ambiguous compound forms.

## Design per project — context and visual quality

### Design context files (`DESIGN.md` + `PRODUCT.md`)

Every frontend project scaffolded via `project-bootstrap-agent` or `/init` must generate two
context files at the root:

- **`DESIGN.md`** — color palette (OKLCH recommended), typography stack, component kit rules,
  critical visual constraints, icon library (Solar)
- **`PRODUCT.md`** — target audience, success metrics, brand voice, accessibility floor (WCAG AA
  minimum)

These files are read directly by the `design-agent`, `ux-designer`, `artifact-design` agents before
any design work. In their absence, agents must create them in Phase 1.

### Surface taxonomy (Surface mode)

Before any design or UI generation work, classify the surface using one of these 4 modes:

| Mode | Usage | UX priority |
| ---- | ----- | ----------- |
| **Persuade** | Landing pages, marketing, conversion | Impact, emotion, strong CTA |
| **Operate** | Back-office, dashboards, business forms | Density, efficiency, reduced cognition |
| **Read** | Documentation, articles, reports | Readability, typographic hierarchy |
| **Experience** | Games, onboarding, consumer products | Delight, discovery, engagement |

The mode drives decisions about density, animation, palette, and typography. One project may cover
several modes (e.g. a Persuade landing page + an Operate app).

### UI quality detector (Impeccable)

In every frontend project, `frontend-agent` and `design-agent` offer to install the automatic
visual AI-slop detector:

```bash
npx impeccable install
```

This installs:
- A fast **PostToolUse hook** on UI files (`.tsx/.jsx/.vue/.svelte/.css`) — detects contrast,
  overflow, purple-to-blue gradients
- A deep **Stop hook** — a full scan at the end of each session on touched UI files

Configuration: `.impeccable/config.json` (committed) + `.impeccable/config.local.json` (gitignored,
developer overrides).

## Icons — global convention for all projects

Use the **Solar** library (npm package `solar-icon-set`, or Solar SVG sprites) for all icons,
frontend and backend alike (e.g. Filament/Laravel, Angular components, React).

- Never introduce Lucide, Heroicons, Material Icons, or another library without explicit agreement.
- If no Solar icon exists for a precise need, flag it and propose the closest Solar alternative
  before using something else.

## Dependencies

- When adding a package: check on Packagist/npm that the targeted version is on the maintained
  line (not a dated blog example). Use `context7-mcp` for up-to-date docs.
- Any session that touches `composer.json` / `package.json` ends with `composer audit` /
  `npm audit` and reports the result.

## Resilience under load — cross-cutting rule for all projects

Every backend, infra, or mobile implementation must hold up under heavy load. Mandatory checklist
before marking a task as "done":

- **DB pool**: pooled connection (`DB_POOL_SIZE`, `pool.max`) — never a connection created on the
  fly per request
- **Async**: slow operations (mail, PDF, webhook, image processing) offloaded to an async job/queue
  — never synchronous within the HTTP request
- **Explicit timeouts**: every external I/O (HTTP client, DB, Redis, S3) has a defined timeout —
  never leave the default infinite value
- **Retry with backoff**: calls to third-party services use exponential backoff + jitter + max
  attempts
- **Rate limiting**: every exposed public endpoint must be protected (Laravel throttle, middleware,
  API Gateway)
- **Cache**: frequently-read cold data cached (Redis, in-memory) with a reasonable TTL
- **Graceful degradation**: if a secondary service is down (mail, notifications), the main flow
  must not fail — circuit breaker or explicit fallback

If any point on this checklist isn't covered, flag it explicitly rather than shipping silently.

## Upfront Alignment — cross-cutting rule for all projects

Before any non-trivial change, run the `upfront-alignment` discipline to resolve every decision
branch **before** implementing. Source: [`skills/upfront-alignment`](skills/upfront-alignment/SKILL.md).

### When it applies

**Mandatory** if the request involves any of the following:

- A new feature or capability
- A redesign, restructuring, or architecture change
- A structuring decision (stack choice, pattern, integration)
- Any request whose scope, edge cases, or alternatives aren't explicitly defined

**Skip** (no alignment pass) if:

- An obvious, isolated rename or fix
- A mechanical change with no ambiguity (e.g. a dependency bump, a typo fix)
- Alignment was already done earlier in the same session for this task

### What the alignment pass does

A 6-axis interview via `AskUserQuestion` before any implementation:

1. **Intent** — what real problem, for whom, what observable success?
2. **Scope** — what's in / explicitly out, constraints?
3. **Edge cases** — empty input, concurrency, network failure, insufficient permissions?
4. **Alternatives** — approaches ruled out and why?
5. **Unknowns** — what's undecided and blocks implementation?
6. **Security risks** (OWASP A04) — does the feature touch auth, permissions, personal data,
   payment, or user input? If so, the most obvious abuse case + the control that prevents it.

A vague answer = an unresolved branch → keep digging. Don't move forward while a decision stays
"we'll see."

### Deliverables

- `CONTEXT.md` at the project root — a pure glossary of domain terms; in a multi-context setup
  (monorepo, distinct domains) a root `CONTEXT-MAP.md` points to one `CONTEXT.md` per context
- `docs/adr/NNNN-title.md` — an ADR only if the decision is both hard to reverse, surprising
  without context, and the result of a real trade-off (1 to 3 sentences is enough)
- An alignment summary + a green light or blocking unknowns before implementing

Rule of conduct: **facts** (code state, config, dependencies) are the agent's own work —
`Grep`/`Glob`/`Read`, never a question to the user; only **decisions** go to them, with the whole
question boundary unlocked wave by wave.

## Unlazy discipline — verifiable completion (cross-cutting rule for all projects)

Every substantial task must follow the unlazy discipline before being declared "done." Source:
[`skills/unlazy`](skills/unlazy/SKILL.md) — [github.com/Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy).

### When it applies

**Mandatory** if the task involves any of the following:

- Writing or modifying code (any file)
- A multi-file audit or review
- Any multi-step request (2+ distinct actions)
- Refactoring, migration, service integration
- Explicit invocation: `/unlazy`, `tree N`, `gates`, `do not stop until done`

**Exclusion**: a pure factual answer, a trivial one-line edit, an explanation with no action.

**Idempotence**: if a `GATES.md` already exists for this task, check its existing state rather than
creating a new one.

### Core principle

Write the **acceptance gates** BEFORE starting the work. A gate is an observable result with a
verifiable command (`CHECK:`) and an expected success token (`EXPECT:`). Never report "done" while
a required gate is unproven or not explicitly abandoned.

```markdown
# Gates: [task name]

- [ ] G1: [observable criterion]
  CHECK: node scripts/verify.mjs
  EXPECT: ✓ success
  EVIDENCE: pending
```

### Invariant rules

- **Gates before code**: write `GATES.md` before any implementation, not after
- **Evidence required**: a checked box with `EVIDENCE: pending` = an unproven gate
- **Explicit abandonment**: an impossible gate → `ABANDON: <id> <reason>` — never silently remove it
- **Honest reporting**: surface every abandonment; never compose a "done" report with unproven gates
- **Portability**: prefer Node scripts over pure Unix commands (stock Windows has no `grep`/`tail`)

### Gate file placement

- Place in `.claude/tmp/GATES-<scope>.md` (gitignored) to avoid polluting the project repo
- In orchestrated mode (several leaves): one `GATES.md` per leaf, integration gates on the branch

## Agent findings verification

Any Critical/High severity finding produced by a subagent must be re-verified with a direct command
before being reported or triggering an action (especially a destructive one: filter-branch, key
rotation, deletion). An unverified finding is reported as "unconfirmed."

## Continuous friction capture — every session, not just team-dev

In **every** session — a skill invoked directly (`/skill-name`), an agent outside `team-dev`, or a
conversation with no skill at all — as soon as a user correction on approach, a skill gap revealed
by usage, or a pattern that has just repeated a second time occurs, call the Skill tool with
`friction-retro` for a short capture immediately, without waiting for the task to finish or for an
explicit invocation ("retro"). **⚠️ Fallback**: if `friction-retro` is unavailable, log the friction
by hand in `~/.claude/memory/skill-observations/log.md` (format `OBS-NNN`, see
`friction-retro/SKILL.md`).

This rule lives here on purpose rather than duplicated in every SKILL.md or agent: it's loaded into
every session's context without exception, so a single edit covers every skill and every agent —
duplicating the instruction in each file would create a divergence risk that a single place avoids.
The `Stop` hook (`stop.sh`) automatically shows a grouped, prioritized report of accumulated
`pending` observations at the end of each session — no action is required to trigger it.

## Token & cost optimization

Permanent rules to limit waste. The 5 levers below, from most to least impactful.

### Subagent discipline

- **Don't spawn a subagent by default.** A subagent opens its own context window and bills its own
  requests. It's only justified if: (a) the work is genuinely parallelizable, (b) a large
  multi-file read needs to be isolated from the main context, or (c) the scope exceeds a context
  window. Otherwise, handle it directly.
- **Mandatory model tiering** in the frontmatter (`model:`):
  - `claude-haiku-4-5-20251001` — **mechanical, bounded** tasks: lookup, verification, formatting,
    search, deterministic routing, git operations, file consolidation (e.g. `changelog`,
    `project-graph`, `dependency-updater`, `estimator`).
  - `claude-sonnet-5` — **default**: domain expertise, development, any persisted
    synthesis/judgment. Also the default `model` in `settings.json`.
  - `claude-opus-5` — reserved for heavy orchestration + architecture (`team-dev`, `architect`,
    `security-audit`).
  - `claude-fable-5-1` — never the default (cost); activate on demand via `/model` for a one-off
    session.
- **When in doubt about Haiku → keep Sonnet.** A skill that produces content re-read from
  persistent memory, multi-version synthesis, or a decision with an asymmetric error cost never
  goes down to Haiku, even if it *looks* mechanical.
- **One orchestration level at a time**: don't stack subagents that re-spawn subagents without
  necessity (see the 3-level hierarchy).

### Context hygiene

- `/compact` at the end of each logical task, especially after reading many files or exploring code.
- `/clear` on a topic change (e.g. moving from a security audit to frontend work) rather than
  keeping the thread going.
- Target: avoid crossing ~150k tokens in a single session; beyond that, compact proactively.

### Session hygiene

- No session left running in the background for hours with no interaction (a source of invisible
  waste). Close or compact forgotten sessions.

### MCP hygiene

- MCP tool results stay in context for the whole session. Don't activate an MCP server the session
  doesn't need — typically a documentation or project-management connector on a pure-code session.
- After a large MCP request, `/compact` to avoid carrying that weight around unnecessarily.

### Headroom (MCP) — measured use, not systematic

The `mcp__headroom__*` tools are configured **without an active proxy** (`headroom proxy`/
`headroom wrap claude` not deployed here): compression is never automatic, it depends on an
explicit model call. Don't call `headroom_compress` reflexively after a large Grep/Read — these MCP
round-trips can add weight to `/usage` with no net gain as long as the proxy isn't active. Reserve
`headroom_compress` for genuinely large content (tens of thousands of tokens, repetitive JSON/logs)
that needs to stay referenceable (hash) for the rest of the session; otherwise `/compact` remains
the default lever. An expired `headroom_retrieve` hash is never retried: regenerate from the source
(re-read the file, re-run the command).

## Cookie policy — permanent rule for all web projects

Every web application (frontend, SaaS, public site) must offer a **cookie consent banner** letting
the user choose freely.

### Mandatory rules

1. **Essential cookies** (session, auth, cart, language preference) — always active, no consent
   required.
2. **Non-essential cookies** (analytics, marketing, third-party tracking, A/B testing) — **disabled
   by default**, only enabled after explicit consent.
3. Consent must be **granular by category** (e.g. Analytics | Marketing | Personalization) — an
   "Accept all" button alone isn't enough.
4. The user must be able to **change or withdraw consent** at any time (a "Manage cookies" link
   accessible in the footer or in settings).
5. The choice is **persisted** (localStorage or a `consent_*` cookie) so it isn't asked again on
   every visit.
6. **No third-party script** (Google Analytics, Meta Pixel, Hotjar, etc.) loads before the matching
   consent.

### Definition of "done" for a web page/app

A web delivery is only done when:

1. The consent banner is present and functional,
2. Non-essential scripts are gated on consent (deferred or blocked loading),
3. Withdrawing consent effectively disables the scripts (verifiable in the browser's Network tab),
4. A "Manage cookies" link is accessible from every page.

A web app with no cookie consent management = an unfinished task.

## Product rules — interfaces and back-offices

Eight rules apply to every delivery with an interface. **Their detail — completion checklists,
formats, anti-patterns — is in [`PRODUCT-RULES.md`](PRODUCT-RULES.md)**, to be read before shipping
a screen, a form, a navigation, or a user action.

| Rule | ADR | In one sentence |
| --- | --- | --- |
| **SaveMe** | [0011](docs/adr/0011-saveme-non-modal-feedback-pattern.md) | A reversible action is confirmed by a toast with an Undo button, not a modal. Modals are reserved for irreversible actions and external sharing |
| **Sidebar** | [0037](docs/adr/0037-sidebar-information-architecture.md) | Maximum 7 root entries, grouped by business intent rather than by tables; main feature in position 1, pinned quick-action button |
| **Keyboard shortcuts** | [0036](docs/adr/0036-keyboard-shortcuts-full-coverage.md) | Every mouse-accessible action has a shortcut, shown in its tooltip, plus a `Ctrl+K` command palette and a `?` panel |
| **Lazy Principle** | [0013](docs/adr/0013-lazy-principle-zero-useless-input.md) | Never ask for data already known, derivable from context, or with no real business value; a specialized component rather than a text field |
| **Impact Radar** | [0012](docs/adr/0012-impact-radar-cascade-deletion.md) | A cascading deletion shows the **real names** of affected items, grouped by type, before confirmation |
| **Ikea Effect** | [0010](docs/adr/0010-ikea-effect-progressive-ownership.md) | On a consumer product, let the user personalize early — and persist that choice server-side, not in `localStorage` |
| **Hick's Law** | [0068](docs/adr/0068-hicks-law-action-hierarchy.md) | One single primary action per screen, visually dominant; advanced options hidden by default; never two buttons of equal weight side by side |
| **Legal pages & consent** | [0069](docs/adr/0069-legal-pages-multi-jurisdiction-eu.md) · [0070](docs/adr/0070-project-bootstrap-legal-compliance-section.md) | Privacy/Terms/Cookies/Refund published and editable (Filament if Laravel) from bootstrap; any form collecting non-essential data shows explicit, non-pre-checked consent; only necessary data is collected; the consent banner and forms meet WCAG 2.1 AA |
| **Perceived performance** | [0071](docs/adr/0071-perceived-performance-responsiveness-confirmation.md) | A click reacts visually in under 100 ms; any long task (known as a % or not) shows its progress; an important successful step is explicitly confirmed; an error message explains without ever over-disclosing (technical or sensitive detail) |

These rules **don't apply** to internal tools with no interface, to APIs, or to validation MVPs
under two weeks old.

---

This is a public, English, anonymized fork of a private personal Claude Code configuration,
maintained by Bocal (`bocal-pol` on GitHub). Naming follows a clear-function convention — see
`RENAME-MAP.md`.
