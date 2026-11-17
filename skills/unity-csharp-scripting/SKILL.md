---
name: unity-csharp-scripting
description: "Writes and fixes Unity 6.3 LTS C# gameplay scripts: MonoBehaviour lifecycle, serialization, .meta/GUID discipline, and command-line tests. Auto-invoke for a new script, a .cs rename, a \"Missing script\" error, or a field missing from the Inspector. Not for physics (`unity-physics`), input (`unity-input-system`), data assets (`unity-scriptableobjects`), or builds (`unity-build-pipeline`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Unity C# Scripting (MonoBehaviour)

Write correct gameplay scripts for Unity 6.3 LTS (6000.3), C# 9 on .NET Standard 2.1, keep the
project's `.meta` files intact, and prove the result compiles and behaves without opening the
Editor by hand.

> Adapted/translated from the skill `unity-csharp-scripting` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Writing or fixing a `MonoBehaviour`: lifecycle callbacks, component references, serialized
  fields, coroutines, `async` with `Awaitable`.
- Creating, moving, renaming, or deleting scripts and assets on the file system.
- Compiling or testing a Unity project from a terminal or CI, for any Unity skill.
- The project has `Assets/`, `ProjectSettings/`, and `*.cs` files.

**Not this skill**: rigidbodies and collision response → `unity-physics`; reading player
input → `unity-input-system`; shared data assets and config → `unity-scriptableobjects`;
Animator parameters → `unity-animation`; building players → `unity-build-pipeline`.

## Main workflow

1. **Read the project versions first.** `ProjectSettings/ProjectVersion.txt` gives the Editor
   version; `Packages/manifest.json` the packages; `*.asmdef` files say which assembly a new
   script lands in. Keep the project's version unless explicitly asked to update.
2. **Choose the callback by intent.** `Awake` caches its own components; `OnEnable`/`OnDisable`
   subscribe and unsubscribe; `Start` wires anything depending on another object's `Awake`;
   `FixedUpdate` is for physics; `LateUpdate` follows movement (cameras).
3. **Expose settings with `[SerializeField] private`** so designers can edit them without
   external code touching them. A plain class needs `[System.Serializable]` to appear in the
   Inspector.
4. **Move every file with its `.meta`.** A `.meta` carries the asset's GUID; a new `.meta`
   means a new GUID, and every reference to the old one shows "Missing script." A brand-new
   file doesn't need a `.meta`: Unity writes one on the next import. Keep each `MonoBehaviour`
   or `ScriptableObject` class in a file of the same name.
5. **Run the checker**: `python scripts/check_unity_project.py <project-folder>` (`--json` for
   machine output). Fix every `ERROR` (duplicate or malformed GUID, files moved without their
   `.meta`, missing script references) and rerun until exit code 0.
6. **Compile.** With the Unity CLI and a ready Editor: `unity recompile --project-path
   <project>`; otherwise a batch-mode import and `grep -E "error CS[0-9]{4}"` on its log.
7. **Prove the behavior** with an EditMode or PlayMode test, or by reading a value back from the
   running Editor via `unity command script eval`. Read `references/agent-checks.md` for exact
   commands, the test assembly, and reading results. Report which checks ran and which could
   not.

## Patterns

### 1. Serialized fields that survive refactors

```csharp
using UnityEngine;
using UnityEngine.Serialization;

public class Turret : MonoBehaviour
{
    [SerializeField, Range(0.1f, 5f)] private float fireInterval = 0.5f;

    // Renamed from "range": without this attribute, every scene and prefab loses the value.
    [FormerlySerializedAs("range")]
    [SerializeField] private float maxRange = 12f;

    [System.Serializable]
    public class Stats { public int hp = 100; public int armor = 0; }

    [SerializeField] private Stats stats = new();
}
```

### 2. A coroutine that can be stopped precisely

```csharp
private Coroutine _spawnLoop;

private void OnEnable()  => _spawnLoop = StartCoroutine(SpawnLoop());
private void OnDisable() { if (_spawnLoop != null) StopCoroutine(_spawnLoop); }

private System.Collections.IEnumerator SpawnLoop()
{
    var wait = new WaitForSeconds(1f);   // allocated once, reused
    while (true) { Spawn(); yield return wait; }
}

private void Spawn() { }
```

For `async`/`await` with `Awaitable`, the full execution order, and custom yield instructions,
read `references/lifecycle-and-coroutines.md`.

## Verify

1. `python scripts/check_unity_project.py <project-folder> --json` — exit code 0, no `ERROR`
   line.
2. Compile: `unity recompile --project-path <project>` (or batch import +
   `grep -E "error CS[0-9]{4}"` on the log).
3. Tests: `Unity -batchmode -projectPath <project> -runTests -testPlatform EditMode
   -testResults results.xml` (never `-quit`, the test runner exits on its own); read the NUnit
   XML, not just the exit code.
4. Grep every recently moved/renamed `.cs` file to confirm its `.meta` traveled with it
   (`git status` should show both together).

## Pitfalls

- **`?.` and `??` on a destroyed object → the object still "lives" to the code.** Unity
  overloads `==` so a destroyed object equals `null`, but `?.`, `??`, and `is null` ignore that
  overload and see a live reference. Use `if (target)` or `target == null` for anything deriving
  from `UnityEngine.Object`.
- **Renaming a serialized field erases its saved values → fix**: `[FormerlySerializedAs("old")]`
  (namespace `UnityEngine.Serialization`) at rename time.
- **"Missing script" after a refactor → cause**: the `.meta` stayed in place, got regenerated,
  or the class name no longer matches the file name. The checker detects all three cases.
- **Physics in `Update` → framerate-dependent jitter.** Read input in `Update`, apply it in
  `FixedUpdate`.
- **Unpredictable order between objects → wiring bug.** Every `Awake` finishes before any
  `Start`, but the order between `Awake`s (and between `Start`s) is not guaranteed without a
  Script Execution Order. Do cross-object wiring in `Start`.
- **Coroutines stop when the GameObject is deactivated → fix**: `SetActive(false)` kills them;
  only setting `enabled = false` on the component does not. Restart them in `OnEnable` if
  needed.
- **An `async` method keeps running after its object is destroyed → fix**: pass
  `destroyCancellationToken` to `Awaitable` waits (they then throw
  `OperationCanceledException`), and await each `Awaitable` instance only once: they are
  pooled.
- **Obsolescence warnings on `FindObjectOfType`/`FindObjectsOfType` → fix**: use
  `FindAnyObjectByType` or `FindObjectsByType(FindObjectsSortMode.None)` in 6.3. Starting in 6.4,
  `FindFirstObjectByType` and the `FindObjectsSortMode` overload are also obsolete: use
  `FindAnyObjectByType` and `FindObjectsByType<T>()`. All of them scan the scene; cache the
  result.
- **Repeated `GetComponent` in hot paths → hidden cost.** Cache stable references in `Awake`,
  and profile before treating an occasional lookup as the bottleneck.
- **The first `Update` can run in the same frame as `Start` → ordering bug.** Guard fields that
  other objects set later.

## References

- Read `references/agent-checks.md` before compiling or testing a project from the command
  line: Unity CLI commands, batch-mode commands, test assembly files, log locations, and
  reading NUnit results.
- Read `references/lifecycle-and-coroutines.md` when order matters between callbacks, or for
  coroutine yield instructions, `CustomYieldInstruction`, and the `Awaitable` equivalents of
  coroutine waits.
- `scripts/check_unity_project.py`: run it (step 5); treat it as a black box and use `--help`
  rather than reading the source.

## Related skills

- `unity-physics`: `Rigidbody`, collisions, and movement in `FixedUpdate`.
- `unity-input-system`: reading player input to feed into these scripts.
- `unity-scriptableobjects`: sharing data between scripts without singletons.
- `unity-animation`: driving the Animator from these scripts.
- `unity-build-pipeline`: building the project once the scripts are correct.
- `game-feel`: the feel produced by these scripts (juice, feedback).
- `game-ai`: decision logic layered on top of the `MonoBehaviour`.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1.

- `FindObjectsOfType` is obsolete in 6.3; `FindFirstObjectByType` and
  `FindObjectsByType(FindObjectsSortMode)` become obsolete in 6.4. Source: Unity C# reference
  source, `Runtime/Export/Scripting/UnityEngineObject.bindings.cs` at tags 6000.3.28f1 and
  6000.4.12f1 (https://github.com/Unity-Technologies/UnityCsReference).
- `?.`/`??` quirk: Scripting API page `Object`
  (https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/object).
- Event order: https://docs.unity.com/en-us/engine/6000.3/manual/scripting/managing-update-order/execution-order
- Unity CLI 1.0.0-beta.17 and `com.unity.pipeline` 1.0.0-pre.1 are pre-release. Exit codes:
  https://docs.unity.com/en-us/unity-cli/reference/output-formats. Commands:
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
- Command-line test runner (`-runTests` doesn't support `-quit`):
  https://docs.unity.com/en-us/engine/6000.3/manual/programming-environment/test-framework-introduction/reference-command-line
