---
name: codex-explore
description: "Read-only exploration of a large repository by Codex (OpenAI): answers a question (where is X, who calls Y, how does Z work) and returns a short summary with file:line references, to keep the context of Claude light. Claude verifies the cited references before relying on them. If Codex is unavailable, Claude explores itself. Invoke on: ask codex where is, codex explore this repository, find with codex who calls, map this code without loading my context."
model: claude-sonnet-5-5
type: utility
priority: low
scope: cross
dependencies:
  - codex-bridge
conflicts: []
---

# Codex Explore — Read a Lot, Bring Back Little

Some questions need many files. Codex reads them instead of Claude and brings back only a summary.
The context of Claude stays light. Claude does not spend tokens on the reads.

## Optional input (if invoked from another skill or agent)

Receive: the **question** and, if useful, the **folder** to explore. Do not ask these questions again.
Consent stays mandatory. Return the verified summary without writing a file.

## When not to use it

For one known file or a search for one pattern, use `Grep`/`Read` directly. It is faster and free.
This skill makes sense only for a question that forces a scan of a lot of code.

## Procedure

1. **Preflight**: `bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh check`, and the code table
   of the `codex-bridge` skill (complete Login block for 10, 11, 21). **On fallback**: explore yourself
   with `Grep`/`Glob`/`Read` (or the `Explore` agent if the search is very wide) and say so in one line.
2. **Consent** (`AskUserQuestion`): "Codex (OpenAI) will read the folder <folder>, read-only. Send?"
   If no: fall back.
3. **Prompt** (`.claude/tmp/codex-explore-<date>.md`): the question; the folder; the exclusion of
   `node_modules/`, `vendor/`, `*.test.*`; the bans of the `codex-bridge` skill; and the format: an
   answer of **ten lines at most**, each claim followed by `file:line`, then "what I could not
   establish".
4. **Run**: `codex-bridge.sh exec --mode read --cwd <folder> --prompt-file <prompt> --out .claude/tmp/codex-explore-<date>.out.md --confirmed`.
5. **Verify before relying on it**: open **at least the two most structuring references**. Confirm that
   the quote exists at the place given. If one reference is false, discard it and say so. If several
   are false, redo the exploration yourself.
6. **Report**: give the summary. Mark what is **verified** and what is not.

⚠️ Fallback: if `codex-bridge` is unavailable, explore with `Grep`/`Glob`/`Read`.
