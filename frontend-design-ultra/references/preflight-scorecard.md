# Preflight Scorecard

Run before saying a substantial UI is done.

## Blocking Checks

- Hero fits first viewport; CTA visible without accidental scroll.
- Nav fits one line on desktop or has intentional collapse.
- H1 is one per page and hierarchy is valid.
- Text contrast passes; button labels are readable.
- Forms have labels above inputs, helper/error text, focus rings, validation states.
- Loading, empty, error, disabled, hover, focus, active states exist where relevant.
- No placeholder-as-label.
- No horizontal overflow on mobile.
- Reduced-motion users see complete final states.
- Images reserve space; no CLS from media/fonts.
- Metadata/social image/404/back path/footer/legal exist when relevant.
- Browser evidence exists for URL/local-app claims when authorized.

## Awwwards Scorecard

Score 1-5:

- First impression: memorable in 3 seconds.
- Specificity: cannot belong to any random startup.
- Composition: directed hierarchy and spatial rhythm.
- Typography: distinctive roles and clean breaks.
- Asset quality: proof or art direction, not filler.
- Motion: purposeful, polished, reduced-motion safe.
- Mobile craft: recomposed, not merely stacked.
- Conversion: promise, proof, action, trust.
- Implementation: fast, accessible, stable, maintainable.

Any score below 4 is a fix target.

## AI Tell Sweep

Reject by default:

- centered dark mesh hero
- AI-purple/blue glow
- three equal feature cards
- glass card over hero image
- random pills and badges
- plain text fake logo walls
- fake-perfect numbers
- generic avatars and names
- div-based fake screenshots
- decorative SVG illustrations as hero proof
- split header with left headline and right filler paragraph
- bento grid with identical white cards
- long divider-heavy spec tables
- arbitrary z-index inflation

## Done Definition

Done means visually memorable, understandable, responsive, accessible, performant, and evidenced. If one of those is missing, return `Needs Review` or `Fail` with exact fixes.

