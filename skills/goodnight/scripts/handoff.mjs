// Night handoff to Codex: when the quota stops Claude, Codex continues the plan in an isolated
// worktree. The user gives consent at launch (option --handoff-codex). It covers only that
// worktree. Codex does not commit and does not push: Claude reviews in the morning.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const defaultBridge = path.join(here, '..', '..', 'codex-bridge', 'scripts', 'codex-bridge.mjs');

export function buildHandoffPrompt({ plan, notes }) {
  return [
    '# Night resume — you continue work started by another assistant',
    '',
    'The quota of the previous assistant is reached. Continue the plan below from the first',
    '**unfinished** step (the notes say what is done). An isolated worktree is given to you: work in it.',
    '',
    '## Rules',
    '- Do not run `git commit`, `git push` or any network command. Do not read or quote `.env`, keys,',
    '  certificates or secret files.',
    '- Do the steps one by one. Run the tests after each step. Do not change a test to make it pass.',
    '- If an action is irreversible, or if the plan must change: stop and write the question.',
    '- At the end, write a short report: what is done, what is broken, where to start.',
    '',
    '## Plan',
    plan.trim(),
    '',
    '## Notes of the night (state at the time of the stop)',
    (notes ?? '').trim() || '(no notes)',
    '',
  ].join('\n');
}

const run = (bridge, args, opts = {}) => spawnSync(process.execPath, [bridge, ...args], { encoding: 'utf8', timeout: 1_000_000, ...opts });
const json = (s) => { try { return JSON.parse(String(s).trim().split('\n').pop()); } catch { return null; } };

export function runHandoff({ repo = '.', plan, notes, bridge = defaultBridge, stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '') }) {
  const append = (line) => { try { fs.appendFileSync(notes, `\n${line}\n`); } catch { /* notes absent: too bad */ } };
  const check = run(bridge, ['check']);
  if (check.status !== 0) {
    const info = json(check.stdout) ?? {};
    append(`## Codex — handoff not done\nReason: ${info.kind ?? 'unavailable'} (${info.detail ?? `code ${check.status}`}). Claude could not hand over.`);
    return { handoff: 'skipped', code: check.status, reason: info.kind ?? 'unavailable' };
  }
  const slug = `night-${stamp}`;
  const wt = run(bridge, ['worktree', '--slug', slug, '--repo', repo]);
  const wtInfo = json(wt.stdout);
  if (wt.status !== 0 || !wtInfo?.path) {
    append(`## Codex — handoff not done\nReason: worktree impossible (${String(wt.stderr).trim().slice(0, 200)}).`);
    return { handoff: 'skipped', code: wt.status, reason: 'worktree' };
  }
  const dir = path.join(repo, '.goodnight');
  fs.mkdirSync(dir, { recursive: true });
  const promptFile = path.join(dir, 'CODEX-HANDOFF.md');
  const outFile = path.join(dir, 'CODEX-RESULT.md');
  const notesText = (() => { try { return fs.readFileSync(notes, 'utf8'); } catch { return ''; } })();
  fs.writeFileSync(promptFile, buildHandoffPrompt({ plan, notes: notesText }));
  const ex = run(bridge, ['exec', '--mode', 'write', '--cwd', wtInfo.path, '--prompt-file', promptFile, '--out', outFile, '--confirmed', '--timeout', '3000']);
  const res = json(ex.stdout) ?? {};
  append(res.ok
    ? `## Codex — continued the plan\nWorktree: ${wtInfo.path} (branch ${wtInfo.branch}). Report: ${outFile}. Nothing is committed: review the diff in the morning.`
    : `## Codex — stopped\nReason: ${res.kind ?? 'failure'} (code ${ex.status}). Worktree: ${wtInfo.path}. ${res.kind === 'quota' ? 'Codex also reached its limit.' : ''}`);
  return { handoff: res.ok ? 'done' : 'failed', code: ex.status, worktree: wtInfo.path, branch: wtInfo.branch, result: res.ok ? outFile : null, reason: res.ok ? null : res.kind };
}
