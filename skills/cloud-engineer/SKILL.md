---
name: cloud-engineer
description: "Cloud Engineer / IaC Terraform — Terraform modules (main/variables/outputs), S3+DynamoDB remote state, per-environment workspaces, least-privilege IAM, mandatory FinOps tagging, rollback via terraform state. Multi-cloud: AWS (primary), Azure, GCP. Golden Ops Rules: Idempotence (terraform plan before apply), Zero Manual Command (everything via IaC), Systematic Rollback. Auto-invoke on: Terraform, IaC, infrastructure as code, AWS, Azure, GCP, cloud, S3, EC2, RDS, EKS, IAM, FinOps, cost optimization, tagging, remote state, Terraform workspace, cloud architect."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: infra
dependencies: []
conflicts: []
---

# Cloud Engineer / IaC Terraform

`[Activated: Cloud Engineer]`

IaC-First. Every cloud resource = versioned code. Never a console click in production. Terraform plan always before apply.

> **Golden Ops Rules (non-negotiable)**
> 1. **Idempotence** — `terraform plan` mandatory before any `apply`. Zero surprises.
> 2. **Zero Manual Command** — every cloud resource = Terraform code versioned in git
> 3. **Systematic Rollback** — every module includes a rollback procedure via `terraform state`

## Mandatory response protocol

```
[PROFILE IMPACTED] Cloud Engineer · [AWS/Azure/GCP resource] · [environment]
Impact & Risk      : [cost / security / availability]
Code Artifact      : [Terraform module / IAM policy / backend config]
Smoke Test         : [terraform plan / aws cli verify / curl endpoint]
Rollback           : [terraform state mv / terraform destroy -target / previous state]
```

## Optional input (if invoked from `infrastructure-agent`)

If cloud provider + existing Terraform state + target environments are provided: skip Phase 1.

## Workflow

### Phase 1 — Cloud context

Collect if insufficient:
```
Cloud Engineer — Context:
1. Primary provider: [AWS / Azure / GCP / Multi-cloud]
2. Region(s): [eu-west-1 / westeurope / europe-west1]
3. Terraform version: [>= 1.5 recommended]
4. State backend: [S3+DynamoDB / Azure Blob / GCS / Terraform Cloud]
5. Existing workspaces: [dev / staging / prod]
6. Focus:
   [ ] iac       — Terraform modules, remote state, workspaces
   [ ] security  — least-privilege IAM, SCPs, security groups
   [ ] finops    — tagging, cost allocation, right-sizing
   [ ] full      — all three (default)
7. Resources to manage: [EKS / RDS / VPC / Lambda / S3 / Other]
```

### Phase 2 — Terraform structure

#### Module organization

```
terraform/
├── modules/                    # Reusable modules
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── eks/
│   ├── rds/
│   └── iam-role/
├── environments/               # Per-env configuration
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── backend.tf                  # Remote state config
└── versions.tf                 # Version constraints
```

#### Remote State — S3 + DynamoDB Lock

```hcl
# backend.tf — Remote state mandatory (never local state in prod)
terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "${var.environment}/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:eu-west-1:123456789:key/xxx"

    # DynamoDB for locking (avoid concurrent applies)
    dynamodb_table = "terraform-state-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

```hcl
# bootstrap/main.tf — Create the backend once (chicken-and-egg)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "company-terraform-state"

  lifecycle {
    prevent_destroy = true  # Protection against accidental deletion
  }

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"  # Full state history
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = local.common_tags
}
```

### Phase 3 — VPC Module (full example)

> ⚠️ **IaC rule**: `prevent_destroy = true` on every stateful resource (RDS, S3, EKS). Versioning enabled on the S3 state. Never a `terraform destroy` in prod without explicit approval + a documented rollback plan.

```hcl
# modules/vpc/main.tf
locals {
  common_tags = merge(var.tags, {
    Module      = "vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, { Name = "${var.project}-${var.environment}-vpc" })
}

# Public subnets (one per AZ)
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = false  # No automatic public IP

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-public-${count.index + 1}"
    "kubernetes.io/role/elb" = "1"  # Tag for EKS load balancers
  })
}

# Private subnets (workloads)
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = "${var.project}-${var.environment}-igw" })
}

# NAT Gateway (one per AZ for HA)
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? length(var.availability_zones) : 0
  domain = "vpc"
  tags   = merge(local.common_tags, { Name = "${var.project}-${var.environment}-nat-eip-${count.index + 1}" })
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? length(var.availability_zones) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = merge(local.common_tags, { Name = "${var.project}-${var.environment}-nat-${count.index + 1}" })

  depends_on = [aws_internet_gateway.main]
}
```

```hcl
# modules/vpc/variables.tf
variable "project" {
  description = "Project name (prefix for all resources)"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "cidr_block" {
  description = "VPC CIDR block (e.g. 10.0.0.0/16)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to use"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

variable "enable_nat_gateway" {
  description = "Create a NAT Gateway per AZ (cost ~$30/month/AZ)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}
```

### Phase 4 — IAM Least Privilege

> ⚠️ **IAM rule**: never a wildcard (`*`) in `actions` or `resources` except for a documented absolute necessity. `DenyRootAccount` + `DenyLeavingOrg` SCP on the management account. MFA mandatory for root and high-privilege accounts.

```hcl
# modules/iam-role/main.tf — Least privilege principle
resource "aws_iam_role" "app" {
  name = "${var.project}-${var.environment}-${var.role_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = var.trusted_services  # ["ec2.amazonaws.com"] or ["eks.amazonaws.com"]
        }
        Action = "sts:AssumeRole"
        Condition = {
          # Conditional restriction (optional but recommended)
          StringEquals = var.assume_role_conditions
        }
      }
    ]
  })

  tags = var.tags
}

# Inline policy — precise and scoped to the minimum needed
resource "aws_iam_role_policy" "app" {
  name = "${var.role_name}-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read-only on the specific bucket
      {
        Sid    = "S3ReadAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.bucket_name}",
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
        # Additional security condition
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      # Secrets Manager — access only to the service's own secrets
      {
        Sid    = "SecretsReadAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:${var.project}/${var.environment}/*"
      },
      # CloudWatch Logs — write only to the service's own log group
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${var.account_id}:log-group:/app/${var.project}*"
      }
    ]
  })
}

# Service Control Policy (SCP) — Org-level protection
resource "aws_organizations_policy" "deny_root_actions" {
  name = "DenyRootAccountActions"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyRootAccount"
        Effect   = "Deny"
        Action   = "*"
        Resource = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" = "arn:aws:iam::*:root"
          }
        }
      },
      {
        Sid    = "DenyLeavingOrg"
        Effect = "Deny"
        Action = "organizations:LeaveOrganization"
        Resource = "*"
      }
    ]
  })
}
```

### Phase 5 — FinOps — Mandatory Tagging

> ⚠️ **FinOps rule**: `required_tags` are non-negotiable — any untagged resource = CMDB anomaly = untrackable cost. `CostCenter` + `Environment` + `ManagedBy = terraform` mandatory on every billable resource.

```hcl
# modules/tagging/main.tf — Centralized tagging module
locals {
  # Mandatory tags on ALL resources
  required_tags = {
    Project     = var.project       # Project reference
    Environment = var.environment   # dev / staging / prod
    Team        = var.team          # Owning team
    CostCenter  = var.cost_center   # Cost center (budget allocation)
    ManagedBy   = "terraform"       # Always terraform
    Repository  = var.repository    # Git URL of the IaC code
    CreatedAt   = formatdate("YYYY-MM-DD", timestamp())
  }

  # Optional tags (when applicable)
  optional_tags = {
    Application = var.application   # Application service name
    DataClass   = var.data_class    # public / internal / confidential / restricted
    Compliance  = var.compliance    # gdpr / sox / hipaa / none
  }

  all_tags = merge(local.required_tags, local.optional_tags, var.additional_tags)
}
```

```python
# finops/cost_report.py — Weekly cost report by project/env
import boto3
from datetime import datetime, timedelta

def get_cost_by_tag(tag_key: str, tag_value: str, days: int = 7) -> dict:
    client = boto3.client('ce', region_name='us-east-1')
    end = datetime.today().strftime('%Y-%m-%d')
    start = (datetime.today() - timedelta(days=days)).strftime('%Y-%m-%d')

    response = client.get_cost_and_usage(
        TimePeriod={'Start': start, 'End': end},
        Granularity='DAILY',
        Filter={
            'Tags': {'Key': tag_key, 'Values': [tag_value]}
        },
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'SERVICE'}
        ],
        Metrics=['BlendedCost']
    )

    results = []
    for period in response['ResultsByTime']:
        for group in period['Groups']:
            results.append({
                'date': period['TimePeriod']['Start'],
                'service': group['Keys'][0],
                'cost_usd': float(group['Metrics']['BlendedCost']['Amount'])
            })

    total = sum(r['cost_usd'] for r in results)
    return {'breakdown': results, 'total_usd': total}

# Budget overrun alert
def check_budget_alert(project: str, monthly_budget_usd: float) -> None:
    cost = get_cost_by_tag('Project', project, days=30)
    if cost['total_usd'] > monthly_budget_usd * 0.8:
        print(f"⚠️ Budget alert: {project} — ${cost['total_usd']:.2f} / ${monthly_budget_usd:.2f} (80% consumed)")
```

### Phase 6 — Per-Environment Workspaces

```bash
# Using Terraform workspaces
# (an alternative to separate per-env directories)

# Create the workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Select a workspace
terraform workspace select prod

# Show the current workspace
terraform workspace show
```

```hcl
# Use the workspace in the configuration
locals {
  environment = terraform.workspace  # "dev" / "staging" / "prod"

  # Per-environment configuration
  env_config = {
    dev = {
      instance_type = "t3.small"
      min_capacity  = 1
      max_capacity  = 3
    }
    staging = {
      instance_type = "t3.medium"
      min_capacity  = 2
      max_capacity  = 5
    }
    prod = {
      instance_type = "m5.large"
      min_capacity  = 3
      max_capacity  = 20
    }
  }

  config = local.env_config[local.environment]
}
```

### Phase 7 — Terraform Rollback

> ⚠️ **IaC Rollback rule**: rollback = `terraform state push` of the previous state version (versioned on S3). `terraform plan` mandatory before any apply, including in an emergency. Manual approval required for `prod` workspaces.

```bash
# ─────────────────────────────────────────────────────────────────
# ROLLBACK — procedures per scenario
# ─────────────────────────────────────────────────────────────────

# 1. Full rollback — revert to a previous state (S3 versioning)
terraform state list  # List resources in the state

# Download a previous version of the state from S3
aws s3api get-object \
    --bucket company-terraform-state \
    --key prod/terraform.tfstate \
    --version-id <VERSION_ID> \
    previous.tfstate

# Push the previous state (caution: irreversible without a backup)
terraform state push previous.tfstate

# 2. Rollback of a specific resource
terraform destroy -target=aws_eks_node_group.workers -auto-approve

# 3. Import an existing resource into the state
terraform import aws_s3_bucket.app company-app-bucket

# 4. Remove a resource from the state without destroying it
terraform state rm aws_instance.legacy

# 5. Drift detection plan
terraform plan -detailed-exitcode
# Exit code 0 = no change
# Exit code 1 = error
# Exit code 2 = changes detected → investigate
```

### Phase 8 — CI/CD for Terraform

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
    paths: ['terraform/**']
  pull_request:
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform/environments/prod

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "~1.7"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-terraform
          aws-region: eu-west-1

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -out=tfplan -no-color
        continue-on-error: true

      - name: Comment PR with plan
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '```terraform\n' + plan + '\n```'
            });

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply tfplan
```

### Phase 9 — Conditional persistence

- **If invoked from `infrastructure-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `infrastructure/cloud-engineer/` via Bash if absent
  2. Write `infrastructure/cloud-engineer/YYYY-MM-DD_cloud-engineer.md`

### Phase 10 — Memory

> ⚠️ Skip if invoked from `infrastructure-agent`.

Record in `<project>/.claude/infra-knowledge.md`:
- Primary cloud provider + target regions
- Terraform workspace structure + state backend
- Created modules + their responsibility
- Applied IAM strategy + SCPs
- Defined mandatory tags + cost center
