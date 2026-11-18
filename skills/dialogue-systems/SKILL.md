---
name: dialogue-systems
description: "Builds engine-agnostic branching dialogue with Ink, Yarn Spinner, or a small JSON graph runner: lines, choices, conditions, variables, and localization IDs. Auto-invoke for NPC conversations, dialogue trees, ambient lines, .ink or .yarn files, or dialogue that gets stuck. Not for visual novel backlog and skip (`visual-novel`), quests (`rpg`), nor text box widgets (`godot-ui-control`, `game-ui-ux`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Dialogue systems

Model conversations as a graph: nodes carry lines, choices branch, conditions filter options,
and a variable store remembers what the player did. The first decision is build vs. adopt: Ink
or Yarn Spinner when authors need real flow control, a small data-driven runner when lines,
choices, and flags are enough. Never build a new scripting language.

> Adapted and translated from the `dialogue-systems` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Design branching conversations, choice menus, or narrative state that later lines read.
- Choose between Ink, Yarn Spinner, and a custom JSON/resource graph.
- Wire a dialogue runtime into the game loop: advance, show choices, run commands, persist.

**Not this skill**: VN presentation and flow (`visual-novel`), quest logic (`rpg`), widget code
(`godot-ui-control`, `roblox-ui`) and UI layout rules (`game-ui-ux`), persisting variables
across sessions (`save-systems`).

## Main workflow

1. **Inspect the project**: existing `.ink`/`.yarn`/`.yarnproject` files, an installed
   integration (ink-unity-integration, inkjs, Yarn Spinner for Unity or Godot), or a JSON
   graph. Keep what exists.
2. **Choose the tool.**
   - **Ink**: prose-first, weave and gather flow, read counts count as free flags; best for
     dialogue-heavy narration or "choose your own adventure" style.
   - **Yarn Spinner**: node-based, explicit `<<commands>>` dispatched to game code, line IDs
     built in for localization; best for game-driven dialogue with many engine hooks.
   - **Custom runner**: a JSON graph plus about 100 lines of interpreter, when full control or
     zero dependencies is needed.
3. **Define the node contract**: a node produces a line (speaker plus line ID), a set of
   choices, a command, or an end/jump. The runner hands lines and choices to the UI and waits.
4. **Keep variables out of the UI** in a single store the dialogue reads and writes, so
   cutscenes, tests, and saves see the same state.
5. **Write line IDs from day one**; displayed text comes from a per-locale string table.
6. **Apply costs on the transition** (the choice), not on a node the player can revisit.
7. **Validate before handing off:**
   - Ink: `inklecate -o story.json story.ink` exits 1 on a compile error.
   - Yarn: `ysc compile story.yarn` reports errors; `ysc run --auto-advance story.yarn` plays
     it in the terminal.
   - Custom graph: run `validate_graph()` from `references/runner.md`; it must return no issues
     (missing targets, nodes with no exit, undeclared variables, unreachable nodes).
   - Then walk every choice path once with a script that picks options in order.

## Patterns

### 1. Engine-agnostic dialogue graph (data, not code)

```json
{
  "start": "guard_intro",
  "vars": { "gold": 0, "gate_open": false },
  "nodes": {
    "guard_intro": {
      "speaker": "Guard", "line": "DLG_GUARD_001",
      "choices": [
        { "text": "DLG_OPT_BRIBE", "to": "bribe", "if": "gold >= 50",
          "set": { "gold": "gold - 50" } },
        { "text": "DLG_OPT_LEAVE", "to": "end" }
      ]
    },
    "bribe": {
      "speaker": "Guard", "line": "DLG_GUARD_BRIBED",
      "set": { "gate_open": true },
      "next": "end"
    },
    "end": { "end": true }
  }
}
```

`line`/`text` are **string-table IDs** (localization), not literal text. `if` filters a
choice; `set` modifies the variable store. The gold cost is on the *choice*, so it's paid once
per selection even if the `bribe` node is revisited; the idempotent `gate_open` write can live
on the node. A string-type `set` value is an expression, so a literal string needs inner
quotes: `"mood": "'angry'"`. The full interpreter that walks this graph is in
`references/runner.md`. Its variable store starts from `vars`; replace those defaults with the
player's saved narrative state at the start of a real conversation. Declare every referenced
variable so unknown names always surface typos as errors.

### 2. Runner step (a state machine over the graph)

```gdscript
# Godot 4.7. The runner holds the current node and a variable store. Each line
# waits for the player: the UI calls choose() or the continue callback.
func goto(id: String) -> void:
    current = graph.nodes[id]
    apply_set(current.get("set", {}))
    if current.get("end", false):
        ui.close()
        return
    if current.has("line"):
        ui.show_line(current.get("speaker", ""), localize(current.line))
    if current.has("choices"):
        var shown = current.choices.filter(func(c): return eval_cond(c.get("if", "")))
        ui.show_choices(shown)            # only choices whose condition passes
    elif current.has("next"):
        var next_id: String = current.next
        ui.show_continue(func(): goto(next_id))   # advances when the player continues

func choose(choice: Dictionary) -> void:   # called when the player selects a choice
    apply_set(choice.get("set", {}))       # written on the transition (safe on revisit)
    goto(choice.to)
```

### 3. Ink — branching with knots, choices, and variables (inkle)

```ink
// Ink: '*' = once-only choice, '+' = sticky. Text [in brackets] only appears in
// the choice, not in the printed outcome. '->' diverts; '-> END' halts the flow.
VAR gold = 60
-> guard_intro                    // the story starts at the top: divert into a knot

=== guard_intro ===
The guard blocks the gate.
* {gold >= 50} [Offer 50 gold]   "Here, take it."
    ~ gold = gold - 50
    The guard pockets it and steps aside. -> END
* [Leave]   You turn back. -> END
```

Ink tracks how many times each knot has been visited, so `{visited_knot}` is a built-in
condition. Variables are global (`VAR`) or temporary (`~ temp`).

### 4. Yarn Spinner — nodes, options, and commands (Yarn Spinner 3.x)

```yarn
title: GuardIntro
---
<<declare $gold = 60>>
<<declare $gate_open = false>>
Guard: You can't pass.
-> Offer 50 gold <<if $gold >= 50>>
    <<set $gold = $gold - 50>>
    Guard: ...fine. Go on through.
    <<set $gate_open to true>>
-> Leave
    Guard: Good choice.
===
```

Yarn lines may start with `Speaker:`; options use `->`; `<<set>>`/`<<declare>>` manage
`$variables`; `<<if>>` filters an option; `<<jump NodeName>>` moves between nodes. Interpolate
values into text with `{$gold}`. Declare every variable before its first use: an undeclared one
still compiles (Yarn infers its type and a default zero/false/empty value) with only a warning,
which hides typos. These constructs are unchanged since Yarn Spinner 2.x.

## Pitfalls

- **Display strings in the script** rather than line IDs turn localization into a rewrite.
  Yarn tags lines with `#line:` IDs (`ysc tag` adds them); Ink has no built-in line ID, so
  either tag lines yourself (`#id:guard_01`) or translate whole files.
- **A cost on a revisitable node** (`gold - 50` on `bribe`) is paid again on every visit. Put
  it on the choice, or guard it with an "already seen" flag.
- **Ink `*` vs. `+`.** `*` choices disappear after one use, so a looping hub menu built with
  `*` empties itself. Hub menus use the sticky `+`.
- **Ink choice text printed twice or not at all.** Text inside `[brackets]` only appears in the
  choice; text before it appears in both; text after it only in the printed output.
- **The Ink runtime loop stops after a choice.** After `ChooseChoiceIndex(i)` call `Continue()`
  (or `ContinueMaximally()`) again; the chosen branch prints nothing until you do.
- **Yarn's undeclared variables compile with only a warning** and start at 0, false, or "",
  which hides typos. `<<declare>>` everything.
- **Yarn 3 syntax in a Yarn 2 project** (`<<once>>`, `<<detour>>`, `when:` node groups) fails
  with "requires version 3 or later." Check the `.yarnproject`'s language version.
- **Ink Unity integration 2.0** imports `.ink` as an `InkFile` asset; code that loaded the old
  generated `.json` as a `TextAsset` must switch to `new Story(inkFile.storyJson)`.
- **Dead ends** (a node with no next, choices, or end) silently stall the conversation. The
  validation step catches these.
- **`eval()` on dialogue expressions** runs arbitrary code from data files and mods. Use a
  whitelisted evaluator (the runner's `evaluate`).

## References

- [`references/ink-and-yarn.md`](references/ink-and-yarn.md): read to write or review `.ink`
  or `.yarn` (side-by-side syntax, Ink weave features, Yarn 3 additions, runtime integration,
  and localization).
- [`references/runner.md`](references/runner.md): read to build or fix a custom runner (schema,
  sandboxed `evaluate`, `DialogueRunner`, localization lookup, `validate_graph`).

## Related skills

- `save-systems`: persisting narrative variables and "already seen" flags.
- `godot-resources`, `unity-scriptableobjects`: storing dialogue as engine data.
- `godot-ui-control`, `game-ui-ux`: text boxes, portraits, and choice buttons.
- `visual-novel`, `rpg`: genres that compose this skill.

## Version notes

Last checked: 2026-11-11.

- Ink 1.2.1 (May 2026) with ink-unity-integration 2.0.0 (July 2026); `inklecate` exits with
  code 1 on a compile error and defaults its output to `<name>.ink.json`.
- Yarn Spinner compiler 3.2.1 (May 2026), Yarn Spinner for Unity 3.2.8 (August 2026), `ysc`
  3.2.2 with `compile`, `run`, `tag`, and `extract`.
- Yarn Spinner engine status: Unity stable; Godot GDScript edition in early access (docs 3.3,
  Godot 4.6 or later, not yet recommended for a release); Godot C# edition marked in
  development with no official support; Unreal listed as pre-release for UE 5.7 or later.
