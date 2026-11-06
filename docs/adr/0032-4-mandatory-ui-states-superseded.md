# ADR 0032 — 4 mandatory UI states: Loading / Error / Empty / Success

- **Status**: **superseded by [ADR 0003](0003-ui-states-4-mandatory-states.md)**
- **Date**: 2026-08-21
- **Superseded on**: 2026-09-17

## Why this was superseded

This ADR and [ADR 0003](0003-ui-states-4-mandatory-states.md) were written the same day on the same topic — the four mandatory states of an asynchronous render — and both carried the "accepted" status, with neither referencing the other. Two competing ADRs on the same decision make the corpus ambiguous: a reader can't tell which one is authoritative.

**0003 is kept as canonical** (an earlier number, and the only one of the two that documents the negative consequences). The contributions specific to 0032 were folded into it: the reference to the 3-part error message (ADR 0005), the empty-state typology (`no-data` / `filtered` / `search`), and the entry transition on the Success state.

This file is kept to preserve numbering continuity and existing links. It no longer carries any normative content.

## Where to read the decision

→ [ADR 0003 — 4 mandatory UI states for every asynchronous render](0003-ui-states-4-mandatory-states.md)

## Scope

None — this ADR is superseded.
