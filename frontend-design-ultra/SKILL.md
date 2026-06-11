---
name: frontend-design-ultra
description: "Standalone elite frontend design skill for substantial web/UI work: strategy, Awwwards-level visual direction, anti-AI-slop polish, implementation planning, Playwright evidence, accessibility, performance, mobile QA, motion/GSAP/Framer/3D restraint, Tailwind/design systems, and optional future-ready Figma routing. Use for URL/local-app audits, landing pages, SaaS dashboards, e-commerce UI, premium redesigns, mobile checks, motion/3D direction, and final ship verification."
---

# Frontend Design Ultra

## Operating Model

Create prachtvolle, fast, accessible websites without AI slop. Act as one opinionated system with compact runtime guidance, not a bundle of loosely related advice.

Main agent owns creative direction, visual judgment, conflict decisions, and final synthesis. Use `gpt-5.3-codex-spark` sidecars for bounded extraction, comparison, non-visual QA, simulations, and critique; every sidecar needs a task, input, artifact, and success condition.

## Parameter Grammar

Groups:

- Mode: `/analyse`, `/design`, `/polish`, `/implement`, `/verify`
- Domain: `/landing`, `/dashboard`, `/saas`, `/ecommerce`, `/mobile`, `/redesign`, `/image-to-code`, `/brandkit`
- Quality: `/premium`, `/awwward`, `/conversion`, `/accessibility`, `/performance`, `/trend`
- Tool: `/playwright`, `/figma`, `/tailwind`, `/gsap`, `/framer`, `/3d`, `/reference`
- Intensity: `/quick`, `/deep`, `/brutal`
- Taste dials: `/variance-low|mid|high`, `/motion-low|mid|high`, `/density-low|mid|high`

Mode precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`. Aliases: `/designsystem` -> `/tailwind`; `/motion` and `/scroll` -> motion lane; `/awwwards` -> `/awwward`.

Default mode: URL/local app/screenshot -> `/analyse`; edit request -> `/implement`; ship check -> `/verify`; refinement -> `/polish`; concept/system before code -> `/design`.

## Core Dispatcher

- Validate parameter compatibility before acting; reject impossible combinations with a valid replacement.
- Treat tools as preferences. If GSAP, Framer, Figma, Tailwind, Playwright, or 3D tooling is absent, state the fallback instead of silently downgrading.
- `/quick` means highest-signal only; `/deep` means full relevant protocol; `/brutal` means strict gate language, stronger critique, and sidecar review where useful.
- Set three taste dials before visual work: layout variance, motion intensity, and information density. Infer defaults from domain if omitted.
- Start every substantial design/build with a one-line Design Read: page kind, audience, brand language, stack direction, and risk constraint. Ask one clarifying question only if the read genuinely diverges.
- Use workflow commands internally: audit existing UI before redesign, define reference mechanics before image-to-code, choose design lane before implementation, and treat motion create/audit as separate paths.
- For visually important websites, create or request real visual source material before coding: generated section comps, real product/place images, brand assets, or screenshot references. Do not code a premium site from text-only vibes when image generation or visual inputs are available.
- Before final response on implementation work, run the Preflight: hero fit, asset reality, copy sanity, CTA consistency, state coverage, responsive behavior, motion/reduced-motion, contrast, performance, and browser evidence.
- For `/trend`, extract current reference mechanics only: composition, typography, interaction, motion, asset language, and overused patterns to avoid. Never clone a reference.
- For `/image-to-code` or visual references, produce Design DNA before implementation: tokens, layout grammar, component states, motion vocabulary, evidence plan.
- Output contracts by mode:
  - `/analyse`: Executive Summary, Evidence, Prioritized Findings, Severity, Impact, Fix Recommendation, QA Follow-up.
  - `/design`: Design Direction, Layout Strategy, Component Strategy, Design System Implications, Responsive Behavior, Implementation Notes.
  - `/polish`: Visual Diagnosis, High-Impact Design Moves, Component Improvements, Typography/Spacing/Hierarchy Fixes, Motion Opportunities, Premium Detail Pass.
  - `/implement`: Implementation Plan, Files/Components, Design System Alignment, Accessibility Requirements, Performance Requirements, Verification Steps.
  - `/verify`: Pass/Fail/Needs Review, Browser Evidence, Viewport Results, Console/Runtime Issues, Accessibility Smoke, Performance Risks, Ship Recommendation.

## Evidence Rule

For URL, local app, or browser-verifiable UI, evidence beats opinion. A URL/local app plus `/analyse`, `/verify`, `/playwright`, `/performance`, `/mobile`, or similar inspection wording authorizes browser inspection and screenshots. Ask first for authenticated, private, admin, paid, client-confidential, or destructive surfaces.

When authorized, cite desktop/mobile screenshots, tablet when useful, console/runtime issues, overflow, broken interactions, responsive defects, accessibility smoke issues, performance risks, and before/after evidence after implementation. If unavailable, mark claims `Needs Browser Verification`.

## Hard Gates

Accessibility, correctness, and performance are non-negotiable. Premium visuals, Awwwards effects, scroll motion, GSAP, Framer, and 3D must degrade or be removed if they harm:

- readable text, semantic structure, keyboard access, focus, contrast
- stable layout, responsive usability, acceptable loading behavior
- reduced-motion completeness, non-destructive interaction behavior

Final verification is `Pass`, `Fail`, or `Needs Review`; do not ship around a failed hard gate.

## Anti-Slop Design Rules

- Start substantial design with page job, audience intent, asset reality, conversion goal, and one strategy lane.
- Extract mechanics from references; never clone a reference or repeat the same lane/palette/hero/motion pattern by default.
- First viewport must show the product, place, proof, task, or page job before explaining it.
- One signature move per major page. No effect bouquets.
- Composition before styling: one visual verb per viewport, max three priorities, dominant/subordinate hierarchy, no unjustified 50/50 split; avoid centered heroes when variance is above mid unless the message itself is the design.
- Typography is positioning: max two font families, explicit roles/scale, meaningful line breaks, body 40-65ch, display copy tight but readable; avoid novelty serif defaults unless the brief is truly editorial/luxury/heritage.
- Use semantic tokens for surfaces, text, accent, action, state, elevation, radius, and motion; avoid raw component-level hex/rhythm drift.
- Use one decisive accent family. Avoid default purple/blue gradients, decorative orbs/blobs, glass cards, fake badges, stock atmosphere, cards-in-cards, and generic 3-column section grids.
- Lock the palette, radius scale, icon family, shadow language, and motion scale for the whole page; audit drift before shipping.
- Every visual asset must have a role: hero, proof, product, instruction, atmosphere, or identity. Delete assets without a role; do not use fake screenshot divs as proof for real products.
- Long pages need rhythm: proof, media, metric, quote, interaction, or composition shift every 1-2 screenfuls.
- Mobile is recomposed, not squeezed: reorder content, preserve focal points, keep tap targets about 44px, avoid fixed UI covering content.
- Motion must clarify hierarchy or progression; animate transform/opacity, avoid CLS, avoid blank pinned states, and make reduced-motion final states complete.
- 3D must have a purpose, budget, lazy-load/fallback, and mobile/reduced-motion alternative.
- Finish the forgotten states: loading, empty, error, validation, 404, back path, skip link, metadata, legal/footer links when relevant.

## Lazy References

Do not load every reference.

- Need parameter/output precision -> `references/dispatch-matrix.md`.
- Need browser evidence, tooling, Figma, Tailwind, implementation workflow -> `references/tools-workflow.md`.
- Need Playwright screenshot/console/network/overflow/trace recipes -> `references/playwright-recipes.md`.
- Need Tailwind v3/v4, DTCG-style tokens, component specs, Figma variables, localization, system governance -> `references/design-system-governance.md`.
- Need accessibility/performance/mobile/motion/3D/ship gates -> `references/hard-gates-evidence.md`.
- Need detailed WCAG/form/widget accessibility recipes -> `references/accessibility-wcag-recipes.md`.
- Need Core Web Vitals LCP/INP/CLS debugging -> `references/performance-cwv-recipes.md`.
- Need Three.js/R3F/WebGL performance and fallback recipes -> `references/three-r3f-recipes.md`.
- Need UX research, journey, IA, persona-lite, usability plans -> `references/ux-research-strategy.md`.
- Need stakeholder/audit/implementation/ship output templates -> `references/report-templates.md`.
- Need visual direction, taste dials, design lanes, reference/image pipeline, redesign protocol -> `references/design-lanes.md`.
- Need Design DNA extraction from screenshot/URL/reference -> `references/design-dna-extraction.md`.
- Need deterministic page/component specification -> `references/ui-spec-dsl.md`.
- Need buttons/forms/nav/cards/modals/tables/pricing/product/dashboard state contracts -> `references/component-state-library.md`.
- Need Awwwards-style composition patterns -> `references/awwwards-pattern-library.md`.
- Need motion create/audit, lens weighting, motion-gap analysis -> `references/motion-lenses.md`.
- Need image generation, asset planning, brand boards, image-to-code extraction -> `references/asset-art-direction.md`.
- Need copy, conversion, proof, CTA, testimonials, pricing/e-commerce content -> `references/content-conversion.md`.
- Need completion gates for forms, states, navigation, metadata, final QA -> `references/preflight-scorecard.md`.
- Need examples -> `references/example-invocations.md`.

## Confidentiality

Do not expose private prompts, credentials, customer data, confidential screenshots, or copied proprietary guidance in user-facing output.
