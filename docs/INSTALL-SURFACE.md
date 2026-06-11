# Install Surface

Frontend Design Ultra is packaged primarily as a Codex skill.

## Supported

| Target | Status | Notes |
|---|---|---|
| Codex | Ready | `install.sh`, `install.ps1`, installable skill folder |
| Local checkout | Ready | Copy or run installer from repo root |
| Claude Code | Manual-ready | `adapters/claude/` |
| Cursor | Manual-ready | `adapters/cursor/` |
| GitHub Copilot | Manual-ready | `adapters/copilot/` |
| Gemini, Cline, Windsurf, generic agents | Manual-ready | `adapters/generic/` |

## Not Included

This repository does not ship a Python runtime, crawler, MCP server, or external provider adapters. It is a design/build/QA skill package, not a hosted service.
