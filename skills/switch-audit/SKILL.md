---
name: switch-audit
description: Network switch audit and configuration — Huawei VRP (primary), Cisco IOS/NX-OS, Juniper JunOS, Alcatel-Lucent SR-OS. VLAN, STP, LACP, ACL, hardening, diagnostics.
model: claude-sonnet-5
user-invocable: true
aliases: ["/sc"]
argument-hint: "<hostname|config-file> [action: audit|vlan|stp|lacp|acl|hardening]"
type: framework
priority: high
scope: infra
dependencies:
  - network-checker
conflicts: []
---

# Switch Audit — Multi-vendor Switch Configuration and Audit

Full audit and configuration of layer 2/3 switches. Huawei VRP as the primary focus, with
cross-vendor equivalences.

## Vendors covered

| Vendor | OS | Priority |
|---|---|---|
| Huawei | VRP (eNSP, CE, S-series) | Primary |
| Cisco | IOS / IOS-XE / NX-OS | Secondary |
| Juniper | JunOS | Secondary |
| Alcatel-Lucent | SR-OS, AOS | Tertiary |

## Audit modes

### VLAN
- VLAN database consistency across every switch in the topology
- Trunk / access ports correctly configured
- Native VLAN ≠ VLAN 1 (hardening)
- Is double-tagging possible?

### STP
- Active mode: PVST+ / Rapid-PVST / MSTP / RSTP
- Root bridge is intentional and explicitly configured
- PortFast + BPDU Guard on edge ports
- Ports missing PortFast that should have it

### LACP / Link Aggregation
- Consistent active/passive mode on both sides
- Same speed/duplex on every member
- Is min-links configured?
- Hash distribution (src-dst-mac vs src-dst-ip)

### ACL
- Redundant or conflicting ACLs
- `permit any any` with no log
- ACLs applied in the correct direction (in/out)
- Cleanup of orphaned ACLs

### Hardening
- SSH v2 only, Telnet disabled
- SNMP v3 or disabled
- Unused ports shut down + isolated VLAN
- CDP/LLDP limited to necessary ports
- Password complexity + enable secret
- NTP synchronized
- Remote logging configured
- Spanning-tree guard, DHCP snooping, Dynamic ARP Inspection

## Report format

```
## Switch Audit — [hostname] — [date]

### Summary
Overall status: OK / WARNING / CRITICAL

### Findings
| Severity | Category | Description | Recommendation |
|---|---|---|---|

### Recommended configuration
[Exact commands for the detected vendor]

### Rollback
[Commands to revert to the previous state]
```

## Operating principle

Claude proposes the commands — the user runs them on the equipment and pastes back the result, or
runs them via an SSH MCP if available.
