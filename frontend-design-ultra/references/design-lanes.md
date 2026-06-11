# Design Lanes

## Taste Dials

Set before design or polish:

| Dial | Low | Mid | High |
|---|---|---|---|
| Variance | centered, calm, predictable | asymmetry in key sections | editorial, spatial, experimental |
| Motion | state feedback only | reveals and local transitions | scroll story, staged scenes, 3D |
| Density | spacious marketing | balanced product/marketing | dashboard/data-rich |

Defaults: landing = mid/mid/mid; dashboard and SaaS = low-mid/low/high; e-commerce = mid/low-mid/mid; portfolio or campaign = high/mid-high/low-mid.

## Strategy Lanes

Choose one primary lane; blend at most two.

- Editorial Premium: large type, strong imagery, restrained chrome.
- Product Proof: product/state visible first, feature evidence, clear action.
- Data Confidence: dense hierarchy, tables/charts, calm surfaces, strong semantics.
- Conversion Trust: outcome, proof, CTA, risk reducers in first scroll.
- Experimental Showcase: one memorable mechanic, strict fallback.
- Minimal Operator: Linear/Notion-like clarity, speed, low ornament.
- Industrial/Brutalist: sharp grid, mechanical rhythm, high contrast.
- Soft Luxury: warm surfaces, generous spacing, refined type, subtle spring motion.

## Foundation Mapping

If the brief clearly matches an established product ecosystem, use its official design system before inventing local CSS:

- Enterprise/Microsoft-style -> Fluent-style components/tokens.
- Material/Google-style -> Material-style components/tokens.
- IBM/analytics -> Carbon-style density and data patterns.
- Shopify admin -> Polaris-style patterns.
- Atlassian/Jira-style -> Atlassian-style tokens and interaction conventions.
- GitHub/devtool -> Primer-style conventions.
- Public-sector/trust service -> government-style system, conservative motion, high accessibility.
- Owned modern SaaS -> Tailwind + headless primitives/shadcn-style components, but restyled beyond defaults.

Use one system per project. Do not mix design systems unless the existing codebase already does and the task is cleanup.

## Page Archetypes

- Landing: first viewport = outcome + proof + action; second viewport proves mechanism.
- Portfolio/studio: first viewport = name + signature craft + one memorable motion/layout device.
- SaaS dashboard: command area, decision zone, secondary context; dense but calm.
- E-commerce PDP: product media, price, variant, shipping/returns, CTA in one scan band.
- Local/service business: trust proof, location/availability, direct contact path, no vague agency copy.
- Editorial: content rhythm, strong type roles, image pacing, restrained CTAs.

## Reference And Image-To-Code

For `/reference` or `/image-to-code`:

1. Gather or generate 2-3 references.
2. Extract mechanics only: layout grammar, type ratio, surface rhythm, motion idea, asset role.
3. Define lane and taste dials.
4. Implement from the extracted system, not by copying.
5. Verify browser output against the mechanics list.

## Redesign

For `/redesign`, audit first: first viewport job, hierarchy, scan path, token drift, generic patterns, mobile damage, motion/performance debt, proof/CTA gaps. Then change the fewest surfaces that materially improve strategy, gates, and conversion.

Fix priority: font/system mismatch, palette drift, interaction states, layout/spacing, generic components, missing states, final typography/spacing polish.

