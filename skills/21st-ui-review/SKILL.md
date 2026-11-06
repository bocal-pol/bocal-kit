---
name: 21st-ui-review
description: Review existing UI against the project's design context, accessibility expectations, responsive behavior, interaction quality, and high-confidence production rules. Use for UI audits, design QA, frontend review, accessibility review, consistency checks, or requests to find and safely fix visual defects. Trigger for requests such as "review this UI", "audit this page", "find design issues", "check responsiveness", or "fix obvious UX problems". Use 21st-ui-build when the request is primarily to create new UI.
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: frontend
dependencies:
  - 21st-cli-use
conflicts: []
---

# Review UI with evidence

Separate deterministic defects from subjective design recommendations.

## Scope — distinction from `accessibility-lead` and `impeccable`

This skill runs the deterministic review specific to the `21st` CLI (`21st review`), anchored on
`.21st/design.json` and the project's catalog — specific to projects already on 21st.dev. It does
not replace:
- `accessibility-lead`: in-depth WCAG/a11y audit, ARIA patterns, screen-reader tests —
  invoke it as a complement for a full accessibility audit, not just the priority checkpoints
  listed below.
- `impeccable`: general anti-AI-slop detector (61 rules), applicable to any frontend project
  whether or not it uses 21st.dev.

Use `21st-ui-review` as a quick first pass on a 21st.dev project, then delegate to
`accessibility-lead`/`impeccable` for full coverage when the stakes justify it.

## Workflow

1. Read `.21st/design.json`, project instructions, and the relevant source.
2. Run the deterministic review first:

   ```bash
   21st review <path>
   21st review <path> --json
   ```

3. Inspect the actual component composition and runtime states. Validate claims
   against code rather than inferring behavior from names.
4. Group findings into:
   - deterministic defects;
   - design-system drift;
   - accessibility and interaction defects;
   - responsive risks;
   - subjective product/design recommendations.
5. Prioritize by user impact and include exact file and line attribution.
6. Use `21st review <path> --fix` only for deterministic, low-ambiguity fixes.
   Never silently redesign, change brand identity, or alter product behavior.
7. Run relevant project tests after fixes and rerun review to prove resolution.

## Review priorities

- semantic controls and accessible names;
- keyboard access, focus visibility, and dialog/menu behavior;
- image alternatives and meaningful labels;
- touch target size and disabled/loading states;
- responsive overflow and fixed-width assumptions;
- reduced-motion handling;
- hardcoded visual values that conflict with project tokens;
- duplicate primitives instead of existing components;
- inconsistent typography, radius, spacing, shadows, and icons;
- fake data, placeholder copy, or missing empty/error states.

## Output

Lead with actionable findings ordered by severity. Keep subjective suggestions
clearly labeled. If no issue is proven, say so and state what was inspected.

**⚠️ Fallback**: if the `21st` CLI is unavailable or the project has no `.21st/design.json`,
redirect directly to `accessibility-lead`/`impeccable` rather than improvising a partial review.
