# Component State Library

Use for `/implement`, `/dashboard`, `/saas`, `/ecommerce`, `/accessibility`, forms, shared UI, and final polish.

Treat component states as mandatory spec dimensions. If a component is interactive or shared, document states, keyboard behavior, ARIA/semantic expectations, responsive behavior, motion, and token usage before calling it done.

## Surface Policy

Cards exist for repeated objects, selected proof, tools, modals, product entries, pricing options, and dashboard widgets. Do not wrap an entire section in a card because the composition is unresolved.

## Button

- States: default, hover, focus, active, disabled, loading.
- Keyboard: Enter/Space activates when native button.
- A11y: visible focus, disabled semantics, loading text or `aria-busy`.
- Polish: icon and label align; one primary action per section.

## Input / Form Field

- States: empty, filled, focus, disabled, invalid, success, loading.
- A11y: label above input, helper/error associated, no placeholder-as-label.
- Mobile: correct input type and autocomplete.

## Navigation

- States: current, hover, focus, open, collapsed, scrolled.
- A11y: landmarks, skip link, keyboard reachable menu.
- Mobile: no content-covering drawer without close path.

## Card

- States: rest, hover, focus, selected, loading, empty.
- A11y: if clickable, whole card has one clear action; avoid nested interactive traps.
- Polish: card exists for repeated object, not whole page section.
- States must not create nested interactive traps; one object gets one primary action.

## Modal / Dialog

- States: opening, open, closing, error/loading if form-based.
- A11y: focus trap, Escape close, restore focus, labelled title.
- Motion: short enter/exit; reduced-motion instant but visible.

## Tabs

- States: active, inactive, focus, disabled.
- Keyboard: arrow navigation or native tab order intentionally chosen.
- A11y: tablist/tab/tabpanel relationships.

## Table / Data Grid

- States: loading, empty, filtered, sorted, selected, error.
- A11y: headers, captions when useful, keyboard path for row actions.
- Density: overview compact; detail expanded; critical alerts sticky.

## Pricing Card

- States: featured, current plan, disabled/unavailable, loading price.
- Conversion: price, billing period, primary CTA, risk reducer visible.
- Avoid fake scarcity or unverified savings.

## Product Card

- States: default, hover, quick view, selected variant, out of stock, loading image.
- E-commerce: image, name, price, variant cue, trust/shipping clue where needed.

## Dashboard Widget

- States: loading, empty, stale, error, filtered, expanded.
- A11y: title, value, trend meaning not color-only.
- Motion: data changes should preserve orientation, not flash randomly.
