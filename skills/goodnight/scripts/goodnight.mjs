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

import {
  SUPERVISE_DEFAULTS, consume, createState, normUtil, runSupervise, defaultLogFile,
} from './supervise.mjs';
import { buildHandoffPrompt, runHandoff } from './handoff.mjs';

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

async function supervise() {
  // usage: supervise --prompt-file <f> [--stop-util 0.8] [--max-tokens 3000000] [--hours 8]
  //                  [--max-turns 150] [--log <f>] [-- <extra arguments for claude>]
  const dd = args.indexOf('--');
  const own = dd >= 0 ? args.slice(0, dd) : args;
  const extra = dd >= 0 ? args.slice(dd + 1) : [];
  const get = (name, def) => { const i = own.indexOf(`--${name}`); return i >= 0 ? own[i + 1] : def; };
  const file = get('prompt-file');
  if (!file || !fs.existsSync(file)) {
    console.error('usage: supervise --prompt-file <existing file> [--stop-util 0.8] [--max-tokens N] [--hours 8] [--max-turns 150] [--log f] [-- claude args]');
    process.exit(2);
  }
  const cfg = {
    stopUtil: Number(get('stop-util', SUPERVISE_DEFAULTS.stopUtil)),
    maxTokens: Number(get('max-tokens', SUPERVISE_DEFAULTS.maxTokens)),
    hours: Number(get('hours', SUPERVISE_DEFAULTS.hours)),
    maxTurns: Number(get('max-turns', SUPERVISE_DEFAULTS.maxTurns)),
  };
  if (!Object.values(cfg).every((v) => Number.isFinite(v) && v > 0) || cfg.stopUtil > 0.9) {
    console.error('invalid parameters: numbers > 0 required, stop-util <= 0.9');
    process.exit(2);
  }
  if (extra.some((a) => /dangerously-skip-permissions/.test(a))) {
    console.error('REFUSED: --dangerously-skip-permissions is forbidden in supervised mode.');
    process.exit(2);
  }
  const res = await runSupervise({
    prompt: fs.readFileSync(file, 'utf8'), cfg, extraArgs: extra,
    logFile: get('log', defaultLogFile()),
  });
  // --handoff-codex: consent given at launch; only a stop for quota (code 4) triggers the handoff.
  if (own.includes('--handoff-codex') && res.code === 4) {
    res.handoff = runHandoff({
      repo: '.', plan: fs.readFileSync(file, 'utf8'), notes: get('notes', '.goodnight/NIGHT-NOTES.md'),
    });
  }
  console.log(JSON.stringify(res));
  process.exit(res.code);
}

// Mode A: when an interactive night stopped for quota closes, hand over to Codex.
function handoff() {
  const plan = opt('plan');
  if (!plan || !fs.existsSync(plan)) {
    console.error('usage: handoff --plan <existing plan file> [--notes .goodnight/NIGHT-NOTES.md]');
    process.exit(2);
  }
  const r = runHandoff({ repo: '.', plan: fs.readFileSync(plan, 'utf8'), notes: opt('notes', '.goodnight/NIGHT-NOTES.md') });
  console.log(JSON.stringify(r));
  process.exit(r.handoff === 'done' ? 0 : 6);
}

function deactivate() {
  try { fs.unlinkSync(activePath()); } catch { /* already inactive */ }
  console.log(JSON.stringify({ activated: false }));
}

async function selftest() {
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

  // G10 — supervisor: pure decisions on simulated events
  const cfg = { stopUtil: 0.8, maxTokens: 1000 };
  const ev = (e, st = createState()) => consume(st, e, cfg);
  const rl = (info) => ({ type: 'rate_limit_event', rate_limit_info: info });
  check('G10 allowed => no stop', ev(rl({ status: 'allowed', rateLimitType: 'five_hour' })) === null);
  check('G10 allowed_warning => stop', ev(rl({ status: 'allowed_warning' }))?.code === 'warning');
  check('G10 rejected => stop', ev(rl({ status: 'rejected' }))?.code === 'rejected');
  check('G10 utilization 0.85 (fraction) => stop', ev(rl({ status: 'allowed', utilization: 0.85 }))?.code === 'utilization');
  check('G10 utilization 85 (percentage) => stop', ev(rl({ status: 'allowed', utilization: 85 }))?.code === 'utilization');
  check('G10 utilization 0.5 => no stop', ev(rl({ status: 'allowed', utilization: 0.5 })) === null);
  check('G10 utilization exactly at threshold => stop', ev(rl({ status: 'allowed', utilization: 0.8 }))?.code === 'utilization');
  check('G10 overage in progress => stop', ev(rl({ status: 'allowed', isUsingOverage: true }))?.code === 'overage');
  check('G10 api_retry rate_limit => stop', ev({ type: 'system', subtype: 'api_retry', error: 'rate_limit' })?.code === 'api_retry');
  check('G10 api_retry other error => no stop', ev({ type: 'system', subtype: 'api_retry', error: 'overloaded' }) === null);
  check('G10 unreadable events ignored', [null, 'x', 42, {}, { type: 'unknown' }].every((e) => ev(e) === null));
  check('G10 normUtil rejects negative / NaN / text', normUtil(-1) === null && normUtil(NaN) === null && normUtil('0.9') === null);
  const stT = createState();
  const msg = (id, inp, out) => ({ type: 'assistant', message: { id, usage: { input_tokens: inp, output_tokens: out } } });
  consume(stT, msg('a', 100, 10), cfg);
  consume(stT, msg('a', 100, 50), cfg); // same message: max, not sum
  check('G10 tokens: same message deduplicated (max)', Math.round(stT.tokens) === 150);
  consume(stT, msg('b', 300, 100), cfg);
  check('G10 tokens: messages accumulated', Math.round(stT.tokens) === 550);
  check('G10 budget exceeded => stop', consume(stT, msg('c', 600, 0), cfg)?.code === 'budget');
  check('G10 cache reads weighted at 10%', Math.round(createState().tokens + 0.1 * 1000) === 100);

  // G10 — integration: fake "claude" that emits events then hangs
  const fdir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodnight-sup-'));
  const fake = path.join(fdir, 'fake-claude.mjs');
  fs.writeFileSync(fake, `
import fs from 'node:fs';
const mode = process.env.FAKE_MODE;
fs.writeFileSync(process.env.FAKE_PIDFILE, String(process.pid));
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ type: 'system', subtype: 'init' });
out({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed' } });
if (mode === 'complete') { out({ type: 'result', subtype: 'success' }); process.exit(0); }
if (mode === 'warn') { out({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed_warning' } }); }
setInterval(() => {}, 1000); // stays alive: only the supervisor can stop it
`);
  const supRun = async (mode, hours = 1) => {
    const pidfile = path.join(fdir, `pid-${mode}.txt`);
    process.env.GOODNIGHT_CLAUDE = `"${process.execPath}" "${fake}"`;
    process.env.FAKE_MODE = mode;
    process.env.FAKE_PIDFILE = pidfile;
    const t0 = Date.now();
    const r = await runSupervise({
      prompt: 'test', cfg: { stopUtil: 0.8, maxTokens: 1e9, hours, maxTurns: 5 },
      logFile: path.join(fdir, `run-${mode}.jsonl`),
    });
    delete process.env.GOODNIGHT_CLAUDE;
    await new Promise((res) => setTimeout(res, 800));
    let alive = true;
    try { process.kill(Number(fs.readFileSync(pidfile, 'utf8')), 0); } catch { alive = false; }
    return { ...r, alive, ms: Date.now() - t0 };
  };
  const rWarn = await supRun('warn');
  check('G10 real: warning => stop (code 4)', rWarn.outcome === 'stopped' && rWarn.code === 4);
  check('G10 real: the claude process is really killed', rWarn.alive === false);
  check('G10 real: fast stop (< 15 s)', rWarn.ms < 15000);
  const rDone = await supRun('complete');
  check('G10 real: normal session => completed (code 0)', rDone.outcome === 'completed' && rDone.code === 0);
  const rDead = await supRun('hang', 0.0006);
  check('G10 real: deadline => deadline (code 5) and process killed', rDead.outcome === 'deadline' && rDead.code === 5 && rDead.alive === false);
  check('G10 real: log written', fs.existsSync(path.join(fdir, 'run-warn.jsonl')) && /allowed_warning/.test(fs.readFileSync(path.join(fdir, 'run-warn.jsonl'), 'utf8')));
  fs.rmSync(fdir, { recursive: true, force: true });

  // G11 — handoff to Codex: prompt and fallback, with a fake bridge (no real call)
  const hp = buildHandoffPrompt({ plan: '1. step A\n2. step B', notes: 'A done' });
  check('G11 prompt: contains the plan and the notes', /step B/.test(hp) && /A done/.test(hp));
  check('G11 prompt: forbids commit, push and secrets', /git commit/.test(hp) && /git push/.test(hp) && /\.env/.test(hp));
  const hdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-handoff-'));
  const fakeBridge = path.join(hdir, 'bridge.mjs');
  fs.writeFileSync(fakeBridge, 'console.log(JSON.stringify({ok:false,code:11,kind:"not-logged-in",detail:"test"}));process.exit(11);');
  const hnotes = path.join(hdir, 'NOTES.md');
  fs.writeFileSync(hnotes, '# notes\n');
  const hr = runHandoff({ repo: hdir, plan: 'p', notes: hnotes, bridge: fakeBridge });
  check('G11 Codex not logged in => handoff skipped, no error', hr.handoff === 'skipped' && hr.reason === 'not-logged-in');
  check('G11 the reason is noted for the morning', /handoff not done/.test(fs.readFileSync(hnotes, 'utf8')));
  fs.rmSync(hdir, { recursive: true, force: true });

  let fail = 0;
  for (const r of results) { console.log(`${r.ok ? '✓' : '✗'} ${r.name}`); if (!r.ok) fail++; }
  console.log(fail ? `\n✗ ${fail} failure(s) out of ${results.length}` : `\n✓ ${results.length}/${results.length} cases passed`);
  process.exit(fail ? 1 : 0);
}

await ({ status, activate, deactivate, selftest, supervise, handoff }[cmd] ?? (() => {
  console.error('usage: goodnight.mjs status | activate --notes <f> | deactivate | supervise --prompt-file <f> [--handoff-codex] | handoff --plan <f> | selftest');
  process.exit(2);
}))();
