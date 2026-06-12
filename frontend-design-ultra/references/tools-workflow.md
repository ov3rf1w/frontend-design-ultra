# Tools And Workflow

## Lifecycle

Default sequence: analyse -> design -> implement -> verify -> polish only when useful. Shortcut modes run only their needed slice; do not duplicate checks.

For substantial visual work, use this sequence before styling: define page job -> audience intent -> conversion/trust spine -> reference mechanics if relevant -> asset gate -> strategy lane -> signature move -> token contract -> UI spec -> implement -> evidence verification.

Internal command patterns:

- Redesign: audit -> retain strengths -> replace weak systems -> verify.
- Image-to-code: reference mechanics -> token map -> implementation -> browser comparison.
- Design-system: token audit -> semantic map -> component states -> usage cleanup.
- Motion: create or audit, never both by default.
- Brandkit: identity read -> tokens -> asset language -> page archetype -> forbidden defaults.

## Playwright / Browser

Use for authorized URL/local-app evidence. Capture desktop and mobile, tablet when useful, console/runtime issues, overflow, key interactions, responsive defects, accessibility smoke, and before/after after implementation. If private/authenticated/confidential, ask first.

For premium page-level work, collect three visual scales when authorized: isolated first viewport, detailed desktop/mobile slices, and full-page overview. Full-page is additive for rhythm and footer continuity, never a replacement for hero/slice review.

## Design System / Tailwind

Use existing project system first. For deeper token/component governance, load `design-system-governance.md`. Add or refine only behavior-changing primitives:

- semantic tokens for surface, text, accent, action, state, elevation, motion
- type roles and scale
- component states: rest, hover, focus, active, disabled, loading, error, empty
- stable dimensions for boards, toolbars, counters, cards, tiles

For Tailwind, adapt to the local version and keep utilities tied to semantic tokens.

Before importing any package, inspect the dependency file. If missing, provide install command or choose a native fallback. In React/Next.js, isolate pointer physics, scroll listeners, and motion-heavy components in client leaves. Use self-hosted fonts or framework font tooling; do not rely on production Google Font links.

## Visual Implementation Locks

- One icon family per project; standardize stroke/fill style.
- One radius scale per page: sharp, soft, or pill-led.
- One shadow/elevation language; no random black drop shadows.
- One accent family; no late-section color drift.
- Prefer CSS Grid for complex layouts; avoid percentage flex math.
- Avoid `h-screen` heroes on mobile; prefer dynamic viewport-safe sizing.

## Figma

Figma is optional and future-ready. If tooling exists, inspect frames/variables/components. If not, use provided screenshot, frame URL, exported tokens, states, and assets. Convert fixed frames into responsive implementation; never trade accessibility or performance for pixel mimicry.

## Implementation

Keep file scope minimal, follow local framework and components, implement gates during the change, and verify the changed surfaces only unless risk demands broader capture.

## Strategic Omissions Check

Before final response, check whether the site forgot: metadata/social image, skip link, form validation, loading/empty/error states, custom 404 or back path, footer/legal links when relevant, cookie consent when jurisdiction requires it.

Also check: route diversity, first-viewport fit, asset-role coverage, one signature move, reduced-motion final state, public-output safety, and no fake proof.

## Output Enforcement

Do not leave placeholder comments in final implementation work. If a section cannot be completed because content/assets are missing, render a polished, clearly replaceable state and list the exact missing input.
