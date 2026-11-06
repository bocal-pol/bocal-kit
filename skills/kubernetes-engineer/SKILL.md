---
name: kubernetes-engineer
description: "Kubernetes Engineer — Docker (multi-stage, distroless, docker-compose), K8s (manifests, Helm, namespaces), container hardening, named volumes, secrets management. Auto-invoke on mention of: docker, kubernetes, k8s, dockerfile, docker-compose, helm, container, pod, k8s deployment, ingress, persistent volume, multi-stage build, distroless, securitycontext, k8s namespace."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: infra
dependencies:
  - context7-mcp
conflicts: []
---

# Kubernetes Engineer — Docker & K8s

Secure, optimized containerization: multi-stage Dockerfiles, full docker-compose, K8s manifests, Helm, workload hardening.

## ICT Rules — Non-negotiable

| Rule | Application in this skill |
|-------|--------------------------|
| **IaC First** | `docker-compose` > `docker run` — every standalone `docker run` is converted into a docker-compose service |
| **Idempotence** | `docker-compose up --build` = identical result at any time. No non-declarative server-side state |
| **Safety First** | Before `docker-compose down -v` (deletes volumes) → mandatory backup of named volumes |
| **Image optimization** | Multi-stage builds, always. Distroless or alpine images preferred. Non-root USER mandatory |
| **Response protocol** | Impact → Implementation (commented) → Verification (`docker logs`, `kubectl get`) → Rollback |

**Boundary with `sysadmin`**: `sysadmin` configures the Linux host (kernel, cgroups, Docker daemon). `kubernetes-engineer` configures the workloads running on that host.

**Boundary with `devops`**: `kubernetes-engineer` produces deployment artifacts (Dockerfile, Helm chart). `devops` produces the CI/CD pipelines that publish and deploy them.

## Optional input (if invoked from `infrastructure-agent`)

If existing Dockerfiles + OS context are provided as input:
- Analyze the supplied Dockerfiles and propose optimizations in Phase 3
- Adapt recommendations to the host OS (Debian vs RHEL)

Otherwise: run the full workflow from Phase 1.

## Workflow

### Phase 1 — Context collection

Read via Glob + Read:
- `Dockerfile*`, `docker-compose*.yml` (sorted descending)
- `k8s/**/*.yaml`, `manifests/**/*.yaml`, `helm/**` (K8s if present)
- `infrastructure/kubernetes-engineer/*.md` (previous sessions)
- **Exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

Grep to detect anti-patterns:
- `docker run -d` in scripts → to convert to docker-compose
- `COPY . .` without `.dockerignore` → risk of copying node_modules
- `USER root` as the last instruction → non-root mandatory
- Secrets in ARG/ENV: `ENV.*PASSWORD`, `ARG.*SECRET`, `ENV.*API_KEY`

If insufficient, collect via AskUserQuestion:
```
Containerization context — please provide:
1. Application stack: Node.js / Python / Java / Go / PHP / other
2. Environments: dev / staging / prod (or a combination)
3. Platform: Docker Compose only / K8s (bare metal / EKS / AKS / GKE)
4. Volumes: data to persist? (type and approximate size)
5. Secrets: current mechanism (env files / Vault / K8s secrets / other)
6. Image registry: Docker Hub / GHCR / ECR / ACR / private registry
```

### Phase 2 — Auditing existing Dockerfiles

For each Dockerfile found, assess:

| Check | OK | KO | Fix |
|-------|----|----|-----------|
| Base image not `latest` (fixed tag) | | | Pin the version (e.g. `node:20.15-alpine`) |
| Multi-stage build (builder + runtime) | | | Separate build and runtime |
| Lightweight runtime image (alpine/distroless) | | | Replace with alpine or distroless |
| `.dockerignore` present | | | Create `.dockerignore` (node_modules, .git, etc.) |
| Non-root USER as the last instruction | | | Add `USER nonroot` or `USER 1001` |
| No secrets in ARG/ENV | | | Use Docker secrets or mounts |
| HEALTHCHECK defined | | | Add `HEALTHCHECK` |
| Optimized layers (COPY package*.json before COPY .) | | | Reorder the COPY instructions |

### Phase 3 — Optimized Dockerfiles (multi-stage + distroless)

#### Node.js — Production

```dockerfile
# Stage 1 — Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Copy ONLY the dependency manifests first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build  # if a build step is needed

# Stage 3 — Runtime (distroless — no shell, no package manager)
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
# USER nonroot is implicit in the nonroot image
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"]
CMD ["dist/main.js"]
```

#### Python — Production

```dockerfile
# Stage 1 — Build
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2 — Runtime (distroless python)
FROM gcr.io/distroless/python3-debian12:nonroot
WORKDIR /app
COPY --from=builder /root/.local /home/nonroot/.local
COPY --chown=nonroot:nonroot src/ ./src/
ENV PYTHONPATH=/home/nonroot/.local/lib/python3.12/site-packages
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
CMD ["python", "-m", "src.main"]
```

#### Go — Ultra-minimal (scratch)

```dockerfile
# Stage 1 — Build
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CGO_ENABLED=0 for a static binary (required with scratch)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o app .

# Stage 2 — Scratch runtime (empty image — binary only)
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/app /app
USER 1001:1001
EXPOSE 8080
CMD ["/app"]
```

#### Standard .dockerignore

```
# Build artifacts
node_modules/
dist/
build/
.next/
__pycache__/
*.pyc
*.egg-info/
vendor/

# Git & IDE
.git/
.gitignore
.vscode/
.idea/

# Tests & docs
*.test.*
*.spec.*
tests/
docs/

# Secrets
.env
.env.*
*.pem
*.key
*.p12
secrets/

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore
```

### Phase 4 — Full Docker Compose

```yaml
# docker-compose.yml — Standard production
# ⚠️ Volume ROLLBACK: docker-compose down (without -v) — DO NOT use -v without a backup

version: '3.9'

services:
  app:
    image: ${REGISTRY:-registry.example.com}/myapp:${APP_VERSION:-latest}
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime  # Target stage for multi-stage builds
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://db:5432/${POSTGRES_DB}
    env_file:
      - .env.production  # DO NOT commit — add to .gitignore
    volumes:
      - app-uploads:/app/uploads  # Named volume (recommended) for persistence
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - backend
      - frontend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 128M

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER_FILE: /run/secrets/db_user       # Docker secret (safer than env)
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data  # Named volume — DO NOT use a bind mount for the DB
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$(cat /run/secrets/db_user)"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    secrets:
      - db_user
      - db_password

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - backend

volumes:
  app-uploads:     # Data uploaded by the application
  db-data:         # PostgreSQL data — NEVER delete without a backup
  redis-data:      # Persistent Redis cache

networks:
  frontend:        # Exposed network (app → nginx/traefik)
  backend:         # Internal network (app ↔ db ↔ redis)

secrets:
  db_user:
    file: ./secrets/db_user.txt      # Local file — DO NOT commit
  db_password:
    file: ./secrets/db_password.txt  # Local file — DO NOT commit
```

**Key docker-compose commands:**
```bash
# Build + start (idempotent)
docker-compose up -d --build

# ⚠️ Volume ROLLBACK — BACKUP before any destructive operation
docker run --rm -v db-data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/db-data-$(date +%Y%m%d-%H%M%S).tar.gz /data
# ROLLBACK: docker-compose down (without -v) then restore the volume

# Logs
docker-compose logs -f app

# Rebuild a specific service with no downtime
docker-compose up -d --build --no-deps app
```

### Phase 5 — Kubernetes manifests

#### Deployment + Service + HPA

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
    version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Hardening — security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: registry.example.com/myapp:1.0.0  # Pinned tag — never latest in prod
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          # Container hardening
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          # Probes
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          volumeMounts:
            - name: tmp
              mountPath: /tmp  # readOnlyRootFilesystem needs an explicit tmp
      volumes:
        - name: tmp
          emptyDir: {}
---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

#### PersistentVolumeClaim + Secrets

```yaml
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-uploads
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard  # Adapt per cluster
  resources:
    requests:
      storage: 10Gi
---
# k8s/secret.yaml
# ⚠️ DO NOT commit secrets in plaintext — use Sealed Secrets or Vault
# Generate: echo -n "value" | base64
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
  namespace: production
type: Opaque
data:
  database-url: <base64-encoded-value>  # kubectl create secret generic myapp-secrets --from-literal=database-url=...
```

### Phase 6 — Post-deployment checks

```bash
# Docker Compose
docker-compose ps
docker-compose logs --tail=50 app
docker inspect <container_id> | grep -E "Status|Health"

# K8s
kubectl get pods -n production
kubectl describe deployment myapp -n production
kubectl rollout status deployment/myapp -n production
kubectl logs -l app=myapp -n production --tail=50

# K8s ROLLBACK
kubectl rollout undo deployment/myapp -n production
kubectl rollout history deployment/myapp -n production
```

### Phase 7 — Conditional persistence

- **If invoked from `infrastructure-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p infrastructure/kubernetes-engineer` via Bash
  2. Write `infrastructure/kubernetes-engineer/YYYY-MM-DD_kubernetes-engineer.md`

### Phase 8 — Memory

> ⚠️ Skip if invoked from `infrastructure-agent`.

If invoked standalone, record in `<project>/.claude/infra-knowledge.md`:
- Application stack and chosen base image
- Platform (Docker Compose / K8s / Helm)
- Named volumes created (list)
- Fixed anti-patterns (Dockerfile, secrets)
