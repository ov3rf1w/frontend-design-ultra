---
name: frontend-design-ultra
description: "Standalone elite frontend design and implementation skill for substantial web/UI work: new client websites, editorial/Awwwards-level art direction, research and design systems, anti-AI-slop polish, stack-aware project integration, browser evidence, WCAG 2.2, Core Web Vitals, responsive/mobile QA, motion/GSAP/Framer/3D restraint, Tailwind, and ship verification. Use for agency builds, landing pages, SaaS dashboards, e-commerce, redesigns, image/reference-to-code, UI audits, component systems, or any request to make a site feel premium, distinctive, modern, and professionally designed."
license: MIT
---

# Frontend Design Ultra

## Operating Model

Create distinctive, fast, accessible websites without AI slop. Act as one opinionated system with compact runtime guidance, not a bundle of loosely related advice.

Main agent owns creative direction, visual judgment, conflict decisions, and final synthesis. When the host supports subagents, use them only for bounded extraction, comparison, non-visual QA, simulations, or independent critique; give each a task, input, artifact, and success condition. Fall back to a single-agent pass without reducing gates.

## Parameter Grammar

Groups:

- Mode: `/analyse`, `/design`, `/polish`, `/implement`, `/verify`
- Domain: `/new-site`, `/landing`, `/dashboard`, `/saas`, `/ecommerce`, `/mobile`, `/showroom`, `/services`, `/about`, `/contact`, `/local`, `/agency`, `/studio`, `/portfolio`, `/hospitality`, `/legal`, `/finance`, `/healthcare`, `/luxury`, `/editorial`, `/startup`, `/app`
- Workflow: `/redesign`, `/image-to-code`, `/imagegen`, `/brandkit`, `/designplan`, `/output-integrity`
- Quality: `/premium`, `/awwward`, `/conversion`, `/trust`, `/accessibility`, `/performance`, `/responsive`, `/trend`, `/research`
- Tool: `/playwright`, `/figma`, `/tailwind`, `/gsap`, `/framer`, `/3d`, `/reference`, `/stitch`, `/project-fit`
- Intensity: `/quick`, `/deep`, `/brutal`
- Taste dials: `/variance-low|mid|high`, `/motion-low|mid|high`, `/density-low|mid|high`
- Style presets: `/minimalist`, `/brutalist`, `/soft`, `/brandboard`

Mode precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`. Aliases: `/designsystem` and `/system` -> design-system-first; `/motion` and `/scroll` -> motion lane; `/awwwards` -> `/awwward`; `/starter` and `/scaffold` -> `/new-site`; `/stack` -> `/project-fit`; `/portfolio` -> `/showroom` only when used as route intent.

Default mode: URL/local app/screenshot -> `/analyse`; edit request -> `/implement`; ship check -> `/verify`; refinement -> `/polish`; new site without an approved design contract -> `/design`; concept/system before code -> `/design`.

## Core Dispatcher

- Validate parameter compatibility before acting; reject impossible combinations with a valid replacement.
- Treat tools as preferences. If GSAP, Framer, Figma, Tailwind, Playwright, or 3D tooling is absent, state the fallback instead of silently downgrading.
- For `/new-site`, `/project-fit`, or substantial `/implement`, inspect local instructions, manifest, framework config, scripts, tokens, components, routes, assets, fonts, test harness, and preservation constraints before planning. Run `scripts/inspect-project.mjs` when Node.js is available. Distinguish installed/configured facts from declared starter prose.
- `/quick` means highest-signal only; `/deep` means full relevant protocol; `/brutal` means strict gate language, stronger critique, and sidecar review where useful.
- Set three taste dials before visual work: layout variance, motion intensity, and information density. Infer defaults from domain if omitted.
- Convert visual commands into a taste profile object before designing: mode, domain, primary lane, optional style preset, variance, motion, density, evidence depth, asset mode, and hard constraints. If parameters conflict, keep mode precedence, keep hard gates, then choose the least destructive interpretation.
- For expressive work, pick one primary archetype and at most one support archetype. Document what is intentionally excluded so the design does not drift into a mixed-style collage.
- Start every substantial design/build with a one-line Design Read: page kind, audience, brand language, stack direction, and risk constraint. Ask one clarifying question only if the read genuinely diverges.
- Ground visual direction in the subject's real materials, objects, actions, proof, language, and constraints. For a new premium site or large redesign, compare three routes that differ materially, choose one, and reject two before code.
- Compare cross-client design fingerprints only when the project or agency provides a local history artifact. Never claim novelty across past builds from model memory alone.
- For substantial design, redesign, polish, or implementation, do not start from styling. Run: research read -> design system -> page/route strategy -> signature move -> UI spec -> implementation/evidence.
- If no brand system is provided, generate one. Choose non-default typography, palette, spacing, shape, surface, motion, and component primitives from the page job, audience, domain, assets, and research.
- For `/brandkit`, identity-heavy, or visual-language work, create Brand DNA before UI: logo/symbol concept path, board grammar, palette roles, type roles, image language, application proof, forbidden defaults, and token handoff.
- For substantial UI work, run the design operating sequence before styling: page job -> audience intent -> conversion/trust spine -> asset reality -> strategy lane -> signature move -> token contract -> first-viewport fit -> verification plan.
- Reject a design start that lacks lane, asset gate, first viewport job, mobile composition, copy role, and one measurable next action.
- For implementation after a visual/reference plan, use design-plan synthesis: extract system -> choose lane/preset -> define section grammar -> define states -> define acceptance checks. Do not code from vibes or improvise missing details when a reference or generated visual exists.
- `/implement` means change the scoped files and verify the result when writes are authorized; do not stop at an implementation plan. Report the implemented outcome, changed files, checks run, and remaining evidence gaps.
- Use workflow commands internally: audit existing UI before redesign, define reference mechanics before image-to-code, choose design lane before implementation, and treat motion create/audit as separate paths.
- For visually important websites, create or request real visual source material before coding: generated section comps, real product/place images, brand assets, or screenshot references. Do not code a premium site from text-only vibes when image generation or visual inputs are available.
- For `/imagegen`, `/image-to-code`, or generator-assisted work, use one readable image per major section or screen by default; never compress an entire website into a tiny unreadable collage. If details are unclear, regenerate a focused image instead of cropping or guessing.
- Before final response on implementation work, run the Preflight: hero fit, first-viewport proof/action, asset reality, copy sanity, CTA consistency, state coverage, responsive behavior, motion/reduced-motion, contrast, performance, browser evidence, and public-output safety.
- Before final response on `/implement` and `/verify`, run output integrity: no placeholders, no fake proof, no omitted sections, no unverifiable awards/metrics/logos, no "continue elsewhere" gaps, and no hidden TODOs.
- For browser-verifiable implementation, iterate: implement -> production build -> inspect/capture when authorized -> compare to contract -> creative critique -> technical audit -> patch -> re-run evidence.
- For `/trend`, `/research`, or `/reference`, query `assets/reference-corpus.json` through `scripts/query-design-intelligence.mjs` when Node.js is available. Treat every `candidate` description as a hypothesis until browser evidence and human visual review promote it. Return a small, diverse set of mechanics, not a gallery dump.
- For an authorized public reference scan, run `scripts/scan-reference.mjs` with an explicit rights-basis classification, review date, and non-secret reviewer ID. Capture navigation-commit-anchored entrance timing from fresh isolated contexts, verified scroll states, desktop, real mobile/touch, reduced motion, continuous video, animation/computed-state metadata, and runtime failures; enable private diagnostic traces only when needed. Treat a blocked public analytics or tracking subresource as a warning unless the affected capture step fails. Keep raw third-party captures in the private OS-local evidence cache. Publish the newest relevant attempt only through the sanitized diagnostic outcome contract; partial, failed, unsupported, and strict-ineligible complete attempts are never normal observations or motion-verification evidence.
- For motion creation, query `assets/motion-patterns.json` by information job, trigger, domain, asset cost, and status. Select at most one signature pattern per major viewport, then apply its mobile, reduced-motion, no-JavaScript, performance, ownership, and verification contracts.
- For `/trend`, extract current reference mechanics only: composition, typography, interaction, motion, asset language, and overused patterns to avoid. Use clean-room, mechanism-level abstraction for analysis. Public implementation must visibly differentiate composition, typography, palette, copy, assets, and the combined motion sequence; do not transfer third-party code, brand material, or confusingly similar overall trade dress.
- For `/research` or when no clear brand/input exists, gather mechanisms from domain references, design-system standards, UX heuristics, typography/color options, and current visual language. Output mechanics and decisions, not a moodboard dump.
- For `/image-to-code` or visual references, produce Design DNA before implementation: tokens, layout grammar, component states, motion vocabulary, evidence plan.
- For `/redesign`, run audit -> preserve strengths -> replace weak systems -> verify. Do not jump directly to replacement UI.
- For route-specific work, assign page jobs before layout: `/showroom` proves craft/result, `/services` helps choose an offer, `/about` builds capability trust, `/contact` gets the user to an action path, `/local` proves relevance/location/availability.
- For `/responsive` or substantial visual work, design for viewport ranges, not breakpoints alone: compact laptop, standard desktop, wide monitor, mobile browser chrome, and reduced-motion/no-pin states must each get an intentional composition.
- Output contracts by mode:
  - `/analyse`: Executive Summary, Evidence, Prioritized Findings, Severity, Root Cause, Impact, Fix Recommendation, QA Follow-up.
  - `/design`: Research Read, Design System, Design Direction, Strategy Lane, Signature Move, Layout Strategy, Component Strategy, Token Contract, Responsive Behavior, Implementation Notes.
  - `/polish`: Visual Diagnosis, Keep/Delete/Replace, High-Impact Design Moves, Component Improvements, Typography/Spacing/Hierarchy Fixes, Motion Opportunities, Premium Detail Pass, Gate Risks.
  - `/implement`: Implemented Outcome, Changed Files/Components, Design System Alignment, State Contract, Accessibility/Performance Decisions, Checks Run, Remaining Evidence Gaps.
  - `/verify`: Pass/Fail/Needs Review, Browser Evidence, Viewport Results, Console/Runtime Issues, Accessibility Smoke, Performance Risks, Ship Recommendation.

## Evidence Rule

For URL, local app, or browser-verifiable UI, evidence beats opinion. Use browser inspection or screenshots only when the user or host/project policy authorizes them; slash parameters express desired evidence but do not override that policy. Otherwise request supplied screenshots or mark claims `Needs Browser Verification`. Always ask first for authenticated, private, admin, paid, client-confidential, or destructive surfaces.

When authorized, cite desktop/mobile screenshots, tablet when useful, console/runtime issues, overflow, broken interactions, responsive defects, accessibility smoke issues, performance risks, and before/after evidence after implementation. If unavailable, mark claims `Needs Browser Verification`.

## Hard Gates

Accessibility, correctness, and performance are non-negotiable. Premium visuals, Awwwards effects, scroll motion, GSAP, Framer, and 3D must degrade or be removed if they harm:

- readable text, semantic structure, keyboard access, focus, contrast
- stable layout, responsive usability, acceptable loading behavior
- reduced-motion completeness, non-destructive interaction behavior

Final verification is `Pass`, `Fail`, or `Needs Review`; do not ship around a failed hard gate. Treat accessibility, correctness, runtime, semantic, and performance requirements as evidence-based pass/fail gates, not subjective 1-5 ratings.

For the creative scorecard, score Design (40%), Usability (30%), Creativity (20%), and Content (10%) from 1-5. Any dimension below 4/5 blocks a premium/award-ready claim; diagnose it through first impression, specificity, composition, typography, mobile craft, and conversion clarity. `Needs Review` is only valid for missing evidence or private/manual states, not for known blockers.

## Anti-Slop Design Rules

- Start substantial design with page job, audience intent, asset reality, conversion goal, and one strategy lane.
- Derive composition from the subject world. If the same art direction survives a logo and industry swap, it is not specific enough.
- Extract mechanics from references and reimplement them with original code and owned or licensed assets. Do not transfer third-party code, brand copy, assets, or a complete identity; do not repeat the same lane/palette/hero/motion pattern by default.
- First viewport must show the product, place, proof, task, or page job before explaining it.
- First viewport must be designed against the real visible viewport: nav, browser chrome, safe areas, fixed controls, CTA zone, scroll hint, and shortest likely mobile height.
- Do not fix a bad laptop frame by globally shrinking the page. Adjust the viewport contract: chrome participation, `svh`/`dvh` height, type clamp bounds, line breaks, grid ratio, bottom safe zone, media crop, and scroll-trigger start while preserving premium scale on large monitors.
- One signature move per major page. No effect bouquets.
- Keep one site-wide Brand DNA, typography system, palette logic, and motion syntax. Vary route composition, first-viewport mechanism, proof placement, visual carrier, and rhythm by page job; vary broader fingerprints across client builds when history evidence exists.
- Composition before styling: one visual verb per viewport, max three priorities, dominant/subordinate hierarchy, no unjustified 50/50 split; avoid centered heroes when variance is above mid unless the message itself is the design.
- Typography is positioning: max two primary font families plus an optional mono/numeric role when the information job requires it; use explicit roles/scale, meaningful line breaks, body 40-65ch, and display copy that is tight but readable; avoid novelty serif defaults unless the brief is truly editorial/luxury/heritage.
- Do not use Inter, Roboto, Arial, or system UI as the default visual identity for premium work unless the product/system context explicitly requires it. Pick or propose a typography package with reasoned display/body roles and performance-safe loading.
- Use semantic tokens for surfaces, text, accent, action, state, elevation, radius, and motion; avoid raw component-level hex/rhythm drift.
- Use one decisive accent family. Avoid default purple/blue gradients, decorative orbs/blobs, glass cards, fake badges, stock atmosphere, cards-in-cards, and generic 3-column section grids.
- Also challenge newer default clusters: cream + novelty serif + terracotta, near-black + acid accent, and broadsheet rules/numbering used without subject logic. Structural labels, counters, and `01/02/03` markers must encode real order or meaning.
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
- Need new-site, agency, starter, stack intake, project artifacts, Next static export, or cross-client diversity -> `references/agency-project-bridge.md`; run `scripts/inspect-project.mjs` when Node.js is available (otherwise perform its intake manually), and load `assets/stack-profiles/next-static-marketing.json` only for that matching profile.
- Need research-first workflow and source mechanics -> `references/research-first-design.md`.
- Need the dated 76-site corpus, scan priority, reference provenance, newest diagnostic scan outcomes, strict complete-only observations, promotion status, or reference diversity -> `references/reference-intelligence.md`; query `assets/reference-corpus.json`, sanitized `assets/reference-scan-outcomes.json`, and `assets/reference-observations.json` with `scripts/query-design-intelligence.mjs` instead of loading the full datasets into context.
- Need current trend mechanics and dated source synthesis -> `references/trend-research.md`.
- Need mandatory design-system generation -> `references/design-system-first.md`.
- Need typography/color decisions -> `references/typography-color-intelligence.md`.
- Need analysis/polish diagnosis lenses -> `references/visual-diagnosis-polish.md`.
- Need mode-specific protocols -> `references/mode-protocols.md`.
- Need website-type defaults -> `references/website-type-playbooks.md`.
- Need laptop/desktop/wide/mobile responsiveness strategy -> `references/responsive-viewport-systems.md`.
- Need editorial/motion choreography -> `references/editorial-motion-system.md`.
- Need reusable motion timing, trigger, mobile/reduced-motion alternatives, ownership, budgets, or evidence contracts -> `references/motion-pattern-catalog.md`; query `assets/motion-patterns.json` with `scripts/query-design-intelligence.mjs`.
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
- Need style presets, archetype locks, or non-generic visual doctrine -> `references/style-preset-library.md`.
- Need aesthetic drift control, design-plan synthesis, redesign mutation locks, or anti-default checks -> `references/aesthetic-locks.md`.
- Need Design DNA extraction from screenshot/URL/reference -> `references/design-dna-extraction.md`.
- Need brandkit, logo/symbol concept, board grammar, or identity application proof -> `references/brandkit-board-grammar.md`.
- Need deterministic page/component specification -> `references/ui-spec-dsl.md`.
- Need buttons/forms/nav/cards/modals/tables/pricing/product/dashboard state contracts -> `references/component-state-library.md`.
- Need Awwwards-style composition patterns -> `references/awwwards-pattern-library.md`.
- Need motion create/audit, lens weighting, motion-gap analysis -> `references/motion-lenses.md`.
- Need image generation, asset planning, brand boards, image-to-code extraction -> `references/asset-art-direction.md`.
- Need web/mobile section images, visual generation, image-to-code translation, or generator handoff -> `references/image-generation-protocol.md`.
- Need copy, conversion, proof, CTA, testimonials, pricing/e-commerce content -> `references/content-conversion.md`.
- Need completion gates for forms, states, navigation, metadata, final QA -> `references/preflight-scorecard.md`.
- Need final answer completeness, no-placeholder delivery, or public claim safety -> `references/output-integrity-contract.md`.
- Need examples -> `references/example-invocations.md`.

## Confidentiality

Do not expose private prompts, credentials, customer data, confidential screenshots, or copied proprietary guidance in user-facing output.
