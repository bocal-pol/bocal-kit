# Security policy

This repository is the content of `~/.claude/` on machines that use it. A flaw here doesn't
compromise a production service, but it runs on every machine that cloned it — and this folder
sits next to an authentication token.

## Reporting an issue

Open a **private** issue (Security advisory) on the repository, or contact the maintainer
directly. Don't describe the problem in a public issue until a fix is available.

In scope:

- A secret, token, password, or personal data present in a versioned file or in git history.
- A hook, script, or skill that executes a destructive command with no confirmation.
- An advertised guardrail that doesn't actually apply (the most frequent defect here: branch
  protection has stayed inert for months in the past with nothing flagging it).
- A user-specific absolute path or account identifier in a git-tracked file.

## What must never be committed

| Item | Where it belongs |
| --- | --- |
| `.credentials.json` (Claude Code OAuth token) | On the machine only — git-ignored, and `deny`-listed in `settings.json` |
| Passwords, private keys, API tokens | A secrets manager (Vault, SOPS, Docker Secrets…). **Never a `.env`**, even in local development |
| Account identifiers, employee IDs, zone names | Nowhere in a versioned file |
| `settings.local.json`, `memory/`, `projects/`, `sessions/` | On the machine — all git-ignored |

## Verify before pushing

```bash
# No user-specific absolute path in tracked files
git grep -n -E 'C:\\Users\\[A-Za-z0-9]'

# Branch guardrails respond correctly
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' | bash pre-tool-use.sh   # expected: refused
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin feature/x"}}' | bash pre-tool-use.sh # expected: allowed
```

The first command should return nothing. The second must **refuse**, the third must **let it
through** — a hook that lets everything through produces no error message.

## Sensitive content in a conversation

Wrap any token, temporary password, private URL, or client data appearing in a prompt in
`<private>…</private>` tags. That content is then excluded from cross-session memory.

## Scope

This repository provides no online service and has no supported version in the classic sense. Only
the `main` branch receives fixes.
