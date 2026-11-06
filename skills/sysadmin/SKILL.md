---
name: sysadmin
description: "Linux Sysadmin (Debian/RHEL) — kernel hardening, SSH/PAM, firewalld/iptables, idempotent Ansible playbooks, systemd service management. Auto-invoke on mention of: linux administration, debian, rhel, centos, linux hardening, sysctl, ansible playbook, iptables, firewalld, systemd, SSH hardening, PAM, linux package management, linux cron."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: infra
dependencies: []
conflicts: []
---

# Linux Sysadmin — Debian / RHEL + Ansible

Secure, idempotent Linux administration: kernel hardening, SSH/PAM, firewalld/iptables, Ansible
playbooks, service management.

## ICT Rules — Non-negotiable

| Rule | Application in this skill |
|-------|--------------------------|
| **Idempotence** | Every bash script → converted into an Ansible task with `state: present/absent`. Raw bash only if Ansible is unavailable. |
| **Safety First** | Before `iptables -F`, `rm -rf`, `systemctl stop` on a critical service → a documented rollback comes first |
| **IaC First** | Ansible playbook > bash. Ansible `sysctl` module > manually editing `/etc/sysctl.conf` |
| **Response protocol** | Impact → Implementation (commented playbook) → Verification → Rollback |

**Boundary with `devops`**: `sysadmin` covers the OS layer (Ansible, hardening, services). `devops`
covers CI/CD pipelines (GitHub Actions, Jenkins) — application layers above the OS.

**Boundary with `kubernetes-engineer`**: `sysadmin` configures the Linux host.
`kubernetes-engineer` configures the workloads running on top of it.

## Optional input (if invoked from `infrastructure-agent`)

If the OS + version + Ansible artifacts are already provided as input:
- Start directly at Phase 2 with that data
- Adapt the examples to the detected distribution (Debian vs RHEL)

Otherwise: run the full workflow starting from Phase 1.

## Workflow

### Phase 1 — OS context gathering

Read via Glob + Read:
- `infrastructure/sysadmin/*.md` (previous sessions — sorted descending)
- `playbooks/**/*.yml`, `roles/**/*.yml` (existing Ansible)
- `**/sysctl*.conf`, `**/limits.d/**` (existing hardening)
- **Exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

If insufficient, gather via AskUserQuestion:

```
System context — please provide:

1. Distribution: Debian [12/11/10] / RHEL [9/8] / CentOS Stream / Rocky / AlmaLinux
2. Server role: web / database / CI/CD / gateway / general
3. Is Ansible already in place? Yes (version, existing inventory?) / No
4. Main goal:
   [ ] Hardening from scratch    [ ] Audit and remediation
   [ ] CIS compliance            [ ] Incident resolution
   [ ] New service deployment
5. Firewall: iptables / firewalld / nftables / none
6. Constraints: is a rescue console access available? (critical before SSH hardening)
```

> ⚠️ MANDATORY SAFETY CHECK: before any SSH hardening, confirm that console/KVM/IPMI access is
> available as a fallback. Never apply SSH rules without a confirmed backdoor.

### Phase 2 — Existing-state audit

```bash
# Audit commands to run before any change
# Debian/Ubuntu
dpkg -l | grep -E "^ii" | awk '{print $2}' > /tmp/pkg-before.txt
sysctl -a 2>/dev/null | sort > /tmp/sysctl-before.txt

# RHEL/CentOS
rpm -qa | sort > /tmp/pkg-before.txt
sysctl -a 2>/dev/null | sort > /tmp/sysctl-before.txt

# Current SSH state (to save before hardening)
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup-$(date +%Y%m%d)

# Current firewall rules
iptables-save > /tmp/iptables-before-$(date +%Y%m%d).rules
# OR (firewalld)
firewall-cmd --list-all > /tmp/firewalld-before-$(date +%Y%m%d).txt
```

### Phase 3 — Kernel hardening (sysctl)

#### Idempotent Ansible playbook — kernel hardening

```yaml
---
# roles/hardening/tasks/sysctl.yml
# Kernel hardening via sysctl — idempotent
# Reference: CIS Benchmark for Linux

- name: Apply kernel hardening parameters
  sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
    reload: yes
    sysctl_file: /etc/sysctl.d/99-hardening.conf
  loop:
    # Network — disable forwarding (except on a gateway)
    - { key: 'net.ipv4.ip_forward',                    value: '0' }
    - { key: 'net.ipv4.conf.all.send_redirects',       value: '0' }
    - { key: 'net.ipv4.conf.default.send_redirects',   value: '0' }
    - { key: 'net.ipv4.conf.all.accept_redirects',     value: '0' }
    - { key: 'net.ipv4.conf.all.accept_source_route',  value: '0' }
    # Spoofing protection
    - { key: 'net.ipv4.conf.all.rp_filter',            value: '1' }
    - { key: 'net.ipv4.conf.default.rp_filter',        value: '1' }
    # SYN flood protection
    - { key: 'net.ipv4.tcp_syncookies',                value: '1' }
    # IPv6 — disable if unused
    - { key: 'net.ipv6.conf.all.disable_ipv6',         value: '1' }
    - { key: 'net.ipv6.conf.default.disable_ipv6',     value: '1' }
    # Kernel — memory protection
    - { key: 'kernel.dmesg_restrict',                  value: '1' }
    - { key: 'kernel.kptr_restrict',                   value: '2' }
    - { key: 'fs.suid_dumpable',                       value: '0' }
    - { key: 'kernel.randomize_va_space',              value: '2' }

# ROLLBACK: rm /etc/sysctl.d/99-hardening.conf && sysctl --system
```

### Phase 4 — SSH hardening

```yaml
---
# roles/hardening/tasks/ssh.yml
# SSH hardening — idempotent via lineinfile
# ⚠️ ALWAYS verify rescue console access before applying

- name: Backup SSH config before hardening
  copy:
    src: /etc/ssh/sshd_config
    dest: /etc/ssh/sshd_config.backup-{{ ansible_date_time.date }}
    remote_src: yes
  tags: ssh

- name: Harden SSH configuration
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
    state: present
    backup: no  # backup already done manually above
    validate: /usr/sbin/sshd -t -f %s  # syntax validation before reload
  loop:
    - { regexp: '^#?Protocol',           line: 'Protocol 2' }
    - { regexp: '^#?PermitRootLogin',    line: 'PermitRootLogin no' }
    - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
    - { regexp: '^#?PermitEmptyPasswords',   line: 'PermitEmptyPasswords no' }
    - { regexp: '^#?X11Forwarding',          line: 'X11Forwarding no' }
    - { regexp: '^#?MaxAuthTries',           line: 'MaxAuthTries 3' }
    - { regexp: '^#?LoginGraceTime',         line: 'LoginGraceTime 60' }
    - { regexp: '^#?ClientAliveInterval',    line: 'ClientAliveInterval 300' }
    - { regexp: '^#?ClientAliveCountMax',    line: 'ClientAliveCountMax 2' }
    - { regexp: '^#?AllowAgentForwarding',   line: 'AllowAgentForwarding no' }
    - { regexp: '^#?TCPKeepAlive',           line: 'TCPKeepAlive no' }
  notify: restart sshd
  tags: ssh

handlers:
  - name: restart sshd
    service:
      name: "{{ 'ssh' if ansible_os_family == 'Debian' else 'sshd' }}"
      state: restarted

# ROLLBACK: cp /etc/ssh/sshd_config.backup-YYYYMMDD /etc/ssh/sshd_config && systemctl restart sshd
```

### Phase 5 — Firewall (firewalld / iptables)

#### firewalld (RHEL/CentOS — recommended)

```yaml
---
# roles/firewall/tasks/firewalld.yml
# ⚠️ ROLLBACK before applying: firewall-cmd --list-all > /tmp/firewalld-backup.txt
# ⚠️ ROLLBACK: firewall-cmd --reload (reloads the previous persistent config)

- name: Ensure firewalld is installed and enabled
  package:
    name: firewalld
    state: present

- name: Start and enable firewalld
  service:
    name: firewalld
    state: started
    enabled: yes

- name: Set default zone to drop
  firewalld:
    zone: drop
    state: enabled
    permanent: yes
  notify: reload firewalld

- name: Allow SSH on management zone
  firewalld:
    zone: trusted
    source: "{{ management_network }}"  # e.g. 192.168.1.0/24
    state: enabled
    permanent: yes
  when: management_network is defined
  notify: reload firewalld

- name: Allow application ports
  firewalld:
    zone: public
    port: "{{ item }}"
    state: enabled
    permanent: yes
  loop: "{{ allowed_ports | default([]) }}"  # e.g. ["80/tcp", "443/tcp"]
  notify: reload firewalld

handlers:
  - name: reload firewalld
    service:
      name: firewalld
      state: reloaded
```

#### iptables (Debian / legacy)

```bash
# ⚠️ MANDATORY ROLLBACK — run BEFORE any iptables change
iptables-save > /tmp/iptables-backup-$(date +%Y%m%d-%H%M%S).rules
# ROLLBACK: iptables-restore < /tmp/iptables-backup-YYYYMMDD-HHMMSS.rules

# Default policy: DROP everything, allow explicitly
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# SSH (from the management network only)
iptables -A INPUT -s 192.168.1.0/24 -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT

# Application services
# iptables -A INPUT -p tcp --dport 80 -j ACCEPT
# iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Persist the rules
iptables-save > /etc/iptables/rules.v4  # Debian
# RHEL: service iptables save
```

### Phase 6 — systemd service management

```yaml
---
# roles/services/tasks/systemd.yml

- name: Ensure unwanted services are disabled (hardening)
  service:
    name: "{{ item }}"
    state: stopped
    enabled: no
  loop:
    - avahi-daemon    # mDNS — unnecessary on a server
    - cups            # Printing — unnecessary on a server
    - rpcbind         # NFS — disable if unused
    - nfs-server
  ignore_errors: yes  # the service may be absent — idempotent

- name: Ensure critical services are running
  service:
    name: "{{ item }}"
    state: started
    enabled: yes
  loop: "{{ required_services | default(['cron', 'rsyslog']) }}"

# Post-apply verification
# systemctl list-units --failed
# journalctl -xe --no-pager | tail -50
```

### Phase 7 — Package and update management

```yaml
---
# roles/packages/tasks/main.yml

- name: Update package cache (Debian)
  apt:
    update_cache: yes
    cache_valid_time: 3600
  when: ansible_os_family == "Debian"

- name: Ensure security updates are applied (Debian)
  apt:
    upgrade: dist
    autoremove: yes
  when: ansible_os_family == "Debian" and apply_security_updates | default(false)

- name: Update package cache (RHEL)
  dnf:
    update_cache: yes
  when: ansible_os_family == "RedHat"

- name: Install required packages
  package:
    name: "{{ required_packages | default([]) }}"
    state: present
  # required_packages: [curl, wget, vim, git, rsync, fail2ban]

- name: Remove unnecessary packages
  package:
    name: "{{ packages_to_remove | default([]) }}"
    state: absent
  # packages_to_remove: [telnet, rsh-client, rsh-redone-client]
```

### Phase 8 — Full Ansible structure

```
ansible/
├── inventory/
│   ├── hosts.yml               # Inventory (groups: webservers, dbservers)
│   └── group_vars/
│       ├── all.yml             # Global variables
│       └── webservers.yml      # Per-group variables
├── playbooks/
│   ├── site.yml                # Master playbook (import_playbook)
│   ├── hardening.yml           # OS hardening playbook
│   └── services.yml            # Service deployment playbook
├── roles/
│   ├── hardening/
│   │   ├── tasks/
│   │   │   ├── main.yml        # import_tasks: [sysctl, ssh, firewall]
│   │   │   ├── sysctl.yml
│   │   │   ├── ssh.yml
│   │   │   └── firewall.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── defaults/
│   │       └── main.yml        # Overridable default variables
│   └── services/
│       └── tasks/main.yml
└── ansible.cfg
    # [defaults]
    # inventory = inventory/hosts.yml
    # remote_user = ansible
    # private_key_file = ~/.ssh/ansible_key
    # host_key_checking = False
    # [privilege_escalation]
    # become = True
    # become_method = sudo
```

**Key Ansible commands:**
```bash
# Dry-run (check + diff) — ALWAYS before applying
ansible-playbook playbooks/hardening.yml --check --diff -i inventory/hosts.yml

# Apply
ansible-playbook playbooks/hardening.yml -i inventory/hosts.yml

# Apply to a specific host
ansible-playbook playbooks/hardening.yml -i inventory/hosts.yml --limit "srv01.example.com"

# Post-apply verification
ansible all -m setup -i inventory/hosts.yml | grep ansible_date_time
```

### Phase 9 — Post-apply verification

```bash
# Check the applied sysctl parameters
sysctl net.ipv4.ip_forward net.ipv4.tcp_syncookies kernel.dmesg_restrict

# Check SSH
ssh -v -o PasswordAuthentication=no user@host 'echo "SSH OK"'

# Test the firewall (from outside)
nmap -sV -p 22,80,443 <server_IP>

# Check services
systemctl list-units --failed

# Recent logs
journalctl -xe --no-pager --since "10 minutes ago"
```

### Phase 10 — Conditional persistence

- **If invoked from `infrastructure-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p infrastructure/sysadmin` via Bash
  2. Write `infrastructure/sysadmin/YYYY-MM-DD_sysadmin.md` with every playbook and procedure

### Phase 11 — Memory

> ⚠️ Skip if invoked from `infrastructure-agent`.

If invoked standalone, record in `<project>/.claude/infra-knowledge.md`:
- OS distribution and version
- Chosen firewall (firewalld/iptables/nftables)
- Ansible in place (yes/no) + version + inventory structure
- Fixed anti-patterns (short list)
