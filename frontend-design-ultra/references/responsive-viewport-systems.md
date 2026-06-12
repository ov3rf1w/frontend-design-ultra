# Responsive Viewport Systems

Use this for `/responsive`, `/mobile`, hero/first-viewport work, premium landing pages, wide desktop QA, laptop polish, sticky/pinned sections, and any layout where the design must feel excellent on both compact laptops and large monitors.

## Principle

Responsive design is not a set of breakpoints. It is a set of authored compositions across real viewport bands.

Do not solve a bad laptop screenshot by globally shrinking the whole site. Preserve premium scale by fixing the viewport contract: chrome, height model, clamp limits, line breaks, grid ratios, media crop, CTA safe zone, and scroll-trigger timing.

## Viewport Bands

Design and verify at these bands:

| Band | Typical viewport | Main risk | Required response |
|---|---:|---|---|
| Short laptop | 1366x768 or 1440x800 | hero text/CTA clipped, scroll hint hidden, pinned scenes too tall | tighter vertical rhythm, lower clamp max, shorter copy, explicit safe zones |
| Standard desktop | 1440x900 | primary design baseline | full composition with intended hierarchy |
| Wide desktop | 1920x1080 or 2048x930 | stretched lines, tiny centered content, empty dead zones | max-width caps, stage scaling, asymmetry, authored negative space |
| Ultra-wide | 2560+ when relevant | composition floats without edges | cap content, expand background/stage only, keep focal area readable |
| Mobile browser | 393x852 and shortest realistic height | browser chrome, safe-area, fixed UI overlap, squeezed desktop | recompose order, reduce motion, preserve focal points |
| Reduced motion / no pin | same viewports | fallback taller/emptier than animated section | compact content stack, no full-viewport item piles |

## First-Viewport Contract

Before styling a hero, define:

- visible chrome: nav, announcement bars, demo bars, browser safe area
- height model: `h-[100svh]` when exact first-frame fit is required; `min-h-[100svh]` only when content may legitimately exceed the fold
- reserved top space: `calc(100svh - var(--chrome-top))` when chrome participates
- bottom safe zone: CTA, scroll hint, and sticky card overlap area
- type bounds: `clamp()` min/preferred/max tested against the shortest laptop viewport
- line breaks: planned display wraps, not accidental viewport-width wraps
- media crop: object-position per band, not one crop for all screens
- interaction start: pinned/scroll scenes start after readable content is visible

## Laptop-Fit Techniques

- Reduce vertical stack count before reducing brand scale.
- Shorten first-viewport copy before shrinking every element.
- Use narrower line-height and planned line breaks for display type.
- Bottom-anchor giant display type only when the full block, CTA, trust, and scroll hint remain visible.
- Put trust/action in a compact foot or side rail instead of adding another row below the hero.
- For index heroes, use `flex: 1 0 auto` on rows that must fill evenly; avoid `min-height: 0` plus shrink collapse.
- Verify with element bounds: key CTA/card/headline bottom must be inside viewport minus safe zone.

## Wide-Monitor Techniques

- Cap text measure and content shell; let background, stage, image, or spatial object expand.
- Scale the stage, not the paragraphs.
- Use asymmetric grid spans so wide screens gain composition, not just margins.
- Keep media crops intentional: wide monitors can reveal more atmosphere, but the subject must remain dominant.
- Avoid centered narrow columns floating in large empty screens unless the emptiness is the concept.
- Add controlled secondary anchors on wide screens: proof foot, side index, rail label, object shadow, or background field.
- Use container queries when component width matters more than viewport width.

## Pinned / Scroll Section Responsiveness

Pinned sections need separate desktop, mobile, and reduced-motion designs:

- Desktop pin: use viewport-relative outer height intentionally, for example `N * 82vh`, and keep immediate readable content.
- Laptop pin: test short height; reduce chapter count visible at once, tighten internal padding, and avoid blank starts.
- Mobile: replace pin/scrub with stacked cards, stepper, accordion, or horizontal-safe index.
- Reduced motion: render a compact filled stack. Never fallback to one `min-h:100svh` block per item.
- Offscreen/hidden states must resolve to visible final states when motion is reduced or JavaScript is slow.

## Container And Grid Rules

- Content max width is a design token, not a random `max-w`.
- Use separate caps for copy, content shell, media stage, and full-bleed backgrounds.
- Full-bleed means the visual reaches the viewport edge; do not trap edge-to-edge images inside a centered container.
- Prefer CSS Grid for 12-column editorial layouts and staged hero compositions.
- Use container queries for cards/widgets whose layout depends on parent width.

## Verification Matrix

For premium work, capture or inspect:

- 1366x768 or 1440x800 first viewport
- 1440x900 first viewport and key slices
- 1920x1080 or 2048x930 first viewport
- 393x852 mobile first viewport and slices
- reduced-motion version of any animated/pinned route
- full-page overview for rhythm after hero/slice checks

Fail if:

- key CTA, headline, card, or trust proof is clipped in laptop viewport
- wide monitor creates stretched line length or dead centered content
- mobile uses desktop pinning or fixed controls covering content
- reduced-motion/no-pin section becomes much taller while mostly empty
- full-page overview looks fine but isolated first viewport is weak

## Implementation Checklist

- Define viewport bands in the UI spec.
- Include clamp min/max for display and section type.
- Define content shell, copy measure, media stage, and full-bleed caps.
- Define media object-position per band when crop matters.
- Define mobile order and first visible action.
- Define no-pin/reduced-motion layout.
- Verify element bounds for hero CTA/headline/trust on laptop.
- Verify wide monitor composition by eye, not only CSS breakpoints.

