#!/usr/bin/env bash
# Wrapper of the goodnight statusLine — same reason as guard.sh: "node ~/..." is not reliable
# depending on the shell; "bash ~/..." is.
D="$(cd "$(dirname "$0")" && pwd)"
exec node "$D/statusline.mjs"
