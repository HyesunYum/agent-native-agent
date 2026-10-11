#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# /workspaces survives both stop/start and a full container rebuild. Keep credentials
# outside the git checkout, readable only by this codespace's user.
STATE=/workspaces/.ana-private
umask 077
mkdir -p "$STATE/claude"
chmod 700 "$STATE" "$STATE/claude"
for name in .claude .claude.json; do
  dest="$STATE/${name#.}"
  if [ -e "$HOME/$name" ] && [ ! -L "$HOME/$name" ]; then
    if [ -d "$HOME/$name" ]; then cp -a "$HOME/$name/." "$dest/"; else cp -p "$HOME/$name" "$dest"; fi
    mv "$HOME/$name" "$HOME/$name.before-ana"
  fi
  if [ "$name" = .claude.json ] && [ ! -e "$dest" ]; then printf '{}\n' > "$dest"; fi
  ln -sfn "$dest" "$HOME/$name"
done
export PATH="$HOME/.local/bin:$PATH"
# Pin the CLI tested with this setup; do not silently change it on every rebuild.
CLAUDE_VERSION=2.1.296
if ! command -v claude >/dev/null || ! claude --version | grep -q "^$CLAUDE_VERSION "; then
  curl -fsSL https://claude.ai/install.sh -o /tmp/ana-claude-install.sh
  bash /tmp/ana-claude-install.sh "$CLAUDE_VERSION"
fi
npm ci --no-audit --no-fund
printf '\nANA installed. See docs/codespaces.ko.md for the first login.\n'
