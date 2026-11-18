#!/usr/bin/env node
// Target guard of the adversarial tester: refuses anything that looks like production.
// No network request, no DNS resolution: classification by the shape of the address.
//
//   node target-guard.mjs check <url|host> [--allow host1,host2]    exit 0 allowed · 3 refused · 2 usage
//   node target-guard.mjs check-env <.env file>                     exit 0 clean · 3 concerns
//   node target-guard.mjs selftest
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROD_WORDS = /(^|[.\-_])(prod|production|live|www)([.\-_]|$)/i;
const LOCAL_SUFFIX = /\.(localhost|local|test|invalid|example|internal|lan)$/i;

function ipv4(h) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((n) => n >= 0 && n <= 255) ? o : null;
}

/** Returns { kind: 'local'|'private'|'allowlisted'|'public'|'prod-like', reason }. */
export function classify(input, allow = []) {
  let host = String(input ?? '').trim();
  try { host = new URL(/^[a-z]+:\/\//i.test(host) ? host : `http://${host}`).hostname; } catch { /* raw host */ }
  host = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return { kind: 'public', host, reason: 'empty or unreadable target' };

  if (host === 'localhost' || host === '::1' || host === 'host.docker.internal' || host.endsWith('.localhost')) {
    return { kind: 'local', host, reason: 'loopback' };
  }
  const ip = ipv4(host);
  if (ip) {
    const [a, b] = ip;
    if (a === 127) return { kind: 'local', host, reason: 'loopback' };
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return { kind: 'private', host, reason: 'private network' };
    }
    return { kind: 'public', host, reason: 'public IP address' };
  }
  if (/^(fc|fd|fe80)/.test(host) && host.includes(':')) return { kind: 'private', host, reason: 'private IPv6' };
  if (LOCAL_SUFFIX.test(host)) return { kind: 'local', host, reason: 'test or local suffix' };

  if (PROD_WORDS.test(host)) return { kind: 'prod-like', host, reason: 'the name suggests production (prod, live, www)' };
  if (allow.map((a) => a.toLowerCase()).includes(host)) {
    return { kind: 'allowlisted', host, reason: 'test environment explicitly designated by the user' };
  }
  return { kind: 'public', host, reason: 'public domain not designated as a test environment' };
}

export const isAllowed = (c) => ['local', 'private', 'allowlisted'].includes(c.kind);

/** Reads a .env WITHOUT ever printing a value: only key names and host names. */
export function checkEnv(file) {
  const concerns = [];
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(raw);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (/(sk|pk|rk)_live_/.test(val)) concerns.push({ key, issue: 'PRODUCTION payment key (live)' });
    else if (/^(PAYPAL|STRIPE|PAYMENT).*(MODE|ENV)$/i.test(key) && /^live$/i.test(val)) {
      concerns.push({ key, issue: '"live" payment mode' });
    } else if (/^(DB_HOST|DATABASE_URL|DB_URL|REDIS_HOST|REDIS_URL|MAIL_HOST|SMTP_HOST|MAILER_DSN|[A-Z_]*_API_URL|APP_URL)$/.test(key)) {
      const c = classify(val.includes('://') || /^[\w.-]+(:\d+)?$/.test(val) ? val : '');
      if (val && !isAllowed(c) && c.host) concerns.push({ key, issue: `non-local host: ${c.host} (${c.reason})` });
    }
  }
  return concerns;
}

function selftest() {
  const results = [];
  const ck = (n, c) => results.push({ name: n, ok: Boolean(c) });
  const k = (x, allow) => classify(x, allow).kind;
  ck('localhost allowed', isAllowed(classify('http://localhost:3000')));
  ck('127.0.0.1 allowed', k('127.0.0.1') === 'local');
  ck('IPv6 ::1 allowed', k('http://[::1]:8080/') === 'local');
  ck('private network 192.168.x allowed', k('192.168.1.20') === 'private');
  ck('private network 10.x allowed', k('10.4.5.6') === 'private');
  ck('172.16–31 allowed', k('172.20.0.1') === 'private');
  ck('172.32 is public', k('172.32.0.1') === 'public');
  ck('public IP refused', !isAllowed(classify('8.8.8.8')));
  ck('app.test allowed', k('https://app.test') === 'local');
  ck('public domain refused', !isAllowed(classify('https://mysite.be')));
  ck('public domain refused even without scheme', !isAllowed(classify('mysite.be')));
  ck('public staging refused without allowlist', !isAllowed(classify('https://staging.mysite.be')));
  ck('public staging allowed if designated', k('https://staging.mysite.be', ['staging.mysite.be']) === 'allowlisted');
  ck('www refused even if designated', !isAllowed(classify('https://www.mysite.be', ['www.mysite.be'])));
  ck('"prod" refused even if designated', !isAllowed(classify('https://api-prod.mysite.be', ['api-prod.mysite.be'])));
  ck('"production" refused', k('production.mysite.be') === 'prod-like');
  ck('empty target refused', !isAllowed(classify('')));
  ck('trick localhost.evil.com refused', !isAllowed(classify('http://localhost.evil.com')));
  ck('trick 127.0.0.1.evil.com refused', !isAllowed(classify('http://127.0.0.1.evil.com')));
  ck('misleading userinfo localhost@evil.com refused', !isAllowed(classify('http://localhost@evil.com/')));
  ck('169.254 (link-local) treated as private', k('169.254.1.1') === 'private');
  ck('invalid address 256.1.1.1 refused', !isAllowed(classify('256.1.1.1')));

  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-'));
  const f = path.join(d, '.env');
  fs.writeFileSync(f, [
    'APP_NAME=demo', 'DB_HOST=127.0.0.1', 'DB_PASSWORD=do-not-print-this-secret', 'MAIL_HOST=smtp.gmail.com',
    'STRIPE_SECRET=sk_live_ABCDEF123', 'REDIS_HOST=redis.prod.mysite.be', 'APP_URL=http://localhost:8000',
  ].join('\n'));
  const out = checkEnv(f);
  const dump = JSON.stringify(out);
  ck('.env: local host clean', !out.some((c) => c.key === 'DB_HOST' || c.key === 'APP_URL'));
  ck('.env: public SMTP flagged', out.some((c) => c.key === 'MAIL_HOST'));
  ck('.env: live payment key flagged', out.some((c) => c.key === 'STRIPE_SECRET'));
  ck('.env: production Redis flagged', out.some((c) => c.key === 'REDIS_HOST'));
  ck('.env: no secret value printed', !/do-not-print-this-secret|ABCDEF123/.test(dump));
  fs.rmSync(d, { recursive: true, force: true });

  let fail = 0;
  for (const r of results) { console.log(`${r.ok ? '✓' : '✗'} ${r.name}`); if (!r.ok) fail++; }
  console.log(fail ? `\n✗ ${fail} failure(s) out of ${results.length}` : `\n✓ ${results.length}/${results.length} cases passed`);
  process.exit(fail ? 1 : 0);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'selftest') selftest();
else if (cmd === 'check' && args[0]) {
  const i = args.indexOf('--allow');
  const allow = i >= 0 ? String(args[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean) : [];
  const c = classify(args[0], allow);
  console.log(JSON.stringify({ allowed: isAllowed(c), ...c }));
  process.exit(isAllowed(c) ? 0 : 3);
} else if (cmd === 'check-env' && args[0]) {
  try {
    const concerns = checkEnv(args[0]);
    console.log(JSON.stringify({ clean: concerns.length === 0, concerns }));
    process.exit(concerns.length ? 3 : 0);
  } catch (e) { console.error(`ERROR: ${e.message}`); process.exit(1); }
} else {
  console.error('usage: target-guard.mjs check <url|host> [--allow h1,h2] | check-env <.env> | selftest');
  process.exit(2);
}
