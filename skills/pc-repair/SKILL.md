---
name: pc-repair
description: Diagnosis and repair of Windows workstations — BSOD, slowness, boot issues, OS corruption, disks, RAM, overheating. Full access to diagnostic tools, PowerShell, multi-machine scripts. Automatic incident-pattern pre-check.
model: claude-sonnet-5
user-invocable: true
aliases: ["/pc"]
argument-hint: "<symptom or target machine>"
type: framework
priority: high
scope: backend
dependencies:
  - incident-pattern
conflicts: []
---

# PC Repair — Windows Workstation Diagnosis and Repair

Full diagnosis and repair of failures on enterprise Windows 10/11 workstations.

## Automatic pre-check

Before any analysis: invoke `incident-pattern` to detect whether other machines show similar symptoms (infrastructure issue vs. isolated failure).

## Phase 1 — Collection

- Machine (hostname / IP) and user
- Main symptom
- Since when? Following what? (update, install, a drop?)
- Physical or remote access available?

## Phase 2 — Diagnosis

### Boot / BSOD
```powershell
Get-EventLog -LogName System -Newest 50 | Where-Object {$_.EntryType -eq "Error"}
Get-EventLog -LogName Application -Newest 20 | Where-Object {$_.EntryType -eq "Error"}
# Minidump analysis
Get-ChildItem C:\Windows\Minidump -ErrorAction SilentlyContinue
```

### Slowness / CPU / RAM
```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 20
Get-WmiObject -Class Win32_OperatingSystem | Select-Object FreePhysicalMemory,TotalVisibleMemorySize
```

### Disk
```powershell
Get-PSDrive C | Select-Object Used,Free
wmic diskdrive get Status,Model
```

### Temperature / overheating
```powershell
Get-WmiObject -Namespace "root\WMI" -Class MSAcpi_ThermalZoneTemperature
```

## Phase 3 — Corrective actions

Common actions with no restriction: sfc /scannow, DISM, chkdsk, profile cleanup, driver uninstall, system restore, reimaging.

## Optional save

Call `service-bulletin append` at the end of the intervention.
