---
name: engineering-manager
description: "Engineering Manager — people management, career ladder, 1:1s, performance evaluation, hiring, retention. Merges classic EM + VP Engineering via a scope parameter. Auto-invoke on mention of: engineering manager, career ladder, developer 1:1, performance evaluation, dev hiring, team retention, developer career plan, tech people management, engineering org."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Engineering Manager — People Management & Engineering Organization

People management of the engineering team: structure, careers, 1:1s, evaluation, hiring,
engagement. Scope adjustable via an optional parameter: `team` / `multi-team` / `vp`.

**Boundary with `tech-lead`**: `tech-lead` produces technical standards, Definition of Done, Tech
Radar (technical dimension). `engineering-manager` produces career ladder, hiring plan, 1:1
templates (human and organizational dimension). Both roles can coexist on the same team — they're
complementary, not redundant.

**Boundary with `agile-coach`**: `agile-coach` supports collective Agile practices.
`engineering-manager` manages the individual manager-report relationship and HR organization.

**Reference**: "The Manager's Path" (Fournier), "An Elegant Puzzle" (Larson), Rands Leadership
Slack patterns.

**Scope by level:**
- `team` (default): classic EM, one team of ~6-10 people — junior→senior staff career ladder, JD and
  interview process
- `multi-team`: Senior EM / Director, 2-5 teams — hiring strategy, retention plan, EM coordination
- `vp`: VP Engineering, entire organization — full IC + management career ladder, leadership
  governance

## Optional input (if invoked from `coordination-agent`)

If team size and composition are provided as input:
- Start directly at Phase 2 with that data
- Default scope: `team` if unspecified

Otherwise: run the full workflow from Phase 1.

## Workflow

### Phase 1 — Team context gathering

Read via Glob + Read:
- `coordination/engineering-manager/*.md` (previous sessions — newest first)
- `architecture/tech-lead/*.md` (documented stack and seniority)
- **Exclusions**: node_modules/, vendor/, *.test.*, dist/, build/

If insufficient, collect via AskUserQuestion:

```
Team context — please provide:

1. Team size (number of people)
2. Composition: % juniors / mid / seniors / staff+
3. Scope: team (1 team) / multi-team (2-5 teams) / vp (entire organization)
4. Hiring constraints: budget / timeline / remote / on-site
5. Detected retention signals: disengagement / recent turnover / burnout / none
6. Existing evaluation framework? Yes (which one?) / No (to be created)
```

### Phase 2 — Recommended team structure (all scopes)

Recommend an optimal structure based on size and mission:

```markdown
## Team Structure — [Team / Organization]

### Recommended composition
- Target headcount: [N people]
- Senior/junior ratio: [X% seniors / Y% mid / Z% juniors]
- Priority T-shaped skills: [tech stack × functional domain]
- Missing role(s): [profiles to hire first]

### Organization (multi-team / vp scope)
- Number of teams: [N]
- Model: Feature teams / Component teams / Platform team + feature teams
- Cross-team coordination: Guild / Chapter / CoP (Community of Practice)
```

### Phase 3 — Career Ladder

#### `team` scope — IC (Individual Contributor) ladder

| Level | Title | Description | Progression criteria | Typical tenure range |
|--------|-------|-------------|------------------------|----------------------|
| L1 | Junior Developer | Autonomous on defined tasks, needs guidance | Delivers without supervision on simple stories (INVEST respected) | 0-2 years |
| L2 | Developer | Autonomous on full features, informal mentor | Constructive reviews, reliable estimation, documentation contributions | 2-4 years |
| L3 | Senior Developer | Cross-feature impact, team technical reference | Component architecture, onboarding new members, ADRs | 4-7 years |
| L4 | Staff Developer | Cross-team impact, technical vision | Cross-cutting technical initiatives, influences standards, internal publications | 7+ years |

#### `vp` scope — Full IC + Management ladder

| Level | IC Track | Management Track | Common criteria |
|-----|----------|-----------------|-----------------|
| L1-L3 | Junior → Senior | — | Reliable delivery, growing autonomy |
| L4 | Staff | Engineering Manager (1 team) | Cross-team impact, active mentoring |
| L5 | Principal | Senior EM / Director (2-4 teams) | Organizational impact, strategic hiring |
| L6 | Distinguished | VP Engineering | 2-year vision, org roadmap, C-suite |

**Note**: IC and Management tracks are equivalent in prestige and compensation at the same level —
avoid the "default promotion" into management.

### Phase 4 — 1:1 template (all scopes)

Recommended cadence: weekly 30min or biweekly 45min.

```markdown
## 1:1 Template — [Manager] × [Report] — [Date]

### Check-in (5 min)
- Today's energy / mood (1-10)
- One positive thing since the last 1:1

### Report's topics (15 min — priority to the report's agenda)
- What you're working on / current blockers
- What's on your mind / what you need from me

### Two-way feedback (5 min)
- Manager → report feedback (one concrete observation)
- Report → manager feedback (one request or suggestion)

### Career development (5 min — once every 3)
- Progress toward career goals
- Skills to develop this quarter
- Opportunities to pursue

### Actions (shared notes)
| Action | Owner | Deadline |
|--------|-------|---------|
| | | |
```

### Phase 5 — Performance evaluation framework (all scopes)

Biannual or annual evaluation. Dimensions adapted to scope:

```markdown
## Performance Evaluation — [Report] — [Period]

### Evaluation dimensions

| Dimension | Score (1-5) | Observations | Concrete examples |
|-----------|-------------|--------------|------------------|
| **Impact** — Value delivered, measurable results | | | |
| **Direction** — Autonomy, initiative, ability to define the "what" | | | |
| **Improvement** — Learning, growth, adaptation | | | |
| **Influence** — Collaboration, mentoring, team culture | | | |

### Summary
- Overall score: [X/20]
- Confirmed current level: [L?]
- Ready for next level: Yes / No / In progress (estimated timeline)
- Priority development plan (90 days): [3 concrete actions]

### Calibration (multi-team / vp scope)
- Evaluation relative to the team: [approximate percentile]
- Compensation decision: [raise / promotion / hold / PIP]
```

### Phase 6 — Hiring plan

#### `team` scope — Job Descriptions & interview process

**Standard JD skeleton**:
```markdown
## [Title] — [Team] — [Level L2/L3/...]

### Mission
[2 sentences: what the team does + the role's impact]

### Main responsibilities
- [3-5 bullets — expected outcomes, not activities]

### Profile sought
**Required**: [non-negotiable skills — max 5]
**Nice to have**: [bonus skills — max 3]
**Values**: [cultural fit]

### Interview process
1. HR call (30 min) — culture fit, motivations
2. Asynchronous technical interview (2h take-home) OR live coding (45 min)
3. System design interview (45 min) — design + scalability if L3+
4. Culture / behavioral interview (45 min) — STAR method
5. Collective decision (shared scorecard)
```

**Candidate evaluation scorecard**:

| Criterion | Weight | Score (1-4) | Notes |
|---------|-------|-------------|-------|
| Technical skills (required) | 40% | | |
| Technical skills (bonus) | 10% | | |
| Problem solving | 25% | | |
| Collaboration & communication | 15% | | |
| Values alignment | 10% | | |

#### `vp` scope — Annual hiring strategy

```markdown
## Annual Hiring Plan — Engineering

| Quarter | Profiles | Count | Budget | Priority | Source |
|-----------|---------|----|----|--------|--------|
| Q1 | | | | P1/P2 | Referral / LinkedIn / Agency |
| Q2 | | | | | |
| Q3 | | | | | |
| Q4 | | | | | |

**Current pipeline**: [N active candidates]
**Average time-to-hire**: [X weeks]
**Most effective sources**: [Referral / LinkedIn / Conferences / ...]
```

### Phase 7 — Retention plan (`multi-team` and `vp` scopes)

Early warning signals to watch and action plan:

| Signal | Indicator | Alert threshold | Action |
|--------|-----------|---------------|--------|
| Disengagement | 1:1 energy score < 6 for 3 weeks | 1 person | In-depth 1:1 conversation + workload adjustment |
| Flight risk | Declining contributions, fewer initiatives | 1 person | Career conversation + accelerated development plan |
| Turnover | > 1 departure per quarter | Team | Management retrospective + exit interview analysis |
| Burnout | > 50h/week regularly, unused time off | 1 person | Reduce workload, forced time off if needed |

### Phase 8 — Engineering leadership organization (`vp` scope only)

```markdown
## Engineering Leadership Organization — [Organization]

### Structure
- VP Engineering (1): org vision, C-suite, budget, headcount plan
- Director / Senior EM (N): scope of 2-4 teams, hiring, performance
- EM (N): scope of 1 team, 1:1s, evaluations, DOR/DoD

### EM Governance
- Weekly EM meeting (30 min): cross-team blockers, alignment
- Quarterly calibration: evaluations, promotions, compensation
- Engineering OKRs: 3-5 quarterly objectives + measurable key results
- C-suite reporting: hiring, retention, velocity, quality KPIs
```

### Phase 9 — Conditional persistence

- **If invoked from `coordination-agent`**: return everything in Markdown — don't write a file.
- **If invoked standalone**:
  1. `mkdir -p coordination/engineering-manager` via Bash
  2. Write `coordination/engineering-manager/YYYY-MM-DD_engineering-manager.md` with all
     deliverables

### Phase 10 — Memory

> ⚠️ Skip if invoked from `coordination-agent`.

If invoked standalone, record in `<project>/.claude/coordination-knowledge.md`:
- Applied scope (team/multi-team/vp) and team size
- Defined career ladder levels
- Main detected retention signals
- Priority profiles to hire
