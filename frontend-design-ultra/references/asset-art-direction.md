# Asset And Art Direction

Premium websites need visual source material. Text plus gradients is rarely enough.

## Asset Role Map

Assign every asset one role:

- Hero: first impression and positioning.
- Proof: product, place, team, work, result, metric, customer, process.
- Instruction: explains a flow or feature.
- Atmosphere: supports tone without replacing proof.
- Identity: logo, mark, pattern, brand texture.
- Interface: real screenshot, real component, or generated but coherent product state.

Delete assets with no role. Do not use atmosphere where proof is required.

## Image-First Pipeline

When visual quality matters and image generation or real assets are available:

1. Generate or gather one clear visual per important section, not one unreadable mega-board.
2. Keep text and controls large enough to inspect.
3. Analyze type scale, grid, spacing, surface, imagery, color, button treatment, motion implications.
4. Extract a design system from the visual reference.
5. Implement against the extracted system.
6. Verify browser output against the reference mechanics, not vague taste memory.

## Section Image Count

- 1 section -> 1 strong image.
- 2-4 sections -> one image per section.
- 5+ sections -> group only if detail remains readable; otherwise generate detail images.

Never shrink a whole site into a tiny collage if typography, spacing, buttons, and media crops become unreadable.

## Product And Proof Rules

- Hero needs a real visual unless the concept is intentionally typographic.
- Logo walls should use real SVG logos or credible custom marks, not plain text names.
- Fake product screenshots made from placeholder rectangles are a tell. Use a real screenshot, generated product state, actual mini-component, or omit the preview.
- If assets are missing, mark the required placements and ask/generate them instead of filling with decorative UI.

## Brandkit Mode

For `/brandkit`, produce:

- visual language: 3 adjectives that affect layout, color, type, motion
- palette: base, surface, text, accent, state colors
- type roles: display, body, mono/numeric if needed
- shape language: radius, stroke, shadow/elevation
- image language: subject, crop, lighting, texture
- motion language: restraint/polish/experiment weighting
- forbidden defaults: colors, fonts, patterns, or components to avoid

