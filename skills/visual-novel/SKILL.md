---
name: visual-novel
description: "Builds visual novels and choice-driven stories in Ren'Py or any engine: routes and endings, save-anywhere, backlog, read-only skip, type-on text. Auto-invoke for a VN or dating sim, or loading at the wrong line, a skip that scrolls past unread text, or an unreachable ending. Not for dialogue in a larger game or Ink/Yarn (`dialogue-systems`) nor text-box widgets (`godot-ui-control`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Visual novel

This skill owns the shape of a branching story and the reading comforts players expect — never
the script runtime itself. The runtime (Ren'Py, Ink, Yarn Spinner) advances the script; this
skill decides routes, flags, saves, and reader-facing systems, and verifies them. Always load
the detected engine skill together with this genre skill.

> Adapted/translated from the `visual-novel` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- The game is mostly reading text with character art, backgrounds, and choices.
- Planning routes and endings, affection systems, save behavior, backlog, skip, and auto, or
  verifying every ending is reachable.

**Not this skill**: NPC conversations in another genre (`dialogue-systems`, with `rpg` for
quests); Ink or Yarn integration code (`dialogue-systems`); text-box and choice-menu widgets
(`godot-ui-control`, `game-ui-ux`).

## Main workflow

1. **Find the engine.** Under Ren'Py (`game/*.rpy`), the engine already has save-anywhere,
   rollback, history, skip, auto-forward, and text speed: restyle its screens and preferences,
   and put the effort into routes and flags. Elsewhere, build these systems yourself (see
   Patterns).
2. **Draw the route map before writing**: the common route, the lock-in point (often around a
   third of the way through), each route's endings, and a true ending gated on finishing the
   others if wanted. Write the flags and thresholds each ending requires right next to it.
3. **Size the script.** Readers average ~200-250 words per minute, so 1,000 words take ~4-5
   minutes; a 2-hour VN runs ~25,000-30,000 words. Give a meaningful choice or reaction every
   5-15 minutes of reading, and have at least one later line visibly react to each major choice.
4. **Track state** with booleans for one-off decisions and counters for affection. For each
   route, add up the maximum affection choices can give and set the ending threshold below that,
   with margin for missed choices.
5. **Saves resume at the exact line** with all flags, and seen-text data lives in persistent
   storage shared across all saves.
6. **Verify** with the checklist below.

## Reader-facing systems

| System | Default | Notes |
|---|---|---|
| Text speed | instant or fast by default, with a slider | Ren'Py's default is instant (`preferences.text_cps = 0`) |
| Skip | read-only text; stops at choices and unseen lines | Ren'Py: `preferences.skip_unseen = False` |
| Auto-forward | delay proportional to line length; pauses at choices | Ren'Py: `preferences.afm_time = 15` |
| Backlog | 100-200 lines, with voice replay | Ren'Py's rollback also serves as the backlog |
| Saves | many slots with thumbnail, date, and chapter, plus a quicksave | autosave at chapter start and before choices |
| Galleries | CG, music, and ending list unlocked across all saves | Ren'Py's `persistent` data |

## Patterns

### 1. Type-on reveal without text jumping

```python
# Set the full text once, then reveal by visible-character count.
def show_line(speaker, text):
    name_label.text = speaker
    body.text = text                          # line wrapping is decided once, on the full text
    revealed = 0.0
    while revealed < visible_length(body) and not advance_pressed():
        revealed += cps * frame_dt()
        body.visible_characters = int(revealed)
        wait_frame()
    body.visible_characters = -1              # the first press completes the line
    backlog.append((speaker, text)); seen.add(line_id)
    wait_for_advance()                         # the second press advances
```

Godot: `RichTextLabel.visible_characters` with `visible_characters_behavior =
TextServer.VC_CHARS_AFTER_SHAPING` (the default leaves hidden text out of line-wrap
calculations, so words still jump). Unity: `TMP_Text.maxVisibleCharacters`.

### 2. Ending-walk verification (tree-shaped formats)

For a format compiled into a graph (Ink, Yarn, a homemade JSON), walk breadth-first from the
start: continue while there's content, save state at every choice, load each state and pick
every branch, and collect the ending tags encountered. Tag ending lines (e.g. `# ending:
alice_good`) and check every planned ending appears in the walk. Cap depth and dedupe states for
large scripts.

## Verify

1. Run the engine's linter if available (e.g. `renpy.sh <project> lint --error-code` under
   Ren'Py, nonzero exit on lint error).
2. Run the ending-walk (Pattern 2) and confirm every planned ending is reached.
3. Save at a choice, quit, load, confirm the same line and choices reappear.
4. Enable skip on a fresh profile and confirm it stops at the first unseen line.

## Pitfalls

- **Loading resumes at a scene's start** → only a checkpoint or node name was saved. Save the
  exact position (Ink: `state.ToJson()`); Yarn Spinner only restores the default node.
- **Old saves break after an update** → lines moved or were edited under an existing save. Give
  lines stable ids, keep published labels, and test loading saves from the previous version.
- **A Ren'Py flag not saved or reset on load** → declared with `define` (for constants) instead
  of `default`. Story state uses `default`.
- **Skip scrolls past new text** → seen text is stored per save, or skip is set to "all". Store
  seen-line ids in persistent data shared across all saves.
- **An ending is unreachable** → thresholds above the maximum choices can give, or a flag set on
  one branch and read on another. Run the ending-walk (Verify step).
- **Choices feel fake** → branches immediately remerge with no reaction. Pay every choice with at
  least one line, a sprite, or a later option.
- **Text jumps between lines or shows raw tags** → the reveal splices the raw string (Pattern 1).
- **Branch explosion** → fully separate trees for every choice. Branch then merge, with flags
  varying lines, reserving full routes for major decisions.
- **Text frozen in code or images** → no translation path. Keep strings in the script or a table
  indexed by line id, with room for text 30% longer.

## References

- `dialogue-systems`: for the Ink and Yarn Spinner runtimes themselves.
- `save-systems`: for the slots, versioning, and atomic writes of the saves described here.

## Related skills

- **Composes with** (routing table §3d): `dialogue-systems` + `save-systems` + `game-ui-ux`.
- **Ownership on overlap** (routing table §3c): `visual-novel` owns routes, endings,
  save-anywhere, backlog, and skip; `dialogue-systems` only joins for the Ink/Yarn runtime
  itself.
- `game-designer`: project-wide tone and balancing — `visual-novel` owns genre-specific route
  structure and reading systems.
- `lead-gameplay-programmer`: integrating the route system into the code architecture outside
  Ren'Py — `visual-novel` supplies the data model, not the final wiring.
- `physics-engineer`: out of scope for this genre.

## Version notes

Last checked: 2026-11-17.

- Ren'Py default preferences (`text_cps = 0`, `afm_time = 15`, `skip_unseen = False`): official
  Ren'Py documentation.
- `inklecate` exits nonzero on a compile error; `inkjs` exposes `Continue()`, `canContinue`,
  `currentChoices`, `currentTags`, `ChooseChoiceIndex()`, `state.ToJson()`, `state.LoadJson()`.
- The reading-speed and words-per-hour figures are rough design estimates, not measurements.
