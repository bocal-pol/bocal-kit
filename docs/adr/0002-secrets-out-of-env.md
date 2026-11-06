# ADR 0002 — Secrets out of .env: a secrets manager is mandatory

- **Status**: accepted
- **Date**: 2026-08-20

## Context

Convention established following a review of secrets-management practices. `.env` files containing passwords (`DB_PASSWORD`, `REDIS_PASSWORD`, `MAIL_PASSWORD`, `API_SECRET`…) are a structural flaw: they leak via backups, screen shares, accidental commits, even in local development.

## Decision

Any password in a `.env` file is a security flaw. This rule applies even to local development environments.

### Alternatives to systematically propose

- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- SOPS + age/GPG
- Docker Secrets

### Application rules

- Check whether the project already has a secrets manager before creating/storing a secret
- If one exists: use it — the `.env` only holds the reference (path/role), never the cryptographic material
- A private signing key (JWT/OAuth/SSH) never goes in a `.env`, even uncommitted, if an alternative exists
- If no alternative is available: explicitly flag the flaw and don't mark the task as "done"

## Positive consequences

- Eliminates the main cause of credential leaks in development
- Forces secrets infrastructure to be adopted from the start of the project

## Negative consequences / risks

- Initial setup overhead (configuring Vault, SOPS…)
- Friction for developers used to plain `.env` files

## Alternatives considered

- **Gitignored `.env`**: insufficient — backups, screen shares, and accidental commits remain leak vectors. Rejected.
- **Encrypted `.env`**: complexity without sufficient guarantee. Not adopted.

## Scope

All projects, all environments (dev, staging, production).
