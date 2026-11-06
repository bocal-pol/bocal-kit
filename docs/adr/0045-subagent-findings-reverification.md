# ADR 0045 — Direct re-verification of Critical/High subagent findings

- **Status**: accepted
- **Date**: 2026-09-17

## Context

Audit subagents (`security-agent`, `appsec`, `pentest`, exploration agents) produce findings from a partial, out-of-context read. Some are false positives: a "leaked" secret that's actually listed in `.gitignore`, a "duplicated" class that's really an interface, a "committed" key that only exists on disk. Reported as-is, these findings triggered costly or destructive actions — `git filter-branch`, key rotation, file deletion — over problems that didn't exist.

## Decision

Any finding of **Critical** or **High** severity produced by a subagent must be **re-verified with a direct command** before:

- being reported to the user as a fact, **or**
- triggering an action, especially a destructive one (`filter-branch`, secret rotation, file deletion, history rewrite).

Re-verification is a first-hand observation: reading the file in question, running `git check-ignore`, grepping the exact line. Not a second opinion asked of another agent.

An unverified finding is explicitly reported as **"unconfirmed"** — neither silenced nor presented as established.

## Positive consequences

- No destructive action triggered by a false positive
- The "unconfirmed" status preserves the information without giving it undue weight
- Re-verification costs a few seconds against an unnecessary key rotation

## Negative consequences / risks

- Slows down the delivery of large audits: every serious finding needs a round trip
- On an audit producing dozens of critical findings, exhaustive re-verification can exceed the session's budget — priorities must then be set and the unconfirmed ones named
- Re-verification sometimes shares the subagent's blind spot if it reuses the same command

## Alternatives considered

- **Trusting the subagent**: the initial state, which produced destructive actions on false positives. Rejected.
- **Re-verifying every finding, regardless of severity**: disproportionate cost for minor findings. Rejected in favor of the Critical/High threshold.
- **A second confirmation subagent**: two indirect reads aren't worth one direct observation, and double the cost. Rejected.

## Scope

Any orchestration producing findings — security audits, code reviews, multi-file explorations. See also ADR 0009 (mandatory evidence) and ADR 0046 (subagent discipline). Source: the "Verifying agent findings" section of `CLAUDE.md`.
