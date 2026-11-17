---
name: phaser-arcade-physics
description: "Movement and collisions with Arcade Physics under Phaser 4: bodies, velocity, gravity, colliders vs overlaps, groups, and projectile pools. Auto-invoke for a Phaser platformer or top-down controller, or a sprite that ignores physics, an `onFloor()` that is always false, or bodies that pass through walls. Not for scenes and the loader (`phaser-core`), coyote time (`platformer`), or tunnelling theory (`physics-tuning`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Phaser 4 Arcade Physics

Moves and collides sprites with Phaser's Arcade engine: axis-aligned rectangles and circles, no
rotation on collision, no joints. That covers most platformers, shooters, and top-down games,
and it is fast. New projects target **Phaser 4.2**; check the installed major version before
editing an existing project. If the game needs hinges, springs, ramps, or rotated polygons,
Matter Physics is the separate engine for that, and its bodies never collide with Arcade
bodies.

> Adapted/translated from `phaser-arcade-physics` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Platformer or top-down movement, gravity, bounce, world bounds, and collision or overlap
  between sprites, groups, and tilemap layers.
- The config has `physics: { default: 'arcade' }`, or the code calls `this.physics.add.*`,
  `body.setVelocity`, or `this.physics.add.collider`.

**Not this skill**: scene structure and loading (`phaser-core`), jump-feel rules like coyote
time (`platformer`), or fixed timestep and tunnelling in general (`physics-tuning`).

## Main workflow

1. **Enable the world with debug drawing on**:
   `physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 600 }, debug: true } }`. Body
   outlines and velocity lines answer most "why didn't that collide" questions at a glance.
   Turn debug off before shipping.
2. **Create bodies via the physics factory**: `this.physics.add.sprite` (dynamic),
   `this.physics.add.staticImage` or `staticGroup` (walls and floor), or
   `this.physics.add.existing(obj)` for an already-created object.
3. **Move dynamic bodies through the body** with velocity, acceleration, and gravity. Writing
   `x`/`y` directly teleports the body past colliders.
4. **Register every `collider` and `overlap` once in `create`.** A collider separates bodies;
   an overlap only reports contact (pickups, triggers, hurtboxes).
5. **Use groups** so a single collider covers several objects, and pool projectiles with
   `maxSize`.
6. **Verify** with the probe in [Verify](#verify).

## Patterns

### 1. Enable Arcade Physics

```js
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 }, // top-down games use { x: 0, y: 0 }
      debug: true,               // body outlines and velocity while building
    },
  },
  scene: [PlayScene],
};
```

### 2. Top-down movement

```js
update() {
  const speed = 220;
  const body = this.player.body;
  body.setVelocity(0);
  if (this.cursors.left.isDown) body.setVelocityX(-speed);
  if (this.cursors.right.isDown) body.setVelocityX(speed);
  if (this.cursors.up.isDown) body.setVelocityY(-speed);
  if (this.cursors.down.isDown) body.setVelocityY(speed);
  body.velocity.normalize().scale(speed); // same speed on diagonals (zero stays zero)
}
```

### 3. Platformer with ground check

```js
create() {
  this.platforms = this.physics.add.staticGroup();
  this.platforms.create(400, 568, 'ground');

  this.player = this.physics.add.sprite(100, 450, 'player');
  this.player.setCollideWorldBounds(true);
  this.player.body.setSize(20, 36, true); // tighter hitbox than the art, centered

  this.physics.add.collider(this.player, this.platforms); // once, here
  this.cursors = this.input.keyboard.createCursorKeys();
}

update() {
  const onGround = this.player.body.blocked.down; // same as body.onFloor()
  const dir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
  this.player.setVelocityX(dir * 160);
  if (this.cursors.up.isDown && onGround) this.player.setVelocityY(-450);
}
```

### 4. Collider vs overlap

```js
// Separates, then reacts.
this.physics.add.collider(this.player, this.enemies, (player, enemy) => this.hurt(player, enemy));

// Detects only. The optional 4th argument can return false to skip a pair before the callback.
this.physics.add.overlap(this.player, this.coins, (player, coin) => {
  coin.disableBody(true, true); // disable and hide; the group can reuse it
  this.registry.inc('score', 10);
});
```

### 5. Pooled projectiles

```js
create() {
  this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });
}

fire(x, y) {
  const bullet = this.bullets.get(x, y); // an inactive member, or a new one under maxSize
  if (!bullet) return;                   // every bullet is in flight
  bullet.enableBody(true, x, y, true, true);
  bullet.body.setAllowGravity(false);
  bullet.setVelocityY(-500);
}

update() {
  // Return off-screen bullets to the pool, or firing stops after 30 shots.
  for (const bullet of this.bullets.getChildren()) {
    if (bullet.active && bullet.y < -32) bullet.disableBody(true, true);
  }
}
```

## Verify

1. `npm run build` (or `npx tsc --noEmit`) passes.
2. Probe the running game. If `phaser-core`'s headless smoke script is used, put this body in
   its `page.evaluate(() => { ... })` after a two-second wait, adjusting the scene key and
   object names:

```js
const s = window.game.scene.getScene('play');
return {
  bodies: s.physics.world.bodies.size,          // live dynamic bodies
  staticBodies: s.physics.world.staticBodies.size,
  playerOnFloor: s.player.body.blocked.down,    // true once the player has landed
  playerY: Math.round(s.player.y),
};
```

   Expect `playerOnFloor: true` and a `playerY` resting on the floor for a platformer, and a
   stable body count while firing (the pool recycles).
3. With `debug: true`, take a screenshot and check the hitboxes match the art. Without browser
   automation, ask the user to run with `debug: true` and report whether the outlines match the
   sprites and where the player stops.

## Pitfalls

- **The sprite ignores physics** → it was created with `this.add.sprite`, so it has no body.
  Use `this.physics.add.sprite` or `this.physics.add.existing(obj)`.
- **`onFloor()` is always false** → nothing to land on: add the `collider` with the floor, and
  check gravity is enabled. Landing on an ordinary dynamic body does not set `blocked`; make
  platforms static, immovable (`setImmovable(true)`), or non-pushable (`setPushable(false)`).
- **The player pushes platforms** → those are dynamic bodies; use a `staticGroup`, or
  `setImmovable(true)` for moving platforms.
- **A static body moved but still collides at the old spot** → static bodies do not follow
  their game object. Call `body.updateFromGameObject()` (or `refreshBody()` on the object).
- **Fast bullets pass through thin walls** → Arcade has no swept collision, so a body that
  travels farther than a wall's thickness in one step skips over it. Thicken the wall body, cap
  speed with `setMaxVelocity`, or raise `arcade.fps` above its 60 default at the cost of CPU.
- **Bodies stop colliding after adding a collision category** → a pair only collides when each
  side's mask contains the other's category, and untouched bodies keep mask `1`. Widen the
  other side's mask too, and set both the group and its members separately (see the
  reference).
- **Drag does nothing while a key is held** → Arcade only applies drag on an axis with zero
  acceleration; set acceleration to 0 when input stops.
- **Colliders multiply and the game slows down** → `collider`/`overlap` was called in `update`,
  adding a new one every frame. Register once in `create`; disable with
  `collider.active = false`.
- **The pool stops handing out bullets** → members were hidden but never disabled, so they
  still count as active. Recycle with `disableBody(true, true)`.

## References

- Read [`references/bodies-and-collision.md`](references/bodies-and-collision.md) to tune
  drag, bounce, or max speed, shape hitboxes with `setSize`/`setCircle`/`setOffset`, filter
  pairs with collision categories or a process callback, read `touching` vs `blocked`, or
  listen for `worldbounds` events.

## Related skills

- `phaser-core`: game config, scenes, loader, and cameras.
- `platformer`: coyote time, jump buffering, variable jump height, and level structure.
- `physics-tuning`: engine-agnostic feel, timestep, tunnelling, and jitter.
- `level-design`: the tile and platform layouts these bodies collide with.
- `game-feel`: adding weight and impact on top of collision that already works.
- `save-systems`: what run state is persisted between sessions.

## Version notes

Last checked: 2026-11-17, against Phaser 4.2.1 (npm `latest`, published 2026-07-09).

- Verified in the v4.2.1 sources: `arcade.fps` defaults to 60 and `fixedStep` to `true`;
  bodies, static bodies, and static groups start in category 1 with mask 1; a dynamic group's
  mask covers every bit; `nextCategory()` allows 32 categories; drag only applies at zero
  acceleration.
- Sources: [Arcade World.js](https://github.com/phaserjs/phaser/blob/v4.2.1/src/physics/arcade/World.js),
  [Arcade Body.js](https://github.com/phaserjs/phaser/blob/v4.2.1/src/physics/arcade/Body.js),
  `npm view phaser dist-tags`.
