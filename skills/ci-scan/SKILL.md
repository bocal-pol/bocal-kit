---
name: ci-scan
type: specialized
priority: medium
scope: security
model: claude-sonnet-5
dependencies:
  - semgrep
conflicts: []
description: >
  CI/CD security scan configuration — GitHub Actions, GitLab CI,
  or a generic pipeline. Semgrep OSS as the primary scanner, Strix AI as a
  secondary option (self-hosted CLI or managed platform via strix cloud).
  Diff-scoped on PRs, SARIF emission, exit-code gating, fail-closed on
  exhausted budget. Invocable independently of security-agent.
---

# CI Scan — CI/CD pipeline integration (Semgrep + Strix)

Configures and integrates an automated SAST scan into a CI/CD pipeline.
**Primary scanner: Semgrep OSS** (`semgrep/semgrep:1.90.0` image).
Strix AI available as a secondary option if Semgrep doesn't cover the need.

Invoked directly via `/ci-scan` or from `security-agent`
if the target is a repo with an existing pipeline.

**Strict scope**: CI configuration only — no consolidated
report (delegated to `pentest`), no remediation (delegated to `appsec`).

## Primary option — Semgrep OSS (recommended)

Invoke the `semgrep` skill to generate the CI workflow files.
The `semgrep` skill handles local container detection and produces
ready-to-use GitHub Actions / GitLab CI snippets.

⚠️ If `semgrep` returns `SEMGREP_UNAVAILABLE`: flag it in the report
and offer Strix as a fallback (Options A / B below).

## Expected input

- `CI_PLATFORM`: github | gitlab | generic
- `DEPLOY_MODE`: managed | self-hosted
- `TARGET`: repo URL or path
- `SCAN_MODE`: quick (PR default) | standard | deep

## Option A — Managed platform (no Docker or LLM key on the runner)

Two paths, team's choice:

**A1 — GitHub/GitLab/Bitbucket app**: install the app from `app.strix.ai`
(or `strix cloud integrations install github`), enable PR reviews
(`strix cloud pr-reviews settings`). Strix comments on each PR and surfaces
findings in the team dashboard. No workflow to write.

**A2 — Cloud CLI from the pipeline** (uploaded source, execution on
Strix infrastructure) — always a `--dry-run --show-files` first to review
what's being sent, then approve the hash:

```bash
strix cloud login                    # once, locally; in CI: a service token
strix cloud scans start --source . --dry-run --show-files --json
strix cloud scans start --source . --approve-sha256 "$SOURCE_SHA256" --wait
strix cloud scans sarif <scan-id> --output strix.sarif
```

⚠️ `--dry-run --show-files` is mandatory before any upload: the CLI
excludes sensitive files by default (`.env`, keys) — verify the list.
CI token: `strix cloud tokens create --type service --scopes scans:write uploads:write`
stored in the secrets manager, never in the workflow.

## Option B — Self-hosted CLI (GitHub Actions)

Create `.github/workflows/strix-security.yml`:

```yaml
name: Strix Security Scan
on:
  pull_request:
    branches: [main, develop]

jobs:
  strix:
    runs-on: ubuntu-latest   # Docker required on the runner
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for diff resolution (merge-base)

      - name: Install Strix
        run: curl -sSL https://strix.ai/install | bash

      - name: Run Strix scan
        env:
          STRIX_LLM: ${{ secrets.STRIX_LLM }}        # e.g. openrouter/z-ai/glm-5.3
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
        run: |
          strix -n -t ./ \
            --scan-mode SCAN_MODE \
            --scope-mode diff --diff-base origin/main \
            --max-budget 10
        # exit 2 = vulnerabilities → the job fails, the PR is blocked

      - name: Fail closed if the scan stopped on budget
        if: always()
        run: |
          run_json=$(ls -t strix_runs/*/run.json | head -1)
          status=$(jq -r .status "$run_json")
          if [ "$status" != "completed" ]; then
            echo "Strix run status: $status (budget or error) — incomplete scan"
            exit 1
          fi

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: strix_runs   # directory: the run's SARIF is discovered there
```

⚠️ `fetch-depth: 0` is mandatory — without it the diff is silently
   truncated and coverage reduced with no warning. In headless CI,
   `--scope-mode auto` (default) already enables diff-scope; making it
   explicit with `--scope-mode diff --diff-base` removes any ambiguity.

⚠️ **Fail closed**: a scan stopped on budget returns exit code `0`
   (false negative). The `run.json` step above turns that case into a failure.
   Size `--max-budget` so the scan completes (quick: ~10 USD).

## Option B — Self-hosted CLI (GitLab CI)

Add to `.gitlab-ci.yml`:

```yaml
strix-security:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  variables:
    GIT_DEPTH: 0            # equivalent of fetch-depth: 0
  script:
    - curl -sSL https://strix.ai/install | bash
    - strix -n -t ./ --scan-mode quick --scope-mode diff --diff-base origin/main --max-budget 10
    - test "$(jq -r .status "$(ls -t strix_runs/*/run.json | head -1)")" = "completed"
  artifacts:
    when: always
    paths:
      - strix_runs/          # Markdown report, JSON/CSV, SARIF 2.1.0
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

`STRIX_LLM` and `LLM_API_KEY` are protected, masked CI/CD variables
(Settings › CI/CD › Variables), never written in the file.

## Exit codes and gating

| Code | Meaning | CI behavior |
|------|--------------|-----------------|
| `0`  | No vulnerabilities (or scan stopped — hence the `run.json` check) | Build passes |
| `1`  | Fatal error (config, install, forced incomplete scan) | Build fails (to fix) |
| `2`  | Validated vulnerabilities detected | Build blocked — review mandatory |

## Output

- Workflow file created in the target repo
- Confirmation of secret variables to configure (`STRIX_LLM`, `LLM_API_KEY`
  or a `strix cloud` token) — never write them into the workflow
