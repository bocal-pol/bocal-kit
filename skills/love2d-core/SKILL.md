---
name: love2d-core
description: "LÖVE (Love2D) 11.x games in Lua: `main.lua` callbacks, `conf.lua`, fixed steps, crisp pixel art scaling, `love.filesystem` saves, and scripted runs. Auto-invoke when `main.lua` calls `love.*`, or on blurry pixel art, the blue error screen, or framerate-linked speed. Not for Defold (`defold-core`, also Lua but `game.project`/`.script`) or engine-agnostic saving/input (`save-systems`, `input-systems`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# LÖVE (Love2D) Core

LÖVE is a callback-driven 2D framework in Lua (`love.load`, `love.update`, `love.draw`...). New
code targets **LÖVE 11.5**, the current stable version; 12.0 has not shipped and changes some
APIs, so never copy a 12.0 example into an 11.x project.

> Adapted/translated from the `love2d-core` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Starting a LÖVE game, or fixing its loop, timing, input, drawing, scaling, saving, or screen
  flow.
- Any folder with a `main.lua` calling `love.*`, a `conf.lua`, or a `.love` archive.

**Not this skill**: Defold (also Lua, but with `game.project` and `.script` files) belongs to
`defold-core`; advanced physics joints, shaders, and networking exceed this skill; portable design
(saving, rebinding) is owned by dedicated skills.

## Main workflow

1. **Read `conf.lua` first.** `t.version` names the target LÖVE version and `t.identity` the save
   folder. Keep the project's version; ask before porting between 0.10, 11, and 12.
2. **Load once, draw often.** Create images, fonts, canvases, and sounds in `love.load` (or a
   loader), never inside `love.draw` or `love.update`.
3. **Simulate by steps.** Scale movement by `dt`; for physics, collisions, or replays, use a
   fixed-step accumulator.
4. **Wrap world drawing in `push`/`pop`** and draw the HUD after `pop`, in screen space.
5. **Verify.** Add the `--frames` check, run it under a timeout, read the output, and open the
   screenshot in the save folder. Ask the user to play briefly and report on speed, controls, and
   audio.

## Patterns

### 1. conf.lua with an error net for scripted runs

```lua
function love.conf(t)
    t.version = "11.5"               -- warns if run on a different LÖVE version
    t.identity = "my-game"           -- save folder name; fix it before the first release
    t.window.width, t.window.height = 960, 540
end

-- Under --frames, print errors and exit with code 1 instead of the blue error screen.
-- conf.lua runs before main.lua, so this also catches main.lua syntax errors.
if arg and table.concat(arg, " "):find("--frames", 1, true) then
    function love.errorhandler(msg)
        print("ERROR: " .. tostring(msg) .. debug.traceback("", 2))
        return function() return 1 end
    end
end
```

### 2. Fixed step and scripted run

```lua
local STEP = 1 / 60
local acc = 0
local check = { frames = nil, shot = nil, count = 0 }
local player

function love.load(args)             -- args: command-line arguments after the game folder
    for i, a in ipairs(args) do
        if a == "--frames" then check.frames = tonumber(args[i + 1]) end
        if a == "--shot" then check.shot = args[i + 1] end
    end
    love.graphics.setDefaultFilter("nearest", "nearest")  -- before any newImage/newCanvas
    player = { x = 100, y = 100, speed = 120 }            -- pixels per second
end

local function step(dt)
    local dx = (love.keyboard.isDown("right") and 1 or 0)
             - (love.keyboard.isDown("left") and 1 or 0)
    player.x = player.x + dx * player.speed * dt
end

function love.update(dt)
    acc = acc + math.min(dt, 0.25)   -- caps stalls to avoid a runaway accumulator
    while acc >= STEP do
        step(STEP)
        acc = acc - STEP
    end
    check.count = check.count + 1
    if check.frames and check.count == check.frames and check.shot then
        love.graphics.captureScreenshot(check.shot)       -- saved to the save folder
    elseif check.frames and check.count > check.frames then
        print("RUN OK frames=" .. check.frames .. " save=" .. love.filesystem.getSaveDirectory())
        love.event.quit(0)
    end
end
```

`love.keypressed(key, scancode, isrepeat)` for one-shot actions; `love.keyboard.isDown` inside
`step` for held movement.

### 3. Pixel art canvas and integer-scale camera

```lua
local W, H = 320, 180
local canvas                         -- create in love.load, after setDefaultFilter

function love.draw()
    love.graphics.setCanvas(canvas)
    love.graphics.clear(0.1, 0.1, 0.12)
    love.graphics.push()
    love.graphics.translate(-math.floor(cam.x), -math.floor(cam.y))  -- whole pixels
    drawWorld()
    love.graphics.pop()              -- every push needs a pop, even on an early return
    drawHud()                        -- screen space, after pop
    love.graphics.setCanvas()

    local w, h = love.graphics.getDimensions()
    local s = math.max(1, math.floor(math.min(w / W, h / H)))  -- integer scale only
    love.graphics.draw(canvas, math.floor((w - W * s) / 2), math.floor((h - H * s) / 2), 0, s, s)
end
```

### 4. Saving to the dedicated folder

```lua
local function save_game(data)
    love.filesystem.write("save.lua", "return " .. serialize(data))
end

local function load_game()
    if not love.filesystem.getInfo("save.lua") then
        return nil  -- no save: first launch
    end
    local chunk = love.filesystem.load("save.lua")
    return chunk()
end
```

## Verify

```sh
love --version
timeout 30 love . --frames 120 --shot frame.png; echo "exit=$?"
```

1. The output contains `RUN OK` and the exit code is 0; exit code 1 prints the Lua error and its
   traceback; exit code 124 means the game hung or the error net is missing.
2. The PNG screenshot is in the save folder shown, not in the project folder.
3. On a Linux machine with no display, use `xvfb-run -a love . …`; if OpenAL finds no audio
   device, point `ALSA_CONFIG_PATH` at a file containing `pcm.!default { type null }`.
4. Ask the user to play briefly and report on speed, controls, and audio.

## Pitfalls

- **Blurry pixel art** → images default to linear filtering. Call
  `love.graphics.setDefaultFilter("nearest", "nearest")` before creating images, fonts, or
  canvases, draw to a low-resolution canvas, scale it by an integer, and round camera offsets.
- **`Maximum stack depth reached (more pushes than pops?)`** → a `push` with no matching `pop`,
  often skipped by an early `return` inside `love.draw`. The stack survives across frames, so the
  error shows up a few frames later.
- **Save file missing from the project folder** → `love.filesystem.write` only writes to the save
  folder (`love.filesystem.getSaveDirectory()`, named by `t.identity`). The game folder is
  read-only. Changing `t.identity` after release orphans players' saves.
- **A module's state resets or duplicates** → it was required under two spellings.
  `require("screens.menu")` and `require("screens/menu")` load two separate copies. Always use
  dotted paths from the game root.
- **The same "random" level every run** → LuaJIT's `math.random` is not seeded at startup, while
  `love.math.random` is. Use `love.math.random` (or `love.math.newRandomGenerator(seed)` for
  replayable runs).
- **Speed that changes with framerate, or objects passing through after a stall** → scale by `dt`,
  cap it, and simulate physics/collisions at a fixed rate.
- **The game hangs on the blue error screen during a scripted run** → the default error handler
  waits for the user. Use the `conf.lua` hook above.
- **Colors come out white or fully opaque** → in 11.x, colors are 0–1. `setColor(128, 234, 255)`
  draws white; use `love.math.colorFromBytes(128, 234, 255)` for byte values.
- **Everything is tinted after a single `setColor`** → color is global state. Reset it with
  `love.graphics.setColor(1, 1, 1)` before drawing images and text.
- **`love.conf` has no effect** → it must be in `conf.lua`, which runs before `main.lua`.
- **Holding a key only fires `love.keypressed` once** → key repeat is disabled by default.
  `love.keyboard.setKeyRepeat(true)` enables it.
- **Memory climbs and frames slow down** → `newFont`, `newImage`, or `newCanvas` is called every
  frame. Create them once and reuse them.

## References

- [love2d.org](https://love2d.org/) and its wiki: full reference for callbacks and modules.
- [LÖVE releases](https://github.com/love2d/love/releases) for changes between versions.

## Related skills

- `ebitengine-game`, `bevy-ecs`, `pygame-core`, `defold-core`: the other niche engines in the
  catalog.
- `save-systems`: save formats, slots, and migration, beyond `love.filesystem.write`.
- `input-systems`: rebinding and gamepad support.
- `game-feel`, `audio-design`: portable juice and audio mix to apply to this engine.

## Version notes

Last checked: 2026-11-17.

- LÖVE 11.5 (2023-12-03) is the latest stable version; 12.0 has no stable release yet.
- Sources: [LÖVE releases](https://github.com/love2d/love/releases),
  [love.filesystem](https://love2d.org/wiki/love.filesystem).
