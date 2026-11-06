---
name: windows-admin
description: Windows Server and enterprise workstation administration — GPO, WSUS, shares, services, registry, optimization, PowerShell administration scripts. Full, unrestricted access.
model: claude-sonnet-5
user-invocable: true
aliases: ["/winadm"]
argument-hint: "[target: machine|server|domain] [action]"
type: framework
priority: high
scope: backend
dependencies:
  - incident-pattern
conflicts: []
---

# Windows Admin — Enterprise Windows Administration

Windows Server (2016/2019/2022) and Windows 10/11 workstation administration in an Active Directory
environment.

## Automatic pre-check

Invoke `incident-pattern` if the request involves several machines or a shared service.

## Domains covered

### GPO (Group Policy)
- Creating, modifying, linking GPOs
- Diagnostics: `gpresult /R`, `gpupdate /force`
- Resultant GPO on a user/machine

### WSUS / Updates
- Update approval
- Exclusions
- Fleet status report

### Shares and permissions
- SMB shares: `Get-SmbShare`, `New-SmbShare`
- NTFS permissions: `icacls`, `Get-Acl`
- Access auditing

### Services and processes
- Windows service management
- Startup/shutdown scripts
- Task Scheduler

### Registry
- Reading/writing keys via PowerShell
- Deploying values via GPO

### Administration scripts
- PowerShell remoting (WinRM)
- Running across a fleet of machines
- Quick inventory report

## Common system tools

```powershell
# Quick machine audit
systeminfo | Select-String "OS\|Hostname\|RAM\|Hotfix"
Get-WmiObject -Class Win32_ComputerSystem
# Force GPO
Invoke-GPUpdate -Computer $hostname -RandomDelayInMinutes 0
```

## Optional logging

Call `service-bulletin append` at the end of the intervention.
