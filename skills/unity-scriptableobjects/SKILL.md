---
name: unity-scriptableobjects
description: "Unity 6.3 LTS data and decoupling with ScriptableObject: `CreateAssetMenu` config assets, shared runtime variables, event channels, and .asset files created from code. Auto-invoke to replace singletons, data-driven objects/maps, or values that must survive exiting Play mode. Not for saving progress (`save-systems`) or Godot Resources (`godot-resources`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unity ScriptableObject Architecture

Use `ScriptableObject` assets in Unity 6.3 LTS (6000.3) for shared data and to decouple
systems: configuration, event channels, and registries that live as project assets rather than
scene singletons. An SO asset is a YAML file you can read and check without the Editor.

> Adapted/translated from the skill `unity-scriptableobjects` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Designer-editable configuration (weapon stats, level data), a value shared across unrelated
  systems, emitters and listeners that shouldn't reference each other, a live registry of
  active objects without a scene scan.
- The project has `*.asset` files backed by classes `: ScriptableObject`.

**Not this skill**: state that differs per GameObject belongs on a MonoBehaviour, since an SO
asset is shared by everyone referencing it; saving progress → `save-systems`; a simple piece of
data that never needs to be an asset can stay a `[System.Serializable]` class.

## Main workflow

1. **Define the class** deriving from `ScriptableObject`, in a file of the same name, with
   `[CreateAssetMenu]` so designers can create instances.
2. **Create the assets.** Designers use the Assets > Create menu. From code, use an editor
   script (pattern 3) so Unity writes the `.asset` and its `.meta` with a valid GUID. Never
   hand-write an `.asset`: its `m_Script` GUID must match the script's `.meta`.
3. **Reference, don't copy.** MonoBehaviours carry a `[SerializeField]` reference; every
   consumer sees the same data.
4. **Keep mutable runtime state out of serialized fields**
   (`[System.NonSerialized]`) and reset it when Play mode starts (pattern 2), because edits made
   to an asset during Play mode persist in the Editor.
5. **Make sure builds include the asset.** Only assets referenced from a scene in the build,
   from another included asset, from a `Resources` folder, or from Addressables ship in the
   player.
6. **Verify** with the checks below.

## Patterns

### 1. Configuration asset

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "WeaponData", menuName = "Game/Weapon Data")]
public class WeaponData : ScriptableObject
{
    public string displayName = "Pistol";
    public int damage = 10;
    public float fireRate = 0.25f;
    public GameObject projectilePrefab;
}
```

### 2. Shared runtime variable that resets on Play

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "Game/Float Variable")]
public class FloatVariable : ScriptableObject
{
    [SerializeField] private float initialValue;
    [System.NonSerialized] public float runtimeValue;   // never saved in the asset

    private void OnEnable()
    {
        runtimeValue = initialValue;
#if UNITY_EDITOR
        // With Reload Domain disabled, OnEnable doesn't run again on Play; reset here too.
        UnityEditor.EditorApplication.playModeStateChanged -= ResetOnPlay;
        UnityEditor.EditorApplication.playModeStateChanged += ResetOnPlay;
#endif
    }

#if UNITY_EDITOR
    private void OnDisable() => UnityEditor.EditorApplication.playModeStateChanged -= ResetOnPlay;

    private void ResetOnPlay(UnityEditor.PlayModeStateChange change)
    {
        if (change == UnityEditor.PlayModeStateChange.ExitingEditMode) runtimeValue = initialValue;
    }
#endif
}
```

### 3. Creating assets from editor code

Put this in an `Editor` folder. Run it from the menu, from the Unity CLI with
`unity command script eval --code 'WeaponAssets.CreateDefaults();'`, or in batch mode with
`-executeMethod WeaponAssets.CreateDefaults`.

```csharp
using UnityEditor;
using UnityEngine;

public static class WeaponAssets
{
    [MenuItem("Tools/Create Default Weapons")]
    public static void CreateDefaults()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Data"))
            AssetDatabase.CreateFolder("Assets", "Data");

        var pistol = ScriptableObject.CreateInstance<WeaponData>();
        pistol.displayName = "Pistol";
        pistol.damage = 10;
        AssetDatabase.CreateAsset(pistol, "Assets/Data/Pistol.asset");   // writes .asset and .meta
        AssetDatabase.SaveAssets();
    }
}
```

To modify an existing asset from editor code, load it with
`AssetDatabase.LoadAssetAtPath<WeaponData>(path)`, set the fields, call
`EditorUtility.SetDirty(asset)` then `AssetDatabase.SaveAssets()`; without `SetDirty`, the
change is lost on the next reload.

## Verify

1. **Without an Editor:** an SO asset is YAML. Each `.asset` has a `MonoBehaviour:` document
   with `m_Script: {fileID: 11500000, guid: ..., type: 3}`, `m_Name`, and one line per
   serialized field (`damage: 10`). Grep the values, and run `unity-csharp-scripting`'s
   `check_unity_project.py` to confirm every `m_Script` GUID resolves to a script.
2. **Unity CLI with a ready Editor:** read the loaded value back:
   `unity command script eval --code 'return AssetDatabase.LoadAssetAtPath<WeaponData>("Assets/Data/Pistol.asset").damage;'`
3. **Tests:** an EditMode test can load the asset with `AssetDatabase.LoadAssetAtPath` and
   check its values, or exercise an event channel with `ScriptableObject.CreateInstance`
   (setup in `unity-csharp-scripting`).
4. **Play mode reset:** ask the user to enter and exit Play mode twice and report whether the
   values shown on the asset in the Inspector changed.

## Pitfalls

- **Values changed after exiting Play mode → cause**: edits made to an SO asset during Play
  mode persist in the Editor (not across builds). Keep mutable state in `[NonSerialized]`
  fields and reset it.
- **Resetting in `OnEnable` stopped working → cause**: with Enter Play Mode Options enabled
  and Reload Domain disabled, loaded SOs aren't recreated on Play, so `OnEnable` doesn't run.
  Also reset on `EditorApplication.playModeStateChanged` (pattern 2) or from a static method
  tagged `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`.
- **Renaming a field erases data in every asset → fix**: add
  `[UnityEngine.Serialization.FormerlySerializedAs("oldName")]` at rename time.
- **"The associated script can not be loaded" on an asset → cause**: the class name differs
  from the file name, the script has a compile error, or the script's `.meta` GUID changed.
- **Expecting per-object state → pitfall**: two enemies referencing one SO share its values.
  Keep current HP on the MonoBehaviour.
- **Missing from a build, present in the Editor → cause**: nothing in the build references the
  asset, so it was stripped. Reference it from a scene or a referenced asset, or load it via
  `Resources` or Addressables.
- **No `Update` → fix**: SOs have `OnEnable`, `OnDisable`, `OnDestroy`, and `OnValidate`, no
  frame callbacks.
- **`CreateInstance` leak → fix**: instances created at runtime are Unity objects; `Destroy`
  them once done.

## References

- Read `references/event-channels.md` to add an event channel (a `GameEvent` SO with
  listeners, typed payloads) or a runtime set that replaces `FindObjectsByType` scans.

## Related skills

- `unity-csharp-scripting`: the MonoBehaviours that use these assets, the tests, and the
  `.meta` checker.
- `save-systems`: writing progress to disk.
- `unity-build-pipeline`: making sure the asset actually ships in the build.
- `create-game-assets`: the visual data (sprites, textures) these configs reference.
- `game-ai`: data-driven config for NPC behavior.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1.

- Manual: "ScriptableObject" and "Enter Play mode with domain reload disabled"
  (https://docs.unity.com/en-us/engine/6000.3/manual), Scripting API `ScriptableObject`,
  `CreateAssetMenuAttribute`, `AssetDatabase.CreateAsset`, `EditorUtility.SetDirty`,
  `Serialization.FormerlySerializedAsAttribute`.
- `script eval` is a `com.unity.pipeline` 1.0.0-pre.1 command (pre-release):
  https://docs.unity3d.com/Packages/com.unity.pipeline@1.0/manual/index.html
