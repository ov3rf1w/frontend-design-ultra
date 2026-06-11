# Hard Gates And Evidence

## Ship Gates

`/verify` returns:

- `Pass`: no blocking evidence gaps or hard-gate failures.
- `Fail`: accessibility, correctness, runtime, layout, or performance blocker exists.
- `Needs Review`: private/manual state or missing browser evidence blocks certainty.

## Accessibility

Check landmarks, heading order, keyboard path, focus visibility, labels, form errors, contrast, alt text, reduced motion, and non-color-only states. Prefer native controls; ARIA is a last-mile tool, not a substitute for semantics.

## Performance

Use CWV as contract: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. Watch above-fold media, heavy client JS, late fonts/media, scroll listeners, animation layout work, and 3D/canvas cost.

## Mobile

Recompose content order; preserve image focal points; keep primary action visible; prevent horizontal overflow; avoid fixed UI covering content; keep practical tap targets around 44px; convert hover effects to explicit touch actions.

## Motion / 3D

Motion must clarify state, hierarchy, or progression. Prefer transform/opacity, stable dimensions, reduced-motion final visibility, no blank pinned states, no scroll hijack. 3D needs one clear scene purpose, lazy load, static fallback, mobile fallback, and no unreadable text inside fragile canvas states.

## Evidence IDs

When browser evidence is authorized, visual/runtime claims should reference screenshot, viewport, console, trace, or check IDs. Without evidence, label the claim `Needs Browser Verification`.

