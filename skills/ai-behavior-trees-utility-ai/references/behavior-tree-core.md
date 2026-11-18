# Behavior tree core: Blackboard, nodes, leaves, composites, decorators

Contents:
1. Blackboard (dictionary and field-based variants)
2. Node base and the `Reset()` contract
3. Base classes: leaf, composite, decorator
4. Condition leaves
5. Action leaves (`MoveToTarget`, `Wait`)
6. Composites: `Sequence`, `Selector`, `ReactiveSelector`, `ReactiveSequence`, `Parallel`
7. Decorators: `Inverter`, `ForceSuccess`, `Repeat`, `Cooldown`
8. Running the tree (`BehaviorTree`, fluent assembly)

A complete, allocation-aware C# behavior tree runtime. The tree logic is plain C# with no
engine type; the leaf examples use a `Vector2` with Unity's member names (`magnitude`,
`normalized`, `sqrMagnitude`), so they compile as-is in Unity 6. In Godot 4 C# the same leaves
need `Length()`, `Normalized()`, and `LengthSquared()`; outside an engine,
`System.Numerics.Vector2` has `Length()`, `LengthSquared()`, and `Vector2.Normalize(v)`. Wire
the leaves to the engine's transform/navigation inside the concrete actions.

Contract in one line: every node's `Tick` returns `Success`, `Failure`, or `Running`, and a
parent decides what that means. Build the tree once at spawn; keep per-tick work
allocation-free.

## Blackboard — the shared state system

The **Blackboard** is the agent's working memory. Leaves read and write it; no node keeps a
reference to another. This indirection is what lets the same `MoveTo` action serve chase,
patrol, and flee subtrees, and what makes subtrees reusable across enemy types.

```csharp
using System.Collections.Generic;

// A typed key/value store. Keys are strings (or use enum/int keys to avoid hashing cost).
public sealed class Blackboard
{
    private readonly Dictionary<string, object> _values = new();

    public void Set<T>(string key, T value) => _values[key] = value!;

    public T Get<T>(string key, T fallback = default!)
        => _values.TryGetValue(key, out var v) && v is T t ? t : fallback;

    public bool TryGet<T>(string key, out T value)
    {
        if (_values.TryGetValue(key, out var v) && v is T t) { value = t; return true; }
        value = default!;
        return false;
    }

    public bool Has(string key) => _values.ContainsKey(key);
    public void Remove(string key) => _values.Remove(key);
}
```

For hot agents, prefer a **field-based blackboard** (public fields on a class) over a string
dictionary — it removes hashing and boxing entirely. Use the dictionary shape when designers
add keys at runtime or when the board is serialized.

```csharp
// Allocation-free alternative: a plain data object shared by every node on this agent.
public sealed class AgentContext
{
    public Vector2 Position;
    public Transform Target;      // null when no target
    public Vector2 Home;
    public float LastSeenTime;
    public readonly List<Vector2> Path = new();
}
```

## The node base and status

```csharp
public enum Status { Success, Failure, Running }

// Every tree node derives from Node. dt is the decision-step delta (may differ from frame dt).
public abstract class Node
{
    public abstract Status Tick(Blackboard bb, float dt);

    // Parents reset terminal children and aborted branches; BehaviorTree does the same for the
    // root. Clean up local execution state and release reservations. Repeated resets must be
    // harmless.
    public virtual void Reset() { }
}
```

Parents call `Reset()` immediately after a child returns `Success` or `Failure`, and when they
abandon a `Running` branch. The root follows the same rule in `BehaviorTree`. Reset must be
idempotent: an ancestor may reset an already-clean child again. Clean up local execution state
(timers, animations, reservations), while keeping persistent state such as a cooldown deadline.
Code that ticks a node directly takes on this parent responsibility.

## Base classes: leaf, composite, decorator

Three structural node types cover every tree:

```csharp
// A leaf does the actual work; it has no children.
public abstract class Leaf : Node { }

// A composite has several children and defines how their statuses combine (see Composites below).
public abstract class Composite : Node
{
    protected readonly List<Node> Children = new();
    protected int Current;                       // resume index for Running composites

    public Composite Add(Node child) { Children.Add(child); return this; }

    public override void Reset()
    {
        Current = 0;
        foreach (var c in Children) c.Reset();
    }
}

// A decorator wraps exactly one child and transforms or filters its status (see Decorators below).
public abstract class Decorator : Node
{
    protected Node Child = default!;
    public Decorator Wrap(Node child) { Child = child; return this; }
    public override void Reset() => Child.Reset();
}
```

## Condition leaves — instant predicates

A **condition** reads the blackboard and returns `Success` or `Failure` in the same tick. It
never returns `Running` and never mutates game state. Express reusable predicates as a small
class with an injected test, or subclass for named conditions.

```csharp
// Generic condition: succeeds when a predicate over the blackboard holds.
public sealed class Condition : Leaf
{
    private readonly System.Func<Blackboard, bool> _predicate;
    public Condition(System.Func<Blackboard, bool> predicate) => _predicate = predicate;

    public override Status Tick(Blackboard bb, float dt)
        => _predicate(bb) ? Status.Success : Status.Failure;
}

// Named condition when the check isn't trivial or is reused across trees.
public sealed class CanSeeTarget : Leaf
{
    private readonly float _sightRange;
    public CanSeeTarget(float sightRange) => _sightRange = sightRange;

    public override Status Tick(Blackboard bb, float dt)
    {
        if (!bb.TryGet<Vector2>("targetPos", out var target)) return Status.Failure;
        var self = bb.Get<Vector2>("position");
        // Real games also raycast for line of sight; keep the check cheap and cache the result.
        return (target - self).sqrMagnitude <= _sightRange * _sightRange
            ? Status.Success : Status.Failure;
    }
}
```

Note the pre-allocated `System.Func` delegate: create conditions **once** when building the
tree, not per tick, so no closure is allocated during evaluation.

## Action leaves — multi-frame work that returns Running

An **action** does work and returns `Running` until it finishes, then `Success` (or `Failure`
if it can't). Returning `Running` is what lets a walk, animation, or timed wait span several
ticks without the parent restarting it.

```csharp
// Move toward a blackboard target; Running until within arrival radius, then Success.
public sealed class MoveToTarget : Leaf
{
    private readonly float _speed, _arriveRadius;
    public MoveToTarget(float speed, float arriveRadius)
    { _speed = speed; _arriveRadius = arriveRadius; }

    public override Status Tick(Blackboard bb, float dt)
    {
        if (!bb.TryGet<Vector2>("targetPos", out var target)) return Status.Failure;
        var pos = bb.Get<Vector2>("position");
        var offset = target - pos;
        if (offset.magnitude <= _arriveRadius) return Status.Success;   // arrived

        pos += offset.normalized * _speed * dt;
        bb.Set("position", pos);          // in an engine, drive the NavMeshAgent / CharacterBody here
        return Status.Running;            // continue next tick
    }
}

// A timed wait — the canonical Running action, useful for patrol pauses and cooldown holds.
public sealed class Wait : Leaf
{
    private readonly float _duration;
    private float _elapsed;
    public Wait(float duration) => _duration = duration;

    public override Status Tick(Blackboard bb, float dt)
    {
        _elapsed += dt;
        if (_elapsed < _duration) return Status.Running;
        return Status.Success;
    }

    public override void Reset() => _elapsed = 0f;   // restarts cleanly if the branch re-enters
}
```

`Wait` shows why `Reset()` matters: its `_elapsed` accumulator must be cleared on finish or
abandonment, or the second run finishes instantly.

The `Sequence`/`Selector`/`Parallel` execution logic and the decorator library build directly
on these base classes — see the composites and decorators sections below.

## Composites — how children's statuses combine

Composites are a tree's control flow. The two used constantly are `Sequence` (AND) and
`Selector` (OR/fallback); `Parallel` covers concurrent branches.

```csharp
// Sequence = AND: ticks children in order; stops at the first one that isn't Success.
// Resumes at the Running child next tick ("memory" variant).
public sealed class Sequence : Composite
{
    public override Status Tick(Blackboard bb, float dt)
    {
        for (; Current < Children.Count; Current++)
        {
            var s = Children[Current].Tick(bb, dt);
            if (s == Status.Running) return Status.Running;   // resumes here next tick
            Children[Current].Reset();                       // ready for its next run
            if (s == Status.Failure) { Current = 0; return Status.Failure; }
        }
        Current = 0;
        return Status.Success;                                // every child succeeded
    }
}

// Selector = OR / fallback: returns the first child that isn't Failure.
public sealed class Selector : Composite
{
    public override Status Tick(Blackboard bb, float dt)
    {
        for (; Current < Children.Count; Current++)
        {
            var s = Children[Current].Tick(bb, dt);
            if (s == Status.Running) return Status.Running;   // resumes here next tick
            Children[Current].Reset();
            if (s == Status.Success) { Current = 0; return Status.Success; }
        }
        Current = 0;
        return Status.Failure;                                // every child failed
    }
}
```

**Memory vs. reactive.** The versions above *remember* the `Running` child and resume there.
That's efficient but doesn't let a higher-priority sibling interrupt. For a **reactive**
selector — the common case for combat AI — re-check children from index 0 every tick and abort
the running branch when an earlier child changes its mind:

```csharp
// Reactive selector: earlier (higher-priority) children can preempt a lower branch in progress.
public sealed class ReactiveSelector : Composite
{
    private int _running = -1;
    public override Status Tick(Blackboard bb, float dt)
    {
        for (int i = 0; i < Children.Count; i++)
        {
            var s = Children[i].Tick(bb, dt);
            if (s != Status.Running) Children[i].Reset();
            if (s == Status.Failure) continue;
            if (_running != -1 && _running != i) Children[_running].Reset();  // abort the old branch
            _running = s == Status.Running ? i : -1;
            return s;                                       // Success or Running
        }
        _running = -1;
        return Status.Failure;
    }

    public override void Reset() { base.Reset(); _running = -1; }
}
```

The reactive selector re-ticks its *children* from index 0, but a memory `Sequence` child still
resumes at its own running action, so the condition at the head of that sequence isn't
re-checked while the action runs. When a condition needs to keep guarding a running action
("keep chasing only while I can see the player"), use a **reactive sequence**:

```csharp
// Reactive sequence: re-checks every child from index 0 on every tick. If an earlier child
// stops succeeding, the later Running child is aborted with Reset(). Only put conditions (or
// cheap, repeatable actions) before the long-running child.
public sealed class ReactiveSequence : Composite
{
    private int _running = -1;
    public override Status Tick(Blackboard bb, float dt)
    {
        for (int i = 0; i < Children.Count; i++)
        {
            var s = Children[i].Tick(bb, dt);
            if (s != Status.Running) Children[i].Reset();
            if (s == Status.Success) continue;
            if (_running > i) Children[_running].Reset();   // an earlier child stopped us
            _running = s == Status.Running ? i : -1;
            return s;                                       // Failure or Running
        }
        _running = -1;
        return Status.Success;
    }

    public override void Reset() { base.Reset(); _running = -1; }
}
```

`Parallel` ticks every non-terminal child on each pass and resolves with a policy — succeed when
*one* (or *all*) succeed, fail when *one* (or *all*) fail. Use it for "attack while strafing" or
"play a VFX while moving." It must remember children that already finished: re-ticking a child
that succeeded restarts it, and `RequireAll` would then never see every child succeed on the
same tick.

```csharp
public enum ParallelPolicy { RequireOne, RequireAll }

public sealed class Parallel : Composite
{
    private readonly ParallelPolicy _success, _failure;
    private Status[] _results = System.Array.Empty<Status>();   // per-child result; Running = not finished

    public Parallel(ParallelPolicy success, ParallelPolicy failure)
    { _success = success; _failure = failure; }

    public override Status Tick(Blackboard bb, float dt)
    {
        int n = Children.Count;
        if (_results.Length != n)                                 // first tick (or children changed)
        {
            _results = new Status[n];
            System.Array.Fill(_results, Status.Running);
        }

        int successes = 0, failures = 0;
        for (int i = 0; i < n; i++)
        {
            if (_results[i] == Status.Running)
            {
                _results[i] = Children[i].Tick(bb, dt);
                if (_results[i] != Status.Running) Children[i].Reset();
            }
            if (_results[i] == Status.Success) successes++;
            else if (_results[i] == Status.Failure) failures++;
        }

        var outcome = Status.Running;
        if ((_failure == ParallelPolicy.RequireOne && failures > 0) ||
            (_failure == ParallelPolicy.RequireAll && failures == n)) outcome = Status.Failure;
        else if ((_success == ParallelPolicy.RequireOne && successes > 0) ||
                 (_success == ParallelPolicy.RequireAll && successes == n)) outcome = Status.Success;
        else if (successes + failures == n) outcome = Status.Failure; // all finished, no policy satisfied

        if (outcome != Status.Running) Reset();   // stop any still-running children, clear the record
        return outcome;
    }

    public override void Reset()
    {
        base.Reset();                              // resets every child
        System.Array.Fill(_results, Status.Running);
    }
}
```

## Decorators — wrapping a child to change its meaning

Decorators add policy without new leaves: invert a result, force a status, filter on a
cooldown, or repeat. Each wraps exactly one child.

```csharp
// Inverter: Success <-> Failure (Running passes through). "NOT".
public sealed class Inverter : Decorator
{
    public override Status Tick(Blackboard bb, float dt)
    {
        var s = Child.Tick(bb, dt);
        if (s != Status.Running) Child.Reset();
        return s switch
        {
            Status.Success => Status.Failure,
            Status.Failure => Status.Success,
            _              => Status.Running,
        };
    }
}

// ForceSuccess: swallows a child's failure so a Sequence keeps going (optional steps).
public sealed class ForceSuccess : Decorator
{
    public override Status Tick(Blackboard bb, float dt)
    {
        var s = Child.Tick(bb, dt);
        if (s != Status.Running) Child.Reset();
        return s == Status.Running ? Status.Running : Status.Success;
    }
}

// Repeat: runs the child up to n times (n <= 0 = indefinitely), restarting on each Success.
public sealed class Repeat : Decorator
{
    private readonly int _count;
    private int _done;
    public Repeat(int count) => _count = count;

    public override Status Tick(Blackboard bb, float dt)
    {
        var s = Child.Tick(bb, dt);
        if (s == Status.Running) return Status.Running;
        Child.Reset();                               // includes failure and the final repeat
        if (s == Status.Failure) { _done = 0; return Status.Failure; }
        _done++;
        if (_count > 0 && _done >= _count) { _done = 0; return Status.Success; }
        return Status.Running;
    }

    public override void Reset() { base.Reset(); _done = 0; }
}

// Cooldown: filters the child so it can only run once per interval (attack/ability rate limiting).
// Deliberately no Reset() override: aborting the branch must not clear the cooldown, or an
// agent that thrashes between branches attacks every time it re-enters.
public sealed class Cooldown : Decorator
{
    private readonly float _seconds;
    private float _readyAt;
    public Cooldown(float seconds) => _seconds = seconds;

    public override Status Tick(Blackboard bb, float dt)
    {
        float now = bb.Get<float>("time");
        if (now < _readyAt) return Status.Failure;     // still cooling down
        var s = Child.Tick(bb, dt);
        if (s != Status.Running) Child.Reset();
        if (s == Status.Success) _readyAt = now + _seconds;
        return s;
    }
}
```

## Running the tree

Wrap the root and tick it on its decision cadence. A behavior tree does **not** need to tick
every render frame — 5-15 Hz is plenty for most NPCs and cuts CPU cost drastically.

```csharp
public sealed class BehaviorTree
{
    private readonly Node _root;
    private readonly Blackboard _bb;
    public BehaviorTree(Node root, Blackboard bb) { _root = root; _bb = bb; }

    public Status Tick(float dt)
    {
        _bb.Set("time", _bb.Get<float>("time") + dt);   // keeps a clock for Cooldown/Wait
        var s = _root.Tick(_bb, dt);
        if (s != Status.Running) _root.Reset();
        return s;
    }
}

// Fluent assembly — build once at spawn, then tick.
var tree = new BehaviorTree(
    new ReactiveSelector()
        .Add(new ReactiveSequence()                      // combat branch (highest priority)
            .Add(new CanSeeTarget(sightRange: 12f))      // re-checked every tick
            .Add(new MoveToTarget(speed: 6f, arriveRadius: 1.5f))
            // ForceSuccess: while the cooldown blocks the hit, the guard holds position
            // instead of failing the branch and falling back to Patrol for a tick.
            .Add(new ForceSuccess().Wrap(new Cooldown(0.8f).Wrap(new AttackTarget()))))
        .Add(new Patrol(waypoints)),                     // fallback
    blackboard);
```

`Patrol` and `AttackTarget` are game-specific leaves; the skill's guard example defines both.
