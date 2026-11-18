---
name: unity-navmesh
description: "Unity 6.3 LTS pathfinding with the AI Navigation package: `NavMeshSurface` baking, `NavMeshAgent`, `NavMeshLink` jumps, and runtime rebakes. Auto-invoke when a Unity enemy needs to chase or patrol, an agent doesn't move or teleports, a path is partial, or the Bake tab is missing. Not for deciding when NPCs move (`game-ai`, `ai-behavior-trees-utility-ai`) nor force-driven movement (`unity-physics`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unity NavMesh (AI Navigation)

Give NPCs pathfinding in Unity 6.3 LTS (6000.3) with the AI Navigation 2.0 package: bake
walkable surfaces, move agents around obstacles, and prove the mesh and paths exist by reading
them back.

> **Version pitfall:** the old built-in Navigation window (Object and Bake tabs, the
> "Navigation Static" flag) is gone. Baking is component-based: a `NavMeshSurface`
> (`Unity.AI.Navigation`, package `com.unity.ai.navigation`) carries the bake settings and the
> baked data. **Window > AI > Navigation** from the package now only edits agent types and
> areas. The runtime API (`NavMeshAgent`, `NavMesh`, `NavMeshObstacle`) stays in
> `UnityEngine.AI`.

> Adapted/translated from the skill `unity-navmesh` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- An agent needs to walk, chase, or patrol toward a target; a level needs a baked surface;
  doors or crates must block paths at runtime; you need to know if a target is reachable.
- The project has `com.unity.ai.navigation`, a `NavMeshSurface`, or scripts using
  `UnityEngine.AI`.

**Not this skill**: the decision of when and where to move → `game-ai` or
`ai-behavior-trees-utility-ai`; force-driven or kinematic movement that isn't pathfinding →
`unity-physics`. If the official Unity skill `initialize-ai-navigation` is installed with a
connected Editor, it can add and bake components; this skill stays the owner of agent code and
checks.

## Main workflow

1. **Check the package.** Look for `com.unity.ai.navigation` in
   `Packages/packages-lock.json`, not just `manifest.json`: a package the Editor hasn't
   resolved yet produces the same "type not found" errors as one never added. If missing, ask
   before adding it to `manifest.json`.
2. **Inventory before adding anything.** Grep scenes for `NavMeshSurface`, `NavMeshAgent`,
   `NavMeshObstacle`, `NavMeshLink`, and the deprecated `OffMeshLink`. Agent types (radius,
   height, step, slope) and area names live in `ProjectSettings/NavMeshAreas.asset`
   (`m_Settings`, `areas`).
3. **Bake the surface.** Choose a path:
   - Unity CLI with a ready Editor: `unity command navmesh bake_surfaces` (the plain
     `navmesh bake` command is the old built-in bake, not the `NavMeshSurface` one).
   - Procedural or streamed levels: call `surface.BuildNavMesh()` once the geometry is in place
     (pattern 3). Nothing is saved to disk.
   - Otherwise ask the user to select the GameObject with the `NavMeshSurface` and press
     **Bake**, then confirm from the file (step 6).
   Rebake on every change to geometry, `NavMeshModifier`, or agent settings.
4. **Add a `NavMeshAgent`** whose agent type matches the baked type, spawned on the mesh. Drive
   it with `SetDestination`; detect arrival with `pathPending` and `remainingDistance`.
5. **Block paths at runtime** with a `NavMeshObstacle` and `carving = true` rather than a
   rebake. Connect separate islands (ledges, gaps) with a `NavMeshLink`.
6. **Verify** with the checks below.

## Patterns

### 1. Chase with a re-path timer

```csharp
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class Chaser : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private float repathInterval = 0.2f;
    private NavMeshAgent _agent;
    private float _nextRepath;

    private void Awake() => _agent = GetComponent<NavMeshAgent>();

    private void Update()
    {
        if (!target || Time.time < _nextRepath) return;
        _nextRepath = Time.time + repathInterval;
        _agent.SetDestination(target.position);
    }

    // pathPending guards the frames before the first path exists.
    public bool HasArrived() =>
        !_agent.pathPending && _agent.remainingDistance <= _agent.stoppingDistance;
}
```

### 2. Checking reachability before committing

```csharp
public static bool CanReach(NavMeshAgent agent, Vector3 destination)
{
    var path = new NavMeshPath();
    agent.CalculatePath(destination, path);
    return path.status == NavMeshPathStatus.PathComplete;   // Partial = a different island
}
```

### 3. Baking at runtime and linking a gap

```csharp
using Unity.AI.Navigation;
using UnityEngine;

public class LevelNav : MonoBehaviour
{
    [SerializeField] private NavMeshSurface surface;

    // Call this after spawning the level geometry.
    public void Rebuild() => surface.BuildNavMesh();

    // One-way drop from a ledge down to the ground below.
    public NavMeshLink AddDrop(Vector3 ledge, Vector3 landing)
    {
        var link = gameObject.AddComponent<NavMeshLink>();
        // Points are local to this GameObject; the link ignores its scale.
        Quaternion toLocal = Quaternion.Inverse(transform.rotation);
        link.startPoint = toLocal * (ledge - transform.position);
        link.endPoint = toLocal * (landing - transform.position);
        link.width = 1f;
        link.bidirectional = false;
        return link;
    }
}
```

## Verify

State which path you used.

1. **Unity CLI with a ready Editor:** after baking, read the mesh and an actual path back:

   ```bash
   unity command script eval --code 'var t = UnityEngine.AI.NavMesh.CalculateTriangulation(); return "triangles=" + t.indices.Length / 3;'
   unity command script eval --code 'var p = new UnityEngine.AI.NavMeshPath(); UnityEngine.AI.NavMesh.CalculatePath(GameObject.Find("Enemy").transform.position, GameObject.Find("Player").transform.position, UnityEngine.AI.NavMesh.AllAreas, p); return p.status.ToString();'
   ```

   Zero triangles means nothing is baked or loaded. In Play mode, also read `agent.isOnNavMesh`
   and `agent.pathStatus` for each agent. Find current command names with
   `unity command --query navmesh`.
2. **Without the CLI:** a baked surface stores a reference in the scene file. Grep the
   `.unity` file for the surface's `m_NavMeshData:` line; `{fileID: 0}` means never baked or
   cleared, and a `guid:` means baked data exists (check that asset is present). Then write a
   PlayMode test that loads the scene, calls `NavMesh.CalculatePath` between two known points,
   and checks `PathComplete`; run it as described in `unity-csharp-scripting`.
3. **Behavior that can't be checked automatically:** ask the user to press Play and report
   whether each agent reaches its target, and roughly how long it took.

## Pitfalls

- **Looking for the Bake tab or Navigation Static → cause**: removed with AI Navigation 2.0.
  Bake from a `NavMeshSurface`.
- **The agent doesn't move or teleports to the origin → cause**: it isn't on the baked mesh,
  or no surface is baked or enabled (only enabled surfaces on active GameObjects load their
  data). Snap the spawn with `NavMesh.SamplePosition` and move it with `agent.Warp`, not the
  Transform.
- **`PathPartial` → cause**: the target is on a different island. Add a `NavMeshLink` or
  extend the geometry so a single surface covers both; a partial path only reaches the nearest
  edge.
- **Agents ignore new geometry → cause**: the mesh is baked data. Runtime objects need a
  carving `NavMeshObstacle` or a `BuildNavMesh()` call.
- **An NPC with a Rigidbody shakes or drifts → cause**: the agent and a non-kinematic
  `Rigidbody` both move the Transform. Make the body kinematic while the agent has control.
- **An agent with a `NavMeshObstacle` on the same GameObject spins or slides → cause**: it's
  avoiding itself. Only enable one of the two at a time, e.g. disable the agent and enable the
  obstacle when the NPC stops for good.
- **The agent's size doesn't match the baked agent type → consequence**: it gets stuck in
  gaps or floats. Keep the agent's type, radius, and height consistent with the surface's
  agent type.
- **`OffMeshLink` in old scenes → cause**: deprecated in AI Navigation 2.0 and removed from
  the Add Component menu. Replace it with `NavMeshLink`, which adds Transform endpoints and an
  `activated` flag.
- **`SetDestination` every frame for many agents → hidden cost.** Wasted path queries; re-path
  on a timer (pattern 1) or when the target has moved past a threshold.
- **Agents jitter against each other → fix**: tune `avoidancePriority` and avoidance quality,
  or use an obstacle for blockers that never move.

## References

- AI Navigation manual: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/index.html
  (read the `NavMeshSurface`, `NavMeshLink`, and "Use NavMesh Agent with other components"
  pages to change bake settings or mix agents with physics).

## Related skills

- `game-ai`: engine-agnostic decisions (FSM, steering, perception) that drive this movement.
- `unity-csharp-scripting`: the MonoBehaviour around the agent, test assemblies, and the
  `.meta` checker.
- `unity-physics`: the distinction between force-driven and agent-driven movement.
- `unity-animation`: driving locomotion from the agent's speed.

## Version notes

Last checked: 2026-11-17.

- AI Navigation 2.0.16 (released 2026-10-07) is the latest 2.0 package for Unity 6000.0 and
  later, per the Unity package registry
  (https://packages.unity.com/com.unity.ai.navigation).
  `NavMeshSurface.m_NavMeshData`, `NavMeshLink`'s properties, and `BuildNavMesh` were checked
  against the 2.0.16 package source.
- `OffMeshLink` deprecation: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/whats-new.html
- `navmesh bake_surfaces` is a `com.unity.pipeline` 1.0.0-pre.1 command (pre-release):
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
- Runtime API checked against the Unity C# reference source at tag 6000.3.28f1, `Modules/AI/`
  (`NavMesh.CalculateTriangulation`, `CalculatePath`, `SamplePosition`,
  `NavMeshAgent.isOnNavMesh`).
