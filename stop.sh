#!/usr/bin/env bash
# stop.sh — SessionStop hook
# Memory-consolidation and context-hygiene reminder.
set -uo pipefail

echo ""
echo "=== Claude Code session end ==="
echo ""

# Uncommitted files.
STATUS=$(git status --short 2>/dev/null)
if [ -n "$STATUS" ]; then
  echo "Uncommitted files:"
  printf '%s\n' "$STATUS" | sed 's/^/  /'
  echo ""
fi

echo "Hygiene reminders:"
echo "  • If the session ran > 30 min or touched > 10 files → /compact before closing"
echo "  • If you learned something new about the project → /memory-ritual"
echo "  • If you're switching topics → /clear instead of continuing this thread"
echo ""

# ─── Environment-improvement report (friction-retro observations) ────────────
# Fed by `friction-retro` (continuous capture + end of session), consumed in
# detail by `/improve-skills`. Shown here so the report arrives with NO action
# from the user, rather than depending on memory.sh's passive 7-day reminder.
OBS_LOG="$HOME/.claude/memory/skill-observations/log.md"
if [ -f "$OBS_LOG" ]; then
  PENDING_COUNT=$(grep -c "^- Status: pending" "$OBS_LOG" 2>/dev/null || echo 0)
  if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "=== Environment-improvement report (${PENDING_COUNT} pending) ==="
    echo ""
    # Grouped by decreasing severity: lists entry blocks (### OBS-NNN up to the
    # next ### or end of file) whose status is pending, sorted high > medium >
    # low. awk rather than grep -A: the line count per entry varies (the
    # Proposal field is optional).
    awk '
      BEGIN { sev_order["high"]=1; sev_order["medium"]=2; sev_order["low"]=3 }
      /^### OBS-/ { if (id != "" && status == "pending") store(id, skill, sev, obs, prop); id=$2; status=""; skill=""; sev="low"; obs=""; prop=""; next }
      /^- Status: / { status=$3; next }
      /^- Skill: / { skill=$3; next }
      /^- Severity: / { sev=$3; next }
      /^- Observed: / { sub(/^- Observed: /, ""); obs=$0; next }
      /^- Proposal: / { sub(/^- Proposal: /, ""); prop=$0; next }
      END { if (id != "" && status == "pending") store(id, skill, sev, obs, prop) }
      function store(i, sk, sv, ob, pr) {
        n++; oid[n]=i; osk[n]=sk; osv[n]=sv; oob[n]=ob; opr[n]=pr
      }
      END {
        for (i = 1; i <= n; i++) {
          rank = (osv[i] in sev_order) ? sev_order[osv[i]] : 3
          print rank "\t" oid[i] "\t" osk[i] "\t" osv[i] "\t" oob[i] "\t" opr[i]
        }
      }
    ' "$OBS_LOG" | sort -n -k1,1 | while IFS=$'\t' read -r _ id skill sev obs prop; do
      echo "  [$sev] $id — ${skill:--} : $obs"
      [ -n "$prop" ] && echo "      → $prop"
    done
    echo ""
    echo "  Detail and application: /improve-skills"
    echo ""
  fi
fi

# Rotate the skill-selection log if > 500 lines.
LOG="$HOME/.claude/logs/skill-selection.log"
if [ -f "$LOG" ]; then
  lines=$(wc -l < "$LOG")
  if [ "$lines" -gt 500 ]; then
    ts=$(date +%Y%m%d-%H%M%S)
    mv "$LOG" "${LOG%.log}-${ts}.log"
    echo "# skill-selection.log — automatic rotation" > "$LOG"
    echo "  [stop.sh] Log rotated: skill-selection-${ts}.log"
  fi
fi
