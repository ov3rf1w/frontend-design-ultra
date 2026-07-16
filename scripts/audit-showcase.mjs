#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPORT_ROOT = path.join(ROOT, "showcase", "out");
const OUTPUT_ROOT = path.join(ROOT, "output", "playwright", "showcase-audit");
const ROUTES = ["hospitality", "legal", "finance", "healthcare", "saas", "ecommerce"];
const SCROLL_PROGRESS = [0.25, 0.5, 0.75, 1];
const MIME = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function directoryDigest(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await walk(root);
  const hash = createHash("sha256");
  for (const file of files.sort((left, right) => left.localeCompare(right, "en"))) {
    hash.update(path.relative(root, file).replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function resolveStaticFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const relative = pathname === "/"
    ? "index.html"
    : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  const candidate = path.resolve(EXPORT_ROOT, relative);
  if (!isPathInside(EXPORT_ROOT, candidate)) return null;
  if (await exists(candidate) && (await stat(candidate)).isFile()) return candidate;
  const htmlCandidate = `${candidate}.html`;
  if (isPathInside(EXPORT_ROOT, htmlCandidate) && await exists(htmlCandidate) && (await stat(htmlCandidate)).isFile()) return htmlCandidate;
  return null;
}

async function startStaticServer() {
  const exportRealPath = await realpath(EXPORT_ROOT).catch(() => null);
  if (!exportRealPath) throw new Error("Missing showcase/out. Run the showcase production build first.");
  const server = createServer(async (request, response) => {
    try {
      const file = await resolveStaticFile(request.url ?? "/");
      if (!file) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": MIME.get(path.extname(file).toLowerCase()) ?? "application/octet-stream",
      });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Static server error");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine showcase audit port.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function pushIssue(issues, route, profile, code, detail) {
  issues.push({ route, profile, code, detail });
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.02
        && rect.width > 1
        && rect.height > 1;
    };
    const targets = [...document.querySelectorAll("a,button,input,select,textarea,summary,[role='button'],[role='link'],[role='tab']")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().slice(0, 90),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
      .filter(({ width, height }) => width < 24 || height < 24);
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const hiddenSections = [...document.querySelectorAll("main section")]
      .filter((section) => !visible(section))
      .map((section) => section.id || section.getAttribute("aria-labelledby") || section.className || "section")
      .slice(0, 30);
    return {
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) - innerWidth,
      mains: document.querySelectorAll("main").length,
      h1s: document.querySelectorAll("h1").length,
      sections: document.querySelectorAll("main section").length,
      duplicateIds,
      undersizedTargets: targets,
      hiddenSections,
    };
  });
}

async function settle(page, milliseconds = 1_900) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(milliseconds);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  }).catch(() => {});
}

async function captureScrollSequence(page, directory, profile) {
  const snapshots = [];
  for (const progress of SCROLL_PROGRESS) {
    const position = await page.evaluate((targetProgress) => {
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - innerHeight,
        (document.body?.scrollHeight ?? 0) - innerHeight,
      );
      const targetY = Math.round(maxScroll * targetProgress);
      window.scrollTo({ top: targetY, behavior: "instant" });
      return { maxScroll, targetY };
    }, progress);
    await page.waitForTimeout(350);
    const actualY = await page.evaluate(() => Math.round(scrollY));
    const label = String(Math.round(progress * 100)).padStart(3, "0");
    await page.screenshot({
      path: path.join(directory, `${profile}-scroll-${label}.png`),
      animations: "allow",
    });
    snapshots.push({ progress, ...position, actualY });
  }
  return snapshots;
}

async function auditProfile(browser, baseUrl, route, profile, issues) {
  const mobile = profile === "mobile";
  const context = await browser.newContext({
    viewport: mobile ? { width: 393, height: 852 } : { width: 1440, height: 900 },
    screen: mobile ? { width: 393, height: 852 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "en-GB",
    timezoneId: "Europe/Vienna",
    ...(mobile ? { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36" } : {}),
  });
  const page = await context.newPage();
  const runtime = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtime.push({ type: "console", text: message.text().slice(0, 300) });
  });
  page.on("pageerror", (error) => runtime.push({ type: "pageerror", text: error.message.slice(0, 300) }));
  page.on("requestfailed", (request) => runtime.push({ type: "requestfailed", text: `${request.method()} ${new URL(request.url()).pathname}`.slice(0, 300) }));
  await page.goto(`${baseUrl}/${route}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const initial = await pageMetrics(page);
  if (initial.overflowX > 1) pushIssue(issues, route, profile, "horizontal-overflow", initial.overflowX);
  if (initial.mains !== 1 || initial.h1s !== 1) pushIssue(issues, route, profile, "landmark-heading-count", { mains: initial.mains, h1s: initial.h1s });
  if (initial.duplicateIds.length) pushIssue(issues, route, profile, "duplicate-ids", initial.duplicateIds);
  if (initial.undersizedTargets.length) pushIssue(issues, route, profile, "target-below-24px", initial.undersizedTargets);
  if (initial.hiddenSections.length) pushIssue(issues, route, profile, "hidden-sections-in-settled-state", initial.hiddenSections);

  const directory = path.join(OUTPUT_ROOT, route);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${profile}-initial.png`), animations: "allow" });
  const scrollSnapshots = await captureScrollSequence(page, directory, profile);
  const scrolled = await pageMetrics(page);
  if (scrolled.hiddenSections.length) pushIssue(issues, route, profile, "hidden-sections-after-scroll", scrolled.hiddenSections);
  await page.screenshot({ path: path.join(directory, `${profile}-full.png`), fullPage: true, animations: "allow" });
  if (runtime.length) pushIssue(issues, route, profile, "runtime-errors", runtime);
  await context.close();
  return { initial, scrollSnapshots, scrolled, runtime };
}

async function auditReducedMotion(browser, baseUrl, route, issues) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    locale: "en-GB",
    timezoneId: "Europe/Vienna",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${route}/`, { waitUntil: "domcontentloaded" });
  await settle(page, 2_300);
  const result = await page.evaluate(() => ({
    runningAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
    hiddenSections: [...document.querySelectorAll("main section")].filter((section) => {
      const style = getComputedStyle(section);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0.02;
    }).length,
  }));
  if (result.runningAnimations) pushIssue(issues, route, "reduced-motion", "running-animations", result.runningAnimations);
  if (result.hiddenSections) pushIssue(issues, route, "reduced-motion", "hidden-sections", result.hiddenSections);
  await context.close();
  return result;
}

async function auditNoJavaScript(browser, baseUrl, route, issues) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${route}/`, { waitUntil: "domcontentloaded" });
  const result = await pageMetrics(page);
  if (result.mains !== 1 || result.h1s !== 1 || result.hiddenSections.length) {
    pushIssue(issues, route, "no-javascript", "content-unavailable", result);
  }
  await context.close();
  return result;
}

async function fillLocalForm(page) {
  const form = page.locator(".local-request-form");
  if (!await form.count()) return false;
  for (const select of await form.locator("select").all()) {
    const options = await select.locator("option:not([disabled])").all();
    if (options.length) await select.selectOption({ index: 1 });
  }
  for (const input of await form.locator("input").all()) {
    const type = await input.getAttribute("type");
    if (type === "email") await input.fill("qa@example.test");
    else if (type === "date") await input.fill("2026-08-15");
    else if (type === "number") await input.fill(await input.getAttribute("min") ?? "4");
    else await input.fill("Fictional fixture");
  }
  await form.locator("button[type='submit']").click();
  await page.locator(".local-form-success h3").waitFor({ state: "visible" });
  return true;
}

async function auditInteraction(browser, baseUrl, route, issues) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/${route}/`, { waitUntil: "domcontentloaded" });
  await settle(page, 1_200);
  try {
    if (["hospitality", "legal", "healthcare"].includes(route)) {
      if (!await fillLocalForm(page)) throw new Error("Expected local form was missing.");
      const focused = await page.evaluate(() => document.activeElement?.matches(".local-form-success h3"));
      if (!focused) throw new Error("Success heading did not receive focus.");
    } else if (route === "finance") {
      const ranges = page.locator("input[type='range']");
      await ranges.nth(0).fill("5000");
      await ranges.nth(1).fill("8");
      await page.getByText("£5,000", { exact: true }).waitFor({ state: "visible" });
    } else if (route === "saas") {
      const action = page.locator(".workflow-panel button");
      await action.click();
      await action.click();
      await action.click();
      await action.click();
      await page.waitForFunction(() => document.querySelector(".workflow-panel button")?.textContent?.includes("History exported locally"));
    } else if (route === "ecommerce") {
      await page.getByRole("button", { name: "Save configuration" }).click();
      await page.getByText("Saved locally", { exact: false }).first().waitFor({ state: "visible" });
    }
  } catch (error) {
    pushIssue(issues, route, "interaction", "flow-failed", error.message);
  } finally {
    await context.close();
  }
}

await mkdir(OUTPUT_ROOT, { recursive: true });
const server = await startStaticServer();
const exportDigest = await directoryDigest(EXPORT_ROOT);
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const issues = [];
const results = {};
try {
  for (const route of ROUTES) {
    results[route] = {
      desktop: await auditProfile(browser, server.baseUrl, route, "desktop", issues),
      mobile: await auditProfile(browser, server.baseUrl, route, "mobile", issues),
      reducedMotion: await auditReducedMotion(browser, server.baseUrl, route, issues),
      noJavaScript: await auditNoJavaScript(browser, server.baseUrl, route, issues),
    };
    await auditInteraction(browser, server.baseUrl, route, issues);
    process.stdout.write(`${issues.some((issue) => issue.route === route) ? "FAIL" : "PASS"} ${route}\n`);
  }
} finally {
  await browser.close();
  await server.close();
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  exportDigest,
  environment: {
    node: process.version,
    playwrightCore: JSON.parse(await readFile(path.join(ROOT, "node_modules", "playwright-core", "package.json"), "utf8")).version,
    chromium: browserVersion,
  },
  routes: ROUTES,
  issues,
  results,
};
await writeFile(path.join(OUTPUT_ROOT, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (issues.length) {
  process.stderr.write(`${issues.length} showcase browser-audit issue(s) found. See output/playwright/showcase-audit/report.json.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Showcase browser audit passed for ${ROUTES.length} routes across desktop, real mobile, reduced motion, no-JavaScript, and local interactions.\n`);
}
