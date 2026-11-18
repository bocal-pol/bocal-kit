#!/usr/bin/env node
// Test integrity guard for the "fix until green" loop.
// Detects the ways of "making a suite pass" without fixing the product: deleting or disabling tests,
// removed or changed assertions, a weakened runner configuration.
//
//   node integrity.mjs check --base <ref> [--root <dir>]   exit 0 clean · 3 blocking · 4 to justify
//   node integrity.mjs selftest
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TEST_FILE =
  /(^|\/)(tests?|__tests__|specs?|e2e|cypress|playwright)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|_test\.(go|py|rb)$|(Test|Tests)\.(java|cs|php|kt)$/i;
const RUNNER_CFG =
  /(^|\/)(jest|vitest|playwright|cypress|karma)\.config\.[cm]?[jt]s$|(^|\/)(pytest\.ini|tox\.ini|phpunit\.xml(\.dist)?|\.mocharc\.[a-z]+|package\.json|Makefile|composer\.json)$|(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i;

const DECL = /\b(?:it|test)(?:\.each)?\s*\(|^\s*def\s+test_|@Test\b|\[(?:Fact|Test|TestMethod|Theory)\]|^\s*func\s+Test[A-Z_]|public\s+function\s+test[A-Z_]/gm;
const ASSERT = /\bexpect\s*\(|\bassert\w*\s*[.(]|\bassert\s|\.should\b|\bto(?:Be|Equal|Match|Throw|Have|Contain)\w*\b|\bself\.assert\w*|\bverify\s*\(/g;
const SKIP = /\.skip\s*\(|\bxit\s*\(|\bxdescribe\s*\(|\bxtest\s*\(|\.only\s*\(|\bfit\s*\(|\bfdescribe\s*\(|\btest\.fixme\b|\bit\.todo\b|@pytest\.mark\.(?:skip|xfail)|\bpytest\.skip\s*\(|\bunittest\.skip|@Ignore\b|@Disabled\b|\bt\.Skip(?:Now)?\s*\(|markTestSkipped|markTestIncomplete|\[Ignore\]/g;
// Additions that neutralize a runner: blocking.
const RUNNER_CHEAT =
  /passWithNoTests|testPathIgnorePatterns|testIgnore\b|--ignore\b|--deselect\b|continue-on-error\s*:\s*true|\|\|\s*true\b|\bexit\s+0\b|retries\s*:\s*[1-9]|--no-fail|--forceExit/;

const count = (re, s) => (s.match(re) || []).length;

function git(root, args) {
  const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`git not found: ${r.error.message}`);
  return r;
}

export function check({ root, base }) {
  const blocks = [];
  const reviews = [];
  const ns = git(root, ['diff', '--name-status', '-M', base]);
  if (ns.status !== 0) throw new Error(`git diff failed: ${ns.stderr.trim()}`);
  let checked = 0;

  for (const line of ns.stdout.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const status = parts[0][0];
    const oldPath = parts[1];
    const newPath = parts[2] ?? parts[1];
    const isTest = TEST_FILE.test(newPath) || TEST_FILE.test(oldPath);
    const isCfg = RUNNER_CFG.test(newPath);

    if (isTest && status === 'D') {
      blocks.push({ file: oldPath, rule: 'test-deleted', detail: 'test file deleted' });
      continue;
    }
    if (!isTest && !isCfg) continue;
    if (status === 'A') continue; // new file: never a workaround

    checked++;
    const before = git(root, ['show', `${base}:${oldPath}`]).stdout;
    let after = '';
    try { after = fs.readFileSync(path.join(root, newPath), 'utf8'); } catch { /* deleted */ }
    const diff = git(root, ['diff', '-U0', base, '--', newPath]).stdout.split('\n');
    const added = diff.filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    const removed = diff.filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));

    if (isCfg) {
      const bad = added.filter((l) => RUNNER_CHEAT.test(l));
      if (bad.length) blocks.push({ file: newPath, rule: 'runner-weakened', detail: bad.map((l) => l.trim()).slice(0, 3).join(' | ') });
      else if (added.length || removed.length) reviews.push({ file: newPath, rule: 'runner-config-changed', detail: 'to justify' });
      if (!isTest) continue;
    }
    if (count(SKIP, after) > count(SKIP, before)) {
      blocks.push({ file: newPath, rule: 'test-disabled', detail: `skip/only markers: ${count(SKIP, before)} → ${count(SKIP, after)}` });
    }
    if (count(DECL, after) < count(DECL, before)) {
      blocks.push({ file: newPath, rule: 'test-removed', detail: `test declarations: ${count(DECL, before)} → ${count(DECL, after)}` });
    }
    const removedAsserts = removed.filter((l) => count(ASSERT, l) > 0).length;
    if (count(ASSERT, after) < count(ASSERT, before)) {
      reviews.push({ file: newPath, rule: 'assertions-reduced', detail: `assertions: ${count(ASSERT, before)} → ${count(ASSERT, after)}` });
    } else if (removedAsserts > 0) {
      reviews.push({ file: newPath, rule: 'assertion-changed', detail: `${removedAsserts} assertion line(s) changed or removed` });
    }
  }
  return { ok: blocks.length === 0 && reviews.length === 0, blocks, reviews, files_checked: checked };
}

function selftest() {
  const results = [];
  const ck = (name, cond) => results.push({ name, ok: Boolean(cond) });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'integrity-'));
  const sh = (...a) => spawnSync('git', ['-C', tmp, ...a], { encoding: 'utf8' });
  const write = (p, c) => { fs.mkdirSync(path.dirname(path.join(tmp, p)), { recursive: true }); fs.writeFileSync(path.join(tmp, p), c); };
  const reset = () => { sh('checkout', '-q', '--', '.'); sh('clean', '-fdq'); };

  sh('init', '-q'); sh('config', 'user.email', 't@example.invalid'); sh('config', 'user.name', 't');
  write('src/a.js', 'export const a = 1;\n');
  write('tests/a.test.js', "test('a', () => { expect(a).toBe(1); });\ntest('b', () => { expect(a).toBeGreaterThan(0); });\n");
  write('package.json', '{"scripts":{"test":"jest"}}\n');
  write('jest.config.js', 'module.exports = {};\n');
  sh('add', '-A'); sh('commit', '-q', '-m', 'init');
  const run = () => check({ root: tmp, base: 'HEAD' });

  ck('clean: no change', run().ok === true);

  write('src/a.js', 'export const a = 2;\n');
  ck('product-only change: clean', run().ok === true);
  reset();

  write('tests/a.test.js', "test('a', () => { expect(a).toBe(1); });\ntest('b', () => { expect(a).toBeGreaterThan(0); });\ntest('c', () => { expect(a).toBe(1); });\n");
  ck('test added: clean', run().ok === true);
  reset();

  write('tests/a.test.js', "test.skip('a', () => { expect(a).toBe(1); });\ntest('b', () => { expect(a).toBeGreaterThan(0); });\n");
  ck('skip added: blocking', run().blocks.some((b) => b.rule === 'test-disabled'));
  reset();

  write('tests/a.test.js', "test.only('a', () => { expect(a).toBe(1); });\ntest('b', () => { expect(a).toBeGreaterThan(0); });\n");
  ck('.only added: blocking', run().blocks.some((b) => b.rule === 'test-disabled'));
  reset();

  fs.rmSync(path.join(tmp, 'tests/a.test.js'));
  ck('test file deleted: blocking', run().blocks.some((b) => b.rule === 'test-deleted'));
  reset();

  write('tests/a.test.js', "test('a', () => { expect(a).toBe(1); });\n");
  ck('test removed: blocking', run().blocks.some((b) => b.rule === 'test-removed'));
  reset();

  write('tests/a.test.js', "test('a', () => { expect(a).toBe(1); });\ntest('b', () => { /* emptied */ });\n");
  const r5 = run();
  ck('assertion emptied: to justify', r5.blocks.length === 0 && r5.reviews.some((v) => v.rule === 'assertions-reduced'));
  reset();

  write('tests/a.test.js', "test('a', () => { expect(a).toBe(2); });\ntest('b', () => { expect(a).toBeGreaterThan(0); });\n");
  ck('expected value changed: to justify', run().reviews.some((v) => v.rule === 'assertion-changed'));
  reset();

  write('jest.config.js', 'module.exports = { passWithNoTests: true };\n');
  ck('passWithNoTests added: blocking', run().blocks.some((b) => b.rule === 'runner-weakened'));
  reset();

  write('package.json', '{"scripts":{"test":"jest || true"}}\n');
  ck('"|| true" added: blocking', run().blocks.some((b) => b.rule === 'runner-weakened'));
  reset();

  write('package.json', '{"scripts":{"test":"jest --coverage"}}\n');
  const r11 = run();
  ck('config changed without cheating: to justify, not blocking', r11.blocks.length === 0 && r11.reviews.some((v) => v.rule === 'runner-config-changed'));
  reset();

  write('tests/new.test.js', "test('n', () => { expect(1).toBe(1); });\n");
  ck('new test file: clean', run().ok === true);
  fs.rmSync(tmp, { recursive: true, force: true });

  let fail = 0;
  for (const r of results) { console.log(`${r.ok ? '✓' : '✗'} ${r.name}`); if (!r.ok) fail++; }
  console.log(fail ? `\n✗ ${fail} failure(s) out of ${results.length}` : `\n✓ ${results.length}/${results.length} cases passed`);
  process.exit(fail ? 1 : 0);
}

const [cmd, ...args] = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (cmd === 'selftest') selftest();
else if (cmd === 'check') {
  const base = opt('base');
  if (!base) { console.error('usage: integrity.mjs check --base <ref> [--root <dir>]'); process.exit(2); }
  try {
    const res = check({ root: path.resolve(opt('root', '.')), base });
    console.log(JSON.stringify(res));
    process.exit(res.blocks.length ? 3 : res.reviews.length ? 4 : 0);
  } catch (e) { console.error(`ERROR: ${e.message}`); process.exit(1); }
} else { console.error('usage: integrity.mjs check --base <ref> | selftest'); process.exit(2); }
