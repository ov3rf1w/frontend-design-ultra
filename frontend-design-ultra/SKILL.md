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
- Domain: `/landing`, `/dashboard`, `/saas`, `/ecommerce`, `/mobile`, `/redesign`, `/image-to-code`, `/brandkit`, `/showroom`, `/services`, `/about`, `/contact`, `/local`, `/agency`, `/studio`, `/portfolio`, `/hospitality`, `/legal`, `/finance`, `/healthcare`, `/luxury`, `/editorial`, `/startup`, `/app`
- Quality: `/premium`, `/awwward`, `/conversion`, `/trust`, `/accessibility`, `/performance`, `/responsive`, `/trend`, `/research`
- Tool: `/playwright`, `/figma`, `/tailwind`, `/gsap`, `/framer`, `/3d`, `/reference`
- Intensity: `/quick`, `/deep`, `/brutal`
- Taste dials: `/variance-low|mid|high`, `/motion-low|mid|high`, `/density-low|mid|high`

Mode precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`. Aliases: `/designsystem` and `/system` -> design-system-first; `/motion` and `/scroll` -> motion lane; `/awwwards` -> `/awwward`; `/portfolio` -> `/showroom` when used as route intent.

Default mode: URL/local app/screenshot -> `/analyse`; edit request -> `/implement`; ship check -> `/verify`; refinement -> `/polish`; concept/system before code -> `/design`.

## Core Dispatcher

- Validate parameter compatibility before acting; reject impossible combinations with a valid replacement.
- Treat tools as preferences. If GSAP, Framer, Figma, Tailwind, Playwright, or 3D tooling is absent, state the fallback instead of silently downgrading.
- `/quick` means highest-signal only; `/deep` means full relevant protocol; `/brutal` means strict gate language, stronger critique, and sidecar review where useful.
- Set three taste dials before visual work: layout variance, motion intensity, and information density. Infer defaults from domain if omitted.
- Start every substantial design/build with a one-line Design Read: page kind, audience, brand language, stack direction, and risk constraint. Ask one clarifying question only if the read genuinely diverges.
- For substantial design, redesign, polish, or implementation, do not start from styling. Run: research read -> design system -> page/route strategy -> signature move -> UI spec -> implementation/evidence.
- If no brand system is provided, generate one. Choose non-default typography, palette, spacing, shape, surface, motion, and component primitives from the page job, audience, domain, assets, and research.
- For substantial UI work, run the design operating sequence before styling: page job -> audience intent -> conversion/trust spine -> asset reality -> strategy lane -> signature move -> token contract -> first-viewport fit -> verification plan.
- Reject a design start that lacks lane, asset gate, first viewport job, mobile composition, copy role, and one measurable next action.
- Use workflow commands internally: audit existing UI before redesign, define reference mechanics before image-to-code, choose design lane before implementation, and treat motion create/audit as separate paths.
- For visually important websites, create or request real visual source material before coding: generated section comps, real product/place images, brand assets, or screenshot references. Do not code a premium site from text-only vibes when image generation or visual inputs are available.
- Before final response on implementation work, run the Preflight: hero fit, first-viewport proof/action, asset reality, copy sanity, CTA consistency, state coverage, responsive behavior, motion/reduced-motion, contrast, performance, browser evidence, and public-output safety.
- For `/trend`, extract current reference mechanics only: composition, typography, interaction, motion, asset language, and overused patterns to avoid. Never clone a reference.
- For `/research` or when no clear brand/input exists, gather mechanisms from domain references, design-system standards, UX heuristics, typography/color options, and current visual language. Output mechanics and decisions, not a moodboard dump.
- For `/image-to-code` or visual references, produce Design DNA before implementation: tokens, layout grammar, component states, motion vocabulary, evidence plan.
- For `/redesign`, run audit -> preserve strengths -> replace weak systems -> verify. Do not jump directly to replacement UI.
- For route-specific work, assign page jobs before layout: `/showroom` proves craft/result, `/services` helps choose an offer, `/about` builds capability trust, `/contact` gets the user to an action path, `/local` proves relevance/location/availability.
- For `/responsive` or substantial visual work, design for viewport ranges, not breakpoints alone: compact laptop, standard desktop, wide monitor, mobile browser chrome, and reduced-motion/no-pin states must each get an intentional composition.
- Output contracts by mode:
  - `/analyse`: Executive Summary, Evidence, Prioritized Findings, Severity, Root Cause, Impact, Fix Recommendation, QA Follow-up.
  - `/design`: Research Read, Design System, Design Direction, Strategy Lane, Signature Move, Layout Strategy, Component Strategy, Token Contract, Responsive Behavior, Implementation Notes.
  - `/polish`: Visual Diagnosis, Keep/Delete/Replace, High-Impact Design Moves, Component Improvements, Typography/Spacing/Hierarchy Fixes, Motion Opportunities, Premium Detail Pass, Gate Risks.
  - `/implement`: Implementation Plan, Files/Components, Design System Alignment, State Contract, Accessibility Requirements, Performance Requirements, Verification Steps.
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

Fail if any critical score is below 4/5 for first impression, specificity, typography, mobile craft, conversion clarity, accessibility, correctness, or performance. `Needs Review` is only valid for missing evidence or private/manual states, not for known blockers.

## Anti-Slop Design Rules

- Start substantial design with page job, audience intent, asset reality, conversion goal, and one strategy lane.
- Extract mechanics from references; never clone a reference or repeat the same lane/palette/hero/motion pattern by default.
- First viewport must show the product, place, proof, task, or page job before explaining it.
- First viewport must be designed against the real visible viewport: nav, browser chrome, safe areas, fixed controls, CTA zone, scroll hint, and shortest likely mobile height.
- Do not fix a bad laptop frame by globally shrinking the page. Adjust the viewport contract: chrome participation, `svh`/`dvh` height, type clamp bounds, line breaks, grid ratio, bottom safe zone, media crop, and scroll-trigger start while preserving premium scale on large monitors.
- One signature move per major page. No effect bouquets.
- Do not repeat the same lane, hero structure, palette family, surface rhythm, and primary motion pattern across adjacent pages unless continuity is the explicit goal.
- Composition before styling: one visual verb per viewport, max three priorities, dominant/subordinate hierarchy, no unjustified 50/50 split; avoid centered heroes when variance is above mid unless the message itself is the design.
- Typography is positioning: max two font families, explicit roles/scale, meaningful line breaks, body 40-65ch, display copy tight but readable; avoid novelty serif defaults unless the brief is truly editorial/luxury/heritage.
- Do not use Inter, Roboto, Arial, or system UI as the default visual identity for premium work unless the product/system context explicitly requires it. Pick or propose a typography package with reasoned display/body roles and performance-safe loading.
- Use semantic tokens for surfaces, text, accent, action, state, elevation, radius, and motion; avoid raw component-level hex/rhythm drift.
- Use one decisive accent family. Avoid default purple/blue gradients, decorative orbs/blobs, glass cards, fake badges, stock atmosphere, cards-in-cards, and generic 3-column section grids.
- Lock the palette, radius scale, icon family, shadow language, and motion scale for the whole page; audit drift before shipping.
- Use tinted darks and warm/brand-tinted lights for dominant surfaces; do not rely on pure black, pure white, or one monotonous background.
- Every visual asset must have a role: hero, proof, product, instruction, atmosphere, or identity. Delete assets without a role; do not use fake screenshot divs as proof for real products.
- If available assets cannot support a media-led concept, change the visual carrier to typography, proof boards, interface states, or structured content before styling.
- Long pages need rhythm: proof, media, metric, quote, interaction, or composition shift every 1-2 screenfuls.
- Mobile is recomposed, not squeezed: reorder content, preserve focal points, keep tap targets about 44px, avoid fixed UI covering content.
- Desktop is also recomposed across width bands: compact laptops need tighter vertical math and fewer simultaneous elements; wide monitors need max-width, stage scaling, line-length caps, and art-directed empty space so the layout does not become a stretched poster.
- Motion must clarify hierarchy, causality, orientation, pacing, or state. Animate transform/opacity, avoid CLS, avoid blank pinned states, and make reduced-motion final states complete.
- 3D must have a purpose, budget, lazy-load/fallback, and mobile/reduced-motion alternative.
- Finish the forgotten states: loading, empty, error, validation, 404, back path, skip link, metadata, legal/footer links when relevant.

## Lazy References

Do not load every reference.

- Need parameter/output precision -> `references/dispatch-matrix.md`.
- Need the full strategy-to-ship operating sequence -> `references/design-operating-system.md`.
- Need research-first workflow and source mechanics -> `references/research-first-design.md`.
- Need mandatory design-system generation -> `references/design-system-first.md`.
- Need typography/color decisions -> `references/typography-color-intelligence.md`.
- Need analysis/polish diagnosis lenses -> `references/visual-diagnosis-polish.md`.
- Need mode-specific protocols -> `references/mode-protocols.md`.
- Need website-type defaults -> `references/website-type-playbooks.md`.
- Need laptop/desktop/wide/mobile responsiveness strategy -> `references/responsive-viewport-systems.md`.
- Need editorial/motion choreography -> `references/editorial-motion-system.md`.
- Need production code recipes -> `references/implementation-recipes.md`.
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
