#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
export DISABLE_AUTOUPDATER=1
# Resume only when this workspace already has a conversation. A brand-new
# codespace still goes through Claude's normal user-controlled onboarding.
project_key=$(node -p 'process.cwd().replace(/[^A-Za-z0-9]/g, "-")')
shopt -s nullglob
history=("$HOME/.claude/projects/$project_key/"*.jsonl)
if [ "${#history[@]}" -gt 0 ]; then
  exec claude --continue
fi
exec claude
