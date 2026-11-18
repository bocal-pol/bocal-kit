---
name: phaser-core
description: "Configures and debugs Phaser 4 games (and pinned Phaser 3.90): Game config, Scene lifecycle, loader, scene transitions, and Phaser 3 to 4 migration. Auto-invoke when code imports `phaser`, on a black screen, `undefined` assets in `create`, or a HUD scene hidden behind the game. Not for colliders (`phaser-arcade-physics`), HUD layout (`game-ui-ux`), or PixiJS (`pixijs-rendering`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Phaser 4 core

Builds the foundation of a Phaser game: a single `Phaser.Game`, one scene per screen, assets
loaded per scene into a global cache, and a clean split between game rules and the scenes that
draw them. New projects target **Phaser 4.2**. A project pinned to Phaser 3.90 stays on 3.x
unless the user asks for a migration.

> Adapted/translated from `phaser-core` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Starting a Phaser game, structuring scenes, loading assets, wiring cameras, passing data
  between scenes, or porting Phaser 3 code to Phaser 4.
- The project has `phaser` in `package.json`, `import Phaser from 'phaser'`, or classes that
  extend `Phaser.Scene`.

**Not this skill**: bodies, colliders, and movement (`phaser-arcade-physics`), Matter.js
physics, or engine-agnostic menu and HUD design (`game-ui-ux` — load it alongside this skill
for UI work).

## Main workflow

1. **Read the installed major version.** Check `package.json` and the lockfile. Phaser 3 and 4
   share the scene model but not the renderer, so a v3 snippet may run while rendering wrong
   in v4.
2. **Keep rules out of scenes.** Put state and rules (score, turns, inventory, AI) in plain
   modules with no Phaser import. A scene reads that state, draws it, and emits input actions.
   The rules then run under `node --test` without a browser, and a restart is just a new state.
3. **Create a single game from a config** with `type: Phaser.AUTO`, a size, a `scale` mode, and
   a `scene` array. The first scene in the array (and any `active: true` scene) starts at boot.
4. **One `Scene` subclass per screen** with a unique key. Reset run state in `init()`, queue
   assets in `preload()`, build objects in `create()`, advance in `update(time, delta)`.
5. **Move between screens with the right verb** (`start`, `launch`, `run`, `switch`, `sleep`;
   see Pattern 4) and share data via `this.registry` or a scene's `events`.
6. **Choose where UI lives.** A score or health bar fits a parallel HUD scene. Text-heavy menus
   and settings work better as HTML over the canvas (`this.add.dom` or a simple overlay).
7. **Verify** with the build and headless smoke test in [Verify](#verify).

## Patterns

### 1. Game config and boot

```js
// main.js: a single Game owns the renderer, loop, cache, and Scene Manager.
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PlayScene from './scenes/PlayScene.js';
import HudScene from './scenes/HudScene.js';

const config = {
  type: Phaser.AUTO,               // WebGL, falls back to Canvas only
  parent: 'game',                  // id of the element that holds the canvas
  width: 800,
  height: 600,
  backgroundColor: '#1d1d28',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  dom: { createContainer: true },  // only if this.add.dom() is used; requires `parent`
  scene: [BootScene, PlayScene, HudScene], // later in the list = drawn on top
};

const game = new Phaser.Game(config);
Object.assign(window, { game }); // for smoke testing and console debugging (safe in TS)
```

### 2. A scene with the full lifecycle

```js
// scenes/PlayScene.js
import Phaser from 'phaser';
import { createRun, stepRun } from '../rules/run.js'; // plain module, no Phaser import

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
  }

  init(data) {
    this.run = createRun({ level: data.level ?? 1 }); // runs on every (re)start
  }

  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.spritesheet('coin', 'assets/coin.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    this.player = this.add.sprite(400, 300, 'player');
    this.cursors = this.input.keyboard.createCursorKeys();
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
  }

  update(time, delta) {
    const dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    stepRun(this.run, { dir }, delta / 1000); // delta is in milliseconds
    this.player.x = this.run.playerX;
    this.registry.set('score', this.run.score);
  }
}
```

### 3. Data and events between scenes

```js
// HUD scene: react to registry changes instead of polling every frame.
create() {
  this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#fff' });
  const onScore = (_parent, value) => this.scoreText.setText(`Score: ${value}`);
  this.registry.events.on('changedata-score', onScore);
  // The registry outlives scenes: remove the listener, or it stacks up on every restart.
  this.events.once('shutdown', () => this.registry.events.off('changedata-score', onScore));
}

// Talk directly to another active scene via its event emitter.
this.scene.get('hud').events.emit('show-message', 'Level cleared!');
```

### 4. Scene transitions

```js
this.scene.start('gameover', { score }); // stops this scene, starts the target
this.scene.launch('hud');                // starts in parallel; restarts it if already active
this.scene.run('hud');                   // wakes if sleeping, resumes if paused, else starts
this.scene.switch('menu');               // sleeps this scene, starts or wakes the target
this.scene.pause();                      // stops update, keeps drawing (modal menus)
this.scene.sleep();                      // stops update and drawing, keeps state
this.scene.bringToTop('hud');            // draw order follows the scene list
```

### 5. HTML over the canvas

```js
// Requires dom.createContainer and parent in the game config (Pattern 1).
const panel = this.add.dom(400, 300).createFromHTML(`
  <form class="settings"><label>Volume <input name="vol" type="range"></label></form>`);
panel.addListener('input');
panel.on('input', (event) => this.sound.setVolume(event.target.value / 100));
```

### 6. Following camera

```js
this.cameras.main.setBounds(0, 0, 1600, 1200);
this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // follow with lerp
```

## Verify

1. Build or type-check first: `npm run build` (or `npx tsc --noEmit` in a TypeScript project)
   must pass.
2. Test rule modules with `node --test` when workflow step 2 was followed.
3. Smoke-test the running game in a headless browser. With the dev server running and
   `window.game` exposed (Pattern 1), save and run this with `node smoke.mjs <url>`. Requires
   `npm i -D playwright` and `npx playwright install chromium`; if the user does not want that,
   ask them to open the page and report the console output and what is visible.

```js
// smoke.mjs: fails on any page error; reports the renderer, active scenes, and a screenshot.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.argv[2]);
await page.waitForFunction(() => window.game?.isRunning, null, { timeout: 15000 });
await page.waitForTimeout(1500); // let the first scenes finish their preload
const state = await page.evaluate(() => ({
  renderer: window.game.config.renderType === 2 ? 'webgl' : 'canvas', // Phaser.WEBGL = 2
  scenes: window.game.scene.getScenes(true).map((s) => s.sys.settings.key),
}));
await page.screenshot({ path: 'smoke.png' });
await browser.close();
console.log(JSON.stringify({ ...state, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
```

Expect `renderer: "webgl"`, the intended scene keys active (for example `["play", "hud"]`), and
an empty `errors` list. Open `smoke.png` and confirm the playfield and HUD are drawn; DOM checks
alone miss a canvas that renders nothing.

## Pitfalls

- **Assets `undefined` in `create`** → they were not queued in `preload`, or the key is wrong.
  The loader runs between `preload` and `create`. A file that fails shows up as a 404 in the
  console, and sprites using that key draw Phaser's "missing" texture.
- **State leaks between restarts** → fields assigned in the constructor. A scene instance is
  reused, so reset run state in `init()` and clear collections on `shutdown`.
- **HUD hidden, reset, or drawn underneath** → `start` stopped the gameplay scene; use
  `launch`. A second `launch` or `run` on an active scene restarts it, so guard with
  `isActive`. Scenes draw in list order; call `bringToTop('hud')` if it was listed first.
- **A scene's state read right after `start`/`launch` is stale** → scene operations are queued
  and run at the start of the next game step.
- **`No DOM Container set in game config`** from `this.add.dom()` → add
  `dom: { createContainer: true }` and a `parent` element to the game config.
- **Keys stay down after release, or Left + Right cancel each other** → Phaser 4.2.1 ignores
  keyboard events already `defaultPrevented`, so a host-page listener that cancels `keyup`
  leaves the key stuck. Check host-page listeners and extensions before touching movement code
  (diagnosis in the reference).
- **A Phaser 3 snippet runs but renders wrong in Phaser 4** → `preFX`/`postFX` and `BitmapMask`
  became filters (`obj.enableFilters()`, then `obj.filters.internal` / `.external`);
  `setPipeline('Light2D')` became `setLighting(true)`; `setTintFill(c)` just logs an error, use
  `setTint(c).setTintMode(Phaser.TintModes.FILL)`; `Phaser.Math.TAU` is now 2π (use
  `Phaser.Math.PI_OVER_2` where v3 code wanted π/2); `Geom.Point` is gone (use
  `Phaser.Math.Vector2`).
- **Custom Phaser 3 renderer pipelines or plugins fail in Phaser 4** → the renderer was rebuilt
  and the old pipeline extension points are gone. Port them against the v4 migration guide
  instead of copying renderer internals. Canvas rendering still works but is deprecated.
- **Pixel art is blurry or shimmers** → set `pixelArt: true`; it turns off antialiasing and
  enables `roundPixels`, which defaults to `false` in Phaser 4.
- **Black screen with no error** → no scene started, or the canvas has no size. Run
  `game.scene.dump()` in the console to list scene state.
- **Two canvases after a hot reload or a React/Vue remount** → a second `new Phaser.Game` ran
  while the first was alive. Keep a single instance and call `game.destroy(true)` on unmount;
  teardown finishes on the next frame. Leave `noReturn` as `false`, or no new game can start.

## References

- Read [`references/scene-flow.md`](references/scene-flow.md) when a transition misbehaves
  (pause vs sleep vs stop), listeners stack up after restarts, a scene key needs replacing, or
  keys stay stuck.

## Related skills

- `phaser-arcade-physics`: velocity, gravity, colliders, overlaps, and groups.
- `game-ui-ux`: HUD and menu layout, scaling, and focus rules.
- `input-systems`: rebindable, multi-device input architecture.
- `camera-systems`: follow, orbit, and first-person cameras beyond the basic follow above.
- `performance-optimization`: performance budget beyond the Phaser renderer.
- `save-systems`: save file format and writing, consumed by these scenes.

## Version notes

Last checked: 2026-11-17.

- npm `latest` is Phaser 4.2.1 (published 2026-07-09). The most recent 3.x on npm is 3.90.0.
- The `defaultPrevented` keyboard behavior and `game.destroy(removeCanvas, noReturn)` were
  verified against the v4.2.1 sources; re-verify the keyboard diagnosis on other versions.
- Sources: `npm view phaser dist-tags`,
  [Phaser 4 migration guide](https://github.com/phaserjs/phaser/blob/v4.0.0/changelog/v4/4.0/MIGRATION-GUIDE.md),
  [Phaser 3 to 4 article](https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know),
  [v4.2.1 sources](https://github.com/phaserjs/phaser/tree/v4.2.1/src).
