---
name: game-jam
description: "Scope and ship a game jam entry against a fixed deadline: read the jam rules, cut scope against the clock, keep a cut log, verify the build before submission. Auto-invoke for Ludum Dare, GMTK, Global Game Jam or any itch.io jam, a 48-hour game, or \"we're running out of time, what do we cut\". Not for a prototype with no deadline (`prototype-fast`) nor for the upload commands themselves (`itch-publish`)."
model: claude-sonnet-5-5
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Game Jam

Turn a theme and a fixed deadline into a submitted, playable game. The win condition is a build
attached to the jam before it closes, not the game imagined at the start. This skill keeps the
plan in a file, builds the smallest loop first, cuts scope against the calendar, and runs the
build checks itself; the user decides the concept, plays the build, and clicks submit.

> Adapted from the `game-jam` skill of
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Entering a timed jam, scoping a 48-to-96-hour or one-week build.
- Deciding what to cut to hit an approaching deadline.
- Actually getting an entry submitted on the jam's page.

**Not this skill**: the game loop code itself (relevant engine or genre skills, e.g.
`platformer`); a prototype with no submission deadline (`prototype-fast`); commercial
publishing on a platform (`steam-publish`, `itch-publish`, which handle the upload once the
build is ready).

## Main workflow

1. **Read the rules before the theme reveal.** Ask for the jam page URL (or paste the rules
   directly) and record them in `JAM.md` at the project root: duration, theme reveal time,
   submission deadline in UTC and local time, team and asset rules, the generative AI rule,
   required platforms, where to submit, and whether uploads lock during judging. Each of these
   points has already disqualified finished games; the live page is authoritative, the version
   notes below are only a summary as of a given date.
2. **Prepare in advance what the rules allow**: an empty project that exports, base controls, a
   minimal title/end screen, an export command already tested once, fonts and SFX under a clear
   license. The first hours are too precious for this.
3. **Reduce the theme to one sentence.** Propose about ten ideas quickly, then help the user
   pick one that fits *"You [verb] to [goal] while [constraint]."* If it doesn't fit in one
   sentence, it's too big. Write it in `JAM.md`.
4. **Cut scope against the clock.** Use the scope budget table (Pattern 1): one core mechanic,
   one hook, everything else in a stretch-goal list in `JAM.md`.
5. **Build the vertical slice first**: start, play, win or lose, restart, with primitives. A
   small complete loop beats a big half-built one.
6. **Check progress against the schedule** (Pattern 2) at each milestone. If the loop falls
   behind, cut from the stretch-goal list using the triage rules (Pattern 3) and log the cut in
   `JAM.md`.
7. **Reserve the final ~20% of the clock for delivery**: export, the checks below, screenshots,
   writing the page. Builds tend to break in the final hours.
8. **Submit early, then update while it's allowed.** Upload a working build well before the
   deadline. Many jams lock uploads after the deadline or only allow declared bug fixes
   afterward: the build attached at the deadline is the one that gets judged.

## Patterns

### 1. Scope budget by jam length

```text
              | 48h jam                 | 72-96h jam             | 1-week jam
--------------|-------------------------|------------------------|------------------------
Mechanic      | 1, proven by h6         | 1-2                    | 2-3 that interact
Levels        | 1 handmade or generated | 3-5                    | 8-12 + progression
Art           | placeholder/1 palette   | coherent set, 1 artist | themed set + UI
Audio         | 3-5 SFX + 1 loop        | SFX + 1-2 tracks       | adaptive music
DELIVERY MARGIN| last 8-10h             | last 12-16h            | entire last day
```

### 2. Typical 48h jam timeline

```text
H0-2    Lock the concept into one sentence; name the core mechanic and win/lose condition.
H2-8    Core loop with primitives. Playable, no art.
H8-12   Sleep. Code written while tired is tomorrow's bug list.
H12-24  One level or encounter, calibrate difficulty, add the hook.
H24-30  Sleep; the user (and ideally someone else) plays the build; cut what doesn't work.
H30-38  Art and audio pass, then juice (see `game-feel`).
H38-44  Feature freeze: only fix crashes and soft-locks.
H44-48  Export, checks, screenshots, page, SUBMIT by H46.
```

### 3. Feature triage

```text
For each feature, in order:
  1. Does the core loop work without it?     -> yes: it's a stretch goal, not the MVP.
  2. Would a player notice it's missing?      -> no: cut it.
  3. Does it fit in under 30 minutes of work? -> no: defer past the delivery margin.
Under deadline pressure, the default is CUT; it can come back in a post-jam version.
```

### 4. `JAM.md` skeleton

```text
Jam: <name + URL>     Deadline: <UTC> / <local>     Upload lock: yes/no
Rules: team | assets | AI | platforms | where to submit
Concept: You <verb> to <goal> while <constraint>.
MVP: <core mechanic>, <hook>, start/play/finish/restart
Stretch goals (cut order): ...
Cut log: <time> cut <feature> because <reason>
```

## Verify

Run this before submitting, on the exported build, never in the editor:

1. **Export from the command line** using the relevant engine skill's export path (e.g.
   `godot-export`) and confirm a 0 exit code.
2. **Test on a clean path.** Zip the export, unzip it into a new temp folder outside the
   project, and launch it there (or, for a web build, serve that folder on `127.0.0.1` and load
   it in a headless browser). Missing assets and wrong working directories only show up there.
   Read the log or console for errors.
3. **Package check.** List the zip contents: the executable or `index.html` at the root, no
   project files, editor folders, or debug symbols. For itch.io, run `butler push --dry-run`
   from the `itch-publish` skill.
4. **Rules check.** Re-read the rules block in `JAM.md` against the build: platforms, controls
   (keyboard and mouse if required), credits and asset licenses on the page, the AI rule.
5. **Ask the user** to play the extracted build once, from start to a restart, and report any
   soft-lock; then to submit and confirm the entry actually appears on the jam's entries page.
   Uploading to the game's own page alone does not count as submission.

## Pitfalls

- **Scope creep.** If the loop isn't playable by the first third of the clock, cut immediately
  → freeze scope and return to the MVP before adding anything.
- **No delivery margin.** Export, zip, and writing the page take 1 to 3 hours and often surface
  a build bug → treat the deadline as two hours earlier than its real time.
- **Submitted to the game page, not the jam.** On itch.io, a jam entry is a separate submission
  from the game page → explicitly verify the entry appears on the jam's entries page, not just
  the game page.
- **Fixing after the deadline.** Once uploads lock, the locked build is the one judged, and
  linking a "fixed" build elsewhere can disqualify the entry → only fix if the jam explicitly
  allows it (e.g. Ludum Dare) and list the changes.
- **Export never tested.** "It works in the editor" is not "it works in the build" → always
  relaunch from the zipped export on a clean machine/folder.
- **Assets with no clear license or AI-generated.** Music, fonts, or sprites grabbed online can
  violate jam rules and later distribution rights; AI rules vary widely between jams (some
  disqualify AI art/audio, others just ask for opting out of judging categories) → credit every
  asset and check the specific AI rule before using one.
- **Polishing before the loop is fun.** Juice multiplies fun; it can't create it → validate the
  core verb first (see `prototype-fast`), polish afterward.
- **Deadline time zone.** Jams announce their deadline in a given zone (GGJ uses the venue's
  local time) → store both times (UTC and local) in `JAM.md`.

## References

- [Ludum Dare rules](https://ldjam.com/events/ludum-dare/rules)
- [itch.io jams](https://itch.io/jams)
- [Global Game Jam](https://globalgamejam.org/)

## Related skills

- `prototype-fast`: read for greyboxing and the keep/drop decision before spending jam hours on
  a mechanic.
- `itch-publish`: upload, channels, and `butler push` when the jam runs on itch.io.
- `game-feel`: juice, only once the core verb is proven fun.
- Engine skills (e.g. Godot, Phaser, LÖVE skills) and genre skills (e.g. `platformer`): build
  the loop the jam scopes.

## Version notes

Last checked: 2026-11-17. Rules change between editions of the same jam and the dates/limits
cited here are dated; always read the live page before relying on them.

- **Ludum Dare**: Compo format (solo, 48h, everything made during the event) and Jam format
  (72h, solo or team, open codebase). Rules on generative AI and third-party assets change
  regularly between editions.
- **GMTK Game Jam** and **Global Game Jam**: each sets its own window and its own
  platform/AI rules per edition; always refer to the current edition's page.
