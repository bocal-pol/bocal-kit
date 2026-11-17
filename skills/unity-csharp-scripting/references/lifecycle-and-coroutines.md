# MonoBehaviour lifecycle & coroutines (Unity 6.3 LTS)

Deep dive for the `unity-csharp-scripting` skill: the full execution order and coroutine
patterns that don't fit in the main playbook. Checked against the Unity Manual's "Event
function execution order" page and `ScriptReference/MonoBehaviour`.

## Contents

- Execution order
- Coroutine yield instructions
- `Awaitable` (async/await) instead of a coroutine
- Custom yield instruction
- Pitfalls

## Execution order (the parts that matter for gameplay)

Per object, the engine calls these in this order:

| Phase | Callback | Runs | Use for |
|---|---|---|---|
| Load | `Awake` | once, when the object loads — even if the script component is disabled, but not while the GameObject is inactive | caching `GetComponent`, self-setup |
| Activation | `OnEnable` | every time the object/script activates | subscribing to events, re-arming coroutines |
| Init | `Start` | once, before the first `Update`, after every `Awake` | wiring that depends on other objects |
| Physics | `FixedUpdate` | every fixed step (default 0.02s) | rigidbody forces, `MovePosition` |
| Physics | `OnTriggerXXX` / `OnCollisionXXX` | during the physics step | collision/trigger response |
| Frame | `Update` | once per rendered frame | input polling, non-physics logic |
| Frame | `LateUpdate` | once per frame, after all `Update`s | camera follow, IK correction |
| Deactivation | `OnDisable` | every time the object/script deactivates | unsubscribing from events |
| Teardown | `OnDestroy` | once, on destruction | releasing native handles, saving |

Key consequences:

- `FixedUpdate` can run zero, one, or several times per frame depending on framerate. Never read
  raw "per-frame" input there — read it in `Update`, consume it in `FixedUpdate`.
- Every `Awake` call finishes before any `Start`. The order *between* `Awake`s (and between
  `Start`s) is undefined unless a Script Execution Order is set in Project Settings.
- `OnEnable` runs after `Awake` on first activation, then again on every reactivation. Pair every
  `OnEnable` subscription with an `OnDisable` unsubscription to avoid duplicate handlers.

## Coroutine yield instructions

```csharp
yield return null;                          // resumes at the start of the next frame
yield return new WaitForSeconds(2f);        // waits 2s of scaled game time (affected by Time.timeScale)
yield return new WaitForSecondsRealtime(2f);// waits 2s of real time (ignores timeScale; good for pause menus)
yield return new WaitForFixedUpdate();      // resumes after the next physics step
yield return new WaitUntil(() => isReady);  // resumes once the predicate is true
yield return new WaitWhile(() => isLoading);// resumes once the predicate is false
yield return StartCoroutine(OtherRoutine());// runs a nested coroutine to completion first
```

## `Awaitable` (async/await) instead of a coroutine

Unity 6 ships `UnityEngine.Awaitable`, a lightweight, low-allocation awaitable for `async`
methods. Coroutine waits map directly:

| Coroutine | `Awaitable` |
|---|---|
| `yield return null` | `await Awaitable.NextFrameAsync()` |
| `yield return new WaitForSeconds(t)` | `await Awaitable.WaitForSecondsAsync(t)` |
| `yield return new WaitForFixedUpdate()` | `await Awaitable.FixedUpdateAsync()` |
| `yield return new WaitForEndOfFrame()` | `await Awaitable.EndOfFrameAsync()` |
| (no equivalent) | `await Awaitable.BackgroundThreadAsync()` / `MainThreadAsync()` |

```csharp
using System;
using UnityEngine;

public class Blinker : MonoBehaviour
{
    [SerializeField] private Renderer target;

    private async void Start()
    {
        try
        {
            while (true)
            {
                target.enabled = !target.enabled;
                // The token cancels the wait when this component is destroyed.
                await Awaitable.WaitForSecondsAsync(0.5f, destroyCancellationToken);
            }
        }
        catch (OperationCanceledException) { /* destroyed: stop silently */ }
    }
}
```

Rules that differ from coroutines:

- An async method is **not** stopped when its object is disabled or destroyed. Pass
  `destroyCancellationToken` (read it before the object is destroyed) or check the object's
  state after each `await`.
- `Awaitable` instances are pooled: await each one **only once**. To await a result twice, store
  the result, not the `Awaitable`.
- After `BackgroundThreadAsync`, most Unity APIs are off-limits until you
  `await Awaitable.MainThreadAsync()`. Background work doesn't stop when exiting Play mode; use
  `Application.exitCancellationToken` for that.
- Prefer `async Awaitable` over `async void` for methods you call yourself, so callers can await
  them; reserve `async void` for Unity messages like `Start`.

## Custom yield instruction

For a reusable wait condition:

```csharp
public class WaitForAnimationEnd : CustomYieldInstruction
{
    private readonly Animator _a;
    private readonly int _layer;
    public WaitForAnimationEnd(Animator a, int layer = 0) { _a = a; _layer = layer; }
    // keepWaiting == true means "keep yielding"; false resumes the coroutine.
    public override bool keepWaiting => _a.GetCurrentAnimatorStateInfo(_layer).normalizedTime < 1f;
}
```

## Pitfalls

- Coroutines are killed when the GameObject is **deactivated** (`SetActive(false)`) or the
  script is destroyed — but *not* when only the script component is disabled while the object
  stays active. Re-arm them in `OnEnable` if needed.
- Allocating `new WaitForSeconds(x)` on every loop iteration creates garbage; cache the
  instance.
