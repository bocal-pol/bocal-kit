#!/usr/bin/env bash
# pre-tool-use.sh — PreToolUse hook
#
# Three guardrails:
#   1. No Claude/Anthropic co-authorship in a commit message.
#   2. No direct push to a protected branch (main, master, develop),
#      nor a force-push.
#   3. No bypassing of git hooks (--no-verify, -n on commit, or a
#      hijacked core.hooksPath).
#
# Claude Code contract: the hook's context arrives as JSON on STDIN
# (fields `tool_name` and `tool_input.command`). No `CLAUDE_TOOL_NAME`
# environment variable is provided.
# Exit codes: 0 = no objection · 2 = BLOCKED, stderr is returned to Claude.
set -uo pipefail

INPUT=$(cat)

# settings.json's matcher already restricts this to shell tools; stay defensive.
TOOL=$(printf '%s' "$INPUT" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
case "$TOOL" in
  Bash|PowerShell|"") ;;
  *) exit 0 ;;
esac

# ─── Isolate the actual command ───────────────────────────────────────────────
# `tool_input.command` is a JSON field — extracted so we only grep the
# command itself, never the raw JSON. Without this, a commit message that
# merely TALKS ABOUT a dangerous flag (`git commit -m "docs: explain why
# --no-verify is forbidden"`) gets blocked by the hook itself.
COMMAND=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p')

# Then strip out everything between quotes (single or double): that's where
# commit messages live, and they must never be mistaken for flags of the
# command itself. Imperfect on a complex nested shell, but enough for the
# two patterns grepped below — not reimplementing a full shell parser here.
SCAN=$(printf '%s' "$COMMAND" | sed -E 's/"[^"]*"//g; s/'"'"'[^'"'"']*'"'"'//g')

# ─── 1. Co-authorship forbidden ───────────────────────────────────────────────
# Rule from CLAUDE.md: single author and contributor on every commit.
# This check deliberately stays on $INPUT (not $SCAN): the co-authorship
# to detect lives precisely INSIDE the quoted commit message.
if printf '%s' "$INPUT" | grep -qiE 'co-authored-by[^"]*(claude|anthropic)|generated with \[claude'; then
  echo "Commit refused: it contains a Claude or Anthropic co-authorship line." >&2
  echo "Cause: the repo convention requires a single author." >&2
  echo "Fix: remove the Co-authored-by line and any generation mention." >&2
  exit 2
fi

# ─── 2. Protected branches and force-push ─────────────────────────────────────
# The separator allows a space and `:` (for `HEAD:main`) but not `/`, so a
# branch named `feature/main-...` doesn't get blocked.
#
# Exemption: GIT_ALLOW_PROTECTED_PUSH=1, for history-maintenance operations
# explicitly approved by the user. That's the path to take rather than
# neutralizing this file.
PROTECTED='git[[:space:]]+push([^"]*)[[:space:]:](origin[[:space:]]+)?(-f[[:space:]]+|--force[[:space:]]+)?(main|master|develop)([[:space:]:"\\]|$)'
FORCE='git[[:space:]]+push([^"]*)(--force([[:space:]]|$)|--force-with-lease|[[:space:]]-f([[:space:]]|$))'

if [ "${GIT_ALLOW_PROTECTED_PUSH:-}" != "1" ]; then
  if printf '%s' "$SCAN" | grep -Eq "$PROTECTED"; then
    echo "Direct push to a protected branch (main, master, develop) refused." >&2
    echo "Cause: the repo convention reserves these branches for integration." >&2
    echo "Fix: create a feature/*, bugfix/*, or hotfix/* branch, then open a Pull Request." >&2
    echo "Deliberate maintenance: re-run the command with GIT_ALLOW_PROTECTED_PUSH=1." >&2
    exit 2
  fi

  if printf '%s' "$SCAN" | grep -Eq "$FORCE"; then
    echo "Force-push refused." >&2
    echo "Cause: a force-push rewrites shared history and can erase a coworker's work." >&2
    echo "Fix: if the rewrite is deliberate, re-run with GIT_ALLOW_PROTECTED_PUSH=1." >&2
    exit 2
  fi
fi

# ─── 3. Bypassing git hooks ────────────────────────────────────────────────────
# `--no-verify` (commit/push), a standalone `-n` on `git commit` (short alias
# for the same flag), and a hijacked `core.hooksPath=` via `-c` or
# `GIT_CONFIG_*`: three ways to silently disable pre-commit/commit-msg/pre-push.
# Exemption: GIT_ALLOW_PROTECTED_PUSH=1 (same lever as the guardrails above —
# deliberate, explicit maintenance remains possible).
NO_VERIFY='git[[:space:]]+(commit|push|merge|cherry-pick|rebase|am)([^"]*)(--no-verify|[[:space:]]-n([[:space:]]|$))'
HOOKS_PATH_OVERRIDE='core\.hookspath[[:space:]]*='

if [ "${GIT_ALLOW_PROTECTED_PUSH:-}" != "1" ]; then
  if printf '%s' "$SCAN" | grep -Eq "$NO_VERIFY"; then
    echo "Command refused: bypassing git hooks (--no-verify / -n)." >&2
    echo "Cause: this flag silently disables pre-commit, commit-msg, or pre-push." >&2
    echo "Fix: address the cause of the hook failure rather than bypassing it." >&2
    echo "Deliberate maintenance: re-run the command with GIT_ALLOW_PROTECTED_PUSH=1." >&2
    exit 2
  fi

  if printf '%s' "$SCAN" | grep -qiE "$HOOKS_PATH_OVERRIDE"; then
    echo "Command refused: hijacking core.hooksPath." >&2
    echo "Cause: redirects git to a different hooks folder, bypassing the repo's own." >&2
    echo "Fix: don't modify core.hooksPath from an automated session." >&2
    echo "Deliberate maintenance: re-run the command with GIT_ALLOW_PROTECTED_PUSH=1." >&2
    exit 2
  fi
fi

exit 0
