# Typography And Color Intelligence

Use this for `/brandkit`, `/design`, `/polish`, `/premium`, `/awwward`, `/editorial`, `/luxury`, `/dashboard`, and any task where typography or color defines quality.

## Typography Decision Tree

Choose type by job:

| Brand job | Display direction | Body direction | Avoid |
|---|---|---|---|
| Editorial/luxury | refined serif, high-contrast serif, expressive variable serif | humanist or neutral sans | default SaaS grotesk only |
| Studio/portfolio | grotesk with character, condensed display, or sharp serif | readable sans | novelty font everywhere |
| SaaS/product | precise grotesk, technical sans, optional mono/numeric | highly legible sans | over-stylized body |
| Dashboard/app | neutral/product sans, numeric/mono support | compact legible sans | decorative display in data UI |
| Local/trust | warm serif or humanist sans | calm sans/serif pairing | cold startup type by default |
| Hospitality/lifestyle | expressive serif/condensed display | relaxed sans | generic geometric sans only |
| Legal/finance/healthcare | serious serif or sober sans | high-legibility sans/serif | playful novelty |

## Typography Package Rules

- Pick roles, not fonts: display, section, body, eyebrow, CTA, metadata, numeric.
- Use at most two families plus optional mono/numeric.
- Define scale with `clamp()` for display and section type.
- Body line length should usually stay around 40-65ch.
- Display line breaks are designed; do not let viewport width decide all breaks.
- Avoid default Inter/Roboto/Arial/system for premium identity unless the product ecosystem requires it.
- If using custom fonts, define fallback metrics, preload/strategy, and performance risk.
- Use weight contrast sparingly. Do not bold problem/pain words as the main emphasis.

## Color Direction Tree

Choose color by positioning:

| Position | Base | Accent | Surface rhythm |
|---|---|---|---|
| Premium calm | warm off-white or tinted charcoal | one muted decisive accent | paper, muted panels, proof boards |
| Editorial bold | strong color-block base | high-signal single accent | full-bleed media, band seams |
| Technical trust | cool neutral or deep blue/green-gray | restrained semantic accent | dense panels, line grids |
| Hospitality | warm cream, ink, terracotta/olive/gold family | food/place-derived accent | photo, color block, dark utility boards |
| Dashboard | neutral canvas with semantic states | functional accent + data palette | modules, tables, charts |
| Luxury | low-chroma neutral, deep tint, material tone | metallic/earth/jewel accent | large quiet fields |

## Color Rules

- One primary accent family per page context.
- State colors are semantic and do not become extra brand accents.
- Dominant surfaces should be tinted or material-aware; pure black/white need a reason.
- Text-on-fill tokens must be paired and contrast-checked.
- Gradients/images behind text need local contrast protection.
- Data colors need meaning, not decoration.
- Do not use generic AI purple/blue glow as a default premium cue.

## Typography / Color QA

Fail if:

- no typography roles are declared
- display and body fight for attention
- body copy is too wide or too tight
- color is decorative but not semantic
- two unrelated accent families compete
- contrast/focus fails
- large screens stretch text instead of expanding the stage
- mobile line breaks destroy meaning

