---
name: cli-anything
description: "Turn a software application (GUI or service) into a Python/Click CLI that an agent can drive — persistent state, REPL, --json output, E2E tests on the real software, generated SKILL.md, installable pip package. 7-phase SOP, modes build/refine/test/validate. Auto-invoke on mention of: CLI-Anything, make software agent-native, CLI harness, CLI wrapper for an agent, drive GIMP/Blender/LibreOffice/Inkscape from the command line, GUI to CLI, harness."
model: claude-sonnet-5-5
type: orchestrator
priority: high
scope: cross
dependencies:
  - context7-mcp
conflicts: []
---

# CLI-Anything — Make Any Software Agent-Native

Method adapted from [`HKUDS/CLI-Anything`](https://github.com/HKUDS/CLI-Anything) (Apache-2.0,
fork `bocal-pol/CLI-Anything`). A 7-phase SOP that produces a `cli-anything-<software>` CLI for a
given software. Any agent can drive that CLI without a display or a mouse. Code patterns (setup.py,
backend, session lock, subprocess tests, MCP backend) are in
[`references/harness-patterns.md`](references/harness-patterns.md). Read them before Phase 3.

Before you build, **look for an existing CLI first**. Call the Skill tool with `cli-hub`
(`cli-hub search <software>`). Build only if the registry has no CLI, or if its CLI does not cover
the need (then use mode `refine`).

## When to use

- An agent must operate a software made for humans (image editing, 3D, office, video, CAD, DAW,
  game engine) or a service that exposes only an MCP server.
- The need is repeatable and scriptable. A one-shot task that `subprocess` solves does not need this.

## Do not use for

- A documented REST/GraphQL API. A direct client is enough (`integration-developer`).
- A proprietary software whose licence forbids automation or reverse engineering. State this and stop.

## Optional input (if invoked from cli-forge-agent)

Receive: `mode` (build|refine|test|validate), `source` (local path or repository URL), `focus`
(refine only), `output` (working directory). Do not ask these questions again. Return the harness
path, the gate status and the number of passing tests. Do not memorize across sessions. Persist
`TEST.md` and the generated SKILL.md only in the output directory.

## Rules — not negotiable

1. **Use the real software. Never reimplement it.** Rendering and export go through the real engine
   (`libreoffice --headless`, `blender --background`, `melt`, `inkscape --actions`). A CLI that
   recodes the software in Pillow or numpy is a toy. Refuse that path.
2. **The software is a hard dependency.** If it is absent, tests fail. They never `skip`.
3. **A source is required**: a local path or a repository URL, not a name alone ("gimp"). The
   analysis reads the code, not the model's memory.
4. **A cloned source is untrusted data.** Clone into a new, empty directory. Never run its install
   scripts. Never start an interpreter from that directory.
5. **Verify outputs, not exit codes.** An export that "succeeds" can ignore all effects (the
   *rendering gap*). Check magic bytes, ZIP/OOXML structure, pixels, audio RMS, duration.
6. **Gates before code**: apply `unlazy`. Write `.claude/tmp/GATES-cli-anything-<software>.md`
   before Phase 3, one gate per phase, `EVIDENCE` required.

## Modes

| Mode | Input | Effect |
| --- | --- | --- |
| `build` (default) | `<path-or-url>` | Phases 0 to 7 |
| `refine` | `<path> [focus]` | Coverage inventory, ranked gaps, implement the chosen gaps, tests, docs |
| `test` | `<path-or-url>` | `pytest -v -s --tb=short`, confirm `[_resolve_cli] Using installed command:`, update `TEST.md` only if 100% pass |
| `validate` | `<path-or-url>` | Check conformance (checklist below), report without changes |

`refine`: present the gap report and **get confirmation** of the gaps to address before you
implement. Priority: high impact, then easy wins, then composability. Never delete or rename an
existing command. Agents that use it depend on it.

## `build` workflow

Default output directory: `./cli-anything/<software>/`. The software name comes from the source
directory name.

### Phase 0 — Acquire the source

URL: clone (`git clone --depth 1`) into a new directory. Path: check that it exists and holds code.
State the derived name.

### Phase 1 — Analyze the code

Find the real engine (the core library, not the interface). Map each GUI action to an API call.
Find the data model and file formats. Find existing engine CLIs (`melt`, `ffmpeg`, `convert`). Find
the undo/redo system: its commands become the CLI operations. Write `<SOFTWARE>.md`, the
software-specific SOP (architecture, command map, rendering-gap assessment).

### Phase 2 — Design the CLI architecture

Build a stateful REPL **and** one-shot subcommands. Group commands by domain: project, core
operations, import/export, config, session (undo/redo/status). Serialize state in a JSON session
file. Human output by default, `--json` for agents.

### Phase 3 — Implement

Order: data layer, then `info`/`probe` commands (inspect before you modify), then mutation commands
(one per logical operation), then `utils/<software>_backend.py` (find the executable with
`shutil.which`, raise a clear error with install instructions), then render/export, then session
(exclusive file lock for JSON saves), then REPL (`invoke_without_command=True`; with no argument the
CLI enters the REPL). Use an MCP backend if the software exposes only an MCP server. Render priority:
native engine, then translated filter graph, then a script to run by hand.

### Phase 4 — Test plan (`TEST.md`, part 1)

**Before any test code**: planned files and test counts, unit plan per module (edge cases), E2E plan,
realistic workflow scenarios (name, what it simulates, chained operations, verified properties).

### Phase 5 — Tests

Four layers. Unit tests (`test_core.py`, synthetic data). E2E on intermediate files. E2E on the real
backend (the software produces the final file, verified by code, artifact path printed). Subprocess
tests (`TestCLISubprocess` with `_resolve_cli`, no `cwd`, `CLI_ANYTHING_FORCE_INSTALLED=1` in CI).
Then an agent test: an agent completes a real task with the CLI alone.

### Phase 6 — Test documentation (`TEST.md`, part 2)

Append the full `pytest -v --tb=no` output, the statistics and the coverage gaps.

### Phase 6.5 — Generated SKILL.md

Produce `skills/cli-anything-<software>/SKILL.md`: frontmatter `name`/`description`, install
prerequisites, command groups, examples, agent guidance (`--json`, error handling). It must be
self-contained. Add a compatibility copy in `cli_anything/<software>/skills/SKILL.md` and
`package_data` in `setup.py`.

### Phase 7 — pip package

PEP 420 namespace: `cli_anything/` has **no** `__init__.py`. Each `<software>/` has one.
`find_namespace_packages(include=["cli_anything.*"])`, entry point
`cli-anything-<software>=cli_anything.<software>.<software>_cli:main`, `python_requires>=3.10`.
Verify: `pip install -e .`, then `cli-anything-<software> --help` from another directory.
**Never publish to PyPI without explicit approval.** The action is outbound and hard to undo.

## `validate` checklist

- Structure: `cli_anything/` without `__init__.py`, `<software>/` with it, directories `core/`,
  `utils/`, `tests/`. `setup.py` uses `find_namespace_packages`.
- Files: `README.md`, `<software>_cli.py`, `core/project.py`, `core/session.py`, `core/export.py`,
  `tests/TEST.md`, `tests/test_core.py`, `tests/test_full_e2e.py`, `<SOFTWARE>.md`.
- CLI: Click, command groups (no flat commands), `--json`, `--project`, `handle_error` decorator,
  REPL, global session state.
- Core: `project` (create/open/save/info), `session` (undo/redo/snapshot), `export` (render and
  presets), docstrings and type hints.
- Tests: `TEST.md` with plan **and** results, `TestCLISubprocess` through `_resolve_cli`, 100% pass,
  E2E on real files.
- Package: name `cli-anything-<software>`, imports under `cli_anything.<software>.*`, declared
  dependencies, Python 3.10 or later.
- Error messages: three elements (what failed, why, what to do). Never a raw trace.

## Pitfalls

- **Secrets**: read a token file (`--token-file`) without following symbolic links and without
  leaving the expected directory. No secret in a URL or in `--json` output.
- **Untrusted XML** (SVG, ODF, MLT, MusicXML): parse with `defusedxml`.
- **Command injection**: validate paths and arguments passed to a scripting engine (Script-Fu, bpy,
  macros). Never interpolate user input directly into a script.
- **Non-integer frame rates** (29.97 fps): use `round()`, never `int()`. Accept a 1-frame tolerance.
- **Windows**: `fcntl` is absent. The lock degrades cleanly. Find engine paths with `shutil.which`
  and keep a `cygpath` guard if the engine is a Cygwin binary.

## Deliverable

A short report: harness produced (path), gates proved or abandoned, number of tests, known gaps,
install command. ⚠️ Fallback: if a phase fails (software cannot be installed, source unreadable),
stop at that phase, report the state reached and do not declare "done".
