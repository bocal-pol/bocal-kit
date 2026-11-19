<#
.SYNOPSIS
    Automatic setup for the Claude Code environment (~/.claude).

.DESCRIPTION
    Automates the procedure described in INSTALL.md:
      Phase 0   — System prerequisites: winget, Git, Node.js, Python, PHP,
                  Docker Desktop, Claude Code CLI (installed if missing)
      Phase 1   — Deploy the bocal-kit repo to ~/.claude
      Phase 2   — Required MCP servers (context7, sequential-thinking)
      Phase 3   — Optional MCP servers (playwright)
      Phase 4   — Graphify (project mapping)
      Phase 4b  — Floorplan (interactive HTML codebase map, Claude Code plugin)
      Phase 4c  — Codex in WSL (@openai/codex CLI; review/task delegation; login explained)
      Phase 5   — Headroom (token usage reduction)
      Phase 5b  — brag (FFmpeg + Hyperframes check for the launch video)
      Phase 6   — Final check and summary

.PARAMETER ForceClone
    If ~/.claude exists but is not the bocal-kit repo, back it up to
    ~/.claude.bak-<timestamp> then clone the repo in its place.
    Without this parameter, the script never overwrites an existing ~/.claude.

.NOTES
    Works on Windows PowerShell 5.1 — idempotent, safe to run again.
    Run it with: powershell -ExecutionPolicy Bypass -File .\install.ps1
#>

[CmdletBinding()]
param(
    [switch]$ForceClone
)

$ErrorActionPreference = 'Continue'
$script:Results      = @()
$script:PathChanged  = $false
$script:DockerFresh  = $false
$script:McpList      = ''

# ----------------------------------------------------------------- Helpers --

function Write-Step {
    param(
        [ValidateSet('OK', 'INSTALL', 'SKIP', 'WARN', 'FAIL', 'INFO')]
        [string]$Status,
        [string]$Message
    )
    $colors = @{
        OK = 'Green'; INSTALL = 'Cyan'; SKIP = 'DarkGray'
        WARN = 'Yellow'; FAIL = 'Red'; INFO = 'White'
    }
    Write-Host ("[{0}] " -f $Status.PadRight(7)) -ForegroundColor $colors[$Status] -NoNewline
    Write-Host $Message
}

function Add-Result {
    param([string]$Component, [string]$Status, [string]$Detail = '')
    $script:Results += [PSCustomObject]@{
        Component = $Component
        Status    = $Status
        Detail    = $Detail
    }
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-NativeCommand {
    # Prefer .cmd/.exe shims over .ps1: unsigned .ps1 shims (npm) are blocked
    # when a GPO enforces AllSigned.
    param([string]$Name)
    foreach ($ext in @('.cmd', '.exe', '.bat')) {
        $cmd = Get-Command ($Name + $ext) -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Update-SessionPath {
    # Reloads PATH (Machine + User) to pick up freshly installed binaries.
    # ExpandEnvironmentVariables is required: the registry stores values like
    # %APPDATA%\npm or %ProgramFiles%\Git\cmd that aren't expanded by default.
    $machine  = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user     = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = [Environment]::ExpandEnvironmentVariables($machine + ';' + $user)
}

function Install-WithWinget {
    param([string]$PackageId, [string]$DisplayName, [switch]$SuppressResult)
    Write-Step INSTALL "$DisplayName missing — installing via winget ($PackageId)..."
    # Out-Host: shows winget output without polluting the function's return value
    # (otherwise the returned boolean becomes an array, always "truthy")
    winget install --id $PackageId -e --accept-package-agreements --accept-source-agreements --silent | Out-Host
    if ($LASTEXITCODE -eq 0) {
        $script:PathChanged = $true
        Update-SessionPath
        Write-Step OK "$DisplayName installed."
        if (-not $SuppressResult) { Add-Result $DisplayName 'installed' "winget $PackageId" }
        return $true
    }
    Write-Step FAIL "Failed to install $DisplayName (winget exit $LASTEXITCODE)."
    if (-not $SuppressResult) { Add-Result $DisplayName 'failed' "winget exit $LASTEXITCODE" }
    return $false
}

function Confirm-Prerequisite {
    # Checks a command exists, otherwise installs it via winget
    param([string]$Command, [string]$DisplayName, [string]$WingetId)
    if (Test-CommandExists $Command) {
        $version = (& $Command --version | Select-Object -First 1)
        Write-Step OK "$DisplayName already present ($version)."
        Add-Result $DisplayName 'OK' "$version"
        return $true
    }
    return (Install-WithWinget -PackageId $WingetId -DisplayName $DisplayName)
}

function Add-McpServer {
    # Registers an MCP server unless it already shows up in `claude mcp list`
    param([string]$Name, [string[]]$AddArgs)
    if ($script:McpList -match "(?im)^\s*$([regex]::Escape($Name))\s*:") {
        Write-Step SKIP "MCP '$Name' already registered."
        Add-Result "MCP $Name" 'already present'
        return
    }
    Write-Step INSTALL "Registering MCP server '$Name'..."
    # User scope by default — without it, `claude mcp add` registers the server only for
    # the current folder, and it's missing from every other project.
    $scopeArgs = if ($AddArgs -contains '--scope') { @() } else { @('--scope', 'user') }
    & (Get-NativeCommand 'claude') mcp add @scopeArgs @AddArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Step OK "MCP '$Name' registered."
        Add-Result "MCP $Name" 'installed'
    } else {
        Write-Step FAIL "Failed to register MCP '$Name' (exit $LASTEXITCODE)."
        Add-Result "MCP $Name" 'failed' "claude mcp add exit $LASTEXITCODE"
    }
}

function Add-ClaudePlugin {
    # Installs a Claude Code plugin (marketplace + plugin) unless it already shows up
    # in `claude plugin list`. Idempotent.
    param([string]$Label, [string]$Marketplace, [string]$Plugin)
    $claude = Get-NativeCommand 'claude'
    if (-not $claude) {
        Write-Step FAIL "Claude Code CLI unavailable — $Label skipped."
        Add-Result $Label 'failed' 'claude CLI missing'
        return
    }
    $installed = (& $claude plugin list 2>$null) -join "`n"
    # No anchor on the line prefix: the ❯ symbol in `plugin list` decodes inconsistently
    # depending on console encoding and would break a `^\W*` anchor.
    if ($installed -match "(?m)(^|\s)$([regex]::Escape($Plugin))(\s|$)") {
        # Installed doesn't mean usable: a disabled plugin exposes no command.
        $state = [regex]::Match($installed, "(?s)(^|\s)$([regex]::Escape($Plugin))(\s|$).*?Status:\s*\S*\s*(enabled|disabled)")
        if ($state.Success -and $state.Groups[3].Value -eq 'disabled') {
            Write-Step INSTALL "Plugin $Label installed but disabled — enabling..."
            & $claude plugin enable $Plugin
            if ($LASTEXITCODE -eq 0) {
                Write-Step OK "$Label enabled (active next Claude Code session)."
                Add-Result $Label 'enabled'
            } else {
                Write-Step FAIL "claude plugin enable $Plugin failed."
                Add-Result $Label 'failed' 'plugin enable'
            }
            return
        }
        Write-Step SKIP "Plugin $Label already installed."
        Add-Result $Label 'already present'
        return
    }
    Write-Step INSTALL "Adding marketplace $Label ($Marketplace)..."
    & $claude plugin marketplace add $Marketplace
    if ($LASTEXITCODE -ne 0) {
        Write-Step FAIL "claude plugin marketplace add $Marketplace failed."
        Add-Result $Label 'failed' 'marketplace add'
        return
    }
    Write-Step INSTALL "Installing plugin $Label..."
    & $claude plugin install $Plugin
    if ($LASTEXITCODE -eq 0) {
        Write-Step OK "$Label installed (active next Claude Code session)."
        Add-Result $Label 'installed'
    } else {
        Write-Step FAIL "claude plugin install $Plugin failed."
        Add-Result $Label 'failed' 'plugin install'
    }
}

# =============================================================================
Write-Host ''
Write-Host '=== Claude Code environment setup (bocal-kit) ===' -ForegroundColor Magenta
Write-Host ''

# ------------------------------------------------ Phase 0 — System prerequisites
Write-Host '--- Phase 0: System prerequisites ---' -ForegroundColor Magenta

# Reload PATH from the registry: the parent process's PATH can be stale and
# hide tools already installed (e.g. via winget)
Update-SessionPath

# winget is required for everything else
if (-not (Test-CommandExists 'winget')) {
    Write-Step FAIL "winget not found. Install 'App Installer' from the Microsoft Store, then run this script again."
    exit 1
}
Write-Step OK 'winget available.'

# Administrator rights (needed for Docker Desktop in particular)
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin   = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Step WARN "Non-elevated session — installing Docker Desktop may trigger a UAC prompt or fail."
}

# Git (needed to clone the repo)
Confirm-Prerequisite -Command 'git' -DisplayName 'Git' -WingetId 'Git.Git' | Out-Null

# Node.js (needed for npx, the Claude CLI and MCP servers)
Confirm-Prerequisite -Command 'node' -DisplayName 'Node.js' -WingetId 'OpenJS.NodeJS.LTS' | Out-Null

# Python — Graphify needs 3.8+, Headroom needs 3.10+
# Windows gotcha: 'python' can point to a Microsoft Store shim (WindowsApps)
# that shows an install prompt instead of a version. Detect the real python.
$pythonOk = $false
$script:PythonExe = $null

function Find-RealPython {
    $candidates = @()
    # Standard commands — exclude MS Store shims
    foreach ($cmd in @('python', 'python3', 'py')) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($found -and $found.Source -notmatch 'WindowsApps') {
            $candidates += $found.Source
        }
    }
    # Common install paths
    foreach ($base in @("$env:LOCALAPPDATA\Programs\Python", 'C:\Python', 'C:\Program Files\Python')) {
        foreach ($ver in @('Python313','Python312','Python311','Python310','313','312','311','310')) {
            $p = Join-Path $base "$ver\python.exe"
            if (Test-Path $p) { $candidates += $p }
        }
    }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        try {
            $ver = (& $candidate --version 2>&1 | Select-Object -First 1)
            if ($ver -match 'Python\s+(\d+\.\d+(\.\d+)?)') {
                return [PSCustomObject]@{ Path = $candidate; Raw = $ver; Version = [version]$Matches[1] }
            }
        } catch {}
    }
    return $null
}

$pyFound = Find-RealPython
if ($pyFound) {
    if ($pyFound.Version -ge [version]'3.10') {
        Write-Step OK "Python already present ($($pyFound.Raw))."
        Add-Result 'Python' 'OK' $pyFound.Raw
        $pythonOk = $true
        $script:PythonExe = $pyFound.Path
    } else {
        Write-Step WARN "Python $($pyFound.Version) found — Headroom needs 3.10+. Installing Python 3.12..."
        if (Install-WithWinget -PackageId 'Python.Python.3.12' -DisplayName 'Python 3.12') {
            Update-SessionPath
            $pyFound2 = Find-RealPython
            if ($pyFound2 -and $pyFound2.Version -ge [version]'3.10') {
                $pythonOk = $true; $script:PythonExe = $pyFound2.Path
            }
        }
    }
} else {
    Write-Step WARN "Python 3.10+ not found (or an MS Store shim was detected) — installing Python 3.12..."
    if (Install-WithWinget -PackageId 'Python.Python.3.12' -DisplayName 'Python 3.12') {
        Update-SessionPath
        $pyFound2 = Find-RealPython
        if ($pyFound2 -and $pyFound2.Version -ge [version]'3.10') {
            $pythonOk = $true; $script:PythonExe = $pyFound2.Path
        }
    }
}

# PHP — fallback chain: winget's PHP manifests go stale fast
# (php.net archives old releases -> 404 on the manifest URL)
if (Test-CommandExists 'php') {
    $phpVersion = (php --version | Select-Object -First 1)
    Write-Step OK "PHP already present ($phpVersion)."
    Add-Result 'PHP' 'OK' "$phpVersion"
} else {
    $phpInstalled = $false
    foreach ($phpId in @('PHP.PHP.8.4', 'PHP.PHP.8.5')) {
        if (Install-WithWinget -PackageId $phpId -DisplayName "PHP ($phpId)" -SuppressResult) {
            Add-Result 'PHP' 'installed' "winget $phpId"
            $phpInstalled = $true
            break
        }
        Write-Step WARN "Package $phpId failed — trying the next version..."
    }
    if (-not $phpInstalled) {
        Write-Step FAIL 'No installable PHP winget package — install PHP manually (https://windows.php.net).'
        Add-Result 'PHP' 'failed' 'all winget packages failed'
    }
}

# Docker Desktop
$dockerDesktopExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
if ((Test-CommandExists 'docker') -or (Test-Path $dockerDesktopExe)) {
    Write-Step OK 'Docker Desktop already present.'
    Add-Result 'Docker Desktop' 'OK'
} else {
    if (Install-WithWinget -PackageId 'Docker.DockerDesktop' -DisplayName 'Docker Desktop') {
        $script:DockerFresh = $true
        Write-Step WARN 'Docker Desktop: a machine restart and/or enabling WSL2 may be required.'
    }
}

# Claude Code CLI (via npm, after Node.js)
$claudeExe = Get-NativeCommand 'claude'
if ($claudeExe) {
    $claudeVersion = (& $claudeExe --version | Select-Object -First 1)
    Write-Step OK "Claude Code CLI already present ($claudeVersion)."
    Add-Result 'Claude Code CLI' 'OK' "$claudeVersion"
} else {
    $npmExe = Get-NativeCommand 'npm'
    if ($npmExe) {
        Write-Step INSTALL 'Claude Code CLI missing — installing via npm...'
        & $npmExe install -g '@anthropic-ai/claude-code'
        Update-SessionPath
        $claudeExe = Get-NativeCommand 'claude'
        # Fallback: Update-SessionPath may not expand %APPDATA% in every case.
        # Look directly in the npm prefix (APPDATA\npm on Windows).
        if (-not $claudeExe) {
            $npmPrefix = $null
            try { $npmPrefix = (& $npmExe config get prefix 2>$null).Trim() } catch {}
            if (-not $npmPrefix) { $npmPrefix = "$env:APPDATA\npm" }
            foreach ($ext in @('.cmd', '', '.exe')) {
                $candidate = Join-Path $npmPrefix "claude$ext"
                if (Test-Path $candidate) { $claudeExe = $candidate; break }
            }
        }
        if ($claudeExe) {
            Write-Step OK 'Claude Code CLI installed.'
            Add-Result 'Claude Code CLI' 'installed'
        } else {
            Write-Step FAIL 'Claude Code CLI not found after npm install.'
            Add-Result 'Claude Code CLI' 'failed'
        }
    } else {
        Write-Step FAIL 'npm unavailable — cannot install Claude Code CLI.'
        Add-Result 'Claude Code CLI' 'failed' 'npm missing'
    }
}

# --------------------------------------------- Phase 1 — Repo ~/.claude (§1)
Write-Host ''
Write-Host '--- Phase 1: bocal-kit repo -> ~/.claude ---' -ForegroundColor Magenta

$claudeDir = Join-Path $env:USERPROFILE '.claude'
$repoUrl   = 'https://github.com/bocal-pol/bocal-kit'
$isRepo    = $false

if (Test-Path (Join-Path $claudeDir '.git')) {
    $remote = git -C $claudeDir remote get-url origin
    if ($remote -match 'bocal-kit') { $isRepo = $true }
}

if ($isRepo) {
    Write-Step SKIP '~/.claude is already the bocal-kit repo.'
    Add-Result 'Repo ~/.claude' 'already present'
} elseif (Test-Path $claudeDir) {
    if ($ForceClone) {
        $backup = "$claudeDir.bak-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
        Write-Step WARN "Existing ~/.claude backed up to $backup"
        Move-Item -Path $claudeDir -Destination $backup -Force
        git clone $repoUrl $claudeDir
        if ($LASTEXITCODE -eq 0) {
            Write-Step OK 'bocal-kit repo cloned to ~/.claude.'
            Add-Result 'Repo ~/.claude' 'installed' "backup: $backup"
        } else {
            Write-Step FAIL 'Clone failed — restoring the backup.'
            Move-Item -Path $backup -Destination $claudeDir -Force
            Add-Result 'Repo ~/.claude' 'failed' 'git clone failed'
        }
    } else {
        Write-Step WARN '~/.claude exists but is not the bocal-kit repo. Run again with -ForceClone to back it up and clone in its place.'
        Add-Result 'Repo ~/.claude' 'skipped' 'existing, not a repo — use -ForceClone'
    }
} else {
    Write-Step INSTALL "Cloning $repoUrl to ~/.claude..."
    git clone $repoUrl $claudeDir
    if ($LASTEXITCODE -eq 0) {
        Write-Step OK 'bocal-kit repo cloned to ~/.claude.'
        Add-Result 'Repo ~/.claude' 'installed'
    } else {
        Write-Step FAIL 'Repo clone failed.'
        Add-Result 'Repo ~/.claude' 'failed' 'git clone failed'
    }
}

# ------------------------------------- Phases 2 & 3 — MCP servers (§2 and §3)
Write-Host ''
Write-Host '--- Phase 2: Required MCP servers ---' -ForegroundColor Magenta

$claudeExe = Get-NativeCommand 'claude'
if ($claudeExe) {
    # List from the home folder: a repo's .mcp.json (project scope) would show
    # "already present" servers that don't exist for other projects.
    Push-Location $env:USERPROFILE
    $script:McpList = (& $claudeExe mcp list) -join "`n"
    Pop-Location

    Add-McpServer -Name 'context7' -AddArgs @(
        'context7', '--', 'npx', '-y', '@upstash/context7-mcp'
    )
    Add-McpServer -Name 'sequential-thinking' -AddArgs @(
        'sequential-thinking', '--', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking'
    )

    Write-Host ''
    Write-Host '--- Phase 3: Optional MCP servers ---' -ForegroundColor Magenta

    # Playwright — Chromium + MCP server (user scope)
    $chromiumPresent = $false
    $pwCache = Join-Path $env:LOCALAPPDATA 'ms-playwright'
    if (Test-Path $pwCache) {
        $chromiumPresent = [bool](Get-ChildItem $pwCache -Directory -Filter 'chromium-*' -ErrorAction SilentlyContinue)
    }
    if ($chromiumPresent) {
        Write-Step SKIP 'Playwright Chromium already installed.'
        Add-Result 'Playwright Chromium' 'already present'
    } else {
        Write-Step INSTALL 'Installing Chromium for Playwright...'
        & (Get-NativeCommand 'npx') playwright install chromium
        if ($LASTEXITCODE -eq 0) {
            Write-Step OK 'Chromium installed.'
            Add-Result 'Playwright Chromium' 'installed'
        } else {
            Write-Step FAIL 'Chromium installation failed.'
            Add-Result 'Playwright Chromium' 'failed'
        }
    }
    Add-McpServer -Name 'playwright' -AddArgs @(
        'playwright', 'npx', '@playwright/mcp@latest', '--scope', 'user'
    )

    # Phase 3b — ICT MCPs (filesystem + optional ssh)
    Write-Host ''
    Write-Host '--- Phase 3b: ICT MCP servers ---' -ForegroundColor Magenta

    # Filesystem — access to NetworkProfile / TechSupportProfile / ICTDirectorProfile files
    $profilBase = Split-Path $PSScriptRoot -Parent
    $fsRoots = @(
        (Join-Path $profilBase 'NetworkProfile'),
        (Join-Path $profilBase 'TechSupportProfile'),
        (Join-Path $profilBase 'ICTDirectorProfile'),
        (Join-Path $env:USERPROFILE 'Documents'),
        (Join-Path $env:USERPROFILE 'Desktop')
    ) | Where-Object { Test-Path $_ }

    if ($fsRoots.Count -gt 0) {
        $fsArgs = @('filesystem', '--', 'npx', '-y', '@modelcontextprotocol/server-filesystem') + $fsRoots
        Add-McpServer -Name 'filesystem' -AddArgs $fsArgs
    } else {
        Write-Step WARN 'No ICT profile folder found — filesystem MCP skipped.'
        Add-Result 'MCP filesystem' 'skipped' 'profile folders not found'
    }

    # SSH (optional) — direct access to network equipment. No secret to configure:
    # the target (host/user/key) is passed on each tool call, not at startup.
    Add-McpServer -Name 'mcp-server-ssh' -AddArgs @(
        'mcp-server-ssh', '--scope', 'user', '--', 'npx', '-y', 'mcp-server-ssh'
    )

} else {
    Write-Step FAIL 'Claude Code CLI unavailable — MCP phases (2 and 3) skipped.'
    Add-Result 'MCP servers' 'failed' 'claude CLI missing'
}

# ----------------------------------------------------- Phase 4 — Graphify (§4)
Write-Host ''
Write-Host '--- Phase 4: Graphify ---' -ForegroundColor Magenta

if ($pythonOk -and $script:PythonExe) {
    $py = $script:PythonExe
    & $py -m pip show graphifyy *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Step SKIP 'Graphify (graphifyy) already installed.'
        Add-Result 'Graphify' 'already present'
    } else {
        Write-Step INSTALL 'Installing graphifyy (the PyPI package has a double y)...'
        & $py -m pip install graphifyy
        if ($LASTEXITCODE -eq 0) {
            & $py -m graphify install --platform claude
            if ($LASTEXITCODE -eq 0) {
                Write-Step OK 'Graphify installed and wired into Claude.'
                Add-Result 'Graphify' 'installed'
            } else {
                Write-Step FAIL 'Graphify -> Claude integration failed.'
                Add-Result 'Graphify' 'failed' 'graphify install --platform claude'
            }
        } else {
            Write-Step FAIL 'pip install graphifyy failed.'
            Add-Result 'Graphify' 'failed' 'pip install'
        }
    }
} else {
    Write-Step FAIL 'Python 3.10+ not found — Graphify skipped.'
    Add-Result 'Graphify' 'failed' 'Python missing'
}

# --------------------------------------------------- Phase 4b — Floorplan (§4b)
Write-Host ''
Write-Host '--- Phase 4b: Floorplan ---' -ForegroundColor Magenta

Add-ClaudePlugin -Label 'Floorplan' -Marketplace 'haydenschmitty/floorplan' -Plugin 'floorplan@floorplan'

# -------------------------------------------- Phase 4c — Codex (OpenAI delegation)
Write-Host ''
Write-Host '--- Phase 4c: Codex (official OpenAI plugin) ---' -ForegroundColor Magenta

# The codex-* skills call Codex INSIDE WSL: on native Windows its sandbox blocks file
# reads and writes (confirmed). Neither Windows Codex nor the official plugin is used.
# Login (ChatGPT account) is interactive: the script can't do it, so it explains it.
function Write-CodexLoginHelp {
    Write-Host ''
    Write-Host '  ================================================================' -ForegroundColor Yellow
    Write-Host '  CODEX: ONE STEP LEFT FOR YOU — SIGN IN (~2 minutes)' -ForegroundColor Yellow
    Write-Host '  ================================================================' -ForegroundColor Yellow
    Write-Host '  Codex is an OpenAI coding assistant. It needs a ChatGPT account (the free'
    Write-Host '  plan works). Code handed to Codex is sent to OpenAI.'
    Write-Host ''
    Write-Host '  1. Turn on device-code sign-in in ChatGPT:'
    Write-Host '     Settings > Security > allow device code for Codex.'
    Write-Host '     WITHOUT THIS, SIGN-IN FAILS (red message).'
    Write-Host '  2. In a terminal:    wsl'
    Write-Host '  3. In Ubuntu:        ~/.local/bin/codex login --device-auth'
    Write-Host '  4. Open the address it shows in your browser and type the code ON THE'
    Write-Host '     WEB PAGE (not in the terminal, which just waits).'
    Write-Host '  5. Check:            ~/.local/bin/codex login status'
    Write-Host '     Expected:         Logged in using ChatGPT'
    Write-Host '  Until this is done, Claude works alone — nothing is broken.'
    Write-Host ''
}

$wslExe = Get-NativeCommand 'wsl'
if (-not $wslExe) {
    Write-Step WARN 'WSL not found — Codex skipped. To enable it: wsl --install (then restart and run this script again).'
    Add-Result 'Codex (WSL)' 'skipped' 'WSL missing — wsl --install'
} else {
    & $wslExe -e bash -lc 'test -x "$HOME/.local/bin/codex"' 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Step SKIP 'Codex already installed in WSL.'
        $codexInstalled = $true
    } else {
        & $wslExe -e bash -lc 'command -v node >/dev/null && command -v npm >/dev/null' 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Step WARN 'Node.js/npm missing in WSL (Ubuntu) — install Node in WSL, then run this script again.'
            Add-Result 'Codex (WSL)' 'skipped' 'Node missing in WSL'
            $codexInstalled = $false
        } else {
            Write-Step INSTALL 'Installing Codex in WSL (npm, ~/.local prefix, no sudo)...'
            & $wslExe -e bash -lc 'npm install -g --prefix "$HOME/.local" @openai/codex'
            & $wslExe -e bash -lc 'test -x "$HOME/.local/bin/codex"' 2>$null
            $codexInstalled = ($LASTEXITCODE -eq 0)
            if ($codexInstalled) {
                Write-Step OK 'Codex installed in WSL.'
            } else {
                Write-Step FAIL 'Codex installation in WSL failed.'
                Add-Result 'Codex (WSL)' 'failed' 'npm install in WSL'
            }
        }
    }
    if ($codexInstalled) {
        $loginOut = (& $wslExe -e bash -lc '"$HOME/.local/bin/codex" login status 2>&1') -join ' '
        if ($loginOut -match 'Logged in') {
            Write-Step OK 'Codex signed in (ChatGPT).'
            Add-Result 'Codex (WSL)' 'OK' 'signed in'
        } else {
            Write-Step WARN 'Codex installed but NOT SIGNED IN — see the box below.'
            Add-Result 'Codex (WSL)' 'sign-in required' 'codex login --device-auth in WSL'
            Write-CodexLoginHelp
        }
    }
}

# ----------------------------------------------------- Phase 5 — Headroom (§5)
Write-Host ''
Write-Host '--- Phase 5: Headroom ---' -ForegroundColor Magenta

if ($pythonOk -and $script:PythonExe) {
    $py = $script:PythonExe
    & $py -m pip show headroom-ai *> $null
    $headroomWasInstalled = ($LASTEXITCODE -eq 0)
    if ($headroomWasInstalled) {
        Write-Step SKIP 'Headroom already installed.'
        Add-Result 'Headroom' 'already present'
    } else {
        Write-Step INSTALL 'Installing headroom-ai[all]...'
        & $py -m pip install 'headroom-ai[all]'
        $headroomWasInstalled = ($LASTEXITCODE -eq 0)
        if (-not $headroomWasInstalled) {
            Write-Step FAIL 'pip install headroom-ai[all] failed.'
            Add-Result 'Headroom' 'failed' 'pip install'
        }
    }

    if ($headroomWasInstalled) {
        Update-SessionPath
        # Safety net: %APPDATA%\npm isn't always in the registry PATH — without it,
        # `headroom init` can't find `claude` via shutil.which() even when it's installed.
        $npmGlobal = Join-Path $env:APPDATA 'npm'
        if ((Test-Path $npmGlobal) -and ($env:Path -notlike "*$npmGlobal*")) {
            $env:Path += ";$npmGlobal"
        }

        $headroomExe = Get-NativeCommand 'headroom'
        if (-not $headroomExe) {
            # headroom installs into Python's Scripts/ folder — possible paths
            foreach ($candidate in @(
                (Join-Path (Split-Path $py) 'Scripts\headroom.exe'),
                (Join-Path $env:APPDATA 'Python\Python312\Scripts\headroom.exe')
            )) {
                if (Test-Path $candidate) { $headroomExe = $candidate; break }
            }
        }

        if ($headroomExe) {
            # Always (re)run the Claude Code integration — even if the package was
            # already installed, otherwise it stays "installed" but never active.
            & $headroomExe init claude
            if ($LASTEXITCODE -eq 0) {
                Write-Step OK 'Headroom wired into Claude Code (restart Claude Code to activate routing).'
                Add-Result 'Headroom' 'installed' 'Claude Code restart required'
            } else {
                Write-Step WARN "headroom init failed — Claude Code not found on this session's PATH?"
                Add-Result 'Headroom' 'warning' 'headroom init failed'
            }

            Write-Step INFO 'Headroom check:'
            & $headroomExe doctor
            if ($LASTEXITCODE -ne 0) {
                Write-Step INFO 'Proxy unreachable — starting it in the background...'
                Start-Process -FilePath $headroomExe -ArgumentList 'proxy' -WindowStyle Hidden
                Start-Sleep -Seconds 3
                & $headroomExe doctor
                if ($LASTEXITCODE -ne 0) {
                    Write-Step WARN 'headroom doctor still reports a problem (see above) — local firewall?'
                }
            }
        } else {
            Write-Step FAIL 'headroom not found after pip install.'
            Add-Result 'Headroom' 'failed' 'headroom exe missing'
        }
    }
    Write-Step WARN 'Reminder: Headroom only works in the terminal (no effect in VS Code / Claude Desktop).'
} else {
    Write-Step FAIL 'Python 3.10+ not found — Headroom skipped.'
    Add-Result 'Headroom' 'failed' 'Python missing'
}

# --------------------------------------------------------- Phase 5b — brag (§5b)
Write-Host ''
Write-Host '--- Phase 5b: brag (launch video) ---' -ForegroundColor Magenta

# FFmpeg — needed by Hyperframes to encode/probe video (brag skill)
if (Test-CommandExists 'ffmpeg') {
    $ffmpegVersion = (ffmpeg -version | Select-Object -First 1)
    Write-Step OK "FFmpeg already present ($ffmpegVersion)."
    Add-Result 'FFmpeg' 'OK' "$ffmpegVersion"
} else {
    Install-WithWinget -PackageId 'Gyan.FFmpeg' -DisplayName 'FFmpeg' | Out-Null
}

# Hyperframes CLI — no permanent install: npx fetches it on demand.
# Just run a check that flags anything missing (Node, FFmpeg, FFprobe...).
$npxExe = Get-NativeCommand 'npx'
if ($npxExe) {
    Write-Step INFO 'Hyperframes check (npx hyperframes doctor):'
    & $npxExe --yes hyperframes doctor
    if ($LASTEXITCODE -eq 0) {
        Write-Step OK 'Hyperframes working.'
        Add-Result 'Hyperframes' 'OK'
    } else {
        Write-Step WARN 'hyperframes doctor reports a problem (see above) — the brag skill may fail until FFmpeg is on the PATH.'
        Add-Result 'Hyperframes' 'warning' 'see hyperframes doctor'
    }
} else {
    Write-Step FAIL 'npx unavailable — Hyperframes check skipped.'
    Add-Result 'Hyperframes' 'failed' 'npx missing'
}

# ------------------------------------------- Phase 6 — Final check (§6)
Write-Host ''
Write-Host '--- Phase 6: Final check ---' -ForegroundColor Magenta

$claudeExe = Get-NativeCommand 'claude'
if ($claudeExe) {
    Write-Step INFO 'MCP server status (claude mcp list):'
    & $claudeExe mcp list
}

Write-Host ''
Write-Host '=== Summary ===' -ForegroundColor Magenta
$script:Results | Format-Table -AutoSize

if ($script:PathChanged) {
    Write-Step WARN 'PATH was changed: restart the terminal before using the new tools.'
}
if ($script:DockerFresh) {
    Write-Step WARN 'Docker Desktop was just installed: start it once (and restart the machine if asked).'
}
Write-Step INFO 'Recommended final test: claude then /team-dev --auto "test the environment"'

$failures = @($script:Results | Where-Object { $_.Status -eq 'failed' })
if ($failures.Count -gt 0) {
    Write-Step FAIL ("{0} component(s) failed — see the summary above." -f $failures.Count)
    exit 1
}
Write-Step OK 'Setup complete.'
exit 0
