# ADR 0049 — `personal-agents.json` registry and guided PO creation

- **Status**: accepted
- **Date**: 2026-09-17

## Context

The ecosystem can host personal Product Owners — persona experts in a domain that has nothing to do with software (e.g. legal compliance in a specific jurisdiction, a hobby, a household function, institutional communications, a sport, tabletop gaming). They don't fall under the `team-dev` hierarchy (ADR 0014), which organizes software-development roles.

Without a registry, `team-selector` had to guess their existence by listing files under `agents/` and reading their frontmatter — costly, and unable to tell a personal PO apart from an orchestration agent.

## Decision

### 1. A single declarative registry

A `personal-agents.json` file at the root, read by `team-selector`. A PO = one block:

| Field | Role |
| --- | --- |
| `id` | short identifier |
| `agent_file` | the file under `agents/` (without extension) |
| `mode` | the `team-dev` invocation mode (`--ask <domain>`…) |
| `label` / `description` | what `team-selector` shows the user |
| `domains` | areas of expertise |
| `auto_suggest_if` | keywords that trigger an automatic suggestion |
| `active` | `false` disables the PO **without deleting it** |

### 2. Guided creation via `po-creator`

The `po-creator` skill walks through defining a new PO (persona, domain, keywords), generates the agent file, and registers it.

⚠️ **Known limitation**: `po-creator` doesn't record the five integration points. `README.md`, `team-dev/SKILL.md`, and `skills/SKILLS_INDEX.md` need to be updated by hand after creating any PO.

### 3. The registry is the source of truth

Adding a PO without registering it makes it invisible to `team-selector`, even if its agent file exists.

Note for this repo: `personal-agents.json` itself isn't included here, since it would otherwise register domain-specific personal personas tied to one person's private context. Adopting this repo on a new machine starts with an empty or custom registry — `po-creator` is the entry point for populating it with your own personas.

## Positive consequences

- `team-selector` reads a single structured file instead of scanning dozens of agent files
- `auto_suggest_if` lets the right expert be proposed without the user knowing the mode's name
- `active: false` removes a PO from rotation without losing its work

## Negative consequences / risks

- The registry and the agent files can drift apart — nothing checks that `agent_file` points to an existing file
- The three-point manual integration is regularly forgotten
- The `auto_suggest_if` lists grow and eventually overlap between POs

## Alternatives considered

- **Discovery via agent-file frontmatter**: costly on every selection and unable to distinguish a PO from an orchestrator. Rejected.
- **Registering POs in the Skill Router** (`.router.json`): the router arbitrates technical domains by weighted priority, an unrelated mechanism for persona suggestion. Rejected.
- **One PO = one skill**: would lose the notion of a persona invocable via `team-dev` mode. Rejected.

## Scope

The ecosystem's personal POs and `team-selector`. See also ADR 0014 (team-dev hierarchy) and ADR 0052 (entry points outside the hierarchy).
