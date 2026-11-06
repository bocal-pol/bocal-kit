# ADR 0051 — Shared memory and logs: the `<private>` tag and collision-safe writes

- **Status**: accepted
- **Date**: 2026-09-17

## Context

Two distinct problems affected the ecosystem's persistent files.

**Leakage via memorization** — cross-session memory (ADR 0024) captures what deserves to survive a session. A conversation containing a token, a temporary password, a private URL, or a client's personal data risked having those elements consolidated into memory, then reloaded in every subsequent session.

**Concurrent writes** — shared logs (`skill-observations/log.md`, numbered `OBS-N` reports) are written by several agents, sometimes in parallel, sometimes from overlapping sessions. Two simultaneous writes produced duplicate numbers and phantom entries.

## Decision

### 1. The `<private>` tag — memory exclusion

Any content wrapped in `<private>…</private>` is **excluded from cross-session memory**. The tag applies in any file and any prompt.

```text
<private>
TOKEN=ghp_xxxxx
CLIENT_EMAIL=client@example.com
</private>
```

Usage: tokens, temporary passwords, private URLs, client personal data present in a conversation.

### 2. A 4-step collision-safe protocol

Before writing to any shared log file:

1. **Read** the existing max number (`grep "^### OBS-" | tail -1`)
2. **Assert** that the entry doesn't already exist (the same `OBS-N`)
3. **Write** the entry with the incremented number
4. **Verify** the count after writing (the file now holds N+1 entries)

Step 4 is the only one that actually detects a real collision: without it, the protocol only reduces the probability of a conflict.

## Positive consequences

- A secret present in a conversation doesn't contaminate subsequent sessions
- The tagging is explicit and human-readable in the transcript
- The post-write check turns an optimistic convention into an effective control

## Negative consequences / risks

- **The tag depends on a human gesture**: an untagged secret is memorized normally. This isn't automatic secret detection.
- The 4-step protocol isn't a lock: two agents can read the same max number simultaneously. It reduces the risk, it doesn't eliminate it.
- Three reads for one write — a non-trivial cost on heavily used logs

## Alternatives considered

- **Automatic secret detection in memory** (regex on token formats): useful as a complement, but produces false negatives on unstructured personal data. Not adopted alone.
- **A real file lock**: more robust, but not portable across PowerShell, Bash, and hooks. Rejected.
- **One log file per agent**: removes collisions but loses the shared timeline, the log's whole reason for existing. Rejected.

## Scope

Cross-session memory and any shared log file (`skill-observations/log.md`, reports). See also ADR 0024 (memory system) and ADR 0002 (secrets). Source: the "`<private>` convention" and "collision-safe protocol" sections of `CLAUDE.md`.
