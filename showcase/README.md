# Frontend Design Ultra — Curated Multi-Industry Showcase

This is an executable, original reference suite for six explicitly coded,
non-commercial calibration identities. It is a curated showcase, not a blind
benchmark result and not evidence that one skill outperforms another.

## Routes

| Route | Calibration identity | Art direction | Signature mechanic | Trust spine |
|---|---|---|---|---|
| `/hospitality/` | Alpine House H-01 | Typographic alpine field guide | Contour-stage vertical drift | seasons, stay terms, dining, arrival |
| `/legal/` | Litigation Office L-02 | Procedural case-file grid | Docket rules assemble on entry | scope, conflicts, review, response |
| `/finance/` | Investment Fixture F-03 | Restrained data/proof atlas | Risk bars resolve from one baseline | fees, method, data source, risk |
| `/healthcare/` | Heart Clinic H-04 | Human care-path editorial | Care nodes sequence by journey | scope, preparation, access, emergency boundary |
| `/saas/` | Operations Workspace S-05 | Operational interface stage | Workflow path activates by state | roles, history, deployment, sandbox |
| `/ecommerce/` | Pendant Fixture E-06 | Material object showroom | Configurator changes one drawn object | dimensions, price, lead time, returns, repair |

The suite shares semantic tokens, accessibility primitives, shell components,
and a restrained GSAP lifecycle. Palette, typography, composition, section
rhythm, hero job, motion signature, and mobile order vary by subject.

## Stack

- Next.js App Router with static export
- React and TypeScript
- Tailwind CSS v4 CSS-first tokens
- GSAP, ScrollTrigger, and `@gsap/react`
- original inline SVG and CSS visuals only

Dependency versions were checked against the npm registry on 2026-07-15 and are
exactly pinned in `package.json` and the generated lockfile. ESLint 9 and
TypeScript 6 intentionally stay inside the peer-support range of the current
Next.js lint toolchain rather than selecting incompatible newer majors.
The lockfile also overrides Next.js's older nested PostCSS 8 release to the
audited `8.5.19` patch without crossing a major-version boundary.

## Local Use

Node 24 or newer is the declared runtime.

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run validate:export
npm run preview
```

`next build` writes the static site to `out/`.

## Evidence Boundary

- Every coded identity, person, number, service, product, and interface state is benchmark-authored fixture material.
- The route labels are calibration identifiers, not proposed commercial brands;
  no trademark availability or registrability claim is made.
- No customer work, Awwwards capture, stock image, external logo, remote font, or
  third-party website asset is included.
- The visuals were composed for this suite from inline SVG, CSS, and fixture data.
- Forms and eligibility/configuration tools demonstrate interaction contracts;
  they do not transmit data or provide legal, financial, or medical services.
- Visual/browser evidence is not claimed by this README. Build, lint, and
  typecheck results must be reported from the actual environment.

See [PROVENANCE.md](PROVENANCE.md) for the source and rights ledger.
