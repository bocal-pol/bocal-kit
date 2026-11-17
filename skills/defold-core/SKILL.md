---
name: defold-core
description: "Defold 1.14 games in Lua: collections, game objects, input focus, `msg.post` messaging, factories, collection proxies, and Bob builds. Auto-invoke on `.collection`/`.script` files, an `on_input` that never fires, a proxy that never loads, or \"could not be found when dispatching message\". Not for LÖVE (`love2d-core`, also Lua but `main.lua`/`conf.lua`), HUD rules (`game-ui-ux`), or physics feel (`physics-tuning`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Defold Core

Defold structures a game as editor files (collections, game objects) and lifecycle-driven Lua
scripts, addressed by URL and connected through asynchronous messages. Examples target
**Defold 1.14.1**; an existing project keeps its own version — never migrate without an explicit
request.

> Adapted/translated from the `defold-core` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Adding or fixing game objects, collections, scripts, input, messages, spawning, or level loading
  in a Defold project (`game.project` at the root, `.collection`, `.go`, `.script`, `.gui_script`
  files), or when Bob reports a missing resource.

**Not this skill**: pure Lua or LÖVE projects belong to `love2d-core` (`main.lua` and `conf.lua`
files, not `game.project`); GUI layout, sprites, tilemaps, and physics depth beyond reference
pointers; portable design (HUD, physics feel) belongs to `game-ui-ux` and `physics-tuning`.

## Main workflow

1. **Inspect first.** Read `game.project` (`[bootstrap] main_collection`, `[input]
   game_binding`, `[project] dependencies`), the main collection, and the scripts near the
   request. Follow the existing project's folder structure and id/message naming; do not
   reorganize it.
2. **Edit the right file type.** Game objects (`.go`) carry components; collections
   (`.collection`) place game objects and other collections; logic goes in `.script` (game
   objects), `.gui_script` (GUI), or shared `.lua` modules. Editor files are protobuf text: keep
   their structure.
3. **Check references.** Fix every `ERROR` (a missing or mis-cased `/` path, a `game.project` path
   missing the compiled `c` suffix, a `require` pointing to a nonexistent file).
4. **Build with Bob.** `java -jar bob.jar --root . --variant headless --archive resolve
   build` requires JDK 25 and a `bob.jar` matching the project's Defold version. Exit code 1 with
   an `ERROR:` line signals a broken reference or a Lua syntax error.
5. **Run it.** A build does not prove the game works. Run a headless bundle under a timeout and
   read the log: `ERROR:SCRIPT:` = Lua runtime errors, `ERROR:GAMEOBJECT:` = bad addresses or
   socket conflicts. The headless engine has no keyboard, mouse, or screen — for input, rendering,
   or layout, ask the user to launch the game (editor, or desktop bundle) and report what they
   see.

## Patterns

### 1. Project and resource references

`game.project` is a root INI file. Resource paths are always root-absolute
(`/main/player.go`). Inside `game.project`, they name the **compiled** file, so the source path
gains a trailing `c`:

```ini
[bootstrap]
main_collection = /main/main.collectionc

[input]
game_binding = /input/game.input_bindingc
```

### 2. Script lifecycle, `self`, and properties

```lua
go.property("speed", 200)                   -- root level only, literal default

local LEFT = hash("left")                   -- hash ids once, not every frame
local RIGHT = hash("right")
local FIRE = hash("fire")

function init(self)
	msg.post(".", "acquire_input_focus")    -- without focus, on_input never fires
	self.held = {}                          -- per-instance state lives on self
end

function update(self, dt)
	local dir = (self.held[RIGHT] and 1 or 0) - (self.held[LEFT] and 1 or 0)
	if dir ~= 0 then
		local pos = go.get_position()
		pos.x = pos.x + dir * self.speed * dt    -- scaled by dt: same speed at any framerate
		go.set_position(pos)
	end
end

function on_input(self, action_id, action)
	if action_id == LEFT or action_id == RIGHT then
		if action.pressed then self.held[action_id] = true
		elseif action.released then self.held[action_id] = nil end
		return true                         -- consumed: listeners further down never see it
	elseif action_id == FIRE and action.pressed then
		factory.create("#bulletfactory", go.get_position(), nil,
			{ velocity = vmath.vector3(0, 600, 0) })
		return true
	end
end

function final(self)
	msg.post(".", "release_input_focus")
end
```

Callbacks: `init`, `final`, `fixed_update`, `update`, `late_update`, `on_message`, `on_input`,
`on_reload`. `fixed_update` runs 0..N times per frame depending on `[engine]
fixed_update_frequency`; also set `[physics] use_fixed_timestep = 1` so physics aligns with it.

### 3. Addressing and messages

A URL is `[socket:][path][#fragment]`: `"."` this object, `"#"` this component, `"#sprite"` a
sibling component, `"enemy#ai"` a relative object, `"/manager#controller"` an absolute object,
`"main:/loader#loader"` an object in another world.

```lua
msg.post("/manager#controller", "enemy_spotted", { id = go.get_id() })

function on_message(self, message_id, message, sender)
	if message_id == hash("enemy_spotted") then
		print("from", sender, "id", message.id)
	end
end
```

Messages are queued and dispatched later in the frame; the table is capped at 2 KB. A bad address
logs `ERROR:GAMEOBJECT: Instance '/x' could not be found when dispatching message`.

### 4. Factories and spawning

```lua
-- "#bulletfactory" factory component -> one game object; properties override go.property
local id = factory.create("#bulletfactory", pos, nil, { velocity = vmath.vector3(0, 600, 0) })

-- "#wavefactory" collectionfactory component -> table of collection ids -> new instance ids
local ids = collectionfactory.create("#wavefactory", vmath.vector3(480, 500, 0))
local leader = ids[hash("/leader")]
go.delete(ids, true)                        -- later: delete them along with their children
```

### 5. Collection proxy (loading another world)

```lua
-- excerpt from the loading script; the "#levelproxy" component is a collectionproxy
function init(self)
	msg.post(".", "acquire_input_focus")        -- otherwise the loaded world gets no input
	msg.post("#levelproxy", "async_load")
end

function on_message(self, message_id, message, sender)
	if message_id == hash("proxy_loaded") then
		msg.post(sender, "init")
		msg.post(sender, "enable")
	elseif message_id == hash("level_done") then
		msg.post("#levelproxy", "unload")       -- disables then finalizes
	end
end
```

The loaded world's socket is the loaded collection file's **`name:`**: its scripts respond via
`msg.post("main:/loader#loader", ...)`.

## Verify

```sh
java -jar bob.jar --root . --variant headless --archive resolve build
# then run the headless bundle under a timeout, read the log
timeout 30 ./build/default/dmengine_headless; echo "exit=$?"
```

1. Bob exits with code 0, no `ERROR:` line in its output.
2. The headless engine's log contains no `ERROR:SCRIPT:` or `ERROR:GAMEOBJECT:` line for the
   path under test; have the test print a final line to rely on rather than the exit code alone.
3. For input, rendering, or layout changes, ask the user to launch the game (editor or desktop
   bundle) and report what they observe — the headless engine has no keyboard, mouse, or screen.

## Pitfalls

- **Bob: `the bootstrap.main_collection '/main/main.collectio' can't be found`** → the setting is
  missing the compiled suffix and Bob truncated the last letter. Write
  `/main/main.collectionc` (likewise `input.game_binding` → `.input_bindingc`).
- **Bob: `ERROR: … the prototype '/main/x.go' can't be found`** → a component embedded in a `.go`
  points to a missing file. Search for the cited path (`/main/x.go`) in the sources.
- **`on_input` never fires** → the object never sent `acquire_input_focus`, the action name
  differs from the binding, `input.game_binding` points elsewhere, or a listener higher on the
  stack returns `true`.
- **Dead input inside a level loaded through a proxy** → the game object carrying the collection
  proxy never acquired input focus.
- **`already a socket with the same name` and the proxy never sends `proxy_loaded`** → the loaded
  collection's `name:` matches a world already loaded. Give each proxied collection a unique name.
- **`fixed_update` never runs** → `[engine] fixed_update_frequency` is 0 (default 60). For
  physics, also set `[physics] use_fixed_timestep = 1`.
- **`module 'modules.util' not found` at runtime despite a successful Bob build** → a `require`
  used slashes (`require "modules/util"`). Use a dotted path from the project root,
  `require "modules.util"`.
- **HTML5 build shows a black screen or shader errors on old WebGL 1 devices, after migrating to
  1.14.1** → 1.14.1 excludes GLES 2.0 / WebGL 1 shader compilation by default. Set
  `[shader] exclude_gles_sm100 = 0` in `game.project` if the game must still run there.
- **Bob fails immediately with `UnsupportedClassVersionError … class file version 69.0`** → Bob
  1.14.x requires Java 25; an older JDK is on the `PATH`.
- **`tostring(id)` prints `hash: [<unknown:…>]`** → hashes only keep their source text in debug
  builds. Compare hashes, never their strings.
- **A second engine logs `Failed to initialize Remotery`, or a test never finishes** → the debug
  engine opens an engine service, a log server, and a profiler port and waits indefinitely with no
  `sys.exit`. Run only one engine at a time, always under a timeout.

## References

- [Bob manual](https://defold.com/manuals/bob/): full build commands, variants, platforms.
- [stable info.json](https://d.defold.com/stable/info.json) for the latest stable version.

## Related skills

- `ebitengine-game`, `bevy-ecs`, `pygame-core`, `love2d-core`: the other niche engines in the
  catalog.
- `input-systems`: rebinding, gamepad support, and buffering on top of Defold bindings.
- `game-ui-ux`: HUD and menus built with GUI scenes and `.gui_script`.
- `physics-tuning`: fixed step and collision tuning for collision objects.
- `camera-systems`: follow/deadzone logic, typically applied in `late_update`.
- `save-systems`: save formats and slots, combined with `sys.save`/`sys.load`.
- `game-feel`: juice built from `go.animate` and timers.

## Version notes

Last checked: 2026-11-17.

- Defold 1.14.1 became the stable version on 2026-11-10; 1.14.0 shipped on 2026-10-12.
- 1.14.1 changes relevant here: GLES 2.0 / WebGL 1 shaders excluded by default
  (`[shader] exclude_gles_sm100` now defaults to 1), `action.source` in `on_input`.
- Bob 1.14.1 requires OpenJDK 25 (class file version 69).
- Sources: [1.14.1 release](https://github.com/defold/defold/releases/tag/1.14.1),
  [Bob manual](https://defold.com/manuals/bob/).
