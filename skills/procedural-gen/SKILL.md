---
name: procedural-gen
description: "Engine-agnostic procedural generation in Python with Godot and Unity mappings: seeded RNG, dungeon layouts, wave function collapse, noise terrain, and loot tables. Auto-invoke for a dungeon generator, WFC or Perlin terrain, or seeds that give different maps. Not for roguelike run structure (`roguelike`), deckbuilders (`card-game`), or painting tiles (`godot-tilemap`, `unity-tilemap-2d`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Procedural generation

Generating levels, terrain, and drops from rules and a seed. The most important property is
**determinism**: a seed reproduces a world, so bugs replay and players can share seeds. This
skill owns the algorithms and their validation; genre skills like `roguelike` and
`survival-crafting` decide what to generate and when.

> Adapted and translated from the `procedural-gen` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Map, dungeon, cave, terrain, or item-drop generators, in any engine.
- Results that must reproduce from a seed (debugging, daily challenges, shareable worlds).
- Validating generated content: reachable rooms, a safe spawn, a path to the exit, no key
  behind its own lock.

**Not this skill**: run structure, permadeath, and meta-progression (`roguelike`), card packs
and pools (`card-game`), drawing tiles (`godot-tilemap`, `unity-tilemap-2d`), pathfinding over
the result (`game-ai`), hand-authored rhythm levels (`level-design`).

## Main workflow

1. **Own the randomness.** Create a seeded RNG and pass it to every function that makes a
   choice. Global random calls make results depend on call order and other systems.
2. **Choose the technique for the content.** Continuous terrain: noise. Rooms and corridors: BSP
   or placement plus a spanning tree. Caves: random walk or cellular automaton. Tile adjacency
   rules: WFC. Rarities: weighted tables.
3. **Generate to raw data** (an integer grid, a room list), separate from rendering, so it can
   be tested without the engine.
4. **Validate every result**: connectivity via flood-fill from spawn, spawn safety, path to the
   exit, key ordering. Reject and regenerate with a derived seed, or repair.
5. **Tune with the seed fixed** so every parameter change is visible, then sweep many seeds to
   check distribution and failure rate.
6. **Run the seed sweep** (Pattern 4) and report its numbers.

## Patterns

### 1. Seeded RNG

```python
import random
rng = random.Random(seed)        # a dedicated instance, never module-level random.*
room_count = rng.randint(5, 12)
sub = random.Random(rng.getrandbits(64))   # derive a child stream per system or chunk
```

Engine equivalents: Godot 4.7 `var rng := RandomNumberGenerator.new(); rng.seed = s` (save
`rng.state` to resume mid-sequence); Unity `new Unity.Mathematics.Random(seed)` (a nonzero
`uint`) or `new System.Random(seed)`. Avoid `UnityEngine.Random.InitState` for generation: it
seeds the single global generator every other script also draws from. Derive child seeds per
system (layout, loot, decoration) so adding a decoration roll doesn't reshuffle the layout.

### 2. A PRNG whose sequence you own

```python
class SplitMix64:
    """Tiny PRNG whose sequence you own: same seed, same numbers, across every version."""
    MASK = (1 << 64) - 1

    def __init__(self, seed: int):
        self.state = seed & self.MASK

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & self.MASK
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & self.MASK
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & self.MASK
        return z ^ (z >> 31)

    def below(self, n: int) -> int:            # 0 <= result < n, no modulo bias
        limit = self.MASK - (self.MASK + 1) % n
        while (x := self.next_u64()) > limit:
            pass
        return x % n

# Pin the first outputs in a test so a refactor can't change every shared seed.
rng = SplitMix64(0)
assert [rng.next_u64() for _ in range(3)] == [
    0xE220A8397B1DCDAF, 0x6E789E6AA1B965F4, 0x06C45D188009454F]
```

Use it when seeds must survive engine, runtime, or library updates (daily challenges,
seed-only saves, cross-platform shared seeds). Port the same arithmetic to C# with `ulong` or
to GDScript carefully: GDScript's `int` is a signed 64-bit value, so mask shifts and compare
unsigned.

### 3. Weighted drop table

```python
def weighted_pick(rng, table):           # table: list of (item, weight); relative weights
    total = sum(w for _, w in table)
    roll = rng.uniform(0, total)
    upto = 0.0
    for item, w in table:
        upto += w
        if roll < upto:
            return item
    return next(i for i, w in reversed(table) if w > 0)  # roll == total (float edge case)
```

Built-ins do the same thing: Python `rng.choices(items, weights)`, Godot
`rng.rand_weighted(PackedFloat32Array(weights))` (returns an index). Plain rolls produce
streaks; for a guaranteed rate use a bag or a pity timer (`references/dungeon-generation.md`).

### 4. Seed sweep (determinism, connectivity, distribution)

```python
import hashlib, json, random, statistics

def sweep(generate, seeds=range(200), spawn=None):
    """generate(rng) -> grid (0 wall, 1 floor, solid border). Prints and returns a report."""
    bad, ratios, digests = [], [], set()
    for seed in seeds:
        grid = generate(random.Random(seed))
        if grid != generate(random.Random(seed)):
            bad.append((seed, "not deterministic"))
            continue
        floor = [(x, y) for y, row in enumerate(grid) for x, v in enumerate(row) if v]
        if not floor:
            bad.append((seed, "no floor"))
            continue
        start = spawn(grid) if spawn else floor[0]
        if len(reachable_floor(grid, start)) != len(floor):   # from dungeon-generation.md
            bad.append((seed, "unreachable floor"))
        ratios.append(len(floor) / (len(grid) * len(grid[0])))
        digests.add(hashlib.sha1(json.dumps(grid).encode()).hexdigest())
    report = {"seeds": len(seeds), "failure_count": len(bad), "failures": bad[:10],
              "distinct_maps": len(digests),
              "floor_ratio": (min(ratios), statistics.median(ratios), max(ratios)) if ratios else None}
    print(report)
    return report

# report = sweep(lambda rng: drunkard(40, 30, rng)); raise SystemExit(report["failure_count"] > 0)
```

Run it twice in separate processes and compare digests too: that catches hash-randomized set
order and other per-process state a rerun in the same process can't see. Add whatever checks
the game needs (spawn not in danger, exit reachable, key before its door) as extra
`bad.append` lines.

## Verify

1. Run the seed sweep over at least 200 seeds: zero failures, and `distinct_maps` close to the
   seed count (a low number means the seed isn't reaching the generator).
2. Rerun it in a fresh process (`PYTHONHASHSEED` differs per run by default) and confirm the
   same digests for the same seeds.
3. If seeds are shared or saved, pin the PRNG's first outputs in a test (Pattern 2).
4. For engine-side generators, port the sweep to a headless test (Godot: follow
   `godot-gdscript-headless-testing`) and print the same report.
5. Ask the user to play a handful of named seeds and report any map that looked broken,
   repetitive, or unfair, with its seed, so it can be replayed.

## Pitfalls

- **Global RNG in generation** makes worlds non-reproducible as soon as call order changes.
- **Iterating a set or dict of strings** (Python `rng.choice(list(some_set))`) changes order per
  process due to hash randomization. Sort first.
- **Seeds that stop matching after an update.** Python only guarantees `random()` across
  versions (not `randint` or `choice`), .NET says `System.Random` can change between major
  versions, and Godot calls its PCG32 an implementation detail. Ship your own PRNG (Pattern 2)
  or save the generated result rather than the seed.
- **One stream for everything**: adding a decoration roll reshuffles every later room. Derive
  child seeds per system.
- **Correlated noise fields**: elevation and humidity from the same seed and offset make biomes
  line up in bands. Reseed or offset each field.
- **Octave sums out of range**: divide by the summed amplitude, and know the library's range
  (FastNoiseLite and `noise.snoise` are roughly -1..1, `Mathf.PerlinNoise` roughly 0..1).
- **Flat noise at integer coordinates**: Perlin noise is 0 at every lattice point, so a raw
  `noise(x, y)` at integer tile coordinates is constant. Scale by a non-integer frequency;
  FastNoiseLite applies its `frequency` (default 0.01) for this.
- **No connectivity check**: isolated rooms and caves. Flood-fill from spawn and reject or
  reconnect, and re-check after smoothing passes, which can split regions.
- **Unbounded placement loops** ("retry until N rooms fit") can run forever on a small grid. Cap
  attempts and accept fewer rooms.
- **WFC contradictions every run** usually mean asymmetric adjacency rules: if B can place east
  of A, A must be allowed west of B.

## References

- [`references/dungeon-generation.md`](references/dungeon-generation.md): read to implement
  rooms and corridors, BSP, drunkard's walk or cellular caves, wave function collapse, the
  `reachable_floor` flood fill, or bag and pity distributions.
- [`references/noise.md`](references/noise.md): read to build terrain or biomes: frequency,
  octaves, redistribution, ridges and terraces, two-field biome lookup, island shaping,
  scattered placement, and seamless looping.

## Related skills

- `roguelike`, `survival-crafting`: genres that decide what to generate and when.
- `level-design`: authored pacing that generation completes, and key-order gating.
- `godot-tilemap`, `unity-tilemap-2d`: painting the grid; `game-ai`: pathfinding over it.
- `save-systems`: storing the seed and generator version, or the generated result.

## Version notes

Last checked: 2026-11-11.

- Python `random`: only `random()` is guaranteed to repeat across versions for a given seed.
- .NET `System.Random`: the algorithm can change between major versions.
- Godot 4.7 `RandomNumberGenerator`: PCG32 today, documented as an implementation detail;
  `rand_weighted` exists; `FastNoiseLite.frequency` defaults to 0.01.
- The seed sweep and SplitMix64 outputs ran on Python 3.12.
