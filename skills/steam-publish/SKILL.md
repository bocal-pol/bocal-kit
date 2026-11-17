---
name: steam-publish
description: "Publish or update a game on Steam with Steamworks and SteamPipe: depots, app_build .vdf scripts, steamcmd uploads, beta branches, SetLive, store review and Coming Soon. Auto-invoke for steamcmd, ContentBuilder, \"Failed to get application info\", Steam Deck Verified, or \"ship this on Steam\". Not for itch.io (`itch-publish`) nor for Steamworks SDK calls in the game's own code — a known gap not covered by any existing skill."
model: claude-sonnet-5
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Steam Publish (Steamworks + SteamPipe)

Get a finished build onto a live Steam store page. Two tracks move in parallel and both must be
approved before release: the **store page** (presence) and the **build** (SteamPipe upload plus
the Game Build checklist). This skill writes and checks the build scripts and drives steamcmd;
the Steam partner-side steps belong to the user, so they're asked for those and the credentials
they produce.

> Adapted from the `steam-publish` skill of
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Setting up a Steam app, depots and packages, writing `app_build_*.vdf` /
  `depot_build_*.vdf` scripts, uploading with steamcmd.
- Managing beta branches, passing store and build review, releasing or updating a Steam title.
- Project signals: `steam_appid.txt`, a `tools/ContentBuilder/` folder from the Steamworks SDK,
  `*.vdf` scripts, steamcmd in CI.

**Not this skill**: itch.io (use `itch-publish`); configuring Steam Cloud saves at runtime
(`save-systems` — Steam Cloud is configured on the Steamworks admin side, but this skill does
not cover the in-game SDK calls); the Steam launcher or in-game overlay UI (`game-ui-ux`);
pricing strategy, tax, or legal advice (point the user to the Steamworks docs and their own
advisors).

**Known gap, flagged as such (see game-dev-router §3e)**: integrating the Steamworks SDK into
the game's own code — `SteamAPI_Init`, achievements, stats, Steam Input, overlay, Cloud,
lobbies, networking — is not covered by any skill in this repository. For that, read the
[Steamworks API overview](https://partner.steamgames.com/doc/sdk/api) and use the engine's
binding (GodotSteam, Steamworks.NET/Facepunch.Steamworks for Unity/C#, Unreal's Online
Subsystem Steam plugin). This skill only uses `tools/ContentBuilder` from the SDK.

## Main workflow

1. **One-time setup on the user's side**: a partner account with the Steam Direct fee paid, a
   dedicated build account with only the *Edit App Metadata* and *Publish App Changes To Steam*
   rights (publishing Coming Soon and releasing the game additionally require *Manage pricing
   and discounts*, which the build account doesn't need), the Steamworks SDK installed on the
   upload machine. Never commit the account password or steamcmd's `config.vdf` login token.
2. **Configure the app in App Admin** (ask the user to do this and report the depot IDs): one
   launch option per OS, one depot per file bucket, each depot added to the Developer Comp
   package and to the store package, then **publish** the configuration — an unpublished config
   is the most common cause of upload failure.
3. **Store page track**: assets, description, tags, trailer, system requirements, then the
   Content Survey (general content, mature content, generative AI) before submission, then
   *Mark as ready for review*. Approval doesn't publish the page: click *Post as Coming Soon*.
4. **Write the build scripts.** Single depot: the minimal `app_build` from Pattern 1. Multiple
   depots or platforms: one `depot_build_<DepotID>.vdf` per depot.
5. **Check the scripts** with a check script (Pattern 2) and fix every error. Do a first run
   with `"Preview" "1"` (writes logs and a manifest, uploads nothing).
6. **Upload.** Remove `Preview`, run steamcmd with the build account (Pattern 3). It chunks
   files into roughly 1 MB pieces, only uploads new chunks, and records a global BuildID.
7. **Make the build live on a beta branch first**, either via `"SetLive" "<beta>"` in the
   script or from the Builds page. Ask the user to install that branch and confirm it launches
   on every listed OS. Then promote to `default` by hand — `default` cannot be set by script.
8. **Build review.** The store presence must be submitted first. Valve reviews the build live on
   `default`: near-final, launching on every listed OS, with every feature advertised on the
   store page.
9. **Release.** Nothing ships on its own: once both tracks are approved and Coming Soon has run
   its minimum duration, the user clicks *Release App*, *Publish Now*, then *Release Now*.
10. **Later updates**: upload, make live on a beta, test, promote to `default`.

## Patterns

### 1. Minimal build script: `app_build_1000.vdf`

```vdf
// AppID 1000 with one depot (1001): recursive upload of everything under ../content.
"AppBuild"
{
    "AppID"       "1000"                 // your App ID
    "Desc"        "1.0.0 launch build"   // internal only, visible in Your Builds

    "ContentRoot" "..\content\"          // root of files to upload
    "BuildOutput" "..\output\"           // logs + chunk cache

    "Depots"
    {
        "1001"                           // your Depot ID
        {
            "FileMapping"
            {
                "LocalPath"  "*"
                "DepotPath"  "."
                "recursive"  "1"
            }
        }
    }
}
```

Two optional top-level keys: `"Preview" "1"` (dry run: logs and manifest only) and `"SetLive"
"beta-qa"` (go live on that beta branch after success; never `default`).

### 2. Checking the scripts before login (check-script idea)

```bash
# A local Python script (read-only, no login) can check:
# - AppID/DepotID present and consistent
# - ContentRoot and LocalPath resolve to real files
# - every depot contains at least one file
python3 scripts/check_steam_build.py tools/ContentBuilder/scripts/app_build_1000.vdf
python3 scripts/check_steam_build.py app_build_1000.vdf --json --strict   # CI gate
```

```text
ERROR depot_build_1002.vdf:7: LocalPath "bin\*" matches no file under ../content
  fix: LocalPath is relative to ContentRoot; check the folder names
Depots:
  1001 [depot_build_1001.vdf]: 412 files, 1.8 GiB, 3 excluded, from ../content
Summary: 1 error, 0 warnings across 3 files checked
```

Read the file count and size per depot: a depot noticeably smaller than the build folder often
signals a bad mapping.

### 3. Uploading the build

```bat
REM Windows, from the SDK root. Use the build account, not an admin account.
tools\ContentBuilder\builder\steamcmd.exe ^
  +login <build_account> ^
  +run_app_build ..\scripts\app_build_1000.vdf ^
  +quit
```

On Linux and macOS, use `builder_linux/steamcmd.sh` or `builder_osx/steamcmd.sh`. The first
login is interactive: the user types the password and Steam Guard code at steamcmd's prompts.
Never put the password in a command-line argument (shell history, CI logs). Later runs and CI
reuse the saved login token.

## Verify

1. The check script exits with code 0 in strict mode, and the file count/size per depot matches
   the actual build folder.
2. The `Preview` run ends with a preview-success line, and the manifest in `BuildOutput` lists
   the expected files. On the real upload, the same line must report a BuildID, not `preview` —
   otherwise `Preview` stayed at `1` and nothing was uploaded.
3. On failure, read the `*.log` files in `BuildOutput`, not just the console.
4. Ask the user to confirm the BuildID appears on the Builds page, that it's live on the
   intended branch, and that it launches from that branch on every listed OS.

## Pitfalls

- **`default` cannot be made live by script.** `SetLive` only works for beta branches → promote
  to `default` by hand on the Builds page.
- **Store page submitted after the build, or not at all.** The build can't be submitted for
  review until the store presence is → submit the store first.
- **Coming Soon clock never started.** An approved page stays hidden until someone clicks *Post
  as Coming Soon* → the minimum delay only counts public days.
- **Build rejected for a missing feature.** Every feature checked on the store page and every
  listed OS must work in the reviewed build → uncheck what isn't ready before submission.
- **Empty install on Mac or Linux.** That OS's depots aren't in the package → check that every
  depot is added under *Associated Packages & DLC*.
- **"Failed to get application info".** Wrong App ID, the account doesn't own the app, or the
  App Admin config was never *Published* → republish the config.
- **macOS launches as Intel on Apple Silicon.** A launch option pointing directly at the binary
  inside `Game.app/Contents/MacOS/` forces the Steam client's architecture choice → point at
  `Game.app` itself and let macOS pick the best architecture.
- **Exposed private beta.** A branch with no password is visible to any owner of the game under
  *Game Versions & Betas* → set a branch password before making it live.
- **Generative AI omitted from the Content Survey.** AI-generated content reaching the player
  (art, audio, text, localization) must be declared, as must content generated live while the
  game runs, with a description of the guardrails → fill in the Content Survey before
  submission, some answers can't be changed after approval.
- **Committed login token.** `config.vdf` and the account password are secrets → a leaked token
  requires re-securing the account.

## References

- [Uploading to Steam](https://partner.steamgames.com/doc/sdk/uploading)
- [Branches](https://partner.steamgames.com/doc/store/application/branches)
- [Release Process](https://partner.steamgames.com/doc/store/releasing)
- [Steam Direct Fee](https://partner.steamgames.com/doc/gettingstarted/appfee)

## Related skills

- `itch-publish`: the same game on itch.io via butler, often shipped alongside Steam.
- `game-jam`, `prototype-fast`: earlier stages of the same project.
- `save-systems`: Steam Cloud admin configuration, on the Steamworks pages side.
- `game-ui-ux`: launcher or overlay UI, outside this skill's scope.

## Version notes

Last checked: 2026-11-17. Steam regularly changes fees, delays, and review rules; recheck the
linked pages before quoting a precise figure to the user.

- **Steam Direct fee**: on the order of 100 USD (or local equivalent) per app, non-refundable,
  recouped after the product reaches a certain adjusted gross revenue threshold.
- **Tax verification**: counts in business days; tax details are locked during this period.
- **Coming Soon**: a minimum public-visibility delay before release, on the order of two weeks.
- **Store and build reviews**: typically count in business days; Valve recommends submitting
  several business days before the desired release date.
- These figures change: reconfirm them on the official Steamworks pages before announcing them
  to the user as final.
