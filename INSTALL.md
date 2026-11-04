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
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

### Sequential Thinking — structured reasoning

Enables multi-step reasoning for architecture decisions, complex debugging, and sprint planning.

```bash
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
```

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

## 5. Verify the installation

```bash
claude mcp list
```

Every registered server should show `✓ Connected`.

```bash
claude
/team-dev --auto "test the environment"
```
