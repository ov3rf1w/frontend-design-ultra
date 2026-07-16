# Install Surface

Frontend Design Ultra is packaged primarily as a Codex skill.

## Supported

| Target | Status | Notes |
|---|---|---|
| Codex | Ready | Staged/validated install with backup rollback via `install.sh` or `install.ps1` |
| Local checkout | Ready | Installer auto-detects and copies the adjacent working tree, including uncommitted changes |
| Remote branch, tag, or commit | Ready | Requested Git ref is fetched directly and reported as a resolved commit |
| Dry run | Ready | Source is fetched/copied and validated without changing the installed skill |
| Optional live scanner | Explicit bootstrap | Skill-local `npm ci --ignore-scripts`; existing Chrome/Edge is enough for exploratory scans |
| Benchmark scanner | Explicit browser install | Run skill-local `npm run browser:install` for the Chromium build pinned to `playwright-core` 1.61.1 |
| Claude Code | Manual-ready | `adapters/claude/` |
| Cursor | Manual-ready | `adapters/cursor/` |
| GitHub Copilot | Manual-ready | `adapters/copilot/` |
| Gemini, Cline, Windsurf, generic agents | Manual-ready | `adapters/generic/` |

## Installer Guarantees

- Built-in structural validation always runs against staging before the target is touched.
- Codex's Python validator is used when it and its existing dependencies are available; Python is optional.
- Replacement uses same-filesystem directory renames and a temporary backup. A failed activation restores the prior installation instead of deleting it first.
- Local mode requires no Git checkout or network access. Remote mode requires Git and accepts a branch, tag, or commit via `FRONTEND_DESIGN_ULTRA_REF` or the installer option.
- Remote status/error output redacts HTTP(S) user information and query strings. Private forks should still use credential helpers or SSH agents rather than tokens embedded in repository URLs.
- Installers copy the scanner manifests but never install `node_modules` or download a browser. Normal skill use has no scanner-runtime bootstrap requirement.

## Not Included

This repository does not ship a Python runtime, browser binary, `node_modules`, MCP server, or external provider adapters. It is a design/build/QA skill package, not a hosted service.
