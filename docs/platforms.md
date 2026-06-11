# Platforms

Frontend Design Ultra is a portable agent skill. The installable Codex folder is `frontend-design-ultra/`.

## Codex

Use the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.sh | bash
```

Windows:

```powershell
irm https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.ps1 | iex
```

## Claude Code

Copy `frontend-design-ultra/SKILL.md` and `frontend-design-ultra/references/` into a Claude project or skill-compatible location.

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

- `frontend-design-ultra/SKILL.md`
- `docs/AGENT-USAGE.md`
- `docs/PARAMETERS.md`
- `frontend-design-ultra/references/`

Instruction:

```text
Infer the right Frontend Design Ultra parameters from the user request. Use AGENT-USAGE.md for routing. Load only the relevant reference files.
```

