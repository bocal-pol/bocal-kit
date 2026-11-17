---
name: repomix-mcp
description: "Pack a third-party repo or a large monorepo into one file (XML/MD/JSON, Tree-sitter compression) for fast review before analysis. Auto-invoke on mention of: repomix, pack a repo, bundle a repository, ingest a third-party repo, analyze a large monorepo, consolidated repo context."
model: claude-sonnet-5
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Repomix — Repo Packing for LLM Analysis

Condenses an entire repository (local or remote) into one file. Use it to study an external
architecture quickly (`vitruve-agent`) or to audit a monorepo too large for file-by-file reading
(`cerbere-agent`).

## When to use it

- Study a third-party repo's architecture before you extract a transposable pattern.
- Audit a monorepo whose size exceeds what a targeted `Glob`/`Grep` can reasonably cover.
- Give a sub-agent a compact repo context instead of letting it read an unfamiliar repo file by
  file.

## When not to use it

- The current working repo — targeted `Glob`/`Grep`/`Read` stay more precise and cheaper in
  tokens for a repo you already explore.
- Any code change task — repomix is a read/consolidate tool, never a write tool.

## Method

### Via CLI (default)

```bash
# Local repo
npx repomix --style xml -o <output-path>/repo.xml <repo-path>

# Remote repo (clone + pack in one call)
npx repomix --remote https://github.com/<org>/<repo> --style xml -o <output-path>/repo.xml
```

- Default to `--style xml` (best structure for model re-reading); use `md`/`json` only when the
  next step requires it explicitly.
- Always write the output under `.claude/tmp/` or the session scratchpad — never at the root of
  the current repo (see "Temporary file hygiene").
- For a large remote repo, add `--compress` (Tree-sitter compression: signatures only) when only
  the overall architecture matters, not function bodies.

### Via MCP server (if configured)

If an `mcp__repomix__*` server is declared for the session, prefer its tools
(`pack_remote_repository`, `grep_repomix_output`) over the CLI call — this avoids a disk
round-trip for a one-off read. Follow the MCP consent rule (see "MCP consent" in CLAUDE.md) before
first use.

### Reading the result

Read the packed file with `Read` (never the whole file at once on a large repo — use
`offset`/`limit`, or `Grep` directly on the packed file to target a section).

## ⚠️ Fallback — if `repomix` is not installed and no MCP server is available

State explicitly: `⚠️ repomix unavailable — falling back to file-by-file analysis via Glob/Grep/Read, slower on a large repo.`
Return to standard exploration (WebFetch the README, then targeted Glob/Grep on key files) rather
than blocking the task.

## Cleanup

The packed file is a temporary artifact: delete it at the end of the task if it was written under
`.claude/tmp/` of a versioned project (see "Temporary file hygiene"). The session scratchpad needs
no manual cleanup.
