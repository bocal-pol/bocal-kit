# Calling agents and skills — automatic mode

List of agents and skills authorized to invoke `editorial-sketch` in automatic mode (without
intermediate prompt validation, see the "Image generation" section of `SKILL.md`), to illustrate
their consolidated report or final user documentation.

This list is the source of truth for the exception. An agent not on this list that invokes
`editorial-sketch` remains subject to the default mode (propose + wait for validation).

## Orchestrator agents — consolidated report

- `game-dev-agent`
- `qa-lead-agent`
- `infrastructure-agent`
- `backend-agent`
- `release-agent`
- `security-agent`
- `frontend-agent`
- `integration-agent`
- `coordination-agent`
- `mobile-agent`
- `it-operations-agent`
- `pr-review-agent`
- `architecture-agent`

## User documentation

- `documentation-agent`
- `design-agent`
- `tech-writer` skill
- `onboarding` skill

## Rule for adding an entry

To add an agent or skill to this list: verify it actually produces a consolidated report or
documentation meant for a human reader (not a pure internal technical report like SARIF/JSON), then
add a line here and the explicit call instruction in the agent's own file (see `CLAUDE.md`, skill
conventions section — explicit dependency, never slipped into prose).
