#!/usr/bin/env bash
# Wrapper of the integrity guard — "node ~/..." is not expanded by cmd.exe nor by the PowerShell
# tool; "bash ~/..." is. Usage: bash ~/.claude/skills/fix-until-green/scripts/integrity.sh check --base <ref>
D="$(cd "$(dirname "$0")" && pwd)"
exec node "$D/integrity.mjs" "$@"
