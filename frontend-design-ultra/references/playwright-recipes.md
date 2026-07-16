# Playwright Recipes

Use when `/playwright`, `/verify`, `/analyse URL`, or browser evidence is requested and browser control is authorized by the user or host/project policy. A slash parameter is a request for evidence, not permission to capture it. Ask first for authenticated, private, paid, admin, client-confidential, or destructive surfaces.

## Contents

- Authorization And Harness
- Evidence Script Shape
- Checks
- Closed Verification Loop
- Evidence Naming
- Production Preference
- Performance Evidence
- Accessibility Smoke
- Trace

## Authorization And Harness

- Prefer the project's installed Playwright package, configuration, web server, storage-state policy, and evidence directory; do not add a browser dependency blindly.
- Confirm target routes, allowed interactions, data-safety constraints, and whether screenshots may contain client or personal information.
- Use supplied screenshots when capture is not authorized. Mark browser-dependent conclusions `Needs Browser Verification`.
- Treat the environment flag in the sample as a local execution guard only; the actual authorization must already exist in the task or host/project policy.

## Evidence Script Shape

```js
import { chromium } from "playwright";

const target = process.argv[2];
if (!target) throw new Error("Usage: node evidence.mjs <url>");
if (process.env.UI_EVIDENCE_AUTHORIZED !== "1") {
  throw new Error("Browser evidence is not authorized for this run");
}

const profiles = [
  { name: "laptop", width: 1366, height: 768, reducedMotion: "no-preference" },
  { name: "desktop", width: 1440, height: 900, reducedMotion: "no-preference" },
  { name: "wide", width: 1920, height: 1080, reducedMotion: "no-preference" },
  { name: "mobile", width: 393, height: 852, reducedMotion: "no-preference" },
  { name: "mobile-reduce", width: 393, height: 852, reducedMotion: "reduce" },
];

const report = [];
const browser = await chromium.launch();

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      reducedMotion: profile.reducedMotion,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => {
      failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText}`);
    });

    const response = await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const keyElements = [...document.querySelectorAll("[data-evidence-key]")].map(element => {
        const rect = element.getBoundingClientRect();
        return {
          key: element.dataset.evidenceKey,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          visible: rect.width > 0 && rect.height > 0,
        };
      });
      return {
        horizontalOverflow: root.scrollWidth > root.clientWidth,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        keyElements,
      };
    });

    await page.screenshot({ path: `evidence-${profile.name}-first.png`, fullPage: false });
    await page.screenshot({ path: `evidence-${profile.name}-full.png`, fullPage: true });
    report.push({
      id: `route-after-${profile.name}-v1`,
      status: response?.status(),
      url: page.url(),
      consoleErrors,
      pageErrors,
      failedRequests,
      layout,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
```

Do not use `networkidle` as a universal readiness signal; analytics, streaming, and long-lived requests can make it flaky. Prefer app-specific ready markers plus font readiness and stable element assertions. Keep the no-JavaScript/default render readable so a missed animation trigger cannot hide content.

## Checks

- authorized screenshots: compact laptop, standard desktop, wide desktop, mobile, and tablet when responsive risk exists
- hero-only first viewport plus detailed slices; full-page evidence checks rhythm/footer continuity, not first-viewport fit
- console errors, uncaught page errors, failed requests, bad response status, hydration warnings
- overflow: fail when `document.documentElement.scrollWidth > document.documentElement.clientWidth`
- key bounds: CTA, hero headline, trust proof, and first content carrier stay inside the relevant safe area
- interactions: navigation, primary CTA, forms, menus, dialogs, and destructive paths only within authorization
- keyboard and visible focus path through operable controls
- reduced-motion route with complete final states and no blank pin/reveal
- before/after at the same route, state, viewport, content, browser profile, and evidence version

## Closed Verification Loop

Use build -> inspect/capture -> compare -> patch -> recheck. Compare evidence with the UI spec, first-viewport contract, responsive contract, binary shipping gates, and Creative Jury; patch root causes rather than screenshot-specific offsets. Repeat only the affected profiles after a local fix, then run the full relevant matrix before shipping.

## Evidence Naming

Use deterministic evidence IDs: `route-state-viewport-vN`, for example `home-after-mobile-v2`, `services-before-desktop-full-v1`, or `contact-reduced-motion-mobile-v1`. Keep private paths, tokens, client data, and confidential screenshots out of public reports.

## Production Preference

Prefer a production build served through the project's supported preview command. Dev screenshots can hide build, font, static-export, caching, and hydration defects. Record commit/build identity when available.

## Performance Evidence

Label field/RUM and lab evidence separately. Field evidence names source, population, date range, percentile, and device segment. Lab evidence names tool/version, date, route, viewport/device, network/CPU profile, cache state, and run count. A Lighthouse/TBT result is not field INP; report field metrics as unknown when no field source exists.

## Accessibility Smoke

If `@axe-core/playwright` is already available, run axe on the route and report violations by impact. Automated checks do not replace keyboard, focus, semantics, zoom/reflow, content, or assistive-technology review. Name every disabled rule and rationale.

## Trace

Use traces for unclear runtime defects, flaky interactions, or authorized multi-step flows. Keep user-facing output concise: evidence ID, route/state, viewport, issue, impact, fix, and confidence.
