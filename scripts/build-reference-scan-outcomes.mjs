#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getDefaultPrivateEvidenceRoot } from "../frontend-design-ultra/scripts/evidence-paths.mjs";
import {
  assertSafeObservationOutput,
  inspectAttemptForObservation,
  loadRelevantAttempts,
  readJsonArtifact,
  safeArtifact,
} from "./build-reference-observations.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CAPTURE_ROOT = getDefaultPrivateEvidenceRoot();
const DEFAULT_OUTPUT = path.join(ROOT, "frontend-design-ultra", "assets", "reference-scan-outcomes.json");
const CORPUS_FILE = path.join(ROOT, "frontend-design-ultra", "assets", "reference-corpus.json");
const DEFAULT_MAX_AGE_DAYS = 14;
const MAX_PUBLIC_ARTIFACT_BYTES = 512 * 1024 * 1024;
const VIEWPORT_NAMES = ["desktop", "mobile"];
const ATTEMPT_STATUSES = ["complete", "partial", "failed", "unsupported"];
const VIEWPORT_STATUSES = ["complete", "partial", "unsupported", "missing"];
const SCAN_ISSUE_CODES = new Set([
  "entrance-timing-missed",
  "entrance-sample-failed",
  "scroll-target-missed",
  "interaction-incomplete",
  "reduced-motion-contract-partial",
  "viewport-capture-failed",
  "artifact-budget-exceeded",
]);
const PUBLIC_ISSUE_CODES = new Set([
  ...SCAN_ISSUE_CODES,
  "capture-contract-partial",
  "capture-contract-failed",
  "capture-contract-unsupported",
  "observation-freshness-window-exceeded",
  "observation-derived-record-unavailable",
  "observation-complete-contract-integrity-failed",
  "observation-artifact-integrity-failed",
  "other-capture-contract-issue",
]);
const PUBLIC_LIMITATION_CODES = new Set([
  "human-visual-review-required",
  "not-normal-observation-evidence",
  "incomplete-viewport-coverage",
  "unsupported-scroll-journey",
  "canvas-or-virtual-scroll-journey-unverified",
  "direct-timeline-introspection-unavailable",
  "continuous-video-unavailable",
  "zero-waapi-does-not-establish-zero-motion",
  "derived-mechanics-unavailable",
  "reduced-motion-runtime-errors-recorded",
  "network-policy-subresources-blocked",
  "complete-attempt-not-published-as-observation",
]);

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

export function parseArguments(argv) {
  const options = {
    captureRoot: DEFAULT_CAPTURE_ROOT,
    output: DEFAULT_OUTPUT,
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--help", "-h"].includes(argument)) {
      options.help = true;
    } else if (["--capture-root", "--output", "--max-age-days"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--capture-root") options.captureRoot = path.resolve(value);
      if (argument === "--output") options.output = path.resolve(value);
      if (argument === "--max-age-days") options.maxAgeDays = positiveNumber(value, argument);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/build-reference-scan-outcomes.mjs [options]",
    "",
    "Builds a sanitized diagnostic-only index from the newest relevant Capture",
    "Contract v2 attempt for each corpus reference. Non-complete attempts never",
    "become normal observations or motion-verification evidence.",
    "",
    "Options:",
    "  --capture-root <dir>     Private capture root (default: OS-local cache).",
    "  --output <file>          Sanitized JSON output outside that root.",
    "  --max-age-days <number>  Observation-eligibility freshness window (default: 14).",
    "  --help                   Show this help.",
    "",
  ].join("\n");
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function addAllowed(target, code, allowlist) {
  if (allowlist.has(code)) target.add(code);
}

function mappedEligibilityIssue(reason) {
  if (reason === "capture-not-fresh") return "observation-freshness-window-exceeded";
  if (reason === "derived-record-unavailable") return "observation-derived-record-unavailable";
  if (reason === "complete-capture-integrity-failed") return "observation-complete-contract-integrity-failed";
  if (["artifact-set-incomplete", "artifact-set-digest-failed"].includes(reason)) {
    return "observation-artifact-integrity-failed";
  }
  return null;
}

async function artifactPresent(root, relativePath) {
  if (typeof relativePath !== "string" || !relativePath) return false;
  return Boolean(await safeArtifact(root, relativePath, MAX_PUBLIC_ARTIFACT_BYTES));
}

async function countRecordArtifacts(root, records) {
  let captured = 0;
  for (const record of records) {
    if (record?.image && await artifactPresent(root, record.image)) captured += 1;
  }
  return captured;
}

function statusCount(records, statusAccessor, status) {
  return records.filter((record) => statusAccessor(record) === status).length;
}

async function viewportCoverage(attempt, viewportName) {
  const manifest = attempt.manifest;
  const requestedViewport = (manifest?.contract?.viewports ?? []).find(({ name }) => name === viewportName);
  const viewport = (manifest?.viewports ?? []).find((candidate) => candidate?.viewport === viewportName);
  const viewportRoot = path.join(attempt.directory, viewportName);
  const records = Array.isArray(viewport?.records) ? viewport.records : [];
  const entrance = records.filter(({ kind }) => kind === "entrance");
  const scroll = records.filter(({ kind }) => kind === "scroll");
  const interactions = records.filter(({ kind }) => ["click", "hover"].includes(kind));
  const settled = records.filter(({ kind }) => kind === "settled");
  const reducedRoot = path.join(viewportRoot, "reduced-motion");
  const reducedMotion = viewport?.reducedMotion;
  const requestedInteractions = nonnegativeInteger(manifest?.contract?.optInClickCount)
    + nonnegativeInteger(manifest?.contract?.optInHoverCount);
  const viewportStatus = VIEWPORT_STATUSES.includes(viewport?.contractStatus)
    ? viewport.contractStatus
    : "missing";

  return {
    viewport: viewportName,
    viewportStatus,
    entranceSamples: {
      requested: requestedViewport ? nonnegativeInteger(manifest?.contract?.entranceMs?.length) : 0,
      recorded: entrance.length,
      artifactsCaptured: await countRecordArtifacts(viewportRoot, entrance),
      met: statusCount(entrance, (record) => record?.contract?.status, "met"),
      missed: entrance.filter((record) => record?.missed === true || record?.contract?.status === "missed").length,
      failed: entrance.filter((record) => record?.status === "failed" || record?.contract?.status === "failed").length,
    },
    scrollSamples: {
      requested: requestedViewport ? nonnegativeInteger(manifest?.contract?.scrollRatios?.length) : 0,
      recorded: scroll.length,
      artifactsCaptured: await countRecordArtifacts(viewportRoot, scroll),
      met: statusCount(scroll, (record) => record?.status, "met"),
      missed: statusCount(scroll, (record) => record?.status, "missed"),
      unsupported: statusCount(scroll, (record) => record?.status, "unsupported"),
      notApplicable: statusCount(scroll, (record) => record?.status, "not-applicable"),
    },
    interactionSamples: {
      requested: requestedViewport ? requestedInteractions : 0,
      recorded: interactions.length,
      artifactsCaptured: await countRecordArtifacts(viewportRoot, interactions),
      met: statusCount(interactions, (record) => record?.status, "met"),
      failed: statusCount(interactions, (record) => record?.status, "failed"),
      policyBlocked: statusCount(interactions, (record) => record?.status, "policy-blocked"),
      notApplicable: statusCount(interactions, (record) => record?.status, "not-applicable"),
    },
    settledSamples: {
      requested: requestedViewport ? 1 : 0,
      recorded: settled.length,
      artifactsCaptured: await countRecordArtifacts(viewportRoot, settled),
      met: statusCount(settled, (record) => record?.status, "met"),
    },
    reducedMotionArtifacts: {
      requested: requestedViewport ? 2 : 0,
      captured: requestedViewport
        ? Number(await artifactPresent(reducedRoot, reducedMotion?.first))
          + Number(await artifactPresent(reducedRoot, reducedMotion?.full))
        : 0,
    },
    videoArtifacts: {
      requested: requestedViewport && manifest?.contract?.video === true ? 1 : 0,
      captured: requestedViewport && await artifactPresent(viewportRoot, viewport?.video) ? 1 : 0,
    },
    traceArtifacts: {
      requested: requestedViewport && manifest?.contract?.trace === true ? 1 : 0,
      captured: requestedViewport && await artifactPresent(viewportRoot, viewport?.trace) ? 1 : 0,
    },
    runtimeCounts: {
      consoleMessages: Array.isArray(viewport?.runtime?.consoleMessages) ? viewport.runtime.consoleMessages.length : 0,
      runtimeErrors: Array.isArray(viewport?.runtime?.runtimeErrors) ? viewport.runtime.runtimeErrors.length : 0,
      requestFailures: Array.isArray(viewport?.runtime?.requestFailures) ? viewport.runtime.requestFailures.length : 0,
      reducedMotionFailures: Array.isArray(reducedMotion?.failures) ? reducedMotion.failures.length : 0,
    },
  };
}

function deriveCodes(attempt, inspection, derived, coverage) {
  const issueCodes = new Set();
  const limitationCodes = new Set(["human-visual-review-required"]);
  const manifest = attempt.manifest;

  if (manifest.status === "partial") issueCodes.add("capture-contract-partial");
  if (manifest.status === "failed") issueCodes.add("capture-contract-failed");
  if (manifest.status === "unsupported") issueCodes.add("capture-contract-unsupported");

  for (const viewport of manifest.viewports ?? []) {
    for (const issue of viewport?.contractIssues ?? []) {
      addAllowed(issueCodes, SCAN_ISSUE_CODES.has(issue) ? issue : "other-capture-contract-issue", PUBLIC_ISSUE_CODES);
    }
    if ((viewport?.contractWarnings ?? []).includes("network-policy-blocked-subresource")) {
      limitationCodes.add("network-policy-subresources-blocked");
    }
    if (Array.isArray(viewport?.reducedMotion?.failures) && viewport.reducedMotion.failures.length > 0) {
      limitationCodes.add("reduced-motion-runtime-errors-recorded");
    }
  }
  for (const failure of manifest.failures ?? []) {
    addAllowed(
      issueCodes,
      SCAN_ISSUE_CODES.has(failure?.code) ? failure.code : "other-capture-contract-issue",
      PUBLIC_ISSUE_CODES,
    );
  }

  if (!inspection.eligible) {
    limitationCodes.add("not-normal-observation-evidence");
    const issue = mappedEligibilityIssue(inspection.reason);
    if (issue) issueCodes.add(issue);
    if (manifest.status === "complete") limitationCodes.add("complete-attempt-not-published-as-observation");
  }
  if (coverage.some(({ viewportStatus }) => ["partial", "missing"].includes(viewportStatus))) {
    limitationCodes.add("incomplete-viewport-coverage");
  }
  if (coverage.some(({ viewportStatus, scrollSamples }) =>
    viewportStatus === "unsupported" || scrollSamples.unsupported > 0)) {
    limitationCodes.add("unsupported-scroll-journey");
  }
  if (!derived) {
    limitationCodes.add("derived-mechanics-unavailable");
  } else {
    const mechanics = derived.mechanics;
    const measurement = mechanics?.measurementCoverage;
    if (measurement?.directRafOrGsapTimelineIntrospection !== true) {
      limitationCodes.add("direct-timeline-introspection-unavailable");
    }
    if (!coverage.some(({ videoArtifacts }) => videoArtifacts.captured > 0)) {
      limitationCodes.add("continuous-video-unavailable");
    }
    const directLibraryDetected = ["gsap", "three", "lenis"].some((key) => mechanics?.librarySignals?.[key] === true);
    if (nonnegativeInteger(mechanics?.sampledAnimationInstances) === 0 && directLibraryDetected) {
      limitationCodes.add("zero-waapi-does-not-establish-zero-motion");
    }
    const spatialSurfaceDetected = nonnegativeInteger(mechanics?.maximumCompositionSignals?.canvases) > 0
      || mechanics?.librarySignals?.three === true;
    if (spatialSurfaceDetected && limitationCodes.has("unsupported-scroll-journey")) {
      limitationCodes.add("canvas-or-virtual-scroll-journey-unverified");
    }
  }

  return {
    issueCodes: [...issueCodes].filter((code) => PUBLIC_ISSUE_CODES.has(code)).sort(),
    limitationCodes: [...limitationCodes].filter((code) => PUBLIC_LIMITATION_CODES.has(code)).sort(),
  };
}

function summaryCounts(outcomes) {
  const statusCounts = Object.fromEntries(
    ATTEMPT_STATUSES.map((status) => [status, outcomes.filter((outcome) => outcome.status === status).length]),
  );
  const eligibilityCounts = {
    eligibleCompleteObservation: outcomes.filter(({ eligibility }) =>
      eligibility === "eligible-complete-observation").length,
    diagnosticOnly: outcomes.filter(({ eligibility }) =>
      eligibility === "diagnostic-only").length,
  };
  const viewportStatusCounts = Object.fromEntries(
    VIEWPORT_STATUSES.map((status) => [
      status,
      outcomes.flatMap(({ viewportCoverage: coverage }) => coverage)
        .filter(({ viewportStatus }) => viewportStatus === status).length,
    ]),
  );
  return {
    relevantNewestAttempts: outcomes.length,
    statusCounts,
    eligibilityCounts,
    viewportStatusCounts,
  };
}

function assertNoRawLeak(result, captureRoot) {
  const serialized = JSON.stringify(result);
  const roots = [path.resolve(captureRoot), path.resolve(captureRoot).replaceAll("\\", "/")];
  if (roots.some((root) => root && serialized.includes(root))) {
    throw new Error("Sanitized scan outcomes leaked the raw capture root.");
  }
  if (/["'](?:captureId|localCaptureId|resumeKey|sourceUrl|artifactPath|filename|filePath)["']\s*:/.test(serialized)) {
    throw new Error("Sanitized scan outcomes leaked private capture metadata.");
  }
  if (/(?:file:\/\/\/|(?:^|["'\s])[A-Za-z]:[\\/]{2})/i.test(serialized)) {
    throw new Error("Sanitized scan outcomes leaked a local path.");
  }
}

export async function buildReferenceScanOutcomes(options = {}) {
  const captureRoot = path.resolve(options.captureRoot ?? DEFAULT_CAPTURE_ROOT);
  const output = await assertSafeObservationOutput(captureRoot, path.resolve(options.output ?? DEFAULT_OUTPUT));
  const maxAgeDays = positiveNumber(options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS, "maxAgeDays");
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const corpus = JSON.parse(await readFile(CORPUS_FILE, "utf8"));
  const outcomes = [];

  for (const entry of corpus.entries) {
    const attempts = await loadRelevantAttempts(path.join(captureRoot, entry.id), entry);
    if (!attempts.length) continue;
    const latest = attempts[0];
    const inspection = await inspectAttemptForObservation(latest, entry, { maxAgeDays, now });
    const derivedRecord = await readJsonArtifact(latest.directory, "derived-motion.json");
    const requestedViewports = new Set(
      (latest.manifest?.contract?.viewports ?? [])
        .map(({ name }) => name)
        .filter((name) => VIEWPORT_NAMES.includes(name)),
    );
    const actualViewports = new Set(
      (latest.manifest?.viewports ?? [])
        .map(({ viewport }) => viewport)
        .filter((name) => VIEWPORT_NAMES.includes(name)),
    );
    const viewportNames = VIEWPORT_NAMES.filter((name) => requestedViewports.has(name) || actualViewports.has(name));
    const coverage = [];
    for (const viewportName of viewportNames) coverage.push(await viewportCoverage(latest, viewportName));
    const codes = deriveCodes(latest, inspection, derivedRecord?.value ?? null, coverage);

    outcomes.push({
      refId: entry.id,
      capturedAt: latest.manifest.source.capturedAt,
      status: latest.manifest.status,
      eligibility: inspection.eligible ? "eligible-complete-observation" : "diagnostic-only",
      issues: codes.issueCodes,
      limitations: codes.limitationCodes,
      viewportCoverage: coverage,
      rights: {
        publicSurface: "sanitized-diagnostic-scan-metadata-only",
        rawArtifactsPublished: false,
        copiedCode: false,
        copiedAssets: false,
        usableForMotionVerification: false,
      },
    });
  }

  const result = {
    $schema: "./reference-scan-outcomes.schema.json",
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    sourceCorpusVersion: corpus.schemaVersion,
    publicationClass: "diagnostic-only",
    outcomeCount: outcomes.length,
    rightsPolicy: "sanitized-scan-metadata-only-no-raw-artifacts",
    summary: summaryCounts(outcomes),
    outcomes,
  };
  assertNoRawLeak(result, captureRoot);
  await mkdir(path.dirname(output), { recursive: true });
  await assertSafeObservationOutput(captureRoot, output);
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await buildReferenceScanOutcomes(options);
  process.stdout.write(
    `Wrote ${result.outcomeCount} sanitized diagnostic-only Capture Contract v2 outcomes.\n`,
  );
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Scan outcome build failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
