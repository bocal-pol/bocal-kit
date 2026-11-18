---
name: cli-hub
description: "Find, inspect and install existing agent-native CLIs (CLI-Hub / CLI-Anything registry: GIMP, Blender, LibreOffice, Inkscape, Kdenlive, Godot, etc.) before you build one. Auto-invoke on mention of: find a CLI for a software, cli-hub, install cli-anything-<software>, which CLI drives X, agent-native CLI registry, workflow matrix."
model: claude-sonnet-5-5
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# CLI-Hub — Find an Agent-Native CLI Before You Build One

Package manager for the CLI-Anything registry (`pip install cli-anything-hub`, command `cli-hub`).
Use it **before** the `cli-anything` skill. If a CLI already covers the need, install it. Do not
rebuild it.

## Optional input (if invoked from cli-forge-agent)

Receive: the name or capability searched ("transcribe audio", "retouch an image"). Return: ranked
candidates (name, what they cover, install source, system prerequisites) and the recommendation.
Install nothing without approval. Do not memorize across sessions.

## Method

1. **Search** (read-only, no side effect):

   ```bash
   cli-hub search <keyword>        # keyword search
   cli-hub list                    # browse the registry
   cli-hub info <name>             # details of one CLI
   cli-hub can "<capability>"      # find a capability across matrices
   ```

2. **Workflow matrix** if the task spans several tools (produce a video, an image, a game). A matrix
   maps capabilities to providers (harness CLIs, public CLIs, libraries, binaries, cloud APIs).
   **Run preflight before you install**:

   ```bash
   cli-hub matrix search "video subtitle"
   cli-hub matrix preflight <matrix> --json                 # exit 3 = gaps
   cli-hub matrix preflight <matrix> -c <capability> --fix-hints
   cli-hub matrix install <matrix> --capability <id> --dry-run   # preview, no effect
   ```

   Exit codes: `0` ok · `3` partial/gaps · `1` failure · `2` usage. Limit the install (`--capability`,
   `--recipe`, `--only a,b`). Never install a whole matrix for one capability. Resume with
   `--resume`. Audit with `cli-hub matrix doctor <name>`.

3. **Present** the candidates and **ask for confirmation** before `cli-hub install <name>` (see
   Security).

4. **Install, then verify**:

   ```bash
   cli-hub install <name>
   cli-anything-<name> --help       # the command must answer from any directory
   cli-hub launch <name> [args...]
   ```

5. **Read the `SKILL.md`** of the installed CLI before you use it. It describes commands, `--json`
   and agent guidance.

## Security — an installed CLI runs third-party code

`cli-hub install` pulls packages (pip, npm, brew). Their code runs with the user's rights. Before any
install:

- State the source (PyPI/npm/brew), the exact package name and the version. Get confirmation.
- Prefer a virtual environment or `pipx` to a global install.
- For an **unverified community** CLI, offer a scan with `skillspector` (third-party skills/MCP) or
  `semgrep` on the source before install.
- Never pass a secret as a command-line argument.

The registry helps discovery. It is not an attestation: a name in the catalog does not prove that
the package is safe.

## Prerequisites

Many CLIs wrap a real software (GIMP, Blender, LibreOffice) that you install separately.
`cli-hub info` says which. If the software is missing, say so and give the system install command.
Do not run it.

## If nothing fits

Call the Skill tool with `cli-anything` (mode `build`, or `refine` if an existing CLI covers the need
in part). Pass it the software source and the gap found.

⚠️ Fallback: if `cli-hub` is not installed or the registry is unreachable, say so, offer
`pip install cli-anything-hub`, and otherwise look for the CLI in the `HKUDS/CLI-Anything`
repository (the software's directory) through `gh` or direct reading.
