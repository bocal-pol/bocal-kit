# Blueprint communication: Cast vs. Interface vs. Event Dispatcher (UE 5.8)

Deep dive for `unreal-blueprints`. The three ways Blueprints talk to each other, when to use
each, and the pitfalls. Checked against the Blueprints Visual Scripting and Blueprint
Communications docs.

## Decision guide

| Method | Direction | Coupling | Use when |
|---|---|---|---|
| **Direct + Cast To** | caller → known target | strong (loads that class) | a reference exists and really depends on that exact type (e.g. the player calls a specific door it owns) |
| **Blueprint Interface** | caller → any implementer | weak (no strong reference) | several unrelated types share a verb (Interact, Damage, Save) and the caller shouldn't know the concrete types |
| **Event Dispatcher** | source → several listeners | weak (listeners find the source) | one event, several reactions (health change → HUD + audio + achievement) |

Rule of thumb: **cast down, broadcast up.** A manager can cast to what it owns; a low-level actor
should broadcast a Dispatcher rather than reach up to its owner.

## Casting — the cost

`Cast To BP_X` adds `BP_X` (and its dependencies) to this Blueprint's load references. A network
of casts bloats memory and load times, and it's a common cause of "why does my small Blueprint
pull in half the game." Use it where the dependency is real; otherwise prefer an interface.

```text
Actor reference -> Cast To BP_Enemy
   Cast Failed (exec) -> ignore          // always handle the failure; a wrong-type reference returns invalid
   As BP_Enemy (success) -> call an enemy-specific function
```

## Blueprint Interface — decoupled verbs

1. Content Browser → Blueprint → **Blueprint Interface** (e.g. `BPI_Interactable`).
2. Add a function signature, e.g. `Interact(AActor* Instigator)`. (Interfaces only declare
   signatures — no node implementation in the interface asset.)
3. In each implementer (BP_Door, BP_Chest): Class Settings → **Implemented Interfaces** → add
   `BPI_Interactable`, then implement the `Interact` event in its Event Graph.
4. Caller, holding any `AActor` reference:

```text
-> Does Object Implement Interface (BPI_Interactable)?   // optional guard
   True -> Interact (Message)  [Target = the actor]       // the 'Message' node is safe even if not implemented
```

The "Message" call node does nothing on actors that don't implement the interface, so it never
raises an error — unlike a Cast, which fails.

## Event Dispatcher — one to many

Declare on the source Blueprint (e.g. `BP_Player`): My Blueprint panel → Event Dispatchers → add
`OnHealthChanged` with a `float NewHealth` input.

Broadcast it where the state changes:

```text
ApplyDamage -> Set Health (clamp >= 0) -> Call 'OnHealthChanged' (NewHealth = Health)
```

Bind from any listener that holds a reference to the source:

```text
WBP_HUD :: Event Construct
  -> Get Player Pawn -> Cast To BP_Player
  -> Bind Event to 'OnHealthChanged'  [Event = custom 'HandleHealth(NewHealth)']

HandleHealth(NewHealth) -> Set Progress Bar Percent = NewHealth / MaxHealth
```

- Several listeners can bind to the same dispatcher; all are called on broadcast.
- **Unbind** (`Unbind Event from ...`) when a listener is destroyed/hidden to avoid stale
  bindings.
- Dispatchers are the Blueprint equivalent of a C++ multicast delegate
  (`DECLARE_DYNAMIC_MULTICAST_DELEGATE`), so the same actor's event can also be bound from C++.

## Pitfalls

- Binding inside `Event Construct`/`BeginPlay` requires the source to already exist; for spawn
  order issues, bind after spawning the source, or have the source broadcast an initial value
  once listeners are known.
- Interface functions with return values are implemented as functions (not events) by the
  implementer; pure interface calls can't have exec pins.
- A soft reference resolves to None until its asset is loaded. **Load Asset Blocking** loads it
  synchronously and causes a hitch; prefer **Async Load Asset** and continue from its Completed
  pin.
