# Frontend Design Ultra

An installable Codex skill for building sharper, faster, more memorable websites without AI slop.

Frontend Design Ultra turns vague UI requests into structured design direction, implementation plans, browser evidence, and final ship decisions. It is built for premium landing pages, SaaS dashboards, e-commerce flows, mobile polish, motion systems, and Awwwards-level visual ambition without sacrificing accessibility or performance.

## Why It Exists

Most AI-generated frontend work looks assembled, not directed. It repeats the same cards, gradients, oversized heroes, weak copy, decorative motion, and fragile responsive behavior.

This skill pushes Codex toward a higher bar:

- strong page strategy before components
- distinctive composition instead of template sections
- semantic design systems instead of raw visual drift
- evidence-backed UI critique with Playwright when available
- hard gates for accessibility, correctness, performance, and mobile usability
- motion and 3D as controlled enhancers, not default spectacle
- taste dials for variance, motion, and density
- audit-first redesign and reference/image-to-code workflows

## What You Can Ask

```text
/analyse https://example.com /playwright /performance
/design /landing /premium /tailwind
/polish /awwward /gsap
/implement /dashboard /saas /accessibility
/verify /mobile /performance
/redesign /brutal /playwright
/image-to-code /reference /landing /premium
```

## Core Modes

| Mode | Use it for | Output |
|---|---|---|
| `/analyse` | Audit a URL, app, screenshot, route, or component | Evidence, findings, severity, fixes |
| `/design` | Create a design direction before implementation | Layout, components, system implications |
| `/polish` | Raise an existing UI to premium quality | Visual diagnosis and high-impact moves |
| `/implement` | Plan or execute frontend changes | File scope, requirements, verification |
| `/verify` | Decide whether work can ship | Pass, Fail, or Needs Review |

## Design Standard

The skill is opinionated:

- one clear page job and one signature move per major page
- first viewport proves the product, place, task, or offer quickly
- no decorative orbs, generic glass cards, fake trust badges, or filler stock atmosphere
- typography, spacing, color, motion, and components must behave as a system
- mobile layouts are recomposed, not squeezed
- browser-verifiable claims should be backed by screenshots, console checks, responsive checks, and interaction evidence

## Install

Copy the skill folder into your Codex skills directory:

```powershell
Copy-Item -Recurse .\frontend-design-ultra "$env:USERPROFILE\.codex\skills\frontend-design-ultra"
```

Restart Codex after installing so the skill metadata is reloaded.

## Repository Layout

```text
frontend-design-ultra/
  SKILL.md
  README.md
  agents/openai.yaml
  references/
```

The installable artifact is the `frontend-design-ultra/` folder.

## Quality Gates

The skill treats these as blocking concerns:

- readable text and sufficient contrast
- keyboard access and semantic structure
- stable responsive layout
- acceptable loading behavior
- reduced-motion completeness
- non-destructive interactions
- Playwright/browser evidence for verifiable UI claims when authorized

## Contributing

Improvements should make the skill more useful, more precise, or more token-efficient. Avoid adding broad design essays. Prefer operational rules that change agent behavior.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
