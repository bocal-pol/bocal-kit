# Arcade body anatomy and collision detail (Phaser 4.2)

A deeper look at the Arcade `Body` and the collision system. `SKILL.md` covers the common path;
come here to tune feel, shape hitboxes, or filter collisions.

Contents:

- Dynamic vs static bodies
- Movement properties (table)
- Custom hitboxes
- Colliders, overlaps, and callbacks
- Contact state (`touching`, `blocked`, `wasTouching`)
- World bounds
- Collision categories and masks
- Debugging

## Dynamic vs static bodies

- **Dynamic** (`this.physics.add.sprite`, `image`, `group`): moved by velocity, acceleration,
  drag, and gravity; pushed by collisions.
- **Static** (`staticImage`, `staticSprite`, `staticGroup`): never moves, never gets pushed.
  Cheaper. Use for floors, walls, platforms. After moving its parent game object, call
  `body.updateFromGameObject()` (or `gameObject.refreshBody()`) to resync — static bodies do
  **not** follow their parent automatically.

Make a dynamic body behave like a wall with `body.setImmovable(true)`: it still exists in the
simulation but will not be moved by collisions.

## Movement properties

| Property | Setter | Notes |
|---|---|---|
| velocity | `setVelocity(x, y)` / `setVelocityX/Y` | pixels per second |
| acceleration | `setAcceleration(x, y)` | px/sec²; accumulates into velocity |
| gravity | `setGravity(x, y)` | added to the world's gravity |
| drag | `setDrag(x, y)` | px/sec² of slowdown, applied only when that axis has no acceleration; with `setDamping(true)` it is the fraction of velocity kept per second (e.g. `0.05`) |
| max velocity | `setMaxVelocity(x, y)` | caps speed |
| bounce | `setBounce(x, y)` | 0 = stops on contact, 1 = full bounce |
| friction | `setFriction(x, y)` | fraction of motion transferred to an overlapping body |

`body.stop()` resets velocity, acceleration, and speed in one call.
`body.reset(x, y)` teleports the body and clears all motion.

Total gravity on a body = `world.gravity + body.gravity`. Disable world gravity for a single
body with `body.setAllowGravity(false)` (useful for flying enemies).

## Custom hitboxes

The body defaults to the sprite's frame size. Tighten it to the art:

```js
sprite.body.setSize(20, 36, true);   // width, height, center on the frame
sprite.body.setOffset(6, 4);         // shift the box within the frame
sprite.body.setCircle(16);           // circular body with radius 16
```

The third argument of `setSize` recenters the body; pass `false` to keep the offset at
`(0, 0)` and position it yourself with `setOffset`.

## Colliders, overlaps, and callbacks

```js
const collider = this.physics.add.collider(
  objectsA, objectsB,
  collideCallback,   // (objA, objB) => {}   runs after separation
  processCallback,   // (objA, objB) => boolean  return false to skip this pair
  this               // callback context
);

collider.active = false;                 // temporarily disable
this.physics.world.removeCollider(collider); // remove entirely
```

`overlap(...)` has the same signature but never separates bodies — use it for pickups,
hurt-boxes, and triggers. A `processCallback` that returns `false` discards the pair before
the main callback (e.g. ignoring collisions with allied units).

`objectsA`/`objectsB` can each be a single game object, an array, or a physics group, so one
call can wire "every bullet against every enemy."

## Contact state

After the physics step, each body exposes which sides are in contact:

```js
body.blocked.down   // cannot move down: bounds, a tile, or a blocking body below
body.touching.left  // touching another body on the left this step
body.onFloor()      // shorthand for blocked.down
body.onWall()       // blocked.left || blocked.right
body.wasTouching    // contact state from the previous step (edge detection)
```

`touching` is set for any body contact. `blocked` means the body cannot move further in that
direction: world bounds, a colliding tile, an immovable, static, or non-pushable body
(`sprite.setPushable(false)`), or a body that is itself blocked (a crate resting on the
floor). That is why `blocked.down`/`onFloor()` works as a ground check on a `staticGroup`
platform but stays `false` when landing on an ordinary dynamic body mid-flight. Compare
`touching` to `wasTouching` to detect the first frame of a contact (e.g. play a sound only
once on landing).

## World bounds

```js
this.physics.world.setBounds(0, 0, 1600, 1200);        // simulation bounds
body.setCollideWorldBounds(true);                       // constrain this body
body.onWorldBounds = true;                              // emit events at the edges
this.physics.world.on('worldbounds', (b, up, down, left, right) => { /* ... */ });
```

## Collision categories and masks

Every body starts in category `1` with mask `1`, so everything collides with everything. A
pair is only tested when **each** side's mask contains the other side's category. Moving a
body to a new category therefore also cuts it off from every untouched body, since their mask
stays `1`:

```js
const WORLD  = 1;                                  // the default category
const PLAYER = this.physics.nextCategory();        // 2, 4, 8, ... (32 categories max)
const ENEMY  = this.physics.nextCategory();

player.setCollisionCategory(PLAYER);
player.setCollidesWith([WORLD, ENEMY]);            // keep the floor untouched

// The floor still has mask 1, so it would now ignore PLAYER too: widen it as well.
ground.setCollidesWith([WORLD, PLAYER, ENEMY]);    // or ground.resetCollisionCategory()
```

When one side of a collider is a group, both the group's own category/mask and each member's
are checked. The group's values are not copied to its members, so set both:

```js
enemies.setCollisionCategory(ENEMY).setCollidesWith([WORLD, PLAYER]);
const enemy = enemies.create(600, 400, 'enemy');   // and every other member
enemy.setCollisionCategory(ENEMY).setCollidesWith([WORLD, PLAYER]);
```

A dynamic physics group starts with an all-bits mask; a static group and each body start with
mask `1`. `resetCollisionCategory()` sets category `1` and an all-bits mask ("collides with
everything"), which is wider than a new body's default. If only a few pairs need skipping, a
`processCallback` that returns `false` is simpler than categories.

## Debugging

While building, enable `arcade.debug: true` to draw body rectangles, static body outlines, and
velocity vectors. Per-body overrides:

```js
this.physics.world.defaults.debugShowVelocity = true;
gameObject.setDebug(true, true, 0x00ff00);   // showBody, showVelocity, color
```

Turn debug off for release builds; the overlay has a real per-frame cost.
