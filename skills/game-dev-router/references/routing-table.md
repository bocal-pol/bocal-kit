# Full routing table — Game Dev Router

Detailed reference for `game-dev-router/SKILL.md`. Open this when the dispatch isn't obvious —
not to be loaded by default on every turn.

## 1. Engine detection (project fingerprint)

Look for the highest-confidence signal; **choose exactly one** engine for the target project. An
explicitly identified in-house/proprietary engine is a valid result even without a cataloged
skill in this list. Check the target's build/runtime entry point before treating an embedded
library/tool as its engine.

| # | Engine | Main signal | Skill root |
|:-:|--------|-------------|-------------|
| 1 | Godot | `project.godot` | `godot-*` |
| 2 | Unreal | `*.uproject` | `unreal-*` |
| 3 | Unity | `Assets/` **and** `ProjectSettings/ProjectVersion.txt` | `unity-*` |
| 4 | Ebitengine | `go.mod` requires `github.com/hajimehoshi/ebiten/v2` | `ebitengine-game` |
| 5 | Bevy | `Cargo.toml` with a `bevy` dependency | `bevy-ecs` |
| 6 | Phaser | `package.json` depends on `phaser` | `phaser-*` |
| 7 | PixiJS | `package.json` depends on `pixi.js` **in a game** (not a dashboard/chart) | `pixijs-rendering` |
| 8 | three.js | `package.json` depends on `three` | `threejs-*` |
| 9 | Defold | `game.project` | `defold-core` |
| 10 | LÖVE | `conf.lua` / `main.lua` calling `love.*` | `love2d-core` |
| 11 | pygame | `*.py` with `import pygame` | `pygame-core` |
| 12 | Roblox | `*.rbxl(x)` / `*.project.json` (Rojo) | `roblox-*` |

**Read the pinned version first.** Once the engine is identified, read its version from the
project metadata or dependency lockfiles before choosing APIs. An existing project keeps its
pinned version unless an explicit migration is requested; the catalog's reference version only
applies to new projects. Each engine skill states its own baseline.

- **Pinned version older than the baseline**: follow the skill's version notes for that range,
  don't use APIs that appeared after the pinned version.
- **Pinned version newer than the baseline** (e.g. a UE 5.9 Preview project against our UE 5.8
  skills): say the skill was written for an earlier version, read the official release notes or
  migration guide for the intermediate versions, and verify any API the skill cites against the
  newer docs before relying on it.

## 2. Task classification (wording → category)

After the engine, read the request for its task signals (three **additive** categories):

- **Disciplines** (cross-engine concepts): `create-game-assets`, `game-ai`,
  `ai-behavior-trees-utility-ai`, `procedural-gen`, `dialogue-systems`, `save-systems`,
  `audio-design`, `shader-programming`, `physics-tuning`, `level-design`, `input-systems`,
  `game-feel`, `camera-systems`, `game-ui-ux`, `performance-optimization`. Triggered by concept
  words ("spritesheet," "pathfinding," "behavior tree," "save slots," "dissolve shader," "screen
  shake," "camera follow," "HUD/menu," "low FPS," "stutter").
- **Genres** (full-game templates): `platformer`, `roguelike`, `rpg`, `fps-shooter`,
  `tower-defense`, `card-game`, `visual-novel`, `survival-crafting`, `puzzle`. Triggered by a
  genre word or a reference game ("make a roguelike," "like Celeste," "deckbuilder").
- **Workflows** (process/publishing): `game-jam`, `prototype-fast`, `steam-publish`,
  `itch-publish`, `game-docs`. Triggered by process words ("publish on Steam," "is this fun?",
  "48h jam," "write a GDD"). Only add `game-docs` if the user asks for docs or a GDD already
  exists; a plain "make a game" or "add a feature" doesn't trigger it.

File signals that refine detection: `*.yarn`/`*.ink` → `dialogue-systems`/`visual-novel`;
`*.rpy` → `visual-novel`; `steam_appid.txt` → `steam-publish`; `.itch.toml` → `itch-publish`;
`*.inputactions` → `unity-input-system`; `BT_`/`BB_`/`EQS_`/`ST_` assets →
`unreal-behavior-trees`.

## 3. Routing table (task → category → skill)

### 3a. Engine skills — read the one matching the detected engine + subtask

- **Godot**: language `godot-gdscript` / `godot-csharp`; structure `godot-nodes-scenes`; signals
  and groups `godot-signals-groups`; 2D `godot-2d-movement`, `godot-tilemap`; 3D
  `godot-3d-essentials`; physics `godot-physics`; UI `godot-ui-control`; animation
  `godot-animation`; shaders `godot-shaders`; data `godot-resources`; audio `godot-audio`;
  networking `godot-multiplayer`; tests and CI tests `godot-gdscript-headless-testing`; export
  and CI export `godot-export`.
- **Unity**: scripting `unity-csharp-scripting`; input `unity-input-system`; **both** 3D and 2D
  physics (`Rigidbody`, `Rigidbody2D`, `Physics2D`) `unity-physics`; animation
  `unity-animation`; data `unity-scriptableobjects`; tilemaps `unity-tilemap-2d`; AI navigation
  `unity-navmesh`; builds `unity-build-pipeline`; build too large `unity-build-size`. Unity VFX
  Graph has no skill here (§7).
- **Unreal**: visual scripting `unreal-blueprints`; C++ gameplay `unreal-cpp-gameplay`; input
  `unreal-enhanced-input`; AI (Behavior Trees, Blackboard, EQS, StateTree) `unreal-behavior-trees`;
  VFX `unreal-niagara`; shipping `unreal-packaging`.
- **Ebitengine**: `ebitengine-game` for 2D games in Go — input, rendering, text, audio,
  state/tests and build. Only load its relevant references.
- **Web**: `phaser-core`, `phaser-arcade-physics`; `pixijs-rendering` (games and playable ads
  only); `threejs-scene-setup`, `threejs-gltf-loading`, `threejs-materials-lighting`. No React
  Three Fiber skill (§7).
- **Others**: `bevy-ecs`, `pygame-core`, `love2d-core`; Defold `defold-core` (collections, game
  objects, scripts, input, messages, factories, proxies, Bob builds); Roblox — language and
  module structure `roblox-luau`, persistence `roblox-datastores`, UI `roblox-ui`,
  remotes/replication/server authority/hit validation `roblox-networking`, character lifecycle
  `roblox-characters`, simulation/constraints/spatial queries `roblox-physics`, place editing and
  testing `roblox-studio-workflow`, simulator/tycoon/idle economy balancing
  `roblox-simulator-economy`.

### 3b. Disciplines — load **together with** the engine skill (concept ↔ engine API)

| Concept (as said) | Discipline skill | Pairs with (engine API) |
|---|---|---|
| art direction, game assets, sprites, tilesets, textures, icons, AI-generated art | `create-game-assets` | the engine's import/render skill |
| enemy AI, FSM, patrol/chase, steering, A* pathfinding, perception | `game-ai` | `unity-navmesh` / `unreal-behavior-trees` / Godot navigation |
| behavior tree code, blackboard, decorator, selector/sequence, utility AI, response curve | `ai-behavior-trees-utility-ai` | `unreal-behavior-trees` for UE assets (BT, EQS, StateTree) |
| procedural generation, seed, dungeon generator, WFC, terrain noise, loot tables | `procedural-gen` | the engine's tilemap/grid skill |
| dialogue, Yarn, Ink, conversation tree, ambient lines | `dialogue-systems` | the engine's UI skill |
| save/load, slots, continue button, corrupted saves, save migration | `save-systems` | `roblox-datastores` / engine IO |
| how an effect works (dissolve, outline, fresnel), GLSL↔HLSL | `shader-programming` | `godot-shaders` / engine material |
| jitter, tunneling, "goes through walls," fixed timestep, mushy physics | `physics-tuning` | `godot-physics` / `unity-physics` / `roblox-physics` |
| level layout, blockout/greybox, key/ability gating, pacing | `level-design` | `godot-tilemap` / `unity-tilemap-2d` |
| rebinding, controller, deadzone, generic input buffering | `input-systems` | `unity-input-system` / `unreal-enhanced-input` / Godot InputMap |
| screen shake, hit-stop, juice, squash & stretch, "make this punchy" | `game-feel` | the engine's animation/tween + `camera-systems` |
| camera follow, deadzone, look-ahead, orbit, first-person view | `camera-systems` | `godot-2d-movement` / `godot-3d-essentials` / Cinemachine |
| HUD, menu, UI layout, scaling, safe area, focus navigation | `game-ui-ux` | `godot-ui-control` / `roblox-ui` / Unity UI (load both) |
| low FPS, stutter, first-use hitch, slows down after X minutes, draw calls, GC spikes | `performance-optimization` | the engine profiler + `physics-tuning` |

### 3c. Ownership on shared requests

When two skills could answer, the one listed as "owner" leads, the other only joins for its
share.

| Request | Owner | The other skill's share |
|---|---|---|
| behavior tree or utility AI code, cross-engine | `ai-behavior-trees-utility-ai` | `game-ai`: FSM, steering, pathfinding, perception, model choice |
| Unreal BT assets, Blackboard, EQS, StateTree | `unreal-behavior-trees` | `ai-behavior-trees-utility-ai`: portable BT logic only |
| coyote time, jump buffer, variable jump height | `platformer` | `input-systems`: generic buffering/rebind; `game-feel`: juice |
| dungeon or level generation algorithms | `procedural-gen` | `roguelike`: run structure, permadeath, meta-progression |
| roguelike deckbuilder | `card-game` | `procedural-gen` for card generation only |
| items, equipment, rarity, stats | `rpg` | `survival-crafting`: gathering, recipes, carry weight, spoilage |
| plain "inventory" with no further detail | none alone | pick from the details above, or ask a question |
| collision layers, jitter, tunneling, feel | `physics-tuning` | the engine's physics skill: the API (`unity-physics` also covers 2D) |
| Roblox replication, remotes, server authority, hit validation | `roblox-networking` | `roblox-luau`: language, modules; `roblox-physics`: simulation, raycast API |
| Godot CI tests | `godot-gdscript-headless-testing` | `godot-export`: export presets and CI export |
| menu/HUD design rules vs. engine UI API | `game-ui-ux` | the engine's UI skill: the API; load both for engine UI work |
| audio or shader technique vs. engine API | `audio-design` / `shader-programming` | `godot-audio` / `godot-shaders` etc.: engine syntax |

For Roblox, compose cross-engine concepts with the targeted engine skill: HUD/menu requests →
`roblox-ui` + `game-ui-ux` (+ `input-systems` for gameplay bindings); exploit/remote-replication
requests → `roblox-networking` + `roblox-luau`; respawn/rig requests → `roblox-characters`;
simulation/physics-query requests → `roblox-physics` (+ `physics-tuning` for stability);
simulator/tycoon/clicker/idle economy requests (upgrade costs, rebirths, offline earnings, big
numbers, egg/crate probabilities) → `roblox-simulator-economy` + `roblox-networking` (+
`roblox-datastores` for saving); direct place editing also uses `roblox-studio-workflow`.

For Ebitengine, bind engine-specific spots to `ebitengine-game` and its relevant reference
(input, rendering, text/UI, audio, gameplay, tilemaps, or state/tests). Only add the disciplines
needed; don't load Godot or Unity APIs from a genre's binding examples. This 2D skill provides
neither native 3D nor a ready-made network backend — flag these gaps when relevant.

For Defold, bind engine-specific spots (movement, input, spawn, level loading, build) to
`defold-core` and only add the disciplines needed, e.g. "add player movement to my Defold game"
→ `defold-core` + `input-systems` (+ `platformer` for a platforming game). Defold doesn't yet
have a dedicated GUI, tilemap, or physics skill; use `defold-core` and its build-reference
pointers, and flag the gap.

### 3d. Genres — load **together with** the engine skill

A genre skill owns the design and structure; it never replaces the engine skill. Load the genre
and the engine skill together, then only the disciplines the request calls for.

| Genre (as said) | Pairs with |
|---|---|
| platformer, like Celeste, jump feel, coyote time, jump buffer, wall jump | engine movement (`godot-2d-movement` / `phaser-arcade-physics` / `unity-physics`) + `level-design` + `camera-systems` + `game-feel` |
| roguelike, roguelite, permadeath, meta-progression, daily seed | `procedural-gen` (generation) + engine tilemap + `game-ai` + `save-systems` |
| RPG, stats, XP curve, damage formula, equipment, quests | `godot-resources`/`unity-scriptableobjects` + `dialogue-systems` + `save-systems` + `game-ui-ux` |
| FPS, first-person shooter, hitscan, recoil, TTK | `godot-3d-essentials`/`unreal-cpp-gameplay` + `input-systems` + `game-ai` + `camera-systems` + `game-feel` |
| tower defense, waves, lanes, tower targeting | `game-ai` + engine movement + `level-design` + `game-ui-ux` |
| card game, deckbuilder, roguelike deckbuilder, TCG | `godot-resources`/`unity-scriptableobjects` + `game-ui-ux` (+ engine UI) |
| visual novel, dating sim, branching story, Ren'Py | `dialogue-systems` + `save-systems` + `game-ui-ux` |
| survival, crafting, gathering, carry weight, spoilage | `save-systems` + `godot-resources`/`unity-scriptableobjects` + `procedural-gen` + `game-ui-ux` |
| puzzle, match-3, Sokoban, grid logic, undo | `godot-tilemap`/`unity-tilemap-2d` + `level-design` + `game-feel` |

### 3e. Workflows — engine-independent

`game-jam` (jam, 48h, Ludum Dare/GMTK, "what do we cut") · `prototype-fast` ("prototype this,"
"is this fun," greybox a mechanic) · `steam-publish` (SteamPipe uploads, depots, store review;
`steam_appid.txt`) · `itch-publish` (itch.io, butler; `.itch.toml`) · `game-docs` (GDD, design
note, sync the GDD; only on request or if a GDD already exists). Steamworks SDK calls in the
game's own code (achievements, overlay, lobbies) have no skill: point to the engine binding
(GodotSteam, Steamworks.NET or Facepunch.Steamworks, Online Subsystem Steam) and say so.

## 4. Official vendor tools

Some engine vendors ship their own skills or editor connections. When the session already has
one, split the work:

| Vendor tool in session | Signals |
|---|---|
| Official Unity skills or agent plugin | skill names such as `unity-cli`, `unity-pipeline`, `create-2d-physics`, `initialize-ai-navigation`, or a `unity:` prefix |
| Roblox Studio agent plugin or Studio MCP | `roblox-get-started` skill, Studio tools like `list_roblox_studios` or `execute_luau` |
| Epic's Unreal plugin | `unreal-mcp` skill or Unreal editor tools |
| OpenAI's `game-studio` plugin | skills such as `game-studio`, `phaser-2d-game`, `three-webgl-game`, `react-three-fiber-game` |

- **Theirs**: live editor actions — creating/editing scenes and assets, launching, playtesting,
  profiling, capturing — and topics not covered here (Unity UI Toolkit, URP, IAP, Gaming
  Services; Roblox live profiling and configs; React Three Fiber).
- **Ours**: verified patterns, version pitfalls, ownership rules, and end-of-skill checks. Route
  our checks through their editor connection when possible.
- For a browser game, don't load both `game-studio` and our web skills for the same subtask.
- **Never install** a vendor plugin, skill, or MCP on the user's behalf. State what it is and let
  the user decide. Without it, use our skills alone and state which checks couldn't run.

## 5. Reading protocol (progressive disclosure)

1. **Preloaded**: only each skill's `name` + `description` are in context. Decide from that and
   the fingerprint — do **not** pre-read the bodies.
2. **On selection**: read the body of **each chosen skill** — and only those. Never load an
   entire category at once.
3. **On demand**: read a skill's `references/` file only when the subtask needs that depth (the
   skill body says so).
4. **Re-route on pivot**: if the task changes (movement → saving), select and read the newly
   relevant skill instead of keeping everything loaded.

## 6. Composition rules

- **One engine, additive concepts.** Use its engine skill set where one exists; for an
  unsupported engine, use project evidence as the API binding. Add the needed disciplines and
  generally **at most one** genre. Workflows attach independently.
- **Order**: engine fundamentals → discipline concept → genre binder → workflow. For asset
  production, validate the visual target before generating a family, then finish with engine
  import settings and an in-context capture.
- **Ownership on overlap**: the **engine** skill owns the API/syntax; the **discipline** skill
  owns the portable concept/algorithm and defers to the engine skill for code; the **genre**
  skill owns the structure/binder and defers rather than re-teaching a primitive. Shared
  requests follow §3c.

## 7. Unknown engine & missing skill

**Unknown engine** (no fingerprint, no named engine):

1. Look for an engine name spelled out in the request. If found, adopt it.
2. If the task is a pure concept/genre/workflow question, route directly to the agnostic
   skill — no engine needed.
3. If the engine choice genuinely blocks the answer, ask **one** targeted question. For a **new
   project** with no existing engine or preference, **default to Godot** (the best-covered one
   here), stating this.
4. Never invent an engine or load an engine skill on a guess.

**In-house, proprietary, or unsupported engine**: keep that engine and its toolchain. Map the
relevant discipline/genre concepts onto the project's verified APIs (local docs,
headers/sources, examples, build/test commands). No catalog engine skill is required. Never
switch engines or invent a compatible API.

**Cataloged engine but no skill covers the subtask**: load the closest skill for that same
engine plus the relevant discipline and **flag the gap** clearly. Known gaps: Unity VFX Graph
(not `unreal-niagara`), React Three Fiber, Steamworks SDK calls in game code, building Unreal
from source, no dedicated Unity 2D-movement skill (use `unity-physics`, which covers
Rigidbody2D). Never fabricate a skill name.

**Multiple or conflicting genres**: pick the dominant genre from the wording; mention the
secondary one and offer to load it if the user confirms.

## Worked examples

| Request | Detected engine | Skills loaded (in order) |
|---|---|---|
| "add a double jump to my Godot player" | Godot (`project.godot`) | `godot-2d-movement` → `platformer` |
| "my jump feels mushy, add coyote time" (Phaser) | Phaser (`package.json`) | `phaser-arcade-physics` → `platformer` |
| "make an inventory for my Unity RPG" | Unity (`Assets/`+`ProjectSettings/`) | `unity-scriptableobjects` → `rpg` → `save-systems` |
| "my Rigidbody2D goes through the floor" | Unity | `unity-physics` (2D reference) → `physics-tuning` if tunneling |
| "the enemy should use EQS to find cover" | Unreal (`*.uproject`) | `unreal-behavior-trees` |
| "add an inventory to my proprietary C++ RPG" | existing in-house engine | in-house reference → `rpg` + `save-systems`; bind data/UI to the project's verified APIs |
| "make a 2D puzzle game in Go with Ebitengine" | Ebitengine (named; then `go.mod`) | `ebitengine-game` → `puzzle` |
| "add player movement to my Defold game" | Defold (`game.project`) | `defold-core` → `input-systems` |
| "exploiters are spamming my sword remote" | Roblox (`*.project.json` / place file) | `roblox-networking` → `roblox-luau` |
| "my Roblox simulator's rebirths take forever" | Roblox | `roblox-luau` → `roblox-simulator-economy` → `roblox-networking` |
| "procedural roguelike dungeon in Godot" | Godot | `godot-tilemap` → `procedural-gen` → `roguelike` |
| "run my GDScript tests in GitHub Actions" | Godot | `godot-gdscript-headless-testing` |
| "how do I design save slots with migration?" | (none) | `save-systems` alone |
| "publish my game on itch with butler" | (any/none) | `itch-publish` alone |
| "I want to make a game but don't know what with" | unknown → ask, default Godot | one question, then e.g. `godot-nodes-scenes` |
| "my Unity game drops to 30 FPS, optimize it" | Unity | `performance-optimization` (profiler first) → engine skill |
| "make a cohesive pixel art set for player + enemy" | (detected engine) | `create-game-assets` → the relevant engine import/render skill |
