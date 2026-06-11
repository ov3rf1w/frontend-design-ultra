# Design System Governance

Use this when `/tailwind`, `/designsystem`, `/brandkit`, theming, shared components, token extraction, or localization appears.

## Token Authority

- Canonical tokens should live in a machine-readable token source with type, description, references/aliases where useful, and version.
- Prefer semantic tokens over component literals: canvas, surface, text, border, accent, action, danger, success, focus, elevation, motion.
- Theme changes need token diff, impacted component list, and visual coverage for affected surfaces.

## Tailwind

Tailwind v4:

```css
@import "tailwindcss";

@theme {
  --color-canvas: oklch(0.98 0.01 250);
  --color-text-primary: oklch(0.18 0.03 260);
  --color-accent: oklch(0.68 0.16 35);
  --spacing-unit: 0.25rem;
}
```

Use `@theme`/CSS variables as the token bridge. Avoid app-level one-off token values.

Tailwind v3:

```js
module.exports = {
  content: ["./src/**/*.{html,js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: { 500: "#D96C2C" },
      },
    },
  },
};
```

Use `theme.extend` for additive changes. Override defaults only deliberately.

## Component Specs

Every shared component needs:

- purpose
- props/variants
- states: default, hover, focus, active, disabled, loading, error, empty where relevant
- keyboard behavior
- ARIA/semantic expectation
- responsive behavior
- examples

## Figma And Tokens

If Figma variables are available, extract local variables, resolve aliases, normalize to canonical tokens, and map them into the code token layer. Publish/update variables in Figma before expecting other files to consume them.

## Localization

For UI likely to ship across locales:

- define supported locales and fallback locale
- separate translation namespaces
- format dates/numbers/currency with `Intl`
- avoid hardcoded string widths in buttons/cards
- test longest expected words on mobile

## Adoption Gate

New shared components cannot be considered done without token mapping, component spec, keyboard/a11y notes, localization behavior when relevant, and browser evidence for at least one real usage.

