---
name: pygame-core
description: "2D games in Python with pygame-ce (imported as `pygame`): event-update-draw loop, delta time, `Surface`/`Rect`/`FRect`, sprite groups, audio, and headless tests. Auto-invoke when the code imports `pygame`, or on a window that stops responding, speed that varies by machine, or a conflict between `pygame` and `pygame-ce`. Not for engine-agnostic rebinding/input (`input-systems`), saving (`save-systems`), or platformer jump feel — this skill owns the loop and the pygame API, not portable design."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# pygame Core

pygame-ce is the maintained community fork of pygame: it installs as `pygame-ce` and imports as
`pygame`. Legacy `pygame` 2.6 code runs almost unchanged; only pygame-ce-specific APIs (`FRect`,
`get_frect()`) require the fork, detectable with `getattr(pygame, "IS_CE", False)`.

> Adapted/translated from the `pygame-core` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Starting a pygame game, or fixing its loop, speed, input, drawing, sprite groups, collisions,
  audio, or text.
- Any project with `import pygame`, regardless of which package provides it.

**Not this skill**: Python questions unrelated to pygame; 3D; portable design (rebinding, saving,
platformer feel) owned by `input-systems`, `save-systems`, and the genre skills.

## Main workflow

1. **Check the install.** `python -c "import pygame; print(pygame.version.ver,
   getattr(pygame, 'IS_CE', False))"`. Keep the project's package; for a new project,
   `pip install pygame-ce`.
2. **Keep logic testable.** Put rules in classes/functions that take `dt` and an input snapshot,
   so a test can drive them without a window. Only the loop touches the display.
3. **One loop per frame**: drain events, update with a capped `dt`, draw, `flip()`. Use pixels per
   second and floating-point positions (`FRect` or `Vector2`).
4. **Load assets after `set_mode`**, then `convert()` / `convert_alpha()` each one once.
5. **Verify headless.** Run the tests and a short scripted run with the dummy drivers, then open
   the saved PNG. Ask the user to play for a minute and report on speed, controls, and sound.

## Patterns

### 1. Headless-compatible loop

```python
import argparse
import pygame

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", type=int, default=0, help="quit after N frames (0 = keep running)")
    ap.add_argument("--shot", help="save the last frame to this PNG")
    args = ap.parse_args(argv)

    pygame.init()
    screen = pygame.display.set_mode((320, 180), pygame.SCALED)  # before any convert()
    clock = pygame.time.Clock()
    sprites = pygame.sprite.Group(Player((160, 90)))

    frame, running = 0, True
    while running:
        dt = min(clock.tick(60) / 1000, 0.05)          # caps stalls (drag, debugger)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        sprites.update(dt, pygame.key.get_pressed())
        screen.fill((18, 18, 28))
        sprites.draw(screen)
        pygame.display.flip()
        frame += 1
        if args.frames and frame >= args.frames:
            if args.shot:
                pygame.image.save(screen, args.shot)
            running = False
    pygame.quit()
```

### 2. Sprite with floating-point position and normalized movement

```python
class Player(pygame.sprite.Sprite):
    def __init__(self, pos):
        super().__init__()
        self.image = pygame.image.load("player.png").convert_alpha()
        self.rect = self.image.get_frect(center=pos)   # FRect keeps sub-pixel positions
        self.speed = 120                                # pixels per second

    def update(self, dt, keys):
        move = pygame.Vector2(keys[pygame.K_RIGHT] - keys[pygame.K_LEFT],
                              keys[pygame.K_DOWN] - keys[pygame.K_UP])
        if move.length_squared():                       # a zero vector cannot be scaled
            move.scale_to_length(self.speed * dt)        # same speed diagonally
        self.rect.center += move
```

`KEYDOWN` / `MOUSEBUTTONDOWN` for one-shot actions (jump, pause, click); `key.get_pressed()` for
held movement.

### 3. Groups, z-order, and pixel-perfect collision

```python
all_sprites = pygame.sprite.LayeredUpdates()  # explicit z-order, unlike Group
all_sprites.add(background_sprite, layer=0)
all_sprites.add(player, layer=1)
all_sprites.add(hud_sprite, layer=2)

hits = pygame.sprite.spritecollide(player, enemies, False, pygame.sprite.collide_mask)
for enemy in hits:
    player.take_damage()  # collide_mask: pixel-perfect collision via sprite masks
```

### 4. Defensive audio (server, CI, machine with no sound card)

```python
pygame.init()  # never raises; returns (succeeded, failed) and silently disables the mixer
if pygame.mixer.get_init() is None:
    sound_enabled = False  # check explicitly before playing a sound
else:
    sound_enabled = True
    hit_sound = pygame.mixer.Sound("hit.wav")
```

### 5. Cached text (avoids re-rendering every frame)

```python
class CachedText:
    def __init__(self, font):
        self.font = font
        self._cache_value = None
        self._surface = None

    def render(self, value, color):
        if value != self._cache_value:               # only re-render if the string changed
            self._surface = self.font.render(str(value), True, color)
            self._cache_value = value
        return self._surface
```

## Verify

```sh
SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy python -m unittest -v
SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy python main.py --frames 120 --shot frame.png
```

1. Unit tests (dummy drivers, `pygame.display.set_mode((1, 1))` in `setUp`) pass without a real
   window.
2. A scripted run (`--frames N --shot frame.png`) produces a PNG at the logical size (not the
   scaled window size) showing the expected state.
3. The loop raises no exception under the dummy drivers — proof that loading and drawing work, not
   that pacing or control feel is correct.
4. Ask the user to play a real session and report on speed, controls, and sound.

## Pitfalls

- **The window freezes or shows "not responding"** → the event queue is not drained every frame.
  Call `pygame.event.get()` (or `pygame.event.pump()`) once per frame, including in menus and
  loading screens.
- **The game runs faster on a faster machine** → movement per frame instead of per second. Scale
  by `dt` from `clock.tick()`.
- **Objects jump or pass through walls after a window drag or a breakpoint** → the next
  `clock.tick()` returns the entire elapsed delay. Cap it:
  `min(clock.tick(60) / 1000, 0.05)`.
- **Slow movement sticks or jitters** → `Rect` stores integers and truncates every update
  (`rect.x += 0.5` never moves). Use `get_frect()` / `FRect` (pygame-ce) or keep a `Vector2` and
  assign `rect.center` from it.
- **`ValueError: Can't normalize Vector of length zero`** → `normalize()` / `scale_to_length()`
  ran with no key pressed. Check `length_squared()` first.
- **`pygame.error: No convert format has been set`** → `convert()` / `convert_alpha()` ran before
  `display.set_mode()`. Load images after the window opens.
- **Blits are slow** → the images were never converted. Convert each one once at load time.
- **`pygame.error: mixer not initialized`** on a server, in CI, or with no sound card →
  `pygame.init()` does not raise if a module fails; set `SDL_AUDIODRIVER=dummy` when headless, or
  check `pygame.mixer.get_init()` before playing sound.
- **Text rendering eats the frame budget** → `font.render` is called every frame. Cache the
  surface, only re-render if the string changes.
- **`import pygame` gives the wrong version, or `module 'pygame' has no attribute 'version'`** →
  `pygame` and `pygame-ce` are both installed in the same environment (shared folder, last install
  wins). `pip uninstall -y pygame pygame-ce` then `pip install pygame-ce`.
- **Nothing appears** → no `display.flip()`, or `screen.fill()` runs after drawing. Draw back to
  front: background, world, sprites, HUD.

## References

- [pygame-ce docs](https://pyga.me/docs/): full API, notably `sprite`, `mask`, `mixer`.
- [pygame-ce releases](https://github.com/pygame-community/pygame-ce/releases) for changes between
  versions.

## Related skills

- `ebitengine-game`, `bevy-ecs`, `love2d-core`, `defold-core`: the other niche engines in the
  catalog.
- `input-systems`, `save-systems`: engine-agnostic rebinding and persistence.
- `game-feel`, `game-ui-ux`: portable juice and HUD to apply to pygame sprites.
- `audio-design`: bus organization and mixing, beyond a plain `mixer.Sound`.

## Version notes

Last checked: 2026-11-17.

- pygame-ce 2.5.8 (released 2026-08-09) is the latest version; it requires Python 3.10+ and bundles
  SDL 2.32.10.
- The latest legacy pygame version is 2.6.1 (2024-09-29).
- Sources: [pygame-ce on PyPI](https://pypi.org/project/pygame-ce/),
  [pygame-ce releases](https://github.com/pygame-community/pygame-ce/releases).
