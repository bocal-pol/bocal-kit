#!/usr/bin/env node
// PreToolUse hook of the goodnight skill. Inert while active.json does not exist.
// Fail-closed: once active, any internal error denies the call.
import fs from 'node:fs';
import { activePath, statePath, readJson, decide } from './lib.mjs';

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

if (!fs.existsSync(activePath())) process.exit(0); // inert: empty output

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    let hook = {};
    try {
      hook = JSON.parse(raw || '{}');
    } catch {
      /* unreadable input: treated as an unknown tool, so denied in stop mode */
    }
    const r = decide({
      active: readJson(activePath()),
      state: readJson(statePath()),
      now: Math.floor(Date.now() / 1000),
      tool: hook.tool_name,
      input: hook.tool_input,
    });
    if (!r.allow) deny(r.reason);
    process.exit(0);
  } catch (e) {
    deny(`Quota guard (goodnight): internal error (${e?.message ?? e}). Stopping as a precaution.`);
  }
});
