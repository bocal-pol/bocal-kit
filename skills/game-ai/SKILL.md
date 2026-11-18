---
name: game-ai
description: "Designs engine-agnostic enemy and NPC AI: choosing FSM, behavior tree, utility, or GOAP, and building perception, steering, and A* pathfinding. Auto-invoke for patrol and chase, \"find a path to the player\", agents stuck in corners, or AI that sees through walls. Not for BT or utility code (`ai-behavior-trees-utility-ai`), Unreal AI (`unreal-behavior-trees`), or Unity NavMesh (`unity-navmesh`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Game AI architecture

Split each agent into layers that pass a small value to the next one: **perceive** (facts on a
Blackboard) → **decide** (an intent like "go to X", "attack Y") → **path** (waypoints) →
**steer** (a velocity) → **animate**. Most "dumb AI" bugs are one layer doing another layer's
job: a state that raycasts, a pathfinder called every frame, steering that ignores the path.

> Adapted and translated from the `game-ai` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Choosing a decision model, or fixing one that turned into a soup of flags.
- Building or debugging an FSM, perception, steering, A* on a grid or graph, or a flow field.
- Diagnosing agents that get stuck, oscillate, react too fast unfairly, or see through walls.

**Not this skill**: BT and utility runtimes go to `ai-behavior-trees-utility-ai`; Unreal's
`BehaviorTree`, EQS, and StateTree go to `unreal-behavior-trees`; Unity's `NavMeshSurface` and
`NavMeshAgent` go to `unity-navmesh`. Movement and collision feel goes to `physics-tuning`.

## Choosing the decision model

| Situation | Default |
|---|---|
| 2-6 states, obvious transitions (door, turret, simple guard) | FSM |
| Several states share exits (stunned, dead, alerted from anywhere) | Hierarchical FSM: a parent state owns the shared exits |
| Many prioritized, interruptible behaviors reused across enemy types | Behavior tree, built with `ai-behavior-trees-utility-ai` |
| Graded trade-offs (which target, heal or attack, needs) | Utility scoring, same skill; usually inside a BT branch |
| Multi-step plans with preconditions designers want to see emerge | GOAP; only if a BT cannot express it, because plans are hard to debug |

Common mix in production: an FSM for the main mode (Idle, Combat, Dead) with a BT inside Combat.
Start with the FSM; promote a state into a BT when its transitions stop fitting on a single
screen.

## Workflow

1. **Read the project first.** Engine, existing AI code, navigation (navmesh, `AStarGrid2D`, a
   tile grid), and how enemies find the player today. Extend what exists.
2. **Write perception once.** One sensor per agent writes `target`, `last_known_pos`, `can_see`,
   `heard_at` to a Blackboard on a timer (5-10 Hz). Decisions read these facts; they never
   raycast.
3. **Choose the model** from the table above and keep transitions inside states (or a table), not
   in scattered `if state == ...` checks.
4. **Path on the coarsest graph that works** (waypoints or a nav grid beat a dense pixel grid),
   cache the path, and follow the next waypoint with steering.
5. **Add anti-stuck and fairness guards** (see Pitfalls) before tuning numbers.
6. **Verify with executable checks**, not just by eye:
   - A* admissibility: over 50 random grids, A*'s path cost equals Dijkstra's (`h = 0`). Any
     difference means a wrong heuristic or step cost.
   - State flicker: log transitions with a timestamp during a scripted run; more than about 2
     transitions per second for one agent means missing hysteresis.
   - Getting stuck: run agents through the level headless and fail if one makes less than 0.5
     units of progress toward its waypoint in 2 s.
   Then watch it with the path, current state, and sight cone drawn on screen.

## Pitfalls

**FSM**
- **The initial state's `enter()` never runs** when the agent assigns `current = Patrol.new()`
  without calling it. Route the first state through the same `change_state()` as every other one.
- **Changing state from `enter()`/`exit()`** re-enters the machine and runs the exits twice.
  Queue the next state and apply it after `update()` returns.
- **Threshold flicker.** Chasing at 10 m and giving up at 10 m makes the agent flip every frame
  at the boundary. Use separate enter and exit thresholds (chase at 10, give up at 14) and a
  minimum time in state of about 0.3-0.5 s.

**Perception**
- **Check cheapest to most expensive:** squared distance, then the sight cone
  (`dot(forward, dir) > cos(half_angle)`), then a raycast. Only survivors pay for the ray; spread
  rays over several frames.
- **A single ray to the target's origin** fails behind low cover (origin at the feet) or passes
  through a waist-high gap. Cast to two or three points (head, torso) and accept any hit.
- **An omniscient AI feels like cheating.** Chase the last known position, then search, rather
  than reading the player's live position after losing sight. Delay the first reaction by about
  0.2-0.5 s, or fill an awareness gauge faster at close range, so players can react.

**Steering**
- **Weighted sums cancel out.** Seek plus avoid pointing in opposite directions sum to zero and
  the agent freezes against the wall. Use priority clamping: apply avoidance first and spend the
  remaining force budget on lower behaviors.
- **Waypoint radius smaller than one movement tick** (`speed * dt`) makes agents overshoot and
  orbit the point. Advance when within `max(radius, speed * dt)`.
- **Per-pair separation** is O(n²); bucket agents into a spatial hash with cells about the
  neighbor radius.
- **Steering and an engine nav agent both moving the body** jitters. Let the agent compute the
  path and feed its desired velocity into steering (Godot: `velocity` and `velocity_computed` on
  `NavigationAgent2D/3D` when avoidance is on; Unity: see `unity-navmesh`).

**Pathfinding**
- **A non-admissible heuristic** returns fast but longer paths: octile assumes diagonal steps
  cost √2; if diagonals cost 1 use Chebyshev; terrain weights under 1 break every grid heuristic.
- **Diagonal corner-cutting** through wall corners: only allow a diagonal when both orthogonal
  neighbors are open. Godot's `AStarGrid2D` defaults to `DIAGONAL_MODE_ALWAYS`, which cuts
  corners; set `DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES` (or `NEVER` for 4-direction with Manhattan).
- **Godot's `AStarGrid2D.update()` clears every solid point and weight.** Call it after setting
  `region`/`cell_size`/`offset`, then mark walls. `jumping_enabled` ignores weight scales.
- **An unreachable goal floods the whole map.** Tag connected regions with a flood fill once and
  reject cross-region queries, or cap node expansions per search.
- **Repathing every frame.** Retrace the path when the target moves more than one cell (or 1-2
  m), or every 0.25-0.5 s, spread out, with a search budget per frame. Many agents toward one
  goal: a flow field (Dijkstra from the goal) rather than a per-agent A*.
- **Stuck forever.** If progress toward the next waypoint stalls for about 2 s, retrace the path;
  after two failed retraces, change state (give up, teleport off-screen, or pick a new goal).

## References

- [`references/pathfinding.md`](references/pathfinding.md): read to write A* or a grid adapter
  by hand, choose a heuristic, or decide between hand-rolled A*, `AStarGrid2D`, and an engine
  navmesh.
- [`references/fsm-perception-steering.md`](references/fsm-perception-steering.md): read to
  implement a hierarchical FSM, a sight/hearing sensor, or priority-clamped steering.

## Related skills

- `ai-behavior-trees-utility-ai`: BT and utility runtimes once the model is chosen.
- `unity-navmesh`, `unreal-behavior-trees`: engine navigation and AI assets.
- `physics-tuning`: agent radius, movement, and collision response.
- `procedural-gen`: the level graph the AI navigates.

## Version notes

Last checked: 2026-11-11.

- Godot 4.7 `AStarGrid2D`: default `diagonal_mode` is `DIAGONAL_MODE_ALWAYS`, `update()` clears
  point data, and `jumping_enabled` disables weight scaling.
- Godot 4.7 `NavigationAgent2D`: `avoidance_enabled`, `velocity`, `velocity_computed`.
