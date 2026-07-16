#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${FRONTEND_DESIGN_ULTRA_REPO:-https://github.com/ov3rf1w/frontend-design-ultra.git}"
REPO_REF="${FRONTEND_DESIGN_ULTRA_REF:-main}"
SOURCE_MODE="${FRONTEND_DESIGN_ULTRA_SOURCE:-auto}"
DRY_RUN="${FRONTEND_DESIGN_ULTRA_DRY_RUN:-0}"
CODEX_ROOT="${CODEX_HOME:-${HOME:?HOME is not set}/.codex}"
SKILLS_ROOT="${CODEX_ROOT}/skills"
SKILL_NAME="frontend-design-ultra"
TARGET="${SKILLS_ROOT}/${SKILL_NAME}"

usage() {
  cat <<'EOF'
Usage: bash install.sh [options]

Options:
  --local          Install the payload next to this script.
  --remote         Fetch the payload from the configured repository.
  --ref <ref>      Branch, tag, or commit to fetch (default: main).
  --repo <url>     Git repository URL.
  --dry-run        Fetch/copy and validate without changing the install.
  -h, --help       Show this help.

Environment equivalents:
  FRONTEND_DESIGN_ULTRA_SOURCE=auto|local|remote
  FRONTEND_DESIGN_ULTRA_REF=<branch|tag|commit>
  FRONTEND_DESIGN_ULTRA_REPO=<git-url>
  FRONTEND_DESIGN_ULTRA_DRY_RUN=0|1
  CODEX_HOME=<path>
EOF
}

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

warn() {
  echo "[WARN] $*" >&2
}

redact_repo_url() {
  url_without_query="${1%%\?*}"
  case "${url_without_query}" in
    *://*@*)
      printf '%s://***@%s' "${url_without_query%%://*}" "${url_without_query#*@}"
      ;;
    *)
      printf '%s' "${url_without_query}"
      ;;
  esac
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --local)
      SOURCE_MODE="local"
      shift
      ;;
    --remote)
      SOURCE_MODE="remote"
      shift
      ;;
    --ref)
      [ "$#" -ge 2 ] || die "--ref requires a value."
      REPO_REF="$2"
      shift 2
      ;;
    --repo)
      [ "$#" -ge 2 ] || die "--repo requires a value."
      REPO_URL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (use --help)."
      ;;
  esac
done

SOURCE_MODE="$(printf '%s' "${SOURCE_MODE}" | tr '[:upper:]' '[:lower:]')"
case "${SOURCE_MODE}" in
  auto|local|remote) ;;
  *) die "FRONTEND_DESIGN_ULTRA_SOURCE must be auto, local, or remote." ;;
esac

DRY_RUN="$(printf '%s' "${DRY_RUN}" | tr '[:upper:]' '[:lower:]')"
case "${DRY_RUN}" in
  1|true|yes) DRY_RUN=1 ;;
  0|false|no|'') DRY_RUN=0 ;;
  *) die "FRONTEND_DESIGN_ULTRA_DRY_RUN must be 0 or 1." ;;
esac

SCRIPT_DIR=""
SCRIPT_SOURCE="${BASH_SOURCE[0]:-}"
if [ -n "${SCRIPT_SOURCE}" ] && [ -f "${SCRIPT_SOURCE}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${SCRIPT_SOURCE}")" && pwd -P)"
fi

LOCAL_PAYLOAD=""
if [ -n "${SCRIPT_DIR}" ] && [ -s "${SCRIPT_DIR}/${SKILL_NAME}/SKILL.md" ]; then
  LOCAL_PAYLOAD="${SCRIPT_DIR}/${SKILL_NAME}"
fi

if [ "${SOURCE_MODE}" = "auto" ]; then
  if [ -n "${LOCAL_PAYLOAD}" ]; then
    SOURCE_MODE="local"
  else
    SOURCE_MODE="remote"
  fi
fi

if [ "${SOURCE_MODE}" = "local" ] && [ -z "${LOCAL_PAYLOAD}" ]; then
  die "Local payload not found next to install.sh. Run the checked-out script from the repository root or use --remote."
fi

if [ "${SOURCE_MODE}" = "remote" ]; then
  [ -n "${REPO_URL}" ] || die "Repository URL must not be empty."
  [ -n "${REPO_REF}" ] || die "Repository ref must not be empty."
  case "${REPO_URL}" in -*) die "Repository URL must not start with '-'." ;; esac
  case "${REPO_REF}" in -*) die "Repository ref must not start with '-'." ;; esac
  command -v git >/dev/null 2>&1 || die "Git is required for a remote install."
fi

echo "========================================"
echo " Frontend Design Ultra - Codex Installer"
echo "========================================"
echo "[INFO] Mode: ${SOURCE_MODE}"
echo "[INFO] Target: ${TARGET}"
if [ "${DRY_RUN}" -eq 1 ]; then
  echo "[INFO] Dry run: the current installation will not be changed."
fi

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/frontend-design-ultra.XXXXXX")"
STAGE_DIR=""
BACKUP=""
ROLLBACK_PENDING=0

rollback_installation() {
  if [ "${ROLLBACK_PENDING}" -ne 1 ] || [ -z "${BACKUP}" ] || [ ! -e "${BACKUP}" ]; then
    return
  fi

  echo "[INFO] Restoring the previous installation..." >&2
  if [ -e "${TARGET}" ] || [ -L "${TARGET}" ]; then
    rm -rf "${TARGET}"
  fi
  if mv "${BACKUP}" "${TARGET}"; then
    ROLLBACK_PENDING=0
    BACKUP=""
    echo "[OK] Previous installation restored." >&2
  else
    warn "Automatic restore failed. The previous installation remains at ${BACKUP}."
  fi
}

cleanup() {
  status=$?
  trap - EXIT INT TERM
  if [ "${ROLLBACK_PENDING}" -eq 1 ]; then
    rollback_installation
  fi
  if [ -n "${STAGE_DIR}" ] && { [ -e "${STAGE_DIR}" ] || [ -L "${STAGE_DIR}" ]; }; then
    rm -rf "${STAGE_DIR}"
  fi
  rm -rf "${TEMP_DIR}"
  exit "${status}"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

PAYLOAD=""
SOURCE_LABEL=""
if [ "${SOURCE_MODE}" = "local" ]; then
  PAYLOAD="${LOCAL_PAYLOAD}"
  SOURCE_LABEL="local checkout at ${SCRIPT_DIR}"
  echo "[INFO] Source: ${SOURCE_LABEL}"
else
  CHECKOUT="${TEMP_DIR}/repo"
  REPO_DISPLAY="$(redact_repo_url "${REPO_URL}")"
  echo "[INFO] Fetching ${REPO_REF} from ${REPO_DISPLAY}..."
  git init --quiet "${CHECKOUT}"
  git -C "${CHECKOUT}" remote add origin "${REPO_URL}"
  if ! git -C "${CHECKOUT}" fetch --quiet --depth 1 origin "${REPO_REF}" 2>/dev/null; then
    die "Could not fetch ref '${REPO_REF}' from ${REPO_DISPLAY}."
  fi
  git -C "${CHECKOUT}" -c advice.detachedHead=false checkout --quiet --detach FETCH_HEAD
  RESOLVED_COMMIT="$(git -C "${CHECKOUT}" rev-parse --verify HEAD)"
  PAYLOAD="${CHECKOUT}/${SKILL_NAME}"
  SOURCE_LABEL="${REPO_REF} at ${RESOLVED_COMMIT}"
  echo "[INFO] Resolved remote ref: ${SOURCE_LABEL}"
fi

[ -d "${PAYLOAD}" ] || die "Skill payload not found at ${PAYLOAD}."
[ -s "${PAYLOAD}/SKILL.md" ] || die "Skill payload is missing a non-empty SKILL.md."
[ -s "${PAYLOAD}/README.md" ] || die "Skill payload is missing README.md."
[ -s "${PAYLOAD}/LICENSE" ] || die "Skill payload is missing LICENSE."
[ -s "${PAYLOAD}/THIRD_PARTY_NOTICES.md" ] || die "Skill payload is missing THIRD_PARTY_NOTICES.md."

if [ "${DRY_RUN}" -eq 1 ]; then
  STAGE_DIR="${TEMP_DIR}/staged-skill"
  mkdir "${STAGE_DIR}"
else
  mkdir -p "${SKILLS_ROOT}"
  STAGE_DIR="$(mktemp -d "${SKILLS_ROOT}/.${SKILL_NAME}.stage.XXXXXX")"
fi

echo "[INFO] Copying payload into staging..."
cp -R "${PAYLOAD}/." "${STAGE_DIR}/"

echo "[INFO] Validating staged skill..."
[ -s "${STAGE_DIR}/SKILL.md" ] || die "Staged payload is missing a non-empty SKILL.md."
[ -s "${STAGE_DIR}/README.md" ] || die "Staged payload is missing README.md."
[ -s "${STAGE_DIR}/LICENSE" ] || die "Staged payload is missing LICENSE."
[ -s "${STAGE_DIR}/THIRD_PARTY_NOTICES.md" ] || die "Staged payload is missing THIRD_PARTY_NOTICES.md."
FRONTMATTER=""
if ! FRONTMATTER="$(awk '
  NR == 1 {
    sub(/\r$/, "")
    if ($0 != "---") exit 2
    next
  }
  {
    sub(/\r$/, "")
    if ($0 == "---") {
      found = 1
      exit
    }
    print
  }
  END {
    if (!found) exit 3
  }
' "${STAGE_DIR}/SKILL.md")"; then
  die "Staged SKILL.md does not contain valid leading YAML frontmatter."
fi
printf '%s\n' "${FRONTMATTER}" | grep -Eq "^name:[[:space:]]*(frontend-design-ultra|\"frontend-design-ultra\"|'frontend-design-ultra')[[:space:]]*$" || {
  die "Staged SKILL.md does not declare name: frontend-design-ultra."
}
printf '%s\n' "${FRONTMATTER}" | grep -Eq '^description:[[:space:]]*.+$' || {
  die "Staged SKILL.md does not declare a description."
}

VALIDATOR="${CODEX_ROOT}/skills/.system/skill-creator/scripts/quick_validate.py"
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
fi

if [ -f "${VALIDATOR}" ] && [ -n "${PYTHON_BIN}" ]; then
  if "${PYTHON_BIN}" -c 'import yaml' >/dev/null 2>&1; then
    "${PYTHON_BIN}" "${VALIDATOR}" "${STAGE_DIR}"
  else
    warn "Codex validator dependencies are unavailable; built-in structural validation passed."
  fi
elif [ -f "${VALIDATOR}" ]; then
  warn "Python is unavailable; built-in structural validation passed."
else
  echo "[INFO] Codex validator not found; built-in structural validation passed."
fi

if [ "${DRY_RUN}" -eq 1 ]; then
  echo ""
  echo "[OK] Dry run passed for ${SOURCE_LABEL}"
  echo "No files were changed at ${TARGET}."
  exit 0
fi

if [ -e "${TARGET}" ] || [ -L "${TARGET}" ]; then
  BACKUP="${TARGET}.backup.$$"
  [ ! -e "${BACKUP}" ] && [ ! -L "${BACKUP}" ] || die "Backup path already exists: ${BACKUP}"
  echo "[INFO] Moving current installation to a temporary backup..."
  ROLLBACK_PENDING=1
  mv "${TARGET}" "${BACKUP}"
fi

echo "[INFO] Activating staged skill..."
if ! mv "${STAGE_DIR}" "${TARGET}"; then
  rollback_installation
  die "Could not activate the staged skill."
fi
STAGE_DIR=""
ROLLBACK_PENDING=0

if [ -n "${BACKUP}" ] && [ -e "${BACKUP}" ]; then
  if ! rm -rf "${BACKUP}"; then
    warn "Install succeeded, but the temporary backup could not be removed: ${BACKUP}"
  fi
fi

echo ""
echo "[OK] Frontend Design Ultra installed from ${SOURCE_LABEL}"
echo "Installed to: ${TARGET}"
echo "Next: restart Codex so skill metadata reloads."
