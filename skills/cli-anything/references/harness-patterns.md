# CLI-Anything harness code patterns

Source: `HKUDS/CLI-Anything` (Apache-2.0), adapted. Read before Phase 3 of `cli-anything`.

## Target tree

```text
<software>/agent-harness/
├── setup.py
└── cli_anything/                # NO __init__.py (PEP 420 namespace)
    └── <software>/              # __init__.py present
        ├── <software>_cli.py    # Click group + REPL
        ├── core/                # project.py, session.py, export.py
        ├── utils/               # <software>_backend.py, repl_skin.py
        ├── skills/SKILL.md      # compatibility copy
        └── tests/               # TEST.md, test_core.py, test_full_e2e.py
```

## `setup.py`

```python
from setuptools import setup, find_namespace_packages

setup(
    name="cli-anything-<software>",
    version="1.0.0",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    install_requires=["click>=8.0.0", "prompt-toolkit>=3.0.0"],
    package_data={"cli_anything.<software>": ["skills/*.md"]},
    entry_points={"console_scripts": [
        "cli-anything-<software>=cli_anything.<software>.<software>_cli:main",
    ]},
    python_requires=">=3.10",
)
```

Use `find_namespace_packages`, never `find_packages`. `install_requires` cannot express the system
software. Document it in `README.md` and raise a clear error.

## Backend: call the real software

```python
import shutil, subprocess

def find_software() -> str:
    path = shutil.which("<software>")
    if path:
        return path
    raise RuntimeError(
        "<Software> is not installed. Install it with:\n"
        "  apt install <software>    # Debian/Ubuntu\n"
        "  brew install <software>   # macOS"
    )

def export(project_path: str, output: str, timeout: int = 300) -> dict:
    exe = find_software()
    subprocess.run([exe, "--headless", "--convert-to", "pdf", project_path],
                   check=True, timeout=timeout)   # explicit timeout, never infinite
    return {"output": output, "method": "<software>-headless"}
```

Usual engines: LibreOffice `--headless --convert-to` · Blender `--background --python` · GIMP
`-i -b '(script-fu-console-eval …)'` · Inkscape `--actions=… --export-filename=` · Kdenlive/Shotcut
`melt project.mlt -consumer avformat:output.mp4` · OBS `obs-websocket`.

## Rendering gap

A naive render tool ignores the effects added to the project file (for example, `ffmpeg concat`
reads the raw media). Order: **native engine** (`melt`), then **translation to the render tool's
filter graph** (merge duplicate filters, keep stream order, convert parameter scales, report effects
that cannot be translated), then a **render script** to run by hand. Document the gap in
`<SOFTWARE>.md`.

## Session lock

Never `open("w") + json.dump`. `open("w")` truncates the file before the lock is taken.

```python
import json, os

def _locked_save_json(path, data, **dump_kwargs) -> None:
    try:
        f = open(path, "r+")                  # no truncation on open
    except FileNotFoundError:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        f = open(path, "w")                   # first save
    with f:
        locked = False
        try:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            locked = True
        except (ImportError, OSError):
            pass                              # Windows / unsupported FS: no lock
        try:
            f.seek(0)
            f.truncate()                      # truncate INSIDE the lock
            json.dump(data, f, **dump_kwargs)
            f.flush()
        finally:
            if locked:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
```

## REPL by default

```python
@click.group(invoke_without_command=True)
@click.option("--json", "as_json", is_flag=True, help="Machine-readable output")
@click.pass_context
def cli(ctx, as_json):
    ctx.obj = {"json": as_json}
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl, project_path=None)
```

The REPL uses one shared "skin" (banner, `success/error/warning/info`, `table`, `progress`,
`prompt_toolkit` history) copied into `utils/repl_skin.py`. The banner shows the `SKILL.md` path so
that the agent can read it.

## Subprocess tests

```python
import os, shutil, subprocess, sys

def _resolve_cli(name: str) -> list[str]:
    force = os.environ.get("CLI_ANYTHING_FORCE_INSTALLED", "").strip() == "1"
    path = shutil.which(name)
    if path:
        print(f"[_resolve_cli] Using installed command: {path}")
        return [path]
    if force:
        raise RuntimeError(f"{name} not found in PATH. Install with: pip install -e .")
    module = name.replace("cli-anything-", "cli_anything.") + "." + name.split("-")[-1] + "_cli"
    print(f"[_resolve_cli] Falling back to: {sys.executable} -m {module}")
    return [sys.executable, "-m", module]
```

Rules: always use `_resolve_cli`, never a hard-coded path. **Do not set `cwd`**: the installed
command works from any directory. Test `--help`, `--json`, project creation, the key commands and a
full workflow, up to the file that the real software produces.

## Output verification

| Format | Check |
| --- | --- |
| PDF | magic bytes `%PDF-`, size > 0 |
| DOCX / XLSX / PPTX | valid ZIP, OOXML structure |
| Video | frame 0 (fade-in = near black), middle frames (brightness/saturation vs source), last frame; exclude letterbox bars |
| Audio | RMS at start/end (fades), spectrum vs source, duration |
| Image | dimensions, pixel comparison |

Print each artifact path (`print(f"PDF: {path} ({size:,} bytes)")`).

## MCP backend

For software that exposes only an MCP server (for example DOMShell for the browser):

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def _call_tool(tool: str, args: dict):
    params = StdioServerParameters(command="npx", args=["<mcp-server-package>"])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            return await session.call_tool(tool, args)

def ls(path: str = "/") -> dict:
    return asyncio.run(_call_tool("<ls_tool>", {"path": path}))
```

The server restarts at each command. The CLI keeps the state (URL, current directory, history). An
optional daemon mode (`--daemon`) lowers latency. Add `mcp` to `install_requires`. Check the server
package before you start it through `npx` (supply chain; see `skillspector`).
