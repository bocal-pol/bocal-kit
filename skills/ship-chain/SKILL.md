---
name: ship-chain
description: "Ship a change end to end with the repository Git workflow: local check, conventional commit, PR to develop, merge, PR from develop to main, then the same chain on the public mirrors (translation, RENAME-MAP, noreply git identity, privacy filter), then cleanup of merged branches. Use when the user says 'commit push PR to develop merge then main', 'and the mirrors too', 'ship it', 'run the full chain', or at the end of a team-dev mode that produced code. Never merges to main without an explicit request in the session."
model: claude-sonnet-5-5
user-invocable: true
argument-hint: "[--repos claude-config,bocal-kit,antigravity-config] [--stop-at develop|main]"
type: utility
priority: high
scope: infra
dependencies:
  - git-workflow
conflicts: []
---

# ship-chain — Chained delivery (develop, main, mirrors)

One fixed sequence, asked again by hand at each delivery: the same calls on three repositories. This skill runs it in order. It stops for a decision before each action that leaves the machine.

## Optional input

- `--repos`: a subset of repositories (default: the repository of the current directory, plus its two mirrors if the change touches the shared surface: `CLAUDE.md`, `skills/`, `agents/`, `install.ps1`, docs).
- `--stop-at develop`: stop after the merge into `develop`. Do not open a PR to `main`.

## Stop points (AskUserQuestion)

These actions leave the machine or touch production. Ask before each one. Do not ask if the user already requested it **in this session** for that exact repository:

- merge a PR into `develop`;
- open a PR to `main`;
- merge a PR to `main`. Never without an explicit request, even if the `develop` merge was approved.

An approval for one repository does not apply to the others.

## Chain, repository by repository

1. **State.** Run `git status` and read the current branch. On `main` or `develop`: create `feature/<slug>` from an up-to-date `develop` (call the Skill tool with `git-workflow` if the hooks are missing). Never commit on a protected branch.
2. **Local check.** Run all local checks of the repository before any push. For `claude-config`: `node .github/scripts/validate-frontmatter.mjs` with `git` in the PATH. A failure stops the chain. CI is not a test tool. A repository with no local check: say so.
3. **Commit.** Conventional Commits (`type(scope): description`, 72 characters maximum, imperative mood, no final period). No `Co-Authored-By` trailer. No mention of Claude. One commit = one intention.
4. **Push + PR.** Run `git push -u origin <branch>`, then `gh pr create --base develop`. The flag is mandatory: without it the PR targets `main`. Read `gh pr view <n> --json baseRefName`. The base must be `develop`.
5. **Merge into develop.** After green CI (`statusCheckRollup`) and `mergeable`. Missing CI is reported, not assumed green. A CI failure unrelated to the content is reported before any bypass.
6. **PR develop to main.** Run `gh pr create --base main --head develop`. Merge only on an explicit order.
7. **Cleanup.** After `git fetch --prune`, delete a branch whose commits are in `origin/develop` **and** `origin/main` (remote first, then local with `-d`). For squash or rebase, check `gh pr list --state merged --head <branch>`. List first, delete after. Never `main`, `develop`, the current branch, or another author's branch.

## Public mirrors

Before the first commit in a mirror: `git config --local --get user.email` must be the public `noreply` address of the mirror account. If not, set it **locally in that clone** (never `--global`). The global address of the workstation is institutional and would leak on a public repository.

Port the change, then run steps 1 to 7 on each mirror:

- translate into English (ASD-STE100 for documentation);
- rename according to the mirror `RENAME-MAP.md`; add a row for each new skill or agent;
- remove or generalize identifying content: emails, institutional domains, personal paths, real name outside attribution, secrets;
- note a doubt in the mirror `ANONYMIZATION-NOTES.md` instead of deciding in silence;
- a mechanism with no equivalent in a mirror is reported in its `PORTING-NOTES.md`, not omitted.

The mirror `CONTRIBUTING.md` describes the fork workflow, never direct access.

## Final report

One table: repository · develop PR (number, state) · main PR (number, state) · deleted branches · open points (main merge pending, missing CI, anonymization doubt). Say clearly what is not done.

## ⚠️ Fallback

If `gh` is missing or not authenticated: stop after the push, give the GitHub compare URL and the remaining commands. Do not improvise an API call.
