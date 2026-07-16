import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createBlindPacket } from "../anonymize.mjs";
import { validateBenchmark, validateAgainstSchema } from "../validate.mjs";

const benchmarkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const juryEvidence = [
  "desktop-first-viewport",
  "desktop-full-page",
  "desktop-motion",
  "mobile-first-viewport",
  "mobile-full-page",
  "mobile-motion",
];

function rightsReviewFixture() {
  return {
    reviewType: "publication-rights-review",
    evidenceBundleSha256: "f".repeat(64),
    modelProviderTerms: {
      reviewed: true,
      providers: ["fixture-provider"],
      notes: "Provider terms were reviewed for this publication.",
    },
    assetAndNetworkInventory: {
      reviewed: true,
      inventorySha256: "a".repeat(64),
      assetCount: 0,
      networkSourceCount: 0,
      notes: "The frozen inventory contains no external assets or network sources.",
    },
    logoTrademarkReview: {
      reviewed: true,
      notes: "No third-party logos or trademarks are present.",
    },
    humanSimilarityReview: {
      reviewed: true,
      method: "Two-person rendered-output comparison review.",
      notes: "No material similarity concern was identified.",
    },
    publicationDecision: "approved",
    redactions: {
      status: "none",
      manifestPath: null,
      manifestSha256: null,
      count: 0,
    },
    reviewer: "R-1",
    reviewedAt: "2026-07-16T12:00:00Z",
    statement: "Documented publication review; not legal clearance.",
  };
}

function voteFixture(overrides = {}) {
  return {
    $schema: "../../../protocol/v1/schemas/jury-vote.schema.json",
    schemaVersion: 1,
    benchmarkVersion: "v1-calibration-mvp",
    packetSha256: "a".repeat(64),
    assignmentId: "P-ABCDEFG2",
    jurorId: "J-ABCDEFG2",
    choice: "left",
    dimensionScores: {
      left: { design: 4, usability: 4, creativity: 4, content: 4 },
      right: { design: 3, usability: 3, creativity: 3, content: 3 },
    },
    invalidReason: null,
    confidence: 3,
    reasonTags: [],
    comment: null,
    submittedAt: "2026-07-16T12:00:00Z",
    privacy: {
      identifierMode: "pseudonymous",
      consentStatus: "verified-private-record",
      retentionClass: "benchmark-v1-jury",
      redactionStatus: "reviewed-no-direct-identifiers",
    },
    eligibility: {
      conflictsDeclared: true,
      relationship: "independent",
      eligible: true,
    },
    ...overrides,
  };
}

function blindRun(briefId, conditionId) {
  return {
    benchmarkVersion: "v1-calibration-mvp",
    runId: `${briefId}--${conditionId}--r1`,
    briefId,
    conditionId,
    replicate: 1,
    status: "success",
    artifacts: juryEvidence.map((evidenceType) => {
      const motion = evidenceType.endsWith("-motion");
      const mobile = evidenceType.startsWith("mobile-");
      return {
        evidenceType,
        path: `${conditionId}/${evidenceType}.${motion ? "webm" : "png"}`,
        mediaType: motion ? "video/webm" : "image/png",
        bytes: 128,
        sha256: createHash("sha256").update(`${conditionId}:${evidenceType}`).digest("hex"),
        capture: {
          profileId: mobile ? "mobile-jury" : "desktop-jury",
          width: mobile ? 393 : 1440,
          height: mobile ? 852 : 900,
          durationMs: motion ? 5000 : 0,
          frameCount: motion ? 150 : 1,
          actionTimelineSha256: motion ? "b".repeat(64) : null,
          capturedAt: "2026-07-16T11:00:00Z",
          probe: { tool: "fixture-probe", version: "1.0.0", decodable: true },
        },
      };
    }),
  };
}

test("validates the checked-in pending benchmark MVP", async () => {
  const result = await validateBenchmark(benchmarkRoot);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.status, "pending");
  assert.deepEqual(result.counts, {
    schemas: 17,
    conditions: 4,
    calibrationBriefs: 6,
    provenances: 6,
    plannedRuns: 72,
    completedRuns: 0,
    juryVotes: 0,
    invalidJuryVotes: 0,
    runManifests: 0,
    voteFiles: 0,
  });
  assert.equal(result.protocolStatus, "pending");
});

test("detects a matrix that omits a calibration brief", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-validate-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });
  const matrixFile = path.join(temporaryRoot, "protocol", "v1", "matrix.lock.json");
  const matrix = JSON.parse(await readFile(matrixFile, "utf8"));
  matrix.briefIds.pop();
  matrix.expectedRunSlots = matrix.briefIds.length * matrix.conditionIds.length * matrix.replicates.length;
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);

  const result = await validateBenchmark(temporaryRoot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "MATRIX_BRIEFS"));
});

test("lightweight schema validator rejects unknown properties and bad patterns", () => {
  const errors = validateAgainstSchema(
    { id: "Not Valid", extra: true },
    {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: { id: { type: "string", pattern: "^[a-z-]+$" } },
    },
  );
  assert.ok(errors.some(({ instancePath }) => instancePath === "/id"));
  assert.ok(errors.some(({ instancePath }) => instancePath === "/extra"));
  assert.ok(validateAgainstSchema(
    "2026-99-99T99:99:99Z",
    { type: "string", format: "date-time" },
  ).length > 0);
  assert.deepEqual(validateAgainstSchema(
    "2028-02-29T23:59:59Z",
    { type: "string", format: "date-time" },
  ), []);
});

test("jury vote schema models invalid comparisons without fabricated dimension scores", async () => {
  const schema = JSON.parse(await readFile(path.join(benchmarkRoot, "protocol", "v1", "schemas", "jury-vote.schema.json"), "utf8"));
  const base = {
    $schema: "jury-vote.schema.json",
    schemaVersion: 1,
    benchmarkVersion: "v1-calibration-mvp",
    packetSha256: "a".repeat(64),
    assignmentId: "P-ABCDEFG2",
    jurorId: "J-ABCDEFG2",
    confidence: 3,
    reasonTags: [],
    comment: null,
    submittedAt: "2026-07-16T12:00:00Z",
    privacy: {
      identifierMode: "pseudonymous",
      consentStatus: "verified-private-record",
      retentionClass: "benchmark-v1-jury",
      redactionStatus: "reviewed-no-direct-identifiers",
    },
    eligibility: {
      conflictsDeclared: true,
      relationship: "independent",
      eligible: true,
    },
  };
  const validInvalidVote = {
    ...base,
    choice: "invalid",
    dimensionScores: null,
    invalidReason: "evidence-missing-or-corrupt",
  };
  assert.deepEqual(validateAgainstSchema(validInvalidVote, schema), []);

  const fabricatedInvalidVote = {
    ...base,
    choice: "invalid",
    dimensionScores: {
      left: { design: 4, usability: 4, creativity: 4, content: 4 },
      right: { design: 3, usability: 3, creativity: 3, content: 3 },
    },
    invalidReason: null,
  };
  assert.ok(validateAgainstSchema(fabricatedInvalidVote, schema).length > 0);

  const scorelessValidVote = {
    ...base,
    choice: "left",
    dimensionScores: null,
    invalidReason: null,
  };
  assert.ok(validateAgainstSchema(scorelessValidVote, schema).length > 0);
});

test("result schema rejects zero-evidence complete results and claims before completion", async () => {
  const schema = JSON.parse(await readFile(path.join(benchmarkRoot, "protocol", "v1", "schemas", "result.schema.json"), "utf8"));
  const base = {
    $schema: "../../protocol/v1/schemas/result.schema.json",
    schemaVersion: 1,
    benchmarkVersion: "v1-calibration-mvp",
    evidenceTier: "calibration",
    expectedRuns: 72,
    invalidJuryVotes: 0,
    scorecard: null,
    limitations: ["Fixture limitation."],
  };
  const rightsReview = rightsReviewFixture();
  const fakeComplete = {
    ...base,
    status: "complete",
    completedRuns: 0,
    validJuryVotes: 0,
    invalidJuryVotes: 0,
    creativeResults: null,
    shippingResults: null,
    scorecard: { path: "scorecard.json", sha256: "b".repeat(64) },
    claims: [{
      id: "improvement-vs-baseline",
      conditionId: "frontend-design-ultra",
      comparatorConditionId: "baseline-no-design-skill",
    }],
    rightsReview,
  };
  assert.ok(validateAgainstSchema(fakeComplete, schema).length > 0);

  const partialClaim = {
    ...base,
    status: "partial",
    completedRuns: 1,
    validJuryVotes: 0,
    invalidJuryVotes: 0,
    creativeResults: null,
    shippingResults: null,
    scorecard: null,
    claims: [{
      id: "improvement-vs-baseline",
      conditionId: "frontend-design-ultra",
      comparatorConditionId: "baseline-no-design-skill",
    }],
    rightsReview,
  };
  assert.ok(validateAgainstSchema(partialClaim, schema).length > 0);
  assert.ok(validateAgainstSchema({
    ...partialClaim,
    claims: [],
    rightsReview: null,
  }, schema).length > 0);

  const complete = {
    ...base,
    status: "complete",
    completedRuns: 72,
    validJuryVotes: 10,
    invalidJuryVotes: 0,
    creativeResults: null,
    shippingResults: null,
    scorecard: { path: "scorecard.json", sha256: "b".repeat(64) },
    claims: [],
    rightsReview,
  };
  assert.deepEqual(validateAgainstSchema(complete, schema), []);
});

test("validator discovers malformed run manifests and jury votes", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-results-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });
  const runRoot = path.join(temporaryRoot, "results", "v1", "run-manifests");
  const voteRoot = path.join(temporaryRoot, "results", "v1", "jury-votes");
  await mkdir(runRoot, { recursive: true });
  await mkdir(voteRoot, { recursive: true });
  await writeFile(path.join(runRoot, "bad.json"), "{}\n");
  await writeFile(path.join(voteRoot, "bad.json"), "{}\n");

  const result = await validateBenchmark(temporaryRoot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "RUN_SCHEMA"));
  assert.ok(result.diagnostics.some(({ code }) => code === "JURY_VOTE_SCHEMA"));
  assert.ok(result.diagnostics.some(({ code }) => code === "MATRIX_EXECUTED_RUNS"));
});

test("validator applies matrix, environment, capture, provenance, and holdout state invariants", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-structures-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });

  const matrixFile = path.join(temporaryRoot, "protocol", "v1", "matrix.lock.json");
  const matrix = JSON.parse(await readFile(matrixFile, "utf8"));
  matrix.unexpected = true;
  matrix.replicates.pop();
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);

  const environmentFile = path.join(temporaryRoot, "protocol", "v1", "environment.lock.json");
  const environment = JSON.parse(await readFile(environmentFile, "utf8"));
  environment.runReady = true;
  environment.status = "frozen";
  await writeFile(environmentFile, `${JSON.stringify(environment, null, 2)}\n`);

  const captureFile = path.join(temporaryRoot, "protocol", "v1", "capture-profiles.json");
  const capture = JSON.parse(await readFile(captureFile, "utf8"));
  capture.profiles[1].id = capture.profiles[0].id;
  await writeFile(captureFile, `${JSON.stringify(capture, null, 2)}\n`);

  const firstBriefId = matrix.briefIds[0];
  const briefRoot = path.join(temporaryRoot, "protocol", "v1", "briefs", "calibration", firstBriefId);
  const provenanceFile = path.join(briefRoot, "assets", "provenance.json");
  const provenance = JSON.parse(await readFile(provenanceFile, "utf8"));
  provenance.assets.push({
    path: "assets/missing.webp",
    sha256: "a".repeat(64),
    origin: "fixture",
    license: "MIT",
    redistributable: true,
  });
  await writeFile(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`);

  const protocolFile = path.join(temporaryRoot, "protocol", "v1", "protocol.json");
  const protocol = JSON.parse(await readFile(protocolFile, "utf8"));
  protocol.holdout.status = "committed";
  await writeFile(protocolFile, `${JSON.stringify(protocol, null, 2)}\n`);

  const result = await validateBenchmark(temporaryRoot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "MATRIX_SCHEMA"));
  assert.ok(result.diagnostics.some(({ code }) => code === "MATRIX_REPLICATE_COUNT"));
  assert.ok(result.diagnostics.some(({ code }) => code === "ENVIRONMENT_FALSE_READY"));
  assert.ok(result.diagnostics.some(({ code }) => code === "CAPTURE_PROFILE_IDS"));
  assert.ok(result.diagnostics.some(({ code }) => code === "PROVENANCE_ASSET_MISSING"));
  assert.ok(result.diagnostics.some(({ code }) => code === "HOLDOUT_COMMITMENT_MISSING"));
});

test("run-ready environments require execution pins and run manifests must reproduce them", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-execution-pins-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });

  const environmentFile = path.join(temporaryRoot, "protocol", "v1", "environment.lock.json");
  const environment = JSON.parse(await readFile(environmentFile, "utf8"));
  environment.status = "frozen";
  environment.runReady = true;
  environment.runtime.nodeExact = "24.4.0";
  environment.runtime.packageManagerExact = "11.4.2";
  environment.browserHarness.playwrightExact = "1.54.1";
  environment.browserHarness.browserRevision = "chromium-139";
  await writeFile(environmentFile, `${JSON.stringify(environment, null, 2)}\n`);

  let result = await validateBenchmark(temporaryRoot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "ENVIRONMENT_FALSE_READY"));

  environment.execution = {
    modelSnapshot: "model-snapshot-2026-07-16",
    modelConfigurationSha256: "a".repeat(64),
    starterCommit: "b".repeat(40),
    starterLockfileSha256: "c".repeat(64),
    runAssignmentSeed: "assignment-seed-v1",
  };
  await writeFile(environmentFile, `${JSON.stringify(environment, null, 2)}\n`);

  const matrixFile = path.join(temporaryRoot, "protocol", "v1", "matrix.lock.json");
  const matrix = JSON.parse(await readFile(matrixFile, "utf8"));
  const briefId = matrix.briefIds[0];
  const conditionId = matrix.conditionIds[0];
  const replicate = matrix.replicates[0];
  const runId = `${briefId}--${conditionId}--r${replicate}`;
  const condition = JSON.parse(await readFile(path.join(temporaryRoot, "protocol", "v1", "conditions", `${conditionId}.json`), "utf8"));
  const briefFile = path.join(temporaryRoot, "protocol", "v1", "briefs", "calibration", briefId, "brief.json");
  const environmentDigest = createHash("sha256").update(await readFile(environmentFile)).digest("hex");
  const briefDigest = createHash("sha256").update(await readFile(briefFile)).digest("hex");
  const runRoot = path.join(temporaryRoot, "results", "v1", "run-manifests");
  await mkdir(runRoot, { recursive: true });
  const run = {
    $schema: "../../../protocol/v1/schemas/run.schema.json",
    schemaVersion: 1,
    benchmarkVersion: "v1-calibration-mvp",
    runId,
    briefId,
    conditionId,
    replicate,
    status: "pending",
    selectedAttempt: null,
    attemptHistory: [],
    pins: {
      model: "wrong-model",
      modelConfigurationSha256: "d".repeat(64),
      starterCommit: "e".repeat(40),
      starterLockfileSha256: "f".repeat(64),
      conditionCommit: condition.source.kind === "none" ? null : condition.source.commit,
      conditionContextSha256: condition.runtime.effectiveContextSha256,
      briefSha256: briefDigest,
      environmentDigest,
    },
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      wallClockSeconds: 0,
      repairLoops: 0,
    },
    checkpoints: [],
    artifacts: [],
    failure: null,
  };
  await writeFile(path.join(runRoot, `${runId}.json`), `${JSON.stringify(run, null, 2)}\n`);
  matrix.executedRunSlots = 1;
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);

  result = await validateBenchmark(temporaryRoot);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("RUN_MODEL_PIN"));
  assert.ok(codes.has("RUN_MODEL_CONFIGURATION"));
  assert.ok(codes.has("RUN_STARTER_COMMIT"));
  assert.ok(codes.has("RUN_STARTER_LOCKFILE"));
});

test("validator rejects a structurally valid but orphaned public jury packet", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-orphan-packet-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });
  const matrix = JSON.parse(await readFile(path.join(temporaryRoot, "protocol", "v1", "matrix.lock.json"), "utf8"));
  const packet = createBlindPacket(
    [
      blindRun(matrix.briefIds[0], matrix.conditionIds[0]),
      blindRun(matrix.briefIds[0], matrix.conditionIds[1]),
    ],
    {
      key: Buffer.from("0123456789abcdef0123456789abcdef", "utf8"),
      seed: "orphan-packet-test",
      benchmarkVersion: "v1-calibration-mvp",
    },
  ).packet;
  packet.status = "revealed";
  packet.mappingRevealedAt = "2026-07-16T12:30:00Z";
  packet.comparisons[0].briefId = "tampered-brief";
  const packetFile = path.join(temporaryRoot, "results", "v1", "jury-packet.json");
  await writeFile(packetFile, `${JSON.stringify(packet, null, 2)}\n`);

  const result = await validateBenchmark(temporaryRoot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "BLIND_PACKET_ORPHAN"));
  assert.ok(result.diagnostics.some(({ code }) => code === "BLIND_PACKET_RUN_COVERAGE"));
  assert.ok(result.diagnostics.some(({ code }) => code === "BLIND_PACKET_DIGEST"));
});

test("validator rejects vote-version drift and a complete result with only one juror", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "fdu-benchmark-jury-coverage-"));
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await cp(benchmarkRoot, temporaryRoot, { recursive: true });
  const voteRoot = path.join(temporaryRoot, "results", "v1", "jury-votes");
  await mkdir(voteRoot, { recursive: true });
  await writeFile(
    path.join(voteRoot, "single.json"),
    `${JSON.stringify(voteFixture({ benchmarkVersion: "wrong-version" }), null, 2)}\n`,
  );
  const resultFile = path.join(temporaryRoot, "results", "v1", "status.json");
  const resultStatus = JSON.parse(await readFile(resultFile, "utf8"));
  Object.assign(resultStatus, {
    status: "complete",
    completedRuns: 1,
    validJuryVotes: 1,
    creativeResults: { preferenceShare: 0.5 },
    shippingResults: { passRate: 0 },
    scorecard: { path: "scorecard.json", sha256: "b".repeat(64) },
    rightsReview: rightsReviewFixture(),
  });
  await writeFile(resultFile, `${JSON.stringify(resultStatus, null, 2)}\n`);
  const protocolFile = path.join(temporaryRoot, "protocol", "v1", "protocol.json");
  const protocol = JSON.parse(await readFile(protocolFile, "utf8"));
  protocol.resultsStatus = "complete";
  await writeFile(protocolFile, `${JSON.stringify(protocol, null, 2)}\n`);
  const matrixFile = path.join(temporaryRoot, "protocol", "v1", "matrix.lock.json");
  const matrix = JSON.parse(await readFile(matrixFile, "utf8"));
  matrix.resultsStatus = "complete";
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);

  const validation = await validateBenchmark(temporaryRoot);
  const codes = new Set(validation.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("JURY_VOTE_VERSION"));
  assert.ok(codes.has("RESULT_JURY_SIZE"));
  assert.ok(codes.has("RESULT_JURY_COVERAGE"));
});
