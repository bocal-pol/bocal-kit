#!/usr/bin/env bash
# Wrapper of the goodnight PreToolUse hook.
# Why a wrapper: "node ~/..." fails when the hook shell does not expand "~" (PowerShell tool on
# Windows). Claude Code then treats the error as NON-blocking and lets the call through: the guard
# would be open. Existing hooks go through "bash ~/...", which works; this wrapper follows the same
# path, then denies if Node cannot start.
H="${GOODNIGHT_HOME:-$HOME/.claude/goodnight}"
[ -f "$H/active.json" ] || exit 0 # inert outside an active night

D="$(cd "$(dirname "$0")" && pwd)"
NODE="${GOODNIGHT_NODE:-node}" # override reserved for tests
out="$("$NODE" "$D/guard.mjs")"
rc=$?
if [ "$rc" -ne 0 ]; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Quota guard (goodnight): the guard cannot start (Node missing or failing). Stopping as a precaution: write the handoff note, commit, then end your reply."}}'
  exit 0
fi
printf '%s' "$out"
exit 0
