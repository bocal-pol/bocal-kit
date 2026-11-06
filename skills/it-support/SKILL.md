---
name: it-support
description: "IT Support & ITIL — L1/L2/L3 support (runbooks, escalation), Application Support Engineer (production investigation), ITIL Change Management (RFC, CAB), Problem Management (5 Whys RCA), CMDB/Asset Manager. Focus parameter: l1l2 / l3-app / itil / cmdb / full. Auto-invoke on: IT support, helpdesk, incident, ticket, ITIL, change management, RFC, CAB, problem management, RCA, CMDB, CMDB manager, asset management, application support, L1 L2 L3, support SLA, escalation, support runbook."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# IT Support & ITIL

`[Activated: IT Support]` or `[Activated: ITIL Manager]` depending on focus

Quality support = quality documentation. Every resolved incident = an updated runbook.

> **Absolute rule**: every production change goes through an RFC with impact analysis and a rollback plan. Never an unplanned production change. SLA = contractual commitment → mandatory tracking.

## Optional input (if invoked from `it-operations-agent`)

If incident category + impacted system + focus are already provided: skip Phase 1.

## Workflow

### Phase 1 — IT support context

```
IT Support / ITIL — Context:
1. Focus:
   [ ] l1l2     — user support, diagnosis, resolving common incidents
   [ ] l3-app   — deep investigation, log analysis, production bugs
   [ ] itil     — change management (RFC/CAB), problem management (RCA)
   [ ] cmdb     — CI inventory, relationships, asset management
   [ ] full     — all aspects (default)
2. Impacted system: [Application / Network / Infrastructure / End user]
3. ITSM Tool: [ServiceNow / Jira Service Desk / Freshservice / GLPI / Other]
4. Contractual SLA: [P1 < Xh / P2 < Xh / P3 < Xh]
5. Context: [Active incident / Post-incident analysis / Change preparation / CMDB audit]
```

### Phase 2 — L1/L2 support — runbooks

#### Triage and escalation matrix

```markdown
## Escalation matrix — IT incidents

| Priority | Criteria | Resolution SLA | Immediate action | L2 escalation |
|----------|----------|----------------|-----------------|-------------|
| **P1 Critical** | Prod service down, > 50 users impacted | < 4h | Crisis cell + conference bridge | 15 min |
| **P2 Major** | Degraded service, critical feature broken | < 8h | Priority investigation | 2h |
| **P3 Normal** | Isolated user, workaround available | < 24h | Normal queue | 8h |
| **P4 Minor** | Question, improvement, cosmetic | < 72h | Processed as capacity allows | No |

## Classification by symptom

| Symptom | Category | Required skill |
|----------|-----------|-------------|
| Can't connect to VPN | Network/Auth | L1 → check AD + VPN config |
| Slow application | App performance | L2 → logs + DB + resources |
| Incorrect data | Data/Business | L3-App → business logic analysis |
| Data loss | Critical P1 | L3 + DBA + backup restore |
| Network down (switch/router) | Infrastructure | Infra → network-engineer |
```

#### Runbook — Diagnosing an unreachable web app

```markdown
# RUNBOOK — Web App Unreachable
**Trigger**: Users report a 502/503/timeout error
**Prerequisites**: Kibana access, kubectl access (prod-cluster), AWS Console access

## Step 1 — Quick check (< 2 min)
```bash
# Health check endpoint
curl -I https://app.example.com/health
# Internal status page
curl https://status.internal/api/components

# K8s — pod status
kubectl get pods -n production -l app=api-gateway
kubectl get pods -n production -l app=backend
```

## Step 2 — Identify the impacted layer

| Observation | Layer | Next action |
|-------------|--------|----------------|
| DNS doesn't resolve | DNS | Check Route53 / DNS resolver |
| LoadBalancer unreachable | Network/AWS | Check ALB health checks |
| 502 Bad Gateway | Application | Check backend pods |
| 503 Service Unavailable | Scaling | Check HPA + node resources |
| Slow with 200 OK | Performance | Check DB + cache + logs |

## Step 3 — Log analysis
```bash
# Kibana / ELK — last 15 minutes
# Index: production-* | Filter: level:ERROR + service:backend

# Or directly from K8s
kubectl logs -n production -l app=backend --since=15m --tail=100 | grep -E "ERROR|FATAL|Exception"

# Pod in CrashLoop — see the crash reason
kubectl describe pod <pod-name> -n production
```

## Step 4 — Resolution and validation
```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment/backend -n production
kubectl rollout status deployment/backend -n production --timeout=120s

# Post-resolution check
curl -f https://app.example.com/health && echo "✅ Service restored"
```

## Rollback (if a restart isn't enough)
```bash
kubectl rollout undo deployment/backend -n production
```
```

### Phase 3 — L3 application support (production investigation)

```python
# investigation/log_analyzer.py — automated incident log analysis
import re
from collections import Counter, defaultdict
from datetime import datetime

def analyze_error_logs(log_file: str, time_window_minutes: int = 30) -> dict:
    """Analyze error logs to identify patterns."""
    errors = []
    pattern = re.compile(
        r'(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+'
        r'(?P<level>ERROR|FATAL|WARN)\s+'
        r'\[(?P<service>[^\]]+)\]\s+'
        r'(?P<message>.+)'
    )

    with open(log_file) as f:
        for line in f:
            match = pattern.match(line.strip())
            if match:
                errors.append(match.groupdict())

    # Cluster by similar message (deduplicate)
    error_counter = Counter(e["message"][:100] for e in errors)
    service_errors = defaultdict(list)
    for error in errors:
        service_errors[error["service"]].append(error["message"])

    return {
        "total_errors": len(errors),
        "top_errors": error_counter.most_common(10),
        "affected_services": {
            svc: len(msgs) for svc, msgs in service_errors.items()
        },
        "timeline": sorted(set(e["timestamp"][:16] for e in errors)),
    }
```

```sql
-- Production investigation — analysis queries
-- ─────────────────────────────────────────────────────────────────

-- Blocking transactions (PostgreSQL)
SELECT
    pid,
    usename,
    application_name,
    state,
    wait_event_type,
    wait_event,
    now() - query_start AS duration,
    LEFT(query, 200) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > INTERVAL '30 seconds'
ORDER BY duration DESC;

-- Pending locks
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Phase 4 — ITIL change management

```markdown
## RFC — Request For Change

### General information
- **Title**: [Short description of the change]
- **Requester**: [Name + team]
- **Submission date**: YYYY-MM-DD
- **Desired go-live date**: YYYY-MM-DD HH:MM
- **Estimated duration**: [Xh]
- **Category**:
  - [ ] Standard (pre-approved, low risk, known procedure)
  - [ ] Normal (approved by CAB)
  - [ ] Urgent (approved by E-CAB, reduced window)

### Technical description
**What**: [Precise description of the change]
**Why**: [Business or technical justification]
**Scope**: [Systems, applications, environments impacted]

### Impact and risk analysis
| Dimension | Impact | Likelihood | Mitigation |
|-----------|--------|-------------|------------|
| Availability | Low/Medium/High | Low/Medium/High | [action] |
| Data | Low/Medium/High | Low/Medium/High | [action] |
| Security | Low/Medium/High | Low/Medium/High | [action] |
| Performance | Low/Medium/High | Low/Medium/High | [action] |

### Deployment plan
1. [ ] Notify impacted teams (D-3)
2. [ ] Backup / snapshot before deployment
3. [ ] Step 1: [description]
4. [ ] Step 2: [description]
5. [ ] Post-deployment smoke test
6. [ ] Go/no-go confirmation

### Rollback plan (mandatory)
1. [ ] Trigger criterion: [condition]
2. [ ] Rollback step 1: [description]
3. [ ] Estimated rollback duration: [Xmin]
4. [ ] Rollback owner: [name]

### Outcome (fill in after deployment)
- [ ] Success — deployed on [date] at [time]
- [ ] Rollback triggered — reason: ___
- [ ] Post-change incident: [reference]
```

### Phase 5 — Problem management (RCA)

```markdown
## RCA — Root Cause Analysis
**Incident**: [Reference INC-XXXXX]
**Duration**: [Xh Ym]

### 5 Whys analysis

| # | Observation | Why question? | Answer |
|---|-------------|---------------------|---------|
| 1 | [Visible symptom] | Why? | [Direct cause] |
| 2 | [Direct cause] | Why? | [Underlying cause] |
| 3 | [Underlying cause] | Why? | [Structural cause] |
| 4 | [Structural cause] | Why? | [Process failure] |
| 5 | [Process failure] | Why does this process allow it? | [Final root cause] |

**Root cause**: [one sentence]

### Corrective actions (Known Error → Problem Record)
| # | Action | Type | Priority | Owner | Due date |
|---|--------|------|----------|-------------|----------|
| 1 | [Corrective] | Technical | P1 | @team | YYYY-MM-DD |
| 2 | [Preventive] | Process | P2 | @team | YYYY-MM-DD |

**Workaround**: [temporary solution documented in the Known Error DB]
```

### Phase 6 — CMDB structure

```yaml
# cmdb/ci-template.yaml — Configuration Item types
ci_types:
  server:
    attributes: [hostname, ip_address, os, cpu_cores, ram_gb, datacenter, env]
    relationships: [hosted_by(rack), runs(application), managed_by(team)]

  application:
    attributes: [name, version, tier, technology, sla_level, owner_team]
    relationships: [depends_on(application), hosted_on(server), exposes(api)]

  network_device:
    attributes: [hostname, model, firmware, location, ip_mgmt]
    relationships: [connected_to(network_device), in(datacenter)]

  database:
    attributes: [name, engine, version, size_gb, env, backup_policy]
    relationships: [used_by(application), hosted_on(server), replicated_to(database)]

# Automatic discovery rules (ServiceNow Discovery / Ansible)
discovery_rules:
  - source: ansible_inventory
    ci_type: server
    mapping:
      hostname: inventory_hostname
      ip_address: ansible_host
      os: ansible_distribution + ansible_distribution_version
```

### Phase 7 — Conditional persistence

- **If invoked from `it-operations-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `itops/` via Bash if absent
  2. Write `itops/YYYY-MM-DD_[type]-[subject].md`

### Phase 8 — Memory

> ⚠️ Skip if invoked from `it-operations-agent`.

Record in `<project>/.claude/infra-knowledge.md`:
- ITSM tool used
- Defined contractual SLAs
- Recurring problems documented + workarounds
