---
name: creativity-theory-securite-psy
description: "Psychological safety (Edmondson 1999), organizational silence (Morrison & Milliken 2000), the value of debate (Nemeth 2004). Private draft, anonymity, judgment-free status phrasing, rejecting negative voting, a participation indicator. Auto-invoke on: psychological safety, organizational silence, anonymity, anonymous submission, private draft, negative vote, idea ranking, rejected status, daring to suggest, fear of judgment, constructive criticism."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Psychological Safety

Module 6 of the corpus: Amy Edmondson, *Administrative Science Quarterly* (1999); Morrison &
Milliken (2000); Detert & Burris (2007); Nemeth et al. (2004).

**The discovery** — studying hospital teams, Edmondson observed a paradox: the highest-rated teams
reported *more* errors. Not because they made more of them: they dared to report them. Hence the
concept of **psychological safety** — the shared belief that one can take an interpersonal risk
(ask a question, admit a mistake, propose a weird idea) without being humiliated or punished. It's a
property **of the group**, not of individuals; it varies widely between teams in the same
organization, and it predicts learning better than member competence does. Google's Project
Aristotle (2015-2016) ranked it as the top factor in team performance.

**Organizational silence** (Morrison & Milliken) is the flip side: employees hold back their ideas
because they believe — often correctly — that speaking up is useless or dangerous. Silence is
self-reinforcing: everyone sees others staying quiet and concludes that's the norm. Detert & Burris
showed the decisive variable is the **perceived openness of the direct manager**.

**The nuance that matters** — safety doesn't mean an absence of criticism. Nemeth et al. compared
classic brainstorming groups (Osborn's "no criticism" rule) with groups allowed to debate: **the
debating groups produced more ideas, and better ones**. The problem isn't criticism, it's criticism
*of the person*. A safe team is one where you can say "I disagree with this idea" without anyone
hearing "you're an idiot."

## What software can do

Software **doesn't create** psychological safety — that happens between people. But it can **destroy
it** very effectively: a negative-vote counter, a public idea ranking, a "rejected" status shown in
red next to the submitter's name, a notification to the whole team for every refusal. And it can
**protect it**: separating the idea from its author, allowing a private draft, phrasing statuses
with no judgment.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Private draft by default** | Every idea starts visible to its author alone. Sharing is an explicit gesture, never an initial state |
| **Possible anonymity** | At the submitter's choice, per idea. The space owner shouldn't be able to casually lift anonymity either |
| **Statuses phrased about the idea** | "Set aside for now — no budget," never a verdict on the author. Prefer "not now" over "rejected" |
| **No negative voting** | No thumbs down, no public ranking, no displayed average rating |
| **Debate yes, humiliation no** | A comment thread allows reasoned criticism (Nemeth) and is itself a form of feedback (Detert & Burris) |
| **Participation indicator** | A space's health metric is the **number of members who submitted at least one idea this month** — the direct inverse of organizational silence. Never the average idea rating |
| **A "raw idea" label** | Flag that a phrasing is deliberately unfinished: the equivalent of "thinking out loud" |

## Workflow

### Phase 1 — Identify the object

Designing an anonymous submission · phrasing status labels · arbitrating a voting or ranking
mechanism · defining a space indicator · auditing a group screen. Gather via `AskUserQuestion` if
absent.

### Phase 2 — Check the existing state

Read the real state (`Grep`, excluding `node_modules/`, `vendor/`, `*.test.*`): is anonymity
reversible and by whom, which labels carry judgment, does negative voting or popularity sorting
exist, who gets notified of rejections.

### Phase 3 — Recommendation

Decide each point with its justification: default visibility, anonymity mechanics and
reversibility, exact proposed labels, allowed and forbidden reactions, chosen indicator, scope of
rejection notifications.

For labels, produce the exact wording word for word — that's where the theory becomes concrete.

### Phase 4 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return in Markdown, write nothing, **skip
  memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-securite-psy-[topic].md` in the current
  project.

## Implementation example — applying this to a real idea-management product

- **Anonymity works best pseudonymized**: an `is_anonymous` flag on the idea, with the link to the
  real author isolated in a separate table (keyed by idea id, not joined by default). Lifting
  anonymity should be a tracked, exceptional admin action — verify it stays exceptional and logged,
  not routine.
- **No negative voting in the reaction model**: expose only positive/neutral reactions (e.g.
  `like`, `adhere`, a 1-5 `rating`) — never a thumbs-down or a public ranking. Any request to add
  one should be refused with the Edmondson reference.
- Watch existing labels for tone drift: a "rejected" status should display as something like "Not
  retained" rather than a harsher "Rejected"; a "converted" status should read like "Became a
  project." Check every supported locale — a tone regression slips through translation easily.
- A mandatory rejection reason serves psychological safety as much as the feedback loop, by moving
  judgment away from the person and onto the constraint.
- Space roles (e.g. `member · contributor · moderator · admin`) and explicit sharing metadata
  (shared-at, shared-by, origin space) keep the move from private draft to group space deliberate.

## Fallback ⚠️

With no access to the sources, produce the principles while prefixing: *"Recommendation not checked
against the real labels and anonymity model."* Never assume negative voting exists or doesn't: that's
the point where a misjudgment produces the worst recommendation.

## Optional input

- Object (`anonymity` | `status-labels` | `reactions-votes` | `space-indicator` | `screen-audit`)
- Relevant locale(s)
- Observed role (`member` | `contributor` | `moderator` | `admin`)
- Constraint (V1 only, no migration, no new role…)
