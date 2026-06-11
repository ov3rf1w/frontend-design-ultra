# Tools And Workflow

## Lifecycle

Default sequence: analyse -> design -> implement -> verify -> polish only when useful. Shortcut modes run only their needed slice; do not duplicate checks.

## Playwright / Browser

Use for authorized URL/local-app evidence. Capture desktop and mobile, tablet when useful, console/runtime issues, overflow, key interactions, responsive defects, accessibility smoke, and before/after after implementation. If private/authenticated/confidential, ask first.

## Design System / Tailwind

Use existing project system first. Add or refine only behavior-changing primitives:

- semantic tokens for surface, text, accent, action, state, elevation, motion
- type roles and scale
- component states: rest, hover, focus, active, disabled, loading, error, empty
- stable dimensions for boards, toolbars, counters, cards, tiles

For Tailwind, adapt to the local version and keep utilities tied to semantic tokens.

## Figma

Figma is optional and future-ready. If tooling exists, inspect frames/variables/components. If not, use provided screenshot, frame URL, exported tokens, states, and assets. Convert fixed frames into responsive implementation; never trade accessibility or performance for pixel mimicry.

## Implementation

Keep file scope minimal, follow local framework and components, implement gates during the change, and verify the changed surfaces only unless risk demands broader capture.

