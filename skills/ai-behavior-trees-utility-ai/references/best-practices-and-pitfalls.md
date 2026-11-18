# Scaling up and debugging: performance, memory, hybrid AI

How to keep a BT/Utility runtime fast, debuggable, and maintainable at scale (tens to hundreds
of agents), and how to combine the two models well.

## Memory management

- **Build the tree once, at spawn — never per tick.** Node objects, delegates, and
  consideration lists are created at assembly and reused every tick. A tree rebuilt every frame
  is both a GC storm and a correctness bug (it throws away `Running` state).
- **Keep `Tick` allocation-free.** No `new`, no LINQ (`Where`/`Select` allocate iterators), no
  closures capturing locals, no boxing. Pre-allocate working buffers; iterate with an indexed
  `for`.
- **Prefer a field-based blackboard** (or `int`/enum keys) over a `Dictionary<string,object>`
  on hot agents — it removes hashing and value-type boxing. Keep the dictionary shape for
  boards written by designers or serialized.
- **Pool agents and their trees.** Reuse a despawned enemy's tree instance on respawn; call
  `Reset()` rather than reallocating.
- **Share immutable data.** Curves and static config are stateless — one instance serves every
  agent. Only per-agent mutable state (the blackboard, `Running` indices) is unique.

## Performance and profiling

- **Profile before optimizing.** Measure AI time in the engine's profiler (Unity Profiler,
  Godot Monitors, Unreal `stat game`). The usual cost isn't tree traversal — it's what the
  *leaves* do (raycasts, pathfinding, `FindObjectsByType`). Cache perception; pathfind on a
  timer, not per tick.
- **Tick on a decision cadence, not per frame.** 5-15 Hz is imperceptible for most NPCs and
  cuts cost 4-10×. Drive the tree from an accumulator that sums frame `dt` and ticks once it
  passes the decision interval, passing the accumulated time as the tree's `dt`.
- **Time-slice across frames.** Don't tick every agent on the same frame. Spread the load by
  bucketing agents and ticking one bucket per frame, so cost flattens instead of spiking.

```csharp
// Round-robin: only ~1/N of agents think each frame; herd cost is flat, not a spike.
_bucket = (_bucket + 1) % Buckets;
for (int i = _bucket; i < agents.Count; i += Buckets)
    agents[i].Think(dt * Buckets);      // scale dt so per-agent cadence is unchanged
```

- **AI LOD.** Distant or off-screen agents tick more slowly (or freeze). Tie cadence to
  distance-from-camera; a guard at 200 m doesn't need 10 Hz decisions.
- **Utility cost scales with actions × considerations.** Don't score 40 actions × 8
  considerations every tick. Prune obviously irrelevant actions first (a cheap gate
  consideration that bails early at 0), and only rescore when a relevant fact has changed.

## Avoiding deep, fragile trees

- **Keep trees shallow and wide.** Deep nesting is hard to read and forces full re-evaluation.
  Factor repeated subtrees into named builder methods and reuse them.
- **Use conditional aborts / a reactive selector** so a high-priority condition (took damage,
  lost the player) interrupts a lower branch, rather than polling a deep tree for the change.
- **Prefer event-driven perception over polling.** Let sensors push `targetPos` onto the
  blackboard when they fire; the tree reads a cached fact instead of raycasting inside a
  condition every tick.
- **Cache condition results within a tick** if the same expensive check appears in multiple
  places.

## Combining utility AI and behavior trees (hybrid)

The two models answer different questions — use each where it's strong:

| Use a **behavior tree** for… | Use **utility AI** for… |
|---|---|
| Top-level structure and priorities (patrol / engage / flee) | "How much do I want each option right now?" |
| Ordered, interruptible sequences | Target selection, weapon/ability choice, needs |
| Clear, debuggable flow, readable by designers | Smooth trade-offs with many inputs |

Recommended default: **BT outside, utility inside.** The BT decides *engage vs. disengage vs.
patrol*; a `UtilitySelectorNode` inside the engagement branch decides *which target / which
attack*. Keep the utility set small and local to the branch so scoring stays cheap, and give the
current action hysteresis so the sub-choice doesn't flicker.

Avoid the reverse (utility choosing between entire behavior trees) unless there's a real need
for graded top-level behavior — it's harder to debug and easy to make unstable.

## Debugging

- **Draw the decision.** Overlay the active BT path (highlight the current leaf) and, for
  utility, a live bar per action score. Most "dumb AI" bugs are visible instantly: a stuck
  `Running` leaf, an unnormalized consideration pinning an action at 1.0, or a malformed curve.
- **Log transitions, not ticks.** Only print when the chosen action or active branch *changes*;
  per-tick logs bury the signal.
- **Make randomness reproducible.** Seed the `System.Random` used by softmax/weighted random
  per agent so a misbehaving agent can be replayed. Never use a global RNG shared across agents.
- **Check the `Reset()` contract.** A common bug is a `Running` action (`Wait`, `Repeat`, a
  cover reservation) that isn't reset on finish or when its branch is abandoned. If timed
  actions "finish instantly" after re-entry, a missing `Reset()` is the cause.
