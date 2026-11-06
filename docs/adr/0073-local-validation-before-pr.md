# ADR 0073 — Mandatory local validation before any Pull Request

- **Status**: accepted
- **Date**: 2026-10-30

## Context

A free GitHub account with no available CI credit makes the frontmatter-validation job fail systematically, regardless of a PR's actual content — a billing issue, not a content one. Several consecutive PRs failed this way, each forcing a workaround (an admin-level merge override) even though none of them had a real content problem.

Digging into making local verification systematic, the validation script itself revealed a trap: run with no `git` available in the call's PATH, it loses its filtering down to files tracked by git (`git ls-files`) and falls back to a full disk scan — wrongly surfacing false positives on gitignored files (`settings.local.json`, `memory/`). That fallback was silent before this ADR.

## Decision

1. Before any `git push` of a branch meant for a PR, run the local checks equivalent to CI — for this repo, the frontmatter-validation script with `git` present in the PATH.
2. Never push "to see if CI passes" when a local check exists and hasn't been run.
3. A CI override is only legitimate after a clean local check **and** explicit confirmation that the failure isn't content-related (e.g. the job never started due to billing) — never assumed by default.
4. The validation script now explicitly warns when it falls back to the degraded mode (a full disk scan) for lack of available `git`, instead of silently producing different results.

## Positive consequences

- A frontmatter or absolute-path problem is caught before the PR, not after a CI failure that then has to be told apart from a billing outage.
- The override stays traceable and justified — never a default reflex.
- The reusable local script becomes more reliable (no more silent false positives).

## Negative consequences / risks

- One more manual step before every push — a discipline cost, not automation (no `pre-push` hook is introduced by this ADR, deliberately: a hook that fails silently on a machine with a misconfigured Node setup would reproduce the very problem it claims to solve).
- Only covers projects that have a local equivalent to the CI check — a project without one stays dependent on CI, which should be flagged explicitly rather than giving a false sense of coverage.

## Alternatives considered

- **An automatic `pre-push` git hook**: harder to maintain correctly across machines (PATH, Node, permissions); the false positive discovered here (git missing from PATH) would have silently recurred inside an unmonitored hook. Rejected in favor of explicit discipline, revisable if a reliable hook is designed later.
- **Ignoring billing-related CI failures with no verification**: the de facto practice before this ADR — risks masking a real content problem behind a plausible but unverified billing excuse. Rejected.

## Scope

This repo first (a concrete script is available). The principle (verify locally before pushing, never assume a CI failure is unrelated to content) extends to any project with a local equivalent to its CI check — complements [ADR 0020](0020-git-workflow-conventional-commits.md) (the global Git workflow) without replacing it.
