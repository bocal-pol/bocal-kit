# ADR 0074 — SkillSpector: security scan for third-party skills/agents/MCP

- **Status**: accepted
- **Date**: 2026-11-10

## Context

`semgrep` and `strix` cover application code (OWASP Top 10, real exploitation)
but not the surface specific to Claude Code skills, agents, and MCP servers: a
SKILL.md or a third-party MCP manifest can contain malicious natural-language
instructions (hidden prompt injection, anti-refusal instructions, triggers that
shadow an existing command, MCP tool poisoning) without any code pattern ever
appearing. No tool in this repo covered that surface before importing a
third-party skill/MCP.

## Decision

Integrate **SkillSpector** (`NVIDIA/skillspector`, Apache 2.0 — working fork
`bocal-pol/SkillSpector`) as a skill wrapper, following the same model as
`semgrep` and `strix`:

- **New skill `skills/skillspector/SKILL.md`**: CLI wrapper (no vendoring of
  the Python source — the actual tool stays external, installed via
  `uv tool install`), `--no-llm` mode by default (71 static patterns with no
  LLM cost), reads score/severity/recommendation, mandatory re-verification of
  Critical/High findings.
- **`security-agent`**: new Phase 6b ter, invoked when the audited scope
  includes skills/agents/MCP (alongside Semgrep 6b for classic code), findings
  feeding Phase 8 (appsec).
- **Auto-invocation**: mandatory before installing or copying any skill/agent/
  MCP from an external repo not already audited in the session — the tool's
  native use case. Scoped strictly to the skill/agent/MCP surface, never to
  application code under development (that stays `semgrep`/`strix`'s job).

## Positive consequences

- Covers an attack surface (natural-language skill/MCP instructions) that no
  classic code scanner detects.
- `--no-llm` by default: no recurring LLM cost for routine mechanical use.
- Consistent with the existing `semgrep`/`strix` model — no new discipline to
  learn.

## Negative consequences / risks

- Extra Python/uv dependency on the machine (outside the usual PHP/TS/Flutter
  stack of this repo).
- The `bocal-pol/SkillSpector` fork needs manual upkeep against the NVIDIA
  upstream (no automated sync documented here).

## Alternatives considered

- **Vendoring the full source** (hundreds of files, `src/`, `pyproject.toml`)
  into `skills/skillspector/`: would significantly bloat this repo and create
  drift against upstream for a tool that installs in one command. Rejected.
- **A plain reference README with no automation**: would not have allowed the
  mandatory auto-invocation before importing a third-party skill. Rejected.

## Scope

Security — cross-cutting, usable from any project and from `security-agent`.
