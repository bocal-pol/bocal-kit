---
name: semgrep
type: utility
priority: high
scope: security
model: claude-sonnet-5
dependencies: []
conflicts: []
description: >
  Semgrep OSS wrapper via Docker Compose — local SAST scan, SARIF findings parsing,
  blocking gate on HIGH/CRITICAL. Invocable standalone or from security-agent,
  appsec, pr-review-agent, ci-scan.
---

# Semgrep — Local SAST via Docker Compose

Runs a Semgrep scan on the target source code via the project's Docker Compose
container, parses SARIF findings, filters by severity, and generates a
structured report.

## Prerequisites

The Semgrep container must be available via:
```bash
docker compose -f COMPOSE_FILE run --rm semgrep --version
```

The compose file's path is project-specific — detect it in Phase 1 rather than hardcoding one:
look for a `compose*.yaml` / `docker-compose*.yml` in the project's infra directory (commonly
`infra/`, `docker/`, or a sibling infra repo) that declares a `semgrep` service.

## Expected input

- `TARGET_PATH`: absolute or relative path of the folder to scan (mounted at `/src/` in the
  container)
- `RULESETS`: list of rulesets to enable (default: see below)
- `COMPOSE_FILE`: path to the compose file declaring the `semgrep` service (required if not
  auto-detected)
- `DIFF_ONLY`: true/false — scan only modified files (default: false)
- `FAIL_ON`: minimum blocking severity — `ERROR` (default) | `WARNING` | `never`

## Default rulesets

```
p/owasp-top-ten
p/secrets
p/php
p/typescript
```

Additional rulesets available:
- `p/laravel` — Laravel-specific patterns
- `p/javascript` — vanilla JavaScript
- `p/docker` — Dockerfiles and compose
- `p/ci` — CI/CD pipelines
- `p/sql-injection` — deep SQL injection checks

## Workflow

### Phase 1 — Environment validation

**Step 1a — Detect the compose file:**
```bash
# Search the project's infra directory for a compose file declaring the semgrep service
COMPOSE_FILE=$(grep -rl "semgrep:" --include="compose*.yaml" --include="docker-compose*.yml" . 2>/dev/null | head -1)
if [ -z "$COMPOSE_FILE" ]; then
    echo "⚠️ SEMGREP ABSENT — no compose file declaring a semgrep service was found."
    echo "Check that the infra repo/directory is present and the container is configured."
    exit 2
fi
```

**Step 1b — Check the container responds:**
```bash
docker compose -f $COMPOSE_FILE run --rm semgrep --version
```

If the command fails (exit ≠ 0):
```
⚠️ SEMGREP ABSENT — the Semgrep container isn't responding.
Possible causes:
  · Docker Desktop not running
  · Image semgrep/semgrep:1.90.0 not pulled (docker pull semgrep/semgrep:1.90.0)
  · "semgrep" service missing from the compose file
Action: check with `docker compose -f COMPOSE_FILE run --rm semgrep --version`
SAST scan canceled — report as "semgrep unavailable" in the report.
```

If invoked from `security-agent` or `appsec`: return the `SEMGREP_UNAVAILABLE` status to the
calling skill so it can document the absence in its own report.

### Phase 2 — Building the scan command

Standard command (full scan):
```bash
docker compose -f COMPOSE_FILE run --rm semgrep scan \
  --config p/owasp-top-ten \
  --config p/secrets \
  --config p/php \
  --config p/typescript \
  --metrics=off \
  --json \
  --output /tmp/semgrep-results.json \
  /src/TARGET_PATH
```

Diff-scoped command (PR review):
```bash
docker compose -f COMPOSE_FILE run --rm semgrep scan \
  --config p/owasp-top-ten \
  --config p/secrets \
  --config p/php \
  --config p/typescript \
  --metrics=off \
  --json \
  --output /tmp/semgrep-results.json \
  --include="MODIFIED_FILES" \
  /src/TARGET_PATH
```

Gating parameter (add to the command):
- `--error` → exit code 1 if ERROR-severity findings exist (default — blocking)
- `--severity ERROR` → only surface ERROR/CRITICAL findings
- Omit `--error` for report-only mode (always exit 0)

### Phase 3 — Parsing the results

Read the produced JSON file. Extract per finding:

| Field | JSON source |
|---|---|
| `check_id` | `.results[].check_id` |
| **Severity** | `.results[].extra.severity` (ERROR=CRITICAL, WARNING=HIGH, INFO=LOW) |
| **File:line** | `.results[].path` + `.results[].start.line` |
| **Message** | `.results[].extra.message` |
| **OWASP** | `.results[].extra.metadata.owasp` (if present) |
| **CWE** | `.results[].extra.metadata.cwe` (if present) |
| **Code excerpt** | `.results[].extra.lines` |

Semgrep severity → internal convention mapping:

| Semgrep | Convention | Gating |
|---|---|---|
| `ERROR` | Critical | Blocking |
| `WARNING` | High | Blocking |
| `INFO` | Low | Non-blocking |

### Phase 4 — Structured report

```
**SEMGREP SAST REPORT**
Date: YYYY-MM-DD
Target: TARGET_PATH
Rulesets: p/owasp-top-ten, p/secrets, p/php, p/typescript
Findings: X Critical (ERROR), X High (WARNING), X Low (INFO)
Gating status: BLOCKED / OK

**Critical and High findings** (descending severity order)

[CRITICAL] check_id
- File: path/file.ext:line
- OWASP: AXX:2021 (if available)
- CWE: CWE-XXX (if available)
- Message: rule message
- Code: vulnerable code excerpt
- Action: recommended remediation

**Low findings** (summary)
X INFO findings — see the full JSON for detail.

**Verdict**
✅ OK — no blocking finding detected.
❌ BLOCKED — X Critical/High findings to fix before merging.
```

### Phase 5 — Persistence

- If invoked from `security-agent` or `appsec`: don't write a file — pass the findings to the
  calling skill.
- If invoked standalone:
  1. `mkdir -p security/semgrep`
  2. Write `security/semgrep/YYYY-MM-DD_semgrep.md` (Phase 4 report)
  3. Keep the raw JSON in `security/semgrep/YYYY-MM-DD_semgrep-raw.json`

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Scan OK, no blocking finding |
| `1` | ERROR or WARNING findings detected (gating active) |
| `2` | Configuration error or container unavailable |

## Use cases

### Full project scan
```
/semgrep TARGET_PATH=/src/MyProject COMPOSE_FILE=/path/to/infra/compose.dev-tools.yaml
```

### Diff-scoped scan (PR review — called by pr-review-agent)
```
/semgrep TARGET_PATH=/src/MyProject DIFF_ONLY=true COMPOSE_FILE=...
```

### PHP-only scan
```
/semgrep RULESETS="p/php p/laravel p/owasp-top-ten" TARGET_PATH=...
```

## CI/CD integration (GitHub Actions)

```yaml
name: Semgrep SAST
on:
  pull_request:
    branches: [main, develop]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.90.0
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        run: |
          semgrep scan \
            --config p/owasp-top-ten \
            --config p/secrets \
            --config p/php \
            --config p/typescript \
            --metrics=off \
            --sarif \
            --output semgrep.sarif \
            --error \
            .

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
```

## CI/CD integration (GitLab CI)

```yaml
semgrep-sast:
  stage: test
  image: semgrep/semgrep:1.90.0
  script:
    - semgrep scan
        --config p/owasp-top-ten
        --config p/secrets
        --config p/php
        --config p/typescript
        --metrics=off
        --sarif
        --output semgrep.sarif
        --error
        .
  artifacts:
    reports:
      sast: semgrep.sarif
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## Notes

- `--metrics=off`: disables Semgrep telemetry (mandatory in an internal environment).
- The Docker container mounts the source code at `/src/` — adjust the volume in the compose file if
  needed.
- Docker image used: `semgrep/semgrep:1.90.0`.
- In diff-scoped mode, provide the list of modified files via `--include` to reduce noise.
