# Implementation Recipes

Use this for `/implement`, `/premium`, `/awwward`, `/responsive`, `/dashboard`, `/ecommerce`, `/gsap`, and `/framer`.

## Responsive Hero

Contract:

- first viewport answers page job, proof/action, and brand tone
- compact laptop fits without global shrink
- wide monitor expands stage/background, not copy measure
- mobile gets recomposed content order

Structure:

- hero shell
- content rail
- media/proof stage
- CTA/trust row
- responsive type clamps
- safe bottom zone

## Editorial Split

Use for premium content/proof sections:

- 12-column grid
- narrative rail
- proof/media rail
- controlled full-bleed option
- mobile order: statement -> proof -> action -> detail

## Full-Bleed Media

Rules:

- image/video reaches viewport edge intentionally
- text remains in capped readable rail
- crop/focal point defined per viewport
- poster/fallback and dimensions prevent CLS

## Sticky Chapter

Rules:

- desktop sticky index or panel
- immediate readable content
- mobile stack/accordion
- reduced-motion compact no-pin layout
- active state and skip/jump path

## Cursor-Follow Preview

Rules:

- fine pointer only
- transform/opacity only
- throttled pointer updates
- preloaded lightweight preview assets
- touch fallback panel

## Product Object Stage

Rules:

- one default state visible
- state changes via tabs/segmented controls
- proof/spec rail nearby
- sticky CTA only when it does not cover content

## Dashboard Density Layout

Rules:

- command area first
- primary metric/decision zone
- secondary context below
- density tokens for spacing/type/table row height
- empty/loading/stale/error states

## Pricing / Proof Board

Rules:

- one recommended path
- transparent price/risk reducers
- source-aware proof
- no fake scarcity or fake savings
- mobile keeps CTA and comparison readable

## Immersive Footer

Rules:

- final brand statement
- primary CTA
- navigation clusters
- contact/legal/social
- motion subtle and non-blocking

## Mobile Recomposition

Rules:

- hero statement -> action -> proof -> detail
- no desktop pinning
- fixed controls avoid content overlap
- tap targets around 44px
- media focal point preserved

