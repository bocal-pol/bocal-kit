// goodnight headless supervisor: starts `claude -p --output-format stream-json`, reads the events
// live and STOPS the process as soon as a quota or budget signal asks for it.
// The only quota signal available on a Team plan is the stream's `rate_limit_event`
// (the statusLine `rate_limits` field is reserved for Pro/Max/Ultra plans).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export const SUPERVISE_DEFAULTS = {
  stopUtil: 0.8, // fraction of the window above which we stop
  maxTokens: 3_000_000, // weighted tokens (see weightedTokens)
  hours: 8,
  maxTurns: 150,
};

/** `utilization`: the TypeScript and Python docs disagree (0–1 or 0–100). > 1 => percentage. */
export function normUtil(u) {
  if (typeof u !== 'number' || !Number.isFinite(u) || u < 0) return null;
  return u > 1 ? u / 100 : u;
}

/** Input + output + cache creation at full rate, cache reads at 10%. */
export function weightedTokens(u) {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return (
    n(u?.input_tokens) + n(u?.output_tokens) + n(u?.cache_creation_input_tokens) +
    0.1 * n(u?.cache_read_input_tokens)
  );
}

export function createState() {
  return { msgUsage: {}, tokens: 0, lastRate: null, done: false, events: 0 };
}

const FIELDS = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];

/**
 * Consume one stream event. Returns null, or { code, reason } if the night must stop.
 * An unreadable or unknown event is ignored: it must never crash the supervisor.
 */
export function consume(state, ev, cfg) {
  if (!ev || typeof ev !== 'object') return null;
  state.events++;

  if (ev.type === 'rate_limit_event') {
    const info = ev.rate_limit_info ?? {};
    state.lastRate = info;
    if (info.status === 'rejected') return { code: 'rejected', reason: 'rate limit reached (rejected)' };
    if (info.status === 'allowed_warning') {
      return { code: 'warning', reason: `quota warning (allowed_warning, window ${info.rateLimitType ?? '?'})` };
    }
    if (info.isUsingOverage === true) {
      return { code: 'overage', reason: 'usage beyond the included quota (overage)' };
    }
    const util = normUtil(info.utilization);
    if (util !== null && util >= cfg.stopUtil) {
      return { code: 'utilization', reason: `quota at ${Math.round(util * 100)}% (threshold ${Math.round(cfg.stopUtil * 100)}%)` };
    }
    return null;
  }

  if (ev.type === 'system' && ev.subtype === 'api_retry' && ev.error === 'rate_limit') {
    return { code: 'api_retry', reason: 'retry after rate limit (api_retry)' };
  }

  if (ev.type === 'assistant' && ev.message?.usage) {
    const id = ev.message.id ?? `anon-${state.events}`;
    const prev = (state.msgUsage[id] ??= {});
    // Several events per message: keep the maximum of each field, never the sum.
    for (const f of FIELDS) {
      const v = ev.message.usage[f];
      if (typeof v === 'number' && v > (prev[f] ?? 0)) prev[f] = v;
    }
    state.tokens = Object.values(state.msgUsage).reduce((a, u) => a + weightedTokens(u), 0);
    if (state.tokens > cfg.maxTokens) {
      return { code: 'budget', reason: `token budget exceeded (${Math.round(state.tokens)} > ${cfg.maxTokens})` };
    }
    return null;
  }

  if (ev.type === 'result') state.done = true;
  return null;
}

function killTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch {
    try { child.kill('SIGKILL'); } catch { /* already finished */ }
  }
}

/** Start and supervise. Resolves with { outcome, code, reason, ... }; never throws. */
export function runSupervise({ prompt, cfg, extraArgs = [], logFile, cwd = process.cwd() }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const state = createState();
    const claudeCmd = process.env.GOODNIGHT_CLAUDE || 'claude';
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--max-turns', String(cfg.maxTurns), ...extraArgs];
    let log = null;
    try {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      log = fs.createWriteStream(logFile, { flags: 'a' });
    } catch { /* log unavailable: supervise anyway */ }

    let finished = false;
    let child;
    const finish = (outcome, code, reason) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadlineTimer);
      killTree(child);
      log?.end();
      resolve({
        outcome, code, reason,
        weighted_tokens: Math.round(state.tokens),
        last_rate: state.lastRate,
        elapsed_s: Math.round((Date.now() - started) / 1000),
        log: logFile,
      });
    };

    // One string handed to the shell: avoids Node's deprecation warning (args + shell)
    // and the fragile splitting of arguments that contain spaces.
    const quote = (a) =>
      /^[\w@%+=:,./\\-]+$/.test(a)
        ? a
        : process.platform === 'win32'
          ? `"${a.replace(/"/g, '\\"')}"`
          : `'${a.replace(/'/g, `'\\''`)}'`;
    const commandLine = [claudeCmd, ...args.map(quote)].join(' ');
    try {
      child = spawn(commandLine, {
        cwd, shell: true, detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'], env: process.env,
      });
    } catch (e) {
      resolve({ outcome: 'error', code: 1, reason: `cannot start: ${e.message}` });
      return;
    }
    const deadlineTimer = setTimeout(
      () => finish('deadline', 5, `${cfg.hours} h deadline reached`),
      Math.max(1, Math.round(cfg.hours * 3600 * 1000)),
    );
    child.on('error', (e) => finish('error', 1, `claude process error: ${e.message}`));
    child.stdin.on('error', () => { /* the process may close stdin before the end */ });
    child.stdin.end(prompt);
    child.stderr.on('data', (d) => log?.write(`[stderr] ${String(d)}`));

    let buf = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        log?.write(line + '\n');
        let ev = null;
        try { ev = JSON.parse(line); } catch { /* non-JSON line: ignored */ }
        const stop = consume(state, ev, cfg);
        if (stop) return finish('stopped', 4, stop.reason);
      }
    });
    child.on('close', (code) => {
      if (finished) return;
      if (state.done) finish('completed', 0, 'session ended normally');
      else finish('error', 1, `claude stopped without a result (code ${code})`);
    });
  });
}

export function defaultLogFile() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.env.GOODNIGHT_HOME || path.join(os.homedir(), '.claude', 'goodnight'), `run-${stamp}.jsonl`);
}
