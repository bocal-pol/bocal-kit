---
name: gitleaks
type: utility
priority: high
scope: security
model: claude-sonnet-5-5
dependencies: []
conflicts: []
description: >
  Gitleaks wrapper via Docker (zricethezav/gitleaks) — secret detection (keys, tokens,
  passwords) in the working tree, staged files, or the full git history.
  Invocable standalone, from security-agent, or as a pre-commit/pre-push guard
  in a target project. Complements a project's own token-name-based secret grep
  with generic rule-based detection (AWS, GitHub, Stripe, JWT, private keys...).
---

# Gitleaks — Secret detection via Docker

Runs a Gitleaks scan (image `zricethezav/gitleaks:latest`) against a target repo,
parses the JSON findings, filters by rule, and produces a structured report.
Goal: guarantee that no secret (password, API key, private key, token) leaves the
machine toward GitHub — neither in the working tree, nor in an already-made commit,
nor in the history.

## Prerequisites

Docker Desktop running. No local binary install required — everything goes through
`docker run`.

## Expected input

- `TARGET_PATH`: absolute path of the repo or folder to scan (mounted at `/repo`)
- `SCAN_MODE`: `staged` (staged files only, pre-commit) | `protect` (uncommitted
  diff, working tree) | `detect` (full git history) | `nogit` (folder with no git
  context — raw file scan)
- `CONFIG_PATH`: path to a custom `.gitleaks.toml` (optional — project allowlist)
- `FAIL_ON`: `any` (default, blocking on 1 finding) | `never` (report-only)
- `INSTALL_HOOKS`: `true`/`false` (default `false`) — if `true`, actually install
  the local git hooks (Phase 0b) in addition to the requested scan, without
  waiting for a separate invocation

## Guiding principle: this skill acts, it does not document for the user to act

Every section below that shows a command or a file (hook, compose service, CI
workflow) is an action to execute directly with the available tools (Bash,
Write, Edit) on the target project — never a snippet to display for the user to
copy by hand. "Installing a hook" means: checking whether it already exists,
writing or completing it with `Write`/`Edit`, making it executable (`chmod +x`),
then validating it by actually triggering it once (e.g. `git commit --dry-run`
or a real scan as in Phase 0). A hook described in this document but absent from
the target project's disk is an unfinished task, not a deliverable.

## Workflow

### Phase 0 — Docker environment check/install

```bash
docker info >/dev/null 2>&1 || echo "DOCKER_NOT_RUNNING"
```

If Docker doesn't respond: stop and report it (this specific point isn't
automatable without access to the user's machine — Docker Desktop must be
started by them).

If Docker responds, check that the image is present locally and **pull** it if
not (never settle for reporting its absence):
```bash
docker image inspect zricethezav/gitleaks:v8.21.2 >/dev/null 2>&1 \
  || docker pull zricethezav/gitleaks:v8.21.2
```
If a `compose.dev-tools.yaml` (or local equivalent) already exists in the
target project with a `semgrep` service or similar (cf. "Integration" section
below): add the `gitleaks` service to that file with `Edit` rather than
resorting to a bare `docker run` — follow the existing pattern (pinned digest,
`cap_drop: [ALL]`, `:ro` mount). Resolve the real digest before writing the
`image:` line:
```bash
docker buildx imagetools inspect zricethezav/gitleaks:v8.21.2 --format "{{json .Manifest}}"
```
Then validate with a real run (`docker compose ... run --rm gitleaks version`
or the equivalent `docker run`) — a pulled image that has never been executed
is not a verified installation.

If Docker responds but the pull fails (registry unreachable, image not found):
```
⚠️ GITLEAKS UNAVAILABLE — the image could not be retrieved.
Scan cancelled — report as "gitleaks unavailable" in the report.
```
If invoked from `security-agent`: return `GITLEAKS_UNAVAILABLE` to the calling
skill.

### Phase 0b — Git hook installation (if `INSTALL_HOOKS=true`, or if the target
project has no secret guard at commit time yet)

Before writing anything, detect what already exists in the target project:
```bash
ls .husky/pre-commit .git/hooks/pre-commit 2>/dev/null
```
- If a husky hook already exists (`.husky/pre-commit`): **edit** it with `Edit`
  to insert the gitleaks call (block from the "Local git hook integration"
  section below), after any custom script already present — never overwrite
  an existing hook.
- If a native `.git/hooks/pre-commit` exists (without Husky): same logic,
  `Edit` to add the block without removing existing content.
- If no hook exists: `Write` the `.git/hooks/pre-commit` file with the content
  from the section below, then `chmod +x` it.
Do the same for `pre-push` (corresponding section) if the project wants it —
ask the user only if they haven't already decided (e.g. via `cadrage`), never
by default for an operation that changes the behavior of every future commit.

Once written, **validate with a real test** rather than assuming the hook
works: commit a test file containing an obvious fake secret in a throwaway
directory, verify the commit is indeed blocked, then cleanly undo (`git
reset`, delete the test file) — never leave a test file or test commit in the
project's real history.

### Phase 2 — Building the command based on SCAN_MODE

All commands mount `TARGET_PATH` read-only at `/repo` and write the JSON report
to a separate volume to avoid polluting the scanned repo.

**`detect` — full git history (the most expensive, most complete):**
```bash
docker run --rm -v "TARGET_PATH:/repo" zricethezav/gitleaks:latest detect \
  --source /repo --no-git=false \
  --report-format json --report-path /repo/.gitleaks-report.json \
  --redact
```

**`protect` — uncommitted working tree (pre-push, pre-commit without `--staged`):**
```bash
docker run --rm -v "TARGET_PATH:/repo" zricethezav/gitleaks:latest protect \
  --source /repo \
  --report-format json --report-path /repo/.gitleaks-report.json \
  --redact
```

**`staged` — index files only (pre-commit hook, fast):**
```bash
docker run --rm -v "TARGET_PATH:/repo" zricethezav/gitleaks:latest protect \
  --source /repo --staged \
  --report-format json --report-path /repo/.gitleaks-report.json \
  --redact
```

**`nogit` — folder with no git history to use (archive, export):**
```bash
docker run --rm -v "TARGET_PATH:/repo" zricethezav/gitleaks:latest detect \
  --source /repo --no-git \
  --report-format json --report-path /repo/.gitleaks-report.json \
  --redact
```

If `CONFIG_PATH` is provided, add `--config /repo/<relative path of .gitleaks.toml>`.

`--redact` masks the secret's value in the report (keeps the context, not the
raw value) — always on by default; only remove it at the user's explicit
request for a precise local investigation.

### Phase 3 — Parsing the results

Read `.gitleaks-report.json` (array of findings, empty `[]` if no hit — exit
code 0). Per finding:

| Field | JSON source |
|---|---|
| Rule | `.RuleID` |
| File:line | `.File` + `.StartLine` |
| Commit (if `detect`) | `.Commit` |
| Author/date (if `detect`) | `.Author` / `.Date` |
| Secret (redacted) | `.Secret` |
| Context | `.Match` |

### Phase 4 — Structured report

```
**GITLEAKS REPORT**
Date: YYYY-MM-DD
Target: TARGET_PATH
Mode: SCAN_MODE
Findings: X

**Findings** (one per detected secret)
[RULE] file:line
- Commit: <sha> (if detect) — Author: <name> — Date: <date>
- Context: <redacted match>
- Action: revoke/rotate the real secret, remove the literal value, reference
  a secrets manager (Vault/SOPS/Docker secrets).

**Verdict**
✅ OK — no secret detected.
❌ BLOCKED — X secret(s) detected, not mergeable/pushable until fixed.
```

⚠️ A secret already present in a past commit (`detect` mode) is **not fixed**
by removing it in a new commit — it stays readable in the history. Explicitly
flag that full remediation requires either a history rewrite (freeze the
remote first, verify `--branches --tags` never `--all`), or — simpler and
always recommended first — **rotating the exposed secret**, which makes the
value readable in the history without exploitation value.

### Phase 5 — Persistence

- If invoked from `security-agent`: don't write a file, pass the findings to
  the calling skill for its audit's secrets phase.
- If invoked standalone:
  1. `mkdir -p security/gitleaks`
  2. Write `security/gitleaks/YYYY-MM-DD_gitleaks.md` (Phase 4 report)
  3. Keep the raw JSON in `security/gitleaks/YYYY-MM-DD_gitleaks-raw.json`
  4. Delete `.gitleaks-report.json` from the scanned repo once copied (a
     temporary file, must never be committed — add it to `.gitignore` if
     absent)

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No secret detected |
| `1` | At least one secret detected (gating active by default) |
| `126` | Configuration error or container unavailable |

## Local git hook integration (pre-commit)

Reference content for Phase 0b — to actually write into the target project
(`Write`/`Edit` on `.git/hooks/pre-commit` or `.husky/pre-commit`), not to
display while waiting for the user to do it themselves.

```sh
#!/usr/bin/env sh
# Blocks any commit introducing a secret detectable by Gitleaks.
docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest protect \
  --source /repo --staged --redact \
  --report-format json --report-path /repo/.gitleaks-report.json
STATUS=$?
rm -f .gitleaks-report.json
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "❌ Gitleaks detected a secret in the staged files — commit blocked."
  echo "   Remove the literal value, reference a secrets manager."
  echo ""
  exit 1
fi
exit 0
```

Chain this after any existing custom script in the same `pre-commit` hook —
the two are complementary: a custom script blocks known tokens by name,
Gitleaks detects by generic pattern (entropy, provider signatures).

## Local git hook integration (pre-push)

Safety net if a commit was made with `--no-verify`: scan everything that will
actually be pushed to the remote, not just the last commit. Same principle as
above: actually write `.git/hooks/pre-push` (or `.husky/pre-push`) in Phase 0b,
never a block left for the user to handle.

```sh
#!/usr/bin/env sh
# Scans the commits about to be pushed (not the whole history — fast).
remote="$1"
docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest protect \
  --source /repo --redact \
  --report-format json --report-path /repo/.gitleaks-report.json
STATUS=$?
rm -f .gitleaks-report.json
if [ $STATUS -ne 0 ]; then
  echo "❌ Gitleaks detected a secret — push to '$remote' blocked."
  exit 1
fi
exit 0
```

## CI/CD integration

This skill does not itself carry CI/CD configuration — that's the role of the
`ci-scan` skill, which orchestrates Gitleaks alongside Semgrep/Grype/ZAP/
Dependabot for a given pipeline. Invoke `ci-scan` to generate the workflow;
this skill stays the local wrapper (git hooks, on-demand scan, invocation from
`security-agent`).

## Use cases

### Full history scan before a public share (mirror)
```
/gitleaks TARGET_PATH=/path/to/repo SCAN_MODE=detect
```
A directly relevant standalone use before syncing to a public mirror — this
scan complements, without replacing, the manual confidentiality filtering
already required: names, emails, personal paths, secrets.

### Quick pre-commit scan
```
/gitleaks TARGET_PATH=/path/to/repo SCAN_MODE=staged
```

## Notes

- Docker image used: `zricethezav/gitleaks:latest` — pin an exact version
  (e.g. `zricethezav/gitleaks:8.21.2`) if strict reproducibility is required.
- `--redact` is the safe default in any report meant to be read by several
  people or persisted — the raw value should only ever appear in a local
  terminal, never in a committed file or a shared report.
- A recurring false positive (e.g. an example key in docs) is handled via an
  allowlist in a project `.gitleaks.toml` (`CONFIG_PATH`), never by disabling
  the rule globally.
