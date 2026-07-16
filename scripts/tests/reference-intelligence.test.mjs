import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseQueryArguments, queryDesignIntelligence } from "../../frontend-design-ultra/scripts/query-design-intelligence.mjs";
import {
  assertCaptureAuthority,
  assertSafeOutputRoot,
  captureIndependentEntranceSeries,
  classifyNetworkGuardError,
  createCaptureContract,
  getViewportProfile,
  isPrivateOrReservedAddress,
  measureEntranceTiming,
  parseArguments as parseScanArguments,
  scannerBrowserSetupMessage,
  scannerRuntimeSetupMessage,
  scrollToRatio,
  viewportContractStatus,
} from "../../frontend-design-ultra/scripts/scan-reference.mjs";
import {
  assertNonSyncedEvidencePath,
  getDefaultPrivateEvidenceRoot,
  isKnownSyncedPath,
} from "../../frontend-design-ultra/scripts/evidence-paths.mjs";
import {
  manifestMatchesResumeContract,
  parseArguments as parseCorpusScanArguments,
  parseScannerSummary,
} from "../scan-reference-corpus.mjs";
import {
  assertSafeObservationOutput,
  buildReferenceObservations,
  EVIDENCE_DIGEST_ALGORITHM,
  parseArguments as parseObservationArguments,
  sanitizeMechanics,
  selectCaptureForObservation,
} from "../build-reference-observations.mjs";
import {
  buildReferenceScanOutcomes,
  parseArguments as parseScanOutcomeArguments,
} from "../build-reference-scan-outcomes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RIGHTS_ARGS = [
  "--rights-basis", "public-page-private-research-no-republication",
  "--rights-reviewed-at", "2026-07-16",
  "--reviewer-id", "test-reviewer",
];

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function createObservationCapture(referenceDirectory, options = {}) {
  const captureId = options.captureId ?? "2026-07-15T10-00-00-000Z-aaaaaaaa";
  const captureDirectory = path.join(referenceDirectory, captureId);
  const viewportRoot = path.join(captureDirectory, "desktop");
  const reducedRoot = path.join(viewportRoot, "reduced-motion");
  const sourceUrl = options.sourceUrl ?? "https://example.com/";
  const capturedAt = options.capturedAt ?? "2026-07-15T10:05:00.000Z";
  const schemaVersion = options.schemaVersion ?? 2;
  const status = options.status ?? "complete";
  const evidenceTier = options.evidenceTier ?? "benchmark";
  const launchMode = options.launchMode ?? (evidenceTier === "benchmark" ? "pinned-playwright-chromium" : "bundled-chromium");
  const resumeKey = options.resumeKey ?? "a".repeat(64);
  const dimensions = {
    width: 1440,
    height: 900,
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    profile: "chromium-desktop-1440",
  };
  const contractStatus = status === "complete"
    ? "complete"
    : status === "unsupported"
      ? "unsupported"
      : "partial";
  const contract = {
    version: schemaVersion,
    scannerVersion: schemaVersion,
    sourceUrl,
    evidenceTier,
    browserRequest: evidenceTier === "benchmark" ? "pinned-playwright-chromium" : "chromium",
    executablePathHash: null,
    locale: "en-US",
    timezoneId: "UTC",
    rightsReview: {
      basis: "public-page-private-research-no-republication",
      reviewedAt: "2026-07-16",
      reviewerId: "test-reviewer",
      publicationPolicy: "private-capture-only-no-republication",
      legalConclusion: false,
      robotsAndTermsPolicy: "single-public-page-navigation-no-authentication-no-bypass",
    },
    entranceMs: [0],
    scrollRatios: [0],
    video: options.video === true,
    trace: options.trace === true,
    viewports: [{ name: "desktop", ...dimensions }],
    resumeKey,
  };
  const viewport = {
    viewport: "desktop",
    dimensions,
    contractStatus,
    contractIssues: status === "complete" ? [] : ["fixture-noncomplete"],
    records: [
      { kind: "entrance", targetMs: 0, missed: false, contract: { status: "met" }, image: "entrance.png" },
      { kind: "scroll", targetRatio: 0, status: "met", image: "scroll.png" },
      { kind: "settled", status: "met", image: "settled.png" },
    ],
    video: options.video === true ? "motion.webm" : null,
    trace: options.trace === true ? "trace.zip" : null,
    reducedMotion: {
      first: "first.png",
      full: "full.png",
      contentContract: { status: "met" },
      contractStatus: "met",
      failures: [],
    },
    runtime: { consoleMessages: [], runtimeErrors: [], requestFailures: [] },
  };
  const manifest = {
    schemaVersion,
    id: "ref-001",
    captureId,
    source: { url: sourceUrl, capturedAt },
    environment: {
      playwrightCore: "1.61.1",
      browserName: "chromium",
      browserVersion: "149.0.0.0",
      launchMode,
      evidenceTier,
      locale: "en-US",
      timezoneId: "UTC",
      colorProfile: evidenceTier === "benchmark" ? "forced-srgb" : "browser-default",
    },
    contract,
    artifacts: { rawBytesBeforeMetadata: 10, finalBytes: 100, budgetBytes: 10 * 1024 * 1024, withinBudget: true },
    publication: { rawArtifacts: "private-reference-only", derivedMechanics: "review-before-publication" },
    viewports: [viewport],
    failures: ["partial", "failed"].includes(status) ? [{ code: "fixture-noncomplete" }] : [],
    status,
  };
  const derived = {
    schemaVersion,
    id: "ref-001",
    source: {
      url: options.derivedSourceUrl ?? sourceUrl,
      capturedAt,
      sourceType: "live-public-interface",
      observationStatus: "machine-captured-needs-human-review",
    },
    evidence: {
      localCaptureId: captureId,
      launchMode: options.derivedLaunchMode ?? launchMode,
      evidenceTier: options.derivedEvidenceTier ?? evidenceTier,
      contractStatuses: [{ viewport: "desktop", status: contractStatus }],
      viewports: [{ viewport: "desktop", ...dimensions }],
      rawArtifactsPublication: "private-reference-only",
    },
    mechanics: options.mechanics ?? {
      sampledAnimationInstances: 1,
      maximumConcurrentAnimations: 1,
      durationBuckets: { component: 1 },
      animatedProperties: [{ property: "transform", observations: 1 }],
      easings: [{ easing: "ease-out", observations: 1 }],
      maximumCompositionSignals: { animations: 1 },
      librarySignals: { gsap: true },
      candidateMechanics: ["staged-transform-opacity-reveal"],
      measurementCoverage: {
        cssAndWaapi: true,
        elementAnimateInstrumentation: true,
        computedStyleAndGeometryDeltas: true,
      },
    },
  };
  options.mutateManifest?.(manifest);
  options.mutateDerived?.(derived);
  await mkdir(reducedRoot, { recursive: true });
  for (const relative of [
    "contact-sheet.html",
    "desktop/entrance.png",
    "desktop/scroll.png",
    "desktop/settled.png",
    "desktop/reduced-motion/first.png",
    "desktop/reduced-motion/full.png",
  ]) {
    if (relative !== options.omitArtifact) {
      await writeFile(path.join(captureDirectory, relative), "fixture", "utf8");
    }
  }
  if (contract.video) await writeFile(path.join(viewportRoot, "motion.webm"), "video", "utf8");
  if (contract.trace) await writeFile(path.join(viewportRoot, "trace.zip"), "trace", "utf8");
  await writeFile(path.join(captureDirectory, "manifest.json"), JSON.stringify(manifest), "utf8");
  if (!options.omitDerived) {
    await writeFile(path.join(captureDirectory, "derived-motion.json"), JSON.stringify(derived), "utf8");
  }
  return { captureDirectory, manifest, derived };
}

test("reference corpus has a consistent mixed lifecycle with provenance", async () => {
  const corpus = await json("frontend-design-ultra/assets/reference-corpus.json");
  const allowedStatuses = new Set(["candidate", "scanned", "promoted", "retired"]);
  assert.equal(corpus.entries.length, 76);
  assert.equal(corpus.entryCount, 76);
  assert.equal(corpus.datasetStatus, "mixed-lifecycle");
  assert.equal(new Set(corpus.entries.map(({ id }) => id)).size, 76);
  assert.equal(new Set(corpus.entries.map(({ sourceUrl }) => sourceUrl)).size, 76);
  assert.equal(corpus.entries.filter(({ scanPriority }) => scanPriority === "must-scan").length, 20);
  const actualStatusCounts = Object.fromEntries([...allowedStatuses].map((status) => [status, corpus.entries.filter((entry) => entry.status === status).length]));
  assert.deepEqual(corpus.statusCounts, actualStatusCounts);
  for (const entry of corpus.entries) {
    assert.ok(allowedStatuses.has(entry.status));
    assert.match(entry.sourceUrl, /^https:\/\//);
    assert.ok(entry.provenance.observedAt);
    assert.ok(entry.motionSignatureHypothesis);
    if (["scanned", "promoted"].includes(entry.status)) assert.ok(entry.scanEvidence);
  }
});

test("machine observations stay complete-only, aggregate-bound, and pending human review", async () => {
  const [corpus, observations, scanOutcomes] = await Promise.all([
    json("frontend-design-ultra/assets/reference-corpus.json"),
    json("frontend-design-ultra/assets/reference-observations.json"),
    json("frontend-design-ultra/assets/reference-scan-outcomes.json"),
  ]);
  const referenceIds = new Set(corpus.entries.map(({ id }) => id));
  const outcomesByReference = new Map(scanOutcomes.outcomes.map((outcome) => [outcome.refId, outcome]));
  assert.equal(observations.observationCount, observations.observations.length);
  assert.equal(observations.observations.length, 7);
  assert.equal(corpus.observationCount, observations.observations.length);
  assert.equal(scanOutcomes.summary.eligibilityCounts.eligibleCompleteObservation, observations.observations.length);
  for (const observation of observations.observations) {
    assert.ok(referenceIds.has(observation.referenceId));
    assert.equal(observation.status, "machine-captured-needs-human-review");
    assert.equal(observation.evidenceDigestAlgorithm, EVIDENCE_DIGEST_ALGORITHM);
    assert.ok(observation.captureProfile.evidenceArtifactCount > 0);
    assert.ok(["exploratory", "benchmark"].includes(observation.captureProfile.evidenceTier));
    assert.equal(outcomesByReference.get(observation.referenceId)?.eligibility, "eligible-complete-observation");
    assert.equal(outcomesByReference.get(observation.referenceId)?.capturedAt, observation.capturedAt);
    assert.equal(observation.humanReview.status, "pending");
    assert.equal(observation.rights.rawArtifactsPublished, false);
    assert.equal(observation.rights.publicSurface, "derived-mechanics-only");
  }
});

test("public scan outcomes keep newest non-complete attempts diagnostic-only", async () => {
  const [corpus, observations, scanOutcomes] = await Promise.all([
    json("frontend-design-ultra/assets/reference-corpus.json"),
    json("frontend-design-ultra/assets/reference-observations.json"),
    json("frontend-design-ultra/assets/reference-scan-outcomes.json"),
  ]);
  const observationIds = new Set(observations.observations.map(({ referenceId }) => referenceId));
  assert.equal(scanOutcomes.publicationClass, "diagnostic-only");
  assert.equal(scanOutcomes.outcomeCount, 20);
  assert.equal(corpus.scanOutcomeCount, scanOutcomes.outcomeCount);
  assert.equal(scanOutcomes.summary.relevantNewestAttempts, scanOutcomes.outcomeCount);
  assert.ok(scanOutcomes.outcomes.some(({ status }) => status === "partial"));
  assert.ok(scanOutcomes.outcomes.some(({ status }) => status === "unsupported"));
  const strictIneligibleComplete = scanOutcomes.outcomes.filter(({ status, eligibility }) =>
    status === "complete" && eligibility === "diagnostic-only");
  assert.equal(strictIneligibleComplete.length, 4);
  assert.ok(strictIneligibleComplete.every(({ limitations }) =>
    limitations.includes("complete-attempt-not-published-as-observation")
      && limitations.includes("reduced-motion-runtime-errors-recorded")));
  for (const outcome of scanOutcomes.outcomes) {
    assert.equal(outcome.rights.usableForMotionVerification, false);
    assert.equal(Object.hasOwn(outcome, "evidenceDigest"), false);
    if (outcome.status !== "complete") {
      assert.equal(outcome.eligibility, "diagnostic-only");
      assert.equal(
        observationIds.has(outcome.refId)
          && observations.observations.find(({ referenceId }) => referenceId === outcome.refId)?.capturedAt === outcome.capturedAt,
        false,
      );
    }
  }
});

test("observation selection never treats Capture Contract v1 as eligible fallback", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-v1-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const referenceDirectory = path.join(root, "ref-001");
  const entry = { id: "ref-001", sourceUrl: "https://example.com/" };
  await createObservationCapture(referenceDirectory, {
    captureId: "2026-07-15T09-00-00-000Z-v1",
    schemaVersion: 1,
    capturedAt: "2026-07-15T09:05:00.000Z",
  });
  await createObservationCapture(referenceDirectory, {
    captureId: "2026-07-15T10-00-00-000Z-v2-partial",
    status: "partial",
    capturedAt: "2026-07-15T10:05:00.000Z",
  });
  const decision = await selectCaptureForObservation(referenceDirectory, entry, {
    now: Date.parse("2026-07-15T11:00:00.000Z"),
    maxAgeDays: 14,
    allowOlderCompleteAfterFailure: true,
  });
  assert.equal(decision.status, "skipped");
  assert.equal(decision.reason, "no-fresh-artifact-complete-v2");
  assert.equal(decision.capture, undefined);
});

test("older v2-complete fallback is explicit, fresh, and exact-profile compatible", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-fallback-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const referenceDirectory = path.join(root, "ref-001");
  const entry = { id: "ref-001", sourceUrl: "https://example.com/" };
  const now = Date.parse("2026-07-15T12:00:00.000Z");
  await createObservationCapture(referenceDirectory, {
    captureId: "2026-07-14T09-00-00-000Z-complete",
    capturedAt: "2026-07-14T09:05:00.000Z",
    resumeKey: "a".repeat(64),
  });
  await createObservationCapture(referenceDirectory, {
    captureId: "2026-07-15T10-00-00-000Z-partial",
    capturedAt: "2026-07-15T10:05:00.000Z",
    status: "partial",
    resumeKey: "a".repeat(64),
  });

  const blocked = await selectCaptureForObservation(referenceDirectory, entry, { now, maxAgeDays: 14 });
  assert.equal(blocked.status, "skipped");
  assert.equal(blocked.reason, "newer-v2-attempt-blocks-older-complete");
  assert.equal(blocked.newerAttempt.status, "partial");

  const selected = await selectCaptureForObservation(referenceDirectory, entry, {
    now,
    maxAgeDays: 14,
    allowOlderCompleteAfterFailure: true,
  });
  assert.equal(selected.status, "selected");
  assert.equal(selected.reason, "explicit-older-compatible-v2-complete-after-newer-failure");
  assert.equal(selected.selection.usedOlderComplete, true);
  assert.equal(selected.selection.selectedCapturedAt, "2026-07-14T09:05:00.000Z");
  assert.deepEqual(selected.selection.newerAttempt, {
    status: "partial",
    capturedAt: "2026-07-15T10:05:00.000Z",
  });
  assert.equal(selected.capture.manifest.schemaVersion, 2);

  const stale = await selectCaptureForObservation(referenceDirectory, entry, {
    now,
    maxAgeDays: 0.5,
    allowOlderCompleteAfterFailure: true,
  });
  assert.equal(stale.status, "skipped");
  assert.equal(stale.reason, "no-fresh-artifact-complete-v2");

  await createObservationCapture(referenceDirectory, {
    captureId: "2026-07-15T11-00-00-000Z-failed-incompatible",
    capturedAt: "2026-07-15T11:05:00.000Z",
    status: "failed",
    resumeKey: "b".repeat(64),
  });
  const incompatible = await selectCaptureForObservation(referenceDirectory, entry, {
    now,
    maxAgeDays: 14,
    allowOlderCompleteAfterFailure: true,
  });
  assert.equal(incompatible.status, "skipped");
  assert.equal(incompatible.reason, "newer-v2-attempt-not-capture-compatible");
});

test("observation captures require source, tier, launch, artifacts, and contained paths", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-integrity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const entry = { id: "ref-001", sourceUrl: "https://example.com/" };
  const selection = (referenceDirectory) => selectCaptureForObservation(referenceDirectory, entry, {
    now: Date.parse("2026-07-15T12:00:00.000Z"),
    maxAgeDays: 14,
  });

  const missingArtifact = path.join(root, "missing-artifact", "ref-001");
  await createObservationCapture(missingArtifact, { omitArtifact: "contact-sheet.html" });
  assert.equal((await selection(missingArtifact)).reason, "no-fresh-artifact-complete-v2");

  const derivedSourceMismatch = path.join(root, "derived-source", "ref-001");
  await createObservationCapture(derivedSourceMismatch, { derivedSourceUrl: "https://example.net/" });
  assert.equal((await selection(derivedSourceMismatch)).reason, "no-fresh-artifact-complete-v2");

  const wrongLaunch = path.join(root, "wrong-launch", "ref-001");
  await createObservationCapture(wrongLaunch, { launchMode: "bundled-chromium" });
  assert.equal((await selection(wrongLaunch)).reason, "no-fresh-artifact-complete-v2");

  const aggregateBudgetExceeded = path.join(root, "aggregate-budget", "ref-001");
  await createObservationCapture(aggregateBudgetExceeded, {
    mutateManifest(manifest) {
      manifest.artifacts.budgetBytes = manifest.artifacts.finalBytes;
    },
  });
  assert.equal((await selection(aggregateBudgetExceeded)).reason, "no-fresh-artifact-complete-v2");

  const escapedArtifact = path.join(root, "escaped-artifact", "ref-001");
  const escaped = await createObservationCapture(escapedArtifact, {
    mutateManifest(manifest) {
      manifest.viewports[0].records[0].image = "../outside.png";
    },
  });
  await writeFile(path.join(escaped.captureDirectory, "outside.png"), "outside viewport root", "utf8");
  assert.equal((await selection(escapedArtifact)).reason, "no-fresh-artifact-complete-v2");

  const wrongSource = path.join(root, "wrong-source", "ref-001");
  await createObservationCapture(wrongSource, { sourceUrl: "https://example.net/" });
  assert.equal((await selection(wrongSource)).reason, "no-contract-v2-attempt");
});

test("observation mechanics are allowlisted and raw local values cannot reach public output", () => {
  const mechanics = sanitizeMechanics({
    sampledAnimationInstances: 4,
    maximumConcurrentAnimations: 2,
    durationBuckets: { component: 3, "C:\\private\\duration.json": 999 },
    animatedProperties: [
      { property: "transform", observations: 4 },
      { property: "C:\\private\\frame.png", observations: 999 },
    ],
    easings: [
      { easing: "cubic-bezier(0.25, 1, 0.5, 1)", observations: 4 },
      { easing: "file:///private/trace.zip", observations: 999 },
    ],
    maximumCompositionSignals: { animations: 2, privatePath: 999 },
    librarySignals: { gsap: true, "C:\\private\\library": true },
    candidateMechanics: ["sticky-scroll-chapter", "C:\\private\\motion.webm"],
  });
  const serialized = JSON.stringify(mechanics);
  assert.equal(serialized.includes("C:\\private"), false);
  assert.equal(serialized.includes("file:///"), false);
  assert.deepEqual(mechanics.candidateMechanics, ["sticky-scroll-chapter"]);
  assert.deepEqual(mechanics.animatedProperties, [{ property: "transform", observations: 4 }]);
  assert.deepEqual(mechanics.easings, [{ easing: "cubic-bezier(0.25, 1, 0.5, 1)", observations: 4 }]);
  assert.deepEqual(Object.keys(mechanics.librarySignals), ["gsap", "scrollTrigger", "lenis", "locomotiveScroll", "barba", "three", "webflow", "swiper", "motion"]);
});

test("public observation build strips private capture metadata end to end", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-public-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const captureRoot = path.join(root, "captures");
  const output = path.join(root, "public", "reference-observations.json");
  const corpus = await json("frontend-design-ultra/assets/reference-corpus.json");
  const entry = corpus.entries.find(({ id }) => id === "ref-001");
  const captureId = "2026-07-15T10-00-00-000Z-private-capture-id";
  await createObservationCapture(path.join(captureRoot, entry.id), {
    captureId,
    sourceUrl: entry.sourceUrl,
    mechanics: {
      sampledAnimationInstances: 2,
      maximumConcurrentAnimations: 1,
      durationBuckets: { component: 2, "C:\\private\\duration.json": 999 },
      animatedProperties: [
        { property: "transform", observations: 2 },
        { property: "C:\\private\\frame.png", observations: 999 },
      ],
      easings: [
        { easing: "ease-out", observations: 2 },
        { easing: "file:///private/trace.zip", observations: 999 },
      ],
      maximumCompositionSignals: { animations: 1, rawPath: 999 },
      librarySignals: { gsap: true, rawLibrary: true },
      candidateMechanics: ["staged-transform-opacity-reveal", "C:\\private\\motion.webm"],
      measurementCoverage: {
        cssAndWaapi: true,
        elementAnimateInstrumentation: true,
        computedStyleAndGeometryDeltas: true,
      },
    },
  });
  const result = await buildReferenceObservations({
    captureRoot,
    output,
    now: Date.parse("2026-07-15T12:00:00.000Z"),
    maxAgeDays: 14,
  });
  const publicSource = await readFile(output, "utf8");
  assert.equal(result.observationCount, 1);
  assert.equal(JSON.parse(publicSource).observationCount, 1);
  assert.equal(publicSource.includes(captureId), false);
  assert.equal(publicSource.includes("C:\\private"), false);
  assert.equal(publicSource.includes("file:///"), false);
  assert.equal(publicSource.includes("derived-motion.json"), false);
  assert.equal(publicSource.includes("manifest.json"), false);
  assert.equal(publicSource.includes("selectionNotices"), false);
});

test("observation digest binds every referenced artifact class", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-digest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const referenceDirectory = path.join(root, "ref-001");
  const entry = { id: "ref-001", sourceUrl: "https://example.com/" };
  const capture = await createObservationCapture(referenceDirectory, {
    video: true,
    trace: true,
  });
  const select = async () => {
    const decision = await selectCaptureForObservation(referenceDirectory, entry, {
      now: Date.parse("2026-07-15T12:00:00.000Z"),
      maxAgeDays: 14,
    });
    assert.equal(decision.status, "selected");
    return decision.capture.digest;
  };

  const digests = [await select()];
  for (const [relativePath, content] of [
    ["desktop/entrance.png", "changed screenshot"],
    ["desktop/reduced-motion/first.png", "changed reduced-motion screenshot"],
    ["desktop/motion.webm", "changed continuous video"],
    ["desktop/trace.zip", "changed trace"],
    ["contact-sheet.html", "changed contact sheet"],
    ["derived-motion.json", JSON.stringify({ ...capture.derived, mechanics: { ...capture.derived.mechanics, sampledAnimationInstances: 9 } })],
    ["manifest.json", JSON.stringify({
      ...capture.manifest,
      viewports: capture.manifest.viewports.map((viewport) => ({
        ...viewport,
        runtime: { ...viewport.runtime, consoleMessages: ["changed aggregate-bound metadata"] },
      })),
    })],
  ]) {
    await writeFile(path.join(capture.captureDirectory, relativePath), content, "utf8");
    digests.push(await select());
  }
  assert.equal(new Set(digests).size, digests.length);
});

test("scan outcome builder publishes allowlisted coverage only and never promotes a partial", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "fdu-scan-outcome-public-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const captureRoot = path.join(root, "captures");
  const output = path.join(root, "public", "reference-scan-outcomes.json");
  const corpus = await json("frontend-design-ultra/assets/reference-corpus.json");
  const entry = corpus.entries.find(({ id }) => id === "ref-001");
  await createObservationCapture(path.join(captureRoot, entry.id), {
    captureId: "2026-07-15T09-00-00-000Z-complete-private",
    capturedAt: "2026-07-15T09:05:00.000Z",
    sourceUrl: entry.sourceUrl,
  });
  const latest = await createObservationCapture(path.join(captureRoot, entry.id), {
    captureId: "2026-07-15T10-00-00-000Z-partial-private",
    capturedAt: "2026-07-15T10:05:00.000Z",
    sourceUrl: entry.sourceUrl,
    status: "partial",
    mutateManifest(manifest) {
      manifest.viewports[0].contractIssues = ["entrance-timing-missed", "C:\\private\\frame.png"];
    },
  });
  const result = await buildReferenceScanOutcomes({
    captureRoot,
    output,
    now: Date.parse("2026-07-15T12:00:00.000Z"),
    maxAgeDays: 14,
  });
  const publicSource = await readFile(output, "utf8");
  const outcome = result.outcomes.find(({ refId }) => refId === entry.id);
  assert.equal(outcome.capturedAt, latest.manifest.source.capturedAt);
  assert.equal(outcome.status, "partial");
  assert.equal(outcome.eligibility, "diagnostic-only");
  assert.ok(outcome.issues.includes("entrance-timing-missed"));
  assert.ok(outcome.issues.includes("other-capture-contract-issue"));
  assert.ok(outcome.limitations.includes("not-normal-observation-evidence"));
  assert.equal(outcome.rights.usableForMotionVerification, false);
  assert.equal(outcome.viewportCoverage[0].runtimeCounts.reducedMotionFailures, 0);
  assert.equal(publicSource.includes("evidenceDigest"), false);
  assert.equal(publicSource.includes("resumeKey"), false);
  assert.equal(publicSource.includes("captureId"), false);
  assert.equal(publicSource.includes("C:\\private"), false);
  assert.equal(publicSource.includes("entrance.png"), false);
  assert.equal(publicSource.includes("manifest.json"), false);
});

test("observation builder exposes strict freshness CLI and keeps public output outside raw captures", async (t) => {
  const parsed = parseObservationArguments(["--max-age-days", "7", "--allow-older-complete-after-failure"]);
  assert.equal(parsed.maxAgeDays, 7);
  assert.equal(parsed.allowOlderCompleteAfterFailure, true);
  assert.equal(parseObservationArguments([]).allowOlderCompleteAfterFailure, false);
  assert.throws(() => parseObservationArguments(["--max-age-days", "0"]), /positive number/);

  const root = await mkdtemp(path.join(tmpdir(), "fdu-observation-output-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(assertSafeObservationOutput(root, path.join(root, "public.json")), /outside the raw capture root/);
  await assert.rejects(
    buildReferenceObservations({ captureRoot: root, output: path.join(root, "public.json") }),
    /outside the raw capture root/,
  );

  const parsedOutcome = parseScanOutcomeArguments(["--max-age-days", "7"]);
  assert.equal(parsedOutcome.maxAgeDays, 7);
  assert.throws(() => parseScanOutcomeArguments(["--max-age-days", "0"]), /positive number/);
  await assert.rejects(
    buildReferenceScanOutcomes({ captureRoot: root, output: path.join(root, "outcomes.json") }),
    /outside the raw capture root/,
  );
});

test("motion catalog has unique complete patterns and safe rights defaults", async () => {
  const catalog = await json("frontend-design-ultra/assets/motion-patterns.json");
  assert.ok(catalog.patterns.length >= 18);
  assert.equal(new Set(catalog.patterns.map(({ id }) => id)).size, catalog.patterns.length);
  for (const pattern of catalog.patterns) {
    assert.ok(pattern.timeline.length >= 4);
    assert.ok(pattern.verificationContract.length >= 3);
    assert.ok(pattern.mobileAlternative.length > 20);
    assert.ok(pattern.reducedMotion.length > 20);
    assert.equal(pattern.rights.thirdPartyAssetsAllowed, false);
    assert.equal(pattern.rights.implementationLicense, "MIT");
  }
});

test("queries references and motion without loading unrelated results", async () => {
  const references = await queryDesignIntelligence(parseQueryArguments(["references", "--priority", "must-scan", "--lane", "systemic-clarity", "--limit", "5"]));
  assert.ok(references.results.length >= 1);
  assert.ok(references.results.every(({ scanPriority, designLane }) => scanPriority === "must-scan" && designLane === "systemic-clarity"));
  assert.ok(references.results.every((entry) => Object.hasOwn(entry, "latestScanOutcome")));

  const captured = await queryDesignIntelligence(parseQueryArguments(["references", "--captured-only", "--limit", "100"]));
  assert.equal(captured.results.length, 7);
  assert.ok(captured.results.every(({ machineObservation }) => machineObservation));
  assert.ok(captured.results.every(({ machineObservation, latestScanOutcome }) =>
    latestScanOutcome?.eligibility === "eligible-complete-observation"
      && latestScanOutcome.capturedAt === machineObservation.capturedAt));

  const motion = await queryDesignIntelligence(parseQueryArguments(["motion", "--effect-job", "causality", "--trigger", "scroll", "--limit", "20"]));
  assert.ok(motion.results.length >= 2);
  assert.ok(motion.results.every(({ effectJob, trigger }) => effectJob === "causality" && trigger === "scroll"));
});

test("reference scan parser enforces public URL, deterministic tiers, and private trace defaults", () => {
  const parsed = parseScanArguments(["--url", "https://example.com/", "--viewports", "desktop", "--scroll-ratios", "0,0.5,1"]);
  assert.deepEqual(parsed.viewports, ["desktop"]);
  assert.deepEqual(parsed.scrollRatios, [0, 0.5, 1]);
  assert.equal(parsed.trace, false);
  assert.equal(parsed.evidenceTier, "exploratory");
  assert.throws(() => parseScanArguments(["--url", "file:///private/example.html"]), /HTTP/);
  assert.throws(() => parseScanArguments(["--url", "https://example.com/?token=secret"]), /--allow-query/);
  assert.throws(() => parseScanArguments(["--url", "http://127.0.0.1/private"]), /Private or reserved/);
  assert.throws(() => parseScanArguments(["--url", "http://localhost/private"]), /Private or reserved/);
  assert.throws(() => parseScanArguments(["--url", "https://example.com", "--scroll-ratios", "0,nope,1"]), /comma-separated list/);
  assert.throws(() => parseScanArguments(["--url", "https://example.com", "--evidence-tier", "benchmark", "--browser", "chrome"]), /pinned Playwright Chromium/);
  assert.equal(parseScanArguments(["--url", "https://example.com", "--trace"]).trace, true);
  assert.throws(() => assertCaptureAuthority(parsed), /--rights-basis/);
  assert.equal(
    assertCaptureAuthority(parseScanArguments(["--url", "https://example.com", ...RIGHTS_ARGS])).publicationPolicy,
    "private-capture-only-no-republication",
  );
});

test("installed scanner setup errors name the exact skill path and explicit browser modes", () => {
  const skillPath = path.join(ROOT, "frontend-design-ultra");
  const runtime = scannerRuntimeSetupMessage();
  const exploratory = scannerBrowserSetupMessage("exploratory");
  const benchmark = scannerBrowserSetupMessage("benchmark");

  assert.ok(runtime.includes(skillPath));
  assert.match(runtime, /playwright-core 1\.61\.1/);
  assert.match(runtime, /npm ci --ignore-scripts/);
  assert.match(runtime, /Normal skill use does not require/);
  assert.ok(exploratory.includes(skillPath));
  assert.match(exploratory, /existing Chrome or Edge/);
  assert.match(exploratory, /never downloads a browser automatically/);
  assert.ok(benchmark.includes(skillPath));
  assert.match(benchmark, /npm run browser:install/);
  assert.match(benchmark, /npx playwright-core install chromium/);
});

test("Chromium mobile profile exposes touch/mobile semantics and desktop stays fine-pointer", () => {
  const mobile = getViewportProfile("mobile");
  const desktop = getViewportProfile("desktop");
  assert.equal(mobile.isMobile, true);
  assert.equal(mobile.hasTouch, true);
  assert.ok(mobile.deviceScaleFactor > 1);
  assert.equal(desktop.isMobile, false);
  assert.equal(desktop.hasTouch, false);
});

test("entrance timing reports drift instead of relabeling a missed frame", () => {
  assert.deepEqual(measureEntranceTiming(400, 390, 430, 40), {
    actualMs: 390,
    deltaMs: -10,
    captureDurationMs: 40,
    timingBasis: "screenshot-request-start",
    missed: false,
    contract: {
      status: "met",
      toleranceMs: 40,
      timingBasis: "screenshot-request-start",
      captureWindowRecorded: true,
    },
  });
  assert.equal(measureEntranceTiming(400, 1_950, 2_050, 260).contract.status, "missed");
});

test("isolated entrance samples prevent screenshot overhead from cascading into later targets", async () => {
  const created = [];
  const closed = [];
  const result = await captureIndependentEntranceSeries({
    entranceMs: [0, 100, 200],
    toleranceMs: 200,
    createSample: async ({ index }) => {
      const page = {
        clock: 0,
        async evaluate() { return this.clock; },
        async waitForTimeout(milliseconds) { this.clock += milliseconds; },
      };
      created.push(index);
      return {
        page,
        anchor: { kind: "navigation-commit", performanceNowMs: 0 },
        equivalenceKey: "same-profile",
        close: async () => { closed.push(index); },
      };
    },
    captureImage: async ({ page, index }) => {
      page.clock += 300;
      return `frame-${index}.png`;
    },
    captureSnapshot: async ({ page }) => ({ performanceNowMs: page.clock }),
  });
  assert.deepEqual(created, [0, 1, 2]);
  assert.deepEqual(closed, [0, 1, 2]);
  assert.deepEqual(result.records.map(({ deltaMs }) => deltaMs), [0, 0, 0]);
  assert.deepEqual(result.records.map(({ captureDurationMs }) => captureDurationMs), [300, 300, 300]);
  assert.ok(result.records.every(({ timingBasis }) => timingBasis === "screenshot-request-start"));
  assert.ok(result.records.every(({ contract }) => contract.status === "met"));
  assert.ok(result.records.every(({ isolation }) => isolation.mode === "fresh-browser-context-per-target"));

  const sequentialSecond = measureEntranceTiming(100, 301, 601, 200);
  assert.equal(sequentialSecond.contract.status, "missed", "The same overhead on one shared clock would already miss the second target.");
});

test("failed isolated entrance samples remain explicit and make the viewport partial", async () => {
  const result = await captureIndependentEntranceSeries({
    entranceMs: [400],
    toleranceMs: 200,
    createSample: async () => { throw new Error("navigation unavailable"); },
    captureImage: async () => "must-not-exist.png",
    captureSnapshot: async () => ({ performanceNowMs: 0 }),
  });
  assert.equal(result.records[0].contract.status, "failed");
  assert.equal(result.records[0].image, undefined);
  const viewport = viewportContractStatus(result.records, {
    contractStatus: "met",
    networkPolicy: { violations: [] },
  }, 0);
  assert.equal(viewport.status, "partial");
  assert.deepEqual(viewport.issues, ["entrance-sample-failed"]);

  const page = {
    clock: 0,
    async evaluate() { return this.clock; },
    async waitForTimeout(milliseconds) { this.clock += milliseconds; },
  };
  const snapshotFailure = await captureIndependentEntranceSeries({
    entranceMs: [0],
    toleranceMs: 200,
    createSample: async () => ({
      page,
      anchor: { kind: "navigation-commit", performanceNowMs: 0 },
      close: async () => {},
    }),
    captureImage: async () => "preserved-frame.png",
    captureSnapshot: async () => { throw new Error("snapshot unavailable"); },
  });
  assert.equal(snapshotFailure.records[0].contract.status, "failed");
  assert.equal(snapshotFailure.records[0].image, "preserved-frame.png");
  assert.deepEqual(snapshotFailure.records[0].imageWindowMs, { start: 0, end: 0 });
});

test("capture contracts are deterministic and change with evidence-affecting options", () => {
  const base = parseScanArguments(["--url", "https://example.com/", "--click", "#private-selector", ...RIGHTS_ARGS]);
  const same = parseScanArguments(["--url", "https://example.com/", "--click", "#private-selector", ...RIGHTS_ARGS]);
  const traced = parseScanArguments(["--url", "https://example.com/", "--click", "#private-selector", "--trace", ...RIGHTS_ARGS]);
  const baseContract = createCaptureContract(base, "https://example.com/");
  assert.equal(baseContract.resumeKey, createCaptureContract(same, "https://example.com/").resumeKey);
  assert.notEqual(baseContract.resumeKey, createCaptureContract(traced, "https://example.com/").resumeKey);
  assert.equal(baseContract.scannerVersion, 2);
  assert.equal(baseContract.entranceAnchor, "per-sample-navigation-commit");
  assert.equal(baseContract.entranceSampling.isolation, "fresh-browser-context-per-target");
  assert.equal(baseContract.entranceSampling.timingBasis, "screenshot-request-start");
  assert.equal(baseContract.entranceSampling.captureWindowRecorded, true);
  assert.equal(baseContract.entranceSampling.auxiliaryVideo, false);
  assert.equal(baseContract.scrollSampling.maximumCorrectionAttempts, 4);
  assert.equal(baseContract.networkPolicy.unresolvedPublicDns, "diagnostic-block-not-policy-violation");
  assert.equal(baseContract.rightsReview.publicationPolicy, "private-capture-only-no-republication");
  assert.equal(JSON.stringify(baseContract).includes("#private-selector"), false);
});

test("resume matching requires complete, fresh, same-contract evidence", () => {
  const options = parseScanArguments(["--url", "https://example.com/", "--no-video", ...RIGHTS_ARGS]);
  const contract = createCaptureContract(options, "https://example.com/");
  const now = Date.parse("2026-07-15T12:00:00.000Z");
  const manifest = {
    status: "complete",
    source: { url: contract.sourceUrl, capturedAt: "2026-07-14T12:00:00.000Z" },
    contract,
    environment: { playwrightCore: "1.61.1", browserVersion: "140.0.0.0", evidenceTier: contract.evidenceTier },
    artifacts: { withinBudget: true },
  };
  assert.equal(manifestMatchesResumeContract(manifest, contract, "1.61.1", 14, now), true);
  assert.equal(manifestMatchesResumeContract({ ...manifest, status: "partial" }, contract, "1.61.1", 14, now), false);
  assert.equal(manifestMatchesResumeContract(manifest, contract, "1.62.0", 14, now), false);
  assert.equal(manifestMatchesResumeContract(manifest, contract, "1.61.1", 0.5, now), false);
});

test("corpus runner preserves partial and unsupported scanner statuses", () => {
  assert.throws(() => parseCorpusScanArguments([]), /--rights-basis/);
  assert.equal(parseCorpusScanArguments(RIGHTS_ARGS).trace, false);
  assert.equal(parseCorpusScanArguments(["--trace", ...RIGHTS_ARGS]).trace, true);
  assert.equal(
    parseCorpusScanArguments(["--output", path.join(tmpdir(), "fdu-private-corpus"), ...RIGHTS_ARGS]).output,
    path.resolve(tmpdir(), "fdu-private-corpus"),
  );
  assert.equal(parseScannerSummary('{"status":"partial","captureId":"one"}').status, "partial");
  assert.equal(parseScannerSummary('diagnostic\n{"status":"unsupported","captureId":"two"}').status, "unsupported");
  assert.equal(parseScannerSummary("not-json"), null);
});

test("network and output guards reject reserved IPs and release-surface captures", async () => {
  for (const address of ["0.0.0.1", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "198.51.100.2", "203.0.113.2", "::1", "fc00::1", "fe80::1"]) {
    assert.equal(isPrivateOrReservedAddress(address), true, address);
  }
  assert.equal(isPrivateOrReservedAddress("8.8.8.8"), false);
  await assert.rejects(assertSafeOutputRoot(path.join(ROOT, "frontend-design-ultra", "assets", "captures")), /cloud-synchronized path|outside the installable skill/);
  await assert.rejects(assertSafeOutputRoot(path.join(ROOT, "docs", "captures")), /cloud-synchronized path|outside the repository/);
  await assert.rejects(assertSafeOutputRoot(path.join(ROOT, "output", "playwright", "reference-scans")), /cloud-synchronized path|outside the repository/);
  assert.equal(
    await assertSafeOutputRoot(path.join(tmpdir(), "fdu-private-evidence")),
    path.resolve(tmpdir(), "fdu-private-evidence"),
  );
});

test("private evidence defaults avoid repositories and known cloud-sync roots", () => {
  assert.equal(
    getDefaultPrivateEvidenceRoot({
      platform: "win32",
      env: { LOCALAPPDATA: "C:\\Users\\demo\\AppData\\Local" },
      home: "C:\\Users\\demo",
      temp: "C:\\Temp",
    }),
    path.resolve("C:\\Users\\demo\\AppData\\Local", "frontend-design-ultra", "playwright", "reference-scans"),
  );
  const env = {
    OneDrive: "C:\\Users\\demo\\OneDrive",
    OneDriveCommercial: "C:\\Users\\demo\\OneDrive - Agency",
  };
  assert.equal(isKnownSyncedPath("C:\\Users\\demo\\OneDrive - Agency\\repo\\evidence", { env }), true);
  assert.throws(
    () => assertNonSyncedEvidencePath("C:\\Users\\demo\\OneDrive\\captures", { env }),
    /cloud-synchronized path/,
  );
  assert.equal(isKnownSyncedPath("C:\\Users\\demo\\AppData\\Local\\captures", { env }), false);
});

test("unresolved public DNS stays diagnostic while private-network rejection remains a policy violation", () => {
  const unresolved = Object.assign(new Error("getaddrinfo ENOTFOUND public.example"), { code: "ENOTFOUND" });
  assert.deepEqual(classifyNetworkGuardError(unresolved), {
    kind: "resolution-failure",
    type: "public-dns-resolution-failed",
    reason: "Public hostname could not be resolved (ENOTFOUND); the request was blocked without contacting an address.",
  });
  assert.equal(classifyNetworkGuardError(new Error("Private or reserved network target is forbidden.")).kind, "violation");
});

test("blocked subresources remain visible warnings without invalidating completed capture steps", () => {
  const result = viewportContractStatus([], {
    contractStatus: "met",
    networkPolicy: { violations: [] },
  }, 3);
  assert.equal(result.status, "complete");
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, ["network-policy-blocked-subresource"]);
});

test("Playwright fixture verifies the largest custom scroller and canvas unsupported state", { skip: process.env.FDU_PLAYWRIGHT_INTEGRATION !== "1" }, async () => {
  const [{ chromium }, fixture] = await Promise.all([
    import("playwright-core"),
    readFile(path.join(ROOT, "scripts", "tests", "fixtures", "reference-scanner.html"), "utf8"),
  ]);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const page = await context.newPage();
    await page.setContent(fixture, { waitUntil: "domcontentloaded" });
    const custom = await scrollToRatio(page, 0.5, 0, 0.025);
    assert.equal(custom.status, "met");
    assert.equal(custom.surface.kind, "element");
    assert.ok(Math.abs(custom.achievedRatio - 0.5) <= 0.025);
    await page.setContent("<!doctype html><html><head><style>html,body{width:100%;height:100%;margin:0;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head><body><canvas width='900' height='700'></canvas></body></html>");
    const canvas = await scrollToRatio(page, 1, 0, 0.025);
    assert.equal(canvas.status, "unsupported");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("Playwright isolated entrance sampling contains real screenshot overhead per target", { skip: process.env.FDU_PLAYWRIGHT_INTEGRATION !== "1" }, async () => {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    const result = await captureIndependentEntranceSeries({
      entranceMs: [0, 80, 160],
      toleranceMs: 230,
      createSample: async ({ index }) => {
        const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
        contexts.push(context);
        const page = await context.newPage();
        await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><style>body{margin:0;background:hsl(${index * 60} 60% 50%)}</style><main>sample ${index}</main>`)}`, { waitUntil: "commit" });
        const performanceNowMs = await page.evaluate(() => performance.now());
        return {
          page,
          anchor: { kind: "navigation-commit", performanceNowMs },
          equivalenceKey: "playwright-equivalent-profile",
          close: () => context.close(),
        };
      },
      captureImage: async ({ page, index }) => {
        await page.waitForTimeout(250);
        await page.screenshot({ type: "png" });
        return `integration-${index}.png`;
      },
      captureSnapshot: async ({ page }) => ({ performanceNowMs: await page.evaluate(() => performance.now()) }),
    });
    assert.equal(contexts.length, 3);
    assert.ok(result.records.every(({ contract }) => contract.status === "met"), JSON.stringify(result.records.map(({ targetMs, deltaMs, contract }) => ({ targetMs, deltaMs, contract }))));
    const deltas = result.records.map(({ deltaMs }) => deltaMs);
    assert.ok(Math.max(...deltas) - Math.min(...deltas) < 80, `Independent target drift spread was ${Math.max(...deltas) - Math.min(...deltas)}ms.`);
  } finally {
    await Promise.all(contexts.map((context) => context.close().catch(() => {})));
    await browser.close();
  }
});
