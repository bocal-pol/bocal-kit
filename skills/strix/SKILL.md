---
name: strix
type: utility
priority: medium
scope: security
model: claude-sonnet-5
dependencies: []
conflicts: []
description: >
  Local agentic pentest via the Strix CLI (usestrix/strix, Apache 2.0, ~65k stars —
  autonomous agents that actually exploit flaws and produce PoCs, unlike Semgrep which
  stays static analysis). Invocable standalone or from security-agent, complementing
  semgrep (Phase 6b) and manual dynamic tests (Phase 6). Requires Docker (daemon
  running) and an LLM key.
---

# Strix — Local agentic pentest

Runs a Strix scan (autonomous pentest agents, real PoCs) on a local target, a repository, or a
deployed URL, and produces a structured report.

**What Strix brings that `semgrep` doesn't**: Semgrep (the `semgrep` skill) does fast,
deterministic pattern-matching static analysis, but proves nothing — a false positive remains
possible. Strix goes further: its agents actually try to exploit candidate vulnerabilities and only
surface those validated by a proof of concept. The two are complementary, not interchangeable —
Strix is slower and more expensive (LLM billing), reserved for audits where proof of exploitation
matters (`security-agent`, a `--gdpr` run with sensitive scope), not every PR.

Invoked directly via `/strix`, or from `security-agent` (Phase 6b bis, after Semgrep).

## Prerequisites

1. **Docker**: an active Docker daemon is mandatory (Strix pulls and runs its sandbox image on
   first launch). Check: `docker info` (silent if OK).
2. **CLI installed**: `curl -sSL https://strix.ai/install | bash` (or `pipx install strix-agent` if
   available on the machine). Check: `strix --version`.
   ⚠️ No official native-Windows note in the upstream documentation (docs.strix.ai) — the
   documented installation assumes Linux/macOS/WSL2. On a Windows machine with no WSL2, attempt the
   install then immediately fall back if it fails.
3. **LLM key**: `STRIX_LLM` (e.g. `anthropic/claude-sonnet-5`, `openrouter/z-ai/glm-5.3`, or any
   LiteLLM-style provider) + `LLM_API_KEY` as environment variables — never as a command argument
   or written to a file in the repo (the Secrets rule from `CLAUDE.md`). An additional provider is
   possible: `LLM_API_BASE` for a local endpoint (Ollama, LM Studio).

**⚠️ Global fallback**: if Docker is absent, the CLI can't be installed, or no LLM key is provided
→ `STRIX_UNAVAILABLE`. If invoked from `security-agent`: note "Strix unavailable — Semgrep scan +
manual review only" in the report and continue without blocking.

## Expected input

- `TARGET`: a local path, a Git repository URL, a deployed application URL, or an API spec file
  (OpenAPI/Swagger, Postman export)
- `SCAN_MODE`: `quick` (minutes, obvious checks — PR/smoke test) | `standard` (30 min–1h, static
  triage then dynamic validation of priority candidates) | `deep` (**Strix default**, 1–4h, wide
  triage + systematic exploitation of flaw chains)
- `SCOPE_MODE`: `auto` (default — automatic diff-scope if CI/headless is detected) | `diff`
  (modified files only, via `--diff-base`) | `full` (the entire scope)
- `MAX_BUDGET`: LLM spending cap in USD, cumulative over the whole scan (no limit if omitted —
  **always set it explicitly** outside one-off exploration)
- `MAX_TURNS`: agent iteration cap (Strix default: 500)
- `INSTRUCTION`: optional targeting directive (e.g. "only test authentication endpoints")

## ⚠️ Mandatory safeguard before any scan — no native local dry-run

Strix only offers a preview (`--dry-run --show-files --approve-sha256`) for the **cloud** path
(upload to Strix's managed infra) — **no dry-run exists for a local/agentic scan**
(`strix --target ...` run directly). The upstream project's authorization warning is documentary,
not an application confirmation prompt: the CLI starts the agentic scan as soon as it's invoked,
with no built-in confirmation.

As a result, this step **replaces** the missing dry-run, before any real invocation:

1. Confirm via `AskUserQuestion` (or reuse the confirmation already obtained by `security-agent`
   Phase 1 / `security-audit` Phase 1): written authorization to test this target, especially if
   `TARGET` is a deployed URL rather than a local path.
2. If `TARGET` is a deployed URL (not a local path or a repository): explicitly verify it is **not**
   production without a validated maintenance window — Strix agents perform real actions (forms,
   injections, bulk requests), not passive reading.
3. Set `MAX_BUDGET` and `MAX_TURNS` before the first call — an unbounded `deep` scan can run 1 to
   4 hours and consume an unbounded LLM budget.

## Workflow

### Phase 1 — Environment validation

```bash
docker info >/dev/null 2>&1 || echo "STRIX_UNAVAILABLE: docker absent or daemon stopped"
strix --version || echo "STRIX_UNAVAILABLE: CLI not installed"
```

If `STRIX_LLM` or `LLM_API_KEY` are missing from the environment: ask via `AskUserQuestion` which
one to use (propose providers already configured in the project — `openrouter/z-ai/glm-5.3`, used
by `ci-scan`, is a known fallback choice) rather than failing silently.

### Phase 2 — Safeguard (see section above) then command construction

```bash
strix -n \
  --target "TARGET" \
  --scan-mode SCAN_MODE \
  --scope-mode SCOPE_MODE \
  --max-budget MAX_BUDGET \
  --max-turns MAX_TURNS \
  ${INSTRUCTION:+--instruction "$INSTRUCTION"}
```

`-n`/`--non-interactive`: headless mode, streaming output of findings + final report on stdout,
non-zero exit code if validated vulnerabilities exist. Without `-n`, Strix opens a local web
dashboard (useful for exploratory use, to avoid in `team-dev` orchestration).

### Phase 3 — Parsing the results

Read `strix_runs/<run>/run.json` — check `status == "completed"` (a run stopped on exhausted
budget/turns returns an incomplete status; treat it as a partial scan, not as "no
vulnerability").

Findings are available in Markdown, JSON/CSV, and SARIF 2.1.0 under `strix_runs/<run>/`.

### Phase 4 — Re-verification (mandatory before any Critical/High finding)

Strix produces PoCs, which reduces the false-positive risk compared to Semgrep — but the repo's
cross-cutting rule applies without exception: every Critical/High finding is re-verified by a
direct command before being reported or triggering an action (see the "Verifying agent findings"
section of `CLAUDE.md`). A PoC generated by an LLM agent still needs manual confirmation, not to be
taken at face value.

### Phase 5 — Structured report

```
**STRIX REPORT — AGENTIC PENTEST**
Date: YYYY-MM-DD
Target: TARGET
Mode: SCAN_MODE / SCOPE_MODE
Run status: completed | incomplete (budget/turns exhausted)
Findings: X Critical, X High, X Medium, X Low (with PoC)

**Validated findings (confirmed PoC)** — descending severity order
[Severity] Title
- Target: path/endpoint
- PoC: description of the reproduced exploitation
- Direct re-verification: ✅ confirmed | ⚠️ not re-verified (to do before action)
- Recommendation: ...

**Verdict**
✅ OK — no blocking finding validated.
❌ BLOCKED — X Critical/High findings to fix before merge/deployment.
```

### Phase 6 — Persistence

- If invoked from `security-agent`: don't write a file — pass the findings (already re-verified in
  Phase 4) to the calling skill for consolidation into its report and into `BACKLOG.md` (SEC
  section — priority 0).
- If invoked standalone: `mkdir -p security/strix`, write
  `security/strix/YYYY-MM-DD_strix.md` (Phase 5 report) and keep
  `security/strix/YYYY-MM-DD_strix-raw.json`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No validated vulnerability (or an incomplete run — always check `run.json`) |
| `1` | Fatal error (config, install, unreachable target) |
| `2` | Validated vulnerabilities detected |

## Difference from CI usage (`ci-scan`)

This skill covers **local, interactive** usage (one-off audits, `security-agent`). For PR
automation (GitHub Actions/GitLab CI, exit-code gating, SARIF upload), use the `ci-scan` skill,
which already documents both paths: the managed platform (`strix cloud`, with its own
`--dry-run --show-files --approve-sha256`) and the self-hosted CLI in a pipeline. Both skills share
the same CLI but distinct workflows — don't duplicate the CI configuration here.

## Use cases

### Quick local audit (before commit/PR)
```
/strix TARGET=. SCAN_MODE=quick SCOPE_MODE=diff MAX_BUDGET=5
```

### Deep audit on a deployed target (authorization confirmed)
```
/strix TARGET=https://staging.myproject.tld SCAN_MODE=deep MAX_BUDGET=25 MAX_TURNS=500
```

### From security-agent (Phase 6b bis)
Invoked after `semgrep`, with the scope already identified in Phase 2 and authorization already
confirmed in Phase 1 — don't ask for the authorization confirmation again, only the Docker/LLM key
safeguard.
