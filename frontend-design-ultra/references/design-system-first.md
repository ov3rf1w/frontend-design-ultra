# Design System First

Use this before new websites, major redesigns, `/brandkit`, `/tailwind`, `/premium`, `/awwward`, `/implement`, and any task with no existing design system.

## Rule

No substantial website design starts without a design system. If none is provided, generate one from the page job, audience, brand signals, domain expectations, assets, and research.

## Required System

Produce:

- Brand premise: three design adjectives that change layout, type, color, motion, and assets.
- Typography package: display, body, support/mono/numeric if needed, scale, line-height, tracking, clamp bounds, fallback.
- Color system: canvas, surface, raised, muted, text, accent, action, focus, state colors, dark/light behavior.
- Surface model: flat, layered, editorial panels, proof boards, object stages, cards, full-bleed media.
- Grid/container system: shell widths, copy measures, stage widths, full-bleed behavior, viewport bands.
- Spacing rhythm: mobile/desktop section spacing, component spacing, density rules.
- Shape/elevation: radius scale, stroke language, shadow/elevation, image corners.
- Component primitives: button, input, nav, card, modal, tabs, table, proof block, pricing/product/dashboard variants.
- Motion scale: micro, small, medium, signature; easing family; reduced-motion equivalents.
- Asset language: subject, crop, lighting, proof value, generated/real/fallback policy.
- Accessibility/performance constraints: contrast, focus, keyboard, media/font budgets, CLS prevention.

## Adoption Contract

For every design-system change, document:

- token diff
- impacted components/routes
- migration notes
- accessibility effect
- performance effect
- before/after evidence needed

Always satisfy needs with existing primitives before creating new patterns. New primitives need a reason, state contract, token mapping, and usage guidance.

## Self-Generated System Workflow

When the user provides no brandkit:

1. Infer domain and trust level.
2. Choose a website type playbook.
3. Pick one primary strategy lane.
4. Generate 2-3 possible visual directions.
5. Select the strongest direction and explain why.
6. Lock one token contract.
7. Define forbidden defaults.
8. Create a UI spec before implementation.

## No Default Identity Gate

Fail premium design if:

- typography is default without reason
- palette is generic blue/purple gradient without brand logic
- components use unstated radius/elevation/shadow
- cards become the whole composition
- surface rhythm is one flat background
- motion has no scale or reduced-motion equivalent
- component states are missing
- localization/content length is untested for reusable components
- no keyboard or fallback behavior is defined for custom controls

## Design System Output Contract

Use this shape:

```yaml
design_system:
  premise:
  typography:
  color:
  surfaces:
  grid:
  spacing:
  shape_elevation:
  components:
  motion:
  assets:
  accessibility:
  performance:
  forbidden_defaults:
```
