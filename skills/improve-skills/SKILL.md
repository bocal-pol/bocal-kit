---
name: improve-skills
description: "Review and improve existing personal SKILL.md files. Auto-invoke after /create-skill completes to refine the newly created skill. Also triggers on: \"improve my skills\", \"revise my skill\", \"optimize this skill\", \"review skill\", \"improve this skill\"."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: low
scope: cross
dependencies:
  - skillspector
conflicts: []
---

# Improve Skills — Reviewing and optimizing personal skills

Analyzes one or all personal SKILL.md files and proposes targeted improvements: trigger precision,
minimal tool list, workflow clarity.

## Workflow

### Phase 0 — Pending observations (skill-observations)

Before any analysis, read `~/.claude/memory/skill-observations/log.md`:

1. Count entries with `Status: pending`
2. If pending entries exist, display them grouped by affected skill
3. Ask via AskUserQuestion: "Process these pending observations before the structural review?"
   (Yes / No / Observations only)

For each processed observation:
- Propose the change to the affected skill (readable diff)
- After validation and application: change the `Status` from `pending` to `resolved`
- After the session fully processes them: archive resolved entries to
  `~/.claude/memory/skill-observations/archive/log-YYYY-MM-DD.md`
- Update `~/.claude/memory/skill-observations/last-review-date.txt` with today's date

Observation classification:
- `open-source`: generic improvement, publishable in the public repo
- `internal`: specific to the repo owner's environment (client project, internal convention) — never
  include in public PRs

### Phase 1 — Targeting

If a skill name is given as an argument (e.g. `/improve-skills pentest`), or if invoked right after
creating a skill, target only that skill.

Otherwise, Glob both locations:
- Global: `~/.claude/skills/**/SKILL.md`
- Current project: `.claude/skills/**/SKILL.md`

### Phase 2 — Analysis

For each SKILL.md, evaluate against these criteria:

**Frontmatter — structural compliance (blocking)**
- Are all 7 mandatory fields present: `name`, `model`, `type`, `priority`, `scope`, `dependencies`,
  `conflicts`?
- Is `type` a value among `orchestrator|framework|domain|utility|context|specialized`?
- Is `priority` a value among `high|medium|low`?
- Is `scope` a value among `backend|frontend|infra|mobile|data|security|cross`?
- Does `model` use the full identifier (`claude-sonnet-5`, `claude-opus-5`,
  `claude-haiku-4-5-20251001`) — never the short version (`sonnet`, `opus`)?
- No `tools:` key in the frontmatter? (a key reserved for **agents**, ignored by Claude Code in a
  SKILL.md). If the skill declares `allowed-tools:`, is each pre-authorized tool justified (it
  removes the confirmation prompt, it doesn't restrict)? To restrict, the key is
  `disallowed-tools:`.
- Do paths in the content use `~/.claude/` (never an absolute Windows path `C:\Users\...`)?

**Content — quality**
- **Description**: are the trigger phrases specific and unambiguous for auto-invocation?
- **Tools**: is every listed tool actually used in the workflow? Remove any superfluous tool.
- **Workflow**: are the phases direct and non-redundant? Short prose instructions.
- **Consistency**: are `user-invocable` and `model` justified by the content?
- **No-ops & negation**: does every sentence change behavior relative to the model's default?
  Otherwise remove it **entirely** (don't shorten it). A prohibition ("don't do X") is rephrased as a
  positive target ("do Y"), except for a hard guardrail. `Type: no-op` entries from the observation
  log (produced by `retro`) are handled here.

### Phase 3 — Proposal

Present improvements per skill as a readable diff (current line → proposed line), with a short
justification per change. Write nothing without approval.

### Phase 4 — Validation

Via AskUserQuestion, ask for each skill: "Apply these changes to [name]?" Apply only approved
changes.

### Phase 5 — Application

Rewrite the approved files with Write. Confirm the path of each modified file.

### Phase 6 — Verification and publication after a fix

**Applies only** when Phase 0 processed an observation coming from `friction-retro` (a skill fix or
creation following a captured error or friction) — not to a voluntary structural review with no
underlying pending observation. A skill fix born from an error isn't any safer than a third-party
skill until it's been checked the same way: run it through the same guardrails as an external
import.

1. **SkillSpector scan** — call the Skill tool with `skillspector` on each skill modified or created
   in this phase (`TARGET` = its folder). Read `risk_assessment.recommendation`:
   - `SAFE` → continue straight to step 2.
   - `CAUTION` → list the findings to the user, ask for explicit confirmation before continuing.
   - `DO_NOT_INSTALL` → **block**: don't open a PR, re-check the Critical/High findings by reading
     the flagged file and line directly, send the skill back to Phase 3 for correction, and only
     retry this phase afterward.
   - If `skillspector` is unavailable: note "SkillSpector scan not run" in the final report and
     continue — never block silently on its absence.

2. **Publish through the fork workflow** — per `CONTRIBUTING.md` §4: branch from an up-to-date
   `develop`, commit with Conventional Commits, push to your own fork (never to
   `bocal-pol/bocal-kit` directly), open a Pull Request toward `develop`. There is no further
   mirror to propagate to from here — `bocal-kit` is itself one of the two public mirrors of a
   private source configuration, not a source to mirror onward.
