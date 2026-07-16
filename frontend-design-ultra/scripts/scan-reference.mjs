#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { access, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  assertNonSyncedEvidencePath,
  getDefaultPrivateEvidenceRoot,
} from "./evidence-paths.mjs";

const SCRIPT_VERSION = 2;
const CAPTURE_CONTRACT_VERSION = 2;
const EXPECTED_PLAYWRIGHT_CORE_VERSION = "1.61.1";
const DEFAULT_ENTRANCE_MS = [0, 150, 400, 800, 1400, 2200, 3500];
const DEFAULT_SCROLL_RATIOS = [0, 0.08, 0.18, 0.3, 0.43, 0.57, 0.7, 0.82, 0.92, 1];
const DEFAULT_VIEWPORTS = {
  desktop: {
    width: 1440,
    height: 900,
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    profile: "chromium-desktop-1440",
  },
  mobile: {
    width: 393,
    height: 852,
    screen: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    profile: "chromium-android-touch-393",
  },
};
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_ROOT = path.resolve(SKILL_ROOT, "..");
const DEFAULT_OUTPUT_ROOT = getDefaultPrivateEvidenceRoot();
const DEFAULT_LOCALE = "en-US";
const DEFAULT_TIMEZONE_ID = "UTC";
const DEFAULT_TIMING_TOLERANCE_MS = 260;
const DEFAULT_SCROLL_TOLERANCE = 0.025;
const DEFAULT_MAX_CAPTURE_MB = 300;
const RIGHTS_BASES = new Set([
  "owned-or-controlled-site",
  "site-owner-permission-documented",
  "compatible-license-documented",
  "public-page-private-research-no-republication",
]);
const REVIEWER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
const COLLECTION_LIMITS = Object.freeze({
  consoleMessages: 200,
  runtimeErrors: 100,
  requestFailures: 300,
  policyViolations: 100,
  elementAnimateCalls: 500,
  computedStates: 96,
});
const PUBLIC_DNS_FAILURE_CODES = new Set(["EAI_AGAIN", "ENODATA", "ENOTFOUND", "ESERVFAIL", "ETIMEOUT"]);

export function getViewportProfile(name) {
  const profile = DEFAULT_VIEWPORTS[name];
  return profile ? { ...profile, screen: { ...profile.screen } } : null;
}

function usage() {
  return `Usage:
  node scripts/scan-reference.mjs --url <public-url> [options]

Required:
  --url <url>                 Public HTTP(S) page without credentials or query tokens.

Options:
  --id <slug>                 Stable reference id; derived from hostname/path by default.
  --output <directory>        Private, non-synchronized evidence root.
  --viewports <list>          desktop,mobile (default: both).
  --entrance-ms <list>        Absolute entrance samples in ms.
  --scroll-ratios <list>      Ratios from 0 to 1 for the scroll storyboard.
  --timing-tolerance-ms <n>   Maximum entrance-frame drift (default: 260).
  --scroll-tolerance <ratio>  Maximum scroll-ratio drift (default: 0.025).
  --timeout-ms <number>       Navigation/action timeout (default: 30000).
  --settle-ms <number>        Pause after each scroll state (default: 650).
  --click <selector>          Repeatable opt-in click before the storyboard.
  --hover <selector>          Repeatable opt-in hover captured before scrolling.
  --browser <name>            chromium, chrome, or msedge (default: auto).
  --executable-path <path>    Explicit Chromium-compatible executable.
  --evidence-tier <tier>      exploratory or benchmark (default: exploratory).
  --max-capture-mb <number>   Per-reference artifact budget (default: 300).
  --rights-basis <value>      Required capture authority classification.
  --rights-reviewed-at <date> Required YYYY-MM-DD review date.
  --reviewer-id <id>          Required non-secret reviewer identifier.
  --headed                    Show the browser.
  --no-video                  Disable motion video.
  --trace                     Enable private diagnostic Playwright traces.
  --no-trace                  Legacy alias; traces are already off by default.
  --allow-query               Permit navigation URLs containing a query string.
  --help                      Show this help.

Raw screenshots, videos, traces, and exact animation snapshots are reference-only
artifacts. The default is an OS-local cache outside the repository. Repository-local
and known cloud-synchronized paths are rejected. Promote only reviewed, derived
mechanics unless publication rights are documented.

Accepted --rights-basis values:
  owned-or-controlled-site
  site-owner-permission-documented
  compatible-license-documented
  public-page-private-research-no-republication

Capture Contract v2 samples every entrance target in a fresh equivalent context
anchored after its own navigation commit, verifies actual scroll/timing outcomes,
and records a resumeKey. Exit codes: 0 complete,
1 failed, 2 CLI error, 3 partial, 4 unsupported.
`;
}

function parseNumberList(value, label, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const tokens = String(value).split(",").map((item) => item.trim());
  const parsed = tokens.map((item) => Number(item));
  if (!parsed.length || tokens.some((item) => item === "") || parsed.some((item) => !Number.isFinite(item) || item < min || item > max)) {
    throw new Error(`${label} must be a comma-separated list between ${min} and ${max}.`);
  }
  return [...new Set(parsed)].sort((left, right) => left - right);
}

export function parseArguments(argv) {
  const options = {
    url: null,
    id: null,
    output: DEFAULT_OUTPUT_ROOT,
    viewports: ["desktop", "mobile"],
    entranceMs: DEFAULT_ENTRANCE_MS,
    scrollRatios: DEFAULT_SCROLL_RATIOS,
    timeoutMs: 30_000,
    settleMs: 650,
    clicks: [],
    hovers: [],
    browser: "auto",
    executablePath: null,
    evidenceTier: "exploratory",
    headed: false,
    video: true,
    trace: false,
    allowQuery: false,
    timingToleranceMs: DEFAULT_TIMING_TOLERANCE_MS,
    scrollTolerance: DEFAULT_SCROLL_TOLERANCE,
    maxCaptureMb: DEFAULT_MAX_CAPTURE_MB,
    rightsBasis: null,
    rightsReviewedAt: null,
    reviewerId: null,
    help: false,
  };

  const valueFor = (index, flag) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--no-video") options.video = false;
    else if (argument === "--trace") options.trace = true;
    else if (argument === "--no-trace") options.trace = false;
    else if (argument === "--allow-query") options.allowQuery = true;
    else if (["--url", "--id", "--output", "--viewports", "--entrance-ms", "--scroll-ratios", "--timing-tolerance-ms", "--scroll-tolerance", "--timeout-ms", "--settle-ms", "--click", "--hover", "--browser", "--executable-path", "--evidence-tier", "--max-capture-mb", "--rights-basis", "--rights-reviewed-at", "--reviewer-id"].includes(argument)) {
      const value = valueFor(index, argument);
      index += 1;
      if (argument === "--url") options.url = value;
      else if (argument === "--id") options.id = value;
      else if (argument === "--output") options.output = path.resolve(value);
      else if (argument === "--viewports") options.viewports = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
      else if (argument === "--entrance-ms") options.entranceMs = parseNumberList(value, argument, { min: 0, max: 60_000 });
      else if (argument === "--scroll-ratios") options.scrollRatios = parseNumberList(value, argument, { min: 0, max: 1 });
      else if (argument === "--timing-tolerance-ms") options.timingToleranceMs = Number(value);
      else if (argument === "--scroll-tolerance") options.scrollTolerance = Number(value);
      else if (argument === "--timeout-ms") options.timeoutMs = Number(value);
      else if (argument === "--settle-ms") options.settleMs = Number(value);
      else if (argument === "--click") options.clicks.push(value);
      else if (argument === "--hover") options.hovers.push(value);
      else if (argument === "--browser") options.browser = value;
      else if (argument === "--executable-path") options.executablePath = path.resolve(value);
      else if (argument === "--evidence-tier") options.evidenceTier = value;
      else if (argument === "--max-capture-mb") options.maxCaptureMb = Number(value);
      else if (argument === "--rights-basis") options.rightsBasis = value;
      else if (argument === "--rights-reviewed-at") options.rightsReviewedAt = value;
      else if (argument === "--reviewer-id") options.reviewerId = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.help) return options;
  if (!options.url) throw new Error("--url is required.");
  if (!options.viewports.length || options.viewports.some((name) => !DEFAULT_VIEWPORTS[name])) {
    throw new Error("--viewports supports only desktop and mobile.");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 180_000) {
    throw new Error("--timeout-ms must be an integer from 1000 to 180000.");
  }
  if (!Number.isInteger(options.settleMs) || options.settleMs < 0 || options.settleMs > 10_000) {
    throw new Error("--settle-ms must be an integer from 0 to 10000.");
  }
  if (!Number.isInteger(options.timingToleranceMs) || options.timingToleranceMs < 25 || options.timingToleranceMs > 5_000) {
    throw new Error("--timing-tolerance-ms must be an integer from 25 to 5000.");
  }
  if (!Number.isFinite(options.scrollTolerance) || options.scrollTolerance < 0.001 || options.scrollTolerance > 0.25) {
    throw new Error("--scroll-tolerance must be from 0.001 to 0.25.");
  }
  if (!Number.isFinite(options.maxCaptureMb) || options.maxCaptureMb < 10 || options.maxCaptureMb > 10_000) {
    throw new Error("--max-capture-mb must be from 10 to 10000.");
  }
  if (!["auto", "chromium", "chrome", "msedge"].includes(options.browser)) {
    throw new Error("--browser supports auto, chromium, chrome, or msedge.");
  }
  if (!["exploratory", "benchmark"].includes(options.evidenceTier)) {
    throw new Error("--evidence-tier supports exploratory or benchmark.");
  }
  if (options.evidenceTier === "benchmark" && (options.executablePath || !["auto", "chromium"].includes(options.browser))) {
    throw new Error("Benchmark evidence requires the pinned Playwright Chromium; browser channels and executable paths are forbidden.");
  }
  normalizeTarget(options.url, options.allowQuery);
  return options;
}

export function assertCaptureAuthority(options) {
  if (!RIGHTS_BASES.has(options.rightsBasis)) {
    throw new Error(`--rights-basis is required and must be one of: ${[...RIGHTS_BASES].join(", ")}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.rightsReviewedAt ?? "")
    || Number.isNaN(Date.parse(`${options.rightsReviewedAt}T00:00:00.000Z`))) {
    throw new Error("--rights-reviewed-at is required in YYYY-MM-DD format.");
  }
  if (!REVIEWER_ID_PATTERN.test(options.reviewerId ?? "")) {
    throw new Error("--reviewer-id is required and must contain 2-64 letters, numbers, dots, underscores, or hyphens.");
  }
  return {
    basis: options.rightsBasis,
    reviewedAt: options.rightsReviewedAt,
    reviewerId: options.reviewerId,
    publicationPolicy: options.rightsBasis === "owned-or-controlled-site"
      || options.rightsBasis === "site-owner-permission-documented"
      || options.rightsBasis === "compatible-license-documented"
      ? "publication-requires-separate-license-scope-check"
      : "private-capture-only-no-republication",
    legalConclusion: false,
    robotsAndTermsPolicy: "single-public-page-navigation-no-authentication-no-bypass",
  };
}

function safeSlug(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!slug) throw new Error("Reference id cannot be empty after normalization.");
  return slug;
}

function normalizedHostname(value) {
  return String(value).replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function ipv4Number(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(address, base, bits) {
  const value = ipv4Number(address);
  const rangeBase = ipv4Number(base);
  if (value === null || rangeBase === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (rangeBase & mask);
}

export function isPrivateOrReservedAddress(address) {
  const normalized = normalizedHostname(address);
  const version = isIP(normalized);
  if (version === 4) {
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([base, bits]) => inIpv4Range(normalized, base, bits));
  }
  if (version === 6) {
    if (normalized.startsWith("::")) return true;
    const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
    return normalized === "::"
      || normalized === "::1"
      || (first >= 0xfc00 && first <= 0xfdff)
      || (first >= 0xfe80 && first <= 0xfebf)
      || (first >= 0xff00)
      || normalized.startsWith("2001:db8:")
      || normalized === "2001:db8::";
  }
  return false;
}

function assertPublicHostnameSyntax(hostname) {
  const normalized = normalizedHostname(hostname);
  if (!normalized || ["localhost", "localhost.localdomain"].includes(normalized)
    || normalized.endsWith(".localhost") || normalized.endsWith(".local")
    || normalized.endsWith(".internal") || normalized.endsWith(".home.arpa")
    || isPrivateOrReservedAddress(normalized)) {
    throw new Error(`Private or reserved network target is forbidden: ${hostname}`);
  }
}

export async function assertPublicNetworkUrl(raw, resolutionCache = new Map()) {
  const target = raw instanceof URL ? raw : new URL(raw);
  if (!["http:", "https:"].includes(target.protocol)) return;
  if (target.username || target.password) throw new Error("Credential-bearing network requests are forbidden.");
  assertPublicHostnameSyntax(target.hostname);
  const hostname = normalizedHostname(target.hostname);
  if (isIP(hostname)) return;
  if (!resolutionCache.has(hostname)) {
    resolutionCache.set(hostname, dnsLookup(hostname, { all: true, verbatim: true }));
  }
  const addresses = await resolutionCache.get(hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateOrReservedAddress(address))) {
    throw new Error(`DNS for ${hostname} resolved to a private, reserved, or empty address set.`);
  }
}

export function classifyNetworkGuardError(error) {
  if (PUBLIC_DNS_FAILURE_CODES.has(error?.code)) {
    return {
      kind: "resolution-failure",
      type: "public-dns-resolution-failed",
      reason: `Public hostname could not be resolved (${error.code}); the request was blocked without contacting an address.`,
    };
  }
  return {
    kind: "violation",
    type: "private-or-reserved-network",
    reason: error?.message ?? "Public-network policy rejected the request.",
  };
}

export function normalizeTarget(raw, allowQuery) {
  let target;
  try {
    target = new URL(raw);
  } catch {
    throw new Error("--url must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  if (target.username || target.password) throw new Error("Credential-bearing URLs are forbidden.");
  assertPublicHostnameSyntax(target.hostname);
  if (target.search && !allowQuery) {
    throw new Error("Query-bearing URLs are rejected by default; use --allow-query only when the query is non-secret.");
  }
  target.hash = "";
  const publicTarget = new URL(target);
  publicTarget.search = "";
  return {
    navigationUrl: target.href,
    publicUrl: publicTarget.href,
    queryPresent: Boolean(target.search),
    queryHash: target.search ? createHash("sha256").update(target.search).digest("hex") : null,
  };
}

function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function nearestExistingPath(candidate) {
  let current = path.resolve(candidate);
  while (!(await fileExists(current))) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

export async function assertSafeOutputRoot(output) {
  const resolved = assertNonSyncedEvidencePath(output);
  const distRoot = path.join(REPOSITORY_ROOT, "dist");
  if (isPathInside(SKILL_ROOT, resolved) || isPathInside(distRoot, resolved)) {
    throw new Error("Capture output must remain outside the installable skill and release directories.");
  }
  if (isPathInside(REPOSITORY_ROOT, resolved)) {
    throw new Error("Raw third-party capture output must remain outside the repository.");
  }
  const [realSkill, realRepository, existingOutput] = await Promise.all([
    realpath(SKILL_ROOT),
    realpath(REPOSITORY_ROOT),
    nearestExistingPath(resolved),
  ]);
  const realOutputAncestor = await realpath(existingOutput).catch(() => existingOutput);
  const projectedRealOutput = path.resolve(realOutputAncestor, path.relative(existingOutput, resolved));
  assertNonSyncedEvidencePath(projectedRealOutput);
  if (isPathInside(realSkill, projectedRealOutput)
    || isPathInside(path.join(realRepository, "dist"), projectedRealOutput)
    || isPathInside(realRepository, projectedRealOutput)) {
    throw new Error("Capture output resolves through a link into a tracked repository or release directory.");
  }
  return resolved;
}

export function createCaptureContract(options, targetOrUrl) {
  const target = typeof targetOrUrl === "string" ? normalizeTarget(targetOrUrl, options.allowQuery) : targetOrUrl;
  const rightsReview = assertCaptureAuthority(options);
  const contract = {
    version: CAPTURE_CONTRACT_VERSION,
    scannerVersion: SCRIPT_VERSION,
    sourceUrl: target.publicUrl,
    queryHash: target.queryHash ?? null,
    evidenceTier: options.evidenceTier,
    browserRequest: options.evidenceTier === "benchmark" ? "pinned-playwright-chromium" : options.browser,
    executablePathHash: options.executablePath ? sha256(path.resolve(options.executablePath)) : null,
    locale: DEFAULT_LOCALE,
    timezoneId: DEFAULT_TIMEZONE_ID,
    entranceAnchor: "per-sample-navigation-commit",
    entranceSampling: {
      isolation: "fresh-browser-context-per-target",
      cacheState: "cold-context-per-target",
      timingBasis: "screenshot-request-start",
      captureWindowRecorded: true,
      auxiliaryVideo: false,
      auxiliaryTrace: false,
      continuousVideoContext: options.video,
    },
    entranceMs: options.entranceMs,
    timingToleranceMs: options.timingToleranceMs,
    scrollRatios: options.scrollRatios,
    scrollTolerance: options.scrollTolerance,
    scrollSampling: {
      verification: "target-settle-remeasure-final-correction",
      maximumCorrectionAttempts: 4,
    },
    settleMs: options.settleMs,
    timeoutMs: options.timeoutMs,
    video: options.video,
    trace: options.trace,
    headless: !options.headed,
    maxCaptureMb: options.maxCaptureMb,
    serviceWorkers: "blocked",
    httpCache: "disabled-by-network-routing",
    networkPolicy: {
      unresolvedPublicDns: "diagnostic-block-not-policy-violation",
      privateOrReservedDns: "hard-policy-violation",
      blockedSubresourceImpact: "recorded-warning-unless-capture-step-fails",
    },
    rightsReview,
    viewports: options.viewports.map((name) => ({ name, ...DEFAULT_VIEWPORTS[name] })),
    clickSelectorHashes: options.clicks.map((selector) => sha256(selector).slice(0, 16)),
    hoverSelectorHashes: options.hovers.map((selector) => sha256(selector).slice(0, 16)),
  };
  return { ...contract, resumeKey: sha256(JSON.stringify(contract)) };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function pushCapped(collection, value, limit, dropped) {
  if (collection.length < limit) collection.push(value);
  else dropped.count += 1;
}

async function directorySize(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) bytes += await directorySize(file);
    else if (entry.isFile()) bytes += (await stat(file)).size;
  }
  return bytes;
}

async function findNewestExecutable(directory, executableName) {
  if (!directory || !(await fileExists(directory))) return null;
  const versions = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const sorted = versions
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, "en", { numeric: true }));
  for (const version of sorted) {
    const candidate = path.join(directory, version, executableName);
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

async function browserExecutableCandidates() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) candidates.push(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
  if (process.platform === "win32") {
    const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
      );
      const edgeCore = await findNewestExecutable(path.join(root, "Microsoft", "EdgeCore"), "msedge.exe");
      if (edgeCore) candidates.push(edgeCore);
    }
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
    );
  }
  return [...new Set(candidates.filter(Boolean))];
}

export function scannerRuntimeSetupMessage() {
  return `The optional reference scanner requires playwright-core ${EXPECTED_PLAYWRIGHT_CORE_VERSION}. In the installed skill directory "${SKILL_ROOT}", run "npm ci --ignore-scripts". Normal skill use does not require this install.`;
}

export function scannerBrowserSetupMessage(evidenceTier = "exploratory") {
  if (evidenceTier === "benchmark") {
    return `Benchmark capture requires the Chromium build pinned by playwright-core ${EXPECTED_PLAYWRIGHT_CORE_VERSION}. In the installed skill directory "${SKILL_ROOT}", run "npm run browser:install" (equivalent to "npx playwright-core install chromium" after the locked runtime install). The skill installer never downloads a browser automatically.`;
  }
  return `Exploratory capture can use an existing Chrome or Edge installation. To install the Chromium build pinned by playwright-core ${EXPECTED_PLAYWRIGHT_CORE_VERSION}, run "npm run browser:install" in the installed skill directory "${SKILL_ROOT}". The skill installer never downloads a browser automatically.`;
}

function scannerSetupError(code, message, originalError) {
  const originalMessage = originalError?.message ? redactDiagnostic(originalError.message) : "";
  const error = new Error(`${message}${originalMessage ? ` Original error: ${originalMessage}` : ""}`);
  error.code = code;
  return error;
}

async function loadPlaywright() {
  try {
    const runtime = await import("playwright-core");
    const version = await getPlaywrightVersion();
    if (version !== EXPECTED_PLAYWRIGHT_CORE_VERSION) {
      throw scannerSetupError(
        "FDU_SCANNER_RUNTIME_VERSION_MISMATCH",
        `${scannerRuntimeSetupMessage()} Resolved version: ${version}.`,
      );
    }
    return runtime;
  } catch (error) {
    if (String(error?.code ?? "").startsWith("FDU_SCANNER_")) throw error;
    throw scannerSetupError("FDU_SCANNER_RUNTIME_MISSING", scannerRuntimeSetupMessage(), error);
  }
}

let playwrightVersion;
export async function getPlaywrightVersion() {
  if (playwrightVersion) return playwrightVersion;
  try {
    const entry = fileURLToPath(import.meta.resolve("playwright-core"));
    const metadata = JSON.parse(await readFile(path.join(path.dirname(entry), "package.json"), "utf8"));
    playwrightVersion = metadata.version ?? "unknown";
  } catch {
    playwrightVersion = "unknown";
  }
  return playwrightVersion;
}

async function launchBrowser(chromium, options) {
  const common = {
    headless: !options.headed,
    ...(options.evidenceTier === "benchmark" ? { args: ["--force-color-profile=srgb"] } : {}),
  };
  if (options.evidenceTier === "benchmark") {
    try {
      return {
        browser: await chromium.launch(common),
        launchMode: "pinned-playwright-chromium",
      };
    } catch (error) {
      throw scannerSetupError("FDU_SCANNER_PINNED_BROWSER_MISSING", scannerBrowserSetupMessage("benchmark"), error);
    }
  }
  if (options.executablePath) {
    return { browser: await chromium.launch({ ...common, executablePath: options.executablePath }), launchMode: "explicit-executable" };
  }

  if (["chrome", "msedge"].includes(options.browser)) {
    return { browser: await chromium.launch({ ...common, channel: options.browser }), launchMode: `channel:${options.browser}` };
  }

  if (options.browser === "chromium") {
    try {
      return { browser: await chromium.launch(common), launchMode: "bundled-chromium" };
    } catch (error) {
      throw scannerSetupError("FDU_SCANNER_PINNED_BROWSER_MISSING", scannerBrowserSetupMessage("exploratory"), error);
    }
  }

  const failures = [];
  try {
    return { browser: await chromium.launch(common), launchMode: "bundled-chromium" };
  } catch (error) {
    failures.push(error.message);
  }
  for (const channel of ["msedge", "chrome"]) {
    try {
      return { browser: await chromium.launch({ ...common, channel }), launchMode: `channel:${channel}` };
    } catch (error) {
      failures.push(error.message);
    }
  }
  for (const executablePath of await browserExecutableCandidates()) {
    if (!(await fileExists(executablePath))) continue;
    try {
      return { browser: await chromium.launch({ ...common, executablePath }), launchMode: "system-executable" };
    } catch (error) {
      failures.push(error.message);
    }
  }
  throw scannerSetupError(
    "FDU_SCANNER_BROWSER_MISSING",
    `${scannerBrowserSetupMessage("exploratory")} You can also pass --executable-path to an authorized Chromium-compatible browser.`,
    new Error(failures.slice(0, 3).join(" | ")),
  );
}

function captureInitScript() {
  return `
    (() => {
      const limit = ${COLLECTION_LIMITS.elementAnimateCalls};
      const calls = [];
      const capture = { elementAnimateCalls: calls, droppedElementAnimateCalls: 0, startedAt: Date.now() };
      const original = Element.prototype.animate;
      if (typeof original === "function") {
        Element.prototype.animate = function patchedAnimate(keyframes, options) {
          try {
            const frames = Array.isArray(keyframes) ? keyframes : [keyframes];
            if (calls.length < limit) {
              calls.push({
                at: performance.now(),
                tag: this.tagName?.toLowerCase() || "unknown",
                id: String(this.id || "").slice(0, 80),
                properties: [...new Set(frames.flatMap((frame) => frame && typeof frame === "object" ? Object.keys(frame) : []))],
                options: typeof options === "number" ? { duration: options } : {
                  duration: options?.duration ?? null,
                  delay: options?.delay ?? null,
                  easing: options?.easing ?? null,
                  iterations: options?.iterations ?? null
                }
              });
            } else {
              capture.droppedElementAnimateCalls += 1;
            }
          } catch {}
          return original.apply(this, arguments);
        };
      }
      Object.defineProperty(window, "__fduCapture", {
        value: capture,
        configurable: false,
        enumerable: false,
        writable: false
      });
    })();
  `;
}

function mobileUserAgent(browserVersion) {
  const major = String(browserVersion).match(/\d+/)?.[0] ?? "120";
  return `Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Mobile Safari/537.36`;
}

function contextConfiguration(viewportName, viewport, browserVersion, reducedMotion, videoDirectory = null) {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    screen: viewport.screen,
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    ...(viewportName === "mobile" ? { userAgent: mobileUserAgent(browserVersion) } : {}),
    locale: DEFAULT_LOCALE,
    timezoneId: DEFAULT_TIMEZONE_ID,
    reducedMotion,
    colorScheme: "light",
    serviceWorkers: "block",
    acceptDownloads: false,
    ...(videoDirectory ? { recordVideo: { dir: videoDirectory, size: { width: viewport.width, height: viewport.height } } } : {}),
  };
}

function safeUrlRecord(raw) {
  try {
    const target = new URL(raw);
    return { origin: target.origin, pathnameHash: sha256(target.pathname).slice(0, 16) };
  } catch {
    return { origin: "invalid", pathnameHash: null };
  }
}

function redactRuntimeText(value) {
  return String(value)
    .replace(/([?&](?:token|key|secret|auth|session)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .slice(0, 1_000);
}

async function installNetworkGuard(context) {
  const resolutionCache = new Map();
  const violations = [];
  const resolutionFailures = [];
  const dropped = { count: 0 };
  const resolutionDropped = { count: 0 };
  const interaction = { active: false };
  await context.route("**/*", async (route) => {
    const request = route.request();
    let violation = null;
    let resolutionFailure = null;
    try {
      await assertPublicNetworkUrl(request.url(), resolutionCache);
    } catch (error) {
      const classification = classifyNetworkGuardError(error);
      if (classification.kind === "resolution-failure") resolutionFailure = classification;
      else violation = classification;
    }
    if (!violation && interaction.active && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      violation = { type: "non-idempotent-interaction-request", reason: `Blocked ${request.method()} during isolated interaction.` };
    }
    if (!violation && interaction.active && request.isNavigationRequest()) {
      violation = { type: "interaction-navigation", reason: "Navigation during an isolated interaction is blocked by default." };
    }
    if (violation || resolutionFailure) {
      const report = {
        ...(violation ?? resolutionFailure),
        method: request.method(),
        resourceType: request.resourceType(),
        ...safeUrlRecord(request.url()),
      };
      if (violation) {
        pushCapped(violations, report, COLLECTION_LIMITS.policyViolations, dropped);
      } else {
        pushCapped(resolutionFailures, report, COLLECTION_LIMITS.policyViolations, resolutionDropped);
      }
      await route.abort("blockedbyclient").catch(() => {});
      return;
    }
    await route.continue().catch(() => {});
  });
  if (typeof context.routeWebSocket === "function") {
    await context.routeWebSocket("**/*", async (webSocketRoute) => {
      const websocketUrl = new URL(webSocketRoute.url());
      websocketUrl.protocol = websocketUrl.protocol === "wss:" ? "https:" : "http:";
      try {
        await assertPublicNetworkUrl(websocketUrl, resolutionCache);
      } catch (error) {
        const classification = classifyNetworkGuardError(error);
        const report = {
          type: classification.kind === "resolution-failure" ? "public-websocket-dns-resolution-failed" : "private-or-reserved-websocket",
          reason: classification.reason,
          method: "WEBSOCKET",
          resourceType: "websocket",
          ...safeUrlRecord(webSocketRoute.url()),
        };
        if (classification.kind === "resolution-failure") {
          pushCapped(resolutionFailures, report, COLLECTION_LIMITS.policyViolations, resolutionDropped);
        } else {
          pushCapped(violations, report, COLLECTION_LIMITS.policyViolations, dropped);
        }
        await webSocketRoute.close({ code: 1008, reason: "Blocked by public-network capture policy." }).catch(() => {});
        return;
      }
      const server = webSocketRoute.connectToServer();
      webSocketRoute.onMessage((message) => {
        if (interaction.active) {
          pushCapped(violations, {
            type: "interaction-websocket-message",
            reason: "Outbound WebSocket messages during isolated interactions are blocked by default.",
            method: "WEBSOCKET",
            resourceType: "websocket",
            ...safeUrlRecord(webSocketRoute.url()),
          }, COLLECTION_LIMITS.policyViolations, dropped);
          return;
        }
        server.send(message);
      });
    });
  }
  return {
    resolutionCache,
    violations,
    resolutionFailures,
    dropped,
    resolutionDropped,
    activateInteraction() { interaction.active = true; },
  };
}

async function createGuardedContext(browser, viewportName, viewport, options, reducedMotion, videoDirectory = null) {
  const browserVersion = browser.version();
  const context = await browser.newContext(contextConfiguration(viewportName, viewport, browserVersion, reducedMotion, videoDirectory));
  await context.addInitScript({ content: captureInitScript() });
  const networkGuard = await installNetworkGuard(context);
  return { context, networkGuard };
}

async function navigateToPublicPage(page, target, options, networkGuard, waitUntil = "commit") {
  const response = await page.goto(target.navigationUrl, { waitUntil, timeout: options.timeoutMs });
  const finalUrl = response?.url() ?? page.url();
  await assertPublicNetworkUrl(finalUrl, networkGuard.resolutionCache);
  return {
    finalUrl: new URL(finalUrl).href,
    wallClockMs: Date.now(),
    performanceNowMs: await page.evaluate(() => performance.now()),
    kind: "navigation-commit",
  };
}

async function waitFor(page, milliseconds) {
  if (milliseconds > 0) await page.waitForTimeout(milliseconds);
}

async function waitForSettledPage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }).catch(() => {});
}

async function screenshot(page, file, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path: file, animations: "allow", caret: "hide", ...options });
      return path.basename(file);
    } catch (error) {
      lastError = error;
      if (page.isClosed() || attempt === 3) break;
      await waitFor(page, attempt * 350);
    }
  }
  throw lastError;
}

function attachRuntimeCollector(page) {
  const collector = {
    consoleMessages: [],
    runtimeErrors: [],
    requestFailures: [],
    dropped: { consoleMessages: { count: 0 }, runtimeErrors: { count: 0 }, requestFailures: { count: 0 } },
  };
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      pushCapped(collector.consoleMessages, { type: message.type(), text: redactRuntimeText(message.text()) }, COLLECTION_LIMITS.consoleMessages, collector.dropped.consoleMessages);
    }
  });
  page.on("pageerror", (error) => pushCapped(collector.runtimeErrors, redactRuntimeText(error.message), COLLECTION_LIMITS.runtimeErrors, collector.dropped.runtimeErrors));
  page.on("requestfailed", (request) => pushCapped(collector.requestFailures, {
    method: request.method(),
    resourceType: request.resourceType(),
    host: new URL(request.url()).host,
    failure: request.failure()?.errorText ?? "unknown",
  }, COLLECTION_LIMITS.requestFailures, collector.dropped.requestFailures));
  return collector;
}

function runtimeReport(collector) {
  return {
    consoleMessages: collector?.consoleMessages ?? [],
    runtimeErrors: collector?.runtimeErrors ?? [],
    requestFailures: collector?.requestFailures ?? [],
    dropped: Object.fromEntries(Object.entries(collector?.dropped ?? {}).map(([key, value]) => [key, value.count ?? value ?? 0])),
  };
}

function mergeRuntimeReports(reports) {
  const present = reports.filter(Boolean);
  const mergeField = (field, limit) => {
    const available = present.flatMap((report) => report[field] ?? []);
    return {
      values: available.slice(0, limit),
      dropped: present.reduce((total, report) => total + (report.dropped?.[field] ?? 0), 0) + Math.max(0, available.length - limit),
    };
  };
  const consoleMessages = mergeField("consoleMessages", COLLECTION_LIMITS.consoleMessages);
  const runtimeErrors = mergeField("runtimeErrors", COLLECTION_LIMITS.runtimeErrors);
  const requestFailures = mergeField("requestFailures", COLLECTION_LIMITS.requestFailures);
  return {
    consoleMessages: consoleMessages.values,
    runtimeErrors: runtimeErrors.values,
    requestFailures: requestFailures.values,
    dropped: {
      consoleMessages: consoleMessages.dropped,
      runtimeErrors: runtimeErrors.dropped,
      requestFailures: requestFailures.dropped,
    },
  };
}

function networkPolicyReport(networkGuard) {
  return {
    violations: [...(networkGuard?.violations ?? [])],
    resolutionFailures: [...(networkGuard?.resolutionFailures ?? [])],
    dropped: networkGuard?.dropped?.count ?? networkGuard?.dropped ?? 0,
    resolutionFailuresDropped: networkGuard?.resolutionDropped?.count ?? networkGuard?.resolutionDropped ?? 0,
  };
}

function mergeNetworkPolicyReports(reports) {
  const present = reports.filter(Boolean);
  const available = present.flatMap((report) => report.violations ?? []);
  const resolutionFailures = present.flatMap((report) => report.resolutionFailures ?? []);
  return {
    violations: available.slice(0, COLLECTION_LIMITS.policyViolations),
    resolutionFailures: resolutionFailures.slice(0, COLLECTION_LIMITS.policyViolations),
    dropped: present.reduce((total, report) => total + (report.dropped ?? 0), 0) + Math.max(0, available.length - COLLECTION_LIMITS.policyViolations),
    resolutionFailuresDropped: present.reduce((total, report) => total + (report.resolutionFailuresDropped ?? 0), 0)
      + Math.max(0, resolutionFailures.length - COLLECTION_LIMITS.policyViolations),
  };
}

async function motionSnapshot(page, label) {
  return page.evaluate(({ snapshotLabel, stateLimit }) => {
    const selectorFor = (element) => {
      if (!(element instanceof Element)) return null;
      const tag = element.tagName.toLowerCase();
      if (element.id) return `${tag}#${CSS.escape(element.id).slice(0, 90)}`;
      const classes = [...element.classList].slice(0, 3).map((item) => CSS.escape(item)).join(".");
      return `${tag}${classes ? `.${classes}` : ""}`.slice(0, 120);
    };
    const stableKeyFor = (element) => {
      if (!(element instanceof Element)) return null;
      if (element.id) return `${element.tagName.toLowerCase()}#${CSS.escape(element.id).slice(0, 100)}`;
      for (const attribute of ["data-testid", "data-test", "data-component", "aria-label"]) {
        const value = element.getAttribute(attribute);
        if (value) return `${element.tagName.toLowerCase()}[${attribute}="${CSS.escape(value).slice(0, 80)}"]`;
      }
      const segments = [];
      let current = element;
      while (current && current !== document.body && segments.length < 5) {
        const tag = current.tagName.toLowerCase();
        const siblings = current.parentElement ? [...current.parentElement.children].filter((item) => item.tagName === current.tagName) : [];
        const suffix = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
        segments.unshift(`${tag}${suffix}`);
        current = current.parentElement;
      }
      return `body>${segments.join(">").slice(0, 180)}`;
    };
    const countComputed = (predicate, limit = 2_000) => {
      let count = 0;
      for (const element of [...document.querySelectorAll("body *")].slice(0, limit)) {
        try {
          if (predicate(getComputedStyle(element), element)) count += 1;
        } catch {}
      }
      return count;
    };
    const animations = document.getAnimations().slice(0, 500).map((animation) => {
      const effect = animation.effect;
      const timing = effect?.getTiming?.() ?? {};
      const computed = effect?.getComputedTiming?.() ?? {};
      let keyframes = [];
      try {
        keyframes = (effect?.getKeyframes?.() ?? []).slice(0, 30).map((frame) => Object.fromEntries(
          Object.entries(frame).filter(([key]) => !["computedOffset"].includes(key)),
        ));
      } catch {}
      return {
        animationName: animation.animationName || null,
        playState: animation.playState,
        currentTime: typeof animation.currentTime === "number" ? Math.round(animation.currentTime * 100) / 100 : null,
        playbackRate: animation.playbackRate,
        target: selectorFor(effect?.target),
        pseudoElement: effect?.pseudoElement ?? null,
        timing: {
          delay: Number(timing.delay) || 0,
          direction: timing.direction ?? null,
          duration: typeof timing.duration === "number" ? timing.duration : timing.duration ?? null,
          easing: timing.easing ?? null,
          endDelay: Number(timing.endDelay) || 0,
          fill: timing.fill ?? null,
          iterations: timing.iterations ?? null,
        },
        computed: {
          activeDuration: computed.activeDuration ?? null,
          endTime: computed.endTime ?? null,
          localTime: computed.localTime ?? null,
          progress: computed.progress ?? null,
        },
        keyframes,
      };
    });
    const scripts = [...document.scripts].map((script) => `${script.src || ""} ${script.textContent?.slice(0, 120) || ""}`).join("\n").toLowerCase();
    const globals = {
      gsap: Boolean(window.gsap || scripts.includes("gsap")),
      scrollTrigger: Boolean(window.ScrollTrigger || scripts.includes("scrolltrigger")),
      lenis: Boolean(window.lenis || window.Lenis || scripts.includes("lenis")),
      locomotiveScroll: Boolean(window.LocomotiveScroll || scripts.includes("locomotive-scroll")),
      barba: Boolean(window.barba || scripts.includes("@barba") || scripts.includes("barba.js")),
      three: Boolean(window.THREE || scripts.includes("three.js") || scripts.includes("three.min")),
      webflow: Boolean(window.Webflow || scripts.includes("webflow")),
      swiper: Boolean(window.Swiper || scripts.includes("swiper")),
      motion: Boolean(window.Motion || scripts.includes("framer-motion") || scripts.includes("motion.dev")),
    };
    const fontFamilies = new Map();
    for (const element of [...document.querySelectorAll("body *")].slice(0, 1_000)) {
      const family = getComputedStyle(element).fontFamily;
      if (family) fontFamilies.set(family, (fontFamilies.get(family) ?? 0) + 1);
    }
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
    const maxScroll = Math.max(0, scrollHeight - innerHeight);
    const preferred = [
      ...document.querySelectorAll("h1,h2,h3,button,a,img,video,canvas,svg,[id],[data-testid],[data-component],[style]"),
      ...[...document.querySelectorAll("body *")].slice(0, 800),
    ];
    const computedStates = [];
    const seenStateKeys = new Set();
    for (const element of preferred) {
      if (computedStates.length >= stateLimit) break;
      const key = stableKeyFor(element);
      if (!key || seenStateKeys.has(key)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const style = getComputedStyle(element);
      if (style.display === "none") continue;
      seenStateKeys.add(key);
      const round = (value) => Math.round(value * 10) / 10;
      computedStates.push({
        key,
        tag: element.tagName.toLowerCase(),
        rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
        documentPosition: { x: round(rect.x + scrollX), y: round(rect.y + scrollY) },
        style: {
          opacity: style.opacity,
          transform: style.transform.slice(0, 180),
          filter: style.filter.slice(0, 180),
          clipPath: style.clipPath.slice(0, 180),
          visibility: style.visibility,
          position: style.position,
          backgroundColor: style.backgroundColor,
          color: style.color,
        },
      });
    }
    let gpu = { webgl: false, vendor: null, renderer: null, navigatorGpu: Boolean(navigator.gpu) };
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl") || probe.getContext("experimental-webgl");
      if (gl) {
        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        gpu = {
          ...gpu,
          webgl: true,
          vendor: debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)).slice(0, 160) : String(gl.getParameter(gl.VENDOR)).slice(0, 160),
          renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)).slice(0, 160) : String(gl.getParameter(gl.RENDERER)).slice(0, 160),
        };
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch {}
    return {
      label: snapshotLabel,
      capturedAt: new Date().toISOString(),
      performanceNowMs: Math.round(performance.now() * 100) / 100,
      title: document.title.slice(0, 200),
      location: { origin: location.origin, pathname: location.pathname },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      scroll: {
        x: Math.round(scrollX),
        y: Math.round(scrollY),
        ratio: maxScroll ? Math.round((scrollY / maxScroll) * 10_000) / 10_000 : 0,
        scrollHeight,
        maxScroll,
      },
      document: {
        elements: document.querySelectorAll("body *").length,
        headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
        links: document.links.length,
        images: document.images.length,
        videos: document.querySelectorAll("video").length,
        canvases: document.querySelectorAll("canvas").length,
        svgs: document.querySelectorAll("svg").length,
        fixed: countComputed((style) => style.position === "fixed"),
        sticky: countComputed((style) => style.position === "sticky"),
        transformed: countComputed((style) => style.transform && style.transform !== "none"),
        clipped: countComputed((style) => style.clipPath && style.clipPath !== "none"),
        willChange: countComputed((style) => style.willChange && style.willChange !== "auto"),
        horizontallyOverflowing: countComputed((_style, element) => element.scrollWidth > element.clientWidth + 2),
      },
      libraries: globals,
      environmentSignals: {
        userAgent: navigator.userAgent,
        userAgentDataMobile: navigator.userAgentData?.mobile ?? null,
        language: navigator.language,
        maxTouchPoints: navigator.maxTouchPoints,
        devicePixelRatio,
        screen: { width: screen.width, height: screen.height },
        coarsePointer: matchMedia("(pointer: coarse)").matches,
        finePointer: matchMedia("(pointer: fine)").matches,
        hover: matchMedia("(hover: hover)").matches,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        gpu,
      },
      fonts: [...fontFamilies.entries()].sort((left, right) => right[1] - left[1]).slice(0, 12).map(([family, count]) => ({ family, count })),
      animations,
      elementAnimateCalls: (window.__fduCapture?.elementAnimateCalls ?? []).slice(0, stateLimit * 6),
      droppedElementAnimateCalls: window.__fduCapture?.droppedElementAnimateCalls ?? 0,
      computedStates,
      measurementCoverage: {
        cssAndWaapiAnimations: true,
        elementAnimateInstrumentation: true,
        computedStyleAndGeometry: true,
        directRafOrGsapTimelineIntrospection: false,
      },
    };
  }, { snapshotLabel: label, stateLimit: COLLECTION_LIMITS.computedStates });
}

function summarizeComputedStateDeltas(snapshots) {
  const changedKeys = new Set();
  const propertyCounts = new Map();
  let comparedPairs = 0;
  let observations = 0;
  for (let index = 1; index < snapshots.length; index += 1) {
    const previous = snapshots[index - 1];
    const current = snapshots[index];
    const previousPhase = String(previous.label ?? "").split("-")[0];
    const currentPhase = String(current.label ?? "").split("-")[0];
    if (previousPhase !== currentPhase) continue;
    const previousStates = new Map((previous.computedStates ?? []).map((state) => [state.key, state]));
    let pairCompared = false;
    for (const state of current.computedStates ?? []) {
      const before = previousStates.get(state.key);
      if (!before) continue;
      pairCompared = true;
      const fixedLike = ["fixed", "sticky"].includes(state.style?.position) || ["fixed", "sticky"].includes(before.style?.position);
      const beforePosition = fixedLike ? before.rect : before.documentPosition;
      const afterPosition = fixedLike ? state.rect : state.documentPosition;
      const geometryChanged = ["x", "y"].some((key) => Math.abs(Number(afterPosition?.[key]) - Number(beforePosition?.[key])) > 1.5)
        || ["width", "height"].some((key) => Math.abs(Number(state.rect?.[key]) - Number(before.rect?.[key])) > 1.5);
      if (geometryChanged) {
        changedKeys.add(state.key);
        propertyCounts.set("geometry", (propertyCounts.get("geometry") ?? 0) + 1);
        observations += 1;
      }
      for (const property of ["opacity", "transform", "filter", "clipPath", "visibility", "backgroundColor", "color"]) {
        if (state.style?.[property] !== before.style?.[property]) {
          changedKeys.add(state.key);
          propertyCounts.set(property, (propertyCounts.get(property) ?? 0) + 1);
          observations += 1;
        }
      }
    }
    if (pairCompared) comparedPairs += 1;
  }
  return {
    comparedPairs,
    changedElements: changedKeys.size,
    observations,
    properties: [...propertyCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([property, count]) => ({ property, observations: count })),
  };
}

function summarizeSnapshots(snapshots, { videoAvailable = false } = {}) {
  const animations = snapshots.flatMap((snapshot) => snapshot.animations ?? []);
  const propertyCounts = new Map();
  const easingCounts = new Map();
  const durationBuckets = { instant: 0, micro: 0, component: 0, section: 0, signature: 0, unknown: 0 };
  let infinite = 0;
  for (const animation of animations) {
    const duration = Number(animation.timing?.duration);
    if (!Number.isFinite(duration)) durationBuckets.unknown += 1;
    else if (duration <= 80) durationBuckets.instant += 1;
    else if (duration <= 180) durationBuckets.micro += 1;
    else if (duration <= 320) durationBuckets.component += 1;
    else if (duration <= 650) durationBuckets.section += 1;
    else durationBuckets.signature += 1;
    if (animation.timing?.iterations === null || animation.timing?.iterations === Infinity) infinite += 1;
    if (animation.timing?.easing) easingCounts.set(animation.timing.easing, (easingCounts.get(animation.timing.easing) ?? 0) + 1);
    for (const frame of animation.keyframes ?? []) {
      for (const property of Object.keys(frame).filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key))) {
        propertyCounts.set(property, (propertyCounts.get(property) ?? 0) + 1);
      }
    }
  }
  const maxima = snapshots.reduce((accumulator, snapshot) => ({
    animations: Math.max(accumulator.animations, snapshot.animations?.length ?? 0),
    sticky: Math.max(accumulator.sticky, snapshot.document?.sticky ?? 0),
    fixed: Math.max(accumulator.fixed, snapshot.document?.fixed ?? 0),
    canvases: Math.max(accumulator.canvases, snapshot.document?.canvases ?? 0),
    videos: Math.max(accumulator.videos, snapshot.document?.videos ?? 0),
    clipped: Math.max(accumulator.clipped, snapshot.document?.clipped ?? 0),
  }), { animations: 0, sticky: 0, fixed: 0, canvases: 0, videos: 0, clipped: 0 });
  const librarySignals = Object.fromEntries(Object.keys(snapshots[0]?.libraries ?? {}).map((key) => [key, snapshots.some((snapshot) => snapshot.libraries?.[key])]));
  const computedStateDeltas = summarizeComputedStateDeltas(snapshots);
  const computedProperties = new Set(computedStateDeltas.properties.map(({ property }) => property));
  const candidateMechanics = [];
  if (maxima.sticky > 0) candidateMechanics.push("sticky-scroll-chapter");
  if (maxima.videos > 0) candidateMechanics.push("cinematic-media-sequence");
  if (maxima.canvases > 0 || librarySignals.three) candidateMechanics.push("canvas-spatial-stage");
  if (maxima.clipped > 0 || propertyCounts.has("clipPath") || propertyCounts.has("clip-path")) candidateMechanics.push("mask-or-curtain-reveal");
  if ((propertyCounts.has("transform") && propertyCounts.has("opacity"))
    || (computedProperties.has("transform") && computedProperties.has("opacity"))) candidateMechanics.push("staged-transform-opacity-reveal");
  if (librarySignals.barba) candidateMechanics.push("route-transition");
  if (maxima.fixed > 2) candidateMechanics.push("layered-fixed-chrome");
  return {
    sampledAnimationInstances: animations.length,
    maximumConcurrentAnimations: maxima.animations,
    durationBuckets,
    infiniteAnimations: infinite,
    animatedProperties: [...propertyCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 30).map(([property, observations]) => ({ property, observations })),
    easings: [...easingCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 20).map(([easing, observations]) => ({ easing, observations })),
    maximumCompositionSignals: maxima,
    librarySignals,
    computedStateDeltas,
    measurementCoverage: {
      cssAndWaapi: true,
      elementAnimateInstrumentation: true,
      computedStyleAndGeometryDeltas: true,
      continuousVideo: videoAvailable,
      directRafOrGsapTimelineIntrospection: false,
      classification: videoAvailable ? "waapi-computed-state-and-video" : "waapi-and-computed-state",
      limitations: [
        "Direct requestAnimationFrame and GSAP timelines are inferred from rendered state changes unless they surface through WAAPI.",
        ...(videoAvailable ? [] : ["Continuous motion evidence is incomplete because video capture is disabled."]),
        ...(animations.length === 0 && (librarySignals.gsap || librarySignals.three || librarySignals.lenis)
          ? ["A direct-rendering motion library was detected without WAAPI animation instances; zero WAAPI instances does not mean zero motion."] : []),
      ],
    },
    droppedElementAnimateCalls: Math.max(0, ...snapshots.map((snapshot) => snapshot.droppedElementAnimateCalls ?? 0)),
    candidateMechanics,
  };
}

async function pagePerformanceNow(page) {
  return page.evaluate(() => performance.now());
}

export function measureEntranceTiming(targetMs, startMs, endMs, toleranceMs) {
  const actualMs = Math.round(startMs * 10) / 10;
  const deltaMs = Math.round((actualMs - targetMs) * 10) / 10;
  const captureDurationMs = Math.max(0, Math.round((endMs - startMs) * 10) / 10);
  const missed = Math.abs(deltaMs) > toleranceMs;
  return {
    actualMs,
    deltaMs,
    captureDurationMs,
    timingBasis: "screenshot-request-start",
    missed,
    contract: {
      status: missed ? "missed" : "met",
      toleranceMs,
      timingBasis: "screenshot-request-start",
      captureWindowRecorded: true,
    },
  };
}

export async function captureIndependentEntranceSeries({
  entranceMs,
  toleranceMs,
  createSample,
  captureImage,
  captureSnapshot,
}) {
  if (!Array.isArray(entranceMs) || !entranceMs.length) throw new Error("entranceMs must contain at least one target.");
  if (![createSample, captureImage, captureSnapshot].every((candidate) => typeof candidate === "function")) {
    throw new Error("Independent entrance sampling requires createSample, captureImage, and captureSnapshot functions.");
  }

  const records = [];
  const samples = [];
  for (let index = 0; index < entranceMs.length; index += 1) {
    const targetMs = entranceMs[index];
    const label = `entrance-${String(targetMs).padStart(5, "0")}ms`;
    let sample = null;
    let record = null;
    let image = null;
    let imageStartMs = null;
    let imageEndMs = null;
    try {
      sample = await createSample({ targetMs, index, label });
      if (!sample?.page || !sample?.anchor || typeof sample.close !== "function") {
        throw new Error("Entrance sample factory returned an incomplete isolated sample.");
      }
      const elapsed = await pagePerformanceNow(sample.page) - sample.anchor.performanceNowMs;
      await waitFor(sample.page, Math.max(0, targetMs - elapsed));
      imageStartMs = await pagePerformanceNow(sample.page) - sample.anchor.performanceNowMs;
      image = await captureImage({ page: sample.page, targetMs, index, label, sample });
      imageEndMs = await pagePerformanceNow(sample.page) - sample.anchor.performanceNowMs;
      const snapshot = await captureSnapshot({ page: sample.page, targetMs, index, label, sample });
      const timing = measureEntranceTiming(targetMs, imageStartMs, imageEndMs, toleranceMs);
      record = {
        kind: "entrance",
        anchor: sample.anchor.kind,
        targetMs,
        ...timing,
        isolation: {
          mode: "fresh-browser-context-per-target",
          sampleIndex: index,
          auxiliaryVideo: false,
          auxiliaryTrace: false,
          equivalenceKey: sample.equivalenceKey ?? null,
          equivalenceScope: "capture-configuration-not-content-identity",
        },
        imageWindowMs: { start: Math.round(imageStartMs * 10) / 10, end: Math.round(imageEndMs * 10) / 10 },
        snapshotOffsetMs: Math.round((snapshot.performanceNowMs - sample.anchor.performanceNowMs) * 10) / 10,
        image,
        snapshot,
      };
    } catch (error) {
      record = {
        kind: "entrance",
        anchor: sample?.anchor?.kind ?? "navigation-commit",
        targetMs,
        status: "failed",
        missed: null,
        isolation: {
          mode: "fresh-browser-context-per-target",
          sampleIndex: index,
          auxiliaryVideo: false,
          auxiliaryTrace: false,
          equivalenceKey: sample?.equivalenceKey ?? null,
          equivalenceScope: "capture-configuration-not-content-identity",
        },
        contract: { status: "failed", toleranceMs },
        error: redactRuntimeText(error.message).slice(0, 500),
        ...(image ? {
          image,
          imageWindowMs: imageStartMs === null || imageEndMs === null ? null : {
            start: Math.round(imageStartMs * 10) / 10,
            end: Math.round(imageEndMs * 10) / 10,
          },
        } : {}),
      };
    } finally {
      if (sample) {
        let cleanupError = null;
        try {
          await sample.close();
        } catch (error) {
          cleanupError = redactRuntimeText(error.message).slice(0, 500);
        }
        samples.push({
          targetMs,
          networkPolicy: typeof sample.getNetworkPolicy === "function" ? sample.getNetworkPolicy() : sample.networkPolicy ?? null,
          runtime: typeof sample.getRuntime === "function" ? sample.getRuntime() : sample.runtime ?? null,
        });
        if (cleanupError) record.cleanupWarning = cleanupError;
      }
      records.push(record);
    }
  }
  return { records, samples };
}

async function captureIsolatedEntrance(browser, target, options, directory, viewportName, viewport) {
  const equivalenceKey = sha256(JSON.stringify({
    url: target.publicUrl,
    viewport: viewport.profile,
    locale: DEFAULT_LOCALE,
    timezoneId: DEFAULT_TIMEZONE_ID,
    reducedMotion: "no-preference",
    serviceWorkers: "blocked",
    cache: "cold-context",
  }));
  return captureIndependentEntranceSeries({
    entranceMs: options.entranceMs,
    toleranceMs: options.timingToleranceMs,
    createSample: async () => {
      const { context, networkGuard } = await createGuardedContext(browser, viewportName, viewport, options, "no-preference");
      const page = await context.newPage();
      page.setDefaultTimeout(options.timeoutMs);
      const runtime = attachRuntimeCollector(page);
      try {
        const anchor = await navigateToPublicPage(page, target, options, networkGuard);
        return {
          page,
          anchor,
          equivalenceKey,
          close: () => context.close(),
          getNetworkPolicy: () => networkPolicyReport(networkGuard),
          getRuntime: () => runtimeReport(runtime),
        };
      } catch (error) {
        await context.close().catch(() => {});
        throw error;
      }
    },
    captureImage: ({ page, label }) => screenshot(page, path.join(directory, `${label}.png`)),
    captureSnapshot: ({ page, label }) => motionSnapshot(page, label),
  });
}

async function detectScrollSurface(page) {
  return page.evaluate(() => {
    document.querySelectorAll("[data-fdu-scroll-root]").forEach((element) => element.removeAttribute("data-fdu-scroll-root"));
    const root = document.scrollingElement || document.documentElement;
    const windowMax = Math.max(0, root.scrollHeight - innerHeight);
    const candidates = [];
    for (const element of [...document.querySelectorAll("body *")].slice(0, 2_500)) {
      const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
      if (maxScroll < 4 || element.clientHeight < 40 || element.clientWidth < 40) continue;
      const style = getComputedStyle(element);
      if (!["auto", "scroll", "overlay"].includes(style.overflowY)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue;
      candidates.push({ element, maxScroll, score: maxScroll * Math.min(innerWidth * innerHeight, Math.max(1, rect.width * rect.height)) });
    }
    const custom = candidates.sort((left, right) => right.score - left.score)[0] ?? null;
    const windowScore = windowMax * innerWidth * innerHeight;
    if (custom && custom.score > windowScore) {
      custom.element.setAttribute("data-fdu-scroll-root", "primary");
      return {
        kind: "element",
        selector: "[data-fdu-scroll-root=\"primary\"]",
        position: custom.element.scrollTop,
        maxScroll: custom.maxScroll,
        scrollHeight: custom.element.scrollHeight,
        clientHeight: custom.element.clientHeight,
      };
    }
    if (windowMax > 0) {
      return { kind: "window", selector: null, position: root.scrollTop, maxScroll: windowMax, scrollHeight: root.scrollHeight, clientHeight: innerHeight };
    }
    const scripts = [...document.scripts].map((script) => `${script.src || ""} ${script.textContent?.slice(0, 80) || ""}`).join(" ").toLowerCase();
    const interactiveSurface = document.querySelectorAll("canvas").length > 0
      || Boolean(window.THREE || window.Lenis || window.lenis)
      || document.querySelector("[data-scroll],[data-lenis-scroll],[data-scroll-container]") !== null
      || [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY].includes("hidden")
      || scripts.includes("three.js") || scripts.includes("webgl") || scripts.includes("locomotive-scroll");
    return {
      kind: "none",
      selector: null,
      position: 0,
      maxScroll: 0,
      scrollHeight: root.scrollHeight,
      clientHeight: innerHeight,
      absenceStatus: interactiveSurface ? "unsupported" : "not-applicable",
      reason: interactiveSurface ? "No measurable native/custom scroll range; canvas or virtual-scroll signals require an explicit wheel/drag journey." : "The page has no measurable scroll range.",
    };
  });
}

async function directScroll(page, surface, y) {
  await page.evaluate(({ kind, selector, targetY }) => {
    if (kind === "window") window.scrollTo({ top: targetY, behavior: "instant" });
    else document.querySelector(selector)?.scrollTo({ top: targetY, behavior: "instant" });
  }, { kind: surface.kind, selector: surface.selector, targetY: y });
}

async function wheelScroll(page, surface, delta) {
  const viewport = await page.viewportSize();
  if (surface.kind === "element") {
    const box = await page.locator(surface.selector).boundingBox().catch(() => null);
    if (box) await page.mouse.move(Math.round(box.x + box.width * 0.7), Math.round(box.y + box.height * 0.65));
  } else if (viewport) {
    await page.mouse.move(Math.round(viewport.width * 0.72), Math.round(viewport.height * 0.66));
  }
  await page.mouse.wheel(0, delta);
}

export async function scrollToRatio(page, ratio, settleMs, toleranceRatio = DEFAULT_SCROLL_TOLERANCE) {
  let surface = await detectScrollSurface(page);
  if (surface.kind === "none") {
    return {
      status: ratio === 0 ? "not-applicable" : surface.absenceStatus,
      targetRatio: ratio,
      achievedRatio: 0,
      deltaRatio: -ratio,
      toleranceRatio,
      surface,
      attempts: 0,
    };
  }
  let attempts = 0;
  let achievedRatio = surface.maxScroll ? surface.position / surface.maxScroll : 0;
  for (attempts = 1; attempts <= 3; attempts += 1) {
    const targetY = Math.round(surface.maxScroll * ratio);
    const delta = targetY - surface.position;
    if (Math.abs(delta) > 2) {
      await wheelScroll(page, surface, delta);
      await waitFor(page, Math.min(250, settleMs));
    }
    surface = await detectScrollSurface(page);
    if (surface.kind === "none") {
      return {
        status: ratio === 0 ? "not-applicable" : surface.absenceStatus,
        targetRatio: ratio,
        achievedRatio: 0,
        deltaRatio: -ratio,
        toleranceRatio,
        surface,
        attempts,
      };
    }
    achievedRatio = surface.maxScroll ? surface.position / surface.maxScroll : 0;
    if (Math.abs(achievedRatio - ratio) <= toleranceRatio) break;
    await directScroll(page, surface, Math.round(surface.maxScroll * ratio));
    await waitFor(page, Math.min(300, settleMs));
    surface = await detectScrollSurface(page);
    if (surface.kind === "none") break;
    achievedRatio = surface.maxScroll ? surface.position / surface.maxScroll : 0;
    if (Math.abs(achievedRatio - ratio) <= toleranceRatio) break;
  }
  await waitFor(page, settleMs);
  surface = await detectScrollSurface(page);
  if (surface.kind === "none") {
    return {
      status: ratio === 0 ? "not-applicable" : surface.absenceStatus,
      targetRatio: ratio,
      achievedRatio: 0,
      deltaRatio: -ratio,
      toleranceRatio,
      surface,
      attempts: Math.min(attempts, 3),
    };
  }
  achievedRatio = surface.maxScroll ? surface.position / surface.maxScroll : 0;
  let finalCorrectionApplied = false;
  if (Math.abs(achievedRatio - ratio) > toleranceRatio) {
    finalCorrectionApplied = true;
    await directScroll(page, surface, Math.round(surface.maxScroll * ratio));
    await waitFor(page, settleMs);
    surface = await detectScrollSurface(page);
    if (surface.kind !== "none") achievedRatio = surface.maxScroll ? surface.position / surface.maxScroll : 0;
  }
  const deltaRatio = Math.round((achievedRatio - ratio) * 10_000) / 10_000;
  return {
    status: Math.abs(deltaRatio) <= toleranceRatio ? "met" : "missed",
    targetRatio: ratio,
    achievedRatio: Math.round(achievedRatio * 10_000) / 10_000,
    deltaRatio,
    toleranceRatio,
    surface,
    attempts: Math.min(attempts, 3) + (finalCorrectionApplied ? 1 : 0),
    finalCorrectionApplied,
  };
}

async function captureStoryboard(page, directory, ratios, settleMs, toleranceRatio, labelPrefix = "scroll") {
  const records = [];
  for (let index = 0; index < ratios.length; index += 1) {
    const targetRatio = ratios[index];
    const outcome = await scrollToRatio(page, targetRatio, settleMs, toleranceRatio);
    const suffix = outcome.status === "met" ? `${String(Math.round(targetRatio * 100)).padStart(3, "0")}pct` : outcome.status;
    const label = `${labelPrefix}-${String(index).padStart(2, "0")}-${suffix}`;
    const image = await screenshot(page, path.join(directory, `${label}.png`));
    const snapshot = await motionSnapshot(page, label);
    const record = { kind: "scroll", ...outcome, image, snapshot };
    if (targetRatio > 0 && ["unsupported", "not-applicable"].includes(outcome.status)) {
      record.skippedTargetRatios = ratios.slice(index + 1);
      records.push(record);
      break;
    }
    records.push(record);
  }
  return records;
}

async function captureInteraction(browser, target, options, directory, viewportName, viewport, kind, selector, index) {
  const selectorHash = sha256(selector).slice(0, 16);
  const label = `interaction-${kind}-${String(index + 1).padStart(2, "0")}`;
  const { context, networkGuard } = await createGuardedContext(browser, viewportName, viewport, options, "no-preference");
  const page = await context.newPage();
  page.setDefaultTimeout(options.timeoutMs);
  const downloads = [];
  const popups = [];
  const interactionDropped = { downloads: { count: 0 }, popups: { count: 0 } };
  page.on("download", (download) => {
    pushCapped(downloads, { suggestedFilename: download.suggestedFilename().slice(0, 160) }, COLLECTION_LIMITS.policyViolations, interactionDropped.downloads);
    download.cancel().catch(() => {});
  });
  page.on("popup", (popup) => {
    pushCapped(popups, { blocked: true }, COLLECTION_LIMITS.policyViolations, interactionDropped.popups);
    popup.close().catch(() => {});
  });
  try {
    await navigateToPublicPage(page, target, options, networkGuard);
    await waitForSettledPage(page);
    if (kind === "hover" && await page.evaluate(() => matchMedia("(pointer: coarse)").matches)) {
      return { kind, selectorHash, status: "not-applicable", reason: "Hover is not applicable to a coarse-pointer mobile profile." };
    }
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: "visible", timeout: Math.min(options.timeoutMs, 8_000) });
    const beforeUrl = page.url();
    networkGuard.activateInteraction();
    if (kind === "click") await locator.click({ noWaitAfter: true });
    else await locator.hover();
    await waitFor(page, options.settleMs);
    if (page.url() !== beforeUrl) {
      pushCapped(networkGuard.violations, { type: "interaction-location-change", ...safeUrlRecord(page.url()) }, COLLECTION_LIMITS.policyViolations, networkGuard.dropped);
    }
    const image = await screenshot(page, path.join(directory, `${label}.png`));
    const snapshot = await motionSnapshot(page, label);
    const blocked = networkGuard.violations.length > 0 || downloads.length > 0 || popups.length > 0;
    return {
      kind,
      selectorHash,
      status: blocked ? "policy-blocked" : "met",
      image,
      snapshot,
      policy: { violations: networkGuard.violations, dropped: { violations: networkGuard.dropped.count, downloads: interactionDropped.downloads.count, popups: interactionDropped.popups.count }, downloads, popups },
    };
  } catch (error) {
    return { kind, selectorHash, status: "failed", error: redactRuntimeText(error.message).slice(0, 500), policy: { violations: networkGuard.violations, dropped: { violations: networkGuard.dropped.count, downloads: interactionDropped.downloads.count, popups: interactionDropped.popups.count }, downloads, popups } };
  } finally {
    await context.close();
  }
}

async function runOptInInteractions(browser, target, options, directory, viewportName, viewport) {
  const records = [];
  for (let index = 0; index < options.clicks.length; index += 1) {
    records.push(await captureInteraction(browser, target, options, directory, viewportName, viewport, "click", options.clicks[index], index));
  }
  for (let index = 0; index < options.hovers.length; index += 1) {
    records.push(await captureInteraction(browser, target, options, directory, viewportName, viewport, "hover", options.hovers[index], index));
  }
  return records;
}

async function contentMetrics(page) {
  return page.evaluate(() => {
    const meaningful = [...document.querySelectorAll("main h1,main h2,main h3,main p,main a,main button,main img,main video,main canvas,main svg,h1,h2,h3,img,video,canvas")].slice(0, 1_500);
    let visibleMeaningful = 0;
    let potentiallyMotionGated = 0;
    for (const element of meaningful) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.02 && rect.width > 1 && rect.height > 1;
      if (visible) visibleMeaningful += 1;
      else if (element.textContent?.trim() || ["IMG", "VIDEO"].includes(element.tagName)) potentiallyMotionGated += 1;
    }
    return {
      bodyTextLength: document.body?.innerText?.trim().length ?? 0,
      meaningfulElements: meaningful.length,
      visibleMeaningful,
      potentiallyMotionGated,
      mediaElements: document.querySelectorAll("img,video,canvas,svg").length,
    };
  });
}

async function captureReducedMotion(browser, target, options, viewportName, viewport, directory) {
  const reducedDirectory = path.join(directory, "reduced-motion");
  await mkdir(reducedDirectory, { recursive: true });
  const { context, networkGuard } = await createGuardedContext(browser, viewportName, viewport, options, "reduce");
  const page = await context.newPage();
  page.setDefaultTimeout(options.timeoutMs);
  const failures = [];
  const droppedFailures = { count: 0 };
  page.on("pageerror", (error) => pushCapped(failures, { type: "pageerror", message: redactRuntimeText(error.message).slice(0, 500) }, COLLECTION_LIMITS.runtimeErrors, droppedFailures));
  try {
    await navigateToPublicPage(page, target, options, networkGuard);
    await waitForSettledPage(page);
    await waitFor(page, Math.max(3_500, options.entranceMs.at(-1) ?? 0));
    const first = await screenshot(page, path.join(reducedDirectory, "first-viewport-final.png"));
    const initialSnapshot = await motionSnapshot(page, `${viewportName}-reduced-motion-initial`);
    const initialContent = await contentMetrics(page);
    const scrollChecks = [];
    for (let index = 0; index < options.scrollRatios.length; index += 1) {
      const result = await scrollToRatio(page, options.scrollRatios[index], options.settleMs, options.scrollTolerance);
      const snapshot = await motionSnapshot(page, `${viewportName}-reduced-scroll-${String(index).padStart(2, "0")}-${result.status}`);
      scrollChecks.push({ ...result, snapshot, content: await contentMetrics(page) });
      if (result.targetRatio > 0 && ["unsupported", "not-applicable"].includes(result.status)) break;
    }
    await scrollToRatio(page, 0, options.settleMs, options.scrollTolerance);
    const finalSnapshot = await motionSnapshot(page, `${viewportName}-reduced-motion-final`);
    const finalContent = await contentMetrics(page);
    const full = await screenshot(page, path.join(reducedDirectory, "full-page-final.png"), { fullPage: true, timeout: Math.max(options.timeoutMs, 60_000) });
    const contentAvailable = finalContent.visibleMeaningful > 0 && (finalContent.bodyTextLength > 0 || finalContent.mediaElements > 0);
    const scrollStatuses = new Set(scrollChecks.map(({ status }) => status));
    const scrollStatus = scrollStatuses.has("missed") ? "partial" : scrollStatuses.has("unsupported") ? "unsupported" : "met";
    return {
      first,
      full,
      initialSnapshot,
      snapshot: finalSnapshot,
      scrollChecks,
      contentContract: { status: contentAvailable ? "met" : "partial", initial: initialContent, final: finalContent },
      contractStatus: !contentAvailable || scrollStatus === "partial" ? "partial" : scrollStatus,
      failures,
      droppedFailures: droppedFailures.count,
      networkPolicy: networkPolicyReport(networkGuard),
    };
  } finally {
    await context.close();
  }
}

export function viewportContractStatus(records, reducedMotion, networkViolations) {
  const issues = [];
  const warnings = [];
  if (records.some((record) => record.kind === "entrance" && record.missed)) issues.push("entrance-timing-missed");
  if (records.some((record) => record.kind === "entrance" && record.contract?.status === "failed")) issues.push("entrance-sample-failed");
  if (records.some((record) => record.kind === "scroll" && record.status === "missed")) issues.push("scroll-target-missed");
  if (records.some((record) => ["click", "hover"].includes(record.kind) && ["failed", "policy-blocked"].includes(record.status))) issues.push("interaction-incomplete");
  if (reducedMotion.contractStatus === "partial") issues.push("reduced-motion-contract-partial");
  if (networkViolations > 0 || reducedMotion.networkPolicy.violations.length > 0) warnings.push("network-policy-blocked-subresource");
  const unsupported = records.some((record) => record.kind === "scroll" && record.status === "unsupported") || reducedMotion.contractStatus === "unsupported";
  return { status: issues.length ? "partial" : unsupported ? "unsupported" : "complete", issues, warnings };
}

async function captureViewport(browser, target, options, root, viewportName) {
  const viewport = DEFAULT_VIEWPORTS[viewportName];
  const directory = path.join(root, viewportName);
  const videoDirectory = path.join(directory, "video-raw");
  await mkdir(directory, { recursive: true });
  const entrance = await captureIsolatedEntrance(browser, target, options, directory, viewportName, viewport);
  let records = [...entrance.records];

  if (options.video) await mkdir(videoDirectory, { recursive: true });
  const { context, networkGuard } = await createGuardedContext(browser, viewportName, viewport, options, "no-preference", options.video ? videoDirectory : null);
  if (options.trace) await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  const video = page.video();
  page.setDefaultTimeout(options.timeoutMs);
  const mainRuntime = attachRuntimeCollector(page);

  let traceStopped = false;
  let traceFile = null;
  try {
    const anchor = await navigateToPublicPage(page, target, options, networkGuard);
    const elapsed = await pagePerformanceNow(page) - anchor.performanceNowMs;
    await waitFor(page, Math.max(0, (options.entranceMs.at(-1) ?? 0) - elapsed));
    await waitForSettledPage(page);
    records.push(...await runOptInInteractions(browser, target, options, directory, viewportName, viewport));
    records.push(...await captureStoryboard(page, directory, options.scrollRatios, options.settleMs, options.scrollTolerance));
    await scrollToRatio(page, 0, options.settleMs, options.scrollTolerance);
    const fullPage = await screenshot(page, path.join(directory, "full-page-settled.png"), { fullPage: true, timeout: Math.max(options.timeoutMs, 60_000) });
    const finalSnapshot = await motionSnapshot(page, "settled-full-page");
    records.push({ kind: "settled", status: "met", image: fullPage, snapshot: finalSnapshot });
    if (options.trace) {
      await context.tracing.stop({ path: path.join(directory, "trace.zip") });
      traceStopped = true;
      traceFile = "trace.zip";
    }
  } finally {
    if (options.trace && !traceStopped) {
      const partialTrace = path.join(directory, "trace-partial.zip");
      await context.tracing.stop({ path: partialTrace }).then(() => { traceFile = path.basename(partialTrace); }).catch(() => {});
    }
    await context.close();
  }

  let videoFile = null;
  if (video) {
    const destination = path.join(directory, "motion.webm");
    await video.saveAs(destination);
    await video.delete().catch(() => {});
    videoFile = path.basename(destination);
    await rm(videoDirectory, { recursive: true, force: true });
  }

  const reducedMotion = await captureReducedMotion(browser, target, options, viewportName, viewport, directory);
  const snapshots = [
    ...records.map((record) => record.snapshot),
    reducedMotion.initialSnapshot,
    ...reducedMotion.scrollChecks.map((check) => check.snapshot),
    reducedMotion.snapshot,
  ].filter(Boolean);
  const networkPolicy = mergeNetworkPolicyReports([
    ...entrance.samples.map(({ networkPolicy }) => networkPolicy),
    networkPolicyReport(networkGuard),
  ]);
  const runtime = mergeRuntimeReports([
    ...entrance.samples.map(({ runtime: report }) => report),
    runtimeReport(mainRuntime),
  ]);
  const contract = viewportContractStatus(records, reducedMotion, networkPolicy.violations.length);
  return {
    viewport: viewportName,
    dimensions: viewport,
    contractStatus: contract.status,
    contractIssues: contract.issues,
    contractWarnings: contract.warnings,
    mediaSignals: snapshots[0]?.environmentSignals ?? null,
    records,
    video: videoFile,
    trace: traceFile,
    continuousMotion: {
      entranceAnchor: "navigation-commit",
      observedThroughTargetMs: options.entranceMs.at(-1) ?? 0,
      videoRecorded: Boolean(videoFile),
      storyboardSampling: "isolated-no-video-contexts",
    },
    reducedMotion,
    networkPolicy,
    runtime,
    summary: summarizeSnapshots(snapshots, { videoAvailable: Boolean(videoFile) }),
  };
}

function derivedRecord(referenceId, target, captureRoot, launchMode, evidenceTier, viewportReports) {
  const combinedSnapshots = viewportReports.flatMap((report) => [
    ...report.records.map((record) => record.snapshot),
    report.reducedMotion.initialSnapshot,
    ...report.reducedMotion.scrollChecks.map((check) => check.snapshot),
    report.reducedMotion.snapshot,
  ]).filter(Boolean);
  const summary = summarizeSnapshots(combinedSnapshots, { videoAvailable: viewportReports.some(({ video }) => Boolean(video)) });
  return {
    schemaVersion: SCRIPT_VERSION,
    id: referenceId,
    source: {
      url: target.publicUrl,
      capturedAt: new Date().toISOString(),
      sourceType: "live-public-interface",
      observationStatus: "machine-captured-needs-human-review",
    },
    evidence: {
      localCaptureId: path.basename(captureRoot),
      browser: "chromium-compatible",
      launchMode,
      evidenceTier,
      contractStatuses: viewportReports.map(({ viewport, contractStatus }) => ({ viewport, status: contractStatus })),
      viewports: viewportReports.map(({ viewport, dimensions }) => ({ viewport, ...dimensions })),
      rawArtifactsPublication: "private-reference-only",
    },
    mechanics: summary,
    promotion: {
      status: "candidate",
      requiredReview: [
        "Confirm the motion job and narrative role visually.",
        "Separate observed behavior from inference.",
        "Define mobile and reduced-motion adaptation.",
        "Reimplement with original code and owned or licensed assets.",
        "Do not publish raw third-party captures without documented rights.",
      ],
    },
    rights: {
      sourceOwnership: "third-party-or-unknown",
      permittedPublicSurface: "source-link-and-derived-mechanics-only",
      copiedCode: false,
      copiedAssets: false,
      copiedBrandCopy: false,
    },
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

async function writeCaptureIndex(root, manifest) {
  const sections = manifest.viewports.map((viewport) => {
    const images = [
      ...viewport.records.filter(({ image }) => Boolean(image)).map((record) => ({
        image: `${viewport.viewport}/${record.image}`,
        label: record.kind === "entrance"
          ? `entrance target ${record.targetMs}ms / actual ${record.actualMs}ms / ${record.contract.status}`
          : record.kind === "scroll" ? `scroll target ${record.targetRatio} / actual ${record.achievedRatio} / ${record.status}` : `${record.kind} / ${record.status ?? "observed"}`,
      })),
      { image: `${viewport.viewport}/reduced-motion/${viewport.reducedMotion.first}`, label: "reduced motion first viewport" },
      { image: `${viewport.viewport}/reduced-motion/${viewport.reducedMotion.full}`, label: "reduced motion full page" },
    ];
    return `<section><h2>${escapeHtml(viewport.viewport)} · ${escapeHtml(viewport.contractStatus)}</h2><div class="grid">${images.map(({ image, label }) => `<figure><img loading="lazy" src="${escapeHtml(image)}" alt=""><figcaption>${escapeHtml(label)} · ${escapeHtml(image)}</figcaption></figure>`).join("")}</div></section>`;
  }).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(manifest.id)} capture</title><style>body{font-family:system-ui;margin:0;background:#111;color:#eee}header,section{padding:2rem}a{color:#9fe3c2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}figure{margin:0;background:#1b1b1b;padding:.7rem;border-radius:.5rem}img{display:block;width:100%;height:auto;background:#333}figcaption{font-size:.75rem;line-height:1.4;margin-top:.6rem;color:#bbb}</style></head><body><header><h1>${escapeHtml(manifest.id)}</h1><p><a href="${escapeHtml(manifest.source.url)}">${escapeHtml(manifest.source.url)}</a></p><p>Local evidence only. Do not publish third-party captures without rights.</p></header>${sections}</body></html>`;
  await writeFile(path.join(root, "contact-sheet.html"), html, "utf8");
}

function overallCaptureStatus(failures, viewportReports) {
  if (!viewportReports.length) return "failed";
  if (failures.length) return "partial";
  const statuses = viewportReports.map(({ contractStatus }) => contractStatus);
  if (statuses.every((status) => status === "complete")) return "complete";
  if (statuses.every((status) => status === "unsupported")) return "unsupported";
  return "partial";
}

function redactDiagnostic(value) {
  return String(value)
    .replaceAll(os.homedir(), "[home]")
    .replaceAll(REPOSITORY_ROOT, "[repository]")
    .replaceAll(SKILL_ROOT, "[skill]")
    .slice(0, 1_000);
}

export async function scanReference(options) {
  assertCaptureAuthority(options);
  const target = normalizeTarget(options.url, options.allowQuery);
  await assertPublicNetworkUrl(target.navigationUrl);
  const outputRoot = await assertSafeOutputRoot(options.output);
  const referenceId = safeSlug(options.id ?? `${new URL(target.publicUrl).hostname}-${new URL(target.publicUrl).pathname}`);
  const captureId = `${timestamp()}-${sha256(target.publicUrl).slice(0, 8)}`;
  const captureRoot = path.resolve(outputRoot, referenceId, captureId);
  const contract = createCaptureContract(options, target);
  await mkdir(path.dirname(captureRoot), { recursive: true });
  await mkdir(captureRoot, { recursive: false });

  const { chromium } = await loadPlaywright();
  const { browser, launchMode } = await launchBrowser(chromium, options);
  const browserVersion = browser.version();
  const playwrightCoreVersion = await getPlaywrightVersion();
  const viewportReports = [];
  const failures = [];
  try {
    for (const viewportName of options.viewports) {
      try {
        viewportReports.push(await captureViewport(browser, target, options, captureRoot, viewportName));
      } catch (error) {
        failures.push({ viewport: viewportName, code: "viewport-capture-failed", message: redactDiagnostic(error.message) });
      }
    }
  } finally {
    await browser.close();
  }

  const rawArtifactBytes = await directorySize(captureRoot);
  const artifactBudgetBytes = Math.round(options.maxCaptureMb * 1024 * 1024);
  if (rawArtifactBytes > artifactBudgetBytes) {
    failures.push({
      scope: "capture",
      code: "artifact-budget-exceeded",
      message: `Capture used ${Math.round(rawArtifactBytes / 1024 / 1024)} MB before metadata; budget is ${options.maxCaptureMb} MB.`,
    });
  }

  const derived = derivedRecord(referenceId, target, captureRoot, launchMode, options.evidenceTier, viewportReports);
  const manifest = {
    schemaVersion: SCRIPT_VERSION,
    id: referenceId,
    captureId,
    source: {
      url: target.publicUrl,
      queryPresent: target.queryPresent,
      queryHash: target.queryHash,
      capturedAt: derived.source.capturedAt,
    },
    environment: {
      os: { platform: process.platform, release: os.release(), architecture: process.arch },
      node: process.version,
      playwrightCore: playwrightCoreVersion,
      browserName: "chromium",
      browserVersion,
      launchMode,
      evidenceTier: options.evidenceTier,
      locale: DEFAULT_LOCALE,
      timezoneId: DEFAULT_TIMEZONE_ID,
      colorProfile: options.evidenceTier === "benchmark" ? "forced-srgb" : "browser-default",
      headless: !options.headed,
      viewportSignals: viewportReports.map(({ viewport, mediaSignals }) => ({ viewport, ...mediaSignals })),
    },
    contract: {
      ...contract,
      optInClickCount: options.clicks.length,
      optInHoverCount: options.hovers.length,
    },
    artifacts: { rawBytesBeforeMetadata: rawArtifactBytes, finalBytes: null, budgetBytes: artifactBudgetBytes, withinBudget: rawArtifactBytes <= artifactBudgetBytes },
    publication: {
      rawArtifacts: "private-reference-only",
      derivedMechanics: "review-before-publication",
      warning: "A public URL does not grant republication rights. Publish raw captures only with documented permission or compatible licensing.",
    },
    viewports: viewportReports,
    failures,
    status: overallCaptureStatus(failures, viewportReports),
  };
  await writeFile(path.join(captureRoot, "derived-motion.json"), `${JSON.stringify(derived, null, 2)}\n`, "utf8");
  await writeFile(path.join(captureRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeCaptureIndex(captureRoot, manifest);
  for (let pass = 0; pass < 3; pass += 1) {
    const finalBytes = await directorySize(captureRoot);
    const exceeded = finalBytes > artifactBudgetBytes;
    const budgetFailure = failures.find(({ code }) => code === "artifact-budget-exceeded");
    if (exceeded && !budgetFailure) {
      failures.push({ scope: "capture", code: "artifact-budget-exceeded", message: "" });
    }
    const currentBudgetFailure = failures.find(({ code }) => code === "artifact-budget-exceeded");
    if (currentBudgetFailure) {
      currentBudgetFailure.message = `Capture used ${Math.round(finalBytes / 1024 / 1024)} MB including metadata; budget is ${options.maxCaptureMb} MB.`;
    }
    manifest.artifacts.finalBytes = finalBytes;
    manifest.artifacts.withinBudget = !exceeded;
    manifest.status = overallCaptureStatus(failures, viewportReports);
    await writeFile(path.join(captureRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeCaptureIndex(captureRoot, manifest);
  }
  return { captureRoot, manifest, derived };
}

export async function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  try {
    const result = await scanReference(options);
    process.stdout.write(`${JSON.stringify({
      status: result.manifest.status,
      id: result.manifest.id,
      captureId: result.manifest.captureId,
      resumeKey: result.manifest.contract.resumeKey,
      failures: result.manifest.failures,
    }, null, 2)}\n`);
    if (result.manifest.status === "failed") process.exitCode = 1;
    else if (result.manifest.status === "partial") process.exitCode = 3;
    else if (result.manifest.status === "unsupported") process.exitCode = 4;
  } catch (error) {
    const message = String(error?.code ?? "").startsWith("FDU_SCANNER_")
      ? error.message
      : redactDiagnostic(error.message);
    process.stderr.write(`Reference scan failed: ${message}\n`);
    process.exitCode = 1;
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) runCli();
