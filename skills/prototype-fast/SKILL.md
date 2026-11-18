---
name: prototype-fast
description: "Build a throwaway prototype in about an hour to answer a single question, most often \"is this mechanic fun?\": one-question brief, greybox, debug HUD, playtest, then a keep/drop/recalibrate decision. Auto-invoke for \"prototype this\", \"just something playable\", or to decide whether prototype code should be kept. Not for a jam with a submission deadline (`game-jam`) nor for deep level blockout (`level-design`)."
model: claude-sonnet-5-5
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Prototype Fast

Make a mechanic playable fast enough to know whether it's worth building for real. The
deliverable is a **decision** (keep, drop, or recalibrate) written into the repo, not a product.
This skill writes the brief, builds the smallest thing that answers it, instruments it, and has
the user play it; their feedback decides.

> Adapted from the `prototype-fast` skill of
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Validating a mechanic or a "what if", a quick slice of a single interaction.
- De-risking an idea before committing real production time to it.
- Deciding "keep or throw away" on code already written in prototype mode.

**Not this skill**: a jam with a deadline and submission (`game-jam`); level layout and
blockout (`level-design`); publishing (`steam-publish`, `itch-publish`); the production build
of a feature already validated (the relevant engine or genre skill).

## Main workflow

1. **Write the brief first** in `prototypes/<idea>/BRIEF.md` (Pattern 1) and get it approved by
   the user: one question, the core verb, keep/drop signals, a timebox. Two questions mean two
   prototypes; a prototype that tests everything decides nothing.
2. **Throwaway by default.** Hardcoded values, a single file is enough, no architecture. Only
   choose a "keep" structure if the user explicitly says this code will grow, because a
   prototype that mistakes itself for production code ends up rotting inside the shipped game.
3. **Contain it.** Build inside `prototypes/<idea>/` (a folder or separate project the main game
   never imports) or on a throwaway branch.
4. **Greybox everything but the verb.** Boxes, circles, capsules, the engine's default font, no
   audio or a single debug beep. Don't spend anything on what the question doesn't depend on.
5. **Instrument the question.** Draw a debug HUD with the values being judged (speed, jump
   height, timing window, time to first success) and expose the calibration values as named
   constants at the top of the file, so recalibrating is a one-line change.
6. **Run it yourself first** (Verify), then **have the user play it** with no explanation and
   gather their feedback: did they perform the core verb without being told, how long did it
   take, did they restart, what felt off. If someone else can play it, ask the user to observe
   them and report the same things.
7. **Decide against the brief** and add it to `BRIEF.md`: keep (schedule a rewrite in the real
   project), drop (one line on what was learned), or recalibrate (change one constant and
   replay).

## Patterns

### 1. `BRIEF.md`

```text
QUESTION:      The single thing this must prove, ideally yes/no.
CORE VERB:     The one action the player repeats.
THROWAWAY:     yes (default) | no, because ...
TIMEBOX:       e.g. 60 min; stop when it rings, even if unfinished.
KEEP IF:       observable signal (see Pattern 3).
DROP IF:       observable signal.
RESULT:        <date> keep | drop | recalibrate - playtest evidence
```

### 2. Only the verb is real (engine-agnostic pseudocode)

```text
const RUN_SPEED = 8.0, JUMP_VELOCITY = 12.0, GRAB_WINDOW = 0.15   # calibrate here

on update(dt):
    read_input()
    apply_core_mechanic(dt)                  # the only thing being tested
    draw_box(player)                         # a box, not a sprite
    draw_debug_hud(speed, airtime, window_hits, time_to_first_success)
    # enemies, menus, saves, audio, art: stubbed or absent
```

### 3. Keep, drop, or recalibrate

```text
KEEP when, with placeholder art:
  - a new player performs the core verb on purpose in under ~30s, without being told, and
  - they restart the loop without being asked to.
DROP when:
  - the verb only becomes enjoyable once explained, or
  - making it fun requires systems well beyond the prototype, or
  - art or levels get added to avoid admitting the verb is flat.
RECALIBRATE when a single value is clearly off (too slow, window too tight):
  change it, replay.
```

## Verify

Run this yourself before handing the prototype to the user:

1. It launches from the command line (the engine's run or headless command, or a local web
   server on `127.0.0.1`) with no errors in the log or console.
2. The loop completes: start, perform the verb, succeed or fail, restart. Drive it with scripted
   input or a short automated run when the engine allows it; otherwise play it once.
3. The debug HUD shows the values named in the brief and they change as expected.
4. `git status` (or an import search) shows no changes outside `prototypes/<idea>/`, and the
   main game doesn't import it.
5. `BRIEF.md` has a RESULT line after the user's playtest.

## Pitfalls

- **Polishing too early.** Art, menus, and audio make a flat verb look finished and delay the
  verdict → greybox until the verb is settled.
- **No drop criterion.** Without a written "drop if", every prototype "has potential" and
  nothing gets cut → decide the signal before anyone gets attached to the code.
- **Building systems instead of the mechanic.** Inventory, saves, and settings aren't the
  question → stub them (see `save-systems` once the mechanic is kept, not during the
  prototype).
- **The spike becomes the product.** A "keep" authorizes a rewrite in the real project, not a
  copy-paste of the prototype code and its shortcuts.
- **Prototyping in the real codebase.** It mixes experiments with shipped systems and makes the
  spike expensive to delete → isolate in `prototypes/<idea>/` or a throwaway branch.
- **Only the author playtests.** The author knows the controls and the intent → always ask
  someone else for feedback rather than judging it yourself.

## References

- No specific external doc: this workflow relies on internal discipline (brief, greybox,
  playtest), not a particular third-party tool.

## Related skills

- `game-jam`: the same scope discipline under a submission deadline.
- `level-design`: when the question is about level layout rather than a mechanic.
- `game-feel`: juice, only after the verb is proven fun.
- `save-systems`, `game-ui-ux`, `create-game-assets`, engine skills: for the production rewrite
  once the mechanic is kept.

## Version notes

Last checked: 2026-11-17. This skill depends on no external tool or platform whose rules
change; nothing to recheck on that account.
