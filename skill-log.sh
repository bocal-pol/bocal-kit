#!/usr/bin/env bash
# skill-log.sh — PreToolUse hook (matcher: Skill)
#
# Deterministic log of skill invocations into ~/.claude/logs/skill-selection.log.
# Replaces the old declarative [SKILL-SELECT] mechanism, which relied on model
# discipline and never actually wrote a line.
#
# Claude Code contract: JSON context on STDIN, fields tool_name and
# tool_input.skill / tool_input.args. Never blocks (exit 0), writes nothing to
# stderr.
set -uo pipefail

INPUT=$(cat)

SKILL=$(printf '%s' "$INPUT" | sed -n 's/.*"skill"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[ -z "$SKILL" ] && exit 0

ARGS=$(printf '%s' "$INPUT" | sed -n 's/.*"args"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1 | cut -c1-120)
PROJECT=$(basename "$(pwd)")
LOG="$HOME/.claude/logs/skill-selection.log"

mkdir -p "$(dirname "$LOG")" 2>/dev/null
printf '%s\tskill: %s\tproject: %s\targs: %s\n' \
  "$(date '+%Y-%m-%d %H:%M:%S')" "$SKILL" "$PROJECT" "$ARGS" >> "$LOG" 2>/dev/null

exit 0
