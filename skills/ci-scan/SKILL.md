---
name: ci-scan
type: specialized
priority: medium
scope: security
model: claude-sonnet-5-5
dependencies:
  - semgrep
  - gitleaks
conflicts: []
description: >
  CI/CD security scan configuration — GitHub Actions, GitLab CI,
  or a generic pipeline. Covers five complementary families: SAST (Semgrep OSS,
  Strix AI as a secondary option), secrets (Gitleaks), image/package vulnerabilities
  (Grype), outdated dependencies (Dependabot — a native GitHub config file, not
  a job), DAST (OWASP ZAP baseline against a deployed URL). Diff-scoped on PRs,
  SARIF emission, exit-code gating, fail-closed on exhausted budget. Invocable
  independently of security-agent.
---

# CI Scan — CI/CD pipeline integration (SAST + secrets + vulnerabilities + DAST)

Configures and integrates automated CI/CD pipeline security scans, by family:

| Family | Tool | What it sees | What it misses |
|---|---|---|---|
| SAST | Semgrep OSS (primary), Strix AI (secondary) | vulnerable code patterns | secrets, known CVEs, runtime drift |
| Secrets | Gitleaks | keys/tokens/passwords in code and history | secrets already rotated but still in history (needs rotation, not just deletion) |
| Known vulnerabilities (packages/OS) | Grype | CVEs in Docker images and system packages — partial overlap but complementary to `composer audit`/`npm audit` (those don't see an image's OS packages) | application code logic |
| Outdated dependencies | Dependabot | versions behind, automatic update PRs | doesn't scan code, doesn't detect real exploitability |
| DAST | OWASP ZAP (baseline) | behavior of a real deployed application (headers, exposed endpoints) | source code, only runs against a reachable URL |

Invoked directly via `/ci-scan` or from `security-agent`
if the target is a repo with an existing pipeline.

**Strict scope**: CI configuration only — no consolidated
report (delegated to `pentest`), no remediation (delegated to `appsec`).

## Guiding principle: this skill acts, it does not document for the user to act

Every YAML block shown below is content to actually write with `Write` into the
target repo (`.github/workflows/<name>.yml`, or `.gitlab-ci.yml`), never a sample
displayed while waiting for the user to copy it. After writing:
1. Validate the syntax (`python3 -c "import yaml; yaml.safe_load(open('<file>'))"`
   or an equivalent `yamllint`/`actionlint` if available) — invalid YAML written
   to CI silently breaks the pipeline on the next push.
2. If a concrete prerequisite is missing for the job to actually run (image/digest
   to resolve, empty image matrix, undefined target URL, missing GitHub secret):
   write it anyway with the missing prerequisite made explicit in the file itself
   (comment + `if: false` that blocks execution until lifted), never silently —
   a workflow that looks active but never runs is worse than no workflow at all.
   Lifting the `if: false` is part of the task as soon as the prerequisite is met.
3. Never leave it to the `semgrep`/`gitleaks` skills to "display" their CI
   snippets — `ci-scan` invokes them to learn their exact command, then writes
   the file itself.

## Primary option — Semgrep OSS (recommended)

Invoke the `semgrep` skill to generate the CI workflow files.
The `semgrep` skill handles local container detection and produces
ready-to-use GitHub Actions / GitLab CI snippets.

⚠️ If `semgrep` returns `SEMGREP_UNAVAILABLE`: flag it in the report
and offer Strix as a fallback (Options A / B below).

## Secrets — Gitleaks (recommended, systematic)

Invoke the `gitleaks` skill for the local Docker wrapper (pre-commit/pre-push
hooks). For CI, add this job independently of the others (does not depend on
Semgrep):

```yaml
name: Gitleaks Secret Scan
on:
  push:
  pull_request:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history required for detect

      - name: Run Gitleaks
        run: |
          docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect \
            --source /repo --no-git=false \
            --report-format sarif --report-path /repo/gitleaks.sarif \
            --redact

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: gitleaks.sarif
```

⚠️ Always blocking (`FAIL_ON=any` on the `gitleaks` skill side) — never
report-only in CI: a secret that reaches the remote is already a leak, gating
must act before that.

## Image/package vulnerabilities — Grype

Scans known CVEs in built Docker images and system packages — complements
`composer audit`/`npm audit` (which only see application PHP/JS dependencies,
not the base image's OS packages).

```yaml
name: Grype Image Scan
on:
  push:
    paths:
      - '**/Dockerfile'
      - '**/compose*.y*ml'
  pull_request:
    paths:
      - '**/Dockerfile'
      - '**/compose*.y*ml'

jobs:
  grype:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        image: [IMAGE_1, IMAGE_2]   # one entry per built application image
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t scan-target:${{ matrix.image }} -f ${{ matrix.image }}/Dockerfile ${{ matrix.image }}

      - name: Scan with Grype
        uses: anchore/scan-action@v6
        with:
          image: scan-target:${{ matrix.image }}
          fail-build: true
          severity-cutoff: high
          output-format: sarif

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

If local usage is requested: actually write `scripts/scan-images.sh` into the
target repo with `Write` (detecting images that are actually built via
`docker images --format` rather than hardcoding names), make it executable
(`chmod +x`), then run it once to confirm it works before considering it
delivered.

## Outdated dependencies — Dependabot

Unlike the other four, Dependabot doesn't run a job: it's a native GitHub
config file (`.github/dependabot.yml`) that automatically opens update PRs
on a chosen schedule.

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "npm"
    directory: "/ECOSYSTEM_PATH_1"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "composer"
    directory: "/ECOSYSTEM_PATH_2"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

⚠️ **Limit on monorepos with private submodules**: a `directory:` entry that
points into a submodule only scans what Dependabot sees from the parent repo
— if it has no read access of its own to the submodule's content (a separate
private repo), the entry silently has no effect. Each submodule that has its
own GitHub repo needs its **own** `dependabot.yml`, at its own root — the
parent repo's file only actually covers ecosystems present directly in its
own tree (not through a submodule pointer). Flag this limit explicitly
rather than implying coverage that doesn't exist.

## DAST — OWASP ZAP (baseline, against a deployed target)

ZAP tests real HTTP behavior, not files — it needs an already-reachable URL
(staging, never production without explicit agreement). Separate job, not
blocking on a code PR — triggered manually or on a schedule.

```yaml
name: ZAP Baseline Scan
on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * 1'   # weekly, Sunday-to-Monday night

jobs:
  zap-baseline:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'STAGING_URL'
          fail_action: false   # non-blocking — report only, never gate on ZAP baseline
          allow_issue_writing: true
```

⚠️ Prior authorization is mandatory, as for any dynamic test (cf. Phase 1 of
`security-agent`) — ZAP sends active requests against the target. Never point
it at a production URL without explicit confirmation, and never without the
authorization already collected for the audit in progress.

## Expected input

- `CI_PLATFORM`: github | gitlab | generic
- `DEPLOY_MODE`: managed | self-hosted
- `TARGET`: repo URL or path
- `SCAN_MODE`: quick (PR default) | standard | deep
- `TOOLS`: subset of the five families above to enable (default: all except
  ZAP, which stays explicit opt-in since it requires a deployed target)

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
