#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getDefaultPrivateEvidenceRoot } from "../frontend-design-ultra/scripts/evidence-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CAPTURE_ROOT = getDefaultPrivateEvidenceRoot();
const DEFAULT_OUTPUT = path.join(ROOT, "frontend-design-ultra", "assets", "reference-observations.json");
const CORPUS_FILE = path.join(ROOT, "frontend-design-ultra", "assets", "reference-corpus.json");
const CAPTURE_CONTRACT_VERSION = 2;
const DEFAULT_MAX_AGE_DAYS = 14;
const MAX_METADATA_BYTES = 64 * 1024 * 1024;
const MAX_AGGREGATE_ARTIFACT_BYTES = 512 * 1024 * 1024;
const MAX_AGGREGATE_TOTAL_BYTES = 1024 * 1024 * 1024;
const MAX_AGGREGATE_ARTIFACTS = 512;
const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
const REFERENCE_ID_PATTERN = /^ref-[0-9]{3}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMPLETE_FALLBACK_STATUSES = new Set(["partial", "failed"]);
const CAPTURE_STATUSES = new Set(["complete", "partial", "failed", "unsupported"]);
const EVIDENCE_TIERS = new Set(["exploratory", "benchmark"]);
const EXPLORATORY_LAUNCH_MODES = new Set([
  "bundled-chromium",
  "channel:chrome",
  "channel:msedge",
  "explicit-executable",
  "system-executable",
]);
const DURATION_BUCKETS = ["instant", "micro", "component", "section", "signature", "unknown"];
const COMPOSITION_SIGNALS = ["animations", "sticky", "fixed", "canvases", "videos", "clipped"];
const LIBRARY_SIGNALS = ["gsap", "scrollTrigger", "lenis", "locomotiveScroll", "barba", "three", "webflow", "swiper", "motion"];
const CANDIDATE_MECHANICS = new Set([
  "sticky-scroll-chapter",
  "cinematic-media-sequence",
  "canvas-spatial-stage",
  "mask-or-curtain-reveal",
  "staged-transform-opacity-reveal",
  "route-transition",
  "layered-fixed-chrome",
]);
export const EVIDENCE_DIGEST_ALGORITHM = "sha256-aggregate-artifact-set-v1";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

async function nearestExistingPath(candidate) {
  let current = path.resolve(candidate);
  while (!(await exists(current))) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

async function projectedRealPath(candidate) {
  const resolved = path.resolve(candidate);
  const existing = await nearestExistingPath(resolved);
  const realExisting = await realpath(existing).catch(() => existing);
  return path.resolve(realExisting, path.relative(existing, resolved));
}

export async function assertSafeObservationOutput(captureRoot, output) {
  const resolvedCaptureRoot = path.resolve(captureRoot);
  const resolvedOutput = path.resolve(output);
  if (path.extname(resolvedOutput).toLowerCase() !== ".json") {
    throw new Error("Observation output must be a JSON file.");
  }
  if (isPathInside(resolvedCaptureRoot, resolvedOutput)) {
    throw new Error("Sanitized observation output must remain outside the raw capture root.");
  }
  const [realCaptureRoot, realOutput] = await Promise.all([
    projectedRealPath(resolvedCaptureRoot),
    projectedRealPath(resolvedOutput),
  ]);
  if (isPathInside(realCaptureRoot, realOutput)) {
    throw new Error("Sanitized observation output resolves through a link into the raw capture root.");
  }
  return resolvedOutput;
}

function canonicalPublicSource(value) {
  if (typeof value !== "string") return null;
  try {
    const source = new URL(value);
    if (!["http:", "https:"].includes(source.protocol) || source.username || source.password || source.search || source.hash) return null;
    return source.href;
  } catch {
    return null;
  }
}

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(label + " must be a positive number.");
  return parsed;
}

export function parseArguments(argv) {
  const options = {
    captureRoot: DEFAULT_CAPTURE_ROOT,
    output: DEFAULT_OUTPUT,
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
    allowOlderCompleteAfterFailure: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--help", "-h"].includes(argument)) {
      options.help = true;
    } else if (argument === "--allow-older-complete-after-failure") {
      options.allowOlderCompleteAfterFailure = true;
    } else if (["--capture-root", "--output", "--max-age-days"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(argument + " requires a value.");
      if (argument === "--capture-root") options.captureRoot = path.resolve(value);
      if (argument === "--output") options.output = path.resolve(value);
      if (argument === "--max-age-days") options.maxAgeDays = positiveNumber(value, argument);
      index += 1;
    } else {
      throw new Error("Unknown argument: " + argument);
    }
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/build-reference-observations.mjs [options]",
    "",
    "Builds a sanitized public mechanics index from fresh Capture Contract v2 evidence.",
    "Capture Contract v1 is never eligible. The default selection requires the newest",
    "relevant v2 attempt to be complete, artifact-complete, source-consistent, and fresh.",
    "",
    "Options:",
    "  --capture-root <dir>                         Private capture root (default: OS-local cache).",
    "  --output <file>                              Sanitized JSON output outside that root.",
    "  --max-age-days <number>                      Freshness window (default: 14).",
    "  --allow-older-complete-after-failure         Explicitly permit an older fresh v2-complete",
    "                                                only when the newer partial/failed attempt has",
    "                                                the exact same resumeKey and capture profile.",
    "  --help                                       Show this help.",
    "",
    "When the explicit fallback is used, capturedAt and evidenceDigest continue to identify",
    "the older selected evidence. Raw screenshots, videos, traces, paths, capture IDs, exact",
    "keyframes, host-derived content, and local filenames are never emitted.",
    "",
  ].join("\n");
}

export async function safeArtifact(root, relativePath, maxBytes = Number.POSITIVE_INFINITY) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!isPathInside(resolvedRoot, resolved)) return null;
  try {
    const info = await lstat(resolved);
    if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size > maxBytes) return null;
    const [realRoot, realFile] = await Promise.all([realpath(resolvedRoot), realpath(resolved)]);
    if (!isPathInside(realRoot, realFile)) return null;
    return {
      file: resolved,
      root: resolvedRoot,
      size: info.size,
      mtimeMs: info.mtimeMs,
      dev: info.dev,
      ino: info.ino,
    };
  } catch {
    return null;
  }
}

export async function readJsonArtifact(root, relativePath) {
  const artifact = await safeArtifact(root, relativePath, MAX_METADATA_BYTES);
  if (!artifact) return null;
  try {
    const source = await readFile(artifact.file, "utf8");
    const value = JSON.parse(source);
    return isPlainObject(value) ? { value, source } : null;
  } catch {
    return null;
  }
}

function sourceFieldsMatch(manifest, derived, expectedSource) {
  const expected = canonicalPublicSource(expectedSource);
  if (!expected) return false;
  if (canonicalPublicSource(manifest?.source?.url) !== expected) return false;
  if (canonicalPublicSource(manifest?.contract?.sourceUrl) !== expected) return false;
  if (derived && canonicalPublicSource(derived?.source?.url) !== expected) return false;
  return true;
}

function captureTime(manifest) {
  return Date.parse(manifest?.source?.capturedAt ?? "");
}

export function isFresh(manifest, maxAgeDays, now) {
  const capturedAt = captureTime(manifest);
  const ageMs = now - capturedAt;
  return Number.isFinite(capturedAt)
    && ageMs >= -MAX_FUTURE_SKEW_MS
    && ageMs <= maxAgeDays * 86_400_000;
}

function launchProfileIsConsistent(manifest, derived = null) {
  const tier = manifest?.environment?.evidenceTier;
  const launchMode = manifest?.environment?.launchMode;
  if (!EVIDENCE_TIERS.has(tier) || manifest?.contract?.evidenceTier !== tier) return false;
  if (manifest?.environment?.browserName !== "chromium") return false;
  if (typeof manifest?.environment?.browserVersion !== "string" || !manifest.environment.browserVersion) return false;
  if (typeof manifest?.environment?.playwrightCore !== "string" || !manifest.environment.playwrightCore) return false;
  if (manifest?.environment?.locale !== manifest?.contract?.locale) return false;
  if (manifest?.environment?.timezoneId !== manifest?.contract?.timezoneId) return false;
  if (tier === "benchmark") {
    if (launchMode !== "pinned-playwright-chromium") return false;
    if (manifest?.contract?.browserRequest !== "pinned-playwright-chromium") return false;
    if (manifest?.environment?.colorProfile !== "forced-srgb") return false;
  } else if (!EXPLORATORY_LAUNCH_MODES.has(launchMode)) {
    return false;
  }
  if (launchMode === "explicit-executable" && !SHA256_PATTERN.test(manifest?.contract?.executablePathHash ?? "")) return false;
  if (derived) {
    if (derived?.evidence?.evidenceTier !== tier || derived?.evidence?.launchMode !== launchMode) return false;
  }
  return true;
}

function isRelevantV2Attempt(manifest, entry) {
  const capturedAt = captureTime(manifest);
  const rightsReview = manifest?.contract?.rightsReview;
  return manifest?.schemaVersion === CAPTURE_CONTRACT_VERSION
    && manifest?.contract?.version === CAPTURE_CONTRACT_VERSION
    && manifest?.contract?.scannerVersion === CAPTURE_CONTRACT_VERSION
    && manifest?.id === entry.id
    && CAPTURE_STATUSES.has(manifest?.status)
    && SHA256_PATTERN.test(manifest?.contract?.resumeKey ?? "")
    && isPlainObject(rightsReview)
    && typeof rightsReview.basis === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(rightsReview.reviewedAt ?? "")
    && typeof rightsReview.reviewerId === "string"
    && rightsReview.reviewerId.length >= 2
    && rightsReview.legalConclusion === false
    && ["private-capture-only-no-republication", "publication-requires-separate-license-scope-check"].includes(rightsReview.publicationPolicy)
    && sourceFieldsMatch(manifest, null, entry.sourceUrl)
    && Number.isFinite(capturedAt);
}

function sameCaptureProfile(left, right) {
  return left?.contract?.resumeKey === right?.contract?.resumeKey
    && left?.environment?.evidenceTier === right?.environment?.evidenceTier
    && left?.environment?.launchMode === right?.environment?.launchMode
    && left?.environment?.playwrightCore === right?.environment?.playwrightCore
    && left?.contract?.sourceUrl === right?.contract?.sourceUrl;
}

function equalViewportDimensions(contractViewport, dimensions) {
  return dimensions?.width === contractViewport?.width
    && dimensions?.height === contractViewport?.height
    && dimensions?.deviceScaleFactor === contractViewport?.deviceScaleFactor
    && dimensions?.isMobile === contractViewport?.isMobile
    && dimensions?.hasTouch === contractViewport?.hasTouch
    && dimensions?.profile === contractViewport?.profile
    && dimensions?.screen?.width === contractViewport?.screen?.width
    && dimensions?.screen?.height === contractViewport?.screen?.height;
}

function sameNumberSequence(actual, expected) {
  return Array.isArray(actual)
    && Array.isArray(expected)
    && actual.length === expected.length
    && actual.every((value, index) => Number(value) === Number(expected[index]));
}

async function viewportArtifactsComplete(captureDirectory, manifest, viewport, contractViewport) {
  if (viewport?.contractStatus !== "complete") return false;
  if (!Array.isArray(viewport?.contractIssues) || viewport.contractIssues.length !== 0) return false;
  if (!equalViewportDimensions(contractViewport, viewport?.dimensions)) return false;
  if (!Array.isArray(viewport?.records)) return false;
  const viewportRoot = path.join(captureDirectory, viewport.viewport);
  const entrance = viewport.records.filter(({ kind }) => kind === "entrance");
  const scroll = viewport.records.filter(({ kind }) => kind === "scroll");
  const settled = viewport.records.filter(({ kind }) => kind === "settled");
  if (!sameNumberSequence(entrance.map(({ targetMs }) => targetMs), manifest.contract.entranceMs)) return false;
  if (!sameNumberSequence(scroll.map(({ targetRatio }) => targetRatio), manifest.contract.scrollRatios)) return false;
  if (settled.length !== 1 || settled[0].status !== "met" || !settled[0].image) return false;
  for (const record of entrance) {
    if (record?.missed !== false || record?.contract?.status !== "met" || !record?.image) return false;
  }
  for (const record of scroll) {
    if (!["met", "not-applicable"].includes(record?.status)) return false;
    if (record.status === "met" && !record.image) return false;
  }
  for (const record of viewport.records) {
    if (record.image && !(await safeArtifact(viewportRoot, record.image))) return false;
  }
  if (manifest.contract.video && (!viewport.video || !(await safeArtifact(viewportRoot, viewport.video)))) return false;
  if (manifest.contract.trace && (!viewport.trace || !(await safeArtifact(viewportRoot, viewport.trace)))) return false;
  const reducedRoot = path.join(viewportRoot, "reduced-motion");
  if (viewport?.reducedMotion?.contractStatus !== "met") return false;
  if (viewport?.reducedMotion?.contentContract?.status !== "met") return false;
  if (!Array.isArray(viewport?.reducedMotion?.failures) || viewport.reducedMotion.failures.length !== 0) return false;
  if (!viewport?.reducedMotion?.first || !(await safeArtifact(reducedRoot, viewport.reducedMotion.first))) return false;
  if (!viewport?.reducedMotion?.full || !(await safeArtifact(reducedRoot, viewport.reducedMotion.full))) return false;
  return true;
}

async function artifactCompleteCapture(captureDirectory, directoryName, manifest, derived, entry) {
  if (manifest?.status !== "complete" || !Array.isArray(manifest?.failures) || manifest.failures.length !== 0) return false;
  if (!launchProfileIsConsistent(manifest, derived)) return false;
  if (!sourceFieldsMatch(manifest, derived, entry.sourceUrl)) return false;
  if (manifest?.captureId !== directoryName || derived?.evidence?.localCaptureId !== directoryName) return false;
  if (derived?.schemaVersion !== CAPTURE_CONTRACT_VERSION || derived?.id !== entry.id) return false;
  if (derived?.source?.capturedAt !== manifest?.source?.capturedAt) return false;
  if (derived?.source?.sourceType !== "live-public-interface") return false;
  if (derived?.source?.observationStatus !== "machine-captured-needs-human-review") return false;
  if (manifest?.publication?.rawArtifacts !== "private-reference-only") return false;
  if (manifest?.publication?.derivedMechanics !== "review-before-publication") return false;
  if (derived?.evidence?.rawArtifactsPublication !== "private-reference-only") return false;
  if (!isPlainObject(derived?.mechanics)) return false;
  const artifacts = manifest?.artifacts;
  if (artifacts?.withinBudget !== true) return false;
  if (!Number.isInteger(artifacts?.rawBytesBeforeMetadata) || artifacts.rawBytesBeforeMetadata < 0) return false;
  if (!Number.isInteger(artifacts?.finalBytes) || artifacts.finalBytes <= 0) return false;
  if (!Number.isInteger(artifacts?.budgetBytes) || artifacts.budgetBytes <= 0 || artifacts.finalBytes > artifacts.budgetBytes) return false;
  if (!(await safeArtifact(captureDirectory, "contact-sheet.html"))) return false;

  const contractViewports = manifest?.contract?.viewports;
  const viewports = manifest?.viewports;
  if (!Array.isArray(contractViewports) || !contractViewports.length || !Array.isArray(viewports)) return false;
  const expectedNames = contractViewports.map(({ name }) => name);
  const actualNames = viewports.map(({ viewport }) => viewport);
  if (new Set(expectedNames).size !== expectedNames.length || !expectedNames.every((name) => ["desktop", "mobile"].includes(name))) return false;
  if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) return false;
  if (!Array.isArray(manifest?.contract?.entranceMs) || !manifest.contract.entranceMs.length) return false;
  if (!Array.isArray(manifest?.contract?.scrollRatios) || !manifest.contract.scrollRatios.length) return false;
  for (let index = 0; index < viewports.length; index += 1) {
    if (!(await viewportArtifactsComplete(captureDirectory, manifest, viewports[index], contractViewports[index]))) return false;
  }

  const derivedStatuses = derived?.evidence?.contractStatuses;
  const derivedViewports = derived?.evidence?.viewports;
  if (!Array.isArray(derivedStatuses) || !Array.isArray(derivedViewports)) return false;
  if (JSON.stringify(derivedStatuses) !== JSON.stringify(expectedNames.map((viewport) => ({ viewport, status: "complete" })))) return false;
  if (derivedViewports.length !== contractViewports.length) return false;
  for (let index = 0; index < derivedViewports.length; index += 1) {
    if (derivedViewports[index]?.viewport !== expectedNames[index]) return false;
    if (!equalViewportDimensions(contractViewports[index], derivedViewports[index])) return false;
  }
  return true;
}

async function safeCaptureDirectory(referenceDirectory, entry) {
  if (!entry.isDirectory() || entry.isSymbolicLink()) return null;
  const directory = path.resolve(referenceDirectory, entry.name);
  if (!isPathInside(referenceDirectory, directory)) return null;
  try {
    const [realReference, realDirectory] = await Promise.all([realpath(referenceDirectory), realpath(directory)]);
    return isPathInside(realReference, realDirectory) ? directory : null;
  } catch {
    return null;
  }
}

export async function loadRelevantAttempts(referenceDirectory, entry) {
  if (!(await exists(referenceDirectory))) return [];
  const directories = await readdir(referenceDirectory, { withFileTypes: true });
  const attempts = [];
  for (const directoryEntry of directories) {
    const directory = await safeCaptureDirectory(referenceDirectory, directoryEntry);
    if (!directory) continue;
    const manifestRecord = await readJsonArtifact(directory, "manifest.json");
    if (!manifestRecord || !isRelevantV2Attempt(manifestRecord.value, entry)) continue;
    attempts.push({
      directory,
      directoryName: directoryEntry.name,
      manifest: manifestRecord.value,
      manifestSource: manifestRecord.source,
      capturedAtMs: captureTime(manifestRecord.value),
    });
  }
  return attempts.sort((left, right) => right.capturedAtMs - left.capturedAtMs || right.directoryName.localeCompare(left.directoryName, "en"));
}

async function collectCompleteCaptureArtifactSet(captureDirectory, manifest) {
  const artifacts = [];
  const canonicalFiles = new Set();
  let totalBytes = 0;
  const declaredBudget = Number.isInteger(manifest?.artifacts?.budgetBytes)
    ? manifest.artifacts.budgetBytes
    : 0;
  const maximumTotalBytes = Math.min(declaredBudget, MAX_AGGREGATE_TOTAL_BYTES);

  const addArtifact = async (root, relativePath, role, maxBytes = MAX_AGGREGATE_ARTIFACT_BYTES) => {
    const artifact = await safeArtifact(root, relativePath, maxBytes);
    if (!artifact) return false;
    const canonicalFile = await realpath(artifact.file).catch(() => null);
    if (!canonicalFile) return false;
    if (canonicalFiles.has(canonicalFile)) return true;
    canonicalFiles.add(canonicalFile);
    artifacts.push({ ...artifact, role });
    totalBytes += artifact.size;
    return artifacts.length <= MAX_AGGREGATE_ARTIFACTS
      && maximumTotalBytes > 0
      && totalBytes <= maximumTotalBytes;
  };

  if (!(await addArtifact(captureDirectory, "manifest.json", "metadata:manifest", MAX_METADATA_BYTES))) return null;
  if (!(await addArtifact(captureDirectory, "derived-motion.json", "metadata:derived-motion", MAX_METADATA_BYTES))) return null;
  if (!(await addArtifact(captureDirectory, "contact-sheet.html", "artifact:contact-sheet", MAX_METADATA_BYTES))) return null;

  for (let viewportIndex = 0; viewportIndex < manifest.viewports.length; viewportIndex += 1) {
    const viewport = manifest.viewports[viewportIndex];
    const viewportRoot = path.join(captureDirectory, viewport.viewport);
    for (let recordIndex = 0; recordIndex < viewport.records.length; recordIndex += 1) {
      const record = viewport.records[recordIndex];
      if (record.image && !(await addArtifact(
        viewportRoot,
        record.image,
        `viewport:${viewportIndex}:record:${recordIndex}:image`,
      ))) return null;
    }
    if (viewport.video && !(await addArtifact(viewportRoot, viewport.video, `viewport:${viewportIndex}:video`))) return null;
    if (viewport.trace && !(await addArtifact(viewportRoot, viewport.trace, `viewport:${viewportIndex}:trace`))) return null;
    const reducedRoot = path.join(viewportRoot, "reduced-motion");
    if (!(await addArtifact(
      reducedRoot,
      viewport.reducedMotion.first,
      `viewport:${viewportIndex}:reduced-motion:first`,
    ))) return null;
    if (!(await addArtifact(
      reducedRoot,
      viewport.reducedMotion.full,
      `viewport:${viewportIndex}:reduced-motion:full`,
    ))) return null;
  }
  return artifacts.sort((left, right) => left.role.localeCompare(right.role, "en"));
}

async function aggregateArtifactSetDigest(artifacts) {
  const hash = createHash("sha256");
  hash.update(`${EVIDENCE_DIGEST_ALGORITHM}\0`, "utf8");
  for (const artifact of artifacts) {
    hash.update(`${JSON.stringify({ role: artifact.role, size: artifact.size })}\0`, "utf8");
    let bytesRead = 0;
    for await (const chunk of createReadStream(artifact.file)) {
      bytesRead += chunk.length;
      if (bytesRead > artifact.size) throw new Error("Evidence artifact changed while hashing.");
      hash.update(chunk);
    }
    if (bytesRead !== artifact.size) throw new Error("Evidence artifact size changed while hashing.");
    const postInfo = await lstat(artifact.file);
    const [realRoot, realFile] = await Promise.all([realpath(artifact.root), realpath(artifact.file)]);
    if (!postInfo.isFile()
      || postInfo.isSymbolicLink()
      || postInfo.size !== artifact.size
      || postInfo.mtimeMs !== artifact.mtimeMs
      || postInfo.dev !== artifact.dev
      || postInfo.ino !== artifact.ino
      || !isPathInside(realRoot, realFile)) {
      throw new Error("Evidence artifact changed or escaped its capture root while hashing.");
    }
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export async function inspectAttemptForObservation(attempt, entry, options = {}) {
  const maxAgeDays = positiveNumber(options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS, "maxAgeDays");
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  if (attempt?.manifest?.status !== "complete") {
    return { eligible: false, reason: "attempt-not-complete" };
  }
  if (!isFresh(attempt.manifest, maxAgeDays, now)) {
    return { eligible: false, reason: "capture-not-fresh" };
  }
  const derivedRecord = await readJsonArtifact(attempt.directory, "derived-motion.json");
  if (!derivedRecord) return { eligible: false, reason: "derived-record-unavailable" };
  if (!(await artifactCompleteCapture(
    attempt.directory,
    attempt.directoryName,
    attempt.manifest,
    derivedRecord.value,
    entry,
  ))) {
    return { eligible: false, reason: "complete-capture-integrity-failed" };
  }
  const artifactSet = await collectCompleteCaptureArtifactSet(attempt.directory, attempt.manifest);
  if (!artifactSet) return { eligible: false, reason: "artifact-set-incomplete" };
  try {
    return {
      eligible: true,
      capture: {
        manifest: attempt.manifest,
        derived: derivedRecord.value,
        digest: await aggregateArtifactSetDigest(artifactSet),
        artifactCount: artifactSet.length,
      },
    };
  } catch {
    return { eligible: false, reason: "artifact-set-digest-failed" };
  }
}

async function strictCompleteCandidate(attempt, entry, maxAgeDays, now) {
  const inspection = await inspectAttemptForObservation(attempt, entry, { maxAgeDays, now });
  return inspection.eligible ? inspection.capture : null;
}

export async function selectCaptureForObservation(referenceDirectory, entry, options = {}) {
  const maxAgeDays = positiveNumber(options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS, "maxAgeDays");
  const allowOlderCompleteAfterFailure = options.allowOlderCompleteAfterFailure === true;
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const attempts = await loadRelevantAttempts(path.resolve(referenceDirectory), entry);
  if (!attempts.length) {
    return { status: "skipped", reason: "no-contract-v2-attempt" };
  }
  const latest = attempts[0];
  let selectedAttempt = null;
  let selectedCapture = null;
  for (const attempt of attempts) {
    const capture = await strictCompleteCandidate(attempt, entry, maxAgeDays, now);
    if (capture) {
      selectedAttempt = attempt;
      selectedCapture = capture;
      break;
    }
  }
  if (!selectedCapture) {
    return { status: "skipped", reason: "no-fresh-artifact-complete-v2" };
  }
  const baseDecision = {
    selectedCapturedAt: selectedCapture.manifest.source.capturedAt,
    freshnessMaxAgeDays: maxAgeDays,
  };
  if (latest === selectedAttempt) {
    return {
      status: "selected",
      reason: "latest-fresh-artifact-complete-v2",
      capture: selectedCapture,
      selection: { ...baseDecision, usedOlderComplete: false, newerAttempt: null },
    };
  }
  const newerAttempt = {
    status: latest.manifest.status,
    capturedAt: latest.manifest.source.capturedAt,
  };
  if (!allowOlderCompleteAfterFailure) {
    return { status: "skipped", reason: "newer-v2-attempt-blocks-older-complete", selectedCapturedAt: baseDecision.selectedCapturedAt, newerAttempt };
  }
  if (!COMPLETE_FALLBACK_STATUSES.has(latest.manifest.status)) {
    return { status: "skipped", reason: "newer-v2-status-not-fallback-eligible", selectedCapturedAt: baseDecision.selectedCapturedAt, newerAttempt };
  }
  if (!launchProfileIsConsistent(latest.manifest) || !sameCaptureProfile(latest.manifest, selectedCapture.manifest)) {
    return { status: "skipped", reason: "newer-v2-attempt-not-capture-compatible", selectedCapturedAt: baseDecision.selectedCapturedAt, newerAttempt };
  }
  return {
    status: "selected",
    reason: "explicit-older-compatible-v2-complete-after-newer-failure",
    capture: selectedCapture,
    selection: { ...baseDecision, usedOlderComplete: true, newerAttempt },
  };
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function safeCountMap(value, allowedKeys) {
  return Object.fromEntries(allowedKeys.map((key) => [key, nonnegativeInteger(value?.[key])]));
}

function safeRankedValues(values, valueKey, pattern, limit) {
  if (!Array.isArray(values)) return [];
  return values
    .filter((entry) => isPlainObject(entry) && typeof entry[valueKey] === "string" && pattern.test(entry[valueKey]))
    .slice(0, limit)
    .map((entry) => ({ [valueKey]: entry[valueKey], observations: nonnegativeInteger(entry.observations) }));
}

export function sanitizeMechanics(mechanics) {
  const safeEasing = /^(?:linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\([-+0-9.,\s]+\)|steps\([0-9]+(?:,\s*(?:start|end|jump-start|jump-end|jump-none|jump-both))?\)|linear\([-+0-9.%\s,]+\))$/i;
  return {
    sampledAnimationInstances: nonnegativeInteger(mechanics?.sampledAnimationInstances),
    maximumConcurrentAnimations: nonnegativeInteger(mechanics?.maximumConcurrentAnimations),
    durationBuckets: safeCountMap(mechanics?.durationBuckets, DURATION_BUCKETS),
    infiniteAnimations: nonnegativeInteger(mechanics?.infiniteAnimations),
    animatedProperties: safeRankedValues(mechanics?.animatedProperties, "property", /^(?:--)?[a-z][a-z0-9-]{0,63}$/i, 20),
    easings: safeRankedValues(mechanics?.easings, "easing", safeEasing, 12),
    maximumCompositionSignals: safeCountMap(mechanics?.maximumCompositionSignals, COMPOSITION_SIGNALS),
    librarySignals: Object.fromEntries(LIBRARY_SIGNALS.map((key) => [key, mechanics?.librarySignals?.[key] === true])),
    candidateMechanics: Array.isArray(mechanics?.candidateMechanics)
      ? [...new Set(mechanics.candidateMechanics.filter((value) => CANDIDATE_MECHANICS.has(value)))]
      : [],
  };
}

function runtimeCounts(viewports) {
  return viewports.reduce((summary, viewport) => ({
    consoleMessages: summary.consoleMessages + (Array.isArray(viewport?.runtime?.consoleMessages) ? viewport.runtime.consoleMessages.length : 0),
    runtimeErrors: summary.runtimeErrors + (Array.isArray(viewport?.runtime?.runtimeErrors) ? viewport.runtime.runtimeErrors.length : 0),
    requestFailures: summary.requestFailures + (Array.isArray(viewport?.runtime?.requestFailures) ? viewport.runtime.requestFailures.length : 0),
  }), { consoleMessages: 0, runtimeErrors: 0, requestFailures: 0 });
}

function measurementCoverage(manifest, derived) {
  const coverage = ["screenshots"];
  const measured = derived?.mechanics?.measurementCoverage;
  if (manifest?.contract?.video) coverage.push("continuous-video");
  if (measured?.cssAndWaapi === true) coverage.push("waapi-css-animation-sampling");
  if (measured?.elementAnimateInstrumentation === true) coverage.push("element-animate-instrumentation");
  if (measured?.computedStyleAndGeometryDeltas === true) coverage.push("computed-composition-signals");
  return coverage;
}

function assertNoRawLeak(result, captureRoot) {
  const serialized = JSON.stringify(result);
  const roots = [path.resolve(captureRoot), path.resolve(captureRoot).replaceAll("\\", "/")];
  if (roots.some((root) => root && serialized.includes(root))) throw new Error("Sanitized output leaked the raw capture root.");
  if (/["'](?:localCaptureId|captureId|captureRoot|artifactPath|rawArtifactsPublication)["']\s*:/.test(serialized)) {
    throw new Error("Sanitized output leaked private capture metadata.");
  }
  if (/(?:file:\/\/\/|(?:^|["'\s])[A-Za-z]:[\\/]{2})/i.test(serialized)) throw new Error("Sanitized output leaked a local path.");
}

export async function buildReferenceObservations(options = {}) {
  const captureRoot = path.resolve(options.captureRoot ?? DEFAULT_CAPTURE_ROOT);
  const output = await assertSafeObservationOutput(captureRoot, path.resolve(options.output ?? DEFAULT_OUTPUT));
  const maxAgeDays = positiveNumber(options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS, "maxAgeDays");
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const corpus = JSON.parse(await readFile(CORPUS_FILE, "utf8"));
  const observations = [];
  const selectionNotices = [];
  for (const entry of corpus.entries) {
    if (!REFERENCE_ID_PATTERN.test(entry.id) || !canonicalPublicSource(entry.sourceUrl)) {
      throw new Error("Unsafe corpus entry: " + String(entry.id));
    }
    const decision = await selectCaptureForObservation(path.join(captureRoot, entry.id), entry, {
      maxAgeDays,
      now,
      allowOlderCompleteAfterFailure: options.allowOlderCompleteAfterFailure === true,
    });
    if (decision.status !== "selected") continue;
    const capture = decision.capture;
    if (decision.selection.usedOlderComplete) {
      selectionNotices.push({
        referenceId: entry.id,
        selectedCapturedAt: decision.selection.selectedCapturedAt,
        newerAttempt: decision.selection.newerAttempt,
        policy: decision.reason,
      });
    }
    const viewports = capture.manifest.viewports;
    observations.push({
      referenceId: entry.id,
      sourceUrl: entry.sourceUrl,
      capturedAt: capture.manifest.source.capturedAt,
      status: "machine-captured-needs-human-review",
      evidenceDigest: capture.digest,
      evidenceDigestAlgorithm: EVIDENCE_DIGEST_ALGORITHM,
      captureProfile: {
        evidenceTier: capture.manifest.environment.evidenceTier,
        evidenceArtifactCount: capture.artifactCount,
        measurementCoverage: measurementCoverage(capture.manifest, capture.derived),
        viewports: viewports.map(({ viewport, dimensions }) => ({
          id: viewport,
          width: dimensions.width,
          height: dimensions.height,
          deviceScaleFactor: dimensions.deviceScaleFactor,
        })),
        entranceSamples: capture.manifest.contract.entranceMs.length,
        scrollSamples: capture.manifest.contract.scrollRatios.length,
        reducedMotion: true,
        video: capture.manifest.contract.video === true,
        trace: capture.manifest.contract.trace === true,
      },
      mechanics: sanitizeMechanics(capture.derived.mechanics),
      runtime: runtimeCounts(viewports),
      humanReview: {
        status: "pending",
        requiredBeforePromotion: [
          "Inspect entrance, scroll, mobile, and reduced-motion frames.",
          "Name the information job and separate observation from inference.",
          "Reject bot walls, incomplete loads, and misleading machine detections.",
          "Create an original, visibly distinct reconstruction and document its publication-rights basis before publishing reusable code.",
        ],
      },
      rights: {
        rawArtifactsPublished: false,
        publicSurface: "derived-mechanics-only",
        copiedCode: false,
        copiedAssets: false,
      },
    });
  }
  const result = {
    $schema: "./reference-observations.schema.json",
    schemaVersion: 2,
    generatedAt: new Date(now).toISOString(),
    sourceCorpusVersion: corpus.schemaVersion,
    observationCount: observations.length,
    rightsPolicy: "source-links-and-derived-mechanics-only",
    observations,
  };
  assertNoRawLeak(result, captureRoot);
  await mkdir(path.dirname(output), { recursive: true });
  await assertSafeObservationOutput(captureRoot, output);
  await writeFile(output, JSON.stringify(result, null, 2) + "\n", "utf8");
  Object.defineProperty(result, "selectionNotices", { value: selectionNotices, enumerable: false });
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await buildReferenceObservations(options);
  for (const notice of result.selectionNotices) {
    process.stderr.write(
      "Notice: " + notice.referenceId + " uses older v2-complete evidence from " + notice.selectedCapturedAt
      + " because the newer compatible attempt is " + notice.newerAttempt.status + " at " + notice.newerAttempt.capturedAt + ".\n",
    );
  }
  process.stdout.write("Wrote " + result.observationCount + " sanitized machine observations from Capture Contract v2.\n");
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write("Observation build failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
