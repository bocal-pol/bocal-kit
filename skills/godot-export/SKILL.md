---
name: godot-export
description: "Godot 4.7 project exports: `export_presets.cfg` templates and presets for desktop, Web and Android, command-line exports, and web COOP/COEP headers. Auto-invoke on \"No export template found\", a blank web build, a SharedArrayBuffer error, or missing files after export. Not for CI tests (`godot-gdscript-headless-testing`), store uploads (`steam-publish`, `itch-publish`), or netcode (`godot-multiplayer`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Export & Builds (4.x)

This skill owns turning a project into builds from command-line export presets, plus proof the
build runs. Targets **Godot 4.7**; export templates must match the editor version exactly, so read
`config/features` in `project.godot` and the CI's Godot version first.

> Adapted/translated from `godot-export` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Read and configure `export_presets.cfg`, export via CLI, debug a missing template, a blank web
  build or a `SharedArrayBuffer` error, or files missing after export.

**Not this skill**: CI tests (`godot-gdscript-headless-testing`); store uploads
(`steam-publish`, `itch-publish`); netcode (`godot-multiplayer`).

## Main workflow

1. **Read `export_presets.cfg`.** Each `[preset.N]` has a `name` (what the CLI wants), a
   `platform` and an `export_path`. If the file is missing, create presets in *Project > Export* or
   ask the user to; avoid hand-writing a full preset.
2. **Install matching templates** (*Editor > Manage Export Templates*, or unzip the `.tpz` so its
   files land where the error message names them). `--export-pack` needs none.
3. **Export from the CLI**, from the project folder, into a folder that already exists.
4. **Per platform:** Web needs COOP/COEP headers only when the preset's *Thread Support* is
   enabled (off by default); Android needs SDK paths and a keystore; macOS needs signing and
   notarization to pass Gatekeeper.
5. **Run the checks** below before concluding.

## Patterns

### 1. Command-line exports

```bash
mkdir -p build/windows build/linux build/web          # Godot doesn't create the folder
godot --headless --export-release "Windows Desktop" build/windows/game.exe
godot --headless --export-release "Linux"           build/linux/game.x86_64
godot --headless --export-release "Web"             build/web/index.html
godot --headless --export-debug   "Windows Desktop" build/windows/game_debug.exe
godot --headless --export-pack    "Linux"           build/game.pck   # .zip for a ZIP pack
godot --headless --export-patch   "Linux"           build/patch1.pck --patches build/game.pck
```

### 2. Detecting the build at runtime

```gdscript
func _ready() -> void:
    if OS.has_feature("dedicated_server") or DisplayServer.get_name() == "headless":
        start_server_only()           # skip rendering and UI
    if OS.has_feature("web"):
        apply_web_settings()
    if OS.has_feature("demo"):        # a custom tag set in a preset's Features
        limit_content()
```

### 3. Writing paths that survive export

```gdscript
const SAVE_PATH := "user://savegame.tres"   # res:// is read-only in a .pck

func _ready() -> void:
    print(OS.get_user_data_dir())           # where user:// lives on this platform
```

## Verify

1. The export command exits 0 and the output file exists. A nonzero exit always means failure
   (missing template, unknown preset, unwritable path); the reason is in the log.
2. Smoke-run the exported data without templates:
   `godot --headless --path <project> --export-pack "<preset>" build/game.pck`, then
   `godot --headless --main-pack build/game.pck --quit-after 300 > run.log 2>&1` and
   `grep -nE "SCRIPT ERROR|^ERROR:" run.log`. This catches files the preset's filters excluded and
   `res://` writes, since only what was packed gets loaded.
3. For a Linux or server build, run the binary itself the same way.
4. Platforms that can't run here (consoles, iOS, signed macOS, phones): ask the user to run the
   build on the device and report whether it starts, saves and loads.

## Pitfalls

- **`No export template found at the expected path`** → templates are missing or for a different
  version (including beta/rc). Install the exact version.
- **`Invalid export preset name: ...`** → names are case- and space-sensitive; quote the name.
- **`Can't open file for writing`** → the output folder doesn't exist. `mkdir -p` first.
- **A file is missing only in the build** → non-resource files (`.json`, `.txt`, `.csv`) aren't
  exported unless listed in the preset's *Filters to export non-resource files*
  (`include_filter="*.json"`).
- **Works in the editor, fails in the build** → the game writes under `res://`. Use `user://`.
- **Web build: blank page or `SharedArrayBuffer` error** → *Thread Support* is on and the host
  doesn't send `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`. Disable threads, enable the host's option (itch.io
  has one), or use the PWA option that adds the headers. `file://` never works.
- **The web build looks different** → web always uses the Compatibility renderer.
- **A C# project doesn't export to web** → unsupported in Godot 4.
- **Secrets end up in Git** → keystore passwords and encryption keys live in
  `.godot/export_credentials.cfg`, not `export_presets.cfg`. Keep `.godot/` ignored and supply
  secrets in CI via environment variables.
- **Shipping a debug build** → `--export-debug` keeps the remote debugger and debug checks; ship
  `--export-release`.

## References

- The official docs on exporting projects and exporting for the web cover
  `export_presets.cfg`'s layout, every useful CLI flag, feature tags, web/Android/Apple configs,
  PCK patches and DLC, and why PCK encryption needs custom templates.

## Related skills

- `godot-gdscript-headless-testing`: tests before the export step in CI.
- `godot-multiplayer`: the dedicated server code you export.
- `godot-csharp`: .NET export limits.
- `steam-publish` / `itch-publish`: getting the build to players.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- Web *Thread Support* has been off by default since 4.3; web exports always use Compatibility.
- 4.7 adds per-platform template downloads. Confidential export options have lived in
  `.godot/export_credentials.cfg` since at least 4.2.
