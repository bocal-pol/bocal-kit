---
name: service-designer
description: "Service Designer — full service blueprint (frontstage/backstage/support), Mermaid ecosystem map, moments of truth, organizational bottlenecks, cross-team improvement plan. Auto-invoke on: service design, service blueprint, multi-channel journey, service orchestration, backstage process, ecosystem map, service touchpoints, moments of truth, omnichannel consistency, cross-channel journey."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: medium
scope: frontend
dependencies: []
conflicts: []
---

# Service Designer

Designs the end-to-end experience — what the user sees (frontstage) AND what makes it possible
(backstage).

> **Boundary with `ux-designer`**: `ux-designer` designs interfaces (what's on screen).
> `service-designer` designs the whole service — the screens + the human processes + the systems +
> the partners that feed them.
> **Boundary with `ux-researcher`**: `ux-researcher` documents user friction on interfaces.
> `service-designer` identifies organizational root causes and structural opportunities.

## Optional input (if invoked from `design-agent`)

If service scope + identified channels + `ux-researcher` findings are provided:
- Skip Phase 1 and start at Phase 2 with that data
- Adapt the blueprint to the channels and personas provided

Otherwise: run the workflow starting from Phase 1.

## Workflow

### Phase 1 — Service context

Read via Glob + Read:
- `design/ux-researcher/*.md` (findings, journey maps, personas)
- `analysis/product-manager/*.md` (PRD, user stories, roadmap)
- `analysis/analyst/*.md` (Project Brief, business context)
- `architecture/architect/*.md` (existing systems, integrations)
- **Exclusions**: `node_modules/`, `vendor/`, `*.test.*`

Gather via AskUserQuestion if insufficient:
```
Service Design — Context:

1. Service scope: [Service name + short description]
2. Active channels:
   [ ] Web (desktop/mobile)
   [ ] Native mobile app
   [ ] Email
   [ ] Phone / Call center
   [ ] Physical point of sale / Counter
   [ ] Chat / Messaging
   [ ] Mail / Paper document
   [ ] Other: ___
3. Backstage actors:
   [ ] Internal team only
   [ ] Partners / contractors
   [ ] Third-party system / external API
4. Main problem to solve:
   [ ] Inconsistency between channels
   [ ] Backstage delays / bottlenecks
   [ ] Journey breaks (failed handoffs)
   [ ] Poor resource allocation
   [ ] Other: ___
5. Personas involved: [names if sourced from ux-researcher]
```

### Phase 2 — Ecosystem Map

An overview of every actor and their relationships before diving into the blueprint.

```markdown
## Ecosystem Map — [Service Name]

### Identified actors

| Actor | Type | Role in the service | Primary channel |
|--------|------|---------------------|-----------------|
| [End user] | Customer | Service beneficiary | Web / Mobile |
| [Support Team] | Internal | Incident resolution | Phone / Chat |
| [CRM System] | System | Customer data storage | API |
| [Logistics Partner] | External | Physical delivery | Webhook |
| ... | ... | ... | ... |

### Relationship map
```

```mermaid
graph LR
    subgraph "Users"
        U1[Individual Customer]
        U2[Business Customer]
    end

    subgraph "Frontstage Channels"
        C1[Web App]
        C2[Mobile App]
        C3[Email]
        C4[Support Chat]
    end

    subgraph "Backstage Teams"
        E1[Product Team]
        E2[Customer Support]
        E3[Ops / Delivery]
    end

    subgraph "Systems"
        S1[CRM]
        S2[Database]
        S3[Payment API]
        S4[Partner X]
    end

    U1 --> C1
    U1 --> C3
    U2 --> C1
    U2 --> C4
    C1 --> S2
    C1 --> S3
    C4 --> E2
    E2 --> S1
    E3 --> S4
    S1 --> E1
```

### Touchpoints by actor

| Touchpoint | Channel | Responsible actor | Supporting system |
|------------|-------|-------------------|-----------------|
| Sign-up | Web | Product | DB + Email service |
| Order confirmation | Auto email | System | CRM + Email service |
| Delivery tracking | Mobile App | Ops | Partner API |
| Complaint | Chat / Phone | Support | CRM |
| ... | ... | ... | ... |

### Critical data flows

| Data | From | To | Frequency | Risk if absent |
|--------|----|------|-----------|-----------------|
| Order status | Ops | Customer (App) | Real-time | Frustration, support calls |
| Payment data | Customer | Payment system | Per transaction | Critical blocker |
| Customer history | CRM | Support | On demand | Support with no context |

### Gaps identified (ecosystem)
- [Actor with no direct communication channel]
- [Data that doesn't flow between two systems that need it]
- [Undocumented external dependency]
```

### Phase 3 — Service Blueprint

The heart of service design. 5 horizontal layers, N vertical steps.

```markdown
## Service Blueprint — [Journey Name]

**Scope**: from [entry point] to [resolution/exit point]
**Primary persona**: [Name — from ux-researcher if available]
**Estimated total duration**: [Xmin / Xh / Xdays]

---

| Layer | Step 1 — [Name] | Step 2 — [Name] | Step 3 — [Name] | Step 4 — [Name] | Step 5 — [Name] |
|--------|-----------------|-----------------|-----------------|-----------------|-----------------|
| **Physical evidence** | [What the user holds/sees/touches] | ... | ... | ... | ... |
| **User actions** | [What the user does] | ... | ... | ... | ... |
| ─── LINE OF VISIBILITY ─── | | | | | |
| **Frontstage actions** (visible) | [Interaction with interface/human agent] | ... | ... | ... | ... |
| ─── LINE OF INTERNAL INTERACTION ─── | | | | | |
| **Backstage actions** (invisible) | [Internal processes triggered] | ... | ... | ... | ... |
| **Supporting systems** | [System / API / Database used] | ... | ... | ... | ... |

---

### Legend
- **Line of visibility**: separates what the user sees from what they don't
- **Line of internal interaction**: separates human actions from automated systems
- **[!]**: Identified friction point
- **[★]**: Moment of truth (make or break)
- **[⟳]**: Feedback loop

---

### Detailed blueprint — step by step

#### Step 1 — [Step name]
**Duration**: ~[X min]
**Channel**: [Web / Mobile / Email / Phone / ...]

| Layer | Content |
|--------|---------|
| Evidence | [Screen / Email / Document] |
| User action | [What the user does] |
| Frontstage action | [Interface or agent that responds] |
| Backstage action | [Process triggered — who does what] |
| Supporting system | [System involved] |
| **Wait time** | [0s / 2min / 24h] |
| **[!] Friction** | [Problem identified here, if applicable] |
| **[★] Moment of truth** | [What determines satisfaction/retention here] |

#### Step 2 — [Name]
[same]

...

---

### Critical handoffs
> Transitions between actors / systems are the most frequent breakage points.

| Handoff | From | To | Risk | Mitigation |
|---------|----|----|--------|------------|
| [Transition A→B] | [Actor/System A] | [Actor/System B] | [Context loss / Delay] | [Proposed solution] |
| ... | ... | ... | ... | ... |
```

### Phase 4 — Moments of Truth

```markdown
## Moments of Truth — [Service]

The moments that determine whether the user stays or leaves.

### Classification

| Moment | Blueprint step | Type | Stakes |
|--------|----------------|------|-------|
| **[Moment 1 name]** | Step X | Positive (loyalty opportunity) | If missed → immediate churn |
| **[Moment 2 name]** | Step Y | Negative (critical pain point) | If fixed → estimated +15 NPS pts |
| **[Moment 3 name]** | Step Z | Neutral → to transform | Differentiation possible |

### Moment of truth #1 — [Name]

**Context**: [When it happens in the journey]
**What the user feels**: [Emotion / Tension / Expectation]
**What happens backstage**: [Invisible but decisive process]

**Current scenario**:
1. [Backstage step 1 — often slow or manual]
2. [Backstage step 2]
3. [Result as perceived by the user]

**Target scenario**:
1. [Proposed backstage improvement]
2. [Impact on frontstage]
3. [New user perception]

**Success indicator**: [Measurable metric — processing time / satisfaction rate / etc.]

### Moment of truth #2 — [Name]
[same]
```

### Phase 5 — Bottleneck & opportunity analysis

```markdown
## Backstage Bottlenecks & Opportunities

### Analysis matrix

| Bottleneck | Location (step) | Root cause | User impact | Operational impact | Priority |
|------------|---------------------|--------------|-------------------|--------------------|---------:|
| [BN-1] | Step X | [Manual / Silo / External dependency] | [High/Medium/Low] | [High/Medium/Low] | 🔴 P0 |
| [BN-2] | Step Y | ... | ... | ... | 🟡 P1 |
| [BN-3] | Step Z | ... | ... | ... | 🟢 P2 |

### Bottleneck #1 — [Name] 🔴

**Location**: Between step X and step Y
**Symptom**: [What the user experiences — delay, error, silence]
**Root cause**: [Manual process? Handoff with no SLA? Legacy system?]
**Frequency**: [X% of journeys affected]

**User impact**:
- [Concrete frustration]
- [Deviant behavior — support calls, abandonment]

**Operational impact**:
- [Human cost — Xh/week]
- [System cost — X wasted requests]

**Proposed solutions**:
| Solution | Effort | Impact | Timeline | Recommendation |
|----------|--------|--------|-------|----------------|
| [Solution A — quick win] | Low | Medium | 2w | ✅ Recommended |
| [Solution B — structural] | High | High | 2 months | Plan on roadmap |

### Differentiation opportunities

| Opportunity | Description | Channel | Effort | Estimated impact |
|-------------|-------------|-------|--------|---------------|
| [OPP-1] | [What no competitor does well] | [Channel] | [Low/Medium/High] | [Strong retention] |
| [OPP-2] | ... | ... | ... | ... |
```

### Phase 6 — Cross-team improvement plan

```markdown
## Improvement Plan — [Service]

### Principles
- Every initiative involves different teams (that's the nature of service design)
- Prioritize improvements that unblock several teams at once
- Measure impact on the user side, not just operations

### Service Roadmap (3 horizons)

#### Horizon 1 — Quick wins (0–4 weeks)
> High-impact backstage improvements with immediate visible effect

| Initiative | Lead team | Teams involved | Target KPI |
|------------|--------------|-------------------|-----------|
| [Initiative A] | [Team X] | [Team Y, Z] | [Metric + target] |
| [Initiative B] | ... | ... | ... |

#### Horizon 2 — Restructuring (1–3 months)
> Process or organizational changes

| Initiative | Description | Teams | Dependencies | KPI |
|------------|-------------|---------|-------------|-----|
| [Initiative C] | [Redesign of the X→Y handoff] | [...] | [System A migration] | [...] |

#### Horizon 3 — Transformation (3–12 months)
> Structural redesign, new channels, new capabilities

| Initiative | Vision | Prerequisites | Long-term KPI |
|------------|--------|-----------|----------------|
| [Initiative D] | [Full automation of X] | [DS + API + team training] | [NPS +20, -50% support calls] |

### Service tracking KPIs

| Metric | Baseline | 3-month target | 12-month target | Owner |
|----------|----------|--------------|---------------|-------------|
| Average resolution time [journey X] | Xmin | -30% | -60% | Support |
| Abandonment rate at step Y | X% | < X% | < X% | Product |
| Avoidable support calls | X/week | -40% | -70% | Support + Product |
| Post-journey NPS | X | +5 pts | +15 pts | CX |

### Cross-team collaboration template

```markdown
# Service Design Brief — [Initiative]
Date: YYYY-MM-DD | Priority: [P0/P1/P2]

## Context
[Why this initiative now]

## Teams impacted
- **Lead**: [Team responsible for delivery]
- **Contributors**: [Teams involved in the changes]
- **Informed**: [Teams to keep in the loop]

## What changes for the user
[Frontstage impact — in 2 sentences]

## What changes for the teams
[Backstage impact — per team]

## Measuring success
[1–2 metrics with baseline and target]

## Dependencies
[Systems, resources, decisions needed beforehand]
```
```

### Phase 7 — Conditional persistence

- **If invoked from `design-agent`**: return the artifacts in Markdown — don't write a file.
- **If invoked standalone**:
  1. Create `design/service-designer/` via Bash if absent
  2. Write `design/service-designer/YYYY-MM-DD_service-designer.md`

### Phase 8 — Memory

> ⚠️ Skip if invoked from `design-agent`.

Record in `<project>/.claude/design-knowledge.md`:
- Service channels and main actors
- Identified bottlenecks and their status
- Critical moments of truth
- Baseline service KPIs
