---
name: bevy-ecs
description: "Bevy ECS in Rust (Bevy 0.20): components, resources, `Query`/`Commands` systems, schedule ordering, `States`, observers, and headless tests. Auto-invoke when `Cargo.toml` depends on `bevy`, on a query-conflict panic (B0001/B0002), or on pre-0.20 code (`EventReader`, `SpriteBundle`). Not for engine-agnostic AI or generation (`game-ai`, `procedural-gen`), physics (`physics-tuning`), or shaders (`shader-programming`) — this skill owns the ECS, not the algorithms that run inside it."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Bevy ECS

Bevy structures a game entirely around its ECS (Entity-Component-System): pure data in components,
logic as pure functions in systems, orchestrated by schedules. Bevy breaks its API on every minor
version — the version pinned in `Cargo.lock` decides which syntax is correct, never a memory of an
earlier version.

> Adapted/translated from the `bevy-ecs` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Wiring up an `App`, defining components and resources, writing systems, ordering them,
  conditioning them on a state or timer, moving data through messages and observers.
- Fixing a query-conflict panic, entities that seem to be missing, an ordering bug, or code copied
  from an earlier Bevy version.

**Not this skill**: the rendering pipeline, custom shaders, UI layout, and audio are out of scope.
AI and procedural generation belong to `game-ai` / `procedural-gen` — this skill provides the ECS
to implement them in, not the algorithms themselves.

## Main workflow

1. **Read the pinned version first.** `Cargo.toml` gives the constraint, `Cargo.lock` the resolved
   `bevy` version. Keep it; a minor-version migration is a separate task that follows that
   version's migration guide. Never mix snippets from two minor versions.
2. **Model the data.** Per-entity data → `#[derive(Component)]`; unique data (score, settings) →
   `#[derive(Resource)]`. Spawn entities as tuples of components; required components fill in the
   rest.
3. **Write systems as plain functions** whose parameters declare access: `Query<D, F>`,
   `Res`/`ResMut`, `Commands`, `MessageReader`/`MessageWriter`, `Single`. Systems with
   non-conflicting access run in parallel, with no guaranteed order.
4. **Only order what must be ordered** (`.chain()`, `.before`/`.after`, `SystemSet`) and condition
   with `run_if`. Group features into a `Plugin`. Scale movement by `time.delta_secs()` or place it
   in `FixedUpdate`.
5. **Verify.** `cargo check`, then `cargo test` with a headless `App` test (see pattern) for each
   rule changed, then `cargo run` and read the first panic. For a visual change, ask the user to
   launch the game and report what they see.

## Patterns

### 1. Spawn and disjoint filtering

```rust
#[derive(Component)]
struct Player;
#[derive(Component)]
struct Velocity(Vec2);

fn setup(mut commands: Commands) {
    commands.spawn(Camera2d);
    commands.spawn((Player, Velocity(Vec2::new(150.0, 0.0)), Transform::default()));
}

fn move_players(time: Res<Time>, mut q: Query<(&Velocity, &mut Transform)>) {
    for (v, mut t) in &mut q {
        t.translation += v.0.extend(0.0) * time.delta_secs(); // scaled by the real delta
    }
}

// Two mutable queries on Transform in the same system must be proven disjoint.
fn separate(
    mut players: Query<&mut Transform, With<Player>>,
    mut others: Query<&mut Transform, Without<Player>>,
) { /* ... */ }
```

### 2. Scheduling, run conditions, plugins

```rust
struct GameplayPlugin;
impl Plugin for GameplayPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(Score(0))
            .add_systems(Startup, setup)
            // damage must resolve before checking for deaths
            .add_systems(Update, (apply_damage, check_deaths).chain())
            .add_systems(Update, spawn_wave.run_if(in_state(AppState::Playing)));
    }
}
```

### 3. Messages and observers

```rust
#[derive(Message)]
struct EnemyKilled {
    score: u32,
}

fn on_enemy_killed(mut reader: MessageReader<EnemyKilled>, mut score: ResMut<Score>) {
    for event in reader.read() {
        score.0 += event.score;
    }
}

// Observer on a lifecycle event: reacts to the Player component being added.
fn setup_observers(app: &mut App) {
    app.add_observer(|trigger: On<Add<Player>>, mut commands: Commands| {
        commands.entity(trigger.target()).insert(Health(100));
    });
}
```

### 4. Headless test (the verification to run)

`MinimalPlugins` provides time and a schedule runner with no window or GPU: runs under plain
`cargo test`. Drive time by hand for deterministic movement.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use bevy::time::TimeUpdateStrategy;
    use std::time::Duration;

    #[test]
    fn player_moves_at_its_velocity() {
        let mut app = App::new();
        app.add_plugins(MinimalPlugins)
            .insert_resource(TimeUpdateStrategy::ManualDuration(Duration::from_millis(100)))
            .add_systems(Update, move_players);
        let id = app.world_mut().spawn((Velocity(Vec2::X * 10.0), Transform::default())).id();
        for _ in 0..5 {
            app.update();
        }
        // The first update has a zero delta, so 5 updates advance by 4 x 0.1 s.
        let x = app.world().get::<Transform>(id).unwrap().translation.x;
        assert!((x - 4.0).abs() < 1e-4, "x = {x}");
    }
}
```

For whole-world assertions: `app.world_mut().query_filtered::<&Health,
With<Player>>()` and `.single(world)`. `States` need `bevy::state::app::StatesPlugin` alongside
`MinimalPlugins`.

## Verify

```sh
cargo check
cargo test                  # headless tests, one per rule changed
cargo run                   # read the first panic; error comes with a code and a link
```

1. `cargo check` compiles without error — this only proves compilation, not behavior.
2. Every gameplay rule changed has a headless test (`MinimalPlugins`) that fails before the fix
   and passes after.
3. `cargo run` does not panic on the first run of the schedule concerned (a query conflict is
   detected immediately by Bevy, with an error code and a link).
4. For a visual change (rendering, UI, animation), ask the user to launch the game and report what
   they observe — no headless test covers rendering.

## Pitfalls

- **Panic `error[B0001]: Query<…> in system … accesses component(s) Transform in a way that
  conflicts with a previous system parameter`** → two queries in the same system can mutably reach
  the same component. Make them disjoint with `With`/`Without`, or use `ParamSet`.
- **`Query<EntityMut>` (or a despawn loop over a broad `Query<Entity>`) next to a `Res<T>`
  panics** → since 0.19, every resource lives on an entity tagged `IsResource`, so broad queries
  also match resources. Add `Without<IsResource>` (`use bevy::ecs::resource::IsResource`) or query
  on your own marker.
- **"conflicting implementations of trait `Component`"** after deriving both `Resource` and
  `Component` on the same type → since 0.19, `Resource` implies `Component`; derive `Resource`
  alone.
- **A spawned entity is missing from a query in the same system** → `Commands` are deferred until
  the next sync point. Read them in a later system, or order the reader after the spawner.
- **Something works only by luck of system order** → unordered systems run in a stable but
  arbitrary order, which an unrelated change can reshuffle. Add a real constraint.
- **`delta_seconds()` not found** → renamed `delta_secs()` / `elapsed_secs()` in 0.15; the old
  names are gone.
- **`Camera2dBundle` / `SpriteBundle` not found** → bundles were removed in 0.16. Spawn the
  components (`Camera2d`, `Sprite`, `Transform`) and let required components fill in the rest.
- **`EventReader` / `EventWriter` / `add_event` not found** → buffered events became messages:
  `#[derive(Message)]`, `MessageReader`, `MessageWriter::write`, `app.add_message::<T>()`. Push
  events remain `#[derive(Event)]` with observers.
- **`On<Add, Player>`: "struct takes 1 generic argument but 2 generic arguments were supplied"**
  → in 0.20 the component moved into the lifecycle event: `On<Add<Player>>` (also `Insert<T>`,
  `Discard<T>`, `Remove<T>`, `Despawn<T>`).
- **`OnExit`/`OnEnter` fire while "changing" to the current state** → `NextState::set` always
  transitions. Use `set_if_different` (the 0.20 name).
- **Overlapping sprites swap draw order after upgrading to 0.20** → sprites go through the
  `Mesh2d` path and draw order at equal `z` was never guaranteed. Give distinct `z` values to
  overlapping sprites.

## References

- [Bevy 0.20 release notes](https://bevy.org/news/bevy-0-20/) and [migration guide
  0.19 → 0.20](https://bevy.org/learn/migration-guides/0-19-to-0-20/): read before any minor
  version migration.
- [crates.io bevy](https://crates.io/crates/bevy) for the latest published version.

## Related skills

- `ebitengine-game`, `pygame-core`, `love2d-core`, `defold-core`: the other niche engines in the
  catalog.
- `game-ai`, `procedural-gen`: portable algorithms to implement as Bevy systems.
- `physics-tuning`: fixed step and collision feel to tune on `FixedUpdate`.
- `shader-programming`: shader technique, engine-independent.
- `save-systems`: world-state serialization, versioned migration.

## Version notes

Last checked: 2026-11-17.

- Bevy 0.20.0 shipped on 2026-10-08 and 0.20.1 on 2026-10-28 (maintenance fixes only, no
  additional API). 0.19.0 shipped on 2026-06-19.
- Sources: [v0.20.1 release](https://github.com/bevyengine/bevy/releases/tag/v0.20.1),
  [Bevy 0.20 release notes](https://bevy.org/news/bevy-0-20/).
