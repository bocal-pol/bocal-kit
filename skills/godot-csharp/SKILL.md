---
name: godot-csharp
description: "C#/.NET in Godot 4.7: partial node classes, PascalCase lifecycle, `[Export]`/`[Signal]`, signals as C# events, the `.csproj`, and calling GDScript. Auto-invoke for `.cs` scripts in Godot, porting GDScript to C#, a failed build, or a failed web/Android export. Not for GDScript (`godot-gdscript`), Unity C# (`unity-csharp-scripting`), or export presets (`godot-export`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot C# / .NET (4.x)

This skill owns writing Godot game code in C# that the source generators accept, compiling it from
the command line, and proof that it runs. Targets **Godot 4.7 .NET** with the **.NET 8** SDK (9 for
Android). Read the `.csproj` first: its `Sdk="Godot.NET.Sdk/x.y.z"` gives the engine version.

> Adapted/translated from `godot-csharp` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Write or port game code in C# in Godot, wire up `[Export]`/`[Signal]`, call GDScript from C# or
  vice versa.
- Debug a build failure, or a failed web or Android export.

**Not this skill**: GDScript (`godot-gdscript`); Unity C# (`unity-csharp-scripting`); export
presets and CLI (`godot-export`).

## Main workflow

1. **Confirm the toolchain.** The project needs Godot's **.NET** editor build (the standard build
   doesn't load C#) and a .NET SDK: `dotnet --list-sdks` should show 8.0 or higher, and 9.0 or
   higher if the project exports to Android.
2. **Every script is a `public partial class`** whose name matches the `.cs` filename and that
   extends a Godot type. The generators that wire up `[Export]`, `[Signal]` and method bindings
   only work on `partial` classes.
3. **Override lifecycle methods in PascalCase** with a `double` delta: `_Ready()`,
   `_Process(double delta)`, `_PhysicsProcess(double delta)`.
4. **Signals:** a `[Signal]` delegate named `XxxEventHandler` becomes the `Xxx` signal, a C#
   `Xxx` event and `SignalName.Xxx`. Emit with `EmitSignal(SignalName.Xxx, ...)`.
5. **Run the checks** below before concluding.

## Patterns

### 1. A node script: lifecycle, [Export], GetNode<T>

```csharp
using Godot;

public partial class Player : CharacterBody2D
{
    [Export] public float Speed { get; set; } = 200.0f;
    [Export] public float JumpVelocity { get; set; } = -400.0f;

    private AnimatedSprite2D _sprite;

    public override void _Ready()
    {
        _sprite = GetNode<AnimatedSprite2D>("AnimatedSprite2D");
    }

    public override void _PhysicsProcess(double delta)
    {
        Vector2 v = Velocity;                       // struct copy: modify, then reassign
        if (!IsOnFloor())
            v += GetGravity() * (float)delta;
        if (Input.IsActionJustPressed("jump") && IsOnFloor())
            v.Y = JumpVelocity;

        float dir = Input.GetAxis("move_left", "move_right");
        v.X = dir != 0 ? dir * Speed : Mathf.MoveToward(v.X, 0, Speed);

        Velocity = v;
        MoveAndSlide();
    }
}
```

### 2. Signals as C# events

```csharp
using Godot;

public partial class Health : Node
{
    [Signal] public delegate void HealthChangedEventHandler(int current, int max);

    private int _hp = 100;

    public override void _Ready() => HealthChanged += OnHealthChanged;

    public override void _ExitTree() => HealthChanged -= OnHealthChanged;

    public void TakeDamage(int amount)
    {
        _hp = Mathf.Max(_hp - amount, 0);
        EmitSignal(SignalName.HealthChanged, _hp, 100);
    }

    private void OnHealthChanged(int current, int max) => GD.Print($"HP {current}/{max}");
}
```

### 3. Instancing a scene

```csharp
public partial class Spawner : Node2D
{
    private static readonly PackedScene Bullet = GD.Load<PackedScene>("res://bullet.tscn");

    public void Shoot(Vector2 at)
    {
        var b = Bullet.Instantiate<Node2D>();
        b.Position = ToLocal(at);   // world -> this parent's local space, before _Ready runs
        AddChild(b);
    }
}
```

### 4. Calling GDScript from C#

```csharp
Node gd = GetNode("Enemy");                       // a node with a .gd script
gd.Call("take_damage", 10);                       // snake_case names, checked at runtime
int score = gd.Get("score").AsInt32();
gd.Connect("died", Callable.From(OnDied));
```

## Verify

1. Compile: `dotnet build <project>.csproj` from the project folder must exit 0 with no errors.
   The Godot runtime doesn't compile C#, so a headless run uses whatever was last compiled.
2. Run with the .NET editor binary headless and read the log, since an unhandled exception in a
   callback logs as `ERROR:` but keeps the game alive, so the exit code stays 0.
3. If `godot-nodes-scenes` is installed, run its path checker to catch broken script and scene
   paths in `.tscn` files.
4. For behavior tests in CI, follow `godot-gdscript-headless-testing`; compile before the test
   step.

## Pitfalls

- **`Cannot find class X for script res://X.cs`** → the class name differs from the filename.
- **Build errors from generated code, or `[Export]` missing in the Inspector** → the class isn't
  `partial`, or the project wasn't rebuilt. The Inspector only shows members from the last
  successful build.
- **`CallDeferred("AddChild", node)` doesn't work** → string-based engine calls (`Call`,
  `CallDeferred`, `Get`, `Set`, `Connect`) use the engine's snake_case names. Pass
  `MethodName.AddChild` (or `"add_child"`) instead.
- **An override never runs** → wrong casing or signature (`_process`, or `float delta`). C# uses
  PascalCase and `double`.
- **`[Signal]` not found** → the delegate name must end in `EventHandler`; the signal is the name
  without that suffix.
- **`ObjectDisposedException` in a signal handler** → the receiver was freed while the emitter was
  still alive, and Godot couldn't disconnect it because the signal is a custom `[Signal]` or the
  handler is a lambda capturing variables. Unsubscribe with `-=` in `_ExitTree()`.
- **Editing `Velocity.X` doesn't compile** → `Vector2`, `Color` and `Transform2D` are structs.
  Copy, modify, reassign.
- **A cross-language call does nothing** → names aren't translated: GDScript calls a C# node by
  its C# names (`node.TakeDamage(10)`), C# calls GDScript by its snake_case names
  (`Call("take_damage", 10)`). A `Call()` with the wrong argument count fails silently; test the
  effect.
- **`Console.WriteLine` output is missing** → use `GD.Print`/`GD.PrintErr`/`GD.PushError` so it
  reaches the Output panel and the log file.
- **The web export fails** → C# projects can't export to web in Godot 4. Android and iOS work but
  are experimental, and iOS exports need macOS.
- **The Android export fails but desktop works** → the generated `.csproj` switches to `net9.0`
  for Android, so the .NET 9 SDK is required.

## References

- The official docs on C# in Godot cover `.csproj` and NuGet details, export attribute variants,
  `Godot.Collections` vs. `System.Collections`, `await ToSignal(...)`, `[GlobalClass]` resources, a
  GDScript-to-C# table, and per-platform export notes.

## Related skills

- `godot-gdscript`: the GDScript equivalents of these patterns.
- `godot-signals-groups`: signal architecture, language-agnostic.
- `godot-resources`: data resources; `[GlobalClass]` is the C# equivalent of `class_name`.
- `godot-export`: export presets and CLI.
- `unity-csharp-scripting`: C# in Unity, for developers coming from there.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- Minimum SDKs: .NET 8 or higher, .NET 9 or higher for Android exports. The generated `.csproj`
  targets `net8.0` and `net9.0` when `GodotTargetPlatform` is `android`.
- Web export: unsupported for C# in Godot 4. Android and iOS: experimental since 4.2.
