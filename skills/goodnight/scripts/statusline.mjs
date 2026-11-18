#!/usr/bin/env node
// statusLine: relays rate_limits (the only documented quota signal) to state.json,
// which the guard reads. Prints one short line. Must never fail loudly.
import { statePath, writeJsonAtomic } from './lib.mjs';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    /* unreadable input: write a state without percentage, so the guard will stop */
  }
  const win = (w) =>
    typeof w?.used_percentage === 'number'
      ? { pct: w.used_percentage, resets_at: w.resets_at ?? null }
      : null;
  const state = {
    ts: Math.floor(Date.now() / 1000),
    five_hour: win(input?.rate_limits?.five_hour),
    seven_day: win(input?.rate_limits?.seven_day),
    source: 'statusline',
  };
  try {
    writeJsonAtomic(statePath(), state);
  } catch {
    /* disk unavailable: the state will go stale, the guard will stop */
  }
  const f = state.five_hour ? `5h ${Math.round(state.five_hour.pct)}%` : '5h ?';
  const s = state.seven_day ? `7d ${Math.round(state.seven_day.pct)}%` : '7d ?';
  process.stdout.write(`quota ${f} | ${s}`);
});
