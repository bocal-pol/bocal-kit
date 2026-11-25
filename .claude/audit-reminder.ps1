# audit-reminder.ps1 - forces a /claude-api prompt-audit run at session end
# when files on the prompt surface (CLAUDE.md, primer.md, hindsight.md,
# skills/, agents/) have been modified in this session and not yet audited.
#
# Run by this repo's Stop hook (.claude/settings.json).
# Blocks session end EXACTLY ONCE per change set: a marker
# (.claude/tmp/.audit-reminded-<hash>) remembers that the audit has already
# been requested for the current state of the repo, to avoid an infinite
# Stop loop.
#
# Exit codes: 0 = nothing to report or already done, 2 = blocks session end
# and passes the instruction to the model via stderr (Claude Code's Stop
# hook mechanism).
# Portable: no hardcoded user path, PowerShell 5.1, no external module.
# No em dash and no curly quote in this file (misread as ANSI they produce
# stray string delimiters).

$ErrorActionPreference = 'SilentlyContinue'

function Find-Git {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("$env:LOCALAPPDATA\Programs\Git\cmd\git.exe", "$env:ProgramFiles\Git\cmd\git.exe")) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$git  = Find-Git
$repo = (Get-Location).Path

if (-not $git) {
    exit 0
}

if (-not (Test-Path (Join-Path $repo '.git'))) {
    exit 0
}

# Files with a real content diff (tracked, modified with actual changes, not
# just a line ending that core.autocrlf marks "modified" in status --porcelain
# with zero real diff) or untracked, touching the prompt surface.
$paths = @('CLAUDE.md', 'primer.md', 'hindsight.md', 'skills', 'agents', 'PRODUCT-RULES.md')
$modified  = @(& $git -C $repo diff --name-only -- $paths 2>$null)
$staged    = @(& $git -C $repo diff --cached --name-only -- $paths 2>$null)
$untracked = @(& $git -C $repo ls-files --others --exclude-standard -- $paths 2>$null)
$changed = @($modified + $staged + $untracked | Sort-Object -Unique)

# Only prompt text files count (.md). A script (.mjs, .ps1, .sh) or a data file under skills/ is not
# prompt surface: auditing it loaded the very heavy claude-api skill for nothing.
$changed = @($changed | Where-Object { $_ -like '*.md' })

if ($changed.Count -eq 0) {
    exit 0
}

# Marker keyed on the current change set: an MD5 hash of the changed-file
# list, so the audit is only requested once while these same files stay
# changed the same way (and requested again if new changes are added).
$statusHash = ($changed -join "`n") | Out-String
$hashObj = [System.Security.Cryptography.MD5]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($statusHash)
$hash = [BitConverter]::ToString($hashObj.ComputeHash($bytes)).Replace('-', '').Substring(0, 12)

$tmpDir = Join-Path $repo '.claude\tmp'
if (-not (Test-Path $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}
$marker = Join-Path $tmpDir ".audit-reminded-$hash"

if (Test-Path $marker) {
    exit 0
}

New-Item -ItemType File -Path $marker -Force | Out-Null

[Console]::Error.WriteLine("Files on bocal-kit's prompt surface were modified in this session ($($changed.Count) file(s): CLAUDE.md, primer.md, hindsight.md, skills/, or agents/). Before closing, call the Skill tool with claude-api and the prompt-audit argument to check that no dated pattern was introduced or left behind. Do not ask again for this same change set.")
exit 2
