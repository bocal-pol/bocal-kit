---
name: new-app
description: >
  Scoping a new application idea — exhaustive interview (5 axes), suggests unanticipated
  features based on the detected domain, MVP/V2/out-of-scope sorting, App Spec + initial
  Feature Backlog deliverables. Runs BEFORE project-bootstrap-agent.
  Auto-invoke on: "new application", "I want to build an app", "new project",
  "new app", "create a tool", "I want to launch", "app idea", "start a project",
  "create a platform", "I have an app idea", "we want to build", "we'd like to make an app".
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: cross
dependencies: []
conflicts: []
---

# new-app — Scoping an application idea

Turns a vague idea into a structured scope: an exhaustive interview, proposing unanticipated
features based on the domain, MVP/V2 sorting, `intake/app-spec.md` + `intake/feature-backlog-initial.md`
deliverables. Mandatory entry point before `project-bootstrap-agent` for any new application whose
scope isn't yet defined.

## Optional input (if invoked from team-dev)

If `intake/app-spec.md` or `intake/feature-backlog-initial.md` files already exist in the current
project, read them via `Read` as input context — don't re-ask what's already filled in. If context
is passed as an argument (description, pitch, stack), use it the same way.

## Workflow

### Phase 1 — Exhaustive interview

Via `AskUserQuestion`, ask in **a single wave**:

1. Working name + one-sentence pitch (the what + for whom + key value)
2. Real pain being solved — what's painful today without this app
3. Target audience: who uses it, in what context, how many users anticipated
4. Features already imagined (free-form list, no filtering)
5. Known constraints: mandated stack, budget, deadline, legal constraints (GDPR, sector)
6. Project context: solo, startup, corporate — systems to integrate, existing data

### Phase 2 — Domain detection & suggestions

Based on the answers, identify the application's **category**. Then propose features common in
that domain that the user hasn't **mentioned**. Examples by category:

| Category | Commonly forgotten features |
|-----------|----------------------------------|
| B2B SaaS | Guided onboarding, trial/freemium, billing/subscription, audit trail, public API, webhooks, SSO |
| Marketplace | Review/reputation system, dispute management, vendor payout, commission, KYC |
| Internal tool | SSO/SAML, granular roles, CSV/Excel export, activity logs, admin impersonation |
| Consumer mobile app | Push notifications, offline mode, social sharing, dark mode, WCAG accessibility |
| E-commerce | Abandoned cart, upsell/cross-sell, loyalty program, returns, multi-currency |
| Community platform | Moderation, reporting, badges, discussion threads, integrated newsletter |

Via `AskUserQuestion` multi-select: "These features are common for this type of app — which ones seem relevant to you?"

### Phase 3 — MVP / V2 sorting

Show the full feature list (mentioned + accepted suggestions) and ask via `AskUserQuestion`:

> "For each feature, say: MVP (essential at launch), V2 (planned but not blocking) or OOS (out of scope). Example: 'Auth=MVP, Notifications=V2, Public API=OOS'. List freely."

Claude interprets the answer and displays a grouped summary (MVP / V2 / Out of scope) for
validation. Push to keep the MVP small: an MVP feature should prove the app's value, not complete it.

### Phase 4 — Writing the deliverables

Write into the current project's `intake/`:

**`intake/app-spec.md`** — reuses the standard `app-spec` template:

```markdown
# App Spec — [Name]

- **Pitch**: one sentence (what + for whom + value)
- **Problem solved**: the real pain without this app

## Users & roles
| Role | Description | Main need |
|------|-------------|------------------|

## Scope
- **In scope (MVP)**: …
- **Planned for V2**: …
- **Out of scope (explicit)**: …

## Constraints
- **Technical**: stack, hosting, mandatory integrations
- **Legal / regulatory**: GDPR, sector, accessibility (WCAG)

## Non-functional requirements (NFR)
| Axis | Target |
|-----|-------|
| Performance | … |
| Availability | … |
| Security | … |
| Accessibility | … |

## Assumptions & risks
- **Assumptions**: …
- **Risks**: …
```

**`intake/feature-backlog-initial.md`** — the sorted list from Phase 3:

```markdown
# Initial Feature Backlog — [Name]

## MVP — To ship at launch
| # | Feature | MoSCoW | Rationale |
|---|---------|--------|-----------|

## V2 — Next iteration
| # | Feature | Reason for deferral |
|---|---------|---------------------|

## Out of scope
| Feature | Reason for exclusion |
|---------|--------------------|
```

**Conditional persistence:**
- **Standalone**: create `intake/` if absent, then write both files.
- **Orchestrated from team-dev**: return structured Markdown; persistence is handled by the orchestrator.

### Phase 5 — Handoff

Display:
- The chosen pitch
- Detected app category
- Count: N MVP features | N V2 features | N out of scope
- Paths of the created files
- Recommendation: "Next step → `/team-dev --socle` to produce the full intake kit (Brand Brief, Data Dictionary, Error Journal…)"

If `project-bootstrap-agent` is available, offer to chain directly into it: via `Skill`, invoke
`project-bootstrap-agent` with the produced context (`intake/app-spec.md` +
`intake/feature-backlog-initial.md`) as input.

## Skip memory

The `intake/app-spec.md` and `intake/feature-backlog-initial.md` artifacts are the
deliverables — versioned in the project, not in `~/.claude/memory/`. If invoked standalone, invoke
`memory-ritual` at the end of the session.
⚠️ Fallback: if `memory-ritual` is unavailable, display "⚠️ memory-ritual unavailable — memory consolidation to be done manually".
