---
name: unity-build-size
description: "Finds and reduces what makes a Unity 6.3 LTS build oversized: Build Report reading, uncompressed textures, glTFast models, PCM audio, and per-platform levers. Auto-invoke when an APK, AAB, WebGL build, or Steam depot exceeds a size limit or the download feels too heavy. Not for framerate (`performance-optimization`), build scripts or stripping (`unity-build-pipeline`), nor uploading to a store (`steam-publish`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Unity build size

Bring a Unity player build under a size limit: measure what's actually limited, fix the
handful of assets and settings that dominate, rebuild, and prove the result works. Targets
**Unity 6.3 LTS (6000.3)**; the scripts were exercised against glTFast 6.20.0 projects. Keep
an existing project's version from `ProjectSettings/ProjectVersion.txt`.

The script paths below are relative to this skill's folder. Both scripts are read-only, Python
3.10+ stdlib only.

> Adapted/translated from the skill `unity-build-size` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- An APK, AAB, WebGL build, or Steam depot exceeds a size limit, or players or the
  distribution platform find the download too heavy.
- You need to read a Build Report, find the assets dominating size, or pick per-platform
  compression levers.

**Not this skill**: framerate and runtime memory → `performance-optimization`; build scripts,
CI, scripting backend, managed stripping → `unity-build-pipeline`, which receives back any
stripping work found here; submitting to a storefront → `steam-publish` / `itch-publish`.

## Main workflow

1. **Identify what's actually limited.** A build has several sizes, and fixing the wrong one
   wastes time. Find which file is limited and by how much, then read **only** the matching
   reference:

   | Target | What's usually limited | Read |
   |--------|-------------------------|------|
   | Browser (itch.io, portals, own site) | each file under `Build/` (itch.io: 200 MB per file) and the compressed download | [references/platform-web.md](references/platform-web.md) |
   | Android (APK, AAB, Google Play) | the download Play calculates from the AAB | [references/platform-android.md](references/platform-android.md) |
   | iOS (App Store, TestFlight) | the per-device thinned download | [references/platform-ios.md](references/platform-ios.md) |
   | Windows, macOS, Linux (zip, jam, Steam) | the archive, the installed folder, or the Steam patch size | [references/platform-desktop-steam.md](references/platform-desktop-steam.md) |

   If the user gives a number but not which file it applies to, ask that single question.
   Without a hard limit, pick what the user pays for (download, installed size, patch size)
   and state which one you measured. Note that file's current size before any change: it's
   the baseline for comparison.
2. **Measure what ships.** Build once (or use the current Editor session's last build) and
   summarize the Build Report:

   ```bash
   python scripts/build_report.py ~/Library/Logs/Unity/Editor.log --top 20
   ```

   Log paths: Windows `%LOCALAPPDATA%\Unity\Editor\Editor.log`, Linux
   `~/.config/unity3d/Editor.log`, batch mode the `-logFile` path. Categories tell you *what
   kind* of data dominates; the asset list tells you *which files*. Sizes are uncompressed and
   in MiB, so this isn't the download size: always compare against the file measured in step
   1.

   When the Unity CLI is installed (`unity --version`), it can build while keeping its log:
   `unity build . --profile "<Build Profile name>" --output-path <output path>
   --log-file build.log`, then run `build_report.py build.log`. Without it, use the Editor's
   Build Profiles window or the project's own build script.
3. **Find the causes in the project.**

   ```bash
   # --platform: the one you're shipping, Standalone, Android, iPhone, or WebGL
   python scripts/check_unity_build_size.py path/to/Project --platform WebGL --max-texture-size 2048
   ```

   Without the right `--platform`, that platform's texture overrides aren't checked. Each
   `WARNING` names a file, the setting, an estimated build cost, and a `fix:` line; `NOTE`s
   give context. The checker can't know which assets a build actually references: cross-check
   with the Build Report — an asset no shipped scene uses costs nothing.
4. **Fix the biggest category first.** Smallest change first, one category at a time, so the
   next measurement shows what each fix bought.
   - **glTF/GLB with embedded images** (`gltf-embedded-texture`): glTFast ships them
     uncompressed, and they have no Texture Importer to fix. Run the checker's `fix:` command,
     or pull the images out; read [references/gltf-textures.md](references/gltf-textures.md)
     before the first option.
   - **Textures** (`uncompressed-texture`, `texture-max-size`): Compression Normal Quality
     and a lower Max Size, per platform if needed (pattern below). An override with an
     explicit Format ignores Compression, so set that Format to Automatic or a compressed
     format. For DXT/ETC format downloads, Use Crunch Compression shrinks files further at the
     cost of quality.
   - **Audio** (`pcm-audio`): Vorbis for music and ambience, ADPCM for short effects, Force To
     Mono when stereo adds nothing.
   - **Resources and StreamingAssets:** anything in a `Resources` folder ships, loaded or not;
     `Assets/StreamingAssets` is copied byte for byte. Remove what nothing uses.
   - **Meshes, animation, lightmaps:** Model Importer Mesh Compression for FBX/OBJ (glTF:
     reduce the source, `gltf-heavy-geometry`), animation compression on clips, and in the
     Lighting window a lower Max Lightmap Size and Lightmap Compression when lightmaps
     dominate the Textures category.
   - **Scenes:** remove test scenes from the built profile's Scene List.
   - **Code and engine size:** when native libraries, `.wasm`, or managed DLLs dominate the
     list, apply the platform reference's settings; stripping levels and `link.xml` belong to
     `unity-build-pipeline`.
   - **Packaging:** the platform reference covers player compression, store packaging, and
     debug folders that shouldn't ship.
5. **Rebuild, compare, prove.**
   1. Build into an **empty** output folder (a stale folder or leftover debug data skews the
      size).
   2. Rerun `build_report.py` and the checker; the touched categories should have dropped.
      Re-measure the limited file from step 1 and report before/after numbers.
   3. Run the build the way players receive it, reach gameplay, and look at the reduced
      assets. The platform reference explains how (a Web build needs a server). If the target
      can't be tested, build for your own platform and run that, stating which one was
      tested.
   4. For CI, `build_report.py build.log --budget-mb 400` exits 1 above budget, and also when
      the log has no complete size to compare. It checks the uncompressed total, so check the
      shipped file separately when the limit is on that.

## Patterns

### 1. Bulk-limiting textures (editor script)

Commit first: this changes import settings, and the diff is the review. Place it in an
`Editor` folder. It skips small textures, like the checker, so pixel art and UI icons keep
their settings.

```csharp
using UnityEditor;
using UnityEngine;

public static class TextureBudget
{
    const int MaxSize = 2048;
    const int MinEdgeToCompress = 1024;

    [MenuItem("Tools/Build Size/Compress Large Textures")]
    static void CompressLargeTextures()
    {
        AssetDatabase.StartAssetEditing();   // one reimport pass instead of one per texture
        try
        {
            foreach (string guid in AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (AssetImporter.GetAtPath(path) is not TextureImporter importer)
                    continue;   // model sub-assets (glTFast) have no TextureImporter
                importer.GetSourceTextureWidthAndHeight(out int width, out int height);
                if (Mathf.Max(width, height) < MinEdgeToCompress)
                    continue;

                bool changed = false;
                if (importer.maxTextureSize > MaxSize) { importer.maxTextureSize = MaxSize; changed = true; }
                if (importer.textureCompression == TextureImporterCompression.Uncompressed)
                {
                    importer.textureCompression = TextureImporterCompression.Compressed;
                    changed = true;
                }
                if (changed)
                {
                    importer.SaveAndReimport();
                    Debug.Log($"Compressed {path}");
                }
            }
        }
        finally
        {
            AssetDatabase.StopAssetEditing();
        }
    }
}
```

This changes the default settings, which apply to any platform without an override. For a
single platform, use `importer.GetPlatformTextureSettings("Android")`, set
`overridden = true`, `maxTextureSize`, and `textureCompression`, then
`importer.SetPlatformTextureSettings(settings)`.

## Verify

1. `python scripts/check_unity_build_size.py <project> --platform <target> --strict` — exit
   code 0, no unaddressed `WARNING`.
2. `python scripts/build_report.py build.log --top 20 --budget-mb <N>` — compare touched
   categories before/after, and confirm the total stays under `<N>`.
3. Run the produced build the way players receive it and visually confirm no critical texture
   or audio visibly lost quality.
4. Re-confirm the actually limited file's size (download, AAB, archive) against the original
   limit, not just the Build Report's uncompressed total.

## Pitfalls

- **Texture settings look correct but the build is still huge → cause**: the textures are
  inside `.glb`/`.gltf` models. Run the checker; `references/gltf-textures.md` has the fixes.
- **Textures in the Build Report are much bigger than their `.meta` settings → cause**: the
  Build Profiles window's Asset Import Overrides set Texture Compression to Force Uncompressed
  (or Force No Crunch). That's a local-iteration shortcut the checker can't see; clear it
  before a release build
  ([Build Profiles reference](https://docs.unity3d.com/6000.3/Documentation/Manual/build-profiles-reference.html)).
- **Running a `.gltf` fix on several models in the same folder → cause**:
  `gltf-transform` names the images it writes after the texture slot
  (`baseColor_1.png`) and overwrites existing ones, so every model ends up with the last
  model's textures. The checker's `fix:` line says when to move a model into its own folder
  first; follow it.
- **Normal maps look wrong after pulling out glTF images → cause**: they arrived with sRGB
  enabled. Disable sRGB (Color Texture) for every texture except base color, emissive, and the
  specular-glossiness pair.
- **LZ4HC shrank the zip but blew up the Steam patch → cause**: Steam already compresses its
  own uploads and downloads, and Unity's compressed player data spreads small changes across
  many chunks. On Steam and Android, leave Compression Method on Default; see the platform
  reference.
- **The Web build is several times bigger than expected → cause**: it's a development build,
  which Unity never compresses.
- **Addressables content is missing from the Build Report's asset list → cause**: local
  groups are built into bundles and copied into the player's `StreamingAssets/aa`; the
  player's Build Report doesn't list assets inside them. Use the Addressables Build Report
  window. Current Addressables versions build into `Library/`, so a leftover
  `Assets/StreamingAssets/aa` is stale and still ships; the Addressables changelog recommends
  deleting it
  ([changelog](https://docs.unity3d.com/Packages/com.unity.addressables@2.9/changelog/CHANGELOG.html)).
- **An `uncompressed-texture` warning on an already-packed sprite → cause**: a sprite inside a
  Sprite Atlas ships with the atlas's settings; check the atlas instead.
- **Textures look blurry after lowering Max Size → cause**: that texture fills more on-screen
  pixels than the limit allows; give it a higher Max Size and lower something less visible.
- **The checker reports a `Git LFS pointer` model → cause**: the clone has pointer files; run
  `git lfs pull` before measuring anything.

## References

- `scripts/check_unity_build_size.py --help`: the project checker. `--json` for tooling,
  `--strict` to fail on warnings.
- `scripts/build_report.py --help`: Build Report summary; `--top`, `--json`, `--budget-mb`.
- [references/gltf-textures.md](references/gltf-textures.md): glTFast embedded images, a size
  table, both fixes, heavy geometry.
- Unity Manual: [Reducing the file size of a build](https://docs.unity.com/en-us/engine/6000.3/manual/building-and-publishing/reducing-filesize),
  [Reserved folder names](https://docs.unity3d.com/6000.3/Documentation/Manual/SpecialFolders.html),
  [Include additional files in a build](https://docs.unity3d.com/6000.3/Documentation/Manual/StreamingAssets.html).

## Optional tools

This skill works with the files and the Editor log alone. When installed, these tools save
steps:

- **Unity CLI** (`unity`, experimental): build with a kept log (step 2) and
  `unity build run` to launch the last build, including a Web build on a local server
  ([Unity CLI docs](https://docs.unity.com/en-us/unity-cli)).
- **Official Unity skills** ([Unity-Technologies/skills](https://github.com/Unity-Technologies/skills)):
  `optimize-web` and `optimize-audio` apply Player and audio settings through a live Editor,
  `project-auditor-fixes` runs Project Auditor. Use them for Editor-side changes, and keep
  this skill's measure-and-compare loop around them.

## Related skills

- `unity-build-pipeline`: build scripts, CI, scripting backend, managed stripping, Addressables
  configuration.
- `performance-optimization`: runtime memory and frame time.
- `create-game-assets`: making textures at the right size before import.
- `audio-design`: audio format and compression choices upstream of the Unity import.

## Version notes

Last checked: 2026-11-17, against Unity 6000.3.28f1; scripts exercised against glTFast
6.20.0.

- Manual: [Reducing the file size of a build](https://docs.unity.com/en-us/engine/6000.3/manual/building-and-publishing/reducing-filesize).
- Addressables 2.9 changelog on the `Library/` folder: see the link in References.
- This skill's scripts are read-only, Python 3.10+ stdlib, and never write into the project.
