# Parameter Reference

## Modes

| Parameter | Meaning |
|---|---|
| `/analyse` | Audit existing UI and produce evidence-backed findings. |
| `/design` | Create direction before implementation. |
| `/polish` | Improve existing UI quality and detail. |
| `/implement` | Perform authorized code changes and verify the result; do not stop at a plan. |
| `/verify` | Decide Pass, Fail, or Needs Review. |

Precedence: `/verify` > `/implement` > `/polish` > `/design` > `/analyse`.

## Domains

| Parameter | Meaning |
|---|---|
| `/new-site` | New client/site workflow: intake, three directions, chosen contract, implementation handoff. |
| `/landing` | Marketing landing page. |
| `/dashboard` | Dashboard/admin/product UI. |
| `/saas` | SaaS app/site workflow. |
| `/ecommerce` | PDP, PLP, cart, checkout, store UI. |
| `/mobile` | Responsive/mobile-first check. |
| `/showroom` | Case/portfolio/result route with work-first proof. |
| `/services` | Offer/service index route with choice clarity. |
| `/about` | Trust/capability route. |
| `/contact` | Direct action/contact route. |
| `/local` | Local-service route with relevance, location, availability. |
| `/agency` | Agency/studio website playbook. |
| `/studio` | Studio/craft website playbook. |
| `/portfolio` | Portfolio/showroom website playbook. |
| `/hospitality` | Restaurant, hotel, venue, lifestyle hospitality playbook. |
| `/legal` | Legal/trust-heavy professional playbook. |
| `/finance` | Finance/trust-heavy professional playbook. |
| `/healthcare` | Healthcare/trust-heavy professional playbook. |
| `/luxury` | Luxury/premium editorial playbook. |
| `/editorial` | Editorial/magazine-like visual system. |
| `/startup` | Product launch/startup playbook. |
| `/app` | Product/app interface playbook. |

## Workflows

| Parameter | Meaning |
|---|---|
| `/redesign` | Audit-first replacement workflow. |
| `/image-to-code` | Build from screenshot/reference after extracting Design DNA. |
| `/imagegen` | Generate or plan readable web/mobile section visuals before implementation. |
| `/brandkit` | Identity, tokens, visual language, and application proof. |
| `/designplan` | Require an explicit pre-build design contract before implementation. |
| `/output-integrity` | Check completeness, provenance, placeholders, proof, and public-output safety. |

## Quality

| Parameter | Meaning |
|---|---|
| `/premium` | Stronger composition/detail bar. |
| `/awwward` | Memorable, art-directed, signature moment. |
| `/trend` | Research current visual mechanics. |
| `/research` | Source-informed research packet, reference mechanics, evidence confidence. |
| `/conversion` | CTA/proof/funnel optimization. |
| `/trust` | Proof, credibility, and risk-reducer checks near friction. |
| `/accessibility` | WCAG-oriented checks. |
| `/performance` | LCP/INP/CLS/runtime checks. |
| `/responsive` | Compact laptop, desktop, wide monitor, mobile, and reduced-motion viewport checks. |

## Tools

| Parameter | Meaning |
|---|---|
| `/playwright` | Authorized browser screenshots, temporal motion states, console, network, and interaction evidence. |
| `/figma` | Figma handoff or frame interpretation. |
| `/tailwind` | Tailwind/tokens/component system. |
| `/gsap` | GSAP/ScrollTrigger motion. |
| `/framer` | Motion/Framer transitions. |
| `/3d` | Three.js/R3F/WebGL/canvas. |
| `/reference` | Query or analyze external references as derived mechanics with provenance and rights boundaries. |
| `/stitch` | Produce a generator/implementation handoff spec from a visual system. |
| `/project-fit` | Inspect a local project and separate installed/configured stack facts from declared starter prose. |

`/playwright` requests browser evidence but is not permission to capture it. User, host, and project screenshot policies still apply. Raw third-party captures remain local unless publication rights are documented; `/reference` does not authorize copied source code, brand copy, assets, or complete trade dress.

## Intensity And Dials

| Parameter | Meaning |
|---|---|
| `/quick` | Highest-signal, short pass. |
| `/deep` | Full relevant workflow. |
| `/brutal` | Strict critique and hard gate language. |
| `/variance-low\|mid\|high` | Layout experimentation. |
| `/motion-low\|mid\|high` | Motion intensity. |
| `/density-low\|mid\|high` | Information density. |
| `/minimalist` | Minimal editorial style preset with high restraint. |
| `/brutalist` | Industrial/brutalist style preset with strict grid and contrast. |
| `/soft` | Soft premium style preset with warm surfaces and refined motion. |
| `/brandboard` | Brand-board style preset with identity-system proof. |

## Aliases

| Alias | Resolves to |
|---|---|
| `/designsystem`, `/system` | Design-system-first workflow. |
| `/motion`, `/scroll` | Motion lane. |
| `/awwwards` | `/awwward`. |
| `/starter`, `/scaffold` | `/new-site`. |
| `/stack` | `/project-fit`. |
| `/portfolio` | `/showroom` only when used as route intent; it remains a portfolio-domain selector otherwise. |
