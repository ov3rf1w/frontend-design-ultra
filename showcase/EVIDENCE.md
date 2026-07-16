# Showcase Browser Evidence

Status: curated original reference suite; not a benchmark result.

On 2026-07-16, the production static export was exercised with Playwright-core
1.61.1 and Chromium 149 at 1440×900 and 393×852. Each of the six routes was
checked in desktop and touch-enabled mobile contexts, captured in its settled
state, sampled at 25%, 50%, 75%, and 100% scroll progress, and captured as a
full page. Separate reduced-motion, no-JavaScript, and interaction profiles
completed the audit.

The final pass found:

- no page, console, or failed-request errors;
- no horizontal overflow on either viewport;
- one `main` and one `h1` per route;
- no duplicate IDs or hidden settled sections;
- no running animation after the reduced-motion settle point;
- no visible interactive target with either dimension below 24 CSS pixels;
- working local form, eligibility, workflow, tab, and configurator state changes;
- focus transferred to each local form's success heading;
- 21 declared normal-text token pairs above 4.5:1, with a measured minimum of
  4.73:1.

The browser contract is executable:

```bash
npm run showcase:audit
```

It starts the static export on an ephemeral loopback port, launches the pinned
Playwright Chromium, and checks every route in desktop, real touch/mobile,
reduced-motion, no-JavaScript, and interaction profiles. Its private report and
screenshots stay below `output/playwright/showcase-audit/`.

Raw scroll-slice, full-page, and mobile captures stay in the gitignored local
evidence directory. The repository publishes one settled desktop render for
each original route and one Hospitality entrance storyboard, plus a SHA-256
manifest in `docs/assets/showcase/manifest.json`.

The compact public gallery and Hospitality-only entrance storyboard at target
times 0, 300, 900, and 1800 milliseconds are regenerated only after a
zero-issue audit:

```bash
npm run showcase:capture-gallery
```

These checks establish the observed state of this build in the declared local
environment. They are not an accessibility conformance certificate, field
performance data, a blind preference result, an Awwwards score, or proof of
customer outcomes.
