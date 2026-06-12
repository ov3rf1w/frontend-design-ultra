# Dispatch Matrix

## Parameter Effects

| Group | Effect |
|---|---|
| Mode | Selects the one primary workflow. Precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`. |
| Domain | Changes heuristics: `/landing` first viewport + conversion; `/dashboard` density + control semantics; `/saas` repeated workflows; `/ecommerce` product/funnel trust; `/mobile` recomposition; `/redesign` audit-first; `/image-to-code` reference mechanics; `/brandkit` identity system; `/showroom` craft/result proof; `/services` offer-choice clarity; `/about` capability trust; `/contact` direct action path; `/local` relevance/location/availability; `/agency`, `/studio`, `/portfolio`, `/hospitality`, `/legal`, `/finance`, `/healthcare`, `/luxury`, `/editorial`, `/startup`, `/app` select website-type playbooks. |
| Quality | Adds gates: `/premium` composition/detail; `/awwward` signature mechanism; `/conversion` proof + CTA; `/trust` proof/risk reducers near friction; `/accessibility` WCAG; `/performance` CWV/runtime; `/responsive` laptop/desktop/wide/mobile viewport fit; `/trend` current mechanics without copying; `/research` source-informed mechanics and evidence confidence. |
| Tool | Selects route preference: `/playwright`, `/figma`, `/tailwind`, `/gsap`, `/framer`, `/3d`, `/reference`; missing tools require fallback plan. |
| Intensity | `/quick` top risks only; `/deep` full relevant protocol; `/brutal` strict scoring + sidecar critique where useful. |
| Taste dials | `/variance-*`, `/motion-*`, `/density-*` tune visual experimentation, animation depth, and information per viewport. |

## Output Contracts

- `/analyse`: Executive Summary, Evidence, Prioritized Findings, Severity, Impact, Fix Recommendation, QA Follow-up.
- `/design`: Design Direction, Strategy Lane, Signature Move, Layout Strategy, Component Strategy, Token Contract, Responsive Behavior, Implementation Notes.
- `/polish`: Visual Diagnosis, High-Impact Design Moves, Component Improvements, Typography/Spacing/Hierarchy Fixes, Motion Opportunities, Premium Detail Pass, Gate Risks.
- `/implement`: Implementation Plan, Files/Components, Design System Alignment, State Contract, Accessibility Requirements, Performance Requirements, Verification Steps.
- `/verify`: Pass/Fail/Needs Review, Browser Evidence, Viewport Results, Console/Runtime Issues, Accessibility Smoke, Performance Risks, Ship Recommendation.

## Compatibility Defaults

- Tool params are preferences, not permission to add dependencies blindly.
- `/figma` works as protocol even without Figma tooling: use frame URL, screenshot, tokens, exports, or ask for the missing source.
- `/3d` plus `/mobile` requires a non-3D mobile fallback.
- `/gsap` or `/framer` requires existing dependency or explicit acceptance.
- `/image-to-code` requires a reference image/screenshot or reference-generation step.
- `/redesign` must run audit before replacement UI.
- `/brandkit` must define visual language, palette, type, shape, image, motion, and forbidden defaults before page design.
- Substantial visual work must run the design operating sequence: page job, audience intent, conversion/trust spine, asset reality, lane, signature move, token contract, first viewport fit, mobile recomposition, verification plan.
- `/responsive` requires viewport-band thinking: compact laptop, standard desktop, wide monitor, mobile browser chrome, and reduced-motion/no-pin fallback.
- `/showroom`, `/services`, `/about`, `/contact`, and `/local` are route job modifiers. They can combine with `/landing`, `/redesign`, `/polish`, `/verify`, `/conversion`, `/trust`, `/awwward`, and `/performance`.
- `/trust` strengthens `/conversion`; it requires proof placement, risk reducers, source-aware claims, and no fake metrics.
- `/verify` should apply route checks to all known changed or requested routes, not only the homepage.
- Website-type parameters load `website-type-playbooks.md` and set defaults for hero logic, trust logic, CTA logic, layout rhythm, motion budget, asset needs, premium moves, and anti-patterns.
- `/research`, `/premium`, `/awwward`, `/brandkit`, and new-site `/design` require research-first and design-system-first references before final direction.
- Unsupported combinations return a short error and a valid replacement.

## Website Type Defaults

| Parameter | Default lane | Motion | Primary references |
|---|---|---|---|
| `/agency`, `/studio` | Editorial Premium + Product Proof | mid | website-type playbooks, research, typography/color |
| `/saas`, `/app` | Product Proof + Conversion Trust | low-mid | design-system-first, content conversion, implementation recipes |
| `/dashboard` | Data Confidence | low | component states, design-system governance |
| `/ecommerce` | Conversion Trust + Product Proof | low | website-type playbooks, content conversion, accessibility |
| `/hospitality` | Editorial Premium | low-mid | website-type playbooks, asset strategy, motion system |
| `/legal`, `/finance`, `/healthcare` | Conversion Trust | low | trust, accessibility, content conversion |
| `/luxury`, `/editorial` | Editorial Premium + Soft Luxury | mid | typography/color, editorial motion, asset strategy |
| `/startup` | Product Proof + Experimental Showcase | mid-high bounded | research, design-system-first, motion gates |

## Precedence And Conflict Policy

- Hard gates beat premium effects.
- Evidence beats opinion.
- Asset reality beats reference ambition.
- Existing project design system beats invented local styling unless the task is to replace it.
- Route/page job beats generic component pattern.
- Mobile usability beats desktop motion continuity.
- Reduced-motion completeness beats cinematic timing.
