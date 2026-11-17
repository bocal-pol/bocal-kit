---
name: godot-gdscript-headless-testing
description: "Runs Godot 4.7 GDScript tests with `godot --headless` and a `SceneTree` runner that exits nonzero on failure, so CI can block a merge. Owns Godot tests in CI. Auto-invoke for GitHub Actions jobs, or a headless run that hangs or exits 0 despite `SCRIPT ERROR` lines. Not for CI export (`godot-export`), the GDScript language (`godot-gdscript`), or Unity tests (`unity-csharp-scripting`)."
model: claude-sonnet-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot GDScript headless testing (4.x)

This skill owns running GDScript tests from a terminal or CI with a process exit code that means
something. Targets the **Godot 4.7** CLI; `--headless` is built into every 4.x editor binary.

The core rule behind most of this skill: **Godot's exit code only reflects what the runner passes
to `quit()`.** Script errors, `push_error()` and failed `assert()`s don't make it nonzero, so the
runner must count failures itself.

> Adapted/translated from `godot-gdscript-headless-testing` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Set up GitHub Actions (or other CI) jobs for Godot tests.
- Debug a headless run that hangs forever, or exits 0 despite `SCRIPT ERROR` lines in the log.

**Not this skill**: CI export (`godot-export`); the GDScript language itself (`godot-gdscript`);
Unity tests (`unity-csharp-scripting`).

## Main workflow

1. **Check the binary:** `godot --headless --version` prints a version and opens no window.
2. **Import on every fresh clone:** `godot --headless --path <project> --import`. `.godot/` is
   normally not committed, so without this step `class_name` types don't resolve and imported
   assets fail to load.
3. **Write the runner as a `SceneTree` script** (Pattern 1). `_initialize()` runs before the first
   frame and needs no `.tscn`.
4. **Count failures with a helper and finish with `quit(1 if failed > 0 else 0)`.** Don't fail
   tests with a bare `assert()`: in a debug build, a failed assert stops `_initialize()` before
   `quit()`, and the process never exits.
5. **Run it:**
   `godot --headless --path <project> --script res://tests/test_runner.gd` and read the exit
   code.
6. **In CI**, add the import step, a step timeout, and capture stdout/stderr to files (Pattern 3).
7. **Verify the runner itself before trusting a green run:** break an assertion on purpose and
   confirm the exit code becomes 1, then revert it. A runner that always exits 0 passes CI
   forever.

For quick checks with no test file, run a scene for a few hundred frames and scan the log, since
the exit code stays 0 after runtime errors:
`godot --headless --path <project> --quit-after 300 res://main.tscn > run.log 2>&1`, then
`grep -nE "SCRIPT ERROR|^ERROR:" run.log` (no match = clean).

## Patterns

### 1. Minimal SceneTree test runner with a real exit code

```gdscript
# res://tests/test_runner.gd
# godot --headless --path . --script res://tests/test_runner.gd
extends SceneTree

var passed := 0
var failed := 0

func _initialize() -> void:
    for t: String in ["test_add", "test_load"]:
        if call(t) != true:                       # a runtime error returns null, not true
            failed += 1
            push_error("FAIL %s: didn't finish (runtime error?)" % t)
    print("Results: %d passed, %d failed" % [passed, failed])
    quit(1 if failed > 0 else 0)

func assert_eq(actual, expected, label: String) -> void:
    if actual == expected:
        passed += 1
    else:
        failed += 1
        push_error("FAIL %s: expected %s, got %s" % [label, expected, actual])

func test_add() -> bool:
    assert_eq(2 + 2, 4, "add")
    return true

func test_load() -> bool:
    assert_eq(load("res://icon.svg") != null, true, "icon loads")
    return true
```

Tests return `true` as their last line so a test that dies halfway still gets counted: a runtime
error (calling a method on `null`) only aborts that function, which returns `null` to its caller.
For tests that `await`, use `await call(t)` in the loop.

### 2. Tests that need a frame, a timer or a signal

```gdscript
extends SceneTree

var failed := 0

func _initialize() -> void:
    await run_tests()
    print("Results: %d failed" % failed)
    quit(1 if failed > 0 else 0)

func run_tests() -> void:
    await process_frame                 # root joins the tree on the first frame
    var timer := Timer.new()
    timer.one_shot = true
    root.add_child(timer)
    timer.start(0.1)
    await timer.timeout
    if not timer.is_stopped():
        failed += 1
        push_error("FAIL timer_fires_once")
    timer.queue_free()
```

### 3. CI step (GitHub Actions)

```yaml
- name: Import project (fresh checkout has no .godot/)
  run: godot --headless --path . --import
- name: Run GDScript tests
  timeout-minutes: 5
  run: godot --headless --path . --script res://tests/test_runner.gd > test.log 2> test.err
- name: Show test output
  if: always()
  run: cat test.log test.err
```

## Verify

1. Run the suite and confirm exit code 0 on a healthy codebase.
2. Break an assertion on purpose, confirm exit code 1, then revert it.
3. Check that no `SCRIPT ERROR` or `ERROR:` appears in the captured logs on a green run.

## Pitfalls

- **The job hangs until the CI timeout** → a bare failed `assert()` stopped `_initialize()` before
  `quit()`; or an `await` is waiting on a signal that never fires. Use the counter helper, and run
  long `await`s against a timer.
- **An `await` never returns and nothing errors** → the object emitting the signal, or the node
  running the coroutine, was freed during the wait; Godot silently abandons the coroutine. Await
  `SceneTreeTimer`s (`create_timer()`), which the tree owns, for delays.
- **Exit code 0 even though checks failed** → the runner never calls `quit(1)`, or a test died on
  a runtime error and was never counted.
- **Exit code 0 even though the log shows `SCRIPT ERROR`** → expected: errors never change the
  exit code. Grep smoke-run logs.
- **`--check-only` fails with `Identifier not found: SomeAutoload`** → `--check-only` parses a
  single script without registering autoloads. Load scripts from a runner instead.
- **The log grep reports `... still in use at exit` or `... leaked at exit`** → shutdown leak
  reports for objects the test created and never freed. Free them (or `queue_free()` and await a
  frame before `quit()`); these aren't test failures.
- **`Identifier "X" not declared` or "No loader found" only in CI** → the import step is missing.
- **Nothing happens or the editor opens** → `--headless` is missing or the `--script` path is
  wrong.
- **`The InputMap action "x" doesn't exist` in a test** → the action isn't in `project.godot`;
  tests that press input can add missing actions with `InputMap.add_action()`, but the game needs
  the real Input Map entry.
- **Missing or jumbled output in PowerShell or some CI shells** → redirect stdout and stderr to
  files and read them after the process ends.

## References

- The official command-line tutorial docs cover every relevant CLI flag, and the `main.cpp` source
  confirms `--headless`, `--script` and `--import` behavior.

## Related skills

- `godot-gdscript`: language rules, plus a compile check for every script in the project.
- `godot-2d-movement`, `godot-animation`: ready-made headless behavior tests that plug into this
  runner.
- `godot-export`: exporting builds in CI, another use of `--headless`.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
