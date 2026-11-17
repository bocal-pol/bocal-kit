---
name: unity-physics
description: "Unity 6.3 LTS 2D and 3D physics: Rigidbody and Rigidbody2D, forces and linearVelocity, per-layer collision matrix, and raycasts. Auto-invoke when an object falls through the floor, `OnTriggerEnter` never fires, or a ground ray hits the player. Not for engine-agnostic tunneling tuning (`physics-tuning`), tilemap colliders (`unity-tilemap-2d`), or NavMesh (`unity-navmesh`)."
model: claude-sonnet-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unity Physics (3D PhysX and 2D)

Move, collide, and detect objects in Unity 6.3 LTS (6000.3). Unity has two separate physics
engines: 3D (`Rigidbody`, `Collider`, `Physics`) and 2D (`Rigidbody2D`, `Collider2D`,
`Physics2D`). They never interact: a `Rigidbody2D` passes straight through a `BoxCollider`, and
3D callbacks never fire on 2D objects.

> Adapted/translated from the skill `unity-physics` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Giving an object physical movement, responding to collisions or triggers, configuring
  layers, ray or shape casts for ground checks and line of sight, joints, kinematic movers.
- The project's scenes or prefabs contain `Rigidbody`/`Collider` or `Rigidbody2D`/`Collider2D`.

**Not this skill**: cross-engine feel (fixed timestep choice, jitter strategy, tunneling
trade-offs) → `physics-tuning`; Tilemap Collider 2D and composite merging →
`unity-tilemap-2d`; pathfinding agents → `unity-navmesh`; reading the input that drives
movement → `unity-input-system`. If the official Unity skill `fix-3d-physics-collisions` or
`create-2d-physics` is installed with a connected Editor, it can drive the Editor for scene
setup; this skill stays the owner of the API and code.

## Main workflow

1. **Identify which engine the object uses before touching code.** Grep the scene or prefab
   YAML for a `Rigidbody2D:` or `Rigidbody:` document header (and `BoxCollider2D:` vs.
   `BoxCollider:`). Mixing 2D and 3D components on objects that interact is a bug, not a design
   choice.
2. **Read physics settings as text, not through the Inspector.** 3D settings live in
   `ProjectSettings/DynamicsManager.asset` (`m_QueriesHitTriggers`, `m_ContactPairsMode`,
   `m_LayerCollisionMatrix`), 2D settings in `ProjectSettings/Physics2DSettings.asset`
   (`m_QueriesHitTriggers`, `m_QueriesStartInColliders`, `m_SimulationMode`,
   `m_LayerCollisionMatrix`). The matrix is a hex bitfield: read and change it with
   `Physics.GetIgnoreLayerCollision`/`IgnoreLayerCollision` (2D: the `Physics2D` versions)
   rather than editing the hex.
3. **Do physics in `FixedUpdate`.** Read input in `Update`, store the intent, apply forces or
   set `linearVelocity` or call `MovePosition` in `FixedUpdate`. Both engines step after
   `FixedUpdate` by default.
4. **Move bodies through the physics API, not the Transform.** `AddForce`, `linearVelocity`,
   `MovePosition`. Writing `transform.position` on a dynamic body teleports it and skips
   collision resolution.
5. **Choose collision or trigger.** A solid collider blocks and calls `OnCollisionEnter`
   (`OnCollisionEnter2D`); `isTrigger` lets things pass and calls `OnTriggerEnter`
   (`OnTriggerEnter2D`). At least one side needs a rigidbody.
6. **Prune layer pairs** that never need to touch. A runtime call to `IgnoreLayerCollision`
   isn't saved; for a lasting change, ask the user to uncheck the pair in Project Settings >
   Physics (or Physics 2D) > Layer Collision Matrix, or in 3D use the Unity CLI's
   `settings.physics set` command, which asks for confirmation.
7. **Verify** with one of the checks below, then remove any temporary logging.

## Patterns

### 1. Force-based movement in `FixedUpdate` with a speed cap (3D)

```csharp
using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class Mover : MonoBehaviour
{
    [SerializeField] private float accel = 30f, maxSpeed = 8f;
    private Rigidbody _rb;
    private Vector3 _input;   // set from Update / the input system

    private void Awake() => _rb = GetComponent<Rigidbody>();

    private void FixedUpdate()
    {
        _rb.AddForce(_input * accel, ForceMode.Acceleration);     // mass-independent acceleration
        Vector3 flat = new(_rb.linearVelocity.x, 0, _rb.linearVelocity.z);
        if (flat.magnitude > maxSpeed)
        {
            flat = flat.normalized * maxSpeed;
            _rb.linearVelocity = new Vector3(flat.x, _rb.linearVelocity.y, flat.z);
        }
    }
}
```

`ForceMode`: `Force` and `Acceleration` are continuous (mass-scaled or not); `Impulse` and
`VelocityChange` are instantaneous (mass-scaled or not; use them for jumps).

### 2. Ground check that ignores triggers (3D)

```csharp
[SerializeField] private LayerMask groundMask;   // only the Ground layer

private bool IsGrounded() =>
    Physics.Raycast(transform.position, Vector3.down, out RaycastHit _, 1.1f,
                    groundMask, QueryTriggerInteraction.Ignore);
```

### 3. Kinematic platform that carries resting bodies (3D)

```csharp
// Rigidbody isKinematic: MovePosition moves it through the solver, bodies on top follow.
private void FixedUpdate() =>
    _rb.MovePosition(_rb.position + Vector3.right * (2f * Time.fixedDeltaTime));
```

## 2D physics (Rigidbody2D)

Same rules, different types. The pitfalls where a 3D habit bites:

| 3D | 2D equivalent | Difference that bites |
|---|---|---|
| `Rigidbody.isKinematic` | `Rigidbody2D.bodyType` (`Dynamic`, `Kinematic`, `Static`) | `Rigidbody2D.isKinematic` is obsolete; set `bodyType` |
| `OnCollisionEnter(Collision)` | `OnCollisionEnter2D(Collision2D)` | a 3D-named method on a 2D object never runs, no error |
| `OnTriggerEnter(Collider)` | `OnTriggerEnter2D(Collider2D)` | same |
| `Physics.Raycast` → `bool` + `out RaycastHit` | `Physics2D.Raycast` → `RaycastHit2D` | test `if (hit)` or `hit.collider != null` |
| a ray that starts inside a collider misses it | `Physics2D.queriesStartInColliders` is enabled by default | a ground ray cast from the player's center hits the player itself |
| `RaycastNonAlloc` | `Physics2D.Raycast(origin, dir, contactFilter, results, distance)` | the 2D `*NonAlloc` methods are deprecated in Unity 6 |
| `Vector3 angularVelocity` (rad/s) | `float angularVelocity` (deg/s) | unit change |

For a kinematic 2D character, `Rigidbody2D.Slide` moves the body along surfaces with gravity
and slope limits, which avoids writing a custom cast-and-slide loop. Patterns for the ground
check with a `ContactFilter2D`, one-way platforms, and `Slide` are in
`references/physics-2d.md`.

## Verify

Pick the first available path and state which one you used.

- **Unity CLI with a ready Editor** (`unity status --project-path <project>` reports `ready`):
  run `unity recompile --project-path <project>` for compile errors, then read state back
  instead of eyeballing it, for example
  `unity command script eval --code 'return Physics2D.GetIgnoreLayerCollision(LayerMask.NameToLayer("Player"), LayerMask.NameToLayer("Enemy"));'`
  or a body's `bodyType`, `collisionDetectionMode`, and `linearVelocity` after a few seconds of
  Play mode (`unity command editor.playmode start`). Commands change between CLI versions: find
  the current name with `unity command --query <word>` and its options with `--help`.
- **PlayMode test, with or without the CLI:** build the case in code (a floor, a falling body,
  `yield return new WaitForSeconds(1f)`, check that the body rests above the floor or that the
  callback counter equals 1). Run it with `unity test <project> --mode PlayMode`, or without
  the CLI in batch mode: `-batchmode -projectPath <project> -runTests -testPlatform PlayMode
  -testResults <file>` (never `-quit`, the test runner exits on its own). Read the NUnit XML,
  not just the exit code. The test assembly setup is in `unity-csharp-scripting`.
- **Feel or visual only:** ask the user to enter Play mode and report a number (does the crate
  rest at y ≈ 1, how many `OnCollisionEnter` logs per hit).

## Pitfalls

- **`OnCollisionEnter` never fires on a `CharacterController` → cause**: `Move` bypasses the
  rigidbody system and reports through `OnControllerColliderHit`. Adding a Rigidbody fixes
  nothing; these are two separate movement modes.
- **Trigger callbacks never fire → cause**: one of the two colliders needs a rigidbody (2D: a
  `Rigidbody2D`, with `simulated` enabled), and both colliders must be enabled. Two static
  colliders never report.
- **No collision message between two kinematic bodies, or kinematic vs. static → cause**: with
  the default 3D Contact Pairs Mode, Unity only reports when one body is dynamic. Make one body
  dynamic, use a trigger, or change the Contact Pairs Mode. In 2D, enable
  `useFullKinematicContacts` on the kinematic `Rigidbody2D`.
- **A ground or line-of-sight ray stops on a trigger volume → cause**: queries hit triggers by
  default in both engines. Pass `QueryTriggerInteraction.Ignore` (3D) or a `ContactFilter2D`
  with `useTriggers = false` (2D), or disable Queries Hit Triggers.
- **The 2D ground check is always true → cause**: the ray starts inside the player's own
  collider and `queriesStartInColliders` returns it. Exclude the player's layer from the mask,
  or start the ray just below the collider.
- **Obsolescence warnings on `velocity`, `drag`, `angularDrag` → fix**: Unity 6 renamed them
  `linearVelocity`, `linearDamping`, `angularDamping` in both engines (2D also has
  `linearVelocityX`/`Y`). They still compile with warnings; `PhysicMaterial` →
  `PhysicsMaterial` is a hard error.
- **Setting `transform.position` on a dynamic body → consequence**: teleportation and skipped
  collision. If you write the Transform anyway, queries see the old position until the next
  step; call `Physics.SyncTransforms()` (2D: `Physics2D.SyncTransforms()`) once before a
  same-frame query.
- **A resting body stays stuck in the air after its floor moved → cause**: sleeping bodies
  wake on collisions and forces, but a static collider moved by its Transform may not wake
  them. Call `WakeUp()`. A collider that moves every frame should have a kinematic rigidbody
  rather than stay static.
- **Fast objects pass through walls → fix**: raise Collision Detection beyond `Discrete`. In
  3D, `Continuous` only sweeps against static colliders; `Continuous Dynamic` also against
  other continuous dynamic bodies; `Continuous Speculative` against everything and is cheaper.
  2D has `CollisionDetectionMode2D.Continuous`. For projectiles, a cast along the trajectory is
  often preferable.
- **A concave `MeshCollider` on a moving body → cause**: concave mesh colliders can only be
  static or kinematic, and two concave colliders never collide. Enable Convex or build a
  compound collider from primitives, keeping a uniform scale.
- **Part of a compound body drifts away → cause**: a compound collider has a single rigidbody,
  on the root. An extra rigidbody on a child makes it a separate body.
- **Nothing moves, but raycasts still hit → cause**: `Time.timeScale = 0` stops the simulation;
  queries still read collider geometry. In 2D, also check `Physics2D.simulationMode`: in
  `Script`, nothing moves until an explicit call to `Physics2D.Simulate`.

## References

- Read `references/physics-2d.md` for writing 2D movement, ground checks, one-way platforms,
  or kinematic `Slide` controllers.
- Read `references/raycasting-and-joints.md` for 3D cast variants (`SphereCast`, `RaycastAll`,
  `OverlapSphere`, non-allocating buffers), `LayerMask` bit math, or 3D joints.

## Related skills

- `physics-tuning`: cross-engine feel, timestep, mass ratios, stability.
- `unity-csharp-scripting`: the `FixedUpdate`/`Update` split, test assemblies, the `.meta`
  checker.
- `unity-tilemap-2d`: tilemap colliders and composite colliders.
- `unity-navmesh`: agent movement that isn't force-driven.
- `unity-input-system`: reading the input applied here.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1 (latest 6.3 LTS patch).

- The Unity 6 renames (`velocity`/`drag`/`angularDrag` in both 3D and 2D,
  `Rigidbody2D.isKinematic`, the 2D `*NonAlloc` queries, `Physics2D.OverlapCollider` →
  `Overlap`) are obsolescence warnings with an API Updater path in 6.3; `PhysicMaterial` is a
  hard error. Source: Unity C# reference source at tag 6000.3.28f1,
  `Modules/Physics/ScriptBindings/*.deprecated.cs` and
  `Modules/Physics2D/ScriptBindings/Physics2D.deprecated.cs`
  (https://github.com/Unity-Technologies/UnityCsReference/tree/6000.3.28f1).
- Unity 6.3 also ships a separate low-level 2D API, `UnityEngine.LowLevelPhysics2D`
  (`PhysicsWorld`, `PhysicsBody`), with its own worlds; it is not the `Rigidbody2D` system.
  Unity 6.5 renamed it Physics Core 2D, namespace `Unity.U2D.Physics`. Use it only if the
  project already relies on it.
- Unity CLI 1.0.0-beta.17 (2026-11-05) and the `com.unity.pipeline` package 1.0.0-pre.1
  (2026-11-10) are pre-release; command names may change.
  https://docs.unity.com/en-us/unity-cli and
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
- Manual: https://docs.unity.com/en-us/engine/6000.3/manual/unity-editor/editor-settings-reference/comp-manager-group/class-physics2dsettings
  and the `Rigidbody2D`, `Physics2D`, `Rigidbody`, `Physics` Scripting API pages.
