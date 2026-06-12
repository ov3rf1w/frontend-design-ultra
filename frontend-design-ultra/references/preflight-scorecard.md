# Preflight Scorecard

Run before saying a substantial UI is done.

## Blocking Checks

- Design operating sequence completed: page job, audience intent, conversion/trust spine, asset reality, strategy lane, signature move, token contract, mobile plan, verification plan.
- Hero fits first viewport; CTA visible without accidental scroll.
- First viewport shows the page job, proof/action path, and no clipped key content.
- Compact laptop, standard desktop, wide monitor, mobile, and reduced-motion/no-pin compositions are intentional.
- Wide monitor does not stretch text, leave dead centered content, or lose media focal point.
- Adjacent route diversity checked: lane, hero, palette, surface rhythm, and motion are not repeated without reason.
- Nav fits one line on desktop or has intentional collapse.
- H1 is one per page and hierarchy is valid.
- Text contrast passes; button labels are readable.
- Forms have labels above inputs, helper/error text, focus rings, validation states.
- Loading, empty, error, disabled, hover, focus, active states exist where relevant.
- No placeholder-as-label.
- No horizontal overflow on mobile.
- Reduced-motion users see complete final states.
- Reduced-motion/no-pin fallback is compact and filled, not a stack of mostly empty full-viewport blocks.
- Images reserve space; no CLS from media/fonts.
- Metadata/social image/404/back path/footer/legal exist when relevant.
- Browser evidence exists for URL/local-app claims when authorized.
- Public output contains no private paths, confidential identifiers, copied-source claims, or unverifiable proof claims.

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

For first impression, specificity, typography, mobile craft, conversion clarity, accessibility, correctness, and performance, any score below 4 blocks completion.

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
