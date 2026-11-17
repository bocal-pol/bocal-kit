---
name: itch-publish
description: "Publish and update games on itch.io with the butler CLI: butler push to user/game:channel, per-channel platform tags, HTML5 builds, --userversion, and CI uploads. Auto-invoke for \"upload to itch\", an HTML5 game that downloads instead of playing, a blank page or 403, or \"invalid target\". Not for Steam (`steam-publish`) nor for jam scope (`game-jam`), nor for itch.io SDK calls in the game itself — a known gap not covered by any existing skill."
model: claude-sonnet-5
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# itch.io Publish (butler)

Get a build onto an itch.io page and keep it current. The page itself is created in the browser
by the user; every upload goes through **butler**, itch.io's CLI, via a single command: `butler
push`. butler diffs against the channel's previous build and only uploads what changed.

> Adapted from the `itch-publish` skill of
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Creating or updating an itch.io page, installing or connecting butler, pushing a build.
- Choosing channel names, versioning uploads, shipping a jam, demo, or release build.
- Project signals: `butler` in scripts or CI, `BUTLER_API_KEY`, an `.itch.toml` manifest.

**Not this skill**: Steam (use `steam-publish`); jam scope and schedule (`game-jam` — this
skill only handles the upload); building or exporting the game itself (the relevant engine
skill).

**Known gap, flagged as such (see game-dev-router §3e)**: itch.io SDK calls in the game's own
code (embedded butler-based update checks, the itch.io App API) are not covered by any skill in
this repository. Same for an HTML5 build itself on the engine side — the actual export belongs
to the relevant engine skill (e.g. a web-engines skill if applicable to the project); this skill
only covers uploading the already-exported build.

## Main workflow

1. **The page must exist first.** butler only pushes to an existing page. Ask the user to
   create one at `itch.io/game/new` and report the URL. Settings to ask about: *Kind of
   project* stays **Downloadable** for a native build or becomes **HTML** for a browser game;
   visibility stays **Draft** (or Restricted with a password for testers) until the page is
   finished, because the first public release puts the page on Most Recent exactly once, never
   again.
2. **Determine the target.** `<user>/<game>` is the page's lowercase address. Pick channel names
   now (Pattern 2) and reuse them forever.
3. **Install butler** locally, or in CI via a pinned install verified by checksum. Check with
   `butler version`.
4. **Prepare a portable build folder**: exactly the files the player runs. Push a folder (or a
   single `.zip` of that folder), never an installer or an already-compressed archive (see
   Pitfalls).
5. **Dry-run the push** and read the file list (Verify, step 1). Doesn't require login.
6. **Log in.** `butler login` opens a browser — ask the user to launch it and approve. In CI,
   set `BUTLER_API_KEY` from a secret instead.
7. **Push**: `butler push <dir> <user>/<game>:<channel> --userversion <version>`. The first push
   uploads everything; later pushes to the same channel only upload the diff.
8. **Finish the page.** Ask the user to fix platform tags (check only the platforms actually
   tested), check *This file will be played in the browser* for an HTML channel, answer the
   generative AI declaration, and rate adult content where relevant.
9. **Update later** by pushing to the same channel. `butler push-preview` shows what will change
   before the real push.

## Patterns

### 1. Push one channel per platform

```bash
# butler push <folder-or-zip> <user>/<game>:<channel>
butler push ./build/windows leafy/my-game:windows --userversion 1.2.0
butler push ./build/mac     leafy/my-game:osx     --userversion 1.2.0
butler push ./build/linux   leafy/my-game:linux   --userversion 1.2.0
butler push ./web           leafy/my-game:html    --userversion 1.2.0  # page Kind = HTML
```

`--userversion-file build.txt` reads the version from a file instead of a flag. Without either,
itch numbers builds with an auto-incrementing integer and the update API has no version to
report.

### 2. Channel names set the first platform tag

```text
Substring in name -> tag:    win / windows -> Windows    mac / osx -> macOS
                              linux -> Linux              android -> Android
Several platforms in one channel: butler push ./jar leafy/my-game:win-linux-mac
Convention: lowercase, hyphens (windows-beta, osx-demo, soundtrack).
No CPU architecture tag: name the channel (windows-arm64) if shipping several.
Tags are only a first guess; fix them on Edit game.
```

### 3. Filtered, hidden, or conditional push

```bash
butler push ./build leafy/my-game:windows --ignore '*.pdb' --ignore '*.dSYM'   # repeatable
butler push ./build leafy/my-game:windows-beta --hidden    # only at channel CREATION
butler push ./build leafy/my-game:windows --if-changed     # skip an empty patch (CI reruns)
butler status leafy/my-game                                # channels, builds, versions
```

## Verify

1. `butler push <dir> <user>/<game>:<channel> --dry-run` (with the same `--ignore` flags) lists
   every file and ends with an expected-volume line. Doesn't ask for credentials. Check that the
   executable (or `index.html` at the root for HTML) is present, and that symbols, editor files,
   and installers are not.
2. `butler validate <dir>` (offline) exits with code 0. Without an `.itch.toml` it lists the
   file the itch app would launch; with one, it fails on a parse error or an action with a
   missing path.
3. After a real push, `butler status <user>/<game>` shows the channel with the new build and
   user-version.
4. Ask the user to open the page logged out (or in private browsing), download or play the
   build, and confirm it starts.

## Pitfalls

- **Pushing an installer.** itch patches portable builds; an installer `.exe`/`.msi` breaks
  patching and the itch app's auto-update, and may require admin rights the player doesn't have
  → push the bare build folder, never an installer.
- **Already-compressed builds.** A compressed archive, or an archive of archives, makes every
  patch huge because a small change rewrites the whole blob → push flat files, let butler
  compress itself.
- **Channel typo creating duplicate downloads.** `windows` and `win-final` are two separate
  files on the page → fix channel names from the first push and never vary the spelling.
- **HTML5 game displayed as a download.** Two settings, neither set by the channel name: the
  page's *Kind* = HTML, and the channel checked as playable in browser on *Edit game* → check
  both after creating any HTML channel.
- **Blank or 403 HTML5 page.** `index.html` must be at the upload root; the CDN is case-sensitive,
  serves the game from a subfolder (absolute paths starting with `/` break, use relative paths),
  returns 403 for folder URLs, and only allows HTTPS requests to other domains → check relative
  paths and the absence of an intermediate folder before pushing.
- **`invalid target (bad user)` / `(bad game)`.** The target must exactly match the page's
  address, lowercase, and the page must already exist → create the page before the first push,
  never the other way around.
- **macOS `.app` losing its structure.** Push the `.app` folder itself (or its parent); butler
  keeps the bundle as a top-level folder.
- **`--hidden` on an existing channel fails.** This flag only applies at channel creation →
  remove it on a later push, unhide from *Edit game* if needed.
- **API key exposed in a CI log.** A printed `BUTLER_API_KEY` is compromised → revoke it
  immediately on the API keys page.

## References

- [butler manual](https://itch.io/docs/butler/)
- [Pushing builds](https://itch.io/docs/butler/pushing.html)
- [HTML5 uploads](https://itch.io/docs/creators/html5)

## Related skills

- `steam-publish`: the same game on Steam via SteamPipe.
- `game-jam`: most jams run on itch.io; this skill handles the upload once the build is ready.
- `prototype-fast`: sharing an early prototype on a Draft or Restricted page.

## Version notes

Last checked: 2026-11-17. butler's limits and versions change; recheck before quoting a
precise figure.

- **butler**: check the latest release on the official `itchio/butler` repository before a
  pinned CI install.
- **HTML5 limits**: itch.io caps HTML5 uploads by file count, total extracted size, and
  per-file size; these caps can be raised on request — check the official page before relying
  on it for a large web build.
- **AI declaration**: projects with AI-generated content must declare it in the dedicated
  section; asset pages without this declaration risk delisting.
- **Most Recent**: a page only enters Most Recent on its first public release; Draft and
  Restricted pages don't appear there.
