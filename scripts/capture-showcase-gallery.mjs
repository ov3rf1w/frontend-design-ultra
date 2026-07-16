#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { updateMediaProvenance } from "./update-media-provenance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPORT_ROOT = path.join(ROOT, "showcase", "out");
const OUTPUT_ROOT = path.join(ROOT, "docs", "assets", "showcase");
const AUDIT_REPORT = path.join(ROOT, "output", "playwright", "showcase-audit", "report.json");
const ROUTES = ["ecommerce", "finance", "healthcare", "hospitality", "legal", "saas"];
const STORYBOARD_TIMES = [0, 300, 900, 1_800];
const MIME = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);
const require = createRequire(path.join(ROOT, "showcase", "package.json"));
const sharp = require("sharp");

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
  const relative = pathname === "/" ? "index.html" : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  const candidate = path.resolve(EXPORT_ROOT, relative);
  if (!isPathInside(EXPORT_ROOT, candidate)) return null;
  if (await exists(candidate) && (await stat(candidate)).isFile()) return candidate;
  const htmlCandidate = `${candidate}.html`;
  return isPathInside(EXPORT_ROOT, htmlCandidate) && await exists(htmlCandidate) && (await stat(htmlCandidate)).isFile()
    ? htmlCandidate
    : null;
}

async function startStaticServer() {
  if (!(await exists(path.join(EXPORT_ROOT, "index.html")))) throw new Error("Missing showcase/out. Run the showcase production build first.");
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
  if (!address || typeof address === "string") throw new Error("Could not determine gallery server port.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function settle(page, milliseconds) {
  await page.waitForTimeout(milliseconds);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  }).catch(() => {});
}

async function captureRoute(browser, baseUrl, route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    timezoneId: "Europe/Vienna",
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/${route}/`, { waitUntil: "domcontentloaded" });
    await settle(page, 1_900);
    const png = await page.screenshot({ type: "png", animations: "allow" });
    await sharp(png)
      .resize(960, 600, { fit: "cover", position: "top" })
      .webp({ quality: 84, effort: 6 })
      .toFile(path.join(OUTPUT_ROOT, `${route}.webp`));
  } finally {
    await context.close();
  }
}

async function captureStoryboardFrame(browser, baseUrl, targetMs) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    timezoneId: "Europe/Vienna",
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/hospitality/`, { waitUntil: "commit" });
    const anchor = await page.evaluate(() => performance.now());
    const elapsed = await page.evaluate(() => performance.now()) - anchor;
    await page.waitForTimeout(Math.max(0, targetMs - elapsed));
    const actualMs = Math.round((await page.evaluate(() => performance.now()) - anchor) * 10) / 10;
    const png = await page.screenshot({ type: "png", animations: "allow" });
    const tile = await sharp(png).resize(720, 450, { fit: "cover", position: "top" }).png().toBuffer();
    return { targetMs, actualMs, tile };
  } finally {
    await context.close();
  }
}

function timeLabelSvg(targetMs) {
  return Buffer.from(`<svg width="144" height="42" xmlns="http://www.w3.org/2000/svg"><rect width="144" height="42" fill="rgba(12,18,15,.84)"/><text x="14" y="27" fill="#fff8ef" font-family="Arial,sans-serif" font-size="16" font-weight="700">${targetMs} ms</text></svg>`);
}

async function captureStoryboard(browser, baseUrl) {
  const frames = [];
  for (const targetMs of STORYBOARD_TIMES) frames.push(await captureStoryboardFrame(browser, baseUrl, targetMs));
  const composites = [];
  for (let index = 0; index < frames.length; index += 1) {
    const left = (index % 2) * 720;
    const top = Math.floor(index / 2) * 450;
    composites.push({ input: frames[index].tile, left, top });
    composites.push({ input: timeLabelSvg(frames[index].targetMs), left: left + 16, top: top + 16 });
  }
  await sharp({ create: { width: 1440, height: 900, channels: 4, background: "#111714" } })
    .composite(composites)
    .webp({ quality: 84, effort: 6 })
    .toFile(path.join(OUTPUT_ROOT, "hospitality-entrance-storyboard.webp"));
  return frames.map(({ targetMs, actualMs }) => ({ targetMs, actualMs }));
}

async function fileRecord(filename, route) {
  const file = path.join(OUTPUT_ROOT, filename);
  const [source, metadata] = await Promise.all([readFile(file), sharp(file).metadata()]);
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${filename}.`);
  return {
    path: filename,
    route,
    width: metadata.width,
    height: metadata.height,
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}

const auditSource = await readFile(AUDIT_REPORT, "utf8");
const audit = JSON.parse(auditSource);
if (!Array.isArray(audit.issues) || audit.issues.length) {
  throw new Error("A current zero-issue showcase browser audit is required before publishing gallery renders.");
}
const exportDigest = await directoryDigest(EXPORT_ROOT);
if (!/^[a-f0-9]{64}$/.test(audit.exportDigest ?? "") || audit.exportDigest !== exportDigest) {
  throw new Error("The static export differs from the zero-issue browser audit. Re-run npm run showcase:audit.");
}
if (!/^v(?:2[4-9]|[3-9][0-9])\./.test(audit.environment?.node ?? "")) {
  throw new Error("Gallery publication requires a Node 24+ browser audit.");
}

await mkdir(OUTPUT_ROOT, { recursive: true });
const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
let storyboardTiming;
try {
  for (const route of ROUTES) {
    await captureRoute(browser, server.baseUrl, route);
    process.stdout.write(`Captured ${route}.webp\n`);
  }
  storyboardTiming = await captureStoryboard(browser, server.baseUrl);
  process.stdout.write("Captured hospitality-entrance-storyboard.webp\n");
} finally {
  await browser.close();
  await server.close();
}

const files = [];
for (const route of ROUTES) files.push(await fileRecord(`${route}.webp`, `/${route}/`));
files.push(await fileRecord("hospitality-entrance-storyboard.webp", "/hospitality/"));
const playwrightVersion = JSON.parse(await readFile(path.join(ROOT, "node_modules", "playwright-core", "package.json"), "utf8")).version;
const manifest = {
  schemaVersion: 1,
  status: "curated-showcase-not-benchmark",
  capturedAt: new Date().toISOString().slice(0, 10),
  environment: {
    node: process.version,
    playwrightCore: playwrightVersion,
    chromium: browserVersion,
    platform: `${os.platform()} ${os.release()}`,
    locale: "en-GB",
  },
  capture: {
    desktopViewport: { width: 1440, height: 900 },
    mobileViewport: { width: 393, height: 852 },
    entranceFramesMs: STORYBOARD_TIMES,
    entranceFrameActualMs: storyboardTiming,
    auditedExportSha256: exportDigest,
    privateAuditReportSha256: createHash("sha256").update(auditSource).digest("hex"),
    scrollProgress: [0.25, 0.5, 0.75, 1],
    reducedMotion: true,
    rawArtifactsPublished: false,
    evidenceScope: {
      publicRouteRenders: "settled desktop render for all six routes",
      publicEntranceStoryboard: "hospitality route only",
      privateScrollSlices: "all six routes at four progress states in desktop and touch-enabled mobile profiles",
      privateReducedMotionCheck: "all six routes",
    },
  },
  qaSummary: {
    routes: ROUTES.length,
    desktopHorizontalOverflow: 0,
    mobileHorizontalOverflow: 0,
    consoleOrPageErrors: 0,
    reducedMotionRunningAnimationsAfterSettle: 0,
    interactiveTargetsBelow24Px: 0,
    interactionFlowsPassed: ROUTES.length,
  },
  rights: {
    visuals: "original repository-authored SVG and CSS",
    brandsAndFacts: "fictional benchmark calibration fixtures",
    thirdPartyVisualAssets: false,
    claimBoundary: "These are curated showcase renders, not blind benchmark results, customer outcomes, conversion evidence, or award scores.",
  },
  files,
};
await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write("Updated docs/assets/showcase/manifest.json with exact dimensions and SHA-256 hashes.\n");
await updateMediaProvenance(ROOT);
process.stdout.write("Updated docs/assets/media-provenance.json for all public media.\n");
