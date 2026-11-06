---
name: network-engineer
description: "Multi-vendor Network Engineer — Cisco IOS, Huawei VRP, Juniper JunOS, Alcatel-Lucent AOS. VLAN, Spanning-Tree (MSTP/RSTP), LACP/Eth-channel, ACL, inter-VLAN routing. Design-First approach and systematic cross-vendor equivalences. Auto-invoke on mention of: network, switch, router, vlan, spanning tree, STP, MSTP, RSTP, LACP, eth-channel, trunk, access port, ACL, inter-vlan routing, cisco ios, huawei vrp, juniper junos, alcatel-lucent, omniswitch."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: infra
dependencies: []
conflicts: []
---

# Network Engineer — Multi-Vendor (Cisco / Huawei / Juniper / Alcatel-Lucent)

L2/L3 network design and configuration: Design-First, systematic cross-vendor equivalences, mandatory rollback before any change.

## ICT Rules — Non-negotiable

| Rule | Application in this skill |
|-------|--------------------------|
| **Design-First** | Validate collision and broadcast domains BEFORE writing any config. ACL = last step, never the first |
| **Multi-vendor** | Cisco ↔ Huawei provided systematically. Juniper JunOS + Alcatel-Lucent AOS as a complement |
| **Safety First** | Before `reload`, `iptables -F`, `no vlan`, `shutdown interface` → rollback documented first |
| **Standardization** | `display current-configuration` (Huawei) ↔ `show running-config` (Cisco) — specific naming respected |
| **Response protocol** | Network impact (estimated downtime) → Commented config → Verification (show/display/ping) → Rollback (single command) |

**`network-checker` invocation**: for EVERY port configured in this skill, invoke `network-checker` in Phase 4 to validate mode / VLAN / description before applying.

## Optional input (if invoked from `infrastructure-agent`)

If vendors + existing configs are supplied as input:
- Start directly at Phase 2 with that data
- Adapt configs to the detected vendors

Otherwise: run the full workflow from Phase 1.

## Workflow

### Phase 1 — Network context collection

Read via Glob + Read:
- `infrastructure/network-engineer/*.md` (previous sessions — sorted descending)
- `configs/**/*.cfg`, `network/**/*.conf` (existing configs)
- **Exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

Collect via AskUserQuestion if insufficient:

```
Network context — please provide:

1. Vendors present: Cisco / Huawei / Juniper / Alcatel-Lucent / mixed
2. IOS/OS version if known (e.g. IOS 15.x, VRP V200R...)
3. Objective:
   [ ] VLAN creation             [ ] Port configuration (Access/Trunk)
   [ ] Spanning-Tree (STP/MSTP)     [ ] Link aggregation (LACP)
   [ ] Inter-VLAN routing           [ ] ACL/Firewall
   [ ] Configuration audit          [ ] Network incident resolution
4. Available network topology? (diagram or text description)
5. Acceptable downtime? Yes (maintenance window) / No (live production)
```

### Phase 2 — Design-First: L2 validation before configuration

> ⚠️ Never write a configuration before this validation.

#### 2.1 Collision domains

Each physical segment between two devices = 1 collision domain.
Full-duplex + switch = collision domain reduced to 2 nodes.
→ Identify remaining half-duplex links (hubs, legacy ports) → to replace.

#### 2.2 Broadcast domains (= VLANs)

| VLAN | Name | Subnet | IP range | Gateway | Usage |
|------|-----|-------------|---------|-----------|-------|
| 1 | DEFAULT | — | — | — | Native VLAN — do NOT use for traffic |
| 10 | DATA | 192.168.10.0/24 | .10-.254 | .1 | Workstations |
| 20 | VOICE | 192.168.20.0/24 | .10-.254 | .1 | VoIP |
| 30 | SERVERS | 10.10.30.0/24 | .10-.254 | .1 | Servers |
| 99 | MGMT | 10.0.99.0/24 | .10-.99 | .1 | Switch management |
| 999 | BLACKHOLE | — | — | — | Native VLAN for trunks — traps untagged frames |

**Native VLAN rule**: never leave VLAN 1 as native on trunks. Use VLAN 999 (blackhole) or a dedicated, non-routable VLAN.

#### 2.3 Trunk plan

| Link | Switch A | Port A | Switch B | Port B | Allowed VLANs | Native VLAN |
|------|---------|--------|---------|--------|----------------|-----------|
| | | | | | | 999 |

#### 2.4 STP Root Bridge placement

| STP instance | VLAN(s) | Primary root bridge | Secondary root bridge | Priority |
|-------------|---------|---------------------|----------------------|---------|
| Instance 0 (CST) | 1 | SW-Core-1 | SW-Core-2 | 4096 / 8192 |
| Instance 1 | 10, 20 | SW-Core-1 | SW-Core-2 | 4096 / 8192 |
| Instance 2 | 30, 99 | SW-Core-2 | SW-Core-1 | 4096 / 8192 |

### Phase 3 — VLAN configuration

#### Cisco IOS/IOS-XE

```ios
! ⚠️ ROLLBACK: no vlan 10 20 30 (deletes the VLAN and removes the ports)
! Impact: immediate downtime on ports assigned to these VLANs

! Create VLANs (idempotent — VLAN already exists → no effect)
vlan 10
 name DATA
vlan 20
 name VOICE
vlan 30
 name SERVERS
vlan 99
 name MGMT
vlan 999
 name BLACKHOLE-NATIVE

! Verification
show vlan brief
show vlan id 10
```

#### Huawei VRP (CloudEngine / S-Series)

```vrp
# ⚠️ ROLLBACK: undo vlan 10 20 30 (deletes the VLAN)
# Impact: same as Cisco

# Create VLANs
vlan batch 10 20 30 99 999

# Naming
vlan 10
 description DATA
vlan 20
 description VOICE
vlan 30
 description SERVERS
vlan 99
 description MGMT
vlan 999
 description BLACKHOLE-NATIVE

# Verification
display vlan brief
display vlan 10
```

#### Juniper JunOS

```junos
# ⚠️ ROLLBACK: delete vlans vlan-10
# Always use "commit confirmed 5" (auto-rollback if not confirmed within 5 min)

set vlans vlan-10 vlan-id 10 description "DATA"
set vlans vlan-20 vlan-id 20 description "VOICE"
set vlans vlan-30 vlan-id 30 description "SERVERS"
set vlans vlan-99 vlan-id 99 description "MGMT"
set vlans blackhole vlan-id 999 description "BLACKHOLE-NATIVE"

# Always use commit confirmed in production
commit confirmed 5
# Then confirm if OK:
commit

# Verification
show vlans
```

#### Alcatel-Lucent AOS (OmniSwitch)

```aos
# ⚠️ ROLLBACK: no vlan 10 (deletes the VLAN)

vlan 10 name "DATA"
vlan 20 name "VOICE"
vlan 30 name "SERVERS"
vlan 99 name "MGMT"
vlan 999 name "BLACKHOLE-NATIVE"

! Verification
show vlan
show vlan 10
```

### Phase 4 — Port configuration (invoke network-checker)

> ⚠️ For EVERY configured port: invoke `network-checker` with vendor + hostname + port + mode + VLAN + description BEFORE applying the configuration.
> If `network-checker` is unavailable: apply the verification protocol directly (see Phase 4 of the `network-checker` skill).

#### Access port — Quick multi-vendor reference

```
# === ACCESS PORT — VLAN 10 (DATA) ===

# --- CISCO IOS ---
interface GigabitEthernet0/1
 description PC-Office-01           ! Mandatory traceability
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast              ! Edge port only — NEVER on trunk/uplink
 no shutdown
! ROLLBACK: shutdown / no switchport access vlan 10 / switchport access vlan 1

# --- HUAWEI VRP ---
interface GigabitEthernet0/0/1
 description PC-Office-01
 port link-type access
 port default vlan 10
 stp edged-port enable              ! Equivalent to portfast
 undo shutdown
# ROLLBACK: shutdown / undo port default vlan 10 / port default vlan 1

# --- JUNIPER JUNOS ---
set interfaces ge-0/0/1 description "PC-Office-01"
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members vlan-10
set interfaces ge-0/0/1 ether-options no-auto-negotiation  # if needed
# ROLLBACK: delete interfaces ge-0/0/1 unit 0 family ethernet-switching

# --- ALCATEL-LUCENT AOS ---
interfaces port 1/1/1 alias "PC-Office-01"
vlan 10 members port 1/1/1 untagged
# ROLLBACK: no vlan 10 members port 1/1/1
```

#### Trunk port — Quick multi-vendor reference

```
# === TRUNK PORT — VLANs 10, 20, 30 ===

# --- CISCO IOS ---
interface GigabitEthernet0/24
 description TRUNK-SW-DIST-01
 switchport mode trunk
 switchport trunk encapsulation dot1q   ! For older IOS with ISL
 switchport trunk allowed vlan 10,20,30,99
 switchport trunk native vlan 999       ! Native VLAN ≠ VLAN 1
 no shutdown
! ROLLBACK: no switchport trunk allowed vlan 10,20,30,99 / no shutdown

# --- HUAWEI VRP ---
interface GigabitEthernet0/0/24
 description TRUNK-SW-DIST-01
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 99
 port trunk pvid vlan 999
 undo shutdown
# ROLLBACK: port trunk allow-pass vlan none / undo shutdown

# --- JUNIPER JUNOS ---
set interfaces ge-0/0/24 description "TRUNK-SW-DIST-01"
set interfaces ge-0/0/24 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/24 unit 0 family ethernet-switching vlan members [vlan-10 vlan-20 vlan-30 vlan-99]
set interfaces ge-0/0/24 unit 0 family ethernet-switching native-vlan-id 999
# ROLLBACK: delete interfaces ge-0/0/24 unit 0 family ethernet-switching

# --- ALCATEL-LUCENT AOS ---
interfaces port 1/1/24 alias "TRUNK-SW-DIST-01"
vlan 10 members port 1/1/24 tagged
vlan 20 members port 1/1/24 tagged
vlan 30 members port 1/1/24 tagged
vlan 99 members port 1/1/24 tagged
# ROLLBACK: no vlan 10 members port 1/1/24 / no vlan 20 members port 1/1/24 ...
```

### Phase 5 — Spanning-Tree (MSTP/RSTP)

#### RSTP — Simple, single instance

```
# === RSTP — All platforms ===

# --- CISCO ---
spanning-tree mode rapid-pvst
spanning-tree vlan 10,20,30 priority 4096   ! Primary root SW-Core-1
spanning-tree vlan 10,20,30 priority 8192   ! Secondary root SW-Core-2
! ROLLBACK: spanning-tree vlan 10,20,30 priority 32768 (default)

# --- HUAWEI ---
stp mode rstp
stp instance 0 priority 4096
# ROLLBACK: stp instance 0 priority 32768

# --- JUNIPER ---
set protocols rstp bridge-priority 4k
# ROLLBACK: delete protocols rstp bridge-priority
commit confirmed 5

# --- ALCATEL-LUCENT ---
bridge mode rstp
bridge priority 4096
# ROLLBACK: bridge priority 32768
```

#### MSTP — Multi-instance (scalability)

```
# === MSTP — Load balancing by instance ===

# --- CISCO ---
spanning-tree mode mst
spanning-tree mst configuration
 name REGION-PROD
 revision 1
 instance 1 vlan 10, 20        ! Instance 1: Data + Voice
 instance 2 vlan 30, 99        ! Instance 2: Servers + Mgmt
spanning-tree mst 1 priority 4096    ! SW-Core-1 = root for instance 1
spanning-tree mst 2 priority 8192    ! SW-Core-1 = secondary for instance 2
! ROLLBACK: no spanning-tree mst configuration

# --- HUAWEI ---
stp mode mstp
stp region-configuration
 region-name REGION-PROD
 revision-level 1
 instance 1 vlan 10 20
 instance 2 vlan 30 99
 active region-configuration
stp instance 1 priority 4096
stp instance 2 priority 8192
# ROLLBACK: stp mode rstp / undo stp region-configuration

# --- JUNIPER ---
set protocols mstp configuration-name "REGION-PROD"
set protocols mstp revision-level 1
set protocols mstp msti 1 bridge-priority 4k
set protocols mstp msti 1 vlan 10
set protocols mstp msti 1 vlan 20
set protocols mstp msti 2 bridge-priority 8k
set protocols mstp msti 2 vlan 30
set protocols mstp msti 2 vlan 99
commit confirmed 5
```

### Phase 6 — LACP / Link aggregation

```
# === LACP — Active aggregation (recommended on mixed hardware) ===
# Impact: < 1s interruption during LACP negotiation
# ⚠️ ROLLBACK: disable channel-group on each member port + no interface port-channel X

# --- CISCO IOS ---
! Create the port-channel first
interface Port-channel1
 description LACP-SW-CORE-01
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,99
 switchport trunk native vlan 999

! Add the members
interface range GigabitEthernet0/1 - 2
 channel-group 1 mode active    ! active = LACP (passive = waits for negotiation)
 no shutdown

! Verification
show etherchannel summary
show lacp neighbor

# --- HUAWEI VRP ---
# The Eth-Trunk is created first
interface Eth-Trunk1
 description LACP-SW-CORE-01
 mode lacp-static               ! Static LACP (lacp-dynamic = automatic negotiation)
 trunkport GigabitEthernet 0/0/1
 trunkport GigabitEthernet 0/0/2
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 99
 port trunk pvid vlan 999

# Verification
display eth-trunk 1
display lacp statistics eth-trunk 1

# --- JUNIPER JUNOS ---
set chassis aggregated-devices ethernet device-count 2
set interfaces ae0 description "LACP-SW-CORE-01"
set interfaces ae0 aggregated-ether-options lacp active
set interfaces ae0 aggregated-ether-options lacp periodic fast
set interfaces ae0 unit 0 family ethernet-switching interface-mode trunk
set interfaces ae0 unit 0 family ethernet-switching vlan members [vlan-10 vlan-20 vlan-30 vlan-99]
set interfaces ge-0/0/1 ether-options 802.3ad ae0
set interfaces ge-0/0/2 ether-options 802.3ad ae0
commit confirmed 5

show lacp statistics interfaces ae0

# --- ALCATEL-LUCENT AOS ---
linkagg 1 size 2 admin-state enable name "LACP-SW-CORE-01" mode active
linkagg 1 port 1/1/1 actor admin-key 1
linkagg 1 port 1/1/2 actor admin-key 1
vlan 10 members linkagg 1 tagged
vlan 20 members linkagg 1 tagged
vlan 30 members linkagg 1 tagged
vlan 99 members linkagg 1 tagged

show linkagg 1
```

### Phase 7 — Inter-VLAN routing (L3 on a core switch or router)

```
# === INTER-VLAN ROUTING — SVI (Switch Virtual Interface) ===

# --- CISCO IOS (L3 switch) ---
ip routing

interface Vlan10
 ip address 192.168.10.1 255.255.255.0
 description GATEWAY-DATA
 no shutdown

interface Vlan30
 ip address 10.10.30.1 255.255.255.0
 description GATEWAY-SERVERS
 no shutdown

! Verification
show ip route
show ip interface brief

# --- HUAWEI VRP (L3 switch) ---
interface Vlanif10
 ip address 192.168.10.1 255.255.255.0
 description GATEWAY-DATA
 undo shutdown

interface Vlanif30
 ip address 10.10.30.1 255.255.255.0
 description GATEWAY-SERVERS
 undo shutdown

display ip routing-table
display ip interface brief
```

### Phase 8 — ACL (after Design-First validation)

> ⚠️ ACL = last step. Design-First (Phase 2) must be validated before writing ACLs.
> Potential impact: production traffic blocked if a rule is incorrect.
> ⚠️ MANDATORY ROLLBACK before applying: back up the full config.

```
# Cisco — back up before an ACL change
copy running-config flash:backup-$(show clock | awk '{print $1}').cfg

# === Extended Cisco ACL (permit/deny with protocol + port) ===
ip access-list extended ACL-SERVERS-IN
 ! Allow HTTPS from DATA to SERVERS
 permit tcp 192.168.10.0 0.0.0.255 10.10.30.0 0.0.0.255 eq 443
 ! Allow SSH from MGMT to SERVERS
 permit tcp 10.0.99.0 0.0.0.255 10.10.30.0 0.0.0.255 eq 22
 ! Deny everything else (implicit deny — not required but make it explicit)
 deny ip any any log

! Apply to the SERVERS SVI interface
interface Vlan30
 ip access-group ACL-SERVERS-IN in

! ROLLBACK: no ip access-group ACL-SERVERS-IN in
! then: no ip access-list extended ACL-SERVERS-IN

# === Huawei ACL (traffic policy) ===
acl name ACL-SERVERS-IN advanced
 rule 5 permit tcp source 192.168.10.0 0.0.0.255 destination 10.10.30.0 0.0.0.255 destination-port eq 443
 rule 10 permit tcp source 10.0.99.0 0.0.0.255 destination 10.10.30.0 0.0.0.255 destination-port eq 22
 rule 999 deny ip

interface Vlanif30
 traffic-filter inbound acl name ACL-SERVERS-IN

# ROLLBACK: undo traffic-filter inbound acl name ACL-SERVERS-IN
```

### Phase 9 — Post-configuration verification

#### Cisco IOS

```ios
show running-config interface GigabitEthernet0/1
show vlan brief
show spanning-tree summary
show etherchannel summary
show ip route
ping 192.168.10.1 source Vlan30 count 5
```

#### Huawei VRP

```vrp
display current-configuration interface GigabitEthernet0/0/1
display vlan brief
display stp brief
display eth-trunk 1
display ip routing-table
ping -a 192.168.10.1 10.10.30.1 count 5
```

#### Juniper JunOS

```junos
show interfaces ge-0/0/1
show vlans
show spanning-tree interface
show lacp statistics interfaces ae0
show route
ping 192.168.10.1 routing-instance default count 5
```

#### Alcatel-Lucent AOS

```aos
show interfaces port 1/1/1
show vlan
show spanning-tree
show linkagg 1
show ip route
ping 192.168.10.1 count 5
```

### Phase 10 — Conditional persistence

- **If invoked from `infrastructure-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p infrastructure/network-engineer` via Bash
  2. Write `infrastructure/network-engineer/YYYY-MM-DD_network-engineer.md`

### Phase 11 — Memory

> ⚠️ Skip if invoked from `infrastructure-agent`.

If invoked standalone, record in `<project>/.claude/infra-knowledge.md`:
- Network vendors in place (Cisco/Huawei/Juniper/Alcatel)
- VLAN plan (IDs and names)
- Chosen STP mode (RSTP/MSTP) + root bridge placement
- Configured LACP aggregates
