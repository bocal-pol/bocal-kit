# Overnight run — {{MODE_LABEL}}, {{HOURS}} h, {{SCOPE_LABEL}}

Read `~/.claude/skills/goodnight/SKILL.md` and apply its sections "Loop", "When to stop before the quota" and the prohibitions.

## Plan

The plan to run, step by step: `{{PLAN_FILE}}`.

## Rules

- Working branch: `feature/goodnight-{{DATE}}`, created from an up-to-date `develop`. No work on `main` or `develop`.
- **One commit per finished step** (Conventional Commits, no trailer). The stop is abrupt: there is no wrap-up and no handoff note.
- Notes written as you go in `.goodnight/NIGHT-NOTES.md`: what is done, what was decided and why, what remains.
- Tests after each step: {{TEST_COMMANDS}}. A step is finished only if its tests pass.
- Do not run `goodnight.sh status` (mode A only: in mode B the call is refused).
{{LOCAL_RULES}}
