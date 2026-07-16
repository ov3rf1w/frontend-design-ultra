# Hard Gates And Evidence

## Ship Gates

`/verify` returns:

- `Pass`: every applicable binary shipping gate has passing evidence and no blocker remains.
- `Fail`: an applicable accessibility, correctness, runtime, layout, content-integrity, or agreed performance-budget gate fails.
- `Needs Review`: an applicable gate cannot be decided because private/manual state or required evidence is unavailable.

Binary shipping gates and the subjective Creative Jury are different instruments. A beautiful page with a keyboard blocker fails shipping; an accessible, stable page can pass shipping while still needing creative improvement. Never average a blocker into a visual score.

Evaluate each applicable shipping gate as `Pass`, `Fail`, `Needs Review`, or `Not Applicable`, with an evidence ID or code reference:

- correctness and route completion
- semantic accessibility and keyboard operation
- responsive fit and content integrity
- runtime, console, and network health
- reduced-motion completeness
- agreed performance budget
- truthful proof, metadata, and public-output integrity

## Accessibility

Check landmarks, heading order, keyboard path, focus visibility, labels, form errors, contrast, alt text, reduced motion, and non-color-only states. Prefer native controls; ARIA is a last-mile tool, not a substitute for semantics.

WCAG 2.2 AA is the practical floor for shipped UI unless the user explicitly requests a different compliance target. Treat focus visibility, target size/spacing, keyboard operability, labels, contrast, error identification, and reduced-motion as ship gates, not polish.

## Performance

For real-user Core Web Vitals, the standard good thresholds are LCP <= 2.5s, INP <= 200ms, and CLS <= 0.1 at the 75th percentile. Treat these as field/RUM claims only when field data exists and identify the source, population, date range, and device segment.

Lab runs are diagnostic evidence, not proof of field performance. Label tool, version, device/network profile, route, run count, and date. Lighthouse does not measure field INP; do not relabel TBT or a scripted interaction as INP. If no field data exists, report `Field performance: Unknown` and use lab findings to target above-fold media, client JavaScript, late fonts/media, scroll listeners, layout work, and 3D/canvas cost.

## Mobile

Recompose content order; preserve image focal points; keep primary action visible; prevent horizontal overflow; avoid fixed UI covering content; keep practical tap targets around 44px; convert hover effects to explicit touch actions.

## Creative Jury

Use an Awwwards-oriented critique model as a subjective design instrument, not as a certification or objective pass/fail test:

| Dimension | Weight | Questions |
|---|---:|---|
| Design | 40% | Are composition, typography, color, assets, hierarchy, rhythm, and responsive craft coherent and authored? |
| Usability | 30% | Is the page understandable, navigable, legible, and efficient across relevant devices and states? |
| Creativity | 20% | Is the concept specific to the subject, with a justified signature move instead of novelty for its own sake? |
| Content | 10% | Are message, proof, voice, media, and next action concrete, credible, and well edited? |

Score each dimension 1-5, show the weighted result, and attach concise rationale plus repair targets. A score below 4 in any dimension is a creative fix target, but it does not replace binary shipping gates. Do not claim an official award score, jury consensus, or objective quality.

## First Viewport Gate

Fail when the first screen does not make the page job understandable, hides the primary action path, clips key content, uses a decorative media carrier where proof is required, or relies on scroll theatre before value is clear.

## Conversion / Trust Gate

Fail when the page lacks a concrete outcome, source-aware proof, clear next action, or risk reducer near friction. Do not invent metrics, logos, awards, or customer proof.

## Reduced-Motion Gate

Fail when reduced-motion leaves hidden content, frozen pre-reveal elements, blank pinned scenes, inaccessible canvas, or no static alternative for essential motion.

## Motion / 3D

Motion must clarify state, hierarchy, or progression. Prefer transform/opacity, stable dimensions, reduced-motion final visibility, no blank pinned states, no scroll hijack. 3D needs one clear scene purpose, lazy load, static fallback, mobile fallback, and no unreadable text inside fragile canvas states.

## Evidence IDs

Browser control and screenshots require authorization from the user or host/project policy; a `/playwright` or `/verify` parameter is not permission by itself. Ask first for authenticated, private, paid, admin, client-confidential, or destructive surfaces. When authorized, visual/runtime claims should reference screenshot, viewport, console, trace, or check IDs. Without evidence, label the claim `Needs Browser Verification`.

## Evidence Confidence Tiers

- High: authorized browser evidence, code evidence, provided source material, field telemetry, or a recognized standard directly supports the claim.
- Medium: strong expert inference from available UI/code but not independently verified.
- Low: plausible hypothesis requiring research, user confirmation, browser capture, or asset input.
