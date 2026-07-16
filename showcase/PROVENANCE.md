# Showcase Provenance

Status: curated original reference suite; not a benchmark result.

## Fixture Sources

All public-facing facts are adapted from the repository's benchmark-authored
calibration briefs. The coded identities are non-commercial fixture labels, not
proposed brands, and no trademark availability or registrability claim is made.
No fact describes a real business or offer.

| Route | Fixture |
|---|---|
| Hospitality | `benchmark/protocol/v1/briefs/calibration/cal-hospitality-house-01/` |
| Legal | `benchmark/protocol/v1/briefs/calibration/cal-legal-matter-02/` |
| Finance | `benchmark/protocol/v1/briefs/calibration/cal-finance-five-03/` |
| Healthcare | `benchmark/protocol/v1/briefs/calibration/cal-healthcare-pulse-04/` |
| SaaS | `benchmark/protocol/v1/briefs/calibration/cal-saas-work-05/` |
| E-Commerce | `benchmark/protocol/v1/briefs/calibration/cal-ecommerce-object-06/` |

## Visual Assets

- The executable showcase routes use no raster images or videos.
- Every illustration is original inline SVG authored in `components/illustrations.tsx`.
- Material, chart, contour, workflow, and care-path graphics are generated from
  local markup and CSS, not copied from a live site.
- No external logos, icons, map tiles, product screenshots, or customer media are
  included.
- The seven WebPs in `docs/assets/showcase/` are compact browser renders of
  these original local routes: one settled desktop render per route and one
  four-frame Hospitality entrance storyboard.
  `scripts/capture-showcase-gallery.mjs` creates them after the Playwright audit
  and records dimensions, storyboard timing, environment, evidence scope, and
  SHA-256 hashes in `docs/assets/showcase/manifest.json`.

## Typography

No font files or remote font requests are included. Each route uses a deliberate
system-resident font stack with fallbacks. This avoids introducing an untracked
font license or build-time network dependency; exact glyph metrics may vary by
operating system.

## Software Dependencies

Next.js, React, Tailwind CSS, GSAP, TypeScript, ESLint, Sharp, and supporting
packages retain their own upstream licenses. Their exact versions are recorded
in `package.json` and `package-lock.json`.

## Public Claims

The suite may demonstrate code structure, route diversity, static-export
compatibility, and original art direction. It must not be presented as a blind
preference result, Awwwards jury score, customer result, conversion uplift, or
accessibility conformance certificate.
