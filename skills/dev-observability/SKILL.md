---
name: dev-observability
description: "Drives a project's dev-only product observability tools (PostHog for analytics/feature flags, Uptime Kuma for uptime monitoring) via a separate, strictly opt-in Docker compose. Auto-invoke on mention of: launch dev tools, open PostHog, check monitoring, track this event, add an Uptime Kuma check, dev observability tools."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Dev Observability — PostHog & Uptime Kuma (dev-only)

Drives the separate Docker compose that hosts PostHog (product analytics, feature flags, session
replay) and Uptime Kuma (uptime monitoring) locally, for event exploration and URL supervision during
development. **Strictly dev-only** — this skill must never let this compose appear in a deployment.

## Non-negotiable guardrail

The compose file (named `compose.dev-apps.yaml` or equivalent, found by Phase 0) carries its own
isolation rule in its header: never included in the main compose via `include:`, never referenced in
a deployment script or a "Going to production" README. **This skill explicitly refuses** to:
- add this file to another compose's `include:` attribute;
- reference it in a `scripts/deploy-*` script or equivalent;
- suggest its use on any target other than `localhost`/`127.0.0.1`.

If a request involves any of these actions, respond `⚠️ compose.dev-apps.yaml is strictly dev-only —
refusing inclusion in deployment` and don't execute it, even if explicitly asked — this is the rule
written by the file's own author, not a preference of this skill.

## Optional input (if invoked from `team-dev`)

- Requested action: `up` / `down` / `ps` / `logs [service]` / `track` (prepare PostHog event
  instrumentation in a submodule) / `check` (add an Uptime Kuma check)
- Target submodule if `track` (e.g. a frontend or backend submodule)

## Phase 0 — Locating and checking tool status

1. **Locate the compose**: `Glob` from the current project root for `**/compose.dev-apps.yaml` (and,
   if no match, `**/compose*.dev-apps*.y*ml` to tolerate a naming variant). If nothing is found, go
   to Phase 0b.
2. **Check persistent refusal state**: read `skills/dev-observability/refused.json` in this
   `bocal-kit` config (absolute path: `~/.claude/skills/dev-observability/refused.json`). Format:
   ```json
   { "posthog": { "refused": false }, "uptime-kuma": { "refused": false } }
   ```
   For any tool marked `"refused": true`: **never** propose or invoke it in this session, regardless
   of the project — skip straight to the next tool or end silently if both are refused. This file is
   **versioned** (shared by every project that loads this environment), unlike per-session memory
   which is scoped per project.
3. If the compose exists and at least one tool isn't refused → Phase 1.

## Phase 0b — Tool absent from the project

If `compose.dev-apps.yaml` doesn't exist in the current project (first invocation, or a project that
doesn't have this compose yet): via `AskUserQuestion`, propose **separately for each tool not marked
refused** in `refused.json`:

> "PostHog (analytics/feature flags) isn't configured on this project. Add it in local dev (separate
> container, strictly opt-in, never deployed)?"

> "Uptime Kuma (uptime monitoring) isn't configured on this project. Add it in local dev (separate
> container, strictly opt-in, never deployed)?"

- **If accepted**: this skill doesn't generate the compose itself (out of scope — substantial
  infrastructure work). Delegate to `infrastructure-agent` with the context "add PostHog/Uptime
  Kuma dev-only, model: separate non-internal network, `127.0.0.1` only, `cap_drop: ALL`,
  healthchecks, never in the main compose's `include:`".
- **If refused**: write `"refused": true` for that specific tool in
  `~/.claude/skills/dev-observability/refused.json` (create the file with both keys if absent, only
  modify the refused tool's key). Confirm: `✅ Noted — <tool> won't be proposed again on any project,
  unless you explicitly ask.` Don't ask the user to confirm twice in the same session if the file
  already has `refused: true`.

## Phase 1 — Status and startup

```bash
docker compose -f <found path>/compose.dev-apps.yaml ps
```

If the requested action is `up` (or no action specified and the containers are down):

```bash
docker compose -f <path>/compose.dev-apps.yaml up -d
```

Wait for healthchecks before announcing a service as ready — never say "it's ready" on the sole basis
of `docker compose up` returning without error:

```bash
docker compose -f <path>/compose.dev-apps.yaml ps --format json
```

Check that every launched service's health status is `healthy` (not just `running`) before giving
out URLs. If a service stays `starting`/`unhealthy` past its documented `start_period` in the
compose, show its logs (`docker compose -f <path> logs <service> --tail 50`) before concluding it
failed.

## Phase 2 — Actions

- **`down`**: `docker compose -f <path> down` (never `-v` unless explicitly asked — the
  PostHog/Uptime Kuma volumes may contain events/checks the user wants to keep).
- **`ps`**: show the status table as-is.
- **`logs [service]`**: `docker compose -f <path> logs <service> --tail 100 -f` if a service is
  specified, otherwise all services with `--tail 50`.
- **`track`** (prepare PostHog event instrumentation): see Phase 3. Refuse if `posthog.refused ==
  true` in `refused.json` and say so: `⚠️ PostHog was previously refused — explicitly re-run "enable
  PostHog" to revisit`.
- **`check`** (add an uptime check): give the Uptime Kuma URL (`http://localhost:3001`) and the steps
  in its UI — this skill doesn't drive the Uptime Kuma API (out of scope, no added value over the
  UI).

## Phase 3 — PostHog instrumentation (config only, not the SDK)

On a `track` request with a target submodule: this skill only prepares the **configuration**, not the
SDK installation or the application call — that remains the work of `backend-agent`/`frontend-agent`
on an explicit request to track a specific event.

1. Read the target submodule's `.env` and `.env.example` (`Read`).
2. Add, if absent, the variables matching the detected language:
   - Frontend JS/TS: `VITE_POSTHOG_HOST=http://localhost:8010` (or `NEXT_PUBLIC_POSTHOG_HOST`/the
     equivalent prefix for the detected framework) + `VITE_POSTHOG_KEY=<PostHog project API key>` if
     known, otherwise leave a comment `# fetch from PostHog → Project Settings → API keys`.
   - PHP backend (Laravel): `POSTHOG_HOST=http://localhost:8010` + `POSTHOG_API_KEY=` (same comment
     if empty).
3. Add the same keys (with no value, or with an explicit comment) to `.env.example` so the team knows
   the integration exists.
4. **Don't** run `npm install posthog-js` or `composer require posthog/posthog-php`, and don't write
   SDK initialization code — report it as the next step for `backend-agent`/`frontend-agent` if the
   user wants to go further.

## ⚠️ Fallback

- Compose not found and Phase 0b refused or unanswered → end with no action, no blocking error
  message (it's an optional tool).
- `docker` absent from PATH → display `⚠️ Docker required for dev-observability` and point to
  `INSTALL.md` (System prerequisites section) rather than proposing an ad hoc manual install.
