# Phaser scene flow (Phaser 4.2; base lifecycle also applies to 3.90)

The Scene Manager moves each scene through a small state machine. Knowing which transition
verb does what avoids the most common Phaser bugs: hidden scenes, stale state after a restart,
and duplicated event listeners.

Contents:

- Lifecycle order
- Transition verbs (table and rules of thumb)
- The restart state bug
- Duplicated listeners
- Removing or replacing a scene
- Keys stay down after release (Phaser 4.2.1)

## Lifecycle order

A scene is **booted once** (`INIT` status) and can be **started any number of times**. On
every start it runs:

```
start → (loading, if preload queued anything) → create → running
```

- `init(data)` — runs first on every start. **Reset state specific to this run here.**
- `preload()` — queues asset downloads. Optional.
- `create(data)` — builds game objects; assets queued in `preload` are now ready.
- `update(time, delta)` — called every frame while the scene is `running`.

The same `data` object is passed to `init` and `create`, coming from
`scene.start(key, data)` / `scene.launch(key, data)`.

## Transition verbs

| Method | Effect on target | Effect on caller |
|---|---|---|
| `start(key, data)` | starts (or restarts) | **stops** the caller |
| `launch(key, data)` | starts in parallel; **restarts** it if already active | caller continues |
| `run(key, data)` | wakes if sleeping, resumes if paused, else (re)starts | caller continues |
| `switch(key)` | wakes if sleeping, else starts (a paused target restarts) | **sleeps** the caller |
| `pause(key?)` | stops update, keeps rendering | — |
| `resume(key?)` | resumes update | — |
| `sleep(key?)` | stops update AND rendering, keeps state | — |
| `wake(key?)` | wakes a sleeping scene | — |
| `stop(key?)` | full stop (frees objects) | — |

All these calls are queued: the Scene Manager applies them at the start of the next game step,
so the target scene has not started yet on the line right after `start`/`launch`.

Rules of thumb:

- **HUD/overlay** → `launch` it once; a second `launch` or `run` while it runs restarts it, so
  guard with `this.scene.isActive('hud')`. Scenes draw in scene-list order, so it is only on
  top if it comes after the gameplay scene in the `scene` config array; otherwise call
  `this.scene.bringToTop('hud')`. Toggle visibility with `setVisible()` or `sleep`/`wake`, not
  `start`.
- **Modal pause menu** → `pause` the gameplay scene and `launch` the menu; `resume` on close.
- **Title ⇄ gameplay you revisit** → prefer `sleep`/`wake` (preserved state, starts once) over
  `stop`/`start` (fresh every time) when reinitializing is expensive.

## The restart state bug

A Scene is a long-lived instance. Fields set in the constructor are set **once**, so they keep
their last value after a restart:

```js
// WRONG — gameOver stays true forever after the first game over.
export default class Play extends Phaser.Scene {
  constructor() {
    super('play');
    this.gameOver = false;   // runs once, never again
  }
}

// RIGHT — init() runs on every (re)start.
export default class Play extends Phaser.Scene {
  constructor() { super('play'); }
  init() { this.gameOver = false; }
}
```

The same rule applies to module-level arrays that collect game objects: clear them on
`shutdown`, or they will keep destroyed objects from the previous run.

```js
create() {
  this.enemies = [];
  // Clean up when the scene stops so the next run starts empty.
  this.events.once('shutdown', () => { this.enemies.length = 0; });
}
```

## Duplicated listeners

Listeners added in `create` on a **global** emitter (the registry, the input manager, another
scene) survive scene restarts and pile up. Either:

- add them with `.once(...)`, or
- remove them on `shutdown`:

```js
create() {
  const onChange = (p, v) => this.refresh(v);
  this.registry.events.on('changedata-coins', onChange);
  this.events.once('shutdown', () => {
    this.registry.events.off('changedata-coins', onChange);
  });
}
```

## Removing or replacing a scene

A scene key cannot be reused until the original is destroyed. To replace an instance under the
same key, remove it once it has finished stopping:

```js
this.scene.remove('level'); // remove by key
// later
this.scene.add('level', NewLevelScene, true); // true = auto-start
```

A practical alternative to juggling keys is storing the active level key in the registry and
adding/removing based on that value.

## Keys stay down after release (Phaser 4.2.1)

The keyboard manager ignores events already marked `defaultPrevented`. With its default
`window` event target, a host-page listener earlier in propagation can cancel `keyup` before
Phaser processes it. A tracked `Key` then stays `isDown`; opposite directions can cancel each
other out and later presses lose their falling edge. Check the installed version's
implementation before applying this diagnosis elsewhere.

1. Inspect `keydown` and `keyup` at `window` capture and at the configured keyboard target.
   Compare `event.code`, `event.defaultPrevented`, and the tracked key's state.
2. Temporarily disable host keyboard handlers and test with extensions disabled. Remove or
   narrow the handler that cancels releases for keys the game owns.
3. After removing the interference, call `this.input.keyboard.resetKeys()` once on the
   affected Scene to clear its stale tracked keys. Calling it every frame would break held
   input. Phaser already resets these keys on game blur, Scene pause, and Scene sleep; adding
   another reset on blur alone does not fix a release cancelled while the game stays focused.

For a local reproduction with the default keyboard target, temporarily register this listener,
press then release an arrow key, and inspect its `isDown` value:

```js
const cancelRelease = (event) => {
  if (event.code === 'ArrowLeft') event.preventDefault();
};
document.addEventListener('keyup', cancelRelease);
// After inspecting the stuck key, remove the diagnostic listener:
// document.removeEventListener('keyup', cancelRelease);
// Then reset the affected Scene's keys once as described above.
```

If the host cannot be changed, deliberately replace keyboard handling: configure the Game with
`input: { keyboard: false }`, remove `createCursorKeys()` and other keyboard plugin calls, and
own your own `window` capture listeners for `keydown`/`keyup`. The replacement reader needs
this contract:

- Track held keys by `event.code`; lock press/release edges until a simulation tick consumes
  them, so a short press between two ticks is preserved. Drop repeated `keydown` edges while a
  key is held.
- Clear held state and pending edges on document blur or background. Clear and suspend
  gameplay input on Scene pause/sleep, resume cleanly on resume/wake, and remove DOM and Scene
  listeners on shutdown so restarts do not duplicate them.
- Limit capture to keys the game owns while gameplay has focus; leave text fields, editable
  content, and browser shortcuts usable. Process releases of already-held keys even if focus
  changed before the release.
- Test short presses, opposite directions, key repeat, focus loss, pause/resume,
  sleep/wake, and Scene restart. Capture sees events before a later cancellation, but cannot
  recover an event blocked by an earlier `stopImmediatePropagation()`.

Primary sources: Phaser 4.2.1
[KeyboardManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/keyboard/KeyboardManager.js)
and [KeyboardPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/keyboard/KeyboardPlugin.js).
