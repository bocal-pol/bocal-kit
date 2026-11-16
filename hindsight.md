# Hindsight — journal of lessons learned

> Loaded in every session via `@hindsight.md` in `CLAUDE.md`.
> One entry = one concrete lesson drawn from a real situation, so the mistake isn't repeated.
>
> **Purge rule**: a lesson promoted into a rule in `CLAUDE.md` is **removed from here**. Otherwise
> it gets loaded twice every session for a single piece of information.

## Entry format

```markdown
### YYYY-MM-DD — Short title of the lesson
- **Context**: what was happening, the situation encountered.
- **Lesson**: what to remember / do differently next time.
```

## Entries

### 2026-09-17 — A committed fix is not a deployed fix

- **Context**: the morning audit marked batch 2 (team-dev, security-agent, CLAUDE.md, personal
  agents…) as "✅ fixed." A fingerprint check in the afternoon showed `~/.claude` wasn't a git repo,
  and half the "fixed" files had never arrived there. The running environment still had the old
  `--dev`, `--mgmt` flags and an old `development-agent`. Same mechanism as the resurrection of 23
  agent aliases a month earlier.
- **Lesson**: `~/.claude` is now a git checkout; proof of deployment is `git -C ~/.claude
  rev-parse HEAD` matching the pushed commit, not "files copied." Corollary discovered along the
  way: a project-scoped `.mcp.json` declares nothing for other directories; global MCPs go through
  `claude mcp add --scope user`. And an audit report only says "fixed" after verifying **on the
  machine**, not in the repo.

### 2026-09-16 — A failure after a change isn't a regression until you've replayed it on the original code

- **Context**: migrating the error contract across ten backends. Every test suite that went red
  after the change tempted the conclusion "regression." Replaying the same case on the prior file
  (`git show HEAD:… > $TMPDIR/x` then `docker cp`) showed four failures out of five predated the
  change: a broken mock on one service's Auth, Redis unreachable on another, a trait used as a
  class on a third, a missing factory on a fourth. Only one was actually caused by the change.
- **Lesson**: before announcing or "fixing" a regression, replay the case on the original code —
  two minutes, and it avoids blaming your own work or touching healthy code. Corollary: a Windows
  Docker container often serves a version older than the repo (in this case 61 PHP files, 32 of 45
  test files, and 3 pending migrations on a single service); compare container/disk checksums
  **before** diagnosing, or you debug a ghost.

### 2026-09-16 — A test that pins a string doesn't pin a behavior

- **Context**: a CSRF mapping test checked for the literal string `"TokenMismatchException"` inside
  the **text** of a bootstrap file. It would have stayed green if the class were only mentioned in
  a comment, and it went red when exception rendering moved into a shared package — while the
  behavior itself was untouched. Same pattern elsewhere: two tests on another project pinned the
  exact wording of an error message that the contract explicitly declared non-contractual.
- **Lesson**: a test should exercise behavior (raise the exception, read the response), never the
  implementation (grepping a file, the exact wording of a label, where the code lives). Pin the
  machine-readable slug and the shape, not the words.

### 2026-09-16 — A brand icon is not an interface icon

- **Context**: applying the "Solar icons only" rule, a `bulb.svg` got replaced with a Solar icon.
  It was actually the app's logo, derived from a master image and duplicated across four surfaces
  (backend SVG, React component, favicon, branding page) — the config even said so explicitly.
- **Lesson**: the Solar rule targets interface icons (actions, statuses, navigation), not visual
  identity. Before replacing an SVG, check whether it's referenced as a brand element or duplicated
  across several surfaces: that's the sign of a logo, and changing it is a product decision, not a
  compliance fix.

### 2026-09-16 — Never `git rm -rf --cached .` inside a cleanup loop

- **Context**: tail end of a trailer-purging operation. While cleaning up temporary refs, a
  `git rm -rf --cached .` got added to the same loop across 10 repos — a command unrelated to refs,
  which emptied each repo's index (up to 1292 staged deletions on one repo). Fixed with
  `git reset HEAD -- .`: nothing had been committed or pushed, files intact on disk.
- **Lesson**: a cleanup loop should contain only commands whose scope is exactly what was
  announced. Deleting refs = `update-ref --stdin` alone; `git rm --cached` touches the index, never
  refs — never mix the two. Before any bulk command across N repos, test it on one and check
  `git status` before rolling it out further. Corollary: reversibility only held because nothing
  was committed — check `git status` immediately after any bulk command, not at the end.

### 2026-09-09 — `cap_drop: [ALL]` makes a binary with file capabilities unrunnable

- **Context**: hardening a set of services (user 1000, `cap_drop: [ALL]`). The image's `php` CLI
  carried `cap_net_bind_service=+ep` (to serve on port 80): under `cap_drop ALL`,
  `docker exec … php` failed with "operation not permitted" even as root, and queue/schedule
  workers looped on restart. Corollary: root without capabilities can no longer `chown`/`chmod`
  files copied in via `docker cp`.
- **Lesson**: before setting `cap_drop: [ALL]`, run `getcap` on the service's binaries; strip the
  file capability in the image (`setcap -r`) or grant only that one
  (`cap_add: [NET_BIND_SERVICE]`). Any admin operation on a non-root container's volume goes
  through a disposable container (`docker run --rm -v <volume>:/code alpine chown …`), never
  `docker exec -u 0`. Under Git Bash, `MSYS_NO_PATHCONV=1` breaks `docker cp` with `/c/…` paths —
  use `pwd -W`.

### 2026-09-09 — A 419 from curl is not proof of a CSRF/logout flaw under Laravel 13

- **Context**: an audit flagged an SPA logout as "Critical" (POST with no CSRF token, a forced
  httpOnly cookie). curl reliably reproduced a 419 and a surviving session. In a real same-origin
  browser, the same call returned 204 and revoked the session: Laravel 13's same-origin check
  accepts `Sec-Fetch-Site: same-origin` with no token.
- **Lesson**: for any CSRF/session finding on Laravel ≥ 12, replay it in a **real browser** (or add
  `Sec-Fetch-Site`) before classifying it; a curl request with no Fetch Metadata headers produces a
  false positive. Symmetrically, verify the tested container actually serves the current branch —
  otherwise you're auditing a ghost.

### 2026-09-09 — A control declared in an ADR is not a control

- **Context**: an internal audit found a STRIDE threat model and 22 ADRs describing CSP, 8s
  timeouts, an anti-CSRF `state` parameter, an access-control contract, a vault "with no silent
  fallback." None of those five controls existed in the code; a suspended admin kept access to the
  admin panel.
- **Lesson**: in an audit or a delivery review, start from the list of **declared** controls (ADR,
  architecture doc security section, integration contract) and require an executable proof for
  each (code grep + a dynamic command). An ADR with no test pinning it is a hypothesis, not a
  protection. On the SSO side: read the **entire** contract returned by the auth service (all
  claims), not just the role.

### 2026-09-18 — Rewriting history requires freezing the remote

- **Context**: rewriting history on two remotes (`git filter-branch`, 26 branches). During the
  three local passes, merges landed on GitHub in the meantime. Each merge **reintroduced the
  unrewritten old history** onto the integration and production branches: after a pass had been
  validated "clean," the markers were back on the remote. A subsequent force-push overwrote those
  merges — the content happened to be identical, verified with a zero-line diff, but nothing
  guaranteed that.
- **Lesson**: rewriting history is an **exclusive operation**. Before starting: announce the
  freeze, and stop merging or pushing to the remote until it's done. After every `fetch`, re-verify
  the remote tips are the ones you rewrote. And before any force-push showing an unknown remote SHA
  in the range, **stop**: a remote SHA absent locally means someone pushed. Fetching PR refs lets
  you compare merged PR commits before overwriting.

### 2026-09-18 — `\b` doesn't protect after an underscore, and `--all` includes `refs/original`

- **Context**: same operation. Two verification false negatives chained together. First,
  `git log --all -S<token>` reported every marker clean after a successful pass: `--all`
  **includes `refs/original/*`**, the old refs that `filter-branch` deliberately keeps as a safety
  net. Then a `\bname\b`-style pattern failed to match inside a filename like
  `YYYY-MM-DD_name-[topic].md`: the underscore **is** a word character, so `\b` doesn't apply
  between `_` and the following letter. A third gap: the file filter only covered known
  extensions, and `.gitignore` carried paths that needed purging too.
- **Lesson**: verify a rewritten history on `--branches --tags`, never on `--all`. For a
  distinctive token, replace **without** word boundaries rather than with `\b`. And make any file
  filter cover extensionless files too (`.gitignore`, `.gitattributes`, `LICENSE`), not just `*.md`.

### 2026-09-17 — A dry-run on a bulk-replace script is not a formality

- **Context**: anonymizing 870 occurrences across 8 skills. The script held its replacement pairs
  in a nested array. PowerShell **silently flattens nested arrays**: each pair got read character
  by character, and the simulation announced 72,830 replacements instead of 870. Applied without
  simulation, it would have destroyed six skills.
- **Lesson**: any bulk-replace script has a `-DryRun` mode **by default**, printing the count per
  pattern and per file; only move to `-Apply` after reading those numbers and finding them
  plausible. PowerShell corollary: hashtable keys are case-insensitive (unusable to distinguish
  `Foo` from `foo`) and nested arrays flatten — use a typed object pair instead.

### 2026-09-17 — Separating private from shared is decided on identification, not on topic

- **Context**: preparing to open a repository up. A first pass pulled seven persona agents and
  seventeen skills into a private repo because their topics felt personal (prepping, tabletop RPG,
  pilgrimage planning). On review, that was too broad: knowing how to calculate a weighted pack is
  a skill, not data. What actually mattered was that three personas carried a real person's first
  name.
- **Lesson**: before pulling a file out of a repo being opened up, ask the right question — **"does
  this file identify someone?"**, not "is the topic private?" A persona is named after its
  function. Applied literally, the criterion returned 28 of 31 files to the shared set, leaving
  only one out.

### 2026-06-23 — Map cross-references before a bulk rename

- **Context**: renaming every agent to its code name. The first script only touched the agents
  directory plus the orchestrator and README, missing ~60 skills that referenced the old names in
  their "optional input/persistence" sections.
- **Lesson**: before a rename refactor, grep the **entire** repo to map every reference (skills,
  registry, README, hooks). After applying it, re-grep to prove no stale token remains. Corollary
  confirmed later: a mechanical grep isn't enough — after renaming three agents, 14 **prose**
  mentions still lingered in examples and delegation tables.

### 2026-10-02 — A guard that greps raw JSON blocks itself

- **Context**: exploring a third-party project for transposable mechanisms. A pre-tool-use hook
  grepped the entire JSON payload received on STDIN to detect a push to a protected branch. A
  simple commit message that merely *talked about* the forbidden pattern (in quotes) triggered the
  block — demonstrated live in this very session, where the hook blocked a test `echo` command for
  the same reason. The anti-`--no-verify` guard the third party advertised also turned out not to
  exist in our own setup: the two documented rules (co-authorship, protected push) were the only
  two, and neither covered bypassing hooks.
- **Lesson**: a guard's grep must run on the extracted command, with quoted content stripped out
  before searching for dangerous flags — otherwise any commit message that merely *discusses* the
  forbidden pattern gets blocked by that same pattern. Corollary: verify that a rule documented in
  a hook's comments actually matches what's implemented, not just what's commented as intent.
