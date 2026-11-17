---
name: godot-multiplayer
description: "Godot 4.7 high-level multiplayer: ENet host/join, `@rpc` with `rpc_id()`, `MultiplayerSpawner` and `MultiplayerSynchronizer`, with a two-instance headless test. Auto-invoke for online or LAN co-op in Godot, or a rejected RPC, spawned nodes missing on clients, or state not syncing. Not for Roblox (`roblox-networking`), server exports (`godot-export`), or local split-screen (`camera-systems`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Multiplayer (4.x high-level)

This skill owns connecting peers, calling remote functions via `@rpc`, assigning authority, and
replicating state with `MultiplayerSpawner`/`MultiplayerSynchronizer`. Targets **Godot 4.7** with
ENet (see Version notes). Treat all client input as untrusted; keep the server authoritative.

> Adapted/translated from `godot-multiplayer` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Host/join via ENet, write RPCs, assign per-node authority, or auto-spawn/sync nodes between
  peers.

**Not this skill**: local split-screen (no networking); raw TCP/UDP/WebSocket protocol work
(`PacketPeer`); HTTP requests; Roblox (`roblox-networking`); persistence (`save-systems`).

## Main workflow

1. **Create a peer** (`ENetMultiplayerPeer`), call `create_server(port, max_clients)` or
   `create_client(address, port)`, check the returned `Error`, and assign it to
   `multiplayer.multiplayer_peer`. The server's id is always `1`; clients get random positive ids.
2. **Handle connection signals** on `multiplayer`: `peer_connected(id)`, `peer_disconnected(id)`,
   `connected_to_server`, `connection_failed`, `server_disconnected`. Print each one; the smoke
   test (step 8) reads these lines.
3. **Define RPCs** with `@rpc(...)` and call them through the method's Callable with `rpc()` (all
   peers) or `rpc_id(peer_id)` (one peer).
4. **Keep the RPC set identical** on every build that runs the script: Godot computes a checksum
   of all `@rpc` methods on a script, and a mismatch shows errors that may name an unrelated RPC.
5. **Assign authority** per node with `set_multiplayer_authority(id)`; gate input and movement on
   `is_multiplayer_authority()`.
6. **Replicate state** with `MultiplayerSpawner` (instances scenes on clients) and
   `MultiplayerSynchronizer` (syncs chosen properties).
7. **Validate server-side.** Clients send intent; the server checks it and broadcasts results.
8. **Verify with two headless instances** before concluding.

## Patterns

### 1. Host or join (ENet)

```gdscript
const PORT := 7000
const MAX_PLAYERS := 8

func host() -> void:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_server(PORT, MAX_PLAYERS)
    if err != OK:
        push_error("Couldn't host: %s" % error_string(err)); return
    multiplayer.multiplayer_peer = peer
    multiplayer.peer_connected.connect(func(id: int): print("peer_connected ", id))

func join(address := "127.0.0.1") -> void:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_client(address, PORT)
    if err != OK:
        push_error("Couldn't join: %s" % error_string(err)); return
    multiplayer.multiplayer_peer = peer
    multiplayer.connected_to_server.connect(func(): print("connected_to_server"))

func leave() -> void:
    multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
```

### 2. RPC: client sends intent, server validates

```gdscript
func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("fire") and is_multiplayer_authority():
        request_fire.rpc_id(1)          # send to the server only (id 1)

# Clients can call this; it runs on the server (and locally if the server is also a player).
@rpc("any_peer", "call_local", "reliable")
func request_fire() -> void:
    if not multiplayer.is_server():     # ignore copies relayed to other clients
        return
    var sender := multiplayer.get_remote_sender_id()
    if not _can_fire(sender):           # server-side validation
        return
    spawn_projectile.rpc(sender)        # tell everyone to spawn it

@rpc("any_peer", "call_local", "reliable")
func spawn_projectile(owner_id: int) -> void:
    if multiplayer.get_remote_sender_id() != 1:
        return
    _do_spawn(owner_id)
```

### 3. Per-node authority (each player controls their own avatar)

```gdscript
extends CharacterBody2D

func _ready() -> void:
    # The node's name is the owning peer's id; that peer is the authority.
    set_multiplayer_authority(name.to_int())

func _physics_process(delta: float) -> void:
    if not is_multiplayer_authority():
        return                          # only the owner reads input and moves
    velocity = Input.get_vector("left", "right", "up", "down") * 200.0
    move_and_slide()
```

### 4. MultiplayerSynchronizer configured from code

```gdscript
@onready var sync: MultiplayerSynchronizer = $MultiplayerSynchronizer

func _ready() -> void:
    var config := SceneReplicationConfig.new()
    config.add_property(^".:position")
    config.property_set_replication_mode(^".:position",
        SceneReplicationConfig.REPLICATION_MODE_ALWAYS)    # unreliable, every interval
    config.add_property(^".:health")
    config.property_set_replication_mode(^".:health",
        SceneReplicationConfig.REPLICATION_MODE_ON_CHANGE) # reliable, only on change
    sync.replication_config = config
```

## Verify

1. Make the game host/join via command-line arguments, then run two headless instances:

   ```bash
   timeout 20 godot --headless --path . -- --host > server.log 2>&1 &
   sleep 2
   timeout 15 godot --headless --path . -- --join 127.0.0.1 > client.log 2>&1
   wait
   grep -nE "^ *(SCRIPT ERROR|ERROR):" server.log client.log   # no output = success
   grep -n "connected" server.log client.log                   # the step 2 prints
   ```

2. Without a Godot binary, ask the user to run these lines and paste both logs. Gameplay feel
   needs humans: ask the user to launch several windows and report any desyncs.

## Pitfalls

- **RPC checksum.** Every `@rpc` method on a script must exist with the same annotation on both
  client and server, *even if unused*. Names and argument counts aren't part of the check; the RPC
  set and its annotations are.
- **`@rpc` defaults to `"authority"`.** Calls from other peers are ignored unless the mode is
  `"any_peer"`. Add `"call_local"` when the host is also a player.
- **`RPC 'x' is not allowed on node ... from: 1. Mode is "authority"`** → the server called an
  `"authority"` RPC on a node owned by a client. "Authority" means that node's authority, not the
  server. Use `"any_peer"` plus a `get_remote_sender_id() == 1` check.
- **NodePaths must match across peers.** RPC routing uses the node path; spawn with identical
  names everywhere.
- **Trusting the client.** Never let clients set authoritative state directly (health, position,
  hits). Send intent, validate server-side, then broadcast.
- **RPCs live on Nodes and carry simple data.** `@rpc` only works on classes deriving from `Node`,
  not `Resource`/`RefCounted`, and Objects and Callables don't serialize.
- **Disconnect by resetting the peer**:
  `multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()`.
- **Port already in use** in the smoke test → a previous server is still running; the `timeout`
  wrapper kills it, or pick another port.
- **Android exports need the INTERNET permission** in the export preset, or all networking is
  blocked.

## References

- The official high-level multiplayer docs cover the full `@rpc` argument rules,
  `MultiplayerSpawner` with a custom `spawn_function`, synchronizer visibility filters,
  `SceneMultiplayer` authentication, transfer mode choices, and a lobby skeleton.

## Related skills

- `godot-nodes-scenes` for instancing the spawned and synced scenes.
- `godot-signals-groups` for connection signals and event flow.
- `godot-export` for a dedicated headless server build.
- `godot-gdscript-headless-testing` to keep server logic tests in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- `SceneReplicationConfig.property_set_sync`/`property_set_watch` are deprecated; use
  `property_set_replication_mode()`.
- `MultiplayerSynchronizer.public_visibility` defaults to `true`;
  `MultiplayerSpawner.spawn()` errors without a `spawn_function`.
