# Hard Gates And Evidence

## Ship Gates

`/verify` returns:

- `Pass`: no blocking evidence gaps or hard-gate failures.
- `Fail`: accessibility, correctness, runtime, layout, or performance blocker exists.
- `Needs Review`: private/manual state or missing browser evidence blocks certainty.

Known blockers cannot be averaged out. If any critical category scores below 4/5, return `Fail` or `Not done`, not a polite pass.

## Accessibility

Check landmarks, heading order, keyboard path, focus visibility, labels, form errors, contrast, alt text, reduced motion, and non-color-only states. Prefer native controls; ARIA is a last-mile tool, not a substitute for semantics.

## Performance

Use CWV as contract: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. Watch above-fold media, heavy client JS, late fonts/media, scroll listeners, animation layout work, and 3D/canvas cost.

## Mobile

Recompose content order; preserve image focal points; keep primary action visible; prevent horizontal overflow; avoid fixed UI covering content; keep practical tap targets around 44px; convert hover effects to explicit touch actions.

## Awwwards Scorecard

Score 1-5 before calling premium work done:

- First impression: memorable within 3 seconds.
- Specificity: could not belong to any random startup.
- Composition: clear hierarchy, rhythm, and spatial intent.
- Typography: distinct roles, clean breaks, no default-looking stack.
- Motion: purposeful and complete with reduced motion.
- Mobile craft: recomposed, not merely stacked.
- Proof/conversion: user knows why to trust and what to do.

Any score below 4 becomes a fix target, not a note.

Critical categories for substantial UI: first impression, specificity, typography, mobile craft, conversion clarity, accessibility, correctness, and performance.

## First Viewport Gate

Fail when the first screen does not make the page job understandable, hides the primary action path, clips key content, uses a decorative media carrier where proof is required, or relies on scroll theatre before value is clear.

## Conversion / Trust Gate

Fail when the page lacks a concrete outcome, source-aware proof, clear next action, or risk reducer near friction. Do not invent metrics, logos, awards, or customer proof.

## Reduced-Motion Gate

Fail when reduced-motion leaves hidden content, frozen pre-reveal elements, blank pinned scenes, inaccessible canvas, or no static alternative for essential motion.

## Motion / 3D

Motion must clarify state, hierarchy, or progression. Prefer transform/opacity, stable dimensions, reduced-motion final visibility, no blank pinned states, no scroll hijack. 3D needs one clear scene purpose, lazy load, static fallback, mobile fallback, and no unreadable text inside fragile canvas states.

## Evidence IDs

When browser evidence is authorized, visual/runtime claims should reference screenshot, viewport, console, trace, or check IDs. Without evidence, label the claim `Needs Browser Verification`.
