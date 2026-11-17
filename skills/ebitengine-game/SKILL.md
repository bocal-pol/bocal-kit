---
name: ebitengine-game
description: "2D games in Go with Ebitengine v2: play-replay loop, input (keys/gamepad), pixel art scaling, text, audio, headless tests, and desktop/WASM/mobile builds. Auto-invoke when `go.mod` depends on `ebiten/v2`, or on blurry pixel art, a missed or doubled key press, frame-rate-linked speed, distorted sound, or an audio panic. Not for the Rust ECS (`bevy-ecs`), the Python loop (`pygame-core`), or Lua (`love2d-core`, `defold-core`); for portable design, see `game-feel`, `game-ui-ux`."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Ebitengine game

Ebitengine is a pure-Go 2D engine: no external binary, no heavy C binding, native cross-compilation
to desktop, WASM, and mobile. Deliver a game that is understandable, responsive, and complete for
the requested scope — a scaffold that compiles, or a nice screenshot alone, is not a finished game.
For a targeted fix, follow the project's existing structure and touch only the behavior concerned.

> Adapted/translated from the `ebitengine-game` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Starting a Go game with Ebitengine, or fixing its loop, input, rendering, text, audio, or builds.
- Any project whose `go.mod` references `github.com/hajimehoshi/ebiten/v2`.
- Diagnosing: blurry pixel art, a missed or double-triggered key, speed that varies with the
  refresh rate, sound playing too fast or noisy, an `audio: context is already created` panic, FPS
  drops tied to text rendering.

**Not this skill**: Bevy/Rust ECS and systems (`bevy-ecs`), the pygame loop in Python
(`pygame-core`), LÖVE or Defold callbacks in Lua (`love2d-core`, `defold-core`). Portable design
(playability, feel, UI, sound, levels) belongs to `game-feel`, `game-ui-ux`, `audio-design`,
`level-design`, `create-game-assets` — this skill connects them to Go/Ebitengine code but does not
own their content.

## Main workflow

1. **Inspect and decide.** Read `go.mod`, the `RunGame` entry point, existing tests and assets.
   For a new game, fix the player's goal, the repeated decision, its consequence, the end/replay
   path, the visual style, the platform, and the input scheme; infer reasonable defaults, only ask
   about choices that change the product.
2. **Build a representative playable slice.** Get the core interaction and its feedback working
   with the real controls and the real visuals before adding content.
3. **Complete and polish.** Implement the start → play → result → replay/continue loop (or the
   adapted persistent/sandbox loop). Refine visual hierarchy, animation, sound, difficulty, and
   transitions.
4. **Verify the product** with the commands in the Verify section: rules and transitions under
   test, real input paths, rendered states at key moments, every promised target actually built.
5. **Hand off.** Give launch/build instructions, real artifact paths, and asset licenses. A
   scripted demo cannot judge how controls feel, and a null audio sink cannot judge sound: ask the
   user to play a real session and report on feel, audio, and difficulty.

## Patterns

### 1. Loop with strict method contracts

```go
// Update advances the simulation at a fixed rate (60 TPS by default) — never inside Draw.
func (g *Game) Update() error {
    g.handleInput()      // sample actions once per tick, never inside Draw
    g.player.Move(1.0 / 60.0) // duration expressed in ticks/fixed dt, not wall-clock time
    if g.player.Dead {
        return ebiten.Termination // clean shutdown; other errors propagate through RunGame
    }
    return nil
}

// Draw renders the state produced by Update — never advance the game or trigger sound here.
func (g *Game) Draw(screen *ebiten.Image) {
    screen.Fill(color.RGBA{18, 18, 28, 255})
    op := &ebiten.DrawImageOptions{}
    op.GeoM.Translate(g.player.X, g.player.Y) // GeoM applies in call order
    screen.DrawImage(g.player.Image, op)
}

// Layout chooses the logical rendering and input size — check small windows and aspect ratio.
func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
    return 320, 180
}
```

### 2. Input: separate pressed/held/released

```go
import "github.com/hajimehoshi/ebiten/v2/inpututil"

func (g *Game) handleInput() {
    // Pressed/Released are tick edges: read them only once per tick.
    if inpututil.IsKeyJustPressed(ebiten.KeySpace) {
        g.player.Jump()
    }
    // Held: continuous direction, combine before computing an action edge.
    dx := 0.0
    if ebiten.IsKeyPressed(ebiten.KeyRight) {
        dx++
    }
    if ebiten.IsKeyPressed(ebiten.KeyLeft) {
        dx--
    }
    g.player.VX = dx * g.player.Speed
}
```

### 3. Sprite rotation/scale: pivot before transform

```go
op := &ebiten.DrawImageOptions{}
w, h := sprite.Bounds().Dx(), sprite.Bounds().Dy()
op.GeoM.Translate(-float64(w)/2, -float64(h)/2) // pivot at center: origin first
op.GeoM.Rotate(angle)
op.GeoM.Scale(2.0, 2.0)
op.GeoM.Translate(playerX, playerY) // then position in the world
screen.DrawImage(sprite, op)
```

### 4. Audio: a single context, a voice pool for repeated effects

```go
import "github.com/hajimehoshi/ebiten/v2/audio"

const sampleRate = 44100

var audioContext *audio.Context // create exactly once at startup; audio.NewContext twice panics

func init() {
    audioContext = audio.NewContext(sampleRate)
}

type VoicePool struct {
    players []*audio.Player
    next    int
}

// Play avoids rewinding a player already in use: a rapid shot no longer cuts the previous one.
func (p *VoicePool) Play(decoded *audio.Player) {
    v := p.players[p.next]
    p.next = (p.next + 1) % len(p.players)
    v.Rewind()
    v.Play()
}
```

### 5. Headless rule testing (no GPU)

```go
// world/physics_test.go: touches neither ebiten.RunGame nor rendering, so it runs under plain "go test".
package world

import "testing"

func TestPlayerFallsUnderGravity(t *testing.T) {
    p := NewPlayer()
    p.VY = 0
    for i := 0; i < 10; i++ {
        p.Update(1.0 / 60.0) // explicit fixed dt, not ActualTPS
    }
    if p.VY <= 0 {
        t.Fatalf("expected downward velocity after gravity ticks, got %v", p.VY)
    }
}
```

## Verify

```sh
go vet ./...
go test ./world/...          # rules independent of GPU; extend to other packages
go build -buildvcs=false -o game .
GOOS=js GOARCH=wasm go build -buildvcs=false -o game.wasm .
```

1. `go vet` and `go test` pass without error on the rules packages (excluding rendering/GPU).
2. A scripted screenshot (`-demo -shot frame.png -shot-tick N`) opens and shows the expected state
   at that tick — on Linux, use `xvfb-run -a` and a null ALSA device if there is no sound card.
3. Every promised build target actually compiles (`GOOS=windows`, `GOOS=js GOARCH=wasm`, etc.) — a
   cross-compile proves buildability, not runtime behavior.
4. Ask the user to play a real session (keyboard/gamepad, sound on) and report on feel,
   difficulty, and audio — no scripted test replaces this.

## Pitfalls

- **Missed or double-triggered key** → `inpututil.IsKeyJustPressed` read inside `Draw` or multiple
  times per tick. Read it exactly once per tick, inside `Update`.
- **Speed tied to the refresh rate** → state advances inside `Draw`, or the code uses
  `ActualTPS`/`ActualFPS` as a delta. Always advance in fixed ticks inside `Update`.
- **Sprite rotating around the wrong point** → `GeoM` applies in call order: translate the pivot
  to the origin, scale/rotate, then translate to position.
- **Blurry or uneven pixel art** → the sampling and scaling policy was never chosen explicitly.
  With a custom final screen, also convert cursor coordinates accordingly.
- **Sound ~9% too fast/high-pitched or noisy** → `DecodeF32` does not resample; convert assets to
  the context's sample rate or use `DecodeWithSampleRate` with `NewPlayer`.
- **`audio: context is already created` panic** → `audio.NewContext` called twice. Create a single
  context at startup and pass it around (`audio.CurrentContext()`).
- **A fast effect cuts itself off** → a single `audio.Player` rewound on every hit. Use a small
  voice pool and cap concurrent voices.
- **No sound in the browser** → browsers only allow audio after a user gesture. Start music from
  a title-screen action and check `ctx.IsReady()`.
- **FPS drop while text is shown** → a font is parsed every frame with
  `text.NewGoTextFaceSource`, or `Size` is animated. Parse each font once and keep the source; to
  zoom text, scale a pre-rendered image instead.
- **HUD shows a stale value** → text was cached (image or layout) and never rebuilt on change.
  Rebuild the cache only when the value changes.
- **The game freezes or slows down on a `ReadPixels`/`At` call** → GPU reads wait on the GPU and
  cannot run before `RunGame`. Reserve them for tests and screenshots.
- **`go: go.mod requires go >= 1.25.0`** → the local Go toolchain predates what the pinned
  Ebitengine version requires. Install Go 1.25+ or allow toolchain download
  (`GOTOOLCHAIN=auto`).

## References

- Official Ebitengine repository, `skills/` folder on the `main` branch: skeleton examples, Kage
  shaders, headless execution, and efficient rendering — check they match the project's pinned
  version, as these skills track the next release.
- [Go module proxy](https://proxy.golang.org/github.com/hajimehoshi/ebiten/v2/@latest) for the
  latest stable version.

## Related skills

- `bevy-ecs`, `pygame-core`, `love2d-core`, `defold-core`: the other niche engines in the catalog.
- `game-feel`, `game-ui-ux`, `audio-design`, `input-systems`, `camera-systems`: portable design to
  connect to Go code.
- `create-game-assets`: pixel art/sprite sheet asset pipeline.
- `performance-optimization`: profiling beyond the pitfalls listed here.
- `save-systems`: progress persistence (format, migration, atomic writes).

## Version notes

Last checked: 2026-11-17.

- Ebitengine v2.10.6 (2026-11-07) is the latest stable version; v2.11.0-alpha exists. v2.10.6
  fixes only the internal tick clock (stutter bug, issue 4015) and the PureGo dependency.
- Ebitengine v2.10 requires Go 1.25 or later (`go 1.25.0` in its `go.mod`).
- Sources: [v2.10 release notes](https://ebitengine.org/en/documents/2.10.html),
  [issue 4015](https://github.com/hajimehoshi/ebiten/issues/4015).
