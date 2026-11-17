# Blend trees, layers, and humanoid IK (Unity 6.3 LTS)

Deep dive for `unity-animation`. Checked against the Unity Manual's Animation section and
`ScriptReference/Animator`.

## Blend trees

A Blend Tree blends several clips by one or two `Float` parameters, so continuous movement
(idle → walk → run, or 8-directional movement) becomes a single node instead of many states.

- **1D** — one parameter (e.g. `Speed`). Place clips along the axis (0 idle, 2 walk, 6 run);
  the tree cross-fades based on the parameter's position.
- **2D Simple Directional** — clips at distinct directions (forward, back, strafe).
- **2D Freeform Directional / Cartesian** — arbitrary clip placement in a 2D field (`MoveX`,
  `MoveY`); Freeform Cartesian suits non-directional pairs (speed × rotation).

Drive it from script exactly like any float parameter, ideally damped:

```csharp
_anim.SetFloat("Speed", speed, 0.1f, Time.deltaTime);   // dampTime smooths the blend
_anim.SetFloat("MoveX", moveX);
_anim.SetFloat("MoveY", moveY);
```

Tip: keep blend thresholds aligned with the clips' actual root velocity so feet don't slide.

## Animation layers + Avatar Masks

Layers let you play an upper-body action (aiming, throwing) on top of a base locomotion layer.

- Each layer has a **weight** (0–1) and a **blend mode**: `Override` (replaces) or `Additive`
  (adds on top of the base pose).
- An **Avatar Mask** restricts a layer to selected bones (e.g. spine + arms), so the legs keep
  walking while the arms aim.

```csharp
int aimLayer = _anim.GetLayerIndex("UpperBody");
_anim.SetLayerWeight(aimLayer, isAiming ? 1f : 0f);   // fades the layer in/out
```

## Humanoid IK (`OnAnimatorIK`)

IK adjusts hands/feet/look *after* the animation pose is sampled. Prerequisites: Humanoid
Avatar, and **IK Pass** enabled on the layer.

```csharp
[SerializeField] private Transform lookTarget, rightHandTarget;

// Called by the Animator once per frame, per layer, when IK Pass is active.
private void OnAnimatorIK(int layerIndex)
{
    if (lookTarget)
    {
        _anim.SetLookAtWeight(1f);                 // overall look weight
        _anim.SetLookAtPosition(lookTarget.position);
    }
    if (rightHandTarget)
    {
        _anim.SetIKPositionWeight(AvatarIKGoal.RightHand, 1f);   // 0..1 blend toward the target
        _anim.SetIKRotationWeight(AvatarIKGoal.RightHand, 1f);
        _anim.SetIKPosition(AvatarIKGoal.RightHand, rightHandTarget.position);
        _anim.SetIKRotation(AvatarIKGoal.RightHand, rightHandTarget.rotation);
    }
}
```

`AvatarIKGoal` values: `LeftFoot`, `RightFoot`, `LeftHand`, `RightHand`. Ease the weight back to
0 to release IK smoothly.

### Foot IK for sloped ground

- Enable **Foot IK** on the locomotion states.
- Cast a ray down from each foot, then `SetIKPosition`/`SetIKRotation` toward the surface point
  and normal so feet land on slopes instead of clipping through or floating.

## Pitfalls

- IK calls outside `OnAnimatorIK` are ignored.
- `SetLookAtWeight` has extra body/head/eyes/clamp parameters — the single-argument overload is
  a shortcut for the common case.
- Layer and IK weights don't reset automatically; ease them toward 0 when disengaging, or the
  pose stays stuck.
- An additive layer adds each clip's difference from its reference pose, which is the clip's
  first frame unless **Additive Reference Pose** is enabled in the clip's import settings. If
  that frame isn't a neutral pose, the whole layer comes out skewed; pick a neutral frame.
