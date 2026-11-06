---
name: claude-code-audit
type: utility
priority: medium
scope: cross
model: claude-sonnet-5
dependencies: []
conflicts: []
description: >
  Audits a machine's or project's Claude Code configuration (settings.json, hooks, permissions,
  CLAUDE.md, .mcp.json) against official Anthropic practices (code.claude.com/docs). Produces a
  gap table with a recommendation per line — never applies a change without explicit validation.
---

# Claude Code Audit — Compliance with official practices

Compares the active Claude Code configuration (`~/.claude/settings.json`, the project's
`.claude/settings.json`, hooks, `.mcp.json`, `CLAUDE.md`) against the practices documented by
Anthropic (`code.claude.com/docs` — the older `docs.claude.com` and `docs.anthropic.com` domains
now redirect here), and produces a gap table.

**Strict scope**: reading + recommendation, never automatic application.
Any proposed fix goes through explicit confirmation (`AskUserQuestion`), the same as any
`settings.json` change (the `update-config` skill, to which this skill delegates the
application if the user confirms).

## Expected input

- `SCOPE`: `user` (`~/.claude/settings.json` + `~/.claude/CLAUDE.md`) | `project`
  (the current project's `.claude/settings.json` + root `CLAUDE.md`) | `both` (default)

## Workflow

### Phase 1 — Collection

Read, depending on `SCOPE`:
- `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/.mcp.json` (user scope)
- `.claude/settings.json`, `.claude/settings.local.json` (if present), `CLAUDE.md`,
  the current project's `.mcp.json` (project scope)
- the project's `.gitignore`, to check that `settings.local.json`/`CLAUDE.local.md` are excluded

If an expected file is absent, note it as "not configured" rather than an error —
all these files are optional.

### Phase 2 — Official reference (a fixed checklist, not to be reinvented per request)

**Settings file precedence** (highest wins, except list-type keys which merge):
1. Managed (`managed-settings.json` / MDM / enterprise console)
2. `--settings` CLI
3. `.claude/settings.local.json` (personal, automatically excluded from global git excludes)
4. `.claude/settings.json` (team, committed)
5. `~/.claude/settings.json` (personal, all sessions)

List-type keys (`permissions.allow`, `permissions.deny`, hooks) **merge**
across files; `fallbackModel`, `modelPicker`, `availableModels`, `modelSettings` don't
merge — the highest-priority value overrides the others.

**`settings.json` keys covered by this audit** (non-exhaustive list — the complete official
schema lives at `code.claude.com/docs/en/settings-reference`, JSON Schema published at
`https://json.schemastore.org/claude-code-settings.json`):

| Key | Check |
|---|---|
| `permissions.allow` / `.deny` / `.defaultMode` | Evaluation order **deny → ask → allow**, first match wins regardless of specificity — flag any broad `allow` that a more specific `deny` can't pierce |
| `permissions.defaultMode` | Valid values: `default`(`manual`), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. `bypassPermissions` outside an isolated container/VM = High finding |
| `hooks` | A hook with exit code `2` blocks hard (can't be bypassed via JSON output); check that declared `Bash`/`PowerShell`/`Skill` hooks actually exist on disk |
| `includeCoAuthoredBy` | **Deprecated key** — replaced by `attribution`. If present, recommend migrating without breaking current behavior (check the `attribution` equivalent before removing the old key) |
| `env` | Spot any plaintext secret (patterns `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, `AUTH`) — consistent with `CLAUDE.md`'s Secrets rule |
| `$schema` | Presence recommended for editor autocompletion (can lag one version behind the latest CLI — don't rely on it alone) |
| `apiKeyHelper` | If present, check that the referenced script exists and contains no hardcoded key |
| `sandbox` | Bash isolation (macOS/Linux/WSL2) — flag its absence if the machine runs these OSes and sensitive Bash commands are allowed without a sandbox |
| `cleanupPeriodDays` | Absence = default retention, mention without forcing a value |
| `plansDirectory`, `extraKnownMarketplaces`, `enabledPlugins` | Consistency with actual observed usage (declared vs. used plugins) |

**MCP (`.mcp.json`)**:
- Check that no credential is hardcoded in an `http`/`sse` server's URL/headers —
  it must go through `${VAR}` (Claude Code already neutralizes variables named TOKEN/SECRET/KEY/
  AUTH/ANTHROPIC_*/AWS_BEARER_TOKEN_BEDROCK in remote headers, but a misconfigured server can
  work around this by putting them elsewhere)
- A **project**-scoped `.mcp.json` server must request trust approval for the folder
  in interactive mode — flag if the project is used with `-p` (bypasses approval)
  without a prior review of the `.mcp.json` content
- Reminder of the principle: *verify you trust each server before connecting it*
  — a server that fetches external content exposes to prompt injection

**CLAUDE.md** (load order: managed → `~/.claude/CLAUDE.md` → `./CLAUDE.md`/
`./.claude/CLAUDE.md` → `./CLAUDE.local.md`):
- Official recommendation: stay under ~200 lines, use `@path` imports (max 4 levels of
  recursion), verifiable instructions rather than vague ones
- `CLAUDE.local.md` must be in the project's `.gitignore` (no automatic exclusion
  unlike `settings.local.json`) — check this explicitly
- `AGENTS.md` interop support (read directly if no `CLAUDE.md` exists, Claude Code
  ≥ v2.1.277) and `.claude/rules/*.md` with a `paths:` frontmatter for scoped rules —
  flag if the project would benefit from splitting a long `CLAUDE.md` into `rules/`

**Structural reminder**: permissions are enforced by the Claude Code client, not by
the model — an instruction in `CLAUDE.md` ("never do X") is **not** a security
barrier, only `permissions.deny` + a blocking hook (exit 2) is.
Any critical security rule of the audited project that relies only on a prose
instruction is a finding.

### Phase 3 — Comparison and gap table

```
**CLAUDE CODE AUDIT — YYYY-MM-DD**
Scope: user | project | both

| # | File | Item | Observed state | Official recommendation | Gap | Severity |
|---|---|---|---|---|---|---|
| 1 | ~/.claude/settings.json | includeCoAuthoredBy | present (false) | migrate to `attribution` | minor — deprecated but functional key | Low |
| 2 | .claude/settings.local.json | absent from project | — | if created, check gitignore | — | — |
...

**Overall verdict**: compliant / minor gaps / gaps to fix before broader use
```

Severity: **High** = real security risk (bypassPermissions outside a sandbox, plaintext secret,
a permission designed to be bypassable); **Medium** = functional gap with no immediate risk;
**Low** = deprecated key, style, missing optional file.

### Phase 4 — Proposed fix (never applied directly)

For each High/Medium gap, present the proposed fix via `AskUserQuestion`
and, if validated, delegate the application to the `update-config` skill (which knows how to
edit `settings.json` correctly) rather than editing directly from this skill.

## Output

- Report at `reports/claude-code-audit/YYYY-MM-DD_claude-code-audit.md` if invoked
  standalone on a project; direct display if `user` scope only (no project
  repo to write into)
- No file modification without explicit validation (Phase 4)

## Reliability notes

This reference (Phase 2) was established by reading `code.claude.com/docs` on 2026-09-25 —
some fine details (exact `statusLine`/`outputStyle` schema, exhaustive list of hook
events) haven't been verified field by field. If the audit covers a key absent from
Phase 2, don't guess its semantics: state "verify at code.claude.com/docs/en/
settings-reference" rather than inventing a recommendation.
