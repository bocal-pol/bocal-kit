---
name: skill-gap-analyzer
description: "Analyze past coding sessions (transcripts from all projects over a period) to find missing skills and existing skills to change, then publish a ranked report with drafts to Notion. Use when the user says 'analyze my sessions', 'which skills am I missing', 'what do I redo every time', 'improve my skills from my usage', 'audit my Claude usage', or wants to know what to automate. Unlike friction-retro (one session, feeds a log), this skill compares many sessions and projects. It never creates or edits a skill itself."
model: claude-sonnet-5-5
user-invocable: true
argument-hint: "[days — default 14] [--project substring]"
type: utility
priority: low
scope: cross
dependencies:
  - notion
conflicts: []
---

# skill-gap-analyzer — Which skills am I missing?

Read several weeks of transcripts. Find what the user asks again and again (a missing skill) and what the current skills do badly (a skill to change). The deliverable is a Notion report with evidence and drafts. **The skill writes nothing in `skills/`.** The user chooses what to create afterwards.

## Optional input

Argument: a number of days (default 14) and `--project <substring>` to limit the scan to one folder of `~/.claude/projects/`. Without an argument, scan all projects.

## Why a script

Transcripts weigh megabytes. Reading them into the context costs a lot and hides the patterns. `scripts/extract.mjs` counts in a deterministic way and masks secrets. The model only interprets the result.

## Procedure

1. **Extract.** Run `node ~/.claude/skills/skill-gap-analyzer/scripts/extract.mjs --days <N>` (add `--project` if requested). The JSON output has `repeated_prompts`, `corrections`, `tool_sequences` and `skill_usage`. If `sessions` is 0, say so and stop.
2. **List what exists.** Read `~/.claude/skills/SKILLS_INDEX.md`. Before you propose a new skill, check that no existing skill covers the need. If one does, the proposal becomes a *change* (often a description too timid to trigger).
3. **Interpret** the three signals:
   - **Repeated prompt** on 2 or more projects, or 3 or more times: probable new skill. A prompt repeated in one project only belongs in that project's `CLAUDE.md`, not in a skill.
   - **Correction** after a skill ran (compare with `skill_usage`): change that skill. Otherwise: a rule to add or to make precise.
   - **Tool sequence** repeated 5 or more times: skill with a bundled script, only if the sequence has a readable intent. Ignore generic noise (Read, Grep, Edit).
4. **Discard false signals**: a request repeated because the work was really different, or a test prompt. When in doubt, file it under "To confirm" and do not propose it.
5. **Write the report** (structure below), ranked by impact = frequency × number of projects.
6. **Publish to Notion** (next sections).

## Report structure

```
# Session analysis — <date>, <N> days, <S> sessions, <M> messages

## Summary (3 lines max)
## Skills to create
### <kebab-name> — impact: high|medium|low
- Evidence: <n> occurrences on <p> projects — excerpt: "…" (≤ 200 chars, masked)
- Why a skill: <1 sentence>
- Draft: full frontmatter + body outline (follow the conventions in CLAUDE.md)
## Skills to change
### <existing skill>
- Friction seen: excerpt + date
- Proposed change: diff or text to add
## To confirm
## Rarely used skills (merge or description candidates)
```

Skill drafts follow the repository conventions: full model ID `claude-sonnet-5-5`, no `tools:` key, `type/priority/scope/dependencies/conflicts` metadata, paths under `~/.claude/`.

## Publishing to Notion

Notion is a component that needs consent. The `notion` server is already accepted (see `.claude/mcp-choices.json`).

1. Create the page with `notion-create-pages` as a **private draft** (`creation_mode: "draft"`), titled "Session analysis — YYYY-MM-DD". Do not pick a parent page unless the user asked for one.
2. Give the user the link and offer to move the page.
3. **⚠️ Fallback**: if the `mcp__claude_ai_Notion__*` or `mcp__notion__*` tools are missing or not authenticated, write the report to `.claude/tmp/skill-gap-<date>.md` (git-ignored), say that Notion is not connected, and point to `/mcp` to authenticate. Never fail in silence.

## Privacy

- Excerpts are limited to about 200 characters. The script masks secrets, emails and user paths, and removes `<private>` blocks. Read the report before you publish it: pattern masking is not perfect.
- The report holds excerpts of real work. It stays in Notion or local files and never goes into the public mirrors.

## Next step

For each proposal the user accepts, ask the user to run `/create-skill` (new skill) or `/improve-skills` (change). Do not chain them yourself.
