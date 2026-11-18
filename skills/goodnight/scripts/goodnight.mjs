#!/usr/bin/env node
// goodnight skill CLI: status | activate | deactivate | selftest
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  activePath, statePath, readJson, writeJsonAtomic, evaluate, decide, DEFAULTS,
} from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const now = () => Math.floor(Date.now() / 1000);
const [cmd, ...args] = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

function status() {
  const active = readJson(activePath());
  const state = readJson(statePath());
  const ev = evaluate({ active: active ?? { ...DEFAULTS }, state, now: now() });
  // With no active night, evaluate with the default thresholds: used by the preflight.
  console.log(JSON.stringify({ active: Boolean(active), ...ev }));
  process.exit(ev.ok ? 0 : 3);
}

function activate() {
  const notes = opt('notes');
  if (!notes) {
    console.error('usage: activate --notes <file> [--stop 80] [--warn 70] [--hours 8] [--max-age 600]');
    process.exit(2);
  }
  const stop = Number(opt('stop', DEFAULTS.stop_pct));
  const warn = Number(opt('warn', DEFAULTS.warn_pct));
  const hours = Number(opt('hours', 8));
  const maxAge = Number(opt('max-age', DEFAULTS.max_age_s));
  if (![stop, warn, hours, maxAge].every(Number.isFinite) || warn >= stop || stop > 90) {
    console.error('invalid thresholds: require warn < stop <= 90 and numbers');
    process.exit(2);
  }
  // Preflight: no night without a fresh signal and without margin.
  const pre = evaluate({ active: { stop_pct: stop, warn_pct: warn, max_age_s: maxAge }, state: readJson(statePath()), now: now() });
  if (!pre.ok) {
    console.error(`REFUSED: ${pre.reason}. The limit cannot be guaranteed without a reliable quota signal.`);
    process.exit(3);
  }
  if (pre.pct >= warn) {
    console.error(`REFUSED: quota already at ${pre.pct}% (warning ${warn}%). Not enough margin for a night.`);
    process.exit(3);
  }
  writeJsonAtomic(activePath(), {
    started: now(),
    deadline: now() + Math.round(hours * 3600),
    notes_file: path.resolve(notes),
    stop_pct: stop, warn_pct: warn, max_age_s: maxAge,
  });
  console.log(JSON.stringify({ activated: true, quota_pct: pre.pct, remaining_pct: pre.remaining_pct }));
}

function deactivate() {
  try { fs.unlinkSync(activePath()); } catch { /* already inactive */ }
  console.log(JSON.stringify({ activated: false }));
}

function selftest() {
  const results = [];
  const check = (name, cond) => results.push({ name, ok: Boolean(cond) });
  const t = 1_000_000;
  const act = { stop_pct: 80, warn_pct: 70, max_age_s: 600, deadline: t + 3600, notes_file: '/n/NOTES.md' };
  const fresh = (p5, p7 = 10) => ({ ts: t - 5, five_hour: p5 == null ? null : { pct: p5 }, seven_day: { pct: p7 } });
  const d = (state, tool, input, a = act) => decide({ active: a, state, now: t, tool, input });

  // G1 — above the threshold: work tools refused
  check('G1 code edit refused at 85%', !d(fresh(85), 'Edit', { file_path: '/p/src/a.ts' }).allow);
  check('G1 non-git bash refused at 85%', !d(fresh(85), 'Bash', { command: 'npm test' }).allow);
  check('G1 exact threshold (80%) refused', !d(fresh(80), 'Bash', { command: 'npm test' }).allow);
  check('G1 week at 90% refuses even if 5h is low', !d(fresh(10, 90), 'Bash', { command: 'ls' }).allow);
  check('G1 below threshold (50%) allowed', d(fresh(50), 'Bash', { command: 'npm test' }).allow);
  check('G1 warning zone (75%) allowed, wrap_up raised', d(fresh(75), 'Edit', { file_path: '/p/a' }).ev.wrap_up === true);

  // G2 — stop mode: only read, notes, git pass
  check('G2 Read allowed', d(fresh(95), 'Read', { file_path: '/p/a' }).allow);
  check('G2 handoff note allowed', d(fresh(95), 'Write', { file_path: '/n/NOTES.md' }).allow);
  check('G2 other file refused', !d(fresh(95), 'Write', { file_path: '/n/other.md' }).allow);
  check('G2 git commit allowed', d(fresh(95), 'Bash', { command: 'git commit -m "wip: step 3"' }).allow);
  check('G2 git status allowed', d(fresh(95), 'Bash', { command: 'git status --short' }).allow);
  check('G2 git push refused', !d(fresh(95), 'Bash', { command: 'git push origin x' }).allow);
  check('G2 chaining refused', !d(fresh(95), 'Bash', { command: 'git status && rm -rf x' }).allow);
  check('G2 redirection refused', !d(fresh(95), 'Bash', { command: 'git log > x' }).allow);
  check('G2 $() substitution refused', !d(fresh(95), 'Bash', { command: 'git commit -m "$(evil)"' }).allow);
  check('G2 backticks refused', !d(fresh(95), 'Bash', { command: 'git commit -m "`evil`"' }).allow);
  check('G2 commit message with ; allowed', d(fresh(95), 'Bash', { command: 'git commit -m "wip: a; b"' }).allow);
  check('G2 commit then command refused', !d(fresh(95), 'Bash', { command: 'git commit -m "x" ; rm -rf /' }).allow);
  check('G2 git diff --output refused', !d(fresh(95), 'Bash', { command: 'git diff --output=/tmp/x' }).allow);
  check('G2 git -c refused', !d(fresh(95), 'Bash', { command: 'git -c core.pager=evil status' }).allow);
  check('G2 night close allowed', d(fresh(95), 'Bash', { command: 'node ~/.claude/skills/goodnight/scripts/goodnight.mjs deactivate' }).allow);
  check('G2 close through the bash wrapper allowed', d(fresh(95), 'Bash', { command: 'bash ~/.claude/skills/goodnight/scripts/goodnight.sh deactivate' }).allow);
  check('G2 disguised bash wrapper refused', !d(fresh(95), 'Bash', { command: 'bash x/goodnight.sh deactivate && rm -rf /' }).allow);
  check('G2 unknown interpreter refused', !d(fresh(95), 'Bash', { command: 'sh x/goodnight.sh deactivate' }).allow);
  check('G2 disguised close refused', !d(fresh(95), 'Bash', { command: 'node x/goodnight.mjs deactivate; rm -rf /' }).allow);
  check('G2 other subcommand refused', !d(fresh(95), 'Bash', { command: 'node x/goodnight.mjs activate --notes n' }).allow);
  check('G2 unknown tool refused', !d(fresh(95), 'WebFetch', { url: 'http://x' }).allow);

  // G3 — fail-closed
  check('G3 absent state refused', !d(null, 'Bash', { command: 'ls' }).allow);
  check('G3 stale state refused', !d({ ts: t - 601, five_hour: { pct: 1 } }, 'Bash', { command: 'ls' }).allow);
  check('G3 no percentage refused', !d({ ts: t - 1, five_hour: null, seven_day: null }, 'Bash', { command: 'ls' }).allow);
  check('G3 unreadable active refused', !d(fresh(1), 'Bash', { command: 'ls' }, null).allow);
  check('G3 invalid thresholds refused', !d(fresh(1), 'Bash', { command: 'ls' }, { ...act, stop_pct: 'x' }).allow);
  check('G3 deadline passed refused', !decide({ active: act, state: fresh(1), now: t + 3601, tool: 'Bash', input: { command: 'ls' } }).allow);
  check('G3 non-numeric percentage ignored', !d({ ts: t - 1, five_hour: { pct: 'NaN' }, seven_day: null }, 'Bash', { command: 'ls' }).allow);

  // G4 / G5 — integration through the real scripts, in a throwaway directory
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'goodnight-'));
  const run = (script, stdin, env = {}) =>
    spawnSync(process.execPath, [path.join(here, script)], {
      input: stdin, encoding: 'utf8', env: { ...process.env, GOODNIGHT_HOME: tmp, ...env },
    });
  const hookIn = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test' } });
  const inert = run('guard.mjs', hookIn);
  check('G4 inert without active.json: empty output, exit 0', inert.status === 0 && inert.stdout === '');
  const sl = run('statusline.mjs', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 42, resets_at: 9 }, seven_day: { used_percentage: 7 } } }));
  const st = readJson(path.join(tmp, 'state.json'));
  check('G5 statusline writes the percentages', st?.five_hour?.pct === 42 && st?.seven_day?.pct === 7);
  check('G5 statusline prints one line', /5h 42%/.test(sl.stdout));
  run('statusline.mjs', '{}');
  const st2 = readJson(path.join(tmp, 'state.json'));
  check('G5 missing rate_limits => null percentages', st2?.five_hour === null && st2?.seven_day === null);
  run('statusline.mjs', 'not json');
  check('G5 unreadable input: no crash, state written', readJson(path.join(tmp, 'state.json'))?.five_hour === null);

  writeJsonAtomic(path.join(tmp, 'active.json'), { ...act, deadline: now() + 3600 });
  run('statusline.mjs', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 95 } } }));
  const denied = run('guard.mjs', hookIn);
  let dj = null; try { dj = JSON.parse(denied.stdout); } catch { /* empty output */ }
  check('G4 real guard: deny JSON at 95%', dj?.hookSpecificOutput?.permissionDecision === 'deny' && denied.status === 0);
  fs.writeFileSync(path.join(tmp, 'active.json'), '{ unreadable');
  const bad = run('guard.mjs', hookIn);
  check('G3 real guard: corrupt active.json => deny', /"deny"/.test(bad.stdout));
  run('statusline.mjs', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 5 } } }));
  writeJsonAtomic(path.join(tmp, 'active.json'), { ...act, deadline: now() + 3600 });
  const okRun = run('guard.mjs', hookIn);
  check('G1 real guard: allows at 5%', okRun.status === 0 && okRun.stdout === '');
  // G9 — the bash wrapper of the hook (settings.json calls it): reliable launch, fail-closed
  const sh = (env = {}, stdin = hookIn) =>
    spawnSync('bash', [path.join(here, 'guard.sh')], {
      input: stdin, encoding: 'utf8', env: { ...process.env, GOODNIGHT_HOME: tmp, ...env },
    });
  const shOk = sh();
  check('G9 bash available for the wrapper', !shOk.error);
  check('G9 wrapper: allows at 5%', shOk.status === 0 && shOk.stdout === '');
  run('statusline.mjs', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 95 } } }));
  const shDeny = sh();
  check('G9 wrapper: deny at 95%', /"deny"/.test(shDeny.stdout) && shDeny.status === 0);
  const shNoNode = sh({ GOODNIGHT_NODE: path.join(tmp, 'node-not-found') });
  check('G9 wrapper: Node not found => deny (fail-closed at launch)', /"deny"/.test(shNoNode.stdout) && shNoNode.status === 0);
  fs.unlinkSync(path.join(tmp, 'active.json'));
  const shInert = sh({ GOODNIGHT_NODE: path.join(tmp, 'node-not-found') });
  check('G9 wrapper inert without active.json, even without Node', shInert.status === 0 && shInert.stdout === '');
  const sline = spawnSync('bash', [path.join(here, 'statusline.sh')], {
    input: JSON.stringify({ rate_limits: { five_hour: { used_percentage: 33 } } }),
    encoding: 'utf8', env: { ...process.env, GOODNIGHT_HOME: tmp },
  });
  check('G9 statusLine wrapper: writes the state', /5h 33%/.test(sline.stdout) && readJson(path.join(tmp, 'state.json'))?.five_hour?.pct === 33);
  const cliSh = spawnSync('bash', [path.join(here, 'goodnight.sh'), 'status'], {
    encoding: 'utf8', env: { ...process.env, GOODNIGHT_HOME: tmp },
  });
  let cj = null; try { cj = JSON.parse(cliSh.stdout); } catch { /* unreadable output */ }
  check('G9 CLI wrapper: status answers in JSON, without depending on ~', cj !== null && typeof cj.ok === 'boolean');
  fs.rmSync(tmp, { recursive: true, force: true });

  let fail = 0;
  for (const r of results) { console.log(`${r.ok ? '✓' : '✗'} ${r.name}`); if (!r.ok) fail++; }
  console.log(fail ? `\n✗ ${fail} failure(s) out of ${results.length}` : `\n✓ ${results.length}/${results.length} cases passed`);
  process.exit(fail ? 1 : 0);
}

({ status, activate, deactivate, selftest }[cmd] ?? (() => {
  console.error('usage: goodnight.mjs status | activate --notes <f> | deactivate | selftest');
  process.exit(2);
}))();
