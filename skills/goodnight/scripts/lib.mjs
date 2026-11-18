// Pure logic of the goodnight guard — no I/O except the read helpers.
// Imported by guard.mjs (PreToolUse hook), statusline.mjs and goodnight.mjs (CLI).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HOME = () =>
  process.env.GOODNIGHT_HOME || path.join(os.homedir(), '.claude', 'goodnight');
export const activePath = () => path.join(HOME(), 'active.json');
export const statePath = () => path.join(HOME(), 'state.json');

export const DEFAULTS = { warn_pct: 70, stop_pct: 80, max_age_s: 600 };

export function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Atomic write: temporary file, then rename. */
export function writeJsonAtomic(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, p);
}

/**
 * Evaluate the quota state. Returns `ok: true` only if EVERYTHING is proven:
 * signal present, fresh, percentage known, below the threshold, deadline not reached.
 * Anything else is a stop (fail-closed).
 */
export function evaluate({ active, state, now }) {
  if (!active) return { ok: false, reason: 'active.json unreadable or absent' };
  const stop = Number(active.stop_pct ?? DEFAULTS.stop_pct);
  const warn = Number(active.warn_pct ?? DEFAULTS.warn_pct);
  const maxAge = Number(active.max_age_s ?? DEFAULTS.max_age_s);
  const base = { stop_pct: stop, warn_pct: warn, max_age_s: maxAge };

  if (!Number.isFinite(stop) || !Number.isFinite(warn) || !Number.isFinite(maxAge)) {
    return { ok: false, ...base, reason: 'invalid thresholds in active.json' };
  }
  if (active.deadline != null && now >= Number(active.deadline)) {
    return { ok: false, ...base, reason: 'night deadline reached' };
  }
  if (!state || typeof state.ts !== 'number') {
    return { ok: false, ...base, reason: 'quota state absent (statusLine not configured?)' };
  }
  const age = now - state.ts;
  if (age > maxAge) {
    return { ok: false, ...base, age_s: age, reason: `quota state stale (${age}s > ${maxAge}s)` };
  }
  const pcts = [state.five_hour?.pct, state.seven_day?.pct].filter(
    (v) => typeof v === 'number' && Number.isFinite(v),
  );
  if (pcts.length === 0) {
    return { ok: false, ...base, age_s: age, reason: 'no quota percentage available' };
  }
  const pct = Math.max(...pcts);
  if (pct >= stop) {
    return { ok: false, ...base, age_s: age, pct, reason: `quota at ${pct}% (stop threshold ${stop}%)` };
  }
  return {
    ok: true,
    ...base,
    age_s: age,
    pct,
    wrap_up: pct >= warn, // warning zone: finish the current step, start nothing new
    remaining_pct: Math.round((stop - pct) * 10) / 10,
    reason: pct >= warn ? `quota at ${pct}% (warning ${warn}%)` : 'ok',
  };
}

const GIT_WRAPUP = /^git\s+(status|diff|log|add|commit)\b/;
// Forbidden everywhere, even inside quotes: the shell still runs `...` and $(...) there.
const SHELL_EXEC = /(`|\$|\n|\r)/;
// Forbidden outside the commit message: chaining, pipe, redirection.
const SHELL_META = /(;|&|\||>|<)/;
const CLOSE_NIGHT = /^node\s+("[^"\n]*"|'[^'\n]*'|[^\s"'`$;&|<>]+)goodnight\.mjs\s+deactivate$/;
// Git options that write elsewhere or run a program.
const GIT_RISKY = /--output|--ext-diff|--textconv|--exec|\s-c\s|--upload-pack|--receive-pack/;

/** In stop mode, only these calls pass: read, write notes, commit. */
export function isWrapUpAllowed(tool, input, active) {
  if (tool === 'Read' || tool === 'Glob' || tool === 'Grep') return true;
  if (tool === 'Write' || tool === 'Edit') {
    const target = input?.file_path;
    const notes = active?.notes_file;
    if (!target || !notes) return false;
    return path.resolve(String(target)) === path.resolve(String(notes));
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(input?.command ?? '').trim();
    // Closing the night must always stay possible, or the guard would also block the next day.
    if (CLOSE_NIGHT.test(cmd)) return true;
    if (!GIT_WRAPUP.test(cmd) || SHELL_EXEC.test(cmd) || GIT_RISKY.test(cmd)) return false;
    // The commit message ("-m ...") may contain ; & | : neutralize it before the test.
    const bare = cmd.replace(/-m\s+(["'])[^"']*\1/, '-m X');
    return !SHELL_META.test(bare);
  }
  return false;
}

export function denyReason(reason) {
  return (
    `Quota guard (goodnight): ${reason}. No new work tool is allowed. ` +
    `Write the handoff note in the notes file, commit what works (git add / git commit), ` +
    `close the night with "node <skill>/scripts/goodnight.mjs deactivate", then end your reply. ` +
    `Do not try to work around this refusal.`
  );
}

/** Full decision for one tool call. */
export function decide({ active, state, now, tool, input }) {
  const ev = evaluate({ active, state, now });
  if (ev.ok) return { allow: true, ev };
  if (isWrapUpAllowed(tool, input, active)) return { allow: true, ev, wrap: true };
  return { allow: false, ev, reason: denyReason(ev.reason) };
}
