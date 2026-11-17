# Raycasting variants & joints (Unity 6.3 LTS PhysX)

Deep dive for `unity-physics`. All types are in `UnityEngine`. Checked against
`ScriptReference/Physics` and the joint component pages.

## LayerMask bit math

A `LayerMask` is a 32-bit set of layers. Common constructions:

```csharp
int mask = LayerMask.GetMask("Ground", "Enemy");   // by name (recommended)
int onlyGround = 1 << LayerMask.NameToLayer("Ground");  // a single layer by index
int everythingButPlayer = ~(1 << LayerMask.NameToLayer("Player"));  // invert
```

`Physics.Raycast(..., layerMask)` only tests layers whose bit is set. To *ignore* triggers in a
cast, pass `QueryTriggerInteraction.Ignore` as the last argument.

## Cast variants

```csharp
// A single closest hit along a ray.
if (Physics.Raycast(origin, dir, out RaycastHit hit, maxDistance, mask)) { /* hit.point, hit.normal, hit.collider */ }

// Thick ray — good for "can a character-sized body fit through?".
if (Physics.SphereCast(origin, radius, dir, out RaycastHit sHit, maxDistance, mask)) { }

// Every hit along the ray (unordered) — e.g. pierceable targets on a shot.
RaycastHit[] hits = Physics.RaycastAll(origin, dir, maxDistance, mask);

// Non-allocating versions that write into a buffer you own (no GC per call) — prefer in hot paths.
private readonly RaycastHit[] _buffer = new RaycastHit[8];
int count = Physics.RaycastNonAlloc(origin, dir, _buffer, maxDistance, mask);

// Overlap tests (no direction): what's in this volume right now?
Collider[] inRange = Physics.OverlapSphere(center, radius, mask);
```

Tips:
- `RaycastHit.normal` is the surface normal at the contact point — use it to align decals or
  compute a slope angle (`Vector3.Angle(hit.normal, Vector3.up)`).
- Prefer the `NonAlloc` / buffer overloads in per-frame code to avoid garbage.
- A ray that starts *inside* a collider never reports it; start the ray outside it.
  (`Physics.queriesHitBackfaces` is a different setting: it only lets queries hit back-facing
  triangles of mesh colliders.)

## Joints

Joints connect two rigidbodies (or a body to the world if `Connected Body` is empty).

| Joint | Constrains | Typical use |
|---|---|---|
| `FixedJoint` | all 6 DOF (rigidly attaches) | welding parts that can detach |
| `HingeJoint` | rotation around one axis, with motor/limits/spring | doors, wheels, pendulums |
| `SpringJoint` | distance via a spring | elastics, soft tethers |
| `ConfigurableJoint` | any combination of the 6 DOF | custom ragdoll/vehicle constraints |

```csharp
// A motorized hinge (e.g. a powered door).
var hinge = gameObject.AddComponent<HingeJoint>();
hinge.axis = Vector3.up;
hinge.useMotor = true;
hinge.motor = new JointMotor { force = 100f, targetVelocity = 90f /* deg/s */ };
```

### Breakable joints

```csharp
fixedJoint.breakForce  = 500f;     // newtons before the joint lets go
fixedJoint.breakTorque = 500f;
// When it breaks, the engine calls this on the GameObject:
private void OnJointBreak(float breakForce) => Debug.Log($"Joint broke at {breakForce}");
```

## Pitfalls

- Joints are simulated in `FixedUpdate`; setting a joint's properties is possible from
  `Update`, but the effects apply at the next physics step.
- A `ConfigurableJoint`'s locked/limited axes are relative to the joint's initial orientation —
  pose the bodies at rest before adding the joint.
- Very stiff joints combined with high mass ratios are unstable; raise `Default Solver
  Iterations` (Project Settings → Physics) before pushing harder with larger forces.
