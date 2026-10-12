#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
export ANA_NAME=base-ana TMUX_SESSION=base-ana-claude PORT=8809 BIND=127.0.0.1
export DISABLE_AUTOUPDATER=1
export AGENT_CMD="bash .devcontainer/agent.sh"
bash skills/install/scripts/run.sh start
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8809/api/health >/dev/null
printf '\nOpen Ports → ANA (8809) → Open in Browser. Keep visibility Private.\n'
printf 'Finish Claude setup in ANA chat. Terminal fallback: bash .devcontainer/connect.sh\n'
