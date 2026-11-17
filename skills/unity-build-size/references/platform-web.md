# Web builds (WebGL / WebGPU)

Read this when the target is a browser: itch.io, a game portal, your own site. Pass
`--platform WebGL` to the checker. Checked against the Unity 6000.3 manual (2026-11).

## What's limited

- **The host's per-file and total limits.** itch.io HTML5 uploads: at most 1,000 files, 500 MB
  extracted, **200 MB per file**, 240 characters per path
  ([itch.io HTML5 docs](https://itch.io/docs/creators/html5)). The `Build/*.data` file is
  usually the one that hits the per-file limit, so check every file, not just the total.
- **What the player downloads**: the compressed files (`*.data.br`, `*.wasm.br`, or `.gz`).
  These are also the files a host's per-file limit applies to, so compression counts toward
  it.

Build Report sizes are before Web compression, so they overstate the download. Measure the
`Build/` folder itself:

```bash
ls -l path/to/WebBuild/Build/
```

## First moves, in order

1. **Build a release build.** Compression Format only applies to release builds; development
   builds aren't compressed at all
   ([Deploying a web application](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/building-distribution/deploying)).
   A development build measured against a limit looks several times too big.
2. **Compression Format = Brotli** (Player Settings → Publishing Settings). The default is
   gzip. Brotli files are smaller, but Chrome and Firefox only decode Brotli over HTTPS, and
   the server must send `Content-Encoding: br` for `.br` files. itch.io does this for files
   ending in `.br`. Only enable Decompression Fallback for a host that can't set the header: it
   slows startup.
3. **Code Optimization = Disk Size with LTO** (Build Profiles → Web). Unity recommends it for
   release builds; it builds more slowly
   ([Web build settings](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/building-distribution/web-build-settings)).
   In script it's `UnityEditor.WebGL.UserBuildSettings.codeOptimization =
   UnityEditor.WebGL.WasmCodeOptimization.DiskSizeLTO`
   ([Optimizing Web for mobile](https://docs.unity.com/engine/6000.5/manual/platform-specific/webgl/building-distribution/web-optimization-mobile)).
   It's a user build setting kept under `Library/`, not in `ProjectSettings/` (Unity's own
   `optimize-web` skill notes the same thing), so a CI machine doesn't inherit it from the
   Editor: set it in the build script that produces the release.
4. **Code size**: Strip Engine Code enabled and API Compatibility Level = .NET Standard.
   Enable Exceptions = None saves the most, but then any thrown exception crashes the player,
   so only use it when the game and its plugins never rely on catching exceptions; otherwise
   keep Explicitly Thrown Exceptions Only (or Target WebAssembly 2023 for exceptions without
   the overhead)
   ([Recommended Player settings](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/building-distribution/web-optimization/player)).
   Managed Stripping Level and `link.xml` breakage belong to `unity-build-pipeline`.
5. **Assets**: the main workflow (checker, glTF, textures, audio) applies, with one audio
   difference: Web encodes every clip as AAC regardless of the chosen format, and only
   supports the Compressed In Memory and Decompress On Load load types, not Streaming
   ([Audio on Web](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/develop/audio)).
   Lowering the Quality slider for music shrinks it. Web texture compression has a per-build
   sub-target (DXT for desktop browsers, ASTC or ETC2 for mobile; Build Profiles → Texture
   Compression). A build for mobile browsers with DXT textures ships them decompressed at
   runtime, so pick the sub-target for your audience
   ([Web texture compression](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-texture-compression.html)).
6. **A file still over the per-file limit after all that**: move content out of the `.data`
   file into Addressables groups (each bundle is its own file, local or remote), and load
   levels on demand. Addressables configuration itself belongs to `unity-build-pipeline`.

## Verify

Open the build through a web server, never from `index.html` on disk. A plain static server
that doesn't send `Content-Encoding` fails to start a Brotli build unless Decompression
Fallback is enabled. Use one of:

- the Editor's **Build And Run**;
- `unity build run` when the Unity CLI is installed (it serves a saved Web build from a local
  loopback-only server);
- an itch.io draft page (the real host).

In the browser's dev tools, Network tab, confirm `.br` files come back with
`content-encoding: br`, and note the transferred size. Then play to actual gameplay and check
the reduced assets.
