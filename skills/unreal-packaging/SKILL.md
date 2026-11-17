---
name: unreal-packaging
description: "Packages and ships Unreal Engine 5 (UE 5.8) projects: Shipping builds, cook, pak/IoStore, and `RunUAT BuildCookRun` with UAT and cook log reading. Auto-invoke for a packaged build with a black screen, a map missing from the build, a \"BUILD FAILED\", or an AutomationTool exit code. Not for store uploads (`steam-publish`, `itch-publish`) nor gameplay compile errors (`unreal-cpp-gameplay`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unreal Packaging & Cooking

Turn a UE5 project into a build that starts on the right map and runs on a machine without the
editor, and make that build reproducible from a command line. Targets **UE 5.8**.

> Adapted/translated from the skill `unreal-packaging` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Produce a test or release build; choose Development, Test, or Shipping; set the launch map and
  the content to cook.
- Script CI builds with `RunUAT BuildCookRun`, or read why one failed.
- Understand where cooked and staged content goes, including the Zen store.

**Not this skill**: store and storefront submission → `steam-publish` / `itch-publish`. C++
gameplay compile errors → `unreal-cpp-gameplay`. Compiling the engine itself from source is out
of scope.

## Main workflow

1. **Read the project and the engine.** `EngineAssociation` in the `.uproject` is a version like
   `5.8` for a Launcher engine and a GUID (or empty) for a source build; console platforms need a
   source build. Check that the build machine's platform SDK meets the engine's minimum (see
   Version notes).
2. **Set what loads and what gets cooked.** Project Settings → Maps & Modes → **Game Default
   Map** (stored as `GameDefaultMap` in `Config/DefaultEngine.ini`). Maps only opened by name at
   runtime must be listed in Packaging → "List of maps to include in a packaged build" or cooked
   with `-map=`; assets only loaded by path need "Additional Asset Directories to Cook".
3. **Validate content**: `UnrealEditor-Cmd <Project>.uproject -run=DataValidation -unattended`
   and fix every error before cooking.
4. **Build with UAT** (default), even when the user packages from the editor, because the
   command line is reproducible:

   ```bash
   # From Engine/Build/BatchFiles (RunUAT.bat on Windows, RunUAT.sh on macOS and Linux)
   RunUAT BuildCookRun -project="<abs path>/MyGame.uproject" -noP4 \
     -platform=Win64 -clientconfig=Development \
     -build -cook -stage -pak -archive -archivedirectory="<abs path>/Builds" \
     -utf8output
   ```

   Swap in `-clientconfig=Shipping` for release. Cook a subset with `-map=Start+Level01`. The
   editor path (Platforms → Windows → Package Project) and Project Launcher profiles follow the
   same steps; a Launcher profile shows its full UAT command line in the Output Log.
5. **Read the logs on failure.** UAT prints the path of its log (`Log.txt`) and the cook log
   (`Cook-*.txt`). Search for `Error:` in them; the first error is usually the cause and the rest
   follow from it. Launcher engines on Windows write them under
   `%APPDATA%\Unreal Engine\AutomationTool\Logs\<engine path>`, source builds under
   `Engine/Programs/AutomationTool/Saved/Logs`.
6. **Run the packaged build (see Verify).** A finished cook proves content was converted, not
   that the game starts.

## Verify

Say which of these checks actually ran and quote the lines that prove it.

1. **UAT result**: the run ends with `BUILD SUCCESSFUL` and exit code 0, and the archive folder
   contains the executable plus the `.pak`/`.utoc`/`.ucas` files under
   `<Project>/Content/Paks`.
2. **Smoke-launch a Development build** from the archive with a log file:
   `<archive>/Windows/MyGame.exe -log -unattended -windowed -ResX=1280 -ResY=720 -abslog="<dir>/smoke.log"`
   (on a GPU-less machine, add `-nullrhi`). Let it reach the first map, close it, then check the
   log for the expected `LoadMap(/Game/...)` line and for any `Fatal error`, `Error:`, or
   missing-asset warning.
3. **Shipping builds** strip logging: run the same smoke test on equivalent Development or Test
   content first, then ask the user to run the Shipping build and report whether it reaches the
   main menu and can quit from the game's own menu.
4. **Optional**: if the project has automation tests, run them on the packaged Development build
   or in the editor as in `unreal-cpp-gameplay` before shipping.

## Pitfalls

- **Black screen or empty level in the build** → Game Default Map isn't set, or that map (or a
  map it opens by name) was never cooked.
- **The asset exists in the editor, missing in the build** → nothing hard-references it, so the
  cooker skipped it. Add its folder to cook, or reference it from a cooked asset.
- **`Saved/Cooked/<Platform>` has no `.uasset` files** → in 5.8 the Zen Server is the default cook
  output store, so this folder only holds a small `ue.projectstore` marker. Ship the staged or
  archived folder, built with `-pak`. Staging as loose files without `-pak` produces a build that
  streams content from its Zen server and isn't distributable.
- **The Zen server starts and stops on every CI step** → for team and CI machines, Epic
  recommends `LimitProcessLifetime=false` under `[Zen.AutoLaunch]` in `DefaultEngine.ini`; check
  that the build agent tolerates the long-lived `zenserver` process.
- **Bug only in Shipping, no log** → Shipping strips `UE_LOG` and the console. Reproduce in a
  Test build, which keeps a bit of tooling with near-Shipping optimizations.
- **No way to quit a Shipping build** → the `quit` console command isn't available there. The
  game needs its own exit option.
- **Platform SDK errors early in the build** → the installed Visual Studio, Windows SDK, or Xcode
  is older than the engine's minimum, or a console platform is used with a Launcher engine.
- **The first cook takes a very long time** → shaders and every asset cook from scratch; later
  cooks are incremental. A slow first cook isn't a freeze; watch the cook log's growth.
- **Expecting Blueprint Nativization** → removed under UE5. Profile and move hot logic to C++
  instead.

## References

- Epic docs: [Packaging Your Project](https://dev.epicgames.com/documentation/unreal-engine/packaging-your-project),
  [Build operations: cooking, packaging, deploying](https://dev.epicgames.com/documentation/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine),
  [Zenserver as Cooked Output Store](https://dev.epicgames.com/documentation/unreal-engine/using-zen-storage-server-as-cooked-output-store-for-unreal-engine),
  [Unreal Automation Tool overview](https://dev.epicgames.com/documentation/unreal-engine/unreal-automation-tool-overview-for-unreal-engine).

## Related skills

- `unreal-cpp-gameplay`: compile errors and automation tests upstream of the cook.
- `performance-optimization`: profiling the packaged build.
- `unreal-niagara`, `unreal-behavior-trees`, `unreal-blueprints`, `unreal-enhanced-input`:
  systems whose content must be correctly referenced to be cooked.

## Version notes

Last checked: 2026-11-17.

- Current version: UE 5.8 (hotfix 5.8.4, October 2026); UE 5.9 is in Preview and adds an
  experimental WebAssembly target with WebGPU rendering.
- UE 5.8 Windows: Visual Studio 2022 17.14 or newer (2026 recommended), MSVC 14.38 minimum (14.50
  recommended), Windows SDK 10.0.22621.0 minimum (10.0.26100.0 by default). macOS: Xcode 15.2
  minimum (15.4 or newer recommended). Linux: clang 20.1.8. Other platforms: see the Platform SDK
  Upgrades table in the release notes.
- UE 5.8 adds experimental Windows on Arm builds: `-clientarchitecture=arm64`, or `arm64+x64` for
  side-by-side executables. The editor itself doesn't run on Arm64 in 5.8.
- UE 5.8 makes the Zen Server the default cook output store; projects that had disabled it keep
  it disabled.
- Sources: [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes),
  [UE 5.9 Preview release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-9-release-notes),
  [5.8.4 hotfix announcement](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775).
