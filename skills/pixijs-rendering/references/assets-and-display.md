# PixiJS v8 assets and display objects

A deeper look at the v8 asset pipeline and display object types beyond `Sprite`. `SKILL.md`
covers the boot path and scene graph; this file fills in textures and the other things you
draw.

Contents:

- The `Assets` system (aliases, sprite sheets, background loading, unloading)
- Texture settings
- Display object types: `AnimatedSprite`, `Graphics`, `Text` and `BitmapText`,
  `TilingSprite`, `ParticleContainer`
- Filters
- Cleanup (destroy options, `cacheAsTexture`, app teardown, context loss)

## The `Assets` system (v8)

`Assets` replaces v7's `Loader`. It caches by URL/alias, so calling `Assets.load` twice for the
same source resolves instantly the second time.

```js
import { Assets } from 'pixi.js';

// A single asset.
const tex = await Assets.load('assets/hero.png');

// Register aliases ahead of time, load later by name.
Assets.add({ alias: 'hero', src: 'assets/hero.png' });
const hero = await Assets.load('hero');

// Load several at once (the object form keeps results indexed).
const sheet = await Assets.load([ 'a.png', 'b.png' ]);

// Load in the background without blocking, then `load` resolves instantly when needed.
Assets.backgroundLoad(['level-2-bg.png']);

// Free GPU + CPU memory once a screen is done.
await Assets.unload('hero');
```

Supported source types include images, sprite sheet JSON (atlases), bitmap fonts, web fonts,
and audio (with the right loader installed). Atlases load as a `Spritesheet`; access frames by
name:

```js
const sheet = await Assets.load('assets/characters.json'); // TexturePacker JSON
const idle = new Sprite(sheet.textures['hero_idle.png']);
const runFrames = sheet.animations['hero_run'];            // Texture[] for the animation
```

## Texture settings

```js
import { Rectangle, Texture } from 'pixi.js';

texture.source.scaleMode = 'nearest';  // crisp pixel art ('linear' is the default)
const sub = new Texture({ source: texture.source, frame: new Rectangle(0, 0, 16, 16) });
```

A `Texture` is a view into a `TextureSource` (the GPU resource). Several `Texture`s can share a
source — that is how atlases avoid extra uploads.

`Texture.from(id)` only reads the Assets cache in v8; it does not fetch a URL. Call
`await Assets.load(url)` first (use its return value), or do `Texture.from` on a source
already loaded.

## Display object types

### AnimatedSprite

```js
import { AnimatedSprite } from 'pixi.js';
const anim = new AnimatedSprite(sheet.animations['hero_run']);
anim.animationSpeed = 0.2;   // fraction of a frame per ticker tick
anim.play();
app.stage.addChild(anim);
```

### Graphics (vector drawing)

v8 uses a fluent, retained API: define the shape, then call a fill/stroke.

```js
import { Graphics } from 'pixi.js';
const g = new Graphics()
  .roundRect(0, 0, 120, 60, 12)
  .fill(0x4488ff)
  .stroke({ width: 2, color: 0xffffff });
app.stage.addChild(g);
```

(In v7 the order was `beginFill` → drawing → `endFill`; v8 draws the shape first, then
fills/strokes it.)

### Text & BitmapText

```js
import { Text, TextStyle } from 'pixi.js';
const score = new Text({
  text: 'Score: 0',
  style: new TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: '#ffffff' }),
});
```

Use `BitmapText` for strings that change frequently (HUD counters): it reuses glyph textures
instead of rasterizing new ones on every change.

### TilingSprite (scrolling backgrounds)

```js
import { TilingSprite } from 'pixi.js';
const bg = new TilingSprite({ texture: skyTexture, width: app.screen.width, height: app.screen.height });
app.ticker.add((t) => { bg.tilePosition.x -= 0.5 * t.deltaTime; });
```

### ParticleContainer (many simple sprites)

For thousands of cheap sprites sharing the same texture (bullets, particles), a
`ParticleContainer` trades per-child features for throughput. In v8 it holds `Particle`
instances added with `addParticle` (not `Sprite`s via `addChild`), and you declare which
per-particle fields change at runtime via `dynamicProperties` so only those get re-uploaded
every frame:

```js
import { ParticleContainer, Particle, Rectangle } from 'pixi.js';

const container = new ParticleContainer({
  // Static fields are uploaded once; mark dynamic only what actually changes.
  dynamicProperties: { position: true, rotation: true, color: false },
  // It does not measure its particles: give it bounds by hand (see below).
  boundsArea: new Rectangle(0, 0, app.screen.width, app.screen.height),
});
app.stage.addChild(container);

const p = new Particle(bulletTexture);
p.x = 100; p.y = 50;
container.addParticle(p);   // NOT container.addChild(new Sprite(...))
```

Particles are lightweight records, not full display objects: no children, no per-particle
events, no filters. Keep every particle on a single shared texture (one atlas frame) so the
batch never breaks.

A `ParticleContainer` reports empty bounds (0, 0, 0, 0) to save work. Without `boundsArea`,
`getBounds()` is empty and the container disappears as soon as it is `cullable`; set
`boundsArea` to the region the particles cover. Its own hit test also reads those empty
bounds, so to make the container clickable give it a `hitArea` (for example the same
`Rectangle`).

## Filters

Filters are GPU post-processing effects applied to a display object and its children:

```js
import { BlurFilter } from 'pixi.js';
container.filters = [new BlurFilter({ strength: 4 })];
```

Filters render the subtree to a temporary texture, so they cost memory and fill rate — apply
them sparingly and remove them (`obj.filters = null`) when no longer needed.

## Cleanup

- `removeChild(child)` detaches but does **not** free GPU memory.
- `child.destroy()` frees the display object; pass options to also destroy its texture:
  `sprite.destroy({ texture: true, textureSource: true })`.
- Destroy a whole subtree with `container.destroy({ children: true })`. If a container has
  `cacheAsTexture(true)` enabled, disable it with `cacheAsTexture(false)` before destroying.
  (v7's `cacheAsBitmap` is renamed to the `cacheAsTexture()` method.)
- `Assets.unload(urlOrAlias)` frees GPU/CPU memory for a loaded asset.
- To tear down the whole app and recreate it in the same tab: use
  `app.destroy({ removeView: true, releaseGlobalResources: true })`. Without
  `releaseGlobalResources`, pooled batches/textures survive and corrupt the next app.
- On a WebGL/WebGPU context loss, textures are restored from their sources; keep the source
  (or be ready to reload) for anything generated at runtime.
