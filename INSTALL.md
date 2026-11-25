# Installation — new machine

Full procedure to deploy `~/.claude` on a new Windows machine.

> **⚡ Automatic installation**: the whole procedure below can be run in a single command via the
> [`install.ps1`](install.ps1) script:
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\install.ps1
> ```
>
> The script also checks for and installs missing prerequisites (Node.js, Python, PHP, Docker
> Desktop, Git, Claude Code CLI). The Hugging Face MCP servers (image + video, free) are
> registered; OAuth authentication completes on first call (see §3). If `~/.claude` already exists
> without being the `bocal-kit` repo, add `-ForceClone` to back it up and then clone in its place.
>
> **Machine locked by GPO** (`MachinePolicy = AllSigned`): `-ExecutionPolicy Bypass` is ignored —
> run the script instead via:
>
> ```powershell
> powershell -NoProfile -Command "& ([scriptblock]::Create((Get-Content -Raw .\install.ps1)))"
> ```
>
> The sections below remain the reference for a manual, step-by-step installation.

---

## 1. Make `~/.claude` a git checkout of the repository

`~/.claude` **is** the repository: no more copy to sync by hand. Runtime files
(`.credentials.json`, `projects/`, `memory/`, `sessions/`, `settings.local.json`,
`skills/synced/`…) are covered by `.gitignore` and are never touched by git.

### Case A — `~/.claude` already exists (a machine in active use)

Do **not** move the folder: the OAuth token and history stay in place.

```bash
cd ~/.claude
git init
git remote add origin https://github.com/bocal-pol/bocal-kit.git
git fetch origin
git checkout -f -B main origin/main           # replaces versioned files, leaves the rest alone
git status --short                            # expected: empty
```

If `git status` lists untracked files, those are local additions: either commit them on a
`feature/*` branch, or add them to `.gitignore` if they're machine-specific.

### Case B — a fresh machine

```bash
git clone https://github.com/bocal-pol/bocal-kit ~/.claude
cd ~/.claude && git checkout main
```

Then launch `claude` once to create `.credentials.json` via authentication.

### Updating

```bash
cd ~/.claude && git pull
```

> **PATH prerequisite (Windows)**: `git` and `bash` must point to Git for Windows in the PowerShell
> PATH (`Get-Command git`, `Get-Command bash`). If `bash` resolves to
> `C:\Windows\system32\bash.exe` (WSL), hook-verification commands fail in PowerShell even though
> Claude Code — which uses Git Bash internally — works fine. Add `%LOCALAPPDATA%\Programs\Git\cmd`
> and `...\Git\bin` to the front of the user PATH.

---

## 2. MCP — required servers

### Context7 — up-to-date documentation

Provides live library documentation (React, Laravel, Angular…), instead of potentially stale
training data.

```bash
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
```

### Sequential Thinking — structured reasoning

Enables multi-step reasoning for architecture decisions, complex debugging, and sprint planning.

```bash
claude mcp add --scope user sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

> **`--scope user` is required**, as for the servers in the next section. Without it, `claude mcp add`
> registers the server for the current folder only. The server is then missing in all other projects.
> Check from a folder outside the repo: `cd ~ && claude mcp list`.

---

## 3. MCP — optional servers

### Hugging Face — image & video generation (free)

Used by the `imagine` (image), `animate` (video), `design-agent`,
`public-communications-agent`, `technical-artist`, `dev-advocate` skills/agents. Free (ZeroGPU
quotas). Two hosted HTTP servers, **browser OAuth** auth on first call.

**Step 1 — register the MCP servers**:

```bash
claude mcp add --transport http hf-image "https://huggingface.co/mcp?gradio=mcp-tools/Z-Image-Turbo" --scope user
claude mcp add --transport http hf-t2v   "https://huggingface.co/mcp?gradio=Lightricks/ltx-video-distilled" --scope user
```

**Step 2 — authenticate** (once, free HF account):

```bash
claude mcp login hf-image
claude mcp login hf-t2v
```

> No hardcoded key: auth goes through OAuth. An `HF_TOKEN` (hf.co/settings/mcp) raises the ZeroGPU
> quotas.
>
> **`--scope user` is required.** The `~/.claude/.mcp.json` file versioned in this repo is a
> *project*-scoped file: Claude Code only reads it when the current directory is `~/.claude`
> itself. Without `--scope user`, `imagine` and `animate` find no HF server in a real project.
> Verify with: `claude mcp list` should show `hf-image` and `hf-t2v` from any folder.

### Notion — report publishing (`skill-gap-analyzer` skill)

Hosted MCP server from Notion, browser **OAuth** authentication. No local install: a Notion account is enough.
The skill creates a private draft page with its report. Without Notion, it writes a local file.

**Step 1 — Register the server** (done by `install.ps1`):

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp --scope user
```

**Step 2 — Authenticate** (once): in Claude Code, run `/mcp`, pick `notion`, then `Authenticate`.

> What Notion receives: the report content only (short excerpts, secrets masked).
> Verify with: `cd ~ && claude mcp list` should show `notion`.

### Playwright — interactive E2E tests

Required by the `qa-automation` skill for real-time navigation and screenshots.

**Step 1 — install Chromium**:

```bash
npx playwright install chromium
```

**Step 2 — register the MCP server (user scope)**:

```bash
claude mcp add playwright npx @playwright/mcp@latest --scope user
```

---

## 4. Graphify — project mapping

Required by the `project-graph` skill (invoked automatically by `team-dev` in every session).
Generates a knowledge graph of the current project (god nodes, connections, HTML visualization).

**Prerequisite**: Python 3.8+ installed.

```bash
pip install graphifyy
python -m graphify install --platform claude
```

> The PyPI package is called `graphifyy` (double y) — the CLI command stays `graphify`.

---

## 4c. Codex — second opinion and task delegation (OpenAI)

Used by the skills `codex-delegate` (small bug, broken test), `codex-review` (review → inconsistency
report), `codex-explore` (read-only exploration), `transfer` (hand over when Claude reaches its
limit) and the mode `/team-dev --codex`. **Codex is optional.** Without it, Claude does the work
itself.

> ⚠️ **Privacy.** The code you give to Codex is sent to OpenAI. Each send asks for your consent. Do
> not use it on a repository that contains secrets or code that must not leave your machine.

### Why WSL

Under native Windows, the sandbox of Codex blocks reading and writing files (observed). Codex must
therefore run **inside WSL** (Ubuntu). These skills use neither the Windows Codex nor the official
plugin `codex@openai-codex`: the plugin always starts the Windows Codex.

### Installation

The script `install.ps1` is not yet ported into this repository (see `PENDING-WORK.md`). Install
Codex by hand, in Ubuntu:

```bash
npm install -g --prefix "$HOME/.local" @openai/codex
```

Prerequisites: WSL with Ubuntu (`wsl --install`), Node.js and npm inside Ubuntu.

### ⚠️ Login — the step people miss

**The installation is not enough: you must log in once, with a ChatGPT account** (the free plan is
enough, with limited quotas). A script cannot do it for you, because the login is interactive.

1. **Enable device code login in ChatGPT**: *Settings → Security* → allow the device code for Codex.
   **Without this setting, the login fails** with a red message.
2. Open Ubuntu: `wsl`.
3. Run: `~/.local/bin/codex login --device-auth`. A code appears.
4. Open the address shown **in your browser** and type the code **on the web page**, not in the
   terminal. The terminal must only wait. Click *Continue*.
5. Check: `~/.local/bin/codex login status` must show `Logged in using ChatGPT`.

Until this is done, the `codex-*` skills say so clearly and Claude works alone. Never copy the file
`~/.codex/auth.json` from Windows to WSL: log in inside WSL.

### Quota

If Codex reaches its limit, Claude takes the task back automatically and tries Codex again at the next
use. The state is in `~/.claude/codex/state.json` (local, ignored by git).

### Verify

```bash
bash ~/.claude/skills/codex-bridge/scripts/codex-bridge.sh check
```

Or `/team-dev --codex status`.

---

## 5. Verify the installation

```bash
claude mcp list
```

Every registered server should show `✓ Connected`.

```bash
claude
/team-dev --auto "test the environment"
```
