#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=4.35.0
command -v node >/dev/null || { echo "Install Node.js 20 or newer, then run make install."; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)' || {
  echo "Node.js 20 or newer is required."; exit 1;
}
if command -v lean >/dev/null && lean --version | head -1 | grep -q "version $VERSION,"; then
  echo "Using Lean $VERSION already on PATH."
else
  if ! command -v elan >/dev/null; then
    command -v curl >/dev/null || { echo "curl is required to install elan."; exit 1; }
    curl --proto '=https' --tlsv1.2 -sSf https://elan.lean-lang.org/elan-init.sh |
      sh -s -- -y --default-toolchain none
  fi
  export PATH="$HOME/.elan/bin:$PATH"
  elan toolchain install "leanprover/lean4:v$VERSION"
fi
npm ci --ignore-scripts --no-audit --no-fund
lake build
npm run build
echo "Installed. Run make run, then open http://localhost:8000"
echo "For sandboxed proof replay, Linux and bubblewrap are also required: make verify"
