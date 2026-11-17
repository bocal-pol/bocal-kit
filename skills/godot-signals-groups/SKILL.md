---
name: godot-signals-groups
description: "Godot 4.7 signals and groups: typed signals, `connect()` with Callables, one-shot and deferred connections, an event bus as autoload, and `call_group` broadcasts. Auto-invoke when nodes need to communicate without a direct reference, a handler fires twice or never, or the log shows \"already connected\". Not for GDScript syntax (`godot-gdscript`) or autoload setup (`godot-nodes-scenes`)."
model: claude-sonnet-5-5
type: framework
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Godot Signals & Groups (4.x)

This skill owns decoupling nodes via signals and acting on several nodes at once via groups,
instead of hardcoding references between scenes. Targets **Godot 4.7** (see Version notes).

> Adapted/translated from `godot-signals-groups` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- A node needs to announce "something happened" (player died, item picked up, wave finished)
  without holding a reference to its listeners.
- A whole category of nodes needs one call ("pause all enemies", "save every checkpoint").

**Not this skill**: general GDScript syntax (`godot-gdscript`); scene structure and autoload
registration (`godot-nodes-scenes`).

## Main workflow

1. **Decide the direction.** A child or sub-scene *emits* upward; the parent *connects*. The child
   stays reusable and doesn't know who's listening. Calling down into a child you own is a plain
   method call, not a signal.
2. **Declare typed signals** on the emitter and `emit()` exactly the declared arguments.
3. **Connect with a Callable** (`sig.connect(_on_sig)`). Use `CONNECT_ONE_SHOT` for a single
   trigger and `bind()` to pass extra context.
4. **Editor connections and groups are plain text in the `.tscn`**, so they can be read and written
   without the Node panel:

   ```ini
   [node name="Goblin" type="CharacterBody2D" parent="Enemies" groups=["enemies"]]

   [connection signal="pressed" from="UI/StartButton" to="." method="_on_start_pressed"]
   ```

5. **Use groups for broadcasting**: `add_to_group()`, then `get_tree().call_group(...)` or iterate
   `get_nodes_in_group(...)`.
6. **For cross-scene events, put signals on an autoload** (event bus).
7. **Verify before concluding** with a headless test or by smoke-running the scene and grepping the
   error log.

## Patterns

### 1. Emit upward, connect from the parent

```gdscript
# coin.gd (reusable pickup; knows nothing about the player or the HUD)
extends Area2D
signal collected(value: int)

func _ready() -> void:
    body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
    if body.is_in_group("player"):
        collected.emit(10)
        queue_free()
```

```gdscript
# level.gd (the parent wires coins to game state)
func _ready() -> void:
    for coin in get_tree().get_nodes_in_group("coins"):
        coin.collected.connect(_on_coin_collected)

func _on_coin_collected(value: int) -> void:
    GameState.add_score(value)
```

### 2. One-shot connection and bound arguments

```gdscript
func _ready() -> void:
    $Door.opened.connect(_on_door_opened, CONNECT_ONE_SHOT)   # disconnects itself
    # bind() appends its arguments after the signal's own.
    $RedButton.pressed.connect(_on_button.bind("red"))

func _on_button(color: String) -> void:
    print("Button %s pressed" % color)
```

### 3. Groups: broadcasting to several nodes

```gdscript
func pause_all_enemies() -> void:
    get_tree().call_group("enemies", "set_paused", true)   # silently ignores nodes without the method
```

### 4. Headless test that a signal reaches its handler once

```gdscript
# res://tests/test_signals.gd
extends SceneTree

func _initialize() -> void:
    var level: Node = load("res://level.tscn").instantiate()
    root.add_child(level)                          # the parent's _ready() connects the coins
    await process_frame
    var coin: Node = get_first_node_in_group("coins")
    var failed := 0
    if coin == null or coin.collected.get_connections().size() != 1:
        failed += 1
        push_error("coin.collected should have exactly one connection")
    print("Results: %d failed" % failed)
    quit(1 if failed > 0 else 0)
```

## Verify

1. If `.tscn` connections were edited, run `godot-nodes-scenes`'s path checker; it reports
   `[connection]` entries whose `from`/`to` node doesn't exist (it does not check method names).
2. Prove the wiring at runtime with a headless test (Pattern 4), or smoke-run the scene and grep
   the log: `grep -nE "^ *(SCRIPT ERROR|ERROR):" run.log`.
3. Without a Godot binary, ask the user to run it and paste `run.log`.

## Pitfalls

- **The 3.x `connect` signature is gone.** `connect("died", self, "_on_died")` becomes
  `died.connect(_on_died)`. Prefer `died.emit()` over `emit_signal("died")`: a misspelled signal
  name then becomes a parse error, not a runtime one.
- **Connecting the same method twice** shows "Signal '...' is already connected to given callable"
  and keeps a single connection. A new lambda each time is a *different* Callable, so it stacks
  silently and the handler fires once per connection. Keep the lambda in a variable, or guard with
  `if not sig.is_connected(cb):`.
- **A lambda can outlive the nodes it captures.** Godot removes a connection when the emitter or
  the Callable's owner is freed, but a lambda belongs to the script that created it; a lambda that
  captures a node freed later keeps firing and erroring. Connect methods, or disconnect stored
  lambdas yourself.
- **An argument mismatch fails at emit time.** `emit()` doesn't validate arguments against the
  `signal` declaration; a handler with a different argument count logs "Error calling from signal
  ... Method expected N argument(s)".
- **Groups are global to the SceneTree**, not per scene. Two levels using the same group name share
  membership; namespace the names if that matters.
- **`call_group` silently ignores nodes without the method**, so a typo fails silently. Prefer a
  typed signal when the contract matters.
- **A `[connection]` pointing to a method that doesn't exist** isn't caught by the checker; Godot
  shows a "Cannot connect" error when the scene is instanced, so the smoke run catches it.
- **Handlers that change the tree during physics** ("flushing queries" errors) → connect with
  `CONNECT_DEFERRED` or `call_deferred` the change.

## References

- The official docs on signals cover every connection flag, `unbind()`, awaiting a signal with a
  timeout, safe disconnection and lambda lifetime, the full groups API, an autoload event bus, and
  choosing between signals and direct calls.

## Related skills

- `godot-gdscript` for signal syntax and `await`.
- `godot-nodes-scenes` for autoloads used as global event buses.
- `godot-gdscript-headless-testing` to keep Pattern 4 in CI.
- `game-ai` for state machines that drive and consume these events.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Rest variadic parameters (`..._args`), useful for a timeout helper, exist since GDScript 4.5.
- The "already connected" and "Method expected N argument(s)" messages match the 4.7.2 source.
