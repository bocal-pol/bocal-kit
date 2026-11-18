#!/usr/bin/env bash
# Wrapper of the target guard — "node ~/..." is not expanded by cmd.exe nor by the PowerShell tool;
# "bash ~/..." is. Usage: bash ~/.claude/skills/adversarial-tester/scripts/target-guard.sh check <url>
D="$(cd "$(dirname "$0")" && pwd)"
exec node "$D/target-guard.mjs" "$@"
