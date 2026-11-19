#!/usr/bin/env bash
#
# Automatic setup for the Claude Code environment (~/.claude) — Linux / macOS.
#
# Linux/macOS counterpart to install.ps1 (Windows). Automates the procedure described
# in INSTALL.md:
#   Phase 0   — System prerequisites: git, Node.js, Python, PHP, Docker, Claude Code CLI
#   Phase 1   — Deploy the bocal-kit repo to ~/.claude
#   Phase 2   — Required MCP servers (context7, sequential-thinking)
#   Phase 3   — Optional MCP servers (Playwright)
#   Phase 3b  — ICT MCP servers (filesystem, ssh)
#   Phase 4   — Graphify (project mapping)
#   Phase 4b  — Floorplan (interactive HTML codebase map, Claude Code plugin)
#   Phase 4c  — Codex (@openai/codex CLI, native — no WSL on Linux/macOS)
#   Phase 5   — Headroom (token usage reduction)
#   Phase 5b  — brag (FFmpeg + Hyperframes check for the launch video)
#   Phase 6   — Final check and summary
#
# Idempotent — safe to run again.
#
# Usage:
#   bash install.sh [--force-clone]
#
#   --force-clone   If ~/.claude exists but is not the bocal-kit repo, back it up
#                   to ~/.claude.bak-<timestamp> then clone the repo in its place.
#                   Without this parameter, the script never overwrites an existing ~/.claude.

set -uo pipefail

FORCE_CLONE=false
for arg in "$@"; do
  case "$arg" in
    --force-clone) FORCE_CLONE=true ;;
  esac
done

# ----------------------------------------------------------------- Helpers --

declare -a RESULT_NAMES=()
declare -a RESULT_STATUS=()
declare -a RESULT_DETAIL=()

add_result() { RESULT_NAMES+=("$1"); RESULT_STATUS+=("$2"); RESULT_DETAIL+=("${3:-}"); }

c_green=$'\033[32m'; c_cyan=$'\033[36m'; c_gray=$'\033[90m'
c_yellow=$'\033[33m'; c_red=$'\033[31m'; c_reset=$'\033[0m'

write_step() {
  local status="$1" message="$2" color="$c_reset"
  case "$status" in
    OK) color="$c_green" ;; INSTALL) color="$c_cyan" ;; SKIP) color="$c_gray" ;;
    WARN) color="$c_yellow" ;; FAIL) color="$c_red" ;; INFO) color="$c_reset" ;;
  esac
  printf '%s[%-7s]%s %s\n' "$color" "$status" "$c_reset" "$message"
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

# OS + package manager detection
OS_KIND=""
PM=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  OS_KIND="macos"
  command_exists brew && PM="brew"
elif command_exists apt-get; then
  OS_KIND="linux"; PM="apt"
elif command_exists dnf; then
  OS_KIND="linux"; PM="dnf"
elif command_exists pacman; then
  OS_KIND="linux"; PM="pacman"
else
  OS_KIND="linux"; PM=""
fi

pm_install() {
  # Installs a package with the detected manager. $1 = display name, the rest = package
  # names (can differ between apt/dnf/pacman/brew, e.g. "nodejs npm" vs "node").
  local label="$1"; shift
  case "$PM" in
    apt)    sudo apt-get update -qq && sudo apt-get install -y "$@" ;;
    dnf)    sudo dnf install -y "$@" ;;
    pacman) sudo pacman -Sy --noconfirm "$@" ;;
    brew)   brew install "$@" ;;
    *)      write_step FAIL "No known package manager — install $label manually."
            return 1 ;;
  esac
}

# =============================================================================
echo ''
echo '=== Claude Code environment setup (bocal-kit) — Linux/macOS ===' | sed "s/.*/${c_cyan}&${c_reset}/"
echo ''
write_step INFO "Detected system: $OS_KIND (package manager: ${PM:-none})"

# ------------------------------------------------ Phase 0 — System prerequisites
echo ''
echo '--- Phase 0: System prerequisites ---'

# Git
if command_exists git; then
  write_step OK "Git already present ($(git --version))."
  add_result 'Git' 'OK' "$(git --version)"
else
  write_step INSTALL 'Git missing — installing...'
  if pm_install 'Git' git; then
    write_step OK 'Git installed.'; add_result 'Git' 'installed'
  else
    add_result 'Git' 'failed' 'package install'
  fi
fi

# Node.js — needed for npx, the Claude CLI and MCP servers (18+ recommended)
if command_exists node; then
  write_step OK "Node.js already present ($(node --version))."
  add_result 'Node.js' 'OK' "$(node --version)"
else
  write_step INSTALL 'Node.js missing — installing...'
  installed=false
  if [[ "$PM" == "apt" ]]; then
    pm_install 'Node.js' nodejs npm && installed=true
  elif [[ "$PM" == "brew" ]]; then
    pm_install 'Node.js' node && installed=true
  else
    pm_install 'Node.js' nodejs npm && installed=true
  fi
  if $installed && command_exists node; then
    write_step OK "Node.js installed ($(node --version))."
    add_result 'Node.js' 'installed'
    node_major=$(node --version | sed 's/^v//' | cut -d. -f1)
    if [[ "$node_major" -lt 18 ]]; then
      write_step WARN "Node.js $(node --version) is old — install Node 18+ via nvm if problems show up (https://github.com/nvm-sh/nvm)."
    fi
  else
    write_step FAIL 'Node.js installation failed.'
    add_result 'Node.js' 'failed' 'package install'
  fi
fi

# Python — Graphify needs 3.8+, Headroom needs 3.10+
PYTHON_EXE=""
for candidate in python3 python; do
  if command_exists "$candidate"; then
    ver=$("$candidate" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    if [[ -n "$ver" ]]; then PYTHON_EXE="$candidate"; PYTHON_VER="$ver"; break; fi
  fi
done
python_ok=false
if [[ -n "$PYTHON_EXE" ]]; then
  major=$(echo "$PYTHON_VER" | cut -d. -f1); minor=$(echo "$PYTHON_VER" | cut -d. -f2)
  if [[ "$major" -gt 3 || ( "$major" -eq 3 && "$minor" -ge 10 ) ]]; then
    write_step OK "Python already present (Python $PYTHON_VER)."
    add_result 'Python' 'OK' "Python $PYTHON_VER"
    python_ok=true
  else
    write_step WARN "Python $PYTHON_VER found — Headroom needs 3.10+. Installing a recent version..."
  fi
fi
if ! $python_ok; then
  case "$PM" in
    apt)  pm_install 'Python' python3 python3-pip python3-venv ;;
    brew) pm_install 'Python' python@3.12 ;;
    *)    pm_install 'Python' python3 python3-pip ;;
  esac
  for candidate in python3 python; do
    if command_exists "$candidate"; then
      ver=$("$candidate" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
      major=$(echo "$ver" | cut -d. -f1); minor=$(echo "$ver" | cut -d. -f2)
      if [[ "$major" -gt 3 || ( "$major" -eq 3 && "$minor" -ge 10 ) ]]; then
        PYTHON_EXE="$candidate"; python_ok=true
        write_step OK "Python installed (Python $ver)."
        add_result 'Python' 'installed' "Python $ver"
        break
      fi
    fi
  done
  if ! $python_ok; then
    write_step FAIL "Python 3.10+ not found after installation."
    add_result 'Python' 'failed' 'insufficient version or install failed'
  fi
fi

# PHP
if command_exists php; then
  write_step OK "PHP already present ($(php --version | head -1))."
  add_result 'PHP' 'OK' "$(php --version | head -1)"
else
  write_step INSTALL 'PHP missing — installing...'
  pkg="php"; [[ "$PM" == "apt" ]] && pkg="php-cli"
  if pm_install 'PHP' "$pkg" && command_exists php; then
    write_step OK 'PHP installed.'; add_result 'PHP' 'installed'
  else
    write_step FAIL 'PHP installation failed — install manually.'
    add_result 'PHP' 'failed' 'package install'
  fi
fi

# Docker
if command_exists docker; then
  write_step OK 'Docker already present.'
  add_result 'Docker' 'OK'
else
  write_step INSTALL 'Docker missing — installing...'
  if [[ "$OS_KIND" == "macos" ]]; then
    if [[ "$PM" == "brew" ]]; then
      brew install --cask docker
      write_step WARN 'Docker Desktop installed — start it manually once (Applications icon).'
      add_result 'Docker' 'installed' 'manual launch required'
    else
      write_step WARN 'Homebrew missing — install Docker Desktop manually: https://www.docker.com/products/docker-desktop'
      add_result 'Docker' 'failed' 'Homebrew missing'
    fi
  elif [[ "$PM" == "apt" ]]; then
    pm_install 'Docker' docker.io docker-compose-v2
    if command_exists docker; then
      write_step OK 'Docker installed.'
      write_step WARN "Add the user to the docker group to avoid sudo: sudo usermod -aG docker \$USER (then log back in)."
      add_result 'Docker' 'installed'
    else
      add_result 'Docker' 'failed' 'package install'
    fi
  else
    write_step WARN 'Install Docker manually: https://docs.docker.com/engine/install/'
    add_result 'Docker' 'failed' 'package manager not supported for Docker'
  fi
fi

# Claude Code CLI (via npm, after Node.js)
if command_exists claude; then
  write_step OK "Claude Code CLI already present ($(claude --version))."
  add_result 'Claude Code CLI' 'OK' "$(claude --version)"
else
  write_step INSTALL 'Claude Code CLI missing — installing via npm...'
  if npm install -g '@anthropic-ai/claude-code' 2>/tmp/claude-install-err.log; then
    write_step OK 'Claude Code CLI installed.'
    add_result 'Claude Code CLI' 'installed'
  else
    write_step WARN "npm install -g failed (permissions?) — retrying with sudo..."
    if sudo npm install -g '@anthropic-ai/claude-code'; then
      write_step OK 'Claude Code CLI installed (sudo).'
      add_result 'Claude Code CLI' 'installed' 'sudo required'
    else
      write_step FAIL 'Claude Code CLI installation failed — see /tmp/claude-install-err.log.'
      add_result 'Claude Code CLI' 'failed' 'npm install -g'
    fi
  fi
fi
CLAUDE_OK=false
command_exists claude && CLAUDE_OK=true

# --------------------------------------------- Phase 1 — Repo ~/.claude (§1)
echo ''
echo '--- Phase 1: bocal-kit repo -> ~/.claude ---'

CLAUDE_DIR="$HOME/.claude"
REPO_URL="https://github.com/bocal-pol/bocal-kit"

is_repo=false
if [[ -d "$CLAUDE_DIR/.git" ]]; then
  remote=$(git -C "$CLAUDE_DIR" remote get-url origin 2>/dev/null || echo "")
  [[ "$remote" == *bocal-kit* ]] && is_repo=true
fi

if $is_repo; then
  write_step SKIP '~/.claude is already the bocal-kit repo.'
  add_result 'Repo ~/.claude' 'already present'
elif [[ -d "$CLAUDE_DIR" ]]; then
  if $FORCE_CLONE; then
    backup="$CLAUDE_DIR.bak-$(date +%Y%m%d-%H%M%S)"
    write_step WARN "Existing ~/.claude backed up to $backup"
    mv "$CLAUDE_DIR" "$backup"
    if git clone "$REPO_URL" "$CLAUDE_DIR"; then
      write_step OK 'bocal-kit repo cloned to ~/.claude.'
      add_result 'Repo ~/.claude' 'installed' "backup: $backup"
    else
      write_step FAIL 'Clone failed — restoring the backup.'
      mv "$backup" "$CLAUDE_DIR"
      add_result 'Repo ~/.claude' 'failed' 'git clone failed'
    fi
  else
    write_step WARN "~/.claude exists but is not the bocal-kit repo. Run again with --force-clone to back it up and clone in its place."
    add_result 'Repo ~/.claude' 'skipped' 'existing, not a repo — use --force-clone'
  fi
else
  write_step INSTALL "Cloning $REPO_URL to ~/.claude..."
  if git clone "$REPO_URL" "$CLAUDE_DIR"; then
    write_step OK 'bocal-kit repo cloned to ~/.claude.'
    add_result 'Repo ~/.claude' 'installed'
  else
    write_step FAIL 'Repo clone failed.'
    add_result 'Repo ~/.claude' 'failed' 'git clone failed'
  fi
fi

# ------------------------------------- Phases 2 & 3 — MCP servers (§2 and §3)
echo ''
echo '--- Phase 2: Required MCP servers ---'

MCP_LIST=""
add_mcp_server() {
  # $1 = server name, the rest = `claude mcp add` arguments
  local name="$1"; shift
  if echo "$MCP_LIST" | grep -qiE "^\s*${name}\s*:"; then
    write_step SKIP "MCP '$name' already registered."
    add_result "MCP $name" 'already present'
    return
  fi
  write_step INSTALL "Registering MCP server '$name'..."
  if claude mcp add "$@"; then
    write_step OK "MCP '$name' registered."
    add_result "MCP $name" 'installed'
  else
    write_step FAIL "Failed to register MCP '$name'."
    add_result "MCP $name" 'failed' 'claude mcp add'
  fi
}

if $CLAUDE_OK; then
  MCP_LIST=$(claude mcp list 2>/dev/null || echo "")

  add_mcp_server context7 context7 -- npx -y @upstash/context7-mcp
  add_mcp_server sequential-thinking sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

  echo ''
  echo '--- Phase 3: Optional MCP servers ---'

  # Playwright — Chromium + MCP server (user scope)
  pw_cache="$HOME/.cache/ms-playwright"
  [[ "$OS_KIND" == "macos" ]] && pw_cache="$HOME/Library/Caches/ms-playwright"
  if compgen -G "$pw_cache/chromium-*" >/dev/null 2>&1; then
    write_step SKIP 'Playwright Chromium already installed.'
    add_result 'Playwright Chromium' 'already present'
  else
    write_step INSTALL 'Installing Chromium for Playwright...'
    if npx playwright install chromium; then
      write_step OK 'Chromium installed.'; add_result 'Playwright Chromium' 'installed'
    else
      write_step FAIL 'Chromium installation failed.'; add_result 'Playwright Chromium' 'failed'
    fi
  fi
  add_mcp_server playwright playwright npx @playwright/mcp@latest --scope user

  # Phase 3b — ICT MCPs (filesystem + optional ssh)
  echo ''
  echo '--- Phase 3b: ICT MCP servers ---'

  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  profile_base="$(dirname "$script_dir")"
  fs_roots=()
  for d in "$profile_base/NetworkProfile" "$profile_base/TechSupportProfile" "$profile_base/ICTDirectorProfile" "$HOME/Documents" "$HOME/Desktop"; do
    [[ -d "$d" ]] && fs_roots+=("$d")
  done
  if [[ ${#fs_roots[@]} -gt 0 ]]; then
    add_mcp_server filesystem filesystem -- npx -y @modelcontextprotocol/server-filesystem "${fs_roots[@]}"
  else
    write_step WARN 'No ICT profile folder found — filesystem MCP skipped.'
    add_result 'MCP filesystem' 'skipped' 'profile folders not found'
  fi

  # SSH (optional) — direct access to network equipment. No secret to configure:
  # the target (host/user/key) is passed on each tool call, not at startup.
  add_mcp_server mcp-server-ssh mcp-server-ssh --scope user -- npx -y mcp-server-ssh
else
  write_step FAIL 'Claude Code CLI unavailable — MCP phases (2 and 3) skipped.'
  add_result 'MCP servers' 'failed' 'claude CLI missing'
fi

# ----------------------------------------------------- Phase 4 — Graphify (§4)
echo ''
echo '--- Phase 4: Graphify ---'

if $python_ok; then
  if "$PYTHON_EXE" -m pip show graphifyy >/dev/null 2>&1; then
    write_step SKIP 'Graphify (graphifyy) already installed.'
    add_result 'Graphify' 'already present'
  else
    write_step INSTALL "Installing graphifyy (the PyPI package has a double y)..."
    if "$PYTHON_EXE" -m pip install --user graphifyy; then
      if "$PYTHON_EXE" -m graphify install --platform claude; then
        write_step OK 'Graphify installed and wired into Claude.'
        add_result 'Graphify' 'installed'
      else
        write_step FAIL 'Graphify -> Claude integration failed.'
        add_result 'Graphify' 'failed' 'graphify install --platform claude'
      fi
    else
      write_step FAIL 'pip install graphifyy failed.'
      add_result 'Graphify' 'failed' 'pip install'
    fi
  fi
else
  write_step FAIL 'Python 3.10+ not found — Graphify skipped.'
  add_result 'Graphify' 'failed' 'Python missing'
fi

# --------------------------------------------------- Phase 4b — Floorplan (§4b)
echo ''
echo '--- Phase 4b: Floorplan ---'

if $CLAUDE_OK; then
  plugin_list=$(claude plugin list 2>/dev/null || echo "")
  if echo "$plugin_list" | grep -qE '(^|[[:space:]])floorplan@floorplan([[:space:]]|$)'; then
    write_step SKIP 'Floorplan plugin already installed.'
    add_result 'Floorplan' 'already present'
  else
    write_step INSTALL 'Adding the Floorplan marketplace (haydenschmitty/floorplan)...'
    if claude plugin marketplace add haydenschmitty/floorplan; then
      write_step INSTALL 'Installing the Floorplan plugin...'
      if claude plugin install floorplan@floorplan; then
        write_step OK 'Floorplan installed (active next Claude Code session).'
        add_result 'Floorplan' 'installed'
      else
        write_step FAIL 'claude plugin install floorplan@floorplan failed.'
        add_result 'Floorplan' 'failed' 'plugin install'
      fi
    else
      write_step FAIL 'claude plugin marketplace add failed.'
      add_result 'Floorplan' 'failed' 'marketplace add'
    fi
  fi
else
  write_step FAIL 'Claude Code CLI unavailable — Floorplan skipped.'
  add_result 'Floorplan' 'failed' 'claude CLI missing'
fi

# -------------------------------------------- Phase 4c — Codex (OpenAI delegation)
echo ''
echo '--- Phase 4c: Codex (official OpenAI plugin) ---'

# Unlike Windows (where Codex must run inside WSL), Linux and macOS run Codex
# natively: no sandbox blocking file reads/writes.
write_codex_login_help() {
  echo ''
  printf '%s  ================================================================%s\n' "$c_yellow" "$c_reset"
  printf '%s  CODEX: ONE STEP LEFT FOR YOU — SIGN IN (~2 minutes)%s\n' "$c_yellow" "$c_reset"
  printf '%s  ================================================================%s\n' "$c_yellow" "$c_reset"
  echo "  Codex is an OpenAI coding assistant. It needs a ChatGPT account (the free"
  echo "  plan works). Code handed to Codex is sent to OpenAI."
  echo ''
  echo "  1. Turn on device-code sign-in in ChatGPT:"
  echo "     Settings > Security > allow device code for Codex."
  echo "     WITHOUT THIS, SIGN-IN FAILS (red message)."
  echo "  2. Run:              ~/.local/bin/codex login --device-auth"
  echo "  3. Open the address it shows in your browser and type the code ON THE"
  echo "     WEB PAGE (not in the terminal, which just waits)."
  echo "  4. Check:            ~/.local/bin/codex login status"
  echo "     Expected:         Logged in using ChatGPT"
  echo "  Until this is done, Claude works alone — nothing is broken."
  echo ''
}

if command_exists node && command_exists npm; then
  if [[ -x "$HOME/.local/bin/codex" ]]; then
    write_step SKIP 'Codex already installed.'
    codex_installed=true
  else
    write_step INSTALL 'Installing Codex (npm, ~/.local prefix, no sudo)...'
    if npm install -g --prefix "$HOME/.local" @openai/codex && [[ -x "$HOME/.local/bin/codex" ]]; then
      write_step OK 'Codex installed.'
      codex_installed=true
    else
      write_step FAIL 'Codex installation failed.'
      add_result 'Codex' 'failed' 'npm install'
      codex_installed=false
    fi
  fi
  if [[ "${codex_installed:-false}" == "true" ]]; then
    login_out=$("$HOME/.local/bin/codex" login status 2>&1 || true)
    if echo "$login_out" | grep -q 'Logged in'; then
      write_step OK 'Codex signed in (ChatGPT).'
      add_result 'Codex' 'OK' 'signed in'
    else
      write_step WARN 'Codex installed but NOT SIGNED IN — see the box below.'
      add_result 'Codex' 'sign-in required' 'codex login --device-auth'
      write_codex_login_help
    fi
  fi
else
  write_step WARN 'Node.js/npm missing — Codex skipped.'
  add_result 'Codex' 'skipped' 'Node missing'
fi

# ----------------------------------------------------- Phase 5 — Headroom (§5)
echo ''
echo '--- Phase 5: Headroom ---'

if $python_ok; then
  headroom_was_installed=false
  if "$PYTHON_EXE" -m pip show headroom-ai >/dev/null 2>&1; then
    write_step SKIP 'Headroom already installed.'
    add_result 'Headroom' 'already present'
    headroom_was_installed=true
  else
    write_step INSTALL "Installing headroom-ai[all]..."
    if "$PYTHON_EXE" -m pip install --user 'headroom-ai[all]'; then
      headroom_was_installed=true
    else
      write_step FAIL 'pip install headroom-ai[all] failed.'
      add_result 'Headroom' 'failed' 'pip install'
    fi
  fi

  if $headroom_was_installed; then
    # Safety net: ~/.local/bin isn't always on the PATH right after a
    # `pip install --user` in the same process — without it, `headroom init` can't
    # find `claude` via shutil.which() even when it's installed.
    [[ -d "$HOME/.local/bin" ]] && export PATH="$PATH:$HOME/.local/bin"

    if command_exists headroom; then
      # Always (re)run the Claude Code integration — even if the package was
      # already installed, otherwise it stays "installed" but never active.
      if headroom init claude; then
        write_step OK 'Headroom wired into Claude Code (restart Claude Code to activate routing).'
        add_result 'Headroom' 'installed' 'Claude Code restart required'
      else
        write_step WARN "headroom init failed — Claude Code not found on this session's PATH?"
        add_result 'Headroom' 'warning' 'headroom init failed'
      fi

      write_step INFO 'Headroom check:'
      if ! headroom doctor; then
        write_step INFO 'Proxy unreachable — starting it in the background...'
        nohup headroom proxy >/dev/null 2>&1 &
        sleep 3
        headroom doctor || write_step WARN 'headroom doctor still reports a problem (see above) — local firewall?'
      fi
    else
      write_step WARN "headroom not found on the PATH — check ~/.local/bin (pip --user)."
      add_result 'Headroom' 'warning' 'binary not found on PATH'
    fi
  fi
  write_step WARN "Reminder: Headroom only works in the terminal (no effect in VS Code / Claude Desktop)."
else
  write_step FAIL 'Python 3.10+ not found — Headroom skipped.'
  add_result 'Headroom' 'failed' 'Python missing'
fi

# --------------------------------------------------------- Phase 5b — brag (§5b)
echo ''
echo '--- Phase 5b: brag (launch video) ---'

if command_exists ffmpeg; then
  write_step OK "FFmpeg already present ($(ffmpeg -version | head -1))."
  add_result 'FFmpeg' 'OK' "$(ffmpeg -version | head -1)"
else
  write_step INSTALL 'FFmpeg missing — installing...'
  pkg="ffmpeg"
  if pm_install 'FFmpeg' "$pkg" && command_exists ffmpeg; then
    write_step OK 'FFmpeg installed.'; add_result 'FFmpeg' 'installed'
  else
    write_step FAIL 'FFmpeg installation failed.'; add_result 'FFmpeg' 'failed'
  fi
fi

if command_exists npx; then
  write_step INFO 'Hyperframes check (npx hyperframes doctor):'
  if npx --yes hyperframes doctor; then
    write_step OK 'Hyperframes working.'
    add_result 'Hyperframes' 'OK'
  else
    write_step WARN "hyperframes doctor reports a problem (see above) — the brag skill may fail until FFmpeg is on the PATH."
    add_result 'Hyperframes' 'warning' 'see hyperframes doctor'
  fi
else
  write_step FAIL 'npx unavailable — Hyperframes check skipped.'
  add_result 'Hyperframes' 'failed' 'npx missing'
fi

# ------------------------------------------- Phase 6 — Final check (§6)
echo ''
echo '--- Phase 6: Final check ---'

if $CLAUDE_OK; then
  write_step INFO 'MCP server status (claude mcp list):'
  claude mcp list
fi

echo ''
echo '=== Summary ===' | sed "s/.*/${c_cyan}&${c_reset}/"
printf '%-22s %-16s %s\n' 'Component' 'Status' 'Detail'
printf '%-22s %-16s %s\n' '---------' '------' '------'
failures=0
for i in "${!RESULT_NAMES[@]}"; do
  printf '%-22s %-16s %s\n' "${RESULT_NAMES[$i]}" "${RESULT_STATUS[$i]}" "${RESULT_DETAIL[$i]}"
  [[ "${RESULT_STATUS[$i]}" == "failed" ]] && failures=$((failures + 1))
done

write_step INFO 'Recommended final test: claude then /team-dev --auto "test the environment"'

if [[ $failures -gt 0 ]]; then
  write_step FAIL "$failures component(s) failed — see the summary above."
  exit 1
fi
write_step OK 'Setup complete.'
exit 0
