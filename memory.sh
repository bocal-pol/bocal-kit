#!/usr/bin/env bash
# memory.sh — project-state summary + cross-session memory
# Run at session start via the SessionStart hook (settings.json).
set -uo pipefail

echo "=== Project state: $(basename "$(pwd)") ==="

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null)
  echo "Branch        : ${branch:-(detached HEAD)}"

  echo ""
  echo "Recent commits:"
  git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  (none)"

  echo ""
  echo "Modified files:"
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git status --short | sed 's/^/  /'
  else
    echo "  (clean working tree)"
  fi
else
  echo "(directory outside a git repo)"
fi

# ─── Cross-session memory ──────────────────────────────────────────────────────
# Deliberately absent here: the harness already loads
# ~/.claude/projects/<slug>/memory/MEMORY.md as auto-memory on every session.
# Displaying it here would duplicate it in context.

# ─── Skill-observation review cadence ──────────────────────────────────────────
REVIEW_DATE_FILE="$HOME/.claude/memory/skill-observations/last-review-date.txt"
if [ -f "$REVIEW_DATE_FILE" ]; then
  LAST_REVIEW=$(cat "$REVIEW_DATE_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$LAST_REVIEW" ]; then
    LAST_TS=$(date -d "$LAST_REVIEW" +%s 2>/dev/null)
    TODAY_TS=$(date +%s 2>/dev/null)
    if [ -n "$LAST_TS" ] && [ -n "$TODAY_TS" ]; then
      DAYS=$(( (TODAY_TS - LAST_TS) / 86400 ))
      if [ "$DAYS" -ge 7 ]; then
        echo ""
        echo "=== Skill Observations ==="
        echo "  Review pending for ${DAYS} days. Run: /improve-skills"
        PENDING=$(grep -c "^- Status: pending" "$HOME/.claude/memory/skill-observations/log.md" 2>/dev/null || echo 0)
        if [ "$PENDING" -gt 0 ]; then
          echo "  Pending entries: ${PENDING}"
        fi
      fi
    fi
  fi
fi
