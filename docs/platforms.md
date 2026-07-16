# Platforms

Frontend Design Ultra follows the Agent Skills directory shape. Codex is the tested install surface; the other integrations below are manual adapters and do not imply behavioral parity.

## Codex

Use the open Agent Skills CLI:

```bash
npx skills add ov3rf1w/frontend-design-ultra --skill frontend-design-ultra -g -a codex
```

Or inspect and install an exact commit locally:

```bash
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
git checkout --detach <40-character-commit>
npm ci --ignore-scripts
npm run build
bash install.sh --local
```

Windows:

```powershell
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
git checkout --detach <40-character-commit>
npm ci --ignore-scripts
npm run build
.\install.ps1 -Source Local
```

Versioned release archives, manifests, and checksums become the recommended pinned installer surface when the first GitHub release is published. Do not execute a mutable remote installer through a shell pipeline.

## Claude Code

Install the complete `frontend-design-ultra/` directory through a supported skill location, or provide it as project knowledge. Keep its `references/`, `scripts/`, and `agents/` subdirectories together.

Recommended instruction:

```text
Use Frontend Design Ultra. Read SKILL.md first. Load reference files only when the slash parameters or task require them.
```

## Cursor

Use as project rules or knowledge:

```text
@frontend-design-ultra/SKILL.md
Use this skill for all substantial frontend design, implementation, and verification work.
```

Add `docs/AGENT-USAGE.md` as a project rule if Cursor should infer parameters automatically.

## GitHub Copilot

Place the skill content in `.github/copilot-instructions.md` or reference the docs in repository instructions.

Recommended:

- include `docs/AGENT-USAGE.md`
- include `docs/PARAMETERS.md`
- reference `frontend-design-ultra/SKILL.md`

## Gemini CLI / Cline / Windsurf / Generic Agents

Provide:

- the complete `frontend-design-ultra/` directory
- `docs/AGENT-USAGE.md`
- `docs/PARAMETERS.md`

Instruction:

```text
Infer the right Frontend Design Ultra parameters from the user request. Use AGENT-USAGE.md for routing. Load only the relevant reference files.
```
