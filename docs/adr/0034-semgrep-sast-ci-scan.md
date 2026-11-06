# ADR 0034 — Semgrep SAST + CI-Scan: security gates on PRs

- **Status**: accepted
- **Date**: 2026-08-21

## Context

Security vulnerabilities were detected late (manual review, external audit) or not at all. PRs were merged with no automated scan. The `security-agent` skill needed a reproducible SAST tool.

## Decision

Integrate Semgrep SAST via Docker Compose + CI-Scan for PR automation:

### Mandatory rulesets

- `p/owasp-top-ten` — injection, XSS, auth, etc.
- `p/secrets` — hardcoded API keys, passwords
- `p/php` — Laravel patterns
- `p/typescript` — React/Angular patterns

### Workflow

- **Security agent Phase 6b**: local Semgrep via Docker Compose
- **`ci-scan` skill**: configures automated scans on the repo's PRs (Strix fallback if Semgrep is unavailable)
- P0/P1 findings: block progress / the merge
- P2/P3: listed, non-blocking

## Positive consequences

- Vulnerabilities caught before merge, not after deployment
- Standardized rulesets = comparable results across projects
- No dependency on manual review for common patterns

## Negative consequences / risks

- Docker required for local Semgrep
- Possible false positives — requires per-project ruleset calibration

## Alternatives considered

- **Manual scan only**: not reproducible, forgotten in practice. Rejected.
- **ESLint/PHPStan alone**: code quality, not security. Complementary, insufficient alone.

## Scope

Security — all code projects (backend, frontend, mobile).

## Amendment 2026-09-11 — aligning the Strix fallback with upstream (v1.6.x)

- Fixed environment variables: `STRIX_LLM` (the model, e.g. `openrouter/z-ai/glm-5.3`) + `LLM_API_KEY` replace `OPENAI_API_KEY`, which the CLI doesn't read.
- Fixed SARIF path: the run writes to `strix_runs/<run>/`, with no `latest` alias; the upload step points at the directory.
- **Closed failure mode**: a step reads `strix_runs/*/run.json` and fails if `status != completed` (a scan stopped on budget otherwise exits `0`).
- Explicit diff scope: `--scope-mode diff --diff-base origin/main`.
- Enriched with the managed `strix cloud` CLI option (login, `integrations install github`, `pr-reviews`, `scans start --source . --dry-run --show-files` then `--approve-sha256`, `scans sarif`).
- Not adopted: Strix's MCP support (applies to pentest runs, not CI) and the upstream `application-security-testing` / target-specific skills (covered by `pentest` and `appsec`).

## Amendment 2026-09-25 — standalone `strix` skill for local agentic pentesting

Strix (`usestrix/strix`, Apache 2.0, ~65k stars — a legitimate, actively maintained project)
only had a CI-fallback role in `ci-scan` until now. Gap identified: unlike Semgrep (its own
`semgrep` skill for local use), Strix was only invocable locally via scattered mentions in
`security-agent`, with no dedicated skill or guardrail discipline.

- **New skill `skills/strix/SKILL.md`**: local/interactive use (one-off audit,
  `security-agent` Phase 6b bis) — distinct from `ci-scan`, which stays the CI/PR path.
- Flags confirmed against upstream documentation: `--scan-mode`
  (`quick`|`standard`|`deep`, default `deep`), `--scope-mode` (`auto`|`diff`|`full`, default
  `auto`), `--max-budget` (cumulative USD, no limit by default), `--max-turns` (default 500).
- **Documented security gap**: Strix offers **no dry-run for a local scan**
  (`--dry-run --show-files --approve-sha256` only exists for the cloud path, which previews
  the upload). A local scan starts agentic execution as soon as it's invoked, with no
  application-level confirmation — only a documentation warning exists upstream. The `strix`
  skill compensates with an explicit guardrail step (authorization confirmation, verifying the
  target isn't production without an approved window, a mandatory `MAX_BUDGET`/`MAX_TURNS`
  ceiling before any real call).
- Invocation from `security-agent` made **optional** (an `AskUserQuestion` prompt), not
  systematic like Semgrep: Strix is slower (default mode takes 1-4h) and billed in LLM usage.
