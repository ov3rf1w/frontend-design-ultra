#!/usr/bin/env bash
set -euo pipefail

CODEX_ROOT="${CODEX_HOME:-${HOME}/.codex}"
TARGET="${CODEX_ROOT}/skills/frontend-design-ultra"

echo "Removing Frontend Design Ultra from ${TARGET}"
rm -rf "${TARGET}"
echo "[OK] Removed. Restart Codex if it is running."

