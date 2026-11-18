---
name: unity-animation
description: "Animates Unity 6.3 LTS characters with the Animator (Mecanim): states and transitions, blend trees, Avatar Mask layers, root motion, and humanoid IK. Auto-invoke to wire a `SetTrigger`, a transition that lags or never fires, root motion that slides, or an upper-body layer overriding the legs. Not for AI state machines (`game-ai`), juice (`game-feel`), or Godot (`godot-animation`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unity Animation (Animator / Mecanim)

Control animation state with the `Animator` and Animator Controllers in Unity 6.3 LTS
(6000.3): parameters, transitions, blend trees, layers, and humanoid IK. A `.controller` file
is plain-text YAML, so you can read its parameters and states without the Editor, and build one
from code instead of the Animator window.

> Adapted/translated from the skill `unity-animation` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Wiring clips into a state machine, driving it from a script, blending locomotion (idle,
  walk, run), layering an upper-body action over movement, foot or hand IK.
- The project has `*.controller` and `*.anim` assets, or a rigged model with an Avatar.

**Not this skill**: simple value tweens (UI fades, position lerps) → a coroutine in
`unity-csharp-scripting`; deciding when an NPC should attack or flee → `game-ai`; Timeline
cutscenes have no dedicated skill here. Frame-by-frame 2D sprite animation uses the same
Animator with sprite keyframes.

## Main workflow

1. **Read the controller before writing code.** In the `.controller` YAML,
   `m_AnimatorParameters` lists each parameter's `m_Name` and `m_Type` (1 Float, 3 Int, 4 Bool,
   9 Trigger), and each `AnimatorState` document has its own `m_Name`. Script strings must
   match exactly.
2. **Set up the rig.** Humanoid IK and retargeting need a model imported as Humanoid
   (`animationType: 3` in the model's `.meta`); ask before changing a model's rig, since it
   rebuilds the Avatar.
3. **Drive locomotion with parameters** (`SetFloat`, `SetBool`, `SetInteger`, `SetTrigger`) via
   cached `Animator.StringToHash` ids, and let transitions resolve. Only use
   `CrossFadeInFixedTime` for deliberate scripted cuts like hit reactions.
4. **Blend continuous movement with a blend tree** driven by a single `Float` (or two for 2D
   directional) rather than many states and transitions.
5. **Layer upper-body actions** with an Avatar Mask and `SetLayerWeight`.
6. **Create or edit controllers from code** when the Editor UI isn't available (pattern 3),
   then read the YAML back to confirm.
7. **Verify** with the checks below.

## Patterns

### 1. Parameters from script with cached hashes

```csharp
using UnityEngine;

[RequireComponent(typeof(Animator))]
public class CharacterAnim : MonoBehaviour
{
    private static readonly int Speed = Animator.StringToHash("Speed");
    private static readonly int IsGrounded = Animator.StringToHash("IsGrounded");
    private static readonly int Jump = Animator.StringToHash("Jump");
    private Animator _anim;

    private void Awake() => _anim = GetComponent<Animator>();

    public void Tick(float planarSpeed, bool grounded)
    {
        _anim.SetFloat(Speed, planarSpeed, 0.1f, Time.deltaTime);  // damped: no abrupt jump
        _anim.SetBool(IsGrounded, grounded);
    }

    public void DoJump() => _anim.SetTrigger(Jump);   // consumed by the next matching transition
}
```

### 2. Waiting for the state you just triggered

```csharp
private System.Collections.IEnumerator AfterAttack()
{
    yield return null;   // let the Animator start the transition
    // During a transition, the "current" state is the one being left; read the next one.
    AnimatorStateInfo info = _anim.IsInTransition(0)
        ? _anim.GetNextAnimatorStateInfo(0)
        : _anim.GetCurrentAnimatorStateInfo(0);
    yield return new WaitForSeconds(info.length);   // approximate inside blend trees
}
```

### 3. Building a controller from editor code

Put this in an `Editor` folder. Run it from a menu, from the Unity CLI with
`unity command script eval --code 'BuildLocomotionController.Build();'`, or in batch mode with
`-executeMethod BuildLocomotionController.Build`.

```csharp
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

public static class BuildLocomotionController
{
    [MenuItem("Tools/Build Locomotion Controller")]
    public static void Build()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Animation"))
            AssetDatabase.CreateFolder("Assets", "Animation");

        var controller = AnimatorController.CreateAnimatorControllerAtPath("Assets/Animation/Player.controller");
        controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
        controller.AddParameter("Jump", AnimatorControllerParameterType.Trigger);

        AnimatorStateMachine sm = controller.layers[0].stateMachine;
        AnimatorState locomotion = sm.AddState("Locomotion");   // assign a clip or blend tree as motion
        AnimatorState jump = sm.AddState("Jump");
        sm.defaultState = locomotion;

        AnimatorStateTransition toJump = locomotion.AddTransition(jump);
        toJump.hasExitTime = false;   // react to the trigger immediately
        toJump.duration = 0.1f;
        toJump.AddCondition(AnimatorConditionMode.If, 0f, "Jump");

        AnimatorStateTransition back = jump.AddTransition(locomotion);
        back.hasExitTime = true;      // return once the jump clip is nearly finished
        back.exitTime = 0.9f;

        AssetDatabase.SaveAssets();
    }
}
```

## Verify

- **Without an Editor:** grep the `.controller` for `m_AnimatorParameters` and state names, and
  compare them against every string or `StringToHash` argument in the scripts. A typo does
  nothing at runtime, so this check catches the most common bug for free.
- **Unity CLI with a ready Editor:** `unity command animation.animator get_controller` reads a
  controller's full structure (find its options with `--help`). In Play mode, read live state:
  `unity command script eval --code 'var a = GameObject.Find("Player").GetComponent<Animator>(); return a.GetCurrentAnimatorStateInfo(0).IsName("Locomotion") + " speed=" + a.GetFloat("Speed");'`
- **Without the CLI:** a PlayMode test can instantiate the character prefab, set a parameter,
  wait a few frames, and check `GetCurrentAnimatorStateInfo(0).IsName(...)`; see
  `unity-csharp-scripting` for the test setup.
- **Visual quality** (foot sliding, pops): ask the user to watch the Animator window in Play
  mode and report which transition fired and whether the feet slide.

## Pitfalls

- **A trigger fires late or "sticks" → cause**: a trigger stays armed until a transition
  consumes it. If none can right now, it fires later at a surprising moment. `ResetTrigger`
  once the moment has passed, or use a `Bool` for sustained states.
- **Misspelled parameter names do nothing → fix**: no exception is thrown. Cache hashes and
  compare against the controller YAML (Verify section).
- **A transition feels slow → cause**: `Has Exit Time` waits for the clip to reach its exit
  time. Disable it for condition-driven transitions (jump, hit).
- **The character slides or doesn't move → cause**: `Apply Root Motion` is enabled while code
  also moves the Transform, or vice versa. Choose root motion or scripted per-character
  movement.
- **An upper-body layer overrides the whole body → fix**: assign an Avatar Mask, choose
  Override or Additive, and set the layer's weight.
- **`CrossFade` takes much longer than expected → cause**: its duration is normalized to the
  state's length. `CrossFadeInFixedTime` takes seconds.
- **IK does nothing → cause**: IK only applies inside `OnAnimatorIK`, needs IK Pass enabled on
  the layer, and a Humanoid Avatar.
- **A reactivated character restarts its animation → cause**: deactivating the GameObject
  resets its Animator; on reactivation it restarts in the default state with default
  parameters. Set `animator.keepAnimatorStateOnDisable = true` when that's not wanted, or reset
  parameters yourself when the object leaves a pool.

## References

- Read `references/blend-trees-and-ik.md` to set up 1D or 2D blend trees, layers with Avatar
  Masks, humanoid IK (`OnAnimatorIK`, look-at, foot IK), or additive reference poses.

## Related skills

- `unity-csharp-scripting`: the MonoBehaviour and coroutine timing used above, and tests.
- `unity-physics`: moving the body the animation displays.
- `game-ai`: deciding when to play which state.
- `game-feel`: making an animation punchy once it's wired up.
- `unity-navmesh`: driving locomotion from a pathfinding agent.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1.

- The `AnimatorControllerParameterType` values (Float 1, Int 3, Bool 4, Trigger 9) and the
  editor API in pattern 3 (`CreateAnimatorControllerAtPath`, `AddParameter`, `AddState`,
  `AddTransition`, `AddCondition`, `hasExitTime`, `exitTime`, `duration`), the model `.meta`'s
  `animationType` value (Humanoid is 3), and `Animator.keepAnimatorStateOnDisable` were checked
  against the Unity C# reference source at tag 6000.3.28f1
  (`Modules/Animation/ScriptBindings/`, `Editor/Mono/Animation/`,
  `Editor/Mono/StateMachine.bindings.cs`).
- `animation.animator get_controller` is a `com.unity.pipeline` 1.0.0-pre.1 command
  (pre-release): https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
- Manual: https://docs.unity.com/en-us/engine/6000.3/manual and the `Animator` Scripting API.
