#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  assertCaptureAuthority,
  createCaptureContract,
  getPlaywrightVersion,
  normalizeTarget,
  parseArguments as parseScanArguments,
} from "../frontend-design-ultra/scripts/scan-reference.mjs";
import {
  assertNonSyncedEvidencePath,
  getDefaultPrivateEvidenceRoot,
} from "../frontend-design-ultra/scripts/evidence-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_FILE = path.join(ROOT, "frontend-design-ultra", "assets", "reference-corpus.json");
const SCANNER = path.join(ROOT, "scripts", "scan-reference.mjs");
const DEFAULT_OUTPUT = getDefaultPrivateEvidenceRoot();
const MAX_CHILD_OUTPUT_CHARS = 1_000_000;

function usage() {
  return `Usage:
  node scripts/scan-reference-corpus.mjs [options]

Options:
  --priority <value>         must-scan,high,standard,fallback (default: must-scan).
  --ids <id,id>              Scan explicit corpus ids instead of a priority.
  --output <directory>       Private, non-synchronized evidence root.
  --limit <number>           Stop after this many selected references.
  --viewports <list>         desktop,mobile (default: both).
  --delay-ms <number>        Polite delay between sites (default: 1500).
  --resume                   Skip ids with an existing complete capture.
  --resume-max-age-days <n>  Maximum resume age (default: 14).
  --site-timeout-ms <n>      Per-site watchdog (default: 900000).
  --evidence-tier <tier>     exploratory or benchmark.
  --browser <name>           auto, chromium, chrome, or msedge.
  --max-capture-mb <n>       Per-reference artifact budget (default: 300).
  --rights-basis <value>     Required capture authority classification.
  --rights-reviewed-at <d>   Required YYYY-MM-DD review date.
  --reviewer-id <id>         Required non-secret reviewer identifier.
  --no-video                 Disable videos.
  --trace                    Enable private diagnostic traces (default: off).
  --no-trace                 Legacy alias; traces are already off.
  --compact                  Use 4 entrance and 5 scroll samples.
  --help                     Show help.

Scanning is serial by design. Raw third-party evidence defaults to an OS-local
cache outside the repository and must not be published without rights.

Resume accepts only fresh, artifact-complete Capture Contract v2 manifests.
Complete, partial, unsupported, failed, and timed-out remain distinct ledger statuses.
`;
}

export function parseArguments(argv) {
  const options = {
    priority: "must-scan",
    ids: null,
    output: DEFAULT_OUTPUT,
    limit: Number.POSITIVE_INFINITY,
    viewports: "desktop,mobile",
    delayMs: 1_500,
    resume: false,
    resumeMaxAgeDays: 14,
    siteTimeoutMs: 900_000,
    evidenceTier: "exploratory",
    browser: "auto",
    maxCaptureMb: 300,
    rightsBasis: null,
    rightsReviewedAt: null,
    reviewerId: null,
    video: true,
    trace: false,
    compact: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--help", "-h"].includes(argument)) options.help = true;
    else if (argument === "--resume") options.resume = true;
    else if (argument === "--no-video") options.video = false;
    else if (argument === "--trace") options.trace = true;
    else if (argument === "--no-trace") options.trace = false;
    else if (argument === "--compact") options.compact = true;
    else if (["--priority", "--ids", "--output", "--limit", "--viewports", "--delay-ms", "--resume-max-age-days", "--site-timeout-ms", "--evidence-tier", "--browser", "--max-capture-mb", "--rights-basis", "--rights-reviewed-at", "--reviewer-id"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      index += 1;
      if (argument === "--priority") options.priority = value;
      else if (argument === "--ids") options.ids = value.split(",").map((item) => item.trim()).filter(Boolean);
      else if (argument === "--output") options.output = assertNonSyncedEvidencePath(value);
      else if (argument === "--limit") options.limit = Number(value);
      else if (argument === "--viewports") options.viewports = value;
      else if (argument === "--delay-ms") options.delayMs = Number(value);
      else if (argument === "--resume-max-age-days") options.resumeMaxAgeDays = Number(value);
      else if (argument === "--site-timeout-ms") options.siteTimeoutMs = Number(value);
      else if (argument === "--evidence-tier") options.evidenceTier = value;
      else if (argument === "--browser") options.browser = value;
      else if (argument === "--max-capture-mb") options.maxCaptureMb = Number(value);
      else if (argument === "--rights-basis") options.rightsBasis = value;
      else if (argument === "--rights-reviewed-at") options.rightsReviewedAt = value;
      else if (argument === "--reviewer-id") options.reviewerId = value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.ids && !["must-scan", "high", "standard", "fallback"].includes(options.priority)) throw new Error("Unsupported priority.");
  if (!(options.limit === Number.POSITIVE_INFINITY || (Number.isInteger(options.limit) && options.limit > 0))) throw new Error("--limit must be a positive integer.");
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0 || options.delayMs > 60_000) throw new Error("--delay-ms must be an integer from 0 to 60000.");
  if (!Number.isFinite(options.resumeMaxAgeDays) || options.resumeMaxAgeDays < 0.25 || options.resumeMaxAgeDays > 365) throw new Error("--resume-max-age-days must be from 0.25 to 365.");
  if (!Number.isInteger(options.siteTimeoutMs) || options.siteTimeoutMs < 30_000 || options.siteTimeoutMs > 3_600_000) throw new Error("--site-timeout-ms must be an integer from 30000 to 3600000.");
  if (!["exploratory", "benchmark"].includes(options.evidenceTier)) throw new Error("Unsupported evidence tier.");
  if (!["auto", "chromium", "chrome", "msedge"].includes(options.browser)) throw new Error("Unsupported browser.");
  if (options.evidenceTier === "benchmark" && !["auto", "chromium"].includes(options.browser)) throw new Error("Benchmark evidence requires Playwright Chromium.");
  if (!Number.isFinite(options.maxCaptureMb) || options.maxCaptureMb < 10 || options.maxCaptureMb > 10_000) throw new Error("--max-capture-mb must be from 10 to 10000.");
  assertCaptureAuthority(options);
  const viewports = options.viewports.split(",").map((value) => value.trim()).filter(Boolean);
  if (!viewports.length || viewports.some((value) => !["desktop", "mobile"].includes(value)) || new Set(viewports).size !== viewports.length) {
    throw new Error("--viewports must be a unique comma-separated subset of desktop,mobile.");
  }
  options.viewports = viewports.join(",");
  return options;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function artifactExists(root, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath)) return false;
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(path.resolve(root), resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return exists(resolved);
}

export function manifestMatchesResumeContract(manifest, expectedContract, playwrightVersion, maxAgeDays, now = Date.now()) {
  const capturedAt = Date.parse(manifest?.source?.capturedAt ?? "");
  const ageMs = now - capturedAt;
  return manifest?.status === "complete"
    && manifest?.source?.url === expectedContract.sourceUrl
    && manifest?.contract?.resumeKey === expectedContract.resumeKey
    && manifest?.environment?.playwrightCore === playwrightVersion
    && typeof manifest?.environment?.browserVersion === "string"
    && manifest.environment.browserVersion.length > 0
    && manifest?.environment?.evidenceTier === expectedContract.evidenceTier
    && (expectedContract.evidenceTier !== "benchmark" || manifest?.environment?.launchMode === "pinned-playwright-chromium")
    && manifest?.artifacts?.withinBudget === true
    && Number.isFinite(capturedAt)
    && ageMs >= -3_600_000
    && ageMs <= maxAgeDays * 86_400_000;
}

async function captureArtifactsComplete(directory, manifest) {
  if (!(await artifactExists(directory, "derived-motion.json")) || !(await artifactExists(directory, "contact-sheet.html"))) return false;
  const expectedViewports = (manifest.contract?.viewports ?? []).map(({ name }) => name).sort();
  const actualViewports = (manifest.viewports ?? []).map(({ viewport }) => viewport).sort();
  if (JSON.stringify(expectedViewports) !== JSON.stringify(actualViewports)) return false;
  for (const viewport of manifest.viewports ?? []) {
    if (!["desktop", "mobile"].includes(viewport.viewport)) return false;
    const viewportRoot = path.join(directory, viewport.viewport);
    for (const record of viewport.records ?? []) {
      if (record.image && !(await artifactExists(viewportRoot, record.image))) return false;
    }
    if (manifest.contract?.video && (!viewport.video || !(await artifactExists(viewportRoot, viewport.video)))) return false;
    if (manifest.contract?.trace && (!viewport.trace || !(await artifactExists(viewportRoot, viewport.trace)))) return false;
    if (!viewport.reducedMotion?.first || !(await artifactExists(path.join(viewportRoot, "reduced-motion"), viewport.reducedMotion.first))) return false;
    if (!viewport.reducedMotion?.full || !(await artifactExists(path.join(viewportRoot, "reduced-motion"), viewport.reducedMotion.full))) return false;
  }
  return (manifest.viewports ?? []).length > 0;
}

async function findCompatibleCapture(output, id, expectedContract, playwrightVersion, maxAgeDays) {
  const directory = path.join(output, id);
  if (!(await exists(directory))) return null;
  const captures = await readdir(directory, { withFileTypes: true });
  for (const capture of captures.filter((entry) => entry.isDirectory()).sort((left, right) => right.name.localeCompare(left.name))) {
    const captureDirectory = path.join(directory, capture.name);
    const manifestFile = path.join(captureDirectory, "manifest.json");
    if (!(await exists(manifestFile))) continue;
    try {
      const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
      if (manifestMatchesResumeContract(manifest, expectedContract, playwrightVersion, maxAgeDays)
        && await captureArtifactsComplete(captureDirectory, manifest)) return { captureId: capture.name, manifest };
    } catch {}
  }
  return null;
}

function appendBounded(current, chunk) {
  const combined = `${current}${chunk}`;
  return combined.length <= MAX_CHILD_OUTPUT_CHARS ? combined : combined.slice(-MAX_CHILD_OUTPUT_CHARS);
}

export function parseScannerSummary(stdout) {
  const source = String(stdout).trim();
  const starts = [0, ...[...source.matchAll(/\n\{/g)].map((match) => match.index + 1)];
  for (const start of starts.reverse()) {
    try {
      const parsed = JSON.parse(source.slice(start));
      if (["complete", "partial", "unsupported", "failed"].includes(parsed?.status)) return parsed;
    } catch {}
  }
  return null;
}

function runScanner(arguments_, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCANNER, ...arguments_], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let finished = false;
    let forceTimer = null;
    let abandonTimer = null;
    let watchdog = null;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      if (forceTimer) clearTimeout(forceTimer);
      if (abandonTimer) clearTimeout(abandonTimer);
      resolve(result);
    };
    child.stdout.on("data", (chunk) => {
      stdout = appendBounded(stdout, chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendBounded(stderr, chunk);
      process.stderr.write(chunk);
    });
    watchdog = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => {
        child.kill("SIGKILL");
        abandonTimer = setTimeout(() => finish({ code: null, signal: "watchdog-abandon", stdout, stderr, timedOut: true }), 2_000);
      }, 5_000);
    }, timeoutMs);
    child.on("error", (error) => finish({ code: null, stdout, stderr: appendBounded(stderr, error.message), timedOut }));
    child.on("close", (code, signal) => finish({ code, signal, stdout, stderr, timedOut }));
  });
}

async function wait(milliseconds) {
  if (milliseconds > 0) await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  options.output = assertNonSyncedEvidencePath(options.output);
  await mkdir(options.output, { recursive: true });
  const corpus = JSON.parse(await readFile(CORPUS_FILE, "utf8"));
  const selected = corpus.entries
    .filter((entry) => options.ids ? options.ids.includes(entry.id) : entry.scanPriority === options.priority)
    .slice(0, options.limit);
  const unknownIds = options.ids?.filter((id) => !corpus.entries.some((entry) => entry.id === id)) ?? [];
  if (unknownIds.length) throw new Error(`Unknown corpus ids: ${unknownIds.join(", ")}`);
  const playwrightVersion = await getPlaywrightVersion();

  const ledger = {
    schemaVersion: 2,
    startedAt: new Date().toISOString(),
    selection: { priority: options.priority, ids: options.ids, count: selected.length },
    policy: "serial-public-page-reference-scan-with-contract-resume-and-watchdog",
    contract: {
      evidenceTier: options.evidenceTier,
      browser: options.browser,
      resumeMaxAgeDays: options.resumeMaxAgeDays,
      siteTimeoutMs: options.siteTimeoutMs,
      trace: options.trace,
      video: options.video,
      maxCaptureMb: options.maxCaptureMb,
      rightsBasis: options.rightsBasis,
      rightsReviewedAt: options.rightsReviewedAt,
      reviewerId: options.reviewerId,
      playwrightCore: playwrightVersion,
    },
    results: [],
  };
  for (let index = 0; index < selected.length; index += 1) {
    const entry = selected[index];
    const scanId = entry.id;
    const arguments_ = [
      "--url", entry.sourceUrl,
      "--id", scanId,
      "--output", options.output,
      "--viewports", options.viewports,
      "--evidence-tier", options.evidenceTier,
      "--browser", options.browser,
      "--max-capture-mb", String(options.maxCaptureMb),
      "--rights-basis", options.rightsBasis,
      "--rights-reviewed-at", options.rightsReviewedAt,
      "--reviewer-id", options.reviewerId,
    ];
    if (!options.video) arguments_.push("--no-video");
    if (options.trace) arguments_.push("--trace");
    if (options.compact) arguments_.push("--entrance-ms", "0,400,1400,3500", "--scroll-ratios", "0,0.25,0.5,0.75,1");
    const scanOptions = parseScanArguments(arguments_);
    const expectedContract = createCaptureContract(scanOptions, normalizeTarget(entry.sourceUrl, false));
    const compatibleCapture = options.resume
      ? await findCompatibleCapture(options.output, scanId, expectedContract, playwrightVersion, options.resumeMaxAgeDays)
      : null;
    if (compatibleCapture) {
      process.stdout.write(`SKIP ${scanId} compatible complete capture ${compatibleCapture.captureId}\n`);
      ledger.results.push({ id: scanId, status: "skipped-compatible", captureId: compatibleCapture.captureId, resumeKey: expectedContract.resumeKey });
      continue;
    }
    process.stdout.write(`SCAN ${index + 1}/${selected.length} ${scanId} ${entry.title}\n`);
    const result = await runScanner(arguments_, options.siteTimeoutMs);
    const scannerSummary = parseScannerSummary(result.stdout);
    const status = result.timedOut ? "timed-out" : scannerSummary?.status ?? "failed";
    ledger.results.push({
      id: scanId,
      status,
      exitCode: result.code,
      signal: result.signal ?? null,
      captureId: scannerSummary?.captureId ?? null,
      resumeKey: scannerSummary?.resumeKey ?? expectedContract.resumeKey,
      outputParsed: Boolean(scannerSummary),
    });
    if (index < selected.length - 1) await wait(options.delayMs);
  }
  ledger.finishedAt = new Date().toISOString();
  ledger.summary = Object.fromEntries(
    ["complete", "partial", "unsupported", "failed", "timed-out", "skipped-compatible"]
      .map((status) => [status, ledger.results.filter((result) => result.status === status).length]),
  );
  await writeFile(path.join(options.output, `corpus-run-${ledger.startedAt.replace(/[:.]/g, "-")}.json`), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  if (ledger.summary.partial || ledger.summary.unsupported || ledger.summary.failed || ledger.summary["timed-out"]) process.exitCode = 1;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Corpus scan failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
