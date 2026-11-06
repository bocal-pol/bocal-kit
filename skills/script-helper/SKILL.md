---
name: script-helper
description: Generation and debugging of PowerShell, Bash, and Python scripts for system administration. Automation of repetitive tasks, reporting, scheduling, deployment. Full unrestricted shell access.
model: claude-sonnet-5
user-invocable: true
aliases: ["/script"]
argument-hint: "[language: ps|bash|python] [script goal]"
type: framework
priority: medium
scope: backend
dependencies: []
conflicts: []
---

# Script Helper — System Administration Scripts

Generation and debugging of scripts for system and network task automation.

## Languages covered

| Language | Preferred context |
|---|---|
| PowerShell 5.1 / 7 | Windows administration, AD, Exchange, WSUS, Intune |
| Bash | Linux (Debian/RHEL), network automation, cron |
| Python 3 | Data processing, APIs, cross-platform automation |

## Phase 1 — Gathering

1. Script goal (task to automate)
2. Environment (Windows / Linux / both)
3. Input (CSV file, list, parameter, API?)
4. Expected output (CSV, email, log, screen, direct action)
5. Run frequency (one-shot, scheduled, event-driven)

## Phase 2 — Generation

Typical PowerShell structure:
```powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$TargetOU,
    [string]$OutputPath = "C:\Reports\output.csv"
)

$ErrorActionPreference = "Stop"

try {
    # Script body
} catch {
    Write-Error "Failed: $_"
    exit 1
}
```

Typical Bash structure:
```bash
#!/bin/bash
set -euo pipefail

LOGFILE="/var/log/script.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

main() {
    log "Start"
    # Body
    log "End"
}

main "$@"
```

## Phase 3 — Scheduling

### Windows (Task Scheduler)
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Scripts\myscript.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "06:00"
Register-ScheduledTask -TaskName "MyScript" -Action $action -Trigger $trigger -RunLevel Highest
```

### Linux (cron)
```bash
# Every day at 6am
0 6 * * * /opt/scripts/myscript.sh >> /var/log/myscript.log 2>&1
```

## Storage

Scripts under `scripts/[category]/[name].ps1` or `.sh`
