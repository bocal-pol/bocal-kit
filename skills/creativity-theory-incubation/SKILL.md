---
name: creativity-theory-incubation
description: "Creative incubation (Wallas 1926, Poincaré 1908, Sio & Ormerod 2009, Zeigarnik effect). Calibrate the rhythm and tone of reminders, defend a waiting state with no deadline, prevent an idea box from becoming a task box. Auto-invoke on: incubation, let it rest, maturation, spaced reminder, idea notification, Zeigarnik effect, illumination, open idea, task inbox, overdue counter."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Incubation

Module 3 of the corpus: Graham Wallas, *The Art of Thought* (1926); Henri Poincaré, "Mathematical
Creation," *Science and Method* (1908); Sio & Ormerod, *Psychological Bulletin* (2009); the
Zeigarnik effect (1927).

**Wallas's four phases** — *preparation* (conscious work, accumulation, failure) → *incubation*
(voluntarily stop thinking about it; undirected mental work) → *illumination* (the click, often
preceded by an "intimation," the diffuse feeling an idea is arriving) → *verification* (testing and
formalizing; Poincaré reminds us that bus-ride intuitions are sometimes wrong).

**What the research says** — Sio & Ormerod meta-analyzed over a hundred experimental studies. The
incubation effect is real, moderate in size, and **non-uniform**. It's stronger:
- on problems with **multiple solutions** (divergent thinking — exactly the case for an idea box)
  than on single-solution problems;
- when the period is filled with a **low-demand task**, rather than complete rest or a hard task;
- when **preparation was long**: you only incubate well what you've actually worked on.

**Zeigarnik effect** — interrupted tasks stay more active in memory than completed ones. An idea
deliberately left **open**, with no conclusion or final status, keeps working in the background.
That's the psychological counterpart of the slow hunch.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **Waiting is a legitimate state** | "Letting it rest" isn't the absence of a status: it's the default state, and it demands nothing |
| **No deadline, no counter** | No due date, no "overdue," no alert badge, no urgency color on a dormant idea |
| **Increasing spacing** | Reminders space out (a week, a month, a quarter). Too frequent a reminder turns back into a task |
| **Arrive outside of tasks** | On app open or in a dedicated surface — never as an interruptive notification in the middle of something else |
| **Ask for resonance, not a decision** | The question is "does this resonate today?", never "what do we do with this?" |
| **"Not now" at no cost** | Deferring must be free: no visible dodge counter, no punitive follow-up |

## The central trap: the task box

The temptation, for any developer, is to treat an idea inbox like a task inbox: everything that
comes in must be sorted, decided, closed. That's exactly what incubation forbids. An idea closed
too fast no longer incubates; an idea marked "to handle" becomes a source of guilt.

Anti-patterns to explicitly reject:

- an unprocessed-idea counter presented as debt;
- "inbox zero" as a stated goal;
- mandatory triage on entry before anything else can be submitted;
- a due date, SLA, or escalating reminder on a personal idea;
- a default status that degrades on its own over time.

## Workflow

### Phase 1 — Identify the object

Reminder cadence · phrasing a waiting state · auditing a screen suspected of task-like logic ·
arbitrating a "cleanup" request. Gather via `AskUserQuestion` if absent.

### Phase 2 — Check the existing state

Read the real state (`Grep`, excluding `node_modules/`, `vendor/`, `*.test.*`): is there an overdue
counter, a deadline, a scheduled purge, an interruptive notification, an imperative label? Every
occurrence is a gap to document.

### Phase 3 — Recommendation

Set the parameters: spacing cadence and progression, presentation surface, phrasing of the question
asked, outcomes offered, "not now" behavior. Tie each parameter to its experimental backing (Sio &
Ormerod for cadence and context, Zeigarnik for openness, Wallas for the targeted phase).

### Phase 4 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return in Markdown, write nothing, **skip
  memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-incubation-[topic].md` in the current
  project.

## Implementation example — applying this to a real idea-management product

- A real waiting-state status typically looks like "in reflection," with a separate status for
  "to deepen" — keep these distinct from any "resurfacing" label a notification/echo mechanism
  might show (e.g. "maturing for N days"): one is a data status, the other is a UI label on a
  reminder, and conflating them causes bugs.
- Spacing is best modeled with fields like `next_eligible_at`, `shown_count`, and
  `dismissed_count` on the reminder/echo record itself — so "not now" is tracked with no built-in
  penalty.
- A "dormant" resurfacing mode is the direct implementation of the spaced reminder; an
  "anniversary" mode exploits time depth.
- Reminders should arrive on app open or in a dedicated low-demand surface — never as a push
  notification. This matches Sio & Ormerod's finding about low-demand tasks: don't move it to an
  interruptive channel.
- Sorting and closing ideas may belong to other, separate tools in a broader ecosystem; an
  idea-capture tool itself should tolerate staying open indefinitely.

## Fallback ⚠️

With no access to the project's sources, produce the theoretical parameters while prefixing:
*"Parameters not checked against the resurfacing mechanism's actual implementation."* Never claim a
counter or deadline exists (or doesn't) without having verified it.

## Optional input

- Object (`reminder-cadence` | `waiting-state` | `screen-audit` | `cleanup-arbitration`)
- Scope (`personal` | `group`)
- Required cadence constraints (maximum frequency, available surface)
- Screen or file to audit
