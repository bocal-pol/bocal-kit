---
name: puzzle
description: "Designs grid and logic puzzles in any engine: match-3 cascades, Sokoban-style pushing, unique-solution grids (nonogram, Sudoku), exact undo, and solver-verified levels. Auto-invoke for a Candy Crush-, Sokoban-, or Picross-like game, or broken cascades, drifting undo, or unsolvable levels. Not for physics puzzles (`platformer`, `physics-tuning`) or card games (`card-game`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Puzzle

This skill owns discrete board puzzles: the rules engine, resolution order, undo, solvability,
and level difficulty — never engine code. The board model is the only truth; the view replays
the list of changes each move produces. Always load the detected engine skill together with this
genre skill.

> Adapted/translated from the `puzzle` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- The player changes a discrete board through moves and the board resolves by rules: matching,
  pushing, sliding, merging, or pure logical deduction.
- Writing a solver or generator, ordering levels by difficulty, fixing undo or unrecoverable
  deadlocks.

**Not this skill**: physics-driven puzzles and puzzle-platformers (`platformer`,
`physics-tuning`); turn-based dungeon runs (`roguelike`); card zones (`card-game`).

## Main workflow

1. **Model the board as pure data** (a grid of cell values plus counters and RNG state) with a
   pure `apply(state, move) -> (state, events)` function. The view animates the `events`.
2. **Write the rules resolver** for the relevant family (see below) and loop until stable where
   rules cascade.
3. **Undo from day one**: push a snapshot (or an invertible command) before every move, including
   score, counters, and RNG state. Add a restart, which reflexive puzzles need as much as undo.
4. **Write a solver early** (BFS or A* over states for push and slide puzzles, a logic/constraint
   solver for logic grids, a move-existence check for match-3). It validates every level,
   measures difficulty, and feeds hints.
5. **Order levels by measured difficulty,** introducing one mechanic at a time: a level that
   teaches it alone, a level that tests it, then one that combines it with a known mechanic.
6. **Verify** with the checklist below.

## Rule families and numbers

| Family | Rules that matter | Starting numbers |
|---|---|---|
| Match-3 | 4 in a row makes a piece that clears a line, an L or T of 5 makes an area bomb, 5 in a row makes a color bomb (Candy Crush naming) | 8x8 or 9x9 board, 5-6 colors (fewer colors, more cascades), hint after ~5 s of inactivity |
| Pushing (Sokoban) | push a single box, never pull; dead squares (goal-less corners, wall edges with no goal) | difficulty by minimum push count and states explored, not board size |
| Sliding (15-puzzle) | half of random arrangements are unsolvable | check inversion parity |
| Merging (2048) | slide, merge equal neighbors once per move, then spawn | the original spawns a 2 at 90% chance and a 4 at 10% |
| Logic grids | exactly one solution, reachable by deduction alone | rate difficulty by the hardest deduction rule the solver needs |
| Rules-as-objects (Baba Is You-style) | rules are board objects; re-derive the rule set after every move, before checking for a win | test every rule word against every object type |

Guess-free generation is the standard for logic puzzles: Simon Tatham's Minesweeper clone, for
example, guarantees by default that the whole grid can be deduced from the first opening.

## Patterns

### 1. Resolve until stable (match-3, pseudocode)

```python
def resolve(board, rng):
    events, chain = [], 0
    while True:
        matches = find_matches(board)   # runs of 3+, rows and columns
        if not matches:
            break
        chain += 1
        specials = specials_from(matches)   # decide BEFORE clearing (shape and swapped cell)
        events.append(("clear", matches, chain))
        clear(board, matches); place(board, specials)
        events.append(("fall", apply_gravity(board)))
        events.append(("spawn", refill(board, rng)))   # seeded RNG, saved in undo snapshots
    if not has_valid_move(board):
        events.append(("reshuffle", reshuffle_until_playable(board, rng)))
    return events
```

## Verify

1. The solver solves every shipped level; print the minimum move count and states explored per
   level and flag levels whose order contradicts measured difficulty.
2. Logic grids: the solver finds exactly one solution without guessing.
3. Undo: hash the full state, make a random move, undo, compare hashes (repeat 1,000 times).
4. Match-3: 10,000 random boards after generation have no pre-made match and at least one valid
   move.
5. Input during a cascade resolution is ignored or queued, never applied mid-resolution.

## Pitfalls

- **Cascades miss matches** → the resolver ran only once. Loop until no matches remain
  (Pattern 1).
- **A special piece spawns in the wrong cell** → specials decided after clearing. Decide them
  from the match shape and the swapped cell first.
- **Undo draws a different piece on refill** → RNG state isn't in the snapshot; players learn to
  undo for better pieces. Save board, score, counters, and RNG state together.
- **Visuals desync from the board** → animation code reads a half-updated board. Animate the
  event list; lock or queue input until it finishes.
- **Deadlock with no possible move** → no deadlock check. Detect and reshuffle (keeping piece
  counts, with no free match) or end the level.
- **Generated level unsolvable** → random shuffle with no check. Generate backward from a solved
  state with inverse moves (pulling for Sokoban), or generate then solve, keeping the seed.
- **Two valid solutions in a logic grid** → the generator never checked uniqueness. Rerun the
  solver for a second solution and reject or add a hint.
- **Difficulty spikes** → levels ordered by designer feel. Order by solver effort and teach one
  mechanic at a time.
- **A box pushed into a dead corner with no hint** → no dead-square detection. Precompute dead
  squares and offer a restart or flag them.

## References

- Rule families and difficulty formulas: see table above; split into a separate reference once
  the project has more than one puzzle family to maintain.

## Related skills

- **Composes with** (routing table §3d): `godot-tilemap`/`unity-tilemap-2d` + `level-design` +
  `game-feel`.
- `game-designer`: project-wide tone and balancing — `puzzle` owns genre-specific rules and
  difficulty measurement.
- `lead-gameplay-programmer`: integrating the solver and undo into the code architecture —
  `puzzle` supplies the data model and pseudocode.
- `physics-engineer`: physics-driven puzzles (simulated marbles, dominoes) fall outside this
  skill — hand off in that case, and to `physics-tuning` for stability.

## Version notes

Last checked: 2026-11-17.

- 2048 spawn probabilities: `Math.random() < 0.9 ? 2 : 4` in the game's open-source reference
  implementation.
- Simon Tatham's Minesweeper "Ensure solubility" option, enabled by default.
- Match-3 board size, color count, and hint delay are common practice, not measurements from a
  specific game.
