---
name: skillspector
type: utility
priority: high
scope: security
model: claude-sonnet-5
dependencies: []
conflicts: []
description: >
  Security scanner for third-party skills/agents/MCP (NVIDIA/skillspector, Apache
  2.0, fork bocal-pol/SkillSpector) — 71 vulnerability patterns across 17 categories
  (prompt injection, exfiltration, code execution, supply chain, MCP tool poisoning...),
  0-100 risk score, SAFE/CAUTION/DO_NOT_INSTALL recommendation. Inspects skills/
  agents/MCP, never application code under development. Invocable standalone before
  importing any external skill/agent/MCP, to audit skills already present in
  `~/.claude/skills/`, or from security-agent alongside semgrep/strix. Requires
  Python 3.12+ (uv recommended); `--no-llm` mode works without an API key.
---

# SkillSpector — Security scanner for skills, agents and MCP

Runs a SkillSpector scan (71 static patterns + optional LLM semantic analysis) on
a skill, an agent, or an MCP server, and produces a structured report (score,
severity, recommendation, findings).

**What SkillSpector inspects, and what it doesn't**: its scope is the
skill/agent/MCP itself — a `SKILL.md`, an `agents/*.md`, an MCP manifest or
server — never application code under active development (a Laravel controller,
a React component, a business script). For the latter, the `semgrep`/`strix`
skills remain the right tools. SkillSpector detects patterns specific to the
skill/agent/MCP surface: hidden prompt injection in a SKILL.md, anti-refusal
instructions, persistent memory poisoning, abusive triggers that shadow an
existing command, MCP tool poisoning (a description that doesn't match the
code's actual behavior). A third-party skill or MCP server can pass Semgrep
cleanly while still being malicious through its instruction text alone — that's
exactly what SkillSpector covers.

Invoked directly via `/skillspector` (including to audit a skill already present
in `skills/` or `~/.claude/skills/`), from `security-agent` alongside
Semgrep/Strix (skill/agent/MCP scope, not code), or automatically before
installing any external skill/MCP (see Auto-invocation).

## Prerequisites

**Per-machine local install**: the CLI tool (`skillspector`) is not vendored into this
repo (ADR 0074 decision) — it must be installed once on every machine that uses it. The
skill itself is available to any agent as soon as this repo is synced, but the binary
stays absent until this step is done.

1. **Python 3.12+** with `uv` (recommended) or `pip`. Check: `python3 --version`.
2. **CLI install** (once per machine):
   ```bash
   uv tool install git+https://github.com/bocal-pol/SkillSpector.git
   # Update: uv tool update skillspector
   ```
   Default fork: `bocal-pol/SkillSpector` (working clone of `NVIDIA/skillspector`,
   Apache 2.0). Switch to the NVIDIA upstream if the fork drifts too far or
   becomes unmaintained — flag the choice to the user rather than deciding alone.
3. **LLM analysis (optional)**: `SKILLSPECTOR_PROVIDER=anthropic` +
   `ANTHROPIC_API_KEY` for semantic analysis (TP4 patterns, description-behavior
   mismatch). Without a key: `--no-llm` remains fully functional on the 71 static
   patterns (AST, taint tracking, YARA, regex) — the recommended default here so
   a routine mechanical scan doesn't spend any LLM budget.

**⚠️ Global fallback**: if `skillspector` isn't installed and the user doesn't
want to install it immediately → `SKILLSPECTOR_UNAVAILABLE`. Document "Skill-
Spector scan not run — manual skill/MCP review only" in the report and never
silently block a task on its absence.

### Known issue — missing `uv` and no precompiled YARA wheel

On a Windows machine without `uv`, `pip install git+...` fails if the default Python
version is too recent to have a precompiled `yara-python` wheel (e.g. Python 3.14 as of
2026-11: no wheel published, building from source requires Visual Studio Build Tools,
absent by default). Verified workaround:

1. List available interpreters: `py -0` (Windows) — look for one version below (e.g.
   3.13) that has a published wheel: `pip index versions yara-python`.
2. Install with that exact interpreter: `py -3.13 -m pip install --user
   "git+https://github.com/bocal-pol/SkillSpector.git"`.
3. The binary installs under `%APPDATA%\Python\Python3XX\Scripts\skillspector.exe`
   (Windows) rather than the standard PATH — call it by its full path, or add it to the
   machine's PATH once validated.

### Known issue — file output (`--output`) unavailable on Windows

`--output FILE` systematically fails on Windows ("Safe file output is unsupported on
this platform" — the tool's POSIX no-follow constraint). Redirect stdout instead:

```bash
skillspector scan TARGET --no-llm --format json > report.json
```

**Parsing trap**: in `--recursive` mode, the tool writes log lines ("Multi-skill
directory detected", "Scanning X/N"...) to the same stream as the JSON when stdout and
stderr are combined (`2>&1` or `tee`). Redirect stderr separately (`2> log.txt`), or
locate the file's first `{` line before parsing (`grep -n '^{$' report.json`) and
truncate everything before it.

### Known issue — `--max-skills` above the default (32) can fail

Observed on this repo (197 skills): any `--max-skills` value above the default (32) can
fail with "discovery was incomplete... scan this input without --max-skills", regardless
of execution context (direct terminal, background, redirection). No usage-side fix
found — verified workaround: scan in batches of 32 skills max (copy skills in groups of
32 into temporary folders, scan each separately without `--max-skills`, consolidate the
reports). Before repeating this workaround, check whether a newer tool release fixes it.

## Expected input

- `TARGET`: local path (folder or `SKILL.md` file), Git repo URL, `.zip` URL, or
  (batch/audit mode) a parent folder containing several skills — e.g. `skills/`
  of the current repo with `--recursive` to audit all skills already present
  (see Phase 6 — Auditing the existing skills folder)
- `USE_LLM`: `false` (default here) | `true` — enables semantic analysis if a
  provider key is configured
- `FORMAT`: `terminal` (default, direct reading) | `json` (integration/report) |
  `markdown` (consolidated report) | `sarif` (CI/CD)
- `BASELINE`: optional path to a `.skillspector-baseline.yaml` file to suppress
  already-triaged findings (never use it to hide an un-reviewed Critical/High
  finding — see the "Re-verifying agent findings" rule in `CLAUDE.md`)

## Workflow

### Phase 1 — Environment check

```bash
skillspector --help >/dev/null 2>&1 || echo "SKILLSPECTOR_UNAVAILABLE"
```

If `SKILLSPECTOR_UNAVAILABLE`: offer installation (`uv tool install
git+https://github.com/bocal-pol/SkillSpector.git`) with explicit confirmation
(shell write — respect the active security mode). If declined or impossible:
apply the global fallback and continue.

### Phase 2 — Scan

```bash
skillspector scan "$TARGET" --no-llm --format json --output "$OUTPUT_PATH"
```

Add `--format terminal` (without `--output`) for direct reading in the current
session instead of a file. Only switch `--no-llm` off (enabling LLM analysis)
when the user explicitly asked for it, or when a first static scan surfaces
ambiguous High/Critical findings that a semantic re-read can resolve — never by
default, to respect token-usage discipline.

### Phase 3 — Reading the verdict

Read `risk_assessment.score` (0-100), `.severity` and `.recommendation`:

| Recommendation | Action |
| --- | --- |
| `SAFE` (score ≤ 20) | Integration possible without further reservation |
| `CAUTION` (21-50) | List findings to the user before integrating — decision is theirs |
| `DO_NOT_INSTALL` (> 50) | Do not integrate without explicit manual review; alert immediately |

### Phase 4 — Re-verifying Critical/High findings

Per the **"Re-verifying agent findings"** rule: every `CRITICAL`/`HIGH` finding
reported by SkillSpector must be re-verified by directly reading the file and
the offending line (`issues[].location`) before being reported as confirmed or
blocking an integration. An un-verified finding is reported as "unconfirmed" in
the summary.

### Phase 5 — Report

Summarize: scanned target, score, severity, recommendation, finding count by
severity, confirmed Critical/High findings (Phase 4) with their location, and
the decision taken (integrated / rejected / integrated with the user's explicit
reservation).

### Phase 6 — Auditing the existing skills folder

To audit every skill already present (e.g. this repo's `skills/`, or
`~/.claude/skills/`) rather than a single skill being imported, try the direct
command first:

```bash
skillspector scan ./skills/ --recursive --max-skills 250 --no-llm --format json > report.json
```

If this fails ("scan this input without --max-skills" — see the known issue above),
apply the batch-of-32 workaround: split the skill list into groups of 32
(`ls skills/ | sort`, then `sed -n` by range), copy each group into a temporary
folder, scan each one without `--max-skills` (the default 32 then works), then
consolidate the individual JSON reports into an overview.

Read the aggregate report (or each batch report): it lists a score per scanned
skill and flags any coverage omission (see upstream README § Recursive
Collection Scanning). For every skill reported as `CAUTION`/`DO_NOT_INSTALL`,
apply Phase 4 (re-verification) before proposing a fix to the user — never fix
an existing skill without explicit validation, since some findings reflect a
skill's legitimate content (e.g. a pentest skill that mentions
`subprocess`/`exec` by the nature of its topic).

## Auto-invocation

**Mandatory** before installing or copying any skill, agent, or MCP server from
an external repo not already audited in this session — this is the tool's
native use case. Applies only to the skill/agent/MCP surface (SKILL.md,
`agents/*.md`, MCP manifest/server): never to application code under active
development (backend, frontend, mobile), which remains `semgrep`/`strix`'s job.

⚠️ **Fallback**: if the tool is unavailable when a third-party skill/agent/MCP
needs to be imported, note "SkillSpector not run — manual skill/MCP review
only" in the report rather than silently skipping the control.

## Integration with security-agent

Invocable in Phase 6b (alongside `semgrep`) when the audited scope includes
skills, agents, or MCP servers — `semgrep`/`strix` stay on classic application
code, `skillspector` takes over on natural-language instructions (SKILL.md,
agents/*.md) and MCP manifests.
⚠️ Fallback if `SKILLSPECTOR_UNAVAILABLE`: note "SkillSpector unavailable —
Semgrep scan + manual skill/MCP review only" in the report.
