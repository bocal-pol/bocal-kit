---
name: roguelike
description: "Designs the run structure of a roguelike/roguelite in any engine: permadeath, meta-progression, seeded/daily runs, energy-based turn order, symmetric field of view. Auto-invoke for a NetHack- or Hades-like game, or runs that feel unfair or cheap. Not for the dungeon generation algorithm itself (`procedural-gen`), roguelike deckbuilders (`card-game`), or RPGs with a persistent character (`rpg`)."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Roguelike

This skill owns the run: what it contains, what survives death, how turns and seeds work, and
what a generated floor must guarantee — never engine code or the generation algorithm itself.
Generators come from `procedural-gen`; this skill decides what they must produce and verifies
it. Always load the detected engine skill together with this genre skill.

> Adapted/translated from the `roguelike` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- A game where every run starts from zero, death ends it, and content is regenerated: a classic
  turn-based grid roguelike, or a real-time roguelite.
- Deciding between permadeath and meta-progression, run length and act structure, seeds and
  daily runs, turn ordering, or field of view.

**Not this skill**: the algorithm that digs rooms or caves, noise, WFC, or loot-table rolling
(`procedural-gen`); deckbuilders even roguelike ones like Slay the Spire or Balatro
(`card-game`); RPGs with a persistent character (`rpg`). For a real-time roguelite, also load
the relevant action genre skill (`platformer`, `fps-shooter`) for moment-to-moment control.

## Main workflow

1. **Decide the type with the user.** Classic (turn-based, grid, strict permadeath, multi-hour
   runs, knowledge itself IS progression) or roguelite (real-time or turn-based, 20-60 minute
   runs, some power or options persist between runs). The Berlin Interpretation (RogueBasin,
   2008) lists classic traits; use it as vocabulary, not as a mandatory checklist.
2. **Draw the run shape.** 3-4 acts or biomes, each ending in a boss or gate, with a choice
   between paths or rewards at least every few minutes. Plan for a first death around 5-15
   minutes for a new player, and have the death screen show the seed, depth, cause, and what was
   unlocked.
3. **Split the state** into run state (wiped on death) and profile state (kept). Decide strict
   permadeath (delete the run save on load) or checkpointed runs, and write the rule down in
   black and white.
4. **Seed everything** from a single run seed with per-floor, per-use sub-seeds (see Pitfalls).
5. **Turn order** (turn-based games): an energy scheduler (Pattern 1) with a few discrete speeds.
6. **Generate floors with `procedural-gen`,** then validate each floor with acceptance checks and
   a spawn budget (see Verify).
7. **Verify** with the checklist below.

## Design rules and numbers

| Decision | Starting point | Why |
|---|---|---|
| Speeds | 50, 100, 200 (slow, normal, fast) | odd ratios (e.g. 110) add an unplanned enemy move every ten turns |
| Action cost | 100 energy for move, attack, item use | vary cost by action (heavy attack 150) instead of adding more speeds |
| Field-of-view radius | 6-9 tiles; lit rooms fully visible | a small radius adds tension and cuts ranged tactics |
| Out-of-depth spawns | ~5% of spawns, up to 3 levels deeper | rare spikes stay memorable |
| Safe start | no monster within 6-8 tiles of the arrival point | the first turn should never decide the run |
| Meta-progression | new options (characters, items added to the pool, starting choices) before flat stat bonuses | flat bonuses trivialize early acts and turn runs into grinding |
| After the first win | a cumulative difficulty scale (Slay the Spire's Ascension, Hades' Heat) | gives experts a reason to keep playing |
| Daily run | one seed per UTC day, one attempt, shared leaderboard | comparable runs require identical seeds |

## Patterns

### 1. Energy scheduler (pseudocode)

```python
# Pseudocode. Actors gain energy each time unit and act once the threshold is reached.
TURN_COST = 100
def next_actor(actors):
    while True:
        for a in actors:                  # 1) serve whoever is already ready, in a stable order
            if a.energy >= TURN_COST:
                a.energy -= TURN_COST      #    or the cost of the chosen action
                return a
        for a in actors:                  # 2) nobody ready: advance time for everyone at once
            a.energy += a.speed           # 100 = normal, 200 = hasted, 50 = slowed
```

Grant energy in its own pass. Adding it inside the loop that returns the first ready actor starves
everyone after them: with two actors at speed 100, the first would act every time.

### 2. Per-use sub-seeds (principle)

Derive a seed per floor and per domain (generation, combat, loot) from a single run seed, e.g.
`hash(run_seed, "floor", floor_number, "loot")`. A single RNG shared between generation and
combat makes the number of attacks on floor 1 shift later floors. Hash with a fixed algorithm
(never a language's native `hash()`, which is randomized per process) and iterate in sorted order
rather than over an unordered set.

### 3. Symmetric field of view

Use symmetric shadowcasting (e.g. `tcod.map.compute_fov(...,
algorithm=FOV_SYMMETRIC_SHADOWCAST)` in Python/libtcod, or the engine's equivalent algorithm)
rather than classic raycasting: otherwise the player sees a monster that can't see them,
violating the symmetry rule.

## Verify

1. The same seed twice gives the same hash for floors 1 through N, even after playing floor 1
   differently between the two runs.
2. 500+ seeds per depth pass floor acceptance checks (see `procedural-gen` for generation
   details), with the rejection rate reported.
3. Field-of-view symmetry on random maps.
4. Speeds 50/100/200 over 1,000 time units give turns in a 1:2:4 ratio.
5. Dying deletes or invalidates the run save and leaves the profile file intact.

## Pitfalls

- **Same seed, different floor 3** → a single RNG shared between generation and combat. Derive a
  sub-seed per floor and per use.
- **Seeds differ between two runs of the same build** → seeding from a native `hash()`
  randomized per process, or iterating over an unordered set during generation. Hash with a
  fixed algorithm and iterate in sorted order.
- **A monster never acts** → energy granted inside the "find who's ready" loop (Pattern 1).
- **Double moves or input races** → a real-time loop pretending to be turn-based. Resolve one
  discrete player action, then let the scheduler run until the player is ready again.
- **The player sees the monster, the monster doesn't see them** → classic or raycast FOV. Use
  symmetric shadowcasting.
- **Stairs behind an unreachable wall, or a key locked behind its own door** → generator output
  accepted without validation. Validate the floor (reachability, no closed loop) before shipping
  it.
- **Deaths feel unfair** → damage the player couldn't see coming. Show enemy intent or telegraph
  big hits, and log every damage source in the message log.
- **Permadeath wipes unlocks** → run and profile in a single save. Split them.
- **Save-scumming** → the run save survives a reload. Delete or invalidate it on load if strict
  permadeath is the intended design; copying save files can't be prevented, so don't try.
- **Identification knowledge carries over between runs** → fixed appearance names. Shuffle
  appearance names per run.

## References

- `procedural-gen`: for the generation algorithms themselves (dungeons, noise, WFC, loot
  tables) — this skill owns only the acceptance criteria, not the algorithm.
- `save-systems`: for atomic writes and versioning of both saves (run and profile) decided here.

## Related skills

- **Composes with** (routing table §3d): `procedural-gen` (generation) + engine tilemap +
  `game-ai` + `save-systems`.
- **Ownership on overlap** (routing table §3c): dungeon or level generation algorithms belong to
  `procedural-gen`; `roguelike` owns run structure, permadeath, and meta-progression. A roguelike
  deckbuilder is owned by `card-game` (`procedural-gen` only joins for card generation).
- `game-designer`: project-wide balancing and difficulty curve outside run structure —
  `roguelike` owns run mechanics, not overall tone or art identity.
- `lead-gameplay-programmer`: integrating the turn scheduler and meta-progression into the
  project's code architecture — `roguelike` supplies the pattern, not the final wiring.
- `physics-engineer`: out of scope for this genre, except a real-time roguelite with advanced
  physics (complex projectiles, destructibles) — hand off in that case.

## Version notes

Last checked: 2026-11-17.

- Berlin Interpretation: RogueBasin, 2008 (https://www.roguebasin.com/index.php/Berlin_Interpretation).
- Symmetric shadowcasting: Albert Ford, 2021 (https://www.albertford.com/shadowcasting/);
  reference Python implementation in python-tcod (`FOV_SYMMETRIC_SHADOWCAST`).
