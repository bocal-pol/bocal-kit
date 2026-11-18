# CI / headless build script (Unity 6.3 LTS)

Deep dive for `unity-build-pipeline`: a reusable editor build script that takes command-line
arguments, stamps a version, and returns a clean exit code. Checked against
`ScriptReference/BuildPipeline.BuildPlayer`,
`ScriptReference/EditorUserBuildSettings.SwitchActiveBuildTarget`, and the 6000.3 Manual page
"Editor command line arguments."

Contents: [A parameterized build method](#a-parameterized-build-method) ·
[Invoking from CI](#invoking-from-ci) ·
[Building a saved Build Profile without a script](#building-a-saved-build-profile-without-a-script) ·
[Addressables content build (if used)](#addressables-content-build-if-used) · [Pitfalls](#pitfalls)

**Pick the platform with Unity's native `-buildTarget` flag, not from inside the script.**
`EditorUserBuildSettings.SwitchActiveBuildTarget` isn't available in batch mode: switching
platforms requires a script recompile, which can't happen while `-executeMethod` code is
running. `-buildTarget` starts the Editor on that platform, so scripts compile with the right
`UNITY_*` defines before the method is called. Its values are lowercase names like `win64`,
`osxuniversal`, `linux64`, `android`, `ios`, and `webgl`.

## A parameterized build method

```csharp
using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class CIBuild
{
    // Invoke with: -buildTarget win64 -executeMethod CIBuild.Run -out Builds/Game.exe -appVersion 1.2.3
    public static void Run()
    {
        string[] args = Environment.GetCommandLineArgs();

        if (!HasArg(args, "-buildTarget"))
        {
            // Without it, the build silently uses the project's last platform.
            Debug.LogError("[CIBuild] pass -buildTarget <name> so the Editor starts on that platform");
            EditorApplication.Exit(2);
            return;
        }

        string outPath = ArgValue(args, "-out", "Builds/Game.exe");
        string version = ArgValue(args, "-appVersion", PlayerSettings.bundleVersion);
        bool   dev     = HasArg(args, "-dev");

        // Already switched by -buildTarget at startup, with matching script defines.
        BuildTarget target = EditorUserBuildSettings.activeBuildTarget;

        PlayerSettings.bundleVersion = version;   // stamps the version into the player

        var options = new BuildPlayerOptions
        {
            scenes = EnabledScenes(),
            locationPathName = outPath,
            target = target,
            options = dev ? BuildOptions.Development : BuildOptions.None,
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary s = report.summary;

        if (s.result == BuildResult.Succeeded)
        {
            Debug.Log($"[CIBuild] OK {target} {version} -> {outPath} ({s.totalSize} bytes)");
            EditorApplication.Exit(0);            // explicit success exit code for CI
        }
        else
        {
            Debug.LogError($"[CIBuild] FAILED: {s.totalErrors} errors, result={s.result}");
            EditorApplication.Exit(1);            // non-zero fails the pipeline
        }
    }

    private static string[] EnabledScenes() =>
        EditorBuildSettings.scenes.Where(sc => sc.enabled).Select(sc => sc.path).ToArray();

    private static int IndexOf(string[] args, string key) =>
        Array.FindIndex(args, a => string.Equals(a, key, StringComparison.OrdinalIgnoreCase));

    private static bool HasArg(string[] args, string key) => IndexOf(args, key) >= 0;

    private static string ArgValue(string[] args, string key, string fallback)
    {
        int i = IndexOf(args, key);
        return (i >= 0 && i + 1 < args.Length) ? args[i + 1] : fallback;
    }
}
```

## Invoking from CI

```bash
# No need for -quit: the method itself terminates the process with EditorApplication.Exit.
Unity -batchmode -nographics \
  -projectPath "$CI_PROJECT_DIR" \
  -buildTarget win64 \
  -executeMethod CIBuild.Run \
  -out "Builds/Win/Game.exe" -appVersion "1.2.$BUILD_NUMBER" \
  -logFile - || exit 1
```

- Redirect `-logFile -` to stdout so CI captures the Unity log.
- `EditorApplication.Exit(code)` in the method is the reliable way to set the exit code; an
  uncaught exception also exits with 1, but `-quit` after a `Debug.LogError` returns 0.
- One platform per Editor launch: rerun the command with a different `-buildTarget` for the
  next platform rather than switching inside the method.
- Activate the Unity license in a separate step before building on a clean runner, using the
  provisioning flow supported by the license type. Unity credential flags
  (`-username`/`-password`/`-serial`) can expose values via process arguments or logs; don't
  commit credentials in plain text or paste them into shell history. Keep activation secrets
  confined to that step and protect any generated license file.

### Building a saved Build Profile without a script

If the team keeps its platform configuration in Build Profile assets, Unity can build one
directly:

```bash
Unity -batchmode -nographics -quit \
  -projectPath "$CI_PROJECT_DIR" \
  -activeBuildProfile "Assets/Settings/Build Profiles/WindowsRelease.asset" \
  -build "Builds/Win/Game.exe" \
  -logFile -
```

`-activeBuildProfile` takes a path relative to the project root and adds the profile's
scripting defines before compilation (it doesn't remove ones already present). Combined with
`-executeMethod` instead of `-build`, the defines are compiled before the method runs; then
build with
`BuildPipeline.BuildPlayer(new BuildPlayerWithProfileOptions { buildProfile = ..., locationPathName = ... })`
so the profile's own scene list and settings are used.

## Addressables content build (if used)

```csharp
using UnityEditor.AddressableAssets.Settings;

// Build Addressables content bundles BEFORE the player build, or runtime loads fail.
public static void BuildContent()
{
    AddressableAssetSettings.BuildPlayerContent(out var result);
    if (!string.IsNullOrEmpty(result.Error))
        throw new System.Exception($"Addressables build failed: {result.Error}");
}
```

Call it explicitly in CI even if the project's **Build Addressables on Player Build** setting
is enabled: when that setting is left on "Use global Settings," the answer comes from each
machine's Editor Preferences, so a clean runner can skip the content build.

## Pitfalls

- Don't call `EditorUserBuildSettings.SwitchActiveBuildTarget` in batch mode; it isn't
  available there. Use `-buildTarget` (or `-activeBuildProfile`) on the command line.
- Reading arguments via `Environment.GetCommandLineArgs()` includes Unity's own flags. Name
  custom keys so they can't collide with a real Unity argument (`-buildTarget`, `-build`,
  `-quit`, and `-version` are all taken; `-version` prints the Editor version and exits without
  building). `-out`, `-appVersion`, and `-dev` are free.
- A build server needs the platform module installed (e.g. the IL2CPP toolchain, Android
  SDK/NDK), or the build fails late with a toolchain error.
