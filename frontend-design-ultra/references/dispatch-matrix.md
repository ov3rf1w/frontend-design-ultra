# Dispatch Matrix

## Parameter Effects

| Group | Effect |
|---|---|
| Mode | Selects the one primary workflow. Precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`. |
| Domain | Changes heuristics: `/landing` first viewport + conversion; `/dashboard` density + control semantics; `/saas` repeated workflows; `/ecommerce` product/funnel trust; `/mobile` recomposition. |
| Quality | Adds gates: `/premium` composition/detail; `/awwward` signature mechanism; `/conversion` proof + CTA; `/accessibility` WCAG; `/performance` CWV/runtime. |
| Tool | Selects route preference: `/playwright`, `/figma`, `/tailwind`, `/gsap`, `/framer`, `/3d`; missing tools require fallback plan. |
| Intensity | `/quick` top risks only; `/deep` full relevant protocol; `/brutal` strict scoring + sidecar critique where useful. |

## Output Contracts

- `/analyse`: Executive Summary, Evidence, Prioritized Findings, Severity, Impact, Fix Recommendation, QA Follow-up.
- `/design`: Design Direction, Layout Strategy, Component Strategy, Design System Implications, Responsive Behavior, Implementation Notes.
- `/polish`: Visual Diagnosis, High-Impact Design Moves, Component Improvements, Typography/Spacing/Hierarchy Fixes, Motion Opportunities, Premium Detail Pass.
- `/implement`: Implementation Plan, Files/Components, Design System Alignment, Accessibility Requirements, Performance Requirements, Verification Steps.
- `/verify`: Pass/Fail/Needs Review, Browser Evidence, Viewport Results, Console/Runtime Issues, Accessibility Smoke, Performance Risks, Ship Recommendation.

## Compatibility Defaults

- Tool params are preferences, not permission to add dependencies blindly.
- `/figma` works as protocol even without Figma tooling: use frame URL, screenshot, tokens, exports, or ask for the missing source.
- `/3d` plus `/mobile` requires a non-3D mobile fallback.
- `/gsap` or `/framer` requires existing dependency or explicit acceptance.
- Unsupported combinations return a short error and a valid replacement.

