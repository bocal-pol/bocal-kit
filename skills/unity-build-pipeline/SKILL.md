---
name: unity-build-pipeline
description: "Configures and ships Unity 6.3 LTS player builds: Build Profiles, IL2CPP vs. Mono, managed stripping with link.xml, scripted BuildPlayer, Addressables, and CI/headless builds. Auto-invoke to automate a Unity build or a `MissingMethodException` that only appears in the player. Not for an oversized build (`unity-build-size`) nor uploading to a store (`steam-publish`, `itch-publish`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unity Build Pipeline

Configure, script, and automate Unity 6.3 LTS player builds: scenes, platform target,
scripting backend, stripping, and headless/CI builds. Targets **Unity 6.3 LTS (6000.3)**.

> Adapted/translated from the skill `unity-build-pipeline` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Configuring Build Settings/Profiles, picking a platform and scripting backend (Mono vs.
  IL2CPP), shrinking build size with managed stripping, scripting a reproducible build with
  `BuildPipeline.BuildPlayer`, or wiring a CI/headless build.
- The project has `ProjectSettings/EditorBuildSettings.asset` or a CI build script.

**Not this skill**: writing an end-to-end CI service configuration is DevOps territory; this
skill covers the API and settings on the Unity side. Console/platform certification specifics
are under NDA. Submitting to a storefront → `steam-publish` / `itch-publish`. An oversized
build, APK, or Web build (assets, compression, per-platform size settings) →
`unity-build-size`, which hands stripping work back here.

## Main workflow

1. **List the scenes to build** (File → Build Profiles → Scene List, or
   `EditorBuildSettings.scenes`). Only listed and enabled scenes ship; scene 0 is the startup
   scene. A Build Profile asset can carry its own Scene List (Add Settings → Scene List); when
   it does, that profile builds its own list, not the global one.
2. **Pick the platform target** and switch the active build target if needed
   (`BuildTarget` / `EditorUserBuildSettings`). In batch mode, pass `-buildTarget <name>` on
   the command line instead: `SwitchActiveBuildTarget` isn't available there.
3. **Pick the scripting backend** (Player Settings): **Mono** (fast iteration, desktop) vs.
   **IL2CPP** (AOT C++; required for many platforms, better performance, harder to reverse
   engineer). IL2CPP needs the platform's C++ toolchain installed. (Forward-looking note: Unity
   is developing a **CoreCLR** backend, a modern .NET runtime successor to Mono, but in the
   Unity 6.7 beta it remains *experimental*, desktop-only, and documented as not production
   ready — for 6.3 LTS the choice stays Mono vs. IL2CPP.)
4. **Tune size/perf:** set the Managed Stripping Level (Disabled → Minimal → Low → Medium →
   High) and protect reflection-only code with a `link.xml`. Set per-platform Quality
   Settings.
5. **Script the build** with `BuildPipeline.BuildPlayer(BuildPlayerOptions)` and **inspect the
   returned `BuildReport`** — any result other than `Succeeded` should fail the pipeline.
6. **Run headless** for CI with `-batchmode -quit -executeMethod`, and check the exit code.
7. **Verify** that the result actually runs (launch the player), not just that the build
   returned without throwing.

## Patterns

### 1. Scripted build with result verification

```csharp
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildScript
{
    [MenuItem("Build/Windows x64")]
    public static void BuildWindows()
    {
        var options = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Main.unity", "Assets/Scenes/Level1.unity" },
            locationPathName = "Builds/Windows/Game.exe",
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None,            // add BuildOptions.Development for a dev build
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;

        if (summary.result != BuildResult.Succeeded)
            throw new System.Exception($"Build failed: {summary.totalErrors} errors");
        Debug.Log($"Build OK: {summary.totalSize} bytes in {summary.totalTime}");
    }
}
```

### 2. Headless / CI invocation

```bash
# Exit code 0 on success; -quit closes the editor; -nographics for build servers.
# -buildTarget starts the Editor on that platform, so scripts compile with its defines.
Unity -batchmode -quit -nographics \
  -projectPath "/path/to/Project" \
  -buildTarget win64 \
  -executeMethod BuildScript.BuildWindows \
  -logFile -
```

### 3. Building a saved Build Profile

```csharp
using UnityEditor;
using UnityEditor.Build.Profile;
using UnityEditor.Build.Reporting;

public static class ProfileBuild
{
    [MenuItem("Build/Windows Release Profile")]
    public static void Build()
    {
        var profile = AssetDatabase.LoadAssetAtPath<BuildProfile>(
            "Assets/Settings/Build Profiles/WindowsRelease.asset");
        var options = new BuildPlayerWithProfileOptions
        {
            buildProfile = profile,                 // platform, scene list, defines from the asset
            locationPathName = "Builds/Windows/Game.exe",
            options = BuildOptions.None,
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
            throw new System.Exception($"Build failed: {report.summary.totalErrors} errors");
    }
}
```

### 4. Protecting stripped code with `link.xml`

```xml
<!-- Assets/link.xml — keep types the linker can't see as used (reflection, JSON, plugins). -->
<linker>
  <assembly fullname="MyGameRuntime" preserve="all"/>
</linker>
```

## Verify

1. Run the scripted build and confirm `BuildReport.summary.result == BuildResult.Succeeded`
   (log `totalErrors`, `totalSize`, `totalTime` along the way).
2. In CI: check the exit code of the `Unity -batchmode -quit` process (0 = success) and grep
   the log for any `Exception` thrown from the build method.
3. Run the produced player (desktop, or a local server for WebGL) and reach actual gameplay,
   not just the loading screen.
4. For Addressables: confirm the content was actually rebuilt (the
   `Library/com.unity.addressables` folder's timestamp is after the last asset change) rather
   than assuming the player build did it.

## Pitfalls

- **A scene loads in the Editor but is missing from the build → cause**: it's not in the
  scene list (File → Build Profiles → Scene List, or the profile's own list) or it's disabled.
  `SceneManager.LoadScene` only sees listed scenes.
- **The IL2CPP build fails on a fresh machine → cause**: the platform's C++ toolchain (e.g.
  Windows build tools, Android NDK) isn't installed. Mono has no such requirement.
- **`MissingMethodException`/`TypeLoadException` only in the build → cause**: managed
  stripping removed reflection-only code. Lower the stripping level or add a `preserve` entry
  in `link.xml`.
- **Treating "BuildPlayer returned" as success → fix**: always check
  `BuildReport.summary.result`; it can return with errors.
- **Addressables content is stale or missing → cause**: Addressables content
  (`com.unity.addressables`) is built via Build → Addressables or
  `AddressableAssetSettings.BuildPlayerContent`. The **Build Addressables on Player Build**
  setting can do it during a player build, but left on "Use global Settings" the outcome
  depends on each machine's Preferences — call the content build explicitly in CI, and check
  the profile's load path.
- **The target platform's code didn't compile → cause**: a scripted `BuildPlayer` for a target
  other than the active one keeps the active platform's `UNITY_*` defines, and define changes
  only apply after a domain reload. Switch platform first (in the Editor) or launch with
  `-buildTarget` (batch mode).
- **The build ignores scenes added to the global list → cause**: the Build Profile being
  built has its own Scene List. Edit that list; a profile with no Scene List uses the global
  one.
- **Shipping a Development build → consequence**: `BuildOptions.Development` enables
  profiler/debugging and slows things down; use `BuildOptions.None` for a release.

## References

- For a **complete multi-platform CI build script** (`-buildTarget` per platform, version
  stamping, argument parsing, exit codes), building a saved Build Profile from the command
  line, and an Addressables content build call, read `references/ci-build-script.md`.
- Primary docs: `ScriptReference/BuildPipeline.BuildPlayer`,
  `ScriptReference/BuildPlayerWithProfileOptions`, the Manual pages "Editor command line
  arguments" and "Manage scenes in a build," and the Unity Manual's build sections (player
  settings, managed code stripping). For the forward-looking CoreCLR backend, see the
  experimental note at
  `https://docs.unity.com/en-us/engine/6000.7/manual/programming-environment/scripting-backends/coreclr`.

## Related skills

- `unity-csharp-scripting`: editor scripting conventions used by build scripts.
- `unity-build-size`: finding and reducing what makes a build, APK, or Web build oversized.
- `unity-scriptableobjects`: making sure a referenced asset ships in the build.
- `performance-optimization`: runtime performance once the build exists.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1.

- Unity CLI 1.0.0-beta.17 and `com.unity.pipeline` 1.0.0-pre.1 are pre-release; command names
  may change. https://docs.unity.com/en-us/unity-cli
- Experimental CoreCLR backend on Unity 6.7 beta: see the link in References above, not for
  production use on a 6.3 LTS project.
- Manual: https://docs.unity.com/en-us/engine/6000.3/manual/building-and-publishing and
  Scripting API `BuildPipeline`, `BuildPlayerOptions`, `BuildReport`.
