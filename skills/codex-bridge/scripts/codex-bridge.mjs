#!/usr/bin/env node
// Bridge to Codex (CLI installed in WSL). Single source of the call, the quota fallback and the worktree.
//
//   check                                        state: WSL, Codex, login, quota
//   exec --mode read|review|write --cwd <dir> --prompt-file <f> --out <f> --confirmed [--timeout 900]
//   worktree --slug <name> [--repo <dir>]        create .claude/worktrees/codex-<slug> + branch bugfix/codex-<slug>
//   worktree-clean --slug <name> [--repo <dir>]  remove the worktree and the branch (merged branch only)
//   state | reset                                show / clear the quota state
//   selftest                                     pure cases: error classification, durations, paths
//
// Exit codes: 0 ok · 2 usage or missing consent · 10 WSL or Codex absent · 11 not logged in
//             12 quota exhausted (no call tried) · 20 quota reached during the call
//             21 authentication · 22 sandbox blocked · 23 other failure · 24 timeout
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const CODEX = '$HOME/.local/bin/codex';
const SANDBOX = { read: 'read-only', review: 'read-only', write: 'workspace-write' };

// ---------- pure functions (tested by selftest) ----------

// Windows 8.3 short folder names (for example "USERNA~1") block Codex in WSL: always pass the long form.
export function longPath(p) {
  const abs = path.resolve(p);
  try { return fs.realpathSync.native(abs); } catch { return abs; }
}

export function toWslPath(p) {
  const abs = path.resolve(p).replace(/\\/g, '/');
  const m = /^([A-Za-z]):\/(.*)$/.exec(abs);
  return m ? `/mnt/${m[1].toLowerCase()}/${m[2]}` : abs;
}

export function classify(text) {
  const t = String(text);
  if (/usage limit|rate.?limit|quota|too many requests|\b429\b|exceeded your|reached your .*limit/i.test(t)) return 'quota';
  if (/not logged in|unauthori[sz]ed|\b401\b|please (log ?in|sign ?in)|authentication/i.test(t)) return 'auth';
  if (/blocked by policy|workspace is mounted read-only|read-only file ?system|sandbox/i.test(t)) return 'sandbox';
  return 'other';
}

// Reset time, if the error gives it as a relative duration ("try again in 2 hours 5 minutes").
export function parseResetMs(text, nowMs) {
  const m = /(?:try again|resets?|retry)[^\n]{0,40}?\bin\s+((?:\d+\s*(?:d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|seconds?)\b[\s,and]*)+)/i.exec(String(text));
  if (!m) return null;
  let ms = 0;
  for (const [, n, u] of m[1].matchAll(/(\d+)\s*([a-z]+)/gi)) {
    const unit = u.toLowerCase();
    const k = unit.startsWith('d') ? 86_400_000 : unit.startsWith('h') ? 3_600_000 : unit.startsWith('m') ? 60_000 : 1_000;
    ms += Number(n) * k;
  }
  return ms > 0 ? nowMs + ms : null;
}

export function blockedByState(state, nowMs) {
  return Boolean(state && state.status === 'exhausted' && state.until && nowMs < state.until);
}

// ---------- quota state ----------

const stateDir = () => path.join(os.homedir(), '.claude', 'codex');
const statePath = () => path.join(stateDir(), 'state.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return null; } };
function writeState(s) {
  fs.mkdirSync(stateDir(), { recursive: true });
  const tmp = `${statePath()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s));
  fs.renameSync(tmp, statePath());
}
const clearState = () => { try { fs.unlinkSync(statePath()); } catch { /* already absent */ } };

// ---------- WSL ----------

const wsl = (script, opts = {}) => spawnSync('wsl.exe', ['-e', 'bash', '-lc', script], { encoding: 'utf8', timeout: 60_000, ...opts });

function environment() {
  const r = wsl(`test -x "${CODEX}" && "${CODEX}" login status 2>&1`);
  if (r.error || r.status === null) return { ok: false, code: 10, kind: 'wsl', detail: 'WSL unavailable' };
  const out = `${r.stdout}${r.stderr}`;
  if (r.status !== 0 && !/logged in|not logged in/i.test(out)) return { ok: false, code: 10, kind: 'codex-absent', detail: 'Codex not installed in WSL (~/.local/bin/codex)' };
  if (!/logged in using/i.test(out)) return { ok: false, code: 11, kind: 'not-logged-in', detail: 'Codex not logged in inside WSL (codex login --device-auth)' };
  return { ok: true, code: 0, detail: out.trim().split('\n')[0] };
}

function check() {
  const st = readState();
  if (blockedByState(st, Date.now())) {
    console.log(JSON.stringify({ ok: false, code: 12, kind: 'quota-blocked', until: new Date(st.until).toISOString(), detail: 'Codex quota exhausted until the given time' }));
    process.exit(12);
  }
  const env = environment();
  console.log(JSON.stringify({ ...env, retry_after_exhausted: Boolean(st && st.status === 'exhausted') }));
  process.exit(env.code);
}

// ---------- exec ----------

function execCodex(a) {
  const mode = a.mode;
  const need = ['mode', 'cwd', 'prompt-file', 'out'].filter((k) => !a[k]);
  if (need.length || !SANDBOX[mode]) usage(`missing or invalid: ${need.join(', ') || 'mode (read|review|write)'}`);
  if (!a.confirmed) {
    console.error('REFUSED: consent missing. Ask the user (AskUserQuestion), then run again with --confirmed.');
    process.exit(2);
  }
  const prompt = fs.readFileSync(a['prompt-file'], 'utf8');
  const st = readState();
  if (blockedByState(st, Date.now())) {
    console.log(JSON.stringify({ ok: false, code: 12, kind: 'quota-blocked', until: new Date(st.until).toISOString() }));
    process.exit(12);
  }
  fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
  const outAbs = path.join(longPath(path.dirname(path.resolve(a.out))), path.basename(a.out));
  const cmd = `exec "${CODEX}" exec -s ${SANDBOX[mode]} -C '${toWslPath(longPath(a.cwd))}' --color never -o '${toWslPath(outAbs)}' -`;
  const t0 = Date.now();
  const timeoutMs = Number(a.timeout ?? 900) * 1000;
  const child = spawn('wsl.exe', ['-e', 'bash', '-lc', cmd], { stdio: ['pipe', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.stdin.end(prompt);
  const timer = setTimeout(() => { child.kill(); }, timeoutMs);
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    const now = Date.now();
    const base = { mode, out: a.out, duration_s: Math.round((now - t0) / 1000) };
    const hasOutput = fs.existsSync(a.out) && fs.statSync(a.out).size > 0;
    if (signal || code === null) { report({ ...base, ok: false, code: 24, kind: 'timeout' }, 24, log); return; }
    const kind = code === 0 && hasOutput ? 'ok' : classify(log);
    if (kind === 'ok') { clearState(); report({ ...base, ok: true, code: 0 }, 0, log); return; }
    if (kind === 'quota') {
      writeState({ status: 'exhausted', since: now, until: parseResetMs(log, now), note: 'quota detected during a call' });
      report({ ...base, ok: false, code: 20, kind: 'quota' }, 20, log); return;
    }
    const map = { auth: 21, sandbox: 22, other: 23 };
    report({ ...base, ok: false, code: map[kind], kind }, map[kind], log);
  });
}

function report(obj, code, log) {
  if (!obj.ok) obj.tail = String(log).split('\n').filter(Boolean).slice(-6).join(' | ').slice(0, 600);
  console.log(JSON.stringify(obj));
  process.exit(code);
}

// ---------- worktree ----------

const git = (repo, args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
function slugOk(s) { return /^[a-z0-9][a-z0-9-]{0,40}$/.test(s ?? ''); }

function worktree(a) {
  if (!slugOk(a.slug)) usage('--slug required (a-z, 0-9, hyphens, 41 characters at most)');
  const repo = path.resolve(a.repo ?? '.');
  const dir = path.join(repo, '.claude', 'worktrees', `codex-${a.slug}`);
  const branch = `bugfix/codex-${a.slug}`;
  const r = git(repo, ['worktree', 'add', '-b', branch, dir, 'HEAD']);
  if (r.status !== 0) { console.error(`worktree failed: ${r.stderr.trim()}`); process.exit(23); }
  console.log(JSON.stringify({ ok: true, path: dir, branch }));
}

function worktreeClean(a) {
  if (!slugOk(a.slug)) usage('--slug required');
  const repo = path.resolve(a.repo ?? '.');
  const dir = path.join(repo, '.claude', 'worktrees', `codex-${a.slug}`);
  const branch = `bugfix/codex-${a.slug}`;
  const rm = git(repo, ['worktree', 'remove', dir]);
  if (rm.status !== 0) { console.error(`worktree kept (uncommitted changes?): ${rm.stderr.trim()}`); process.exit(23); }
  const br = git(repo, ['branch', '-d', branch]);
  if (br.status !== 0) { console.error(`branch ${branch} kept (not merged): ${br.stderr.trim()}`); process.exit(23); }
  console.log(JSON.stringify({ ok: true, removed: dir, branch }));
}

// ---------- CLI ----------

function usage(msg) { console.error(`usage: ${msg ?? 'see the script header'}`); process.exit(2); }

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    o[k] = v;
  }
  return o;
}

function selftest() {
  const r = [];
  const t = (name, cond) => r.push({ name, ok: Boolean(cond) });
  t('quota: usage limit', classify('You have hit your usage limit. Try again in 2 hours') === 'quota');
  t('quota: 429', classify('HTTP 429 Too Many Requests') === 'quota');
  t('auth: not logged in', classify('Not logged in') === 'auth');
  t('sandbox: blocked by policy', classify('Rejected(blocked by policy)') === 'sandbox');
  t('sandbox: read-only', classify('the workspace is mounted read-only') === 'sandbox');
  t('other: nothing recognized', classify('segfault') === 'other');
  t('quota wins over sandbox', classify('rate limit reached; sandbox ok') === 'quota');
  const n = 1_000_000;
  t('duration: 2 hours', parseResetMs('Try again in 2 hours', n) === n + 7_200_000);
  t('duration: 1 hour 30 minutes', parseResetMs('resets in 1 hour 30 minutes', n) === n + 5_400_000);
  t('duration: absent => null', parseResetMs('usage limit reached', n) === null);
  t('path: C:\\a\\b', toWslPath('C:\\a\\b') === '/mnt/c/a/b');
  t('path: D:/x/y', toWslPath('D:/x/y') === '/mnt/d/x/y');
  const short = process.env.TEMP ?? '';
  t('path: long form without 8.3', !short || !/~\d/.test(longPath(short)));
  t('state: blocked before the deadline', blockedByState({ status: 'exhausted', until: n + 10 }, n) === true);
  t('state: free after the deadline', blockedByState({ status: 'exhausted', until: n - 1 }, n) === false);
  t('state: unknown deadline => try again', blockedByState({ status: 'exhausted', until: null }, n) === false);
  t('state: absent => free', blockedByState(null, n) === false);
  for (const c of r) console.log(`${c.ok ? '✓' : '✗'} ${c.name}`);
  const bad = r.filter((c) => !c.ok).length;
  console.log(bad ? `${bad} cases failed` : `${r.length} cases ✓`);
  process.exit(bad ? 1 : 0);
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parse(rest);
switch (cmd) {
  case 'check': check(); break;
  case 'exec': execCodex(args); break;
  case 'worktree': worktree(args); break;
  case 'worktree-clean': worktreeClean(args); break;
  case 'state': console.log(JSON.stringify(readState() ?? { status: 'ok' })); break;
  case 'reset': clearState(); console.log(JSON.stringify({ status: 'ok' })); break;
  case 'selftest': selftest(); break;
  default: usage('check | exec | worktree | worktree-clean | state | reset | selftest');
}
