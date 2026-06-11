# Installation

## Codex

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.sh | bash
```

Windows:

```powershell
irm https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.ps1 | iex
```

Pinned install:

```bash
export FRONTEND_DESIGN_ULTRA_REF=v1.0.0
curl -fsSL https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.sh | bash
```

Local checkout:

```bash
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
bash install.sh
```

Windows local checkout:

```powershell
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Installed path:

```text
~/.codex/skills/frontend-design-ultra
```

Restart Codex after installation so skill metadata reloads.

## Other Agents

See [platforms.md](platforms.md) and [Agent Usage Guide](AGENT-USAGE.md). For most agents, provide `frontend-design-ultra/SKILL.md`, `docs/AGENT-USAGE.md`, `docs/PARAMETERS.md`, and the relevant reference files as project knowledge.
