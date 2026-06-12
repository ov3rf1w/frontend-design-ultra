# Design Operating System

Use this for substantial UI work, premium redesigns, route systems, Awwwards-grade direction, and any task where quality matters more than speed.

## Mandatory Sequence

Run this before styling or implementation:

1. Page job: define the one thing the page must make clear or possible.
2. Audience intent: identify whether the user is evaluating, comparing, buying, trusting, operating, or contacting.
3. Conversion/trust spine: define relevance, concrete outcome, proof, action, and post-click expectation.
4. Asset reality: list available proof media, product states, brand assets, people/place/process visuals, data, and missing assets.
5. Strategy lane: choose one lane and blend at most one support lane.
6. Signature move: choose one page-native mechanism that supports the page job.
7. Token contract: lock surfaces, text, accent, radius, spacing, type roles, elevation, and motion scale.
8. First viewport fit: account for nav, browser chrome, safe areas, fixed controls, CTA, media crop, and shortest mobile height.
9. Responsive viewport system: define compact laptop, standard desktop, wide monitor, mobile, and reduced-motion/no-pin compositions.
10. Mobile recomposition: define mobile order, first visible action, media focal points, and motion reduction.
11. Verification plan: define desktop/mobile/wide evidence, reduced-motion pass, interaction smoke, overflow, console, accessibility, and performance checks.

If any item is unknown, mark it explicitly. Do not hide uncertainty behind generic visual language.

## Route Archetypes

Use route job before component pattern:

| Route token | Page job | First viewport must show | Typical signature move | Avoid |
|---|---|---|---|---|
| `/landing` | Explain value and start action | outcome, proof, CTA | product stage, proof board, editorial split | vague mission hero |
| `/showroom` | Prove craft, result, or case quality | work/result before explanation | case rail, object stage, before/after reveal | generic portfolio grid first |
| `/services` | Help user choose an offer | task index, offer map, concrete outcomes | interactive index, chapter spread | repeated service cards only |
| `/about` | Build capability trust | people/process/proof, not biography wall | timeline rail, team proof board | stock handshake filler |
| `/contact` | Get to the right next action | direct action path, availability, location or response expectation | action panel, route board | decorative photo hero |
| `/local` | Prove relevance, location, availability | service area, trust, contact path | local proof map, process board | generic national SaaS hero |
| `/dashboard` | Enable decisions and control | command area and key state | density choreography, focus mode | marketing-card layout |
| `/ecommerce` | Reduce buying friction | media, price, variant, delivery/returns, CTA | product stage, comparison strip | long specs before action |

## Strategy Lane Gate

Pick one primary lane:

- Editorial Premium: strong typography, restrained chrome, high-quality media.
- Product Proof: real product/state first, evidence-led sections, clear action.
- Data Confidence: dense hierarchy, calm surfaces, table/chart semantics.
- Conversion Trust: proof and risk reducers near friction.
- Experimental Showcase: one memorable mechanism with strict fallback.
- Minimal Operator: clarity, speed, low ornament, high usability.
- Industrial/Brutalist: sharp grid, mechanical rhythm, high contrast.
- Soft Luxury: warm surfaces, generous spacing, refined type, subtle motion.

Reject a lane if assets, copy, or performance budget cannot support it.

## Asset Reality Gate

Every visual asset needs one role: hero, proof, product, instruction, atmosphere, identity, or interface.

Rules:

- If proof is required, atmosphere cannot substitute for it.
- If hero-grade imagery is weak, switch to typography/proof/interface composition.
- If only placeholders exist, state the missing asset and build a polished replaceable slot.
- Never use fake logos, fake customer numbers, fake screenshots, or div mockups as proof.
- For media-heavy concepts, decide compression, poster, dimensions, lazy-load boundary, alt text, and reduced-motion fallback before implementation.

## First Viewport Fit Contract

The first viewport must pass on desktop and mobile:

- Page job is understandable within 3 seconds.
- Primary CTA or action path is visible and usable.
- Trust/proof appears in the first frame or first scroll when the page needs trust.
- Nav participates in the frame; media-heavy heroes may start transparent/image-aware and become solid after the hero boundary.
- No key headline, CTA, card, or media subject is clipped by fixed chrome, safe areas, browser bars, or demo bars.
- Short mobile viewports get a recomposed hero, not merely smaller desktop.
- Compact laptops get tighter vertical math and clamp bounds; wide monitors get capped copy, scaled stages, and authored negative space.

Use `svh`/`dvh` deliberately; do not trust `min-h-screen` as a fit contract.

## Diversity Gate

Before designing another route or page, compare the planned lane, hero structure, palette family, surface rhythm, and primary motion pattern against nearby pages. If they match without a brand reason, change at least one of:

- opening composition
- surface rhythm
- visual carrier
- signature move
- proof placement
- motion vocabulary

The right-looking default used everywhere becomes a template.

## Token Contract

Substantial work requires tokens for:

- surfaces: base, raised, muted, inverse
- text: primary, muted, inverse
- line/border
- accent and accent-hover
- action, danger, success, warning, focus
- radius scale
- spacing rhythm
- elevation/shadow
- motion duration/easing
- typography roles: display, section, body, eyebrow, CTA, metadata, numeric/mono where needed

Deterministic checks:

- No pure black or white as dominant page surface unless the brand explicitly demands it and contrast is verified.
- One accent family per page context.
- Spacing follows a coherent rhythm.
- Problem words are not highlighted as the primary accent in display copy; highlight promise/outcome words.
- Shared components consume semantic tokens, not raw one-off literals.

## Signature Move Rules

One strong mechanism beats many effects:

- It must support the page job.
- It must work without breaking accessibility, performance, or mobile.
- It must have a reduced-motion final state.
- It must not delay reading or block primary action.
- It should create memory through structure, not decoration.

Examples of valid mechanisms: interactive task index, proof board, object-stage product hero, editorial split, scroll chapter with immediate content, image-mask reveal with static fallback, immersive footer, route/action atlas, cursor-follow preview on pointer devices only.

## Ship Decision

Use `Fail` if any hard gate fails. Use `Needs Review` only when evidence is missing or manual/private states block certainty.

Block completion when any critical score is below 4/5:

- first impression
- specificity
- typography
- mobile craft
- conversion clarity
- accessibility
- correctness
- performance
