---
name: cloud-security
description: "Cloud security audit and design — IAM policies, Security Groups, secrets management, AWS/Azure/GCP compliance. Auto-invoke on mention of: cloud security, cloud IAM, public S3, security group, secrets manager, IAM policy, public bucket, cloud security, terraform, cloudformation, kubernetes, cloud infrastructure."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: security
dependencies: []
conflicts: []
---

# Cloud Security — IAM, network, and secrets audit (Sonnet)

Audits cloud security configuration: IAM policies, Security Groups, bucket/blob exposure, secrets management, AWS / Azure / GCP compliance.

## Optional input (if invoked from security-audit)

Use the following if provided by `security-audit`:
- Phase 5 config findings: `.env` files, Dockerfile, detected configs
- Phase 6 header findings: HTTP responses, exposed services
- Confirmed cloud scope: AWS / Azure / GCP

If no context is provided (direct invocation): scan the current directory for cloud configuration files (`*.tf`, `*.yml`, `*.yaml`, `serverless.yml`, `template.json`, `.env*`).

## Workflow

### Phase 1 — Cloud resource mapping

Glob on cloud patterns:
- Terraform: `**/*.tf`, `**/*.tfvars`
- CloudFormation: `**/template.json`, `**/template.yaml`, `**/sam.yaml`
- Kubernetes / Helm: `**/k8s/**/*.yaml`, `**/helm/**/*.yaml`
- Serverless: `**/serverless.yml`
- Generic cloud configs: `**/.aws/**`, `**/.azure/**`, `**/gcp-*.json`

If the cloud scope was provided by `security-audit`:
- AWS → prioritize Phases 2 and 3 on `*.tf`, `template.json`
- Azure → prioritize `*.bicep`, `azuredeploy.json`, NSG rules
- GCP → prioritize `gcp-*.json`, `iam_binding`, `google_*` resources

### Phase 2 — IAM Policy Audit

Grep the identified files:

| Risk | Patterns | Severity |
|--------|----------|----------|
| Dangerous wildcard | `"Action"\s*:\s*"\*"`, `"Resource"\s*:\s*"\*"` | CRITICAL |
| Public S3 access | `BlockPublicAcls.*false`, `"Principal"\s*:\s*"\*"` | CRITICAL |
| Overly permissive role | `AdministratorAccess`, `PowerUserAccess` | HIGH |
| MFA not required | absence of `aws:MultiFactorAuthPresent` in sensitive policies | HIGH |
| Overly broad cross-account | `"AWS"\s*:\s*"\*"` in Principal | HIGH |

### Phase 3 — Network audit (Security Groups / NSG / Firewall rules)

Grep for network exposure:
- Ports open to `0.0.0.0/0` or `::/0`
- Critical ports publicly exposed: 22 (SSH), 3389 (RDP), 1433 (MSSQL), 3306 (MySQL), 5432 (Postgres), 27017 (MongoDB), 6379 (Redis), 9200 (Elasticsearch)
- No restriction on admin ports

### Phase 4 — Secrets management

Grep all files (excluding `.git/`, `node_modules/`):
- Hardcoded credentials: `aws_access_key_id\s*=`, `AZURE_CLIENT_SECRET\s*=`, `GOOGLE_APPLICATION_CREDENTIALS` with an inline value
- Plaintext secrets in cloud environment variables: `env:\s*\n.*SECRET`, `env:\s*\n.*PASSWORD`
- No references to a secrets manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault)

### Phase 5 — Compliance and best practices

Grep the identified files to check for the presence of these controls:

| Control | Expected patterns | Absence = risk |
|----------|------------------|-----------------|
| Encryption at rest | `encrypted.*true`, `StorageEncrypted`, `enableDiskEncryption` | HIGH |
| Encryption in transit | `enforce_https`, `require_ssl`, `minimum_tls_version` | HIGH |
| Cloud logging | `CloudTrail`, `AuditLog`, `diagnostic_settings`, `google_logging` | HIGH |
| Backup / retention | `retention_days`, `backup_policy`, `lifecycle_rule` | MEDIUM |
| Object versioning | `versioning.*enabled`, `enable_versioning.*true` | LOW |

### Phase 6 — cloud-security report

Generate a structured `cloud-security-findings.md` report with:
- Findings table by severity (CRITICAL / HIGH / MEDIUM / LOW)
- Affected resource, detected pattern, recommended remediation
- Reference to the applicable CIS Benchmark (AWS/Azure/GCP)

- If invoked from `security-audit`: don't write a file — the consolidated report is produced by `pentest`.
- If invoked standalone:
  1. Create the folder via Bash: `mkdir -p security/cloud-security`
  2. Write via Write to `security/cloud-security/YYYY-MM-DD_cloud-security.md` (actual date at execution time)

### Phase 7 — Memory

> ⏭️ Skip if invoked from `security-audit` (memorization is delegated to `memory-ritual` in Phase 10).

If invoked directly: append critical findings to `.claude/security-knowledge.md` under a `## Cloud Security — YYYY-MM-DD` block.
