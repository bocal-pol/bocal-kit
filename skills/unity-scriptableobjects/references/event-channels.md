# Event channels & runtime sets (Unity 6.3 LTS ScriptableObjects)

Deep dive for `unity-scriptableobjects`: two decoupling patterns that are the main reason teams
adopt SO architecture. Checked against the Unity Manual's ScriptableObject docs; the design
itself is original.

## Contents

- Event channel (publisher/subscriber without a direct reference)
- Typed payloads
- Runtime set / registry
- Pitfalls

## Event channel (publisher/subscriber without a direct reference)

An emitter (e.g. the player dying) and listeners (UI, audio, spawner) all reference a shared
`GameEvent` asset, never each other. Add/remove the asset in the Inspector to wire systems
together.

```csharp
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(menuName = "Game/Events/Game Event")]
public class GameEvent : ScriptableObject
{
    private readonly List<GameEventListener> _listeners = new();

    public void Raise()
    {
        // iterate backwards so a listener that unregisters itself in its handler stays safe
        for (int i = _listeners.Count - 1; i >= 0; i--)
            _listeners[i].OnRaised();
    }

    public void Register(GameEventListener l)   { if (!_listeners.Contains(l)) _listeners.Add(l); }
    public void Unregister(GameEventListener l) { _listeners.Remove(l); }
}
```

```csharp
using UnityEngine;
using UnityEngine.Events;

public class GameEventListener : MonoBehaviour
{
    [SerializeField] private GameEvent channel;
    [SerializeField] private UnityEvent response;   // wire reactions in the Inspector

    private void OnEnable()  => channel.Register(this);
    private void OnDisable() => channel.Unregister(this);   // always unregister
    public  void OnRaised()  => response.Invoke();
}
```

Usage: the player calls `onPlayerDied.Raise()`; the HUD, the music manager, and the respawn
system each have a `GameEventListener` pointing at `onPlayerDied` with their own response.
Adding a new reaction is an Inspector change, not a code change.

### Typed payloads

For events that carry data, make a generic base or a concrete typed channel:

```csharp
[CreateAssetMenu(menuName = "Game/Events/Int Event")]
public class IntEvent : ScriptableObject
{
    public event System.Action<int> OnRaised;
    public void Raise(int value) => OnRaised?.Invoke(value);   // e.g. a score delta
}
```

Prefer a small number of concrete typed channels (`IntEvent`, `Vector3Event`) over a fully
generic `GameEvent<T>`, since Unity can't create assets directly for open generic types.

## Runtime set / registry (a shared, live collection)

Instead of `FindObjectsByType` (or the obsolete `FindObjectsOfType`) every frame, objects add
themselves to a shared set on enable and remove themselves on disable. Systems (AI targeting,
minimap) read the set.

```csharp
[CreateAssetMenu(menuName = "Game/Runtime Set/Enemy Set")]
public class EnemyRuntimeSet : ScriptableObject
{
    public readonly List<Enemy> Items = new();
    public void Add(Enemy e)    { if (!Items.Contains(e)) Items.Add(e); }
    public void Remove(Enemy e) => Items.Remove(e);
}
```

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private EnemyRuntimeSet set;
    private void OnEnable()  => set.Add(this);
    private void OnDisable() => set.Remove(this);   // keep the set clean
}
```

Now "nearest enemy" is a loop over `set.Items` — no scene scan, and the list reflects exactly
what's alive.

## Pitfalls

- `List` fields on a ScriptableObject are populated at runtime and **persist in the Editor**
  across play sessions unless cleared. Clear runtime sets in `OnEnable` (or `OnDisable`) so a
  stale entry from the last session doesn't linger; with Reload Domain disabled, those
  callbacks don't run between sessions, so clear on a Play mode change instead, as in pattern 2
  of the main skill.
- Always `Unregister`/`Remove` in `OnDisable`; destroyed objects left uncleaned leave null
  entries that crash listeners.
- Event channels invoke synchronously on the emitter's thread/frame — a heavy listener blocks
  the emitter. Keep handlers light or offload heavy work to a coroutine.
