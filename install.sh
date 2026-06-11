#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${FRONTEND_DESIGN_ULTRA_REPO:-https://github.com/ov3rf1w/frontend-design-ultra.git}"
REPO_REF="${FRONTEND_DESIGN_ULTRA_REF:-main}"
CODEX_ROOT="${CODEX_HOME:-${HOME}/.codex}"
SKILLS_ROOT="${CODEX_ROOT}/skills"
SKILL_NAME="frontend-design-ultra"
TARGET="${SKILLS_ROOT}/${SKILL_NAME}"

echo "========================================"
echo " Frontend Design Ultra - Codex Installer"
echo "========================================"

command -v git >/dev/null 2>&1 || { echo "[ERROR] Git is required."; exit 1; }
command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || {
  echo "[ERROR] Python is required for validation."; exit 1;
}

PYTHON_BIN="$(command -v python3 || command -v python)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

echo "[INFO] Downloading ${REPO_REF}..."
git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" "${TEMP_DIR}/repo"

echo "[INFO] Installing skill..."
mkdir -p "${SKILLS_ROOT}"
rm -rf "${TARGET}"
cp -R "${TEMP_DIR}/repo/frontend-design-ultra" "${TARGET}"

VALIDATOR="${CODEX_ROOT}/skills/.system/skill-creator/scripts/quick_validate.py"
if [ -f "${VALIDATOR}" ]; then
  "${PYTHON_BIN}" "${VALIDATOR}" "${TARGET}"
else
  echo "[WARN] Codex skill validator not found at ${VALIDATOR}; skipped validation."
fi

echo ""
echo "[OK] Frontend Design Ultra installed"
echo "Installed to: ${TARGET}"
echo "Next: restart Codex so skill metadata reloads."

