#!/usr/bin/env bash
# Wrapper of the Codex bridge CLI — "node ~/..." is not expanded by cmd.exe nor by the PowerShell
# tool; "bash ~/..." is. Usage: bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh check
D="$(cd "$(dirname "$0")" && pwd)"
exec node "$D/codex-bridge.mjs" "$@"
