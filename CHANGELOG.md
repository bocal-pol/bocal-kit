# Changelog

All notable changes to `bocal-kit`. Format
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
[SemVer](https://semver.org/).

**Versioning applies to the repository, not to each skill.** A `version:` field across hundreds of
frontmatters would be that many values to maintain by hand for information `git log` already
provides. To check if your environment is behind:

```bash
git -C ~/.claude fetch && git -C ~/.claude status
```

What counts as a **breaking** change (major): a `team-dev` mode removed or renamed, a skill removed
or merged, an agent renamed, a frontmatter convention that invalidates existing files. A skill can
be added or enriched without being a breaking change.

## [Unreleased]

### Fixed

- `INSTALL.md`: `context7` and `sequential-thinking` are registered at user scope (`--scope user`).
  Without it, they only exist for the folder where the command ran, and are missing in other projects.

### Added

- Delegation to Codex (OpenAI, installed in WSL: under native Windows its sandbox blocks reads and
  writes, observed). Skills: `codex-bridge` (bridge, consent before each send, fallback to Claude when
  the quota is exhausted with a re-check at the next use, isolated worktree), `codex-delegate` (small
  bug, broken test, boilerplate tests), `codex-review` (review → report → fix by Claude; modes report,
  second-opinion, docs), `codex-explore` (read-only) and `transfer` (hand over when Claude reaches
  its limit). Mode `/team-dev --codex` (alias `-cdx`). Option `goodnight --handoff-codex` (Codex
  continues the plan when the quota stops Claude). The ChatGPT login, a step the installation cannot
  do, is explained in full by the skill and in `INSTALL.md` (section 4c). The official plugin is not
  used: it starts the Windows Codex.
- Rule "MCP and plugin consent": a component (MCP or plugin) that a skill requires but that is absent
  is always offered for installation, unless a refusal is already recorded. Every component a skill
  uses must appear in `install.ps1` and `INSTALL.md`.
- ADR 0077 and the "Business model and access rights" rule: token bucket quota (X tokens, one token
  returned every Y/X) instead of a fixed window, free / freemium / paid levels per application, an
  administration backend whose location is asked from the user. Seventh axis of upfront alignment;
  `sales-offers-agent` and `laravel-api` updated.
- `sales-offers-agent`: eleven sales policies (value before price, three tiers at most, tax-inclusive
  prices, no dark patterns, reminder before renewal, honest retention, remembered refusal).
- Solar icons animated in React with the Animate UI mechanism (hover, click), one icon per file in
  `shared/`. Solar stays the standard.
- `structure-humanizer` skill (source name `human`): rewrites the structure of a text so that it no
  longer shows AI authorship, based on the StoryScope study. It treats the stated moral, emotion played
  by the body, a story that is too straight, vague allusions, filler settings, entrance portraits and the
  ignored reader. Seven checks, one or two interventions per text. It complements `no-ai-slop`, which
  treats the surface.

## [1.5.0] - 2026-11-18

### Added

- `adversarial-tester` skill: an adversarial tester that plays the clumsiest, weirdest and most inventive
  user (absurd data, silly gestures, skipped steps, bypassed rules, diverted uses). Code review to find
  the fragile assumptions, then an attack on the running application, **on a test environment only**:
  `target-guard.mjs` refuses production, undesignated public domains and `prod`/`live`/`www` names, and
  reads a `.env` without ever printing a value (self-test of 27 cases). Every defect is proven, gets a
  regression test, then the fix loop runs until green, with a replay of the whole campaign. Playwright
  MCP is the main tool (table mapping attack families to tools), with the MCP consent rule. Linked to the
  test agent of `team-dev`: `qa-lead-agent` offers it in Phase 1, runs it in Phase 9b, then loops in Phase
  9c; `/team-dev --qa-lead --adversarial [target]` plays only the adversarial campaign.
- `fix-until-green` skill: single source of the "fix until green" loop for all tests — baseline, failures
  grouped by cause, diagnosis through `debug`, product fix, re-run of the **whole** suite, one commit per
  fix. Explicit limits (3 attempts per cause, 10 iterations, stagnation, regression undone) and an honest
  "not green" report when they are reached. Integrity guard `integrity.mjs` (self-test of 13 cases):
  blocks deleted tests, `skip`/`xfail`/`.only`, a lower test count, `|| true`, `passWithNoTests` and other
  runner weakenings; flags changed or removed assertions for justification. Scripts are launched through
  `bash` wrappers because `node ~/...` is not expanded by `cmd.exe` nor by the PowerShell tool.

### Changed

- Main instruction file: new section "Definition of "done" for tests — loop until green". Any test run by
  an agent or a skill triggers `fix-until-green` on failure; a red test reported as a finished deliverable
  is an unfinished task.
- `qa-automation` (Phase 4b), `perf-tester` (loop on unmet thresholds) and `qa-lead-agent` (Phases 9b
  adversarial tests and 9c loop; "green / not green" verdict in the report) call the loop instead of just
  reporting failures.

## [1.4.0] - 2026-11-18

### Added

- `goodnight` — mode B, headless supervisor (`goodnight.sh supervise`): starts
  `claude -p --output-format stream-json`, reads the events live and kills the process on a
  `rate_limit_event` with `allowed_warning`/`rejected`, `utilization` above the threshold, usage
  beyond the included quota (`isUsingOverage`), `api_retry` for a rate limit, a weighted-token
  budget exceeded or the deadline. The only mode usable on a Team plan, where the statusLine
  `rate_limits` field (reserved for Pro/Max/Ultra) does not exist — observed on a Team
  account. Tested with a real `claude` (normal session and budget stop) and 22 more cases,
  including processes that are really killed (self-test at 71 cases). Limits documented in the
  skill: alert threshold and emission frequency not documented, abrupt stop, token budget owned by
  the user.

- `goodnight` skill (human-only): overnight autonomous work under a subscription-quota ceiling. It
  runs a plan step by step, tests after each step, decides alone and notes why, stops only for the
  irreversible, and leaves a morning report. Hardware guard: a `statusLine` that relays
  `rate_limits` to `~/.claude/goodnight/state.json` and a `PreToolUse` hook that refuses work tools
  from 80% of the 5-hour or 7-day window, and fails closed when the signal is absent or stale.
  Self-test of 39 cases (`goodnight.mjs selftest`). `settings.json`: `statusLine` key and
  `PreToolUse` `*` hook. Limits are documented in the skill (no hook reads the quota; an
  interactive session is required).

- `docs/quick-reference.html`: printable A4 quick-reference sheet (`team-dev` modes, skills, Claude
  Code basics). It lists the `--cli-forge` mode.

- "Cleanup of merged branches" convention (main instruction file, `git-workflow` skill, release
  agent checklist): a `feature/*`/`bugfix/*`/`hotfix/*` branch merged into `develop` and then into
  `main` is deleted (remote and local) without asking. Ancestry in `origin/develop` and
  `origin/main` is checked first. List before delete. Use `git branch -d`, never `-D`. Never touch
  `main`, `develop` or a branch of another author. Squash/rebase: proof through `gh pr list`, or keep it.

- `cli-anything` (orchestrator, modes build/refine/test/validate), `cli-hub` (utility) and
  `cli-forge-agent` (`team-dev --cli-forge` mode): make a software agent-native. Look first for an
  existing CLI in the CLI-Anything registry. Otherwise build a Python/Click CLI harness (7-phase SOP,
  E2E tests on the real software, generated SKILL.md, PEP 420 pip package). Method adapted from
  `HKUDS/CLI-Anything` (Apache-2.0). A cloned source is untrusted data. Installing a third-party
  package and publishing to PyPI need user confirmation.

- Project `Stop` hook (`.claude/audit-reminder.ps1`): blocks session end and asks to run the
  `claude-api` skill's `prompt-audit` argument when CLAUDE.md, primer.md, hindsight.md, `skills/`
  or `agents/` have a real content diff not yet audited — a marker per change set avoids asking
  twice for the same batch. Detects via `git diff --name-only` (+ `--cached` + `ls-files
  --others`), never `git status --porcelain` alone: `core.autocrlf` reports hundreds of
  line-ending-only false positives with no real content change.
- `security-agent`: three checks from the public "7 doors" checklist (Edmond Aouad) that were
  missing from its already-broader OWASP coverage — an AI/third-party key exposed in the browser
  bundle (`NEXT_PUBLIC_`/`VITE_`/`REACT_APP_`…) and production sourcemaps, a payment webhook check
  (signature verification plus anti-replay/idempotency, dynamic scenario `D-WEBHOOK`), and signup
  abuse controls (rate limiting, email verification before free credits, an AI spend cap, dynamic
  scenario `D-SIGNUP`). Added a **continuous watch mode**: Phase 0a installs (through the
  `update-config` skill) a `PostToolUse` hook in the audited project that scans only the changed
  file and blocks (exit code 2) on a Critical/High finding; Phase 0b gives a lightweight
  OPEN/CLOSED gate that domain agents can call after each implementation step, instead of waiting
  for a final review. `backend-agent`, `frontend-agent`, and `mobile-agent` now call this gate
  before marking any file that touches auth, payment, a webhook, or a public route as done.

### Changed

- Migrated from Claude 5 to Claude 5.5 (`claude-opus-5-5` / `claude-sonnet-5-5` /
  `claude-haiku-5-5`) across 324 `model:` frontmatters (skills + agents), `CLAUDE.md`,
  `CONTRIBUTING.md`, `settings.json`, and the `ai-product-engineer` pricing example. Mirrors the
  same drift fixed upstream in `claude-config` (ADR 0016 revision) — new ADR 0016 revision entry
  added here too.

- `unlazy`: `NOT YET:` section in `GATES.md`, symmetric to `ABANDON:` — bounds over-completion
  (unrequested work an agent would do "to be thorough") the way `ABANDON:` bounds
  under-completion (an unproven gate explicitly waived). Step 6 (final report audit) now checks
  that nothing listed under `NOT YET:` happened along the way. Inspired by the "Not required
  yet" convention found in `bocal-pol/ai-hero` course material.
- `session-token-hardening`: prescriptive remediation for session cookies (HttpOnly, Secure,
  SameSite, `__Host-` prefix, ID regeneration after login/privilege elevation, CHIPS
  partitioning) and JWT (server-side algorithm allowlist against `alg:none` and RS256/HS256
  confusion, `kid`/`jku` validation) with corrected code examples for Laravel Sanctum,
  Express/`jsonwebtoken`, and .NET `Microsoft.IdentityModel.Tokens`. Coexists with
  `iam-engineer` (broad OAuth/RBAC detection) without replacing it. `security-agent` now
  invokes this skill in Phase 9c bis, alongside `iam-engineer` (Phase 9c).

### Fixed

- `goodnight` — three defects found by the first real trial of mode B (2-step plan, real `claude`,
  throwaway repository): (1) notes were written in `.claude/tmp/`, which is write-protected outside
  an interactive session — write refused, notes lost; replaced by `.goodnight/` inside the
  repository, ignored through `.git/info/exclude`; (2) the prompt made the model call
  `goodnight.sh status`, which belongs to mode A and was refused for lack of permission; mode B now
  says not to run it; (3) the doc claimed one `rate_limit_event` per request: a single event was
  observed over 17 turns, so the token budget is the only continuously measured bound — fixed,
  with the trial measurements (about 196,000 weighted tokens, an estimated $0.89, 141 s). Both
  requested commits were made, with no push.

- `CHANGELOG.md`: generic wording for the account on which the Team-plan limitation of `goodnight`
  was observed ("a Team account").

- `goodnight`: the skill commands (`status`, `activate`, `deactivate`, `selftest`) and the
  instruction given to the user used `node ~/.claude/...`, which `cmd.exe` and the PowerShell tool
  do not expand ("Cannot find module"). Added the `goodnight.sh` wrapper: the skill now calls
  `bash ~/.claude/skills/goodnight/scripts/goodnight.sh <command>`, and the guard accepts it as the
  close command. A `cmd.exe` command is documented in the skill. Self-test at 49 cases.

- `goodnight`: the `PreToolUse` hook and the `statusLine` called `node ~/.claude/...`. Under the
  Windows PowerShell tool `~` is not expanded: Node could not find the script and Claude Code
  treated the error as non-blocking, so the guard let every call through — seen in a real test with
  `claude -p`, invisible in the self-test. Replaced by `bash` wrappers (`guard.sh`, `statusline.sh`)
  that deny if Node cannot start. Self-test grew from 39 to 45 cases (G9); verified end to end: call
  refused at 95%, allowed at 5%.

## [1.3.0] - 2026-11-16

### Added

- `areopage`: decision panel skill.
- `dpo-toolkit`: real processing register and DPIA, wired into `project-bootstrap-agent` (Phase 6b)
  and `compliance-officer` (R-07/R-08 gaps); shared `.claude/country.md` jurisdiction convention
  (ADR 0076).

### Fixed

- `create-skill`: `tools` removed from the required skill frontmatter fields.
- `semgrep`: added a direct `docker run` fallback for stale compose mounts.
- Co-authorship guard in hooks scoped to actual commit/PR writes.

### Documentation

- `git-workflow`: documented the empty-repo bootstrap path.
- `laravel-developer`: documented Filament Wizard cross-step pitfalls.
- `team-dev`: documented background sub-agent tool limitations.
- `worktree-agents`: documented a submodule monorepo incompatibility.
- `react-developer`: respects existing project folder conventions.
- `hindsight`: logged frozen PATH detection at session startup.

## [1.2.0] - 2026-11-12

### Changed

- `backend-agent`, `frontend-agent`, `mobile-agent`, `infrastructure-agent`: isolated in git
  worktrees to avoid collisions when dispatched in parallel.

## [1.1.0] - 2026-11-10

### Added

- `skillspector`: security scanner for third-party skills, agents, and MCP servers.
- `impeccable`: non-waivable floor rules ported from hallmark.
- `stack-diagram`: architecture diagram skill using real technology logos.
- `animate-lemo`: coded short-film skill (Lemo-Opuscar format).
- ASD-STE100 (Simplified Technical English) convention documented for English technical writing.
- Web performance checklists added across the stack and infrastructure skills.
- Anthropic prompt library wording discipline added to `team-dev` and `upfront-alignment`.

### Fixed

- `improve-skills`: now requires a skillspector scan and a fork PR after a fix.
- Protected-branch guard scoped to `origin` only (was tripping on unrelated remotes).

## [1.0.0] - 2026-11-06 - Initial public English release

### Added

- Initial public release: a full English translation, anonymization, and clear-function rename of
  a private personal Claude Code configuration.
- `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CREDITS.md`.
- `PRODUCT-RULES.md` — the product rules referenced from `CLAUDE.md`.
- `RENAME-MAP.md` — the full mapping from the source repo's original names to this repo's clear
  English names, for anyone tracking the two in parallel.
- `ANONYMIZATION-NOTES.md` and `PORTING-NOTES.md` — the decisions made while anonymizing and
  porting content from the private source.

### Changed

- **Every agent and skill renamed** to a clear, functional English name — no persona or
  code-name identifiers. See `RENAME-MAP.md` for the full mapping.
- **Every document translated to English** — `CLAUDE.md`, `primer.md`, `hindsight.md`, `README.md`,
  `PRODUCT-RULES.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CREDITS.md`, and every `docs/adr/` entry.
- **All identifying content removed or generalized** before publication — no email address, no
  institutional domain, no personal file path. See `ANONYMIZATION-NOTES.md`.

---

## History before the public fork

This repository's own version history starts at [1.0.0]. The source configuration (a private
repository with a longer history, 2026-06-11 to 2026-09-17) is not reproduced here version by
version — fake `0.x.0` releases would claim this repository existed before it did. This section
summarizes that period instead, in full.

The source repository's first commit (2026-06-11) held an initial Laravel code audit; its findings
were only turned into a firm rule much later (see `security-agent`'s "no raw Model in a response"
rule, below). A first structuring wave (2026-06-23) added named functional agents, a cross-session
memory system (`primer.md`, `hindsight.md`, a dated lessons file), and a first set of behavioral
guardrails against over-engineering.

Through July, a cross-stack DTO convention (`dto-architect`) took shape, then the project's
largest foundational wave landed (mid-July): a three-tier model policy (Haiku / Sonnet / Opus by
task type), three security permission modes (`safe` / `dev` / `audit`, `safe` by default), a global
Git workflow with mandatory local checks before any pull request, a required `SKILL.md` frontmatter
schema, and a session-hygiene policy (token budget, regular compaction).

August brought free hosted image/video generation (replacing a paid provider), a minimal-code
discipline for all code changes, a full IT-support skill set, a first security pass on the
security-auditor agent, and the project's major product-interaction patterns — each with its own
decision record: progressive self-customization for consumer apps, a non-modal pattern for
reversible-action feedback, named-item transparency before a cascading delete, a "never ask for
data you already have" rule, full keyboard-shortcut coverage, and an information-architecture rule
for navigation sidebars.

September added a security-audit cross-check between what a decision record claims and what the
code actually implements (closing a gap where documented controls had never been built), an
end-of-session retrospective skill, and a personal Product Owner for a project on idea-creation
theory. The final pre-publication wave (September 16-17) added mandatory direct re-verification of
any Critical/High finding a sub-agent reports before acting on it, a subagent/MCP usage discipline,
a tag to keep sensitive content out of cross-session memory, and the switch of `~/.claude` to a
git checkout rather than a manually synced copy — the change that made this public fork possible
in the first place.
