# Image Generation And Reference Implementation Protocol

Use for `/imagegen`, `/image-to-code`, `/reference`, section comps, mobile screen comps, generator handoff, or visual implementation from screenshots.

## Contents

- Core Rule
- Web Section Contract
- Composition Anchors
- Background Modes
- Mobile Visual Contract
- Image-To-Code Translation
- Generator Handoff Contract
- Anti-Drift Acceptance

## Core Rule

Generate or request visuals at a resolution and scope that can be inspected. One major section or screen usually needs one dedicated visual. Do not use a tiny full-page collage as the source of truth for typography, spacing, buttons, or media crops.

## Web Section Contract

For web pages:

- 1 section -> 1 horizontal section image.
- 2-4 sections -> one horizontal image per section.
- 5-8 sections -> one image per section unless simple content can be grouped without losing readability.
- 9+ sections -> group only low-detail utility sections; generate dedicated images for hero, proof, pricing, product, conversion, and footer.

Each section visual must include:

- section label and job
- composition anchor
- background mode
- typography role
- primary action or proof
- mobile implication
- performance/accessibility risk

## Composition Anchors

Vary anchors across the page:

- centered type stage
- off-grid editorial frame
- product/object stage
- image-as-canvas
- proof board
- split with unequal weight
- stacked chapter
- interactive index
- dense command panel
- immersive footer

Avoid repeated left-copy/right-media sections unless the product requires consistency.

## Background Modes

Choose a mode per section and keep page-level coherence:

- solid/tinted surface
- editorial paper or texture
- full-bleed media
- side media
- product interface surface
- layered card stage
- dark theatre
- data grid or rule-line system

Do not combine every mode on one page. Variation needs hierarchy.

## Mobile Visual Contract

For mobile generation or mobile-first UI:

- Choose platform mode: iOS-native, Android-native, cross-platform app, responsive web, or marketing mobile.
- Respect safe areas, browser chrome, tap targets, bottom bars, and keyboard states.
- Use vertical screen visuals; do not crop desktop comps into mobile.
- Show screen sequence when task flow matters: onboarding, auth, cart, checkout, dashboard, settings, error recovery.
- Keep text legible and controls reachable; avoid website-like layouts for native app screens.

## Image-To-Code Translation

Implement visual references in this order:

1. Extract Design DNA.
2. Extract text and content hierarchy.
3. Extract layout grid, section rhythm, spacing, and viewport fit.
4. Extract typography roles and token scale.
5. Extract palette, surfaces, radius, stroke, elevation, and image treatment.
6. Extract components and states.
7. Extract motion vocabulary and reduced-motion final state.
8. Implement using the extracted system.
9. Verify browser output against the mechanics list.

If a detail is unclear, regenerate a focused visual or mark uncertainty. Do not invent template defaults to fill ambiguity.

## Generator Handoff Contract

When handing a design to another model or generation system, output a semantic spec:

```yaml
visual_handoff:
  page_job:
  brand_dna:
  style_preset:
  section_images:
    count:
    orientation:
    labels:
  section_grammar:
    - section:
      job:
      anchor:
      background_mode:
      type_role:
      asset_role:
      interaction:
      mobile_fallback:
  anti_patterns:
  accessibility_gates:
  performance_gates:
  implementation_acceptance:
```

## Anti-Drift Acceptance

Fail or revise if:

- generated visuals do not match the requested section count
- typography is too small to inspect
- all sections share the same anchor/background pattern
- implementation collapses back to generic cards/centered hero/default palette
- mobile is squeezed desktop instead of recomposed
- fake proof appears
- motion, 3D, media, or image weight breaks hard gates
