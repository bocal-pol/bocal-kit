---
name: adversarial-tester
description: "Adversarial tester: behaves like the clumsiest, weirdest and most inventive user — absurd data, silly gestures, skipped steps, bypassed rules, diverted uses — to break the system. Reads the code to find fragile assumptions, then attacks the running application on a test environment only, proves each defect, writes a regression test and fixes in a loop until green. Invoke on: break everything, test like a twisted user, do anything, adversarial tests, user chaos, functional fuzzing, robustness, weird cases, try to bypass, idiot user, break it."
model: claude-sonnet-5-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies:
  - fix-until-green
  - qa-automation
conflicts: []
---

# Adversarial tester — "what if the user did anything at all?"

A real user does not read the instructions: they paste a novel into a name field, double-click "Pay",
open step 3 through the URL, go back, or deliberately try to get around the system. This skill plays
that role to the end: stupidity as well as cunning. It **proves** defects, it does not guess them, and
it does not stop before everything is fixed and everything passes.

Difference with the other QA skills: `qa-engineer` writes the expected cases, `qa-automation` automates
them, `pentest` exploits security flaws. Here: **unexpected behavior**. When a defect touches rights
or authentication, it is handed to `security-agent` (see Phase 4).

## Optional input (if invoked from `qa-lead-agent`)

Receive: the test environment URL, the scope (journeys or modules), the project's test framework and
its full-suite command. Do not ask these again. Return the report as Markdown without writing a file.
No memorization in orchestrated mode.

## Phase 0 — Safeguards (mandatory, no exception)

Through AskUserQuestion, one question: **target** (URL), **scope** (journeys to attack), **right to
fix the code** (yes → fix loop; no → report only).

1. **Test target only**:
   `bash ~/.claude/skills/adversarial-tester/scripts/target-guard.sh check <url> [--allow <test-host>]`
   Exit ≠ 0 → **hard stop**, send nothing. A public domain is accepted only if the user designates it
   as a test environment (`--allow`); a name containing `prod`, `live` or `www` is refused even if
   designated.
2. **Safe configuration**: if the project has a `.env`, `bash …/target-guard.sh check-env <file>` — the
   script prints only key names and host names, never a value. A concern (remote database or cache,
   public SMTP, `live` payment key) → stop, ask for a test configuration.
3. **Nothing leaves**: e-mails go to a test receiver (Mailpit, MailHog), payments run in sandbox mode,
   external webhooks are cut. Otherwise: do not test the journeys that send.
4. **Isolated test data**: create two test accounts (A and B, for cross-access) and prefix everything
   created with `chaos-YYYYMMDD-`. Delete only what the tester created itself. Require a backup or
   snapshot of the test database before starting.
5. **Ceilings**: 500 requests per campaign, 10 parallel requests at most, 10 MB payload at most, 1,000
   creations at most. No denial of service, no port or network scan, no attack on the infrastructure.
6. **Mode**: the fix loop writes to the code: require `mode: dev` (or confirm each write). In
   `mode: audit`, stay within Phases 1 and 2 and say so.

## Phase 1 — Code review: where it can break

Read the scope's code (Grep/Read, excluding `node_modules/`, `vendor/`, `*.test.*`) and draw the map
**entry point × fragile assumption**: field not validated server-side, type conversion (`parseInt`),
division, unhandled `null`, assumed state ("step 2 has happened"), identifier taken from the request
with no owner check, non-atomic operation (race), missing limit (size, pagination), error message that
exposes an exception. One assumption = one attack case.

## Phase 2 — Attack plan

For each critical journey (sign-up, login, input, purchase or payment, import/export, deletion, rights
change), pick the relevant families from [`references/attack-catalog.md`](references/attack-catalog.md):
absurd data, silly behavior, bypasses, diverted uses. Prioritize by impact (money, data, rights), then
by likelihood. Present the plan before acting.

## Phase 3 — Attack

For each case: run it, note **input · expected · observed · proof**.

- **Interface: Playwright MCP, the tester's main tool.** Before the first `mcp__playwright__*` call,
  apply the MCP consent rule (`.claude/mcp-choices.json`; otherwise ask through AskUserQuestion and
  record). Navigate **only** to the host validated in Phase 0: a link that leaves the test domain is
  not followed.
  ⚠️ Fallback: if the MCP is unavailable, switch to direct requests and note it.

  | What you want to do | Playwright MCP tools |
  | --- | --- |
  | Fill anything, fast, without validation | `browser_fill_form`, `browser_type`, `browser_select_option`, `browser_press_key` |
  | Double or triple click, frantic click, hover, drag and drop | `browser_click` (double click), `browser_hover`, `browser_drag`, `browser_drop` |
  | Bypass the client (re-enable a `disabled` button, remove `required`, edit a hidden field) | `browser_evaluate` |
  | Tricky files (0 bytes, fake type, absurd name) | `browser_file_upload` |
  | Back, refresh, multiple tabs, parallel session | `browser_navigate_back`, `browser_navigate`, `browser_tabs` |
  | Network cut, slow, 500 or empty response, replayed or modified request | `browser_network_requests` to observe; interception and simulation (`network` family) to provoke |
  | Cookies and storage: removed mid-way, forged, expired session | `storage` family (cookies, `localStorage`, `sessionStorage`) |
  | Tiny window, zoom, dark mode or forced contrast | `browser_resize`, `browser_emulate_media` |
  | Unexpected dialogs (`alert`, `confirm`) | `browser_handle_dialog` |
  | What is really displayed: JS errors, exposed error trace | `browser_console_messages`, `browser_snapshot`, `browser_take_screenshot` |
  | Replayable proof of a hard-to-reproduce failure | `devtools` family (trace, video) |
  | Simple assertion (text, presence, state) | `testing` family (`browser_verify_*`) rather than reading the DOM by hand |

  The tools of the `storage`, `network`, `devtools` and `testing` families are optional depending on the
  server configuration: enable them only when the need appears.
- **API**: direct requests (`curl`) bypassing the interface; malformed bodies, extra fields, unexpected
  methods, replay and parallel sends bounded by the ceilings.
- Note **also** what holds: coverage is a result.

## Phase 4 — Confirm, classify, route

1. **Re-verify each Critical or High defect with a direct command** before reporting it (agent finding
   verification rule). Not reproduced → "unconfirmed".
2. Classify with the grid of `references/attack-catalog.md` (§ 5): minimal reproduction, capture or
   log, before/after state.
3. **Security limit**: a real flaw (reading other people's data, escalating rights, bypassing
   authentication) stops at the **minimal proof on the test accounts A and B**; never read real data
   or go further. Document it as Critical and hand it to `security-agent` (review of the fix).
4. A raw, vague error message with no possible action is a defect (the "3 elements" rule of the main
   instruction file).

## Phase 5 — Fix loop until green

For **each** confirmed defect:

1. **Write the regression test first**, which must fail: a unit or API test in the project's
   framework, or, for a defect visible in the interface, a **Playwright test** generated through the
   Skill tool with `qa-automation` (the journey that broke, replayed at every suite run).
2. Call the Skill tool with `fix-until-green`, passing it the **full-suite command** (existing tests +
   new ones), the editable scope and the test environment. The loop fixes the product, re-runs
   everything, forbids weakening a test and stops on explicit limits.
   ⚠️ Fallback: if `fix-until-green` is unavailable, apply the same loop by hand (fix, re-run the
   **whole** suite, never disable a test) and note it.
3. **Replay the whole attack campaign** that had failed: the inputs that broke must now be handled
   cleanly (clear refusal, value accepted correctly).

**Green** = the full suite passes **and** the replayed campaign no longer breaks. Otherwise the result
is "not green": list what remains, why, and the next lead. Never declare "fixed" on the strength of the
single test you just wrote.

## Phase 6 — Report

- **Standalone**: `mkdir -p quality/adversarial-tester` then write
  `quality/adversarial-tester/YYYY-MM-DD_adversarial-tester.md`.
- **Orchestrated** (from `qa-lead-agent`): return the Markdown without writing a file.

```markdown
# Adversarial tests — <target> — YYYY-MM-DD

**Verdict**: ✅ green / ❌ not green · **Cases played**: N · **Defects**: C critical, H high, M medium, L low
**Safeguards**: target <class> · requests <n>/500 · test data cleaned: yes/no

| ID | Severity | Family | Minimal reproduction | Status | Regression test |
| --- | --- | --- | --- | --- | --- |

**What holds**: (list) · **Handed to security-agent**: (list) · **Unconfirmed**: (list)
**Fix loop**: iterations, blocked causes, modified tests (justified)
```

## Phase 7 — Memorization

> ⏭️ Skip if invoked from `qa-lead-agent`.

If invoked directly: append the families that broke and the fragile journeys to `.claude/qa-knowledge.md`
under `## Adversarial — YYYY-MM-DD`. Never write a real identifier or a secret value there.

## Forbidden

Aiming at anything other than a test environment · reading or exfiltrating real data · sending real
e-mails, SMS or payments · exceeding the ceilings · deleting what the tester did not create ·
weakening a test to make it pass · declaring "green" with a red remaining · pushing code or opening a
PR from this skill.

⚠️ Fallback: if `target-guard.mjs` cannot run (Node missing), do **not** attack: without a target
guard, the safety of the environment is not established.
