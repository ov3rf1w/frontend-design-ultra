# Frontend Design Ultra

![Codex](https://img.shields.io/badge/Codex-ready-111827)
![Claude](https://img.shields.io/badge/Claude-ready-111827)
![Cursor](https://img.shields.io/badge/Cursor-ready-111827)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

Universal premium frontend design and UI engineering skill for AI coding agents.

Built for OpenAI Codex, Claude Code, Cursor, GitHub Copilot, Gemini CLI, Cline, Windsurf, and any agent that can use project knowledge. The repository combines one installable skill, Awwwards-grade design protocols, browser-evidence QA recipes, motion and 3D recipes, design-system governance, eval prompts, and cross-agent setup docs.

## 60-Second Demo

```bash
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
bash install.sh
```

Then ask your agent:

```text
/design /landing /awwward /trend /brandkit
Create a premium landing page direction for a boutique AI analytics product.
```

The skill routes the request into design strategy, trend mechanics, brandkit, signature move, asset plan, motion plan, mobile adaptation, and verification risks.

## Why It Exists

Most AI-generated frontend work looks assembled, not directed. It repeats the same cards, gradients, oversized heroes, vague copy, decorative motion, and fragile responsive behavior.

Frontend Design Ultra focuses on outcomes:

- exact routing from natural language to design parameters
- Awwwards-style strategy, art direction, and pattern selection
- Design DNA extraction from screenshots, URLs, and references
- deterministic UI specs instead of vague prose
- component state contracts for real implementation
- browser evidence, Playwright recipes, accessibility, performance, and mobile gates
- motion, GSAP, Framer, CSS scroll, FLIP, View Transitions, and 3D fallback recipes

## Works With

| Platform | Status | Entry |
|---|---|---|
| OpenAI Codex | ready | `install.sh`, `install.ps1`, `frontend-design-ultra/` |
| Claude Code | manual-ready | `adapters/claude/` |
| Cursor | manual-ready | `adapters/cursor/` |
| GitHub Copilot | manual-ready | `adapters/copilot/` |
| Gemini CLI | manual-ready | `adapters/generic/` |
| Cline / Windsurf / other agents | manual-ready | `docs/AGENT-USAGE.md` |

## Install Matrix

| Target | Install | Verify |
|---|---|---|
| Codex, macOS/Linux | `curl -fsSL https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.sh \| bash` | Restart Codex and use `/design /landing /premium` |
| Codex, Windows | `irm https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.ps1 \| iex` | Restart Codex and use `/verify /playwright` |
| Local checkout | `bash install.sh` or `powershell -ExecutionPolicy Bypass -File .\install.ps1` | `python ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py ~/.codex/skills/frontend-design-ultra` |
| Other agents | Add `SKILL.md`, `docs/AGENT-USAGE.md`, `docs/PARAMETERS.md`, and references as knowledge | Ask agent to infer parameters from natural language |

Pinned install:

```bash
export FRONTEND_DESIGN_ULTRA_REF=v1.0.0
curl -fsSL https://raw.githubusercontent.com/ov3rf1w/frontend-design-ultra/main/install.sh | bash
```

Full setup notes: [Installation](docs/INSTALLATION.md), [Install Surface](docs/INSTALL-SURFACE.md), and [Platforms](docs/platforms.md).

## Core Commands

```text
/analyse https://example.com /playwright /performance /accessibility /mobile
/design /landing /awwward /trend /brandkit
/polish /awwward /motion-high /brutal
/implement /dashboard /saas /accessibility
/image-to-code /reference /premium
/redesign /brutal /playwright
/verify /mobile /performance /playwright
```

Important routing docs:

- [Agent Usage Guide](docs/AGENT-USAGE.md) maps natural language to parameters.
- [Parameter Reference](docs/PARAMETERS.md) lists every mode, domain, quality, tool, intensity, and taste dial.
- [Skill Catalog](docs/SKILL-CATALOG.md) summarizes workflows and reference routing.

## What It Does

- strategy lanes: editorial premium, product proof, data confidence, conversion trust, experimental showcase, minimal operator, industrial/brutalist, soft luxury
- taste dials: variance, motion, density
- art direction: asset roles, image-first pipeline, brandkit mode
- trend research: mechanics extraction from modern references without copying
- design DNA: palette, type scale, rhythm, surface, radius, elevation, motion, imagery, section grammar
- UI spec DSL: structured page and component specs for deterministic implementation
- component state library: buttons, forms, nav, cards, modals, tabs, tables, pricing cards, product cards, dashboard widgets
- Awwwards patterns: editorial hero, kinetic typography, scroll chapters, image-mask reveal, object-stage hero, immersive footer, proof board, interactive index, spatial cards, cursor-follow previews
- QA: Playwright evidence, WCAG recipes, Core Web Vitals recipes, mobile gates, 3D/R3F performance and fallbacks

## Repository Layout

```text
frontend-design-ultra/      Installable Codex skill
docs/                       Installation, platforms, usage, parameters, catalog
adapters/                   Claude, Cursor, Copilot, generic agent setup notes
evals/                      Prompt and expected-output checks
examples/                   Public example workflows
install.sh                  Codex installer for macOS/Linux
install.ps1                 Codex installer for Windows
uninstall.sh                Codex uninstaller for macOS/Linux
uninstall.ps1               Codex uninstaller for Windows
SELF_TEST.md                Release self-test checklist
llms.txt                    LLM-readable repo index
```

## Skill Catalog

See [docs/SKILL-CATALOG.md](docs/SKILL-CATALOG.md) for every workflow, output contract, and lazy-loaded reference.

## Development

Validate the installable skill:

```bash
python ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py ./frontend-design-ultra
```

Run the release checklist:

```text
SELF_TEST.md
```

Public docs should not expose private construction notes or copied source material. Keep behavior in `frontend-design-ultra/SKILL.md` and operational depth in `frontend-design-ultra/references/`.

## License

MIT. See [LICENSE](LICENSE).

