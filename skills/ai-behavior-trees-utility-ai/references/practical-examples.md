# Practical examples: guard AI, villager needs, hybrid agent

Contents:
1. Enemy guard: Patrol and Combat behavior tree (`Patrol`, `AttackTarget`, `GuardAgent`)
2. Villager needs: utility AI
3. Hybrid: a BT leaf that delegates a choice to utility (`UtilitySelectorNode`)

Three templates that assemble this skill's BT runtime and utility scorer into real agents.
They assume these types already exist in the project. Wire the movement and attack leaves to
the engine's transform, navigation, and combat.

## 1. Enemy guard — Patrol → Combat behavior tree

The classic guard: patrols waypoints until it sees the player, then closes in and attacks on
cooldown, falling back to patrol when the player escapes. Two extra leaves complete the set
promised by the core:

```csharp
// Patrol: walks a ring of waypoints, pausing at each. Always Running (a patrol never "finishes").
public sealed class Patrol : Leaf
{
    private readonly Vector2[] _points;
    private readonly float _speed, _pause;
    private int _i;
    private float _waited;

    public Patrol(Vector2[] points, float speed = 3f, float pause = 1f)
    { _points = points; _speed = speed; _pause = pause; }

    public override Status Tick(Blackboard bb, float dt)
    {
        var pos = bb.Get<Vector2>("position");
        var goal = _points[_i];
        if ((goal - pos).magnitude > 0.2f)
        {
            bb.Set("position", pos + (goal - pos).normalized * _speed * dt);
            return Status.Running;
        }
        _waited += dt;                                  // waypoint reached: pause, then advance
        if (_waited >= _pause) { _waited = 0f; _i = (_i + 1) % _points.Length; }
        return Status.Running;
    }

    public override void Reset() => _waited = 0f;
}

// AttackTarget: a single hit. Wrap in a Cooldown decorator to rate-limit it (see the assembly below).
public sealed class AttackTarget : Leaf
{
    public override Status Tick(Blackboard bb, float dt)
    {
        if (!bb.TryGet<IDamageable>("target", out var target)) return Status.Failure;
        target.ApplyDamage(10f);
        return Status.Success;
    }
}
```

Assemble and drive it. Perception writes `targetPos`/`target` onto the blackboard; the tree
only *decides*:

```csharp
public sealed class GuardAgent
{
    private readonly BehaviorTree _tree;
    private readonly Blackboard _bb = new();
    private float _decisionTimer;
    private const float TickRate = 1f / 10f;             // decides at 10 Hz, not every frame

    public GuardAgent(Vector2[] patrolRoute)
    {
        _tree = new BehaviorTree(
            new ReactiveSelector()                       // reactive: seeing the player preempts patrol
                .Add(new ReactiveSequence()              // --- combat branch (higher priority) ---
                    .Add(new CanSeeTarget(sightRange: 12f))          // re-checked every tick
                    .Add(new MoveToTarget(speed: 6f, arriveRadius: 1.5f))
                    .Add(new ForceSuccess().Wrap(new Cooldown(0.8f).Wrap(new AttackTarget()))))
                .Add(new Patrol(patrolRoute)),           // --- fallback ---
            _bb);
    }

    // Call every frame; the tree itself only ticks on the decision cadence.
    public void Update(float dt, PerceptionResult perception)
    {
        _bb.Set("position", perception.SelfPos);
        if (perception.SeesPlayer) { _bb.Set("targetPos", perception.PlayerPos); _bb.Set("target", perception.Player); }
        else _bb.Remove("targetPos");

        _decisionTimer += dt;
        if (_decisionTimer < TickRate) return;
        _tree.Tick(_decisionTimer);
        _decisionTimer = 0f;
    }
}
```

## 2. Villager needs — utility AI

When behavior is driven by competing *needs* rather than a fixed priority order, utility AI
fits better. A villager weighs hunger, fatigue, and social need against opportunity, and does
the most desired thing:

```csharp
UtilityEvaluator BuildVillagerBrain()
{
    // Each action: weight * combined considerations (all 0..1). Curves shape the "desire".
    var eat = new UtilityAction("Eat") { Weight = 1.2f }
        .With(new Consideration("hunger", bb => bb.Get<float>("hunger01"),
                                 t => Curves.Sigmoid(t, k: 10f, mid: 0.5f)))     // wants food as hunger rises
        .With(new Consideration("hasFood", bb => bb.Get<float>("food01"), Curves.Linear));

    var sleep = new UtilityAction("Sleep") { Weight = 1f }
        .With(new Consideration("fatigue", bb => bb.Get<float>("fatigue01"),
                                 t => Curves.Quadratic(t)))                       // strong only when very tired
        .With(new Consideration("isNight", bb => bb.Get<float>("night01"), Curves.Smoothstep));

    var socialize = new UtilityAction("Socialize") { Weight = 0.8f }
        .With(new Consideration("lonely", bb => bb.Get<float>("loneliness01"), Curves.Linear))
        .With(new Consideration("friendsNear", bb => bb.Get<float>("friendsNear01"), Curves.Smoothstep));

    var work = new UtilityAction("Work") { Weight = 0.7f }
        .With(new Consideration("daytime", bb => bb.Get<float>("day01"), Curves.Smoothstep))
        .With(new Consideration("notTooTired",
              bb => 1f - bb.Get<float>("fatigue01"), Curves.Linear));            // inverted fact

    return new UtilityEvaluator().Add(eat).Add(sleep).Add(socialize).Add(work);
}

// Per decision step: pick and dispatch. Hysteresis keeps the villager from flickering on near-ties.
void UpdateVillager(UtilityEvaluator brain, Blackboard bb)
{
    var choice = brain.SelectBest(bb, inertiaBonus: 0.05f);
    if (choice == null) return; // no action available; preserve the game's idle behavior
    Dispatch(choice.Name);      // route "Eat"/"Sleep"/... to gameplay handlers
}
```

## 3. Hybrid — a BT that delegates a choice to utility AI

The best of both: a behavior tree gives top-level *structure and priorities*; a utility node
makes a *graded sub-choice* (which target, which attack) inside a branch. Connect them with a
leaf that owns a `UtilityEvaluator` and runs the winner's `Behavior` subtree.

```csharp
// A BT leaf that scores utility actions and ticks the chosen action's Behavior subtree.
public sealed class UtilitySelectorNode : Leaf
{
    private readonly UtilityEvaluator _evaluator;
    private readonly float _inertia;
    private UtilityAction _running;

    public UtilitySelectorNode(UtilityEvaluator evaluator, float inertia = 0.05f)
    { _evaluator = evaluator; _inertia = inertia; }

    public override Status Tick(Blackboard bb, float dt)
    {
        var choice = _evaluator.SelectBest(bb, _inertia);
        if (choice != _running) { _running?.Behavior?.Reset(); _running = choice; }  // switch: clean up
        var s = _running?.Behavior?.Tick(bb, dt) ?? Status.Failure;
        if (s != Status.Running) Reset();             // the chosen subtree may be re-entered
        return s;
    }

    public override void Reset() { _running?.Behavior?.Reset(); _running = null; }
}
```

```csharp
// Combat structured by a BT; "which attack" chosen by utility every tick.
var attackChoice = new UtilityEvaluator()
    .Add(new UtilityAction("Melee")  { Weight = 1f, Behavior = new MeleeCombo() }
        .With(new Consideration("close", bb => Curves.InverseLerp01(bb.Get<float>("distToPlayer"), 6f, 1f), Curves.Smoothstep)))
    .Add(new UtilityAction("Ranged") { Weight = 1f, Behavior = new FireVolley() }
        .With(new Consideration("far",  bb => Curves.InverseLerp01(bb.Get<float>("distToPlayer"), 2f, 14f), Curves.Smoothstep))
        .With(new Consideration("ammo", bb => bb.Get<float>("ammo01"), Curves.Linear)));

var hybrid = new BehaviorTree(
    new ReactiveSelector()
        .Add(new ReactiveSequence()                       // keeps re-checking sight while attacking
            .Add(new CanSeeTarget(12f))
            .Add(new UtilitySelectorNode(attackChoice)))   // the BT chooses "engage"; utility chooses how
        .Add(new Patrol(route)),
    blackboard);
```

This layering is the recommended default for combat AI: keep the BT readable and debuggable for
"engage vs. disengage vs. patrol", and let utility handle the continuous trade-offs. Keep the
utility set inside a branch small so scoring stays cheap.
