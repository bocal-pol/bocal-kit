# ADR 0003 — 4 mandatory UI states for every asynchronous render

- **Status**: accepted — canonical ADR on the topic
- **Date**: 2026-08-21
- **Amended on**: 2026-09-17 — absorbs [ADR 0032](0032-4-mandatory-ui-states-superseded.md), which covered the same topic and is now marked superseded

## Context

Frontend components frequently return `null` or a blank screen while loading, expose raw `error.message` on failure, or show an empty state before loading has even finished. These behaviors degrade the user experience and mask errors in production.

## Decision

Every conditional render of asynchronous data must cover **4 states** in an invariant order:

| State | When | What to show |
| --- | --- | --- |
| **Loading** | Request in flight | Skeleton, spinner, or progress bar |
| **Error** | Request failed | 3-part message (ADR 0005) + a retry action — never raw `error.message` |
| **Empty** | Request succeeded, no data | Contextual message depending on the cause: `no-data` / `filtered` / `search` |
| **Success** | Data available | Normal render, optionally with an entry transition |

### Guard order (invariant)

```tsx
if (isPending) return <LoadingState />
if (isError)   return <ErrorState />
if (!data?.length) return <EmptyState />
return <SuccessTransition>...</SuccessTransition>
```

### Empty-state typology

An empty state doesn't say the same thing depending on its cause, and the proposed action depends on it:

| Cause | Message | Proposed action |
| --- | --- | --- |
| `no-data` | Nothing exists yet | Create the first item |
| `filtered` | Data exists, filters exclude it | Reset the filters |
| `search` | No results for this search | Broaden or fix the search |

Forbidden anti-patterns: `if (loading) return null`, silent navigation on error, an empty state shown before loading finishes, a generic empty state that doesn't distinguish the three causes.

## Positive consequences

- Consistent user experience across all screens
- Errors are always visible and actionable
- Reduces "blank screen" bug reports

## Negative consequences / risks

- Initial development overhead (4 components per view instead of 1)
- Requires design-system components for Loading/Error/Empty

## Alternatives considered

- **Case-by-case handling**: inconsistency between screens, frequent omissions. Rejected.
- **Returning null while loading**: an unacceptable blank screen. Rejected.

## Scope

All frontend projects (Angular, React, Flutter).
