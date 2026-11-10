---
name: sre
description: "SRE / Observability Engineer + DBA + Backup — SLO/SLI/SLA + error budgets, Prometheus AlertingRules + RecordingRules, post-mortem template, Grafana dashboards, DBA tuning (EXPLAIN ANALYZE, pgBouncer, replication), backup/restore (3-2-1 rule). Golden Ops Rules: Idempotence, Zero Manual Command, Systematic Rollback. Auto-invoke on: SLO, SLI, SLA, error budget, alerting, Prometheus, Grafana, Datadog, PagerDuty, post-mortem, incident, observability, monitoring, DBA, PostgreSQL tuning, replication, backup, restore, pgBouncer, EXPLAIN ANALYZE."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: infra
dependencies: []
conflicts:
  - devops
---

# SRE / Observability Engineer

`[Activated: SRE/Observability]` or `[Activated: DBA/Backup]` depending on focus

Reliability by design. Measure everything. Alert on the symptom (not the cause). Blameless
post-mortems.

> **Golden Ops Rules (non-negotiable)**
> 1. **Idempotence** — idempotent backup/restore scripts, tested regularly
> 2. **Zero Manual Command** — every recovery procedure = a documented runbook
> 3. **Systematic Rollback** — every DB migration = a rollback script tested before applying

## Mandatory response protocol

```
[PROFILE IMPACTED] SRE/Observability · [service] · [criticality P1/P2/P3]
Impact & Risk      : [availability / data loss / SLO breach]
Code Artifact      : [PrometheusRule / RecordingRule / runbook / SQL]
Smoke Test         : [post-change verification command]
Rollback           : [exact rollback procedure]
```

## Optional input (if invoked from `infrastructure-agent`)

If target services + observability stack + DBMS + focus are already provided: skip Phase 1.

## Workflow

### Phase 1 — SRE context

Collect if insufficient:
```
SRE/Observability — Context:
1. Observability stack:
   [ ] Prometheus + Grafana   [ ] Datadog   [ ] New Relic   [ ] ELK Stack
2. Alerting: [PagerDuty / OpsGenie / Slack / Email]
3. Database: [PostgreSQL version / MySQL / MariaDB / MongoDB]
4. Focus:
   [ ] slo       — SLI/SLO/error budgets definition
   [ ] alerting  — PrometheusRules, RecordingRules, dashboards
   [ ] dba       — SQL tuning, replication, connections
   [ ] backup    — 3-2-1 strategy, restore testing
   [ ] full      — all four (default)
5. Critical services: [list of services + contractual SLAs if defined]
6. Required RPO/RTO: [Recovery Point Objective / Recovery Time Objective]
```

### Phase 2 — SLO / SLI / Error Budget

#### SLI/SLO definition

```yaml
# slo/service-slo.yaml — SLO as Code (OpenSLO spec)
apiVersion: openslo/v1
kind: SLO
metadata:
  name: api-availability
  namespace: production
spec:
  service: api-gateway
  description: "API Gateway availability measured on 5xx requests"

  indicator:
    # SLI — what we measure
    ratio:
      events:
        goodEvents:
          from: dataExporter
          spec: |
            sum(rate(http_requests_total{job="api-gateway",status!~"5.."}[5m]))
        totalEvents:
          from: dataExporter
          spec: |
            sum(rate(http_requests_total{job="api-gateway"}[5m]))

  objectives:
    - displayName: "99.9% monthly"
      target: 0.999
      timeWindow:
        duration: 30d
        isRolling: true

  budgetingMethod: Occurrences

---
# Remaining error budget (Prometheus query)
# error_budget_remaining = (slo_target - error_rate) / (1 - slo_target) * 100
# Alert if remaining error budget < 10%
```

#### Error budget calculation

```python
from datetime import datetime, timedelta

def calculate_error_budget(
    slo_target: float,      # e.g. 0.999 for 99.9%
    window_days: int = 30,
    current_error_rate: float = 0.0015
) -> dict:
    """
    99.9% SLO over 30 days = 43.2 minutes of allowed downtime.
    """
    total_minutes = window_days * 24 * 60
    allowed_downtime_minutes = total_minutes * (1 - slo_target)
    consumed_minutes = total_minutes * current_error_rate
    remaining_minutes = allowed_downtime_minutes - consumed_minutes
    remaining_pct = (remaining_minutes / allowed_downtime_minutes) * 100 if allowed_downtime_minutes > 0 else 0

    return {
        "slo_target": f"{slo_target*100:.3f}%",
        "window_days": window_days,
        "allowed_downtime_min": round(allowed_downtime_minutes, 1),
        "consumed_min": round(consumed_minutes, 1),
        "remaining_min": round(remaining_minutes, 1),
        "remaining_pct": round(remaining_pct, 1),
        "status": (
            "🔴 EXHAUSTED" if remaining_pct <= 0 else
            "🟠 CRITICAL" if remaining_pct <= 10 else
            "🟡 WARNING" if remaining_pct <= 25 else
            "🟢 OK"
        )
    }

# 99.9% over 30 days with a current 0.15% error rate
print(calculate_error_budget(0.999, 30, 0.0015))
# → allowed: 43.2min, consumed: 64.8min → EXHAUSTED → freeze deployments
```

### Phase 3 — Prometheus — AlertingRules + RecordingRules

> ⚠️ **Alerting rule**: alert on the **user-facing symptom** (SLO burn rate, P99 latency, error
> rate) first — not on technical causes (CPU, memory). RecordingRules for complex calculations,
> AlertingRules for action thresholds.

```yaml
# prometheus/rules/api-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-slo-rules
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    # ──────────────────────────────────────────────
    # RECORDING RULES — pre-computed for performance
    # ──────────────────────────────────────────────
    - name: api.recording_rules
      interval: 30s
      rules:
        # Error rate per service (5m window)
        - record: job:http_error_rate:ratio_rate5m
          expr: |
            sum by (job) (
              rate(http_requests_total{status=~"5.."}[5m])
            )
            /
            sum by (job) (
              rate(http_requests_total[5m])
            )

        # P99 latency per service
        - record: job:http_latency_seconds:p99_rate5m
          expr: |
            histogram_quantile(0.99,
              sum by (job, le) (
                rate(http_request_duration_seconds_bucket[5m])
              )
            )

        # 30-day availability (for the error budget)
        - record: job:http_availability:ratio_rate30d
          expr: |
            1 - (
              sum_over_time(job:http_error_rate:ratio_rate5m[30d]) /
              count_over_time(job:http_error_rate:ratio_rate5m[30d])
            )

    # ──────────────────────────────────────────────
    # ALERTING RULES — symptoms, not causes
    # ──────────────────────────────────────────────
    - name: api.alerting_rules
      rules:
        # Imminent SLO breach (high burn rate)
        - alert: SLOBurnRateHigh
          expr: |
            (
              job:http_error_rate:ratio_rate5m{job="api-gateway"} > 0.01
            )
            and
            (
              job:http_error_rate:ratio_rate5m{job="api-gateway"} > 0.001
            )
          for: 2m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "High SLO burn rate — API Gateway"
            description: |
              Error rate: {{ $value | humanizePercentage }}
              At this rate, the 30-day error budget will be exhausted in {{ ... }} hours.
            runbook_url: "https://wiki.internal/runbooks/api-slo-burn"

        # P99 latency > SLO
        - alert: HighLatencyP99
          expr: |
            job:http_latency_seconds:p99_rate5m{job="api-gateway"} > 2.0
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "P99 latency > 2s — {{ $labels.job }}"
            description: "Current P99: {{ $value }}s. SLO: 2s."

        # Pod crash loop
        - alert: PodCrashLooping
          expr: |
            increase(kube_pod_container_status_restarts_total[15m]) > 3
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Pod crash looping: {{ $labels.pod }}"
            description: "{{ $value }} restarts in 15 minutes"

        # Disk > 85%
        - alert: DiskSpaceLow
          expr: |
            (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes) * 100 < 15
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Low disk space: {{ $labels.instance }}"
            description: "{{ $value | humanize }}% free on {{ $labels.mountpoint }}"

        # Error budget < 10%
        - alert: ErrorBudgetAlmostExhausted
          expr: |
            (1 - job:http_availability:ratio_rate30d{job="api-gateway"}) /
            (1 - 0.999) * 100 > 90
          for: 0m
          labels:
            severity: critical
          annotations:
            summary: "Error budget 90% exhausted — freeze deployments"
```

### Phase 3bis — Distributed tracing (OpenTelemetry)

> ⚠️ **Tracing rule**: instrument the backend with OpenTelemetry as soon as a user journey
> crosses more than one service or several layers (controller → service → repository →
> DB/external API) — without distributed traces, finding which exact request is slow in a
> call chain forces guessing instead of measuring.

```yaml
# otel-collector-config.yaml — minimal collector
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  # To Grafana Tempo, Jaeger, or Datadog APM, depending on the stack already in place
  otlp:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

- **Instrumented backend**: an OpenTelemetry SDK per language (`@opentelemetry/sdk-node`,
  `OpenTelemetry.Instrumentation` for .NET, `opentelemetry-php`) — prioritize auto-instrumentation
  for HTTP/DB over custom spans.
- **Correlation**: propagate `trace_id` into every log (`Log::info()`/`ILogger` with the active
  span's context) — see `skills/logging-architect/SKILL.md` for the full `request_id`/`trace_id`
  correlation between frontend and backend; don't duplicate it here.
- **Visualization**: Grafana + Tempo (consistent with Prometheus already in Phase 3), or the
  APM already chosen in Phase 1 (Datadog/New Relic) if the project has one.

### Phase 4 — Post-Mortem Template (Blameless)

> ⚠️ **Blameless rule**: name the **team**, never an individual. The goal is systemic improvement,
> not punishment. The 5 Whys trace back to a process or system failure — never an isolated human
> error.

```markdown
# Post-Mortem — [Incident title]

**Date**: YYYY-MM-DD
**Duration**: Xh Ym (detection → full resolution)
**Severity**: P1 / P2 / P3
**Services impacted**: [list]
**Users impacted**: [N users / X% of traffic]
**Author**: [team, not an individual]

---

## Executive summary (5 lines max)

[Concise description of what happened, the impact, and the root cause]

---

## Timeline (UTC)

| Time | Event |
|-------|-----------|
| HH:MM | First alert triggered |
| HH:MM | On-call notified |
| HH:MM | Initial diagnosis |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |
| HH:MM | Root cause identified |
| HH:MM | Post-mortem opened |

---

## Root cause (5 Whys)

**Why 1**: What failed? → [answer]
**Why 2**: Why did this happen? → [answer]
**Why 3**: Why was this mechanism possible? → [answer]
**Why 4**: Why didn't we detect it sooner? → [answer]
**Why 5**: Why did the process allow this? → [answer]

**Final root cause**: [one sentence]

---

## What went well

- [list of practices that helped the resolution]

## What went wrong

- [list of frictions / gaps found]

---

## Corrective actions

| # | Action | Owner | Priority | Due date | Ticket |
|---|--------|-------------|----------|----------|--------|
| 1 | [preventive action] | @team | P1 | YYYY-MM-DD | #123 |
| 2 | [detection improvement] | @team | P2 | YYYY-MM-DD | #124 |
| 3 | [runbook automation] | @team | P2 | YYYY-MM-DD | #125 |

---

## Incident metrics

- **MTTD** (Mean Time To Detect): Xm
- **MTTR** (Mean Time To Resolve): Xh Ym
- **Error budget consumed**: X% of the monthly budget
```

### Phase 5 — DBA — PostgreSQL tuning

> ⚠️ **DBA rule**: `EXPLAIN ANALYZE` in staging BEFORE any query goes to production. Never a `DROP
> TABLE` / `ALTER TABLE` without a validated backup + a tested rollback script. Every migration =
> a reversible transaction or Flyway/Liquibase versioning.

```sql
-- ─────────────────────────────────────────────────────────────────
-- MANDATORY ANALYSIS before any index or SQL refactoring
-- ─────────────────────────────────────────────────────────────────
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.order_id, c.email_hash, SUM(oi.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.status = 'COMPLETED'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.order_id, c.email_hash;

-- Reading the plan:
-- Seq Scan → index candidate
-- Nested Loop → check cardinality + statistics
-- Hash Join → fine for large tables
-- cost=XXX..YYY → YYY is the total cost (arbitrary unit)

-- ─────────────────────────────────────────────────────────────────
-- PARTIAL INDEX — create CONCURRENTLY (no table lock)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_orders_status_created_at
ON orders (created_at DESC)
WHERE status = 'COMPLETED';  -- Partial index: reduces size by 60-80%

-- ─────────────────────────────────────────────────────────────────
-- STATISTICS — force a refresh after a bulk insert
-- ─────────────────────────────────────────────────────────────────
ANALYZE orders;
ANALYZE order_items;

-- ─────────────────────────────────────────────────────────────────
-- SLOW QUERY LOG — find queries to optimize
-- ─────────────────────────────────────────────────────────────────
-- postgresql.conf:
-- log_min_duration_statement = 1000   # Log > 1s
-- log_statement = 'none'
-- auto_explain.log_min_duration = 1000

-- pg_stat_statements detection query
SELECT
    query,
    calls,
    round((total_exec_time / calls)::numeric, 2) AS avg_ms,
    round(total_exec_time::numeric, 2) AS total_ms,
    rows / calls AS avg_rows
FROM pg_stat_statements
WHERE calls > 100
ORDER BY avg_ms DESC
LIMIT 20;

-- ─────────────────────────────────────────────────────────────────
-- PGBOUNCER — connection pool (avoid a connection storm)
-- ─────────────────────────────────────────────────────────────────
```

```ini
# pgbouncer.ini
[databases]
production = host=postgres-primary port=5432 dbname=production

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Transaction pooling — compatible with most apps
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20       # PostgreSQL max_connections / number of services
reserve_pool_size = 5
reserve_pool_timeout = 3

# Monitoring
stats_period = 60
logfile = /var/log/pgbouncer/pgbouncer.log
```

#### PostgreSQL replication (Streaming Replication)

```bash
# ─────────────────────────────────────────────────────────────────
# PRIMARY CONFIGURATION — postgresql.conf
# ─────────────────────────────────────────────────────────────────
# wal_level = replica
# max_wal_senders = 3
# wal_keep_size = 1GB
# synchronous_standby_names = 'replica1'   # sync replication

# pg_hba.conf — allow the replica
# host replication replicator replica-ip/32 scram-sha-256

# REPLICATION CHECK
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;

# On the replica — lag in seconds
SELECT
    now() - pg_last_xact_replay_timestamp() AS replication_lag_seconds,
    pg_is_in_recovery() AS is_replica;
```

### Phase 6 — Backup / Restore (3-2-1 rule)

> ⚠️ **3-2-1 rule**: 3 copies · 2 different media · 1 off-site copy. **Test the restore ≥ monthly**
> (DR drill). An untested backup is a nonexistent backup. Mandatory checksum before every restore.
> RPO/RTO defined contractually before choosing the frequency.

```bash
#!/bin/bash
# backup/pg_backup.sh — PostgreSQL backup with verification
# 3-2-1 rule: 3 copies / 2 different media / 1 off-site

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-production}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="/backups/postgresql"
S3_BUCKET="${S3_BUCKET:-s3://company-backups/postgresql}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.dump"
LOG_FILE="$BACKUP_DIR/backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ─────────────────────────────────────────────────────────────────
# BACKUP
# ─────────────────────────────────────────────────────────────────
log "Starting backup — $DB_NAME"

pg_dump \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --format=custom \          # Allows selective restore
    --compress=9 \
    --verbose \
    --no-password \
    "$DB_NAME" > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Local backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# ─────────────────────────────────────────────────────────────────
# INTEGRITY CHECK (mandatory)
# ─────────────────────────────────────────────────────────────────
pg_restore --list "$BACKUP_FILE" > /dev/null
log "✅ Integrity verified — backup readable"

# Checksum
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"

# ─────────────────────────────────────────────────────────────────
# S3 UPLOAD (off-site copy — 3-2-1 rule)
# ─────────────────────────────────────────────────────────────────
aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/${DB_NAME}_${DATE}.dump" \
    --storage-class STANDARD_IA \
    --server-side-encryption aws:kms \
    --metadata "db=$DB_NAME,date=$DATE,host=$DB_HOST"

log "✅ S3 upload succeeded"

# ─────────────────────────────────────────────────────────────────
# RETENTION — delete backups older than 30 days
# ─────────────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
aws s3 ls "$S3_BUCKET/" | awk '{print $4}' | \
    while read file; do
        file_date=$(echo "$file" | grep -oP '\d{8}')
        if [[ $(date -d "$file_date" +%s) -lt $(date -d "30 days ago" +%s) ]]; then
            aws s3 rm "$S3_BUCKET/$file"
            log "Deleted old backup: $file"
        fi
    done

log "✅ Backup complete — $BACKUP_FILE"
```

```bash
#!/bin/bash
# backup/pg_restore.sh — Restore with validation
# ALWAYS test this script regularly (monthly DR drill recommended)

set -euo pipefail

BACKUP_FILE=${1:?Usage: pg_restore.sh <backup_file> [target_db]}
TARGET_DB=${2:-"${DB_NAME}_restore_$(date +%Y%m%d)"}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

# Checksum check before restoring
if [[ -f "${BACKUP_FILE}.sha256" ]]; then
    sha256sum -c "${BACKUP_FILE}.sha256" || { log "❌ INVALID checksum — corrupted backup"; exit 1; }
    log "✅ Checksum verified"
fi

# Create the target database
psql -c "CREATE DATABASE $TARGET_DB;"

# Restore
pg_restore \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --dbname="$TARGET_DB" \
    --no-password \
    --jobs=4 \           # Parallelize for large databases
    --verbose \
    "$BACKUP_FILE"

# Post-restore validation
ROW_COUNT=$(psql -d "$TARGET_DB" -t -c "SELECT count(*) FROM orders;")
log "✅ Restore succeeded — $TARGET_DB — orders: $ROW_COUNT rows"
log "Drop the test database: DROP DATABASE $TARGET_DB;"
```

### Phase 7 — Conditional persistence

- **If invoked from `infrastructure-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `infrastructure/sre/` via Bash if absent
  2. Write `infrastructure/sre/YYYY-MM-DD_sre.md`

### Phase 8 — Memory

> ⚠️ Skip if invoked from `infrastructure-agent`.

Record in `<project>/.claude/infra-knowledge.md`:
- SLOs defined per service + targets
- Alerting stack + notification channels
- Production DBMS + version + replication configured
- Backup strategy: frequency + retention + last restore check
