# Playwright Recipes

Use when `/playwright`, `/verify`, `/analyse URL`, or browser evidence is requested.

## Evidence Script Shape

```ts
import { chromium, devices } from "playwright";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 393, height: 852 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("requestfailed", req => failed.push(`${req.method()} ${req.url()}`));
  await page.goto(process.argv[2], { waitUntil: "networkidle" });
  await page.screenshot({ path: `evidence-${vp.name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
```

## Checks

- screenshot: desktop, mobile, tablet if responsive risk exists
- console errors
- failed requests
- overflow: compare `scrollWidth` vs `clientWidth`
- clipped text: inspect key headings/buttons
- interactions: nav, primary CTA, forms, menus, modals
- focus: tab through visible controls
- before/after: same route, viewport, and state

## Accessibility Smoke

If `@axe-core/playwright` is available, run axe on the route and report violations by impact. Do not hide known issues without naming the disabled rule and rationale.

## Trace

Use traces for unclear runtime defects, flaky interactions, or multi-step flows. Keep user-facing output concise: evidence id, viewport, issue, impact, fix.

