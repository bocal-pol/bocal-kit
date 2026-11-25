#!/usr/bin/env node
// Extracts the signals needed for skill gap analysis from Claude Code transcripts
// (~/.claude/projects/*/*.jsonl). Read-only. Prints JSON on stdout.
// Usage: node extract.mjs [--days 14] [--project <substring>] [--top 15]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = Number(arg('days', 14));
const FILTER = arg('project', '');
const TOP = Number(arg('top', 15));
const ROOT = join(homedir(), '.claude', 'projects');
const since = Date.now() - DAYS * 864e5;

// Masking: tokens, keys, emails, passwords, user paths.
const MASKS = [
  [/<private>[\s\S]*?<\/private>/gi, '[PRIVATE]'],
  [/\b(?:ghp|gho|sk|pk|xox[bp])[-_][A-Za-z0-9_-]{10,}/g, '[TOKEN]'],
  [/\b[A-Za-z0-9+/_-]{32,}\b/g, '[SECRET?]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]'],
  [/(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi, '$1=[MASKED]'],
  [/[A-Za-z]:\\Users\\[^\\\s]+/gi, '~'],
];
const mask = (s) => MASKS.reduce((t, [r, v]) => t.replace(r, v), s);
const clip = (s, n = 200) => (s.length > n ? s.slice(0, n) + '…' : s);
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// Messages injected by the harness, not typed by the user.
const INJECTED = /^(base directory for this skill|stop hook feedback|this session is being continued|continue from where you left off|caveat:|\[request interrupted)/i;

const CORRECTION = /^(non\b|pas ça|pas comme|arrête|stop\b|plutôt|je (n'ai|t'ai) (pas|déjà)|tu (as|a) (oublié|mal)|c'est faux|incorrect|wrong|no[, ]|don't|not what)/i;

const bump = (m, k, ex) => { const e = m.get(k) || { n: 0, projects: new Set(), sample: ex }; e.n++; return m.set(k, e), e; };

const prompts = new Map(), corrections = [], seqs = new Map(), skills = new Map();
let sessions = 0, userMsgs = 0;

for (const dir of readdirSync(ROOT)) {
  if (FILTER && !dir.toLowerCase().includes(FILTER.toLowerCase())) continue;
  const dpath = join(ROOT, dir);
  let files; try { files = readdirSync(dpath).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
  for (const f of files) {
    const p = join(dpath, f);
    if (statSync(p).mtimeMs < since) continue;
    sessions++;
    let prevUser = null; const tools = [];
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      if (o.isSidechain) continue;
      const c = o.message?.content;
      if (o.type === 'user') {
        const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x.type === 'text').map((x) => x.text).join(' ') : '';
        const cmd = text.match(/<command-name>\/?([^<]+)<\/command-name>/);
        if (cmd) bump(skills, cmd[1], '').projects.add(dir);
        if (!text || text.startsWith('<') || text.startsWith('[') || INJECTED.test(text.trim())) continue;
        userMsgs++;
        const k = norm(mask(text)).slice(0, 120);
        if (k.length > 25) bump(prompts, k, clip(mask(text))).projects.add(dir);
        if (CORRECTION.test(text.trim()) && prevUser) corrections.push({ project: dir, before: clip(mask(prevUser), 120), user: clip(mask(text)) });
        prevUser = text;
      } else if (o.type === 'assistant' && Array.isArray(c)) {
        for (const b of c) {
          if (b.type !== 'tool_use') continue;
          tools.push(b.name);
          if (b.name === 'Skill' && b.input?.skill) bump(skills, b.input.skill, '').projects.add(dir);
        }
      }
    }
    for (let i = 0; i + 3 <= tools.length; i++) {
      const g = tools.slice(i, i + 3);
      if (new Set(g).size === 1) continue; // Read,Read,Read is not a pattern
      bump(seqs, g.join(' > '), '').projects.add(dir);
    }
  }
}

const top = (m, min = 2) => [...m.entries()].filter(([, v]) => v.n >= min)
  .sort((a, b) => b[1].n - a[1].n).slice(0, TOP)
  .map(([key, v]) => ({ key, count: v.n, projects: v.projects.size, sample: v.sample || undefined }));

console.log(JSON.stringify({
  window_days: DAYS, sessions, user_messages: userMsgs,
  repeated_prompts: top(prompts),
  corrections: corrections.slice(0, TOP * 2),
  tool_sequences: top(seqs, 5),
  skill_usage: top(skills, 1),
}, null, 2));
