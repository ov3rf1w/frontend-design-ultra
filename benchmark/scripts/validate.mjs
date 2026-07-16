#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { computeBlindPacketSha256, createBlindPacket } from "./anonymize.mjs";
import { createProtocolFreezeDigest, verifyHoldoutCommitment } from "./commit-holdout.mjs";
import { createScorecard } from "./score-results.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultBenchmarkRoot = path.resolve(scriptDirectory, "..");
const REQUIRED_JURY_EVIDENCE = [
  "desktop-first-viewport",
  "desktop-full-page",
  "desktop-motion",
  "mobile-first-viewport",
  "mobile-full-page",
  "mobile-motion",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, canonicalJson(value[key])]),
    );
  }
  return value;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relative(root, target) {
  return toPosix(path.relative(root, target)) || ".";
}

function pathIsInside(parent, candidate) {
  const nested = path.relative(parent, candidate);
  return nested === "" || (!nested.startsWith(`..${path.sep}`) && nested !== ".." && !path.isAbsolute(nested));
}

function safePosixRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) return false;
  const normalized = path.posix.normalize(value);
  return normalized === value && normalized !== "." && !normalized.startsWith("../") && !path.posix.isAbsolute(normalized);
}

export function isRfc3339DateTime(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match || match[1] === "0000") return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendar = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return Number.isFinite(calendar.getTime())
    && calendar.getUTCFullYear() === year
    && calendar.getUTCMonth() + 1 === month
    && calendar.getUTCDate() === day
    && Number.isFinite(Date.parse(value));
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  if (!(await exists(directory))) return [];
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(target)));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

function diagnostic(code, file, message, instancePath = "") {
  return { code, file, instancePath, message };
}

async function readJson(root, file, diagnostics) {
  const label = relative(root, file);
  if (!(await exists(file))) {
    diagnostics.push(diagnostic("FILE_MISSING", label, "Required JSON file is missing."));
    return null;
  }
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    diagnostics.push(diagnostic("JSON_INVALID", label, error.message));
    return null;
  }
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateAgainstSchema(value, schema, options = {}) {
  const errors = [];
  const rootPath = options.instancePath ?? "";

  function visit(current, currentSchema, instancePath) {
    if (!currentSchema || typeof currentSchema !== "object") return;

    if (Object.hasOwn(currentSchema, "const") && !deepEqual(current, currentSchema.const)) {
      errors.push({ instancePath, message: `must equal ${JSON.stringify(currentSchema.const)}` });
      return;
    }
    if (currentSchema.enum && !currentSchema.enum.some((candidate) => deepEqual(candidate, current))) {
      errors.push({ instancePath, message: `must be one of ${currentSchema.enum.map((item) => JSON.stringify(item)).join(", ")}` });
      return;
    }

    const types = Array.isArray(currentSchema.type) ? currentSchema.type : currentSchema.type ? [currentSchema.type] : [];
    if (types.length > 0 && !types.some((type) => matchesType(current, type))) {
      errors.push({ instancePath, message: `must be ${types.join(" or ")}` });
      return;
    }

    if (Array.isArray(currentSchema.allOf)) {
      currentSchema.allOf.forEach((candidate) => visit(current, candidate, instancePath));
    }
    if (Array.isArray(currentSchema.oneOf)) {
      const matches = currentSchema.oneOf.filter((candidate) =>
        validateAgainstSchema(current, candidate, { instancePath }).length === 0);
      if (matches.length !== 1) {
        errors.push({ instancePath, message: `must match exactly one of ${currentSchema.oneOf.length} alternatives` });
      }
    }
    if (Array.isArray(currentSchema.anyOf)) {
      const matches = currentSchema.anyOf.filter((candidate) =>
        validateAgainstSchema(current, candidate, { instancePath }).length === 0);
      if (matches.length === 0) errors.push({ instancePath, message: "must match at least one allowed alternative" });
    }
    if (currentSchema.not && validateAgainstSchema(current, currentSchema.not, { instancePath }).length === 0) {
      errors.push({ instancePath, message: "must not match the forbidden schema" });
    }
    if (currentSchema.if) {
      const conditionMatches = validateAgainstSchema(current, currentSchema.if, { instancePath }).length === 0;
      if (conditionMatches && currentSchema.then) visit(current, currentSchema.then, instancePath);
      if (!conditionMatches && currentSchema.else) visit(current, currentSchema.else, instancePath);
    }

    if (typeof current === "string") {
      if (currentSchema.minLength !== undefined && current.length < currentSchema.minLength) {
        errors.push({ instancePath, message: `must have at least ${currentSchema.minLength} characters` });
      }
      if (currentSchema.maxLength !== undefined && current.length > currentSchema.maxLength) {
        errors.push({ instancePath, message: `must have at most ${currentSchema.maxLength} characters` });
      }
      if (currentSchema.pattern && !(new RegExp(currentSchema.pattern).test(current))) {
        errors.push({ instancePath, message: `must match ${currentSchema.pattern}` });
      }
      if (currentSchema.format === "date-time" && !isRfc3339DateTime(current)) {
        errors.push({ instancePath, message: "must be an RFC 3339 date-time" });
      }
    }

    if (typeof current === "number") {
      if (currentSchema.minimum !== undefined && current < currentSchema.minimum) {
        errors.push({ instancePath, message: `must be >= ${currentSchema.minimum}` });
      }
      if (currentSchema.maximum !== undefined && current > currentSchema.maximum) {
        errors.push({ instancePath, message: `must be <= ${currentSchema.maximum}` });
      }
    }

    if (Array.isArray(current)) {
      if (currentSchema.minItems !== undefined && current.length < currentSchema.minItems) {
        errors.push({ instancePath, message: `must contain at least ${currentSchema.minItems} items` });
      }
      if (currentSchema.maxItems !== undefined && current.length > currentSchema.maxItems) {
        errors.push({ instancePath, message: `must contain at most ${currentSchema.maxItems} items` });
      }
      if (currentSchema.uniqueItems) {
        const serialized = current.map((item) => JSON.stringify(item));
        if (new Set(serialized).size !== serialized.length) errors.push({ instancePath, message: "must contain unique items" });
      }
      if (currentSchema.items) current.forEach((item, index) => visit(item, currentSchema.items, `${instancePath}/${index}`));
    }

    if (current !== null && typeof current === "object" && !Array.isArray(current)) {
      const propertyCount = Object.keys(current).length;
      if (currentSchema.minProperties !== undefined && propertyCount < currentSchema.minProperties) {
        errors.push({ instancePath, message: `must contain at least ${currentSchema.minProperties} properties` });
      }
      if (currentSchema.maxProperties !== undefined && propertyCount > currentSchema.maxProperties) {
        errors.push({ instancePath, message: `must contain at most ${currentSchema.maxProperties} properties` });
      }
      for (const required of currentSchema.required ?? []) {
        if (!Object.hasOwn(current, required)) errors.push({ instancePath: `${instancePath}/${required}`, message: "is required" });
      }
      const properties = currentSchema.properties ?? {};
      if (currentSchema.additionalProperties === false) {
        for (const key of Object.keys(current)) {
          if (!Object.hasOwn(properties, key)) errors.push({ instancePath: `${instancePath}/${key}`, message: "is not allowed" });
        }
      }
      for (const [key, childSchema] of Object.entries(properties)) {
        if (Object.hasOwn(current, key)) visit(current[key], childSchema, `${instancePath}/${key}`);
      }
    }
  }

  visit(value, schema, rootPath);
  return errors;
}

function compareSets(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return deepEqual(normalizedLeft, normalizedRight);
}

function captureProfileIssues(artifact, captureConfiguration) {
  const evidenceType = artifact?.evidenceType;
  if (typeof evidenceType !== "string") return [];
  const expectedProfileId = evidenceType.startsWith("mobile-") ? "mobile-jury" : "desktop-jury";
  const profile = asArray(captureConfiguration?.profiles).find(({ id }) => id === expectedProfileId);
  if (!profile) return [`Frozen capture profile ${expectedProfileId} is missing.`];
  const artifactCapture = artifact?.capture;
  const issues = [];
  if (artifactCapture?.profileId !== expectedProfileId) issues.push(`profileId must equal ${expectedProfileId}.`);
  if (artifactCapture?.width !== profile.width) issues.push(`width must equal frozen profile width ${profile.width}.`);
  if (evidenceType.endsWith("-full-page")) {
    if (!Number.isInteger(artifactCapture?.height) || artifactCapture.height < profile.height) {
      issues.push(`full-page height must be at least frozen viewport height ${profile.height}.`);
    }
  } else if (artifactCapture?.height !== profile.height) {
    issues.push(`height must equal frozen profile height ${profile.height}.`);
  }
  if (evidenceType.endsWith("-motion") && profile.video !== true) {
    issues.push("motion evidence requires a frozen video-enabled profile.");
  }
  const requiredScreenshot = evidenceType.endsWith("-first-viewport")
    ? "first-viewport"
    : evidenceType.endsWith("-full-page")
      ? "full-page"
      : "motion-keyframes";
  if (!asArray(profile.screenshots).includes(requiredScreenshot)) {
    issues.push(`frozen profile must include ${requiredScreenshot}.`);
  }
  return issues;
}

function protectedVoteDigest(vote) {
  const protectedFields = {
    benchmarkVersion: vote?.benchmarkVersion,
    packetSha256: vote?.packetSha256,
    assignmentId: vote?.assignmentId,
    jurorId: vote?.jurorId,
    choice: vote?.choice,
    dimensionScores: vote?.dimensionScores,
    invalidReason: vote?.invalidReason,
    confidence: vote?.confidence,
    reasonTags: vote?.reasonTags,
    privacy: vote?.privacy,
    eligibility: vote?.eligibility,
    submittedAt: vote?.submittedAt,
  };
  return sha256(JSON.stringify(canonicalJson(protectedFields)));
}

export async function validateBenchmark(inputRoot = defaultBenchmarkRoot) {
  const root = path.resolve(inputRoot);
  const diagnostics = [];
  const protocolRoot = path.join(root, "protocol", "v1");
  const schemaRoot = path.join(protocolRoot, "schemas");
  const schemaFiles = {
    protocol: path.join(schemaRoot, "protocol.schema.json"),
    brief: path.join(schemaRoot, "brief.schema.json"),
    condition: path.join(schemaRoot, "condition.schema.json"),
    run: path.join(schemaRoot, "run.schema.json"),
    provenance: path.join(schemaRoot, "provenance.schema.json"),
    result: path.join(schemaRoot, "result.schema.json"),
    juryVote: path.join(schemaRoot, "jury-vote.schema.json"),
    matrix: path.join(schemaRoot, "matrix.schema.json"),
    environment: path.join(schemaRoot, "environment.schema.json"),
    captureProfiles: path.join(schemaRoot, "capture-profiles.schema.json"),
    holdoutCommitment: path.join(schemaRoot, "holdout-commitment.schema.json"),
    blindPacket: path.join(schemaRoot, "blind-packet.schema.json"),
    voteFreeze: path.join(schemaRoot, "vote-freeze.schema.json"),
    juryMappingReveal: path.join(schemaRoot, "jury-mapping-reveal.schema.json"),
    holdoutReveal: path.join(schemaRoot, "holdout-reveal.schema.json"),
    scorecard: path.join(schemaRoot, "scorecard.schema.json"),
    redactions: path.join(schemaRoot, "redactions.schema.json"),
  };
  const schemas = {};

  for (const [name, file] of Object.entries(schemaFiles)) {
    const schema = await readJson(root, file, diagnostics);
    if (schema) {
      schemas[name] = schema;
      if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        diagnostics.push(diagnostic("SCHEMA_DRAFT", relative(root, file), "Schema must declare JSON Schema draft 2020-12."));
      }
      if (!schema.$id || !schema.title || !schema.type) {
        diagnostics.push(diagnostic("SCHEMA_METADATA", relative(root, file), "Schema requires $id, title, and type."));
      }
    }
  }

  const protocolFile = path.join(protocolRoot, "protocol.json");
  const protocol = await readJson(root, protocolFile, diagnostics);
  if (protocol && schemas.protocol) {
    for (const error of validateAgainstSchema(protocol, schemas.protocol)) {
      diagnostics.push(diagnostic("PROTOCOL_SCHEMA", relative(root, protocolFile), error.message, error.instancePath));
    }
  }

  const conditionRoot = path.join(protocolRoot, "conditions");
  const conditionFiles = (await listFiles(conditionRoot)).filter((file) => file.endsWith(".json"));
  const conditions = [];
  for (const file of conditionFiles) {
    const condition = await readJson(root, file, diagnostics);
    if (!condition) continue;
    conditions.push(condition);
    if (schemas.condition) {
      for (const error of validateAgainstSchema(condition, schemas.condition)) {
        diagnostics.push(diagnostic("CONDITION_SCHEMA", relative(root, file), error.message, error.instancePath));
      }
    }
    if (path.basename(file, ".json") !== condition.id) {
      diagnostics.push(diagnostic("CONDITION_FILENAME", relative(root, file), "Condition filename must equal its id."));
    }
  }

  const briefRoot = path.join(protocolRoot, "briefs", "calibration");
  const briefFiles = (await listFiles(briefRoot)).filter((file) => path.basename(file) === "brief.json");
  const briefs = [];
  const provenances = [];
  for (const file of briefFiles) {
    const brief = await readJson(root, file, diagnostics);
    if (!brief) continue;
    briefs.push(brief);
    if (schemas.brief) {
      for (const error of validateAgainstSchema(brief, schemas.brief)) {
        diagnostics.push(diagnostic("BRIEF_SCHEMA", relative(root, file), error.message, error.instancePath));
      }
    }
    if (path.basename(path.dirname(file)) !== brief.id) {
      diagnostics.push(diagnostic("BRIEF_DIRECTORY", relative(root, file), "Brief directory must equal its id."));
    }
    const factsFile = path.join(path.dirname(file), "facts.md");
    if (!(await exists(factsFile))) diagnostics.push(diagnostic("BRIEF_FACTS_MISSING", relative(root, factsFile), "Calibration brief requires facts.md."));
    const provenanceFile = path.join(path.dirname(file), "assets", "provenance.json");
    const provenance = await readJson(root, provenanceFile, diagnostics);
    if (provenance) {
      provenances.push(provenance);
      if (schemas.provenance) {
        for (const error of validateAgainstSchema(provenance, schemas.provenance)) {
          diagnostics.push(diagnostic("PROVENANCE_SCHEMA", relative(root, provenanceFile), error.message, error.instancePath));
        }
      }
      if (provenance.briefId !== brief.id) diagnostics.push(diagnostic("PROVENANCE_BRIEF_MISMATCH", relative(root, provenanceFile), "Provenance briefId must match brief id."));
      if ((provenance.assets?.length ?? 0) !== brief.assetPolicy?.suppliedAssetCount) {
        diagnostics.push(diagnostic("PROVENANCE_ASSET_COUNT", relative(root, provenanceFile), "Provenance asset count must match brief assetPolicy.suppliedAssetCount."));
      }
      const assetPaths = new Set();
      let canonicalBriefRoot = null;
      try {
        canonicalBriefRoot = await realpath(path.dirname(file));
      } catch {}
      for (const [index, asset] of asArray(provenance.assets).entries()) {
        const location = `${relative(root, provenanceFile)}#assets/${index}`;
        if (!safePosixRelativePath(asset?.path)) {
          diagnostics.push(diagnostic("PROVENANCE_ASSET_PATH", location, "Asset path must be a normalized POSIX relative path inside its brief."));
          continue;
        }
        if (assetPaths.has(asset.path)) {
          diagnostics.push(diagnostic("PROVENANCE_ASSET_DUPLICATE", location, `Duplicate provenance asset path: ${asset.path}.`));
        }
        assetPaths.add(asset.path);
        const target = path.resolve(path.dirname(file), ...asset.path.split("/"));
        if (!pathIsInside(path.dirname(file), target) || !(await exists(target))) {
          diagnostics.push(diagnostic("PROVENANCE_ASSET_MISSING", location, `Provenance asset does not exist: ${asset.path}.`));
          continue;
        }
        try {
          const metadata = await lstat(target);
          const canonicalTarget = await realpath(target);
          if (!metadata.isFile() || metadata.isSymbolicLink() || !canonicalBriefRoot || !pathIsInside(canonicalBriefRoot, canonicalTarget)) {
            diagnostics.push(diagnostic("PROVENANCE_ASSET_UNSAFE", location, `Provenance asset must resolve to a regular file inside its brief: ${asset.path}.`));
            continue;
          }
          const content = await readFile(canonicalTarget);
          if (asset.sha256 !== sha256(content)) {
            diagnostics.push(diagnostic("PROVENANCE_ASSET_DIGEST", location, `Provenance SHA-256 does not match ${asset.path}.`));
          }
          if (asset.bytes !== undefined && asset.bytes !== content.length) {
            diagnostics.push(diagnostic("PROVENANCE_ASSET_BYTES", location, `Provenance byte count does not match ${asset.path}.`));
          }
        } catch (error) {
          diagnostics.push(diagnostic("PROVENANCE_ASSET_READ", location, `Provenance asset could not be verified: ${error.message}`));
        }
      }
    }
  }

  const matrixFile = path.join(protocolRoot, "matrix.lock.json");
  const matrix = await readJson(root, matrixFile, diagnostics);
  if (matrix && schemas.matrix) {
    for (const error of validateAgainstSchema(matrix, schemas.matrix)) {
      diagnostics.push(diagnostic("MATRIX_SCHEMA", relative(root, matrixFile), error.message, error.instancePath));
    }
  }
  const environmentFile = path.join(protocolRoot, "environment.lock.json");
  const environment = await readJson(root, environmentFile, diagnostics);
  if (environment && schemas.environment) {
    for (const error of validateAgainstSchema(environment, schemas.environment)) {
      diagnostics.push(diagnostic("ENVIRONMENT_SCHEMA", relative(root, environmentFile), error.message, error.instancePath));
    }
  }
  const captureFile = path.join(protocolRoot, "capture-profiles.json");
  const capture = await readJson(root, captureFile, diagnostics);
  if (capture && schemas.captureProfiles) {
    for (const error of validateAgainstSchema(capture, schemas.captureProfiles)) {
      diagnostics.push(diagnostic("CAPTURE_SCHEMA", relative(root, captureFile), error.message, error.instancePath));
    }
  }
  const resultFile = path.join(root, "results", "v1", "status.json");
  const result = await readJson(root, resultFile, diagnostics);
  if (result && schemas.result) {
    for (const error of validateAgainstSchema(result, schemas.result)) {
      diagnostics.push(diagnostic("RESULT_SCHEMA", relative(root, resultFile), error.message, error.instancePath));
    }
  }

  const commitmentFile = path.join(protocolRoot, "commitments", "holdout.commitment.json");
  const commitmentExists = await exists(commitmentFile);
  const commitment = commitmentExists ? await readJson(root, commitmentFile, diagnostics) : null;
  if (commitment && schemas.holdoutCommitment) {
    for (const error of validateAgainstSchema(commitment, schemas.holdoutCommitment)) {
      diagnostics.push(diagnostic("HOLDOUT_COMMITMENT_SCHEMA", relative(root, commitmentFile), error.message, error.instancePath));
    }
  }

  const resultsRoot = path.join(root, "results", "v1");
  const runRoot = path.join(resultsRoot, "run-manifests");
  const runFiles = (await listFiles(runRoot)).filter((file) => file.endsWith(".json"));
  const runs = [];
  for (const file of runFiles) {
    const run = await readJson(root, file, diagnostics);
    if (!run) continue;
    runs.push({ file, value: run });
    if (schemas.run) {
      for (const error of validateAgainstSchema(run, schemas.run)) {
        diagnostics.push(diagnostic("RUN_SCHEMA", relative(root, file), error.message, error.instancePath));
      }
    }
    if (path.basename(file, ".json") !== run.runId) {
      diagnostics.push(diagnostic("RUN_FILENAME", relative(root, file), "Run manifest filename must equal runId."));
    }
    const evidenceTypes = asArray(run.artifacts).map((artifact) => artifact?.evidenceType);
    if (new Set(evidenceTypes).size !== evidenceTypes.length) {
      diagnostics.push(diagnostic("RUN_ARTIFACT_DUPLICATE", relative(root, file), "Run artifact evidenceType values must be unique."));
    }
    if (run.status === "success" && !compareSets(evidenceTypes, REQUIRED_JURY_EVIDENCE)) {
      diagnostics.push(diagnostic("RUN_ARTIFACT_SET", relative(root, file), "Successful runs require the exact six preregistered jury evidence types."));
    }
    for (const [index, artifact] of asArray(run.artifacts).entries()) {
      const artifactLabel = `${relative(root, file)}#artifacts/${index}`;
      if (!safePosixRelativePath(artifact?.path)) {
        diagnostics.push(diagnostic("RUN_ARTIFACT_PATH", artifactLabel, "Run artifact path must be a normalized POSIX relative path."));
      }
      const isMotion = artifact?.evidenceType?.endsWith("-motion");
      if (isMotion && (artifact?.capture?.durationMs ?? 0) < 3000) {
        diagnostics.push(diagnostic("RUN_MOTION_DURATION", artifactLabel, "Motion evidence must contain at least three seconds of probed animation and interaction evidence."));
      }
      if (isMotion && !/^[a-f0-9]{64}$/.test(artifact?.capture?.actionTimelineSha256 ?? "")) {
        diagnostics.push(diagnostic("RUN_MOTION_TIMELINE", artifactLabel, "Motion evidence must bind the recorded actions and timestamps with a timeline SHA-256."));
      }
      const profileIssues = captureProfileIssues(artifact, capture);
      if (profileIssues.length > 0) {
        diagnostics.push(diagnostic("RUN_CAPTURE_PROFILE", artifactLabel, profileIssues.join(" ")));
      }
    }
    const attempts = asArray(run.attemptHistory);
    const maximumGenerationAttempts = protocol?.budgets?.maximumGenerationAttempts ?? Number.POSITIVE_INFINITY;
    const maximumCaptureAttempts = protocol?.budgets?.maximumCaptureAttemptsPerGeneration ?? Number.POSITIVE_INFINITY;
    if (attempts.length > maximumGenerationAttempts) {
      diagnostics.push(diagnostic("RUN_ATTEMPT_BUDGET", relative(root, file), `Run exceeds the frozen maximum of ${maximumGenerationAttempts} generation attempts.`));
    }
    let priorCompletedAt = Number.NEGATIVE_INFINITY;
    for (const [attemptIndex, attempt] of attempts.entries()) {
      const attemptLabel = `${relative(root, file)}#attemptHistory/${attemptIndex}`;
      const expectedOrdinal = attemptIndex + 1;
      if (attempt?.ordinal !== expectedOrdinal || attempt?.attemptId !== `${run.runId}--a${expectedOrdinal}`) {
        diagnostics.push(diagnostic("RUN_ATTEMPT_SEQUENCE", attemptLabel, "Attempt ordinals must be contiguous from 1 and attemptId must equal <runId>--a<ordinal>."));
      }
      const startedAt = Date.parse(attempt?.startedAt);
      const completedAt = Date.parse(attempt?.completedAt);
      if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt || startedAt < priorCompletedAt) {
        diagnostics.push(diagnostic("RUN_ATTEMPT_TIME", attemptLabel, "Attempts require valid, ordered, non-overlapping timestamps."));
      }
      priorCompletedAt = completedAt;
      if (attemptIndex < attempts.length - 1 && attempt?.status !== "infrastructure-invalid") {
        diagnostics.push(diagnostic("RUN_ATTEMPT_TERMINAL_RETRY", attemptLabel, "Only an infrastructure-invalid attempt may be followed by another generation attempt."));
      }
      const attemptTokens = (attempt?.usage?.inputTokens ?? 0) + (attempt?.usage?.outputTokens ?? 0);
      if (attemptTokens > (protocol?.budgets?.maximumTotalTokens ?? Number.POSITIVE_INFINITY)
        || (attempt?.usage?.toolCalls ?? 0) > (protocol?.budgets?.maximumToolCalls ?? Number.POSITIVE_INFINITY)
        || (attempt?.usage?.repairLoops ?? 0) > (protocol?.budgets?.maximumRepairLoops ?? Number.POSITIVE_INFINITY)
        || (attempt?.usage?.wallClockSeconds ?? 0) > (protocol?.budgets?.maximumWallClockMinutes ?? Number.POSITIVE_INFINITY) * 60) {
        diagnostics.push(diagnostic("RUN_ATTEMPT_RESOURCE_BUDGET", attemptLabel, "Every retained generation attempt must independently satisfy the frozen resource budgets."));
      }
      const captureAttempts = asArray(attempt?.captureAttempts);
      if (captureAttempts.length > maximumCaptureAttempts) {
        diagnostics.push(diagnostic("RUN_CAPTURE_ATTEMPT_BUDGET", attemptLabel, `Attempt exceeds the frozen maximum of ${maximumCaptureAttempts} capture attempts.`));
      }
      let priorCaptureCompletedAt = Number.NEGATIVE_INFINITY;
      for (const [captureIndex, captureAttempt] of captureAttempts.entries()) {
        const captureLabel = `${attemptLabel}/captureAttempts/${captureIndex}`;
        if (captureAttempt?.ordinal !== captureIndex + 1) {
          diagnostics.push(diagnostic("RUN_CAPTURE_ATTEMPT_SEQUENCE", captureLabel, "Capture-attempt ordinals must be contiguous from 1."));
        }
        const captureStartedAt = Date.parse(captureAttempt?.startedAt);
        const captureCompletedAt = Date.parse(captureAttempt?.completedAt);
        if (!Number.isFinite(captureStartedAt) || !Number.isFinite(captureCompletedAt)
          || captureCompletedAt < captureStartedAt || captureStartedAt < priorCaptureCompletedAt
          || captureStartedAt < startedAt || captureCompletedAt > completedAt) {
          diagnostics.push(diagnostic("RUN_CAPTURE_ATTEMPT_TIME", captureLabel, "Capture attempts require valid, ordered timestamps inside their generation attempt."));
        }
        priorCaptureCompletedAt = captureCompletedAt;
        if (captureAttempt?.sourceSha256 !== attempt?.finalSourceSha256) {
          diagnostics.push(diagnostic("RUN_CAPTURE_SOURCE_DRIFT", captureLabel, "Every capture retry must bind the exact same final generated source digest."));
        }
        if (captureIndex < captureAttempts.length - 1 && captureAttempt?.status !== "infrastructure-invalid") {
          diagnostics.push(diagnostic("RUN_CAPTURE_TERMINAL_RETRY", captureLabel, "Only an infrastructure-invalid capture may be followed by another capture attempt."));
        }
      }
      if (attempt?.status === "success") {
        const selectedCapture = captureAttempts.find(({ ordinal }) => ordinal === attempt.selectedCapture);
        const artifactSetSha256 = sha256(JSON.stringify(canonicalJson(asArray(run.artifacts))));
        if (!selectedCapture || selectedCapture.status !== "success"
          || selectedCapture.ordinal !== captureAttempts.length
          || selectedCapture.artifactSetSha256 !== artifactSetSha256
          || attempt.failure !== null
          || !/^[a-f0-9]{64}$/.test(attempt.finalSourceSha256 ?? "")) {
          diagnostics.push(diagnostic("RUN_SELECTED_CAPTURE", attemptLabel, "Successful attempt must select its final successful capture, bind the public artifact set, retain final source SHA-256, and have no failure."));
        }
      }
      if (attempt?.status === "condition-failure"
        && (captureAttempts.length !== 0 || attempt.selectedCapture !== null || attempt.finalSourceSha256 !== null
          || attempt.failure?.category !== "condition" || attempt.failure?.retryEligible !== false)) {
        diagnostics.push(diagnostic("RUN_CONDITION_FAILURE_ATTEMPT", attemptLabel, "Condition failure is terminal, non-retryable, and cannot contain generated capture evidence."));
      }
      if (attempt?.status === "infrastructure-invalid"
        && (attempt.selectedCapture !== null || attempt.failure?.category !== "infrastructure"
          || attempt.failure?.retryEligible !== true)) {
        diagnostics.push(diagnostic("RUN_INFRASTRUCTURE_ATTEMPT", attemptLabel, "Infrastructure-invalid attempt must remain retryable and cannot select a capture."));
      }
    }
    const selectedAttempt = attempts.find(({ ordinal }) => ordinal === run.selectedAttempt);
    if (run.status === "pending") {
      if (run.selectedAttempt !== null || attempts.length !== 0) {
        diagnostics.push(diagnostic("RUN_PENDING_ATTEMPTS", relative(root, file), "Pending run slots cannot contain attempts or a selected attempt."));
      }
    } else if (!selectedAttempt || selectedAttempt.ordinal !== attempts.length
      || selectedAttempt.status !== run.status
      || !deepEqual(selectedAttempt.usage, run.usage)
      || !deepEqual(selectedAttempt.failure, run.failure)) {
      diagnostics.push(diagnostic("RUN_SELECTED_ATTEMPT", relative(root, file), "Terminal run status, usage, and failure must exactly match the final retained selected attempt."));
    }
  }

  const voteRoot = path.join(resultsRoot, "jury-votes");
  const voteFiles = (await listFiles(voteRoot)).filter((file) => file.endsWith(".json"));
  const votes = [];
  const voteKeys = new Set();
  const jurorRelationships = new Map();
  for (const file of voteFiles) {
    const vote = await readJson(root, file, diagnostics);
    if (!vote) continue;
    votes.push({ file, value: vote });
    if (schemas.juryVote) {
      for (const error of validateAgainstSchema(vote, schemas.juryVote)) {
        diagnostics.push(diagnostic("JURY_VOTE_SCHEMA", relative(root, file), error.message, error.instancePath));
      }
    }
    if (protocol && vote.benchmarkVersion !== protocol.benchmarkVersion) {
      diagnostics.push(diagnostic("JURY_VOTE_VERSION", relative(root, file), "Jury vote benchmarkVersion must match the protocol."));
    }
    const expectedVoteFilename = `${vote.assignmentId}--${vote.jurorId}.json`;
    if (path.basename(file) !== expectedVoteFilename) {
      diagnostics.push(diagnostic("JURY_VOTE_FILENAME", relative(root, file), "Public vote filename must contain only assignmentId and pseudonymous jurorId."));
    }
    const voteKey = `${vote.assignmentId}\0${vote.jurorId}`;
    if (voteKeys.has(voteKey)) {
      diagnostics.push(diagnostic("JURY_VOTE_DUPLICATE", relative(root, file), "A juror may submit at most one vote for an assignment."));
    }
    voteKeys.add(voteKey);
    const priorRelationship = jurorRelationships.get(vote.jurorId);
    if (priorRelationship && priorRelationship !== vote.eligibility?.relationship) {
      diagnostics.push(diagnostic("JURY_RELATIONSHIP_DRIFT", relative(root, file), "A pseudonymous juror must use one consistent eligibility relationship across votes."));
    }
    if (vote.jurorId) jurorRelationships.set(vote.jurorId, vote.eligibility?.relationship);
  }

  const packetFile = path.join(resultsRoot, "jury-packet.json");
  const packetExists = await exists(packetFile);
  const packet = packetExists ? await readJson(root, packetFile, diagnostics) : null;
  if (packet && schemas.blindPacket) {
    for (const error of validateAgainstSchema(packet, schemas.blindPacket)) {
      diagnostics.push(diagnostic("BLIND_PACKET_SCHEMA", relative(root, packetFile), error.message, error.instancePath));
    }
  }

  const voteFreezeFile = path.join(resultsRoot, "vote-freeze.json");
  const voteFreeze = await exists(voteFreezeFile) ? await readJson(root, voteFreezeFile, diagnostics) : null;
  if (voteFreeze && schemas.voteFreeze) {
    for (const error of validateAgainstSchema(voteFreeze, schemas.voteFreeze)) {
      diagnostics.push(diagnostic("VOTE_FREEZE_SCHEMA", relative(root, voteFreezeFile), error.message, error.instancePath));
    }
  }
  const juryRevealFile = path.join(resultsRoot, "jury-mapping.reveal.json");
  const juryReveal = await exists(juryRevealFile) ? await readJson(root, juryRevealFile, diagnostics) : null;
  if (juryReveal && schemas.juryMappingReveal) {
    for (const error of validateAgainstSchema(juryReveal, schemas.juryMappingReveal)) {
      diagnostics.push(diagnostic("JURY_REVEAL_SCHEMA", relative(root, juryRevealFile), error.message, error.instancePath));
    }
  }
  const holdoutRevealFile = path.join(resultsRoot, "holdout-reveal.json");
  const holdoutReveal = await exists(holdoutRevealFile) ? await readJson(root, holdoutRevealFile, diagnostics) : null;
  if (holdoutReveal && schemas.holdoutReveal) {
    for (const error of validateAgainstSchema(holdoutReveal, schemas.holdoutReveal)) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_SCHEMA", relative(root, holdoutRevealFile), error.message, error.instancePath));
    }
  }
  const scorecardFile = path.join(resultsRoot, "scorecard.json");
  const scorecard = await exists(scorecardFile) ? await readJson(root, scorecardFile, diagnostics) : null;
  if (scorecard && schemas.scorecard) {
    for (const error of validateAgainstSchema(scorecard, schemas.scorecard)) {
      diagnostics.push(diagnostic("SCORECARD_SCHEMA", relative(root, scorecardFile), error.message, error.instancePath));
    }
  }
  const redactionsFile = path.join(resultsRoot, "redactions.json");
  const redactions = await exists(redactionsFile) ? await readJson(root, redactionsFile, diagnostics) : null;
  if (redactions && schemas.redactions) {
    for (const error of validateAgainstSchema(redactions, schemas.redactions)) {
      diagnostics.push(diagnostic("REDACTIONS_SCHEMA", relative(root, redactionsFile), error.message, error.instancePath));
    }
  }

  const conditionIds = conditions.map(({ id }) => id);
  const briefIds = briefs.map(({ id }) => id);
  const conditionById = new Map(conditions.map((condition) => [condition.id, condition]));
  if (new Set(conditionIds).size !== conditionIds.length) {
    diagnostics.push(diagnostic("CONDITION_ID_DUPLICATE", relative(root, conditionRoot), "Condition ids must be unique."));
  }
  if (new Set(briefIds).size !== briefIds.length) {
    diagnostics.push(diagnostic("BRIEF_ID_DUPLICATE", relative(root, briefRoot), "Brief ids must be unique."));
  }

  if (protocol) {
    if (!compareSets(protocol.conditionIds, conditionIds)) {
      diagnostics.push(diagnostic("PROTOCOL_CONDITIONS", relative(root, protocolFile), "Protocol conditionIds must exactly match condition files."));
    }
    if (protocol.scope?.calibrationBriefs !== briefs.length) {
      diagnostics.push(diagnostic("PROTOCOL_BRIEF_COUNT", relative(root, protocolFile), "Protocol calibrationBriefs must match calibration fixture count."));
    }
    if ((protocol.scope?.publicScoredBriefTarget ?? 0) + (protocol.scope?.sealedHoldoutTarget ?? 0) !== protocol.scope?.scoredBriefTarget) {
      diagnostics.push(diagnostic("PROTOCOL_SCORED_SPLIT", relative(root, protocolFile), "Public and sealed scored targets must add to scoredBriefTarget."));
    }
    const weightTotal = asArray(protocol.creativeDimensions).reduce((sum, item) => sum + (Number.isFinite(item?.weight) ? item.weight : 0), 0);
    if (Math.abs(weightTotal - 1) > Number.EPSILON * 10) {
      diagnostics.push(diagnostic("CREATIVE_WEIGHT_TOTAL", relative(root, protocolFile), "Creative dimension weights must total 1."));
    }
    if (new Set(briefs.map(({ industry }) => industry)).size !== briefs.length) {
      diagnostics.push(diagnostic("CALIBRATION_INDUSTRY_DUPLICATE", relative(root, briefRoot), "MVP calibration fixtures must cover distinct industries."));
    }
    if (!compareSets(asArray(protocol.creativeDimensions).map(({ id }) => id), ["design", "usability", "creativity", "content"])) {
      diagnostics.push(diagnostic("CREATIVE_DIMENSIONS", relative(root, protocolFile), "Creative dimensions must contain design, usability, creativity, and content exactly once."));
    }
    if (matrix) {
      if (!compareSets(matrix.conditionIds, conditionIds)) diagnostics.push(diagnostic("MATRIX_CONDITIONS", relative(root, matrixFile), "Matrix conditionIds must match condition files."));
      if (!compareSets(matrix.briefIds, briefIds)) diagnostics.push(diagnostic("MATRIX_BRIEFS", relative(root, matrixFile), "Matrix briefIds must match calibration briefs."));
      const expected = briefIds.length * conditionIds.length * asArray(matrix.replicates).length;
      if (matrix.expectedRunSlots !== expected) diagnostics.push(diagnostic("MATRIX_SLOT_COUNT", relative(root, matrixFile), `Expected ${expected} run slots from the declared matrix.`));
      if (protocol.scope?.replicatesPerCondition !== asArray(matrix.replicates).length) {
        diagnostics.push(diagnostic("MATRIX_REPLICATE_COUNT", relative(root, matrixFile), "Matrix replicate count must equal protocol.scope.replicatesPerCondition."));
      }
      if (matrix.benchmarkVersion !== protocol.benchmarkVersion) diagnostics.push(diagnostic("MATRIX_VERSION", relative(root, matrixFile), "Matrix and protocol benchmarkVersion must match."));
      if (matrix.locked && (matrix.unresolvedLocks?.length > 0
        || conditions.some(({ runReady }) => !runReady)
        || !environment?.runReady
        || capture?.status !== "frozen"
        || !["committed", "revealed"].includes(protocol.holdout?.status)
        || !commitmentExists)) {
        diagnostics.push(diagnostic("MATRIX_FALSE_LOCK", relative(root, matrixFile), "Matrix cannot be locked while environment, capture, condition, holdout, or jury/publication locks remain unresolved."));
      }
      if (!matrix.locked && matrix.status !== "pending-pins") {
        diagnostics.push(diagnostic("MATRIX_UNLOCKED_STATUS", relative(root, matrixFile), "An unlocked matrix must remain pending-pins."));
      }
      if (matrix.locked && matrix.status === "pending-pins") {
        diagnostics.push(diagnostic("MATRIX_LOCKED_STATUS", relative(root, matrixFile), "A locked matrix cannot remain pending-pins."));
      }
    }
  }

  if (capture) {
    const profiles = asArray(capture.profiles);
    const profileIds = profiles.map(({ id }) => id);
    if (profileIds.length === 0 || new Set(profileIds).size !== profileIds.length) diagnostics.push(diagnostic("CAPTURE_PROFILE_IDS", relative(root, captureFile), "Capture profiles require non-empty unique ids."));
    if (!profiles.some(({ jury, width }) => jury && width >= 1000)) diagnostics.push(diagnostic("CAPTURE_DESKTOP_JURY", relative(root, captureFile), "A desktop jury profile is required."));
    if (!profiles.some(({ jury, width }) => jury && width < 600)) diagnostics.push(diagnostic("CAPTURE_MOBILE_JURY", relative(root, captureFile), "A mobile jury profile is required."));
    if (!profiles.some(({ reducedMotion }) => reducedMotion === "reduce")) diagnostics.push(diagnostic("CAPTURE_REDUCED_MOTION", relative(root, captureFile), "At least one reduced-motion profile is required."));
  }

  for (const condition of conditions) {
    const file = path.join(conditionRoot, `${condition.id}.json`);
    if (condition.runReady) {
      if (condition.status !== "frozen") {
        diagnostics.push(diagnostic("CONDITION_FALSE_READY_STATUS", relative(root, file), "A run-ready condition must use frozen status."));
      }
      if ((condition.unresolved?.length ?? 0) !== 0) {
        diagnostics.push(diagnostic("CONDITION_READY_UNRESOLVED", relative(root, file), "A run-ready condition cannot retain unresolved locks."));
      }
      if (!/^[a-f0-9]{64}$/.test(condition.runtime?.effectiveContextSha256 ?? "")) {
        diagnostics.push(diagnostic("CONDITION_READY_CONTEXT", relative(root, file), "A run-ready condition requires an exact effective-context SHA-256."));
      }
      if (condition.source?.kind === "none") {
        if (condition.source.repository !== null || condition.source.commit !== null) {
          diagnostics.push(diagnostic("BASELINE_SOURCE_PIN", relative(root, file), "A no-skill baseline must keep repository and commit null."));
        }
      } else {
        if (typeof condition.source?.repository !== "string" || condition.source.repository.length === 0) {
          diagnostics.push(diagnostic("CONDITION_READY_REPOSITORY", relative(root, file), "A run-ready skill condition requires a pinned repository identity."));
        }
        if (!/^[a-f0-9]{40}$/.test(condition.source?.commit ?? "")) {
          diagnostics.push(diagnostic("CONDITION_READY_COMMIT", relative(root, file), "A run-ready skill condition requires a full lowercase 40-character commit."));
        }
        if (!condition.source?.license || /(?:unknown|to-be|pending)/i.test(condition.source.license)) {
          diagnostics.push(diagnostic("CONDITION_READY_LICENSE", relative(root, file), "A run-ready skill condition requires a verified license identifier."));
        }
      }
    }
  }

  if (environment?.runReady) {
    const runtimePinsPresent = typeof environment.runtime?.nodeExact === "string"
      && typeof environment.runtime?.packageManagerExact === "string"
      && typeof environment.browserHarness?.playwrightExact === "string"
      && typeof environment.browserHarness?.browserRevision === "string";
    const executionPinsPresent = typeof environment.execution?.modelSnapshot === "string"
      && environment.execution.modelSnapshot.length > 0
      && /^[a-f0-9]{64}$/.test(environment.execution?.modelConfigurationSha256 ?? "")
      && /^[a-f0-9]{40}$/.test(environment.execution?.starterCommit ?? "")
      && /^[a-f0-9]{64}$/.test(environment.execution?.starterLockfileSha256 ?? "")
      && typeof environment.execution?.runAssignmentSeed === "string"
      && environment.execution.runAssignmentSeed.length > 0;
    if (!runtimePinsPresent || !executionPinsPresent || environment.status !== "frozen") {
      diagnostics.push(diagnostic("ENVIRONMENT_FALSE_READY", relative(root, environmentFile), "A run-ready environment must be frozen with exact runtime, browser, model, starter, lockfile, and assignment-seed pins."));
    }
    const exactNodeMajor = Number.parseInt((environment.runtime?.nodeExact ?? "").replace(/^v/, "").split(".")[0], 10);
    if (exactNodeMajor !== environment.runtime?.nodeMajor) {
      diagnostics.push(diagnostic("ENVIRONMENT_NODE_MAJOR", relative(root, environmentFile), "runtime.nodeExact major must equal runtime.nodeMajor."));
    }
    if (capture?.status !== "frozen") {
      diagnostics.push(diagnostic("CAPTURE_NOT_FROZEN", relative(root, captureFile), "Capture profiles must be frozen before the environment becomes run-ready."));
    }
  }

  const expectedRunIds = new Set();
  const matrixBriefIds = asArray(matrix?.briefIds);
  const matrixConditionIds = asArray(matrix?.conditionIds);
  const matrixReplicates = asArray(matrix?.replicates);
  for (const briefId of matrixBriefIds) {
    for (const conditionId of matrixConditionIds) {
      for (const replicate of matrixReplicates) {
        expectedRunIds.add(`${briefId}--${conditionId}--r${replicate}`);
      }
    }
  }
  const observedRunIds = new Set();
  const environmentDigest = (await exists(environmentFile)) ? sha256(await readFile(environmentFile)) : null;
  const budgets = protocol?.budgets ?? {};
  for (const { file, value: run } of runs) {
    const label = relative(root, file);
    if (observedRunIds.has(run.runId)) diagnostics.push(diagnostic("RUN_ID_DUPLICATE", label, `Duplicate runId: ${run.runId}.`));
    observedRunIds.add(run.runId);
    if (protocol && run.benchmarkVersion !== protocol.benchmarkVersion) {
      diagnostics.push(diagnostic("RUN_VERSION", label, "Run benchmarkVersion must match the protocol."));
    }
    if (!expectedRunIds.has(run.runId)) {
      diagnostics.push(diagnostic("RUN_NOT_IN_MATRIX", label, "Run id is not a declared matrix slot."));
    }
    if (!briefIds.includes(run.briefId) || !conditionIds.includes(run.conditionId) || !matrixReplicates.includes(run.replicate)) {
      diagnostics.push(diagnostic("RUN_ASSIGNMENT", label, "Run brief, condition, and replicate must be declared by the matrix."));
    }
    const expectedId = `${run.briefId}--${run.conditionId}--r${run.replicate}`;
    if (run.runId !== expectedId) diagnostics.push(diagnostic("RUN_ID_TEMPLATE", label, `Run id must equal ${expectedId}.`));
    const condition = conditionById.get(run.conditionId);
    if (condition) {
      const expectedCommit = condition.source?.kind === "none" ? null : condition.source?.commit;
      if (run.pins?.conditionCommit !== expectedCommit) {
        diagnostics.push(diagnostic("RUN_CONDITION_COMMIT", label, "Run conditionCommit must equal the frozen condition commit."));
      }
      if (run.pins?.conditionContextSha256 !== condition.runtime?.effectiveContextSha256) {
        diagnostics.push(diagnostic("RUN_CONDITION_CONTEXT", label, "Run conditionContextSha256 must equal the frozen effective-context digest."));
      }
    }
    const briefFile = path.join(briefRoot, run.briefId ?? "", "brief.json");
    if (await exists(briefFile)) {
      const briefDigest = sha256(await readFile(briefFile));
      if (run.pins?.briefSha256 !== briefDigest) {
        diagnostics.push(diagnostic("RUN_BRIEF_DIGEST", label, "Run briefSha256 must equal the exact brief file digest."));
      }
    }
    if (environmentDigest && run.pins?.environmentDigest !== environmentDigest) {
      diagnostics.push(diagnostic("RUN_ENVIRONMENT_DIGEST", label, "Run environmentDigest must equal the frozen environment file digest."));
    }
    if (run.pins?.model !== environment?.execution?.modelSnapshot) {
      diagnostics.push(diagnostic("RUN_MODEL_PIN", label, "Run model must equal the frozen model snapshot."));
    }
    if (run.pins?.modelConfigurationSha256 !== environment?.execution?.modelConfigurationSha256) {
      diagnostics.push(diagnostic("RUN_MODEL_CONFIGURATION", label, "Run modelConfigurationSha256 must equal the frozen model configuration digest."));
    }
    if (run.pins?.starterCommit !== environment?.execution?.starterCommit) {
      diagnostics.push(diagnostic("RUN_STARTER_COMMIT", label, "Run starterCommit must equal the frozen starter commit."));
    }
    if (run.pins?.starterLockfileSha256 !== environment?.execution?.starterLockfileSha256) {
      diagnostics.push(diagnostic("RUN_STARTER_LOCKFILE", label, "Run starterLockfileSha256 must equal the frozen starter lockfile digest."));
    }
    const totalTokens = (run.usage?.inputTokens ?? 0) + (run.usage?.outputTokens ?? 0);
    if (Number.isFinite(budgets.maximumTotalTokens) && totalTokens > budgets.maximumTotalTokens) {
      diagnostics.push(diagnostic("RUN_TOKEN_BUDGET", label, "Run exceeds the protocol token budget."));
    }
    if (Number.isFinite(budgets.maximumToolCalls) && (run.usage?.toolCalls ?? 0) > budgets.maximumToolCalls) {
      diagnostics.push(diagnostic("RUN_TOOL_BUDGET", label, "Run exceeds the protocol tool-call budget."));
    }
    if (Number.isFinite(budgets.maximumRepairLoops) && (run.usage?.repairLoops ?? 0) > budgets.maximumRepairLoops) {
      diagnostics.push(diagnostic("RUN_REPAIR_BUDGET", label, "Run exceeds the protocol repair-loop budget."));
    }
    if (Number.isFinite(budgets.maximumWallClockMinutes) && (run.usage?.wallClockSeconds ?? 0) > budgets.maximumWallClockMinutes * 60) {
      diagnostics.push(diagnostic("RUN_TIME_BUDGET", label, "Run exceeds the protocol wall-clock budget."));
    }
  }
  if (matrix && matrix.executedRunSlots !== runs.length) {
    diagnostics.push(diagnostic("MATRIX_EXECUTED_RUNS", relative(root, matrixFile), "matrix.executedRunSlots must equal the number of public run manifests."));
  }

  const completedRunCount = runs.filter(({ value }) => ["success", "condition-failure"].includes(value.status)).length;
  const successfulRuns = runs.filter(({ value }) => value.status === "success").map(({ value }) => value);
  const validVoteCount = votes.filter(({ value }) => value.choice !== "invalid").length;
  const invalidVoteCount = votes.filter(({ value }) => value.choice === "invalid").length;

  if (packet) {
    const packetLabel = relative(root, packetFile);
    if (protocol && packet.benchmarkVersion !== protocol.benchmarkVersion) {
      diagnostics.push(diagnostic("BLIND_PACKET_VERSION", packetLabel, "Blind packet benchmarkVersion must match the protocol."));
    }
    if (packet.randomization?.seedSha256 !== sha256(packet.randomization?.seed ?? "")) {
      diagnostics.push(diagnostic("BLIND_PACKET_SEED_DIGEST", packetLabel, "randomization.seedSha256 must bind the exact recorded seed."));
    }
    if (packet.blindPacketSha256 !== computeBlindPacketSha256(packet)) {
      diagnostics.push(diagnostic("BLIND_PACKET_DIGEST", packetLabel, "blindPacketSha256 must bind the exact normalized blind packet before votes are collected."));
    }
    const serializedPacket = JSON.stringify(packet);
    const leakedCondition = conditionIds.find((conditionId) => serializedPacket.includes(conditionId));
    const leakedRun = runs.map(({ value }) => value.runId).find((runId) => serializedPacket.includes(runId));
    if (leakedCondition || leakedRun) {
      diagnostics.push(diagnostic("BLIND_PACKET_IDENTITY_LEAK", packetLabel, "Public packet content must not contain a condition id or run id before or after reveal."));
    }
    if (packet.status !== "revealed") {
      diagnostics.push(diagnostic("BLIND_PACKET_PUBLICATION_PHASE", packetLabel, "A live blind packet must remain outside the public results tree; checked-in packets require post-freeze revealed status."));
    }
    if (successfulRuns.length === 0) {
      diagnostics.push(diagnostic("BLIND_PACKET_ORPHAN", packetLabel, "A public jury packet requires corresponding successful run manifests."));
    }
    const packetEntries = asArray(packet.entries);
    const packetComparisons = asArray(packet.comparisons);
    if (packet.entryCount !== packetEntries.length) {
      diagnostics.push(diagnostic("BLIND_PACKET_ENTRY_COUNT", packetLabel, "Blind packet entryCount must match entries length."));
    }
    if (packet.comparisonCount !== packetComparisons.length) {
      diagnostics.push(diagnostic("BLIND_PACKET_COMPARISON_COUNT", packetLabel, "Blind packet comparisonCount must match comparisons length."));
    }
    if (packet.entryCount !== successfulRuns.length) {
      diagnostics.push(diagnostic("BLIND_PACKET_RUN_COVERAGE", packetLabel, "Public packet entryCount must equal the number of successful run manifests."));
    }
    const entryIds = new Set();
    const artifactIds = new Set();
    for (const [index, entry] of packetEntries.entries()) {
      const location = `${packetLabel}#entries/${index}`;
      if (entryIds.has(entry?.entryId)) diagnostics.push(diagnostic("BLIND_PACKET_ENTRY_DUPLICATE", location, `Duplicate entryId: ${entry?.entryId}.`));
      entryIds.add(entry?.entryId);
      const entryArtifacts = asArray(entry?.artifacts);
      if (entry?.artifactSetSha256 !== sha256(JSON.stringify(canonicalJson(entryArtifacts)))) {
        diagnostics.push(diagnostic("BLIND_PACKET_ARTIFACT_SET", location, "artifactSetSha256 must bind the exact public artifact descriptors."));
      }
      const evidenceTypes = entryArtifacts.map((artifact) => artifact?.evidenceType);
      if (new Set(evidenceTypes).size !== evidenceTypes.length) {
        diagnostics.push(diagnostic("BLIND_PACKET_EVIDENCE_DUPLICATE", location, "Entry evidenceType values must be unique."));
      }
      if (!compareSets(evidenceTypes, REQUIRED_JURY_EVIDENCE)) {
        diagnostics.push(diagnostic("BLIND_PACKET_EVIDENCE_SET", location, "Every packet entry must contain the exact six preregistered evidence types."));
      }
      for (const artifact of entryArtifacts) {
        if (artifactIds.has(artifact?.artifactId)) {
          diagnostics.push(diagnostic("BLIND_PACKET_ARTIFACT_DUPLICATE", location, `Duplicate artifactId: ${artifact?.artifactId}.`));
        }
        artifactIds.add(artifact?.artifactId);
        if (typeof artifact?.path === "string" && !artifact.path.startsWith(`entries/${entry?.entryId}/${artifact?.artifactId}.`)) {
          diagnostics.push(diagnostic("BLIND_PACKET_ARTIFACT_PATH", location, "Opaque artifact paths must be nested under their own entryId and artifactId."));
        }
        const profileIssues = captureProfileIssues(artifact, capture);
        if (profileIssues.length > 0) {
          diagnostics.push(diagnostic("BLIND_PACKET_CAPTURE_PROFILE", location, profileIssues.join(" ")));
        }
      }
    }
    const assignmentIds = new Set();
    const comparisonPairs = new Set();
    const observedComparisonGroups = new Map();
    for (const [index, comparison] of packetComparisons.entries()) {
      const location = `${packetLabel}#comparisons/${index}`;
      if (assignmentIds.has(comparison?.assignmentId)) diagnostics.push(diagnostic("BLIND_PACKET_ASSIGNMENT_DUPLICATE", location, `Duplicate assignmentId: ${comparison?.assignmentId}.`));
      assignmentIds.add(comparison?.assignmentId);
      const comparisonGroup = `${comparison?.briefId}\0${comparison?.replicate}`;
      observedComparisonGroups.set(comparisonGroup, (observedComparisonGroups.get(comparisonGroup) ?? 0) + 1);
      const pairKey = `${comparisonGroup}\0${[comparison?.left?.entryId, comparison?.right?.entryId].sort().join("\0")}`;
      if (comparisonPairs.has(pairKey)) {
        diagnostics.push(diagnostic("BLIND_PACKET_PAIR_DUPLICATE", location, "The same unordered entry pair may appear only once per brief and replicate."));
      }
      comparisonPairs.add(pairKey);
      if (!entryIds.has(comparison?.left?.entryId) || !entryIds.has(comparison?.right?.entryId)) {
        diagnostics.push(diagnostic("BLIND_PACKET_ENTRY_REFERENCE", location, "Comparison sides must reference public packet entries."));
      }
      if (comparison?.left?.entryId === comparison?.right?.entryId) {
        diagnostics.push(diagnostic("BLIND_PACKET_SELF_COMPARISON", location, "A blind comparison cannot compare an entry with itself."));
      }
      if (!compareSets(comparison?.requiredEvidence, REQUIRED_JURY_EVIDENCE)) {
        diagnostics.push(diagnostic("BLIND_PACKET_REQUIRED_EVIDENCE", location, "Comparison requiredEvidence must equal the six preregistered evidence types."));
      }
      for (const entryId of [comparison?.left?.entryId, comparison?.right?.entryId]) {
        const entry = packetEntries.find((candidate) => candidate?.entryId === entryId);
        const evidenceTypes = new Set(asArray(entry?.artifacts).map((artifact) => artifact?.evidenceType));
        const missing = asArray(comparison?.requiredEvidence).filter((evidenceType) => !evidenceTypes.has(evidenceType));
        if (missing.length > 0) {
          diagnostics.push(diagnostic("BLIND_PACKET_EVIDENCE_MISSING", location, `Entry ${entryId} is missing required evidence: ${missing.join(", ")}.`));
        }
      }
    }
    const successfulRunGroups = new Map();
    for (const run of successfulRuns) {
      const group = `${run.briefId}\0${run.replicate}`;
      successfulRunGroups.set(group, (successfulRunGroups.get(group) ?? 0) + 1);
    }
    const expectedComparisonGroups = new Map(
      [...successfulRunGroups.entries()]
        .filter(([, count]) => count >= 2)
        .map(([group, count]) => [group, (count * (count - 1)) / 2]),
    );
    if (packetComparisons.length !== [...expectedComparisonGroups.values()].reduce((sum, count) => sum + count, 0)
      || expectedComparisonGroups.size !== observedComparisonGroups.size
      || [...expectedComparisonGroups].some(([group, count]) => observedComparisonGroups.get(group) !== count)) {
      diagnostics.push(diagnostic("BLIND_PACKET_PAIR_COVERAGE", packetLabel, "Public packet comparisons must contain every within-brief, within-replicate pair of successful runs exactly once."));
    }
    for (const { file, value: vote } of votes) {
      if (!assignmentIds.has(vote.assignmentId)) {
        diagnostics.push(diagnostic("JURY_VOTE_ASSIGNMENT", relative(root, file), "Jury vote assignmentId must exist in the public blind packet."));
      }
      if (vote.packetSha256 !== packet.blindPacketSha256) {
        diagnostics.push(diagnostic("JURY_VOTE_PACKET_DIGEST", relative(root, file), "Jury vote packetSha256 must bind the exact blind packet shown to the juror."));
      }
      const submitted = Date.parse(vote.submittedAt);
      const revealed = Date.parse(packet.mappingRevealedAt);
      if (Number.isFinite(submitted) && Number.isFinite(revealed) && submitted > revealed) {
        diagnostics.push(diagnostic("JURY_VOTE_AFTER_REVEAL", relative(root, file), "Jury votes must be frozen before the condition mapping is revealed."));
      }
    }
  } else if (votes.length > 0) {
    diagnostics.push(diagnostic("BLIND_PACKET_MISSING", relative(root, packetFile), "Public jury votes require a validated blind packet."));
  }

  let voteFreezeSha256 = null;
  if (voteFreeze) {
    const label = relative(root, voteFreezeFile);
    const frozenAt = Date.parse(voteFreeze.frozenAt);
    const actualPacketSha256 = packetExists ? sha256(await readFile(packetFile)) : null;
    if (voteFreeze.benchmarkVersion !== protocol?.benchmarkVersion) {
      diagnostics.push(diagnostic("VOTE_FREEZE_VERSION", label, "Vote freeze benchmarkVersion must match the protocol."));
    }
    if (!packet || voteFreeze.packet?.sha256 !== actualPacketSha256) {
      diagnostics.push(diagnostic("VOTE_FREEZE_PACKET", label, "Vote freeze must bind the exact published jury-packet.json bytes."));
    }
    const packetArtifactPaths = asArray(packet?.entries)
      .flatMap(({ artifacts }) => asArray(artifacts).map(({ path: artifactPath }) => artifactPath))
      .sort((left, right) => left.localeCompare(right, "en"));
    const declaredEvidencePaths = asArray(voteFreeze.evidence?.files)
      .map(({ path: artifactPath }) => artifactPath)
      .sort((left, right) => left.localeCompare(right, "en"));
    if (!compareSets(packetArtifactPaths, declaredEvidencePaths)
      || voteFreeze.evidence?.count !== packetArtifactPaths.length) {
      diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_SET", label, "Vote freeze evidence must contain exactly every artifact path referenced by the jury packet."));
    }
    const evidenceRoot = path.join(resultsRoot, "jury-evidence");
    const verifiedEvidenceFiles = [];
    for (const descriptor of asArray(voteFreeze.evidence?.files)) {
      if (!safePosixRelativePath(descriptor?.path)) {
        diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_PATH", label, `Unsafe jury-evidence path: ${descriptor?.path}.`));
        continue;
      }
      const target = path.resolve(evidenceRoot, ...descriptor.path.split("/"));
      if (!pathIsInside(evidenceRoot, target) || !(await exists(target))) {
        diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_MISSING", label, `Frozen jury evidence is missing: ${descriptor.path}.`));
        continue;
      }
      const metadata = await lstat(target);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_UNSAFE", label, `Frozen jury evidence must be a regular non-link file: ${descriptor.path}.`));
        continue;
      }
      const content = await readFile(target);
      const digestValue = sha256(content);
      if (descriptor.sha256 !== digestValue || descriptor.bytes !== content.length) {
        diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_DIGEST", label, `Frozen byte count or digest does not match ${descriptor.path}.`));
      }
      verifiedEvidenceFiles.push({
        path: descriptor.path,
        bytes: content.length,
        sha256: digestValue,
      });
    }
    verifiedEvidenceFiles.sort((left, right) => left.path.localeCompare(right.path, "en"));
    if (voteFreeze.evidence?.setSha256 !== sha256(JSON.stringify(canonicalJson(verifiedEvidenceFiles)))) {
      diagnostics.push(diagnostic("VOTE_FREEZE_EVIDENCE_DIGEST", label, "evidence.setSha256 must bind the canonical sorted delivered jury-evidence byte set."));
    }
    const expectedVoteFiles = votes
      .map(({ file }) => toPosix(path.relative(resultsRoot, file)))
      .sort((left, right) => left.localeCompare(right, "en"));
    const declaredVoteFiles = asArray(voteFreeze.votes?.files)
      .map(({ path: votePath }) => votePath)
      .sort((left, right) => left.localeCompare(right, "en"));
    if (!compareSets(expectedVoteFiles, declaredVoteFiles)) {
      diagnostics.push(diagnostic("VOTE_FREEZE_FILE_SET", label, "Vote freeze must contain the exact public jury-vote file set."));
    }
    const verifiedVoteFiles = [];
    for (const descriptor of asArray(voteFreeze.votes?.files)) {
      if (!safePosixRelativePath(descriptor?.path) || !descriptor.path.startsWith("jury-votes/")) {
        diagnostics.push(diagnostic("VOTE_FREEZE_PATH", label, `Unsafe frozen vote path: ${descriptor?.path}.`));
        continue;
      }
      const target = path.resolve(resultsRoot, ...descriptor.path.split("/"));
      if (!pathIsInside(resultsRoot, target) || !(await exists(target))) {
        diagnostics.push(diagnostic("VOTE_FREEZE_FILE_MISSING", label, `Frozen vote file is missing: ${descriptor.path}.`));
        continue;
      }
      const digestValue = sha256(await readFile(target));
      if (descriptor.sha256 !== digestValue) {
        diagnostics.push(diagnostic("VOTE_FREEZE_FILE_DIGEST", label, `Frozen vote digest does not match ${descriptor.path}.`));
      }
      verifiedVoteFiles.push({ path: descriptor.path, sha256: digestValue });
    }
    verifiedVoteFiles.sort((left, right) => left.path.localeCompare(right.path, "en"));
    const setSha256 = sha256(JSON.stringify(canonicalJson(verifiedVoteFiles)));
    if (voteFreeze.votes?.setSha256 !== setSha256) {
      diagnostics.push(diagnostic("VOTE_FREEZE_SET_DIGEST", label, "votes.setSha256 must bind the canonical sorted vote descriptor set."));
    }
    if (voteFreeze.votes?.count !== votes.length
      || voteFreeze.votes?.validCount !== validVoteCount
      || voteFreeze.votes?.invalidCount !== invalidVoteCount
      || voteFreeze.votes?.count !== (voteFreeze.votes?.validCount ?? 0) + (voteFreeze.votes?.invalidCount ?? 0)) {
      diagnostics.push(diagnostic("VOTE_FREEZE_COUNTS", label, "Vote freeze counts must equal the frozen public vote set."));
    }
    for (const { file, value: vote } of votes) {
      const submittedAt = Date.parse(vote.submittedAt);
      if (!Number.isFinite(submittedAt) || !Number.isFinite(frozenAt) || submittedAt > frozenAt) {
        diagnostics.push(diagnostic("VOTE_FREEZE_TIMESTAMP", relative(root, file), "Every vote must contain a valid submittedAt at or before voteFreeze.frozenAt."));
      }
    }
    voteFreezeSha256 = sha256(await readFile(voteFreezeFile));
  }

  if (juryReveal) {
    const label = relative(root, juryRevealFile);
    if (juryReveal.benchmarkVersion !== protocol?.benchmarkVersion) {
      diagnostics.push(diagnostic("JURY_REVEAL_VERSION", label, "Jury reveal benchmarkVersion must match the protocol."));
    }
    let key = null;
    try {
      key = Buffer.from(juryReveal.keyHex, "hex");
    } catch {}
    if (!key || key.length < 32 || sha256(key) !== juryReveal.keySha256
      || juryReveal.keySha256 !== packet?.randomization?.keyCommitmentSha256) {
      diagnostics.push(diagnostic("JURY_REVEAL_KEY", label, "Revealed key must match its own digest and the packet key commitment."));
    }
    if (!packet || juryReveal.packetSha256 !== packet.blindPacketSha256) {
      diagnostics.push(diagnostic("JURY_REVEAL_PACKET", label, "Jury reveal must bind the exact blind packet digest."));
    }
    if (!voteFreeze || juryReveal.voteFreezeSha256 !== voteFreezeSha256) {
      diagnostics.push(diagnostic("JURY_REVEAL_FREEZE", label, "Jury reveal must bind the exact vote-freeze file bytes."));
    }
    if (packet && key?.length >= 32 && successfulRuns.length >= 2) {
      try {
        const regenerated = createBlindPacket(successfulRuns, {
          key,
          seed: packet.randomization?.seed,
          benchmarkVersion: packet.benchmarkVersion,
        });
        if (regenerated.packet.blindPacketSha256 !== packet.blindPacketSha256) {
          diagnostics.push(diagnostic("JURY_REVEAL_REGENERATION", label, "Revealed key and successful run manifests do not regenerate the published blind packet."));
        }
      } catch (error) {
        diagnostics.push(diagnostic("JURY_REVEAL_REGENERATION", label, `Blind packet regeneration failed: ${error.message}`));
      }
    }
    const frozenAt = Date.parse(voteFreeze?.frozenAt);
    const revealedAt = Date.parse(juryReveal.revealedAt);
    if (!Number.isFinite(frozenAt) || !Number.isFinite(revealedAt) || revealedAt <= frozenAt) {
      diagnostics.push(diagnostic("JURY_REVEAL_TIMESTAMP", label, "Jury mapping reveal must occur strictly after the vote freeze."));
    }
    if (packet?.mappingRevealedAt !== juryReveal.revealedAt) {
      diagnostics.push(diagnostic("JURY_REVEAL_PACKET_TIMESTAMP", label, "Packet mappingRevealedAt must equal the separately verified jury reveal timestamp."));
    }
  }

  let holdoutRevealVerified = false;
  if (holdoutReveal) {
    const label = relative(root, holdoutRevealFile);
    if (holdoutReveal.benchmarkVersion !== protocol?.benchmarkVersion) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_VERSION", label, "Holdout reveal benchmarkVersion must match the protocol."));
    }
    const commitmentSha256 = commitmentExists ? sha256(await readFile(commitmentFile)) : null;
    if (!commitment || holdoutReveal.commitmentSha256 !== commitmentSha256) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_COMMITMENT", label, "Holdout reveal must bind the exact public commitment file bytes."));
    }
    if (!voteFreeze || holdoutReveal.voteFreezeSha256 !== voteFreezeSha256) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_FREEZE", label, "Holdout reveal must bind the exact vote-freeze file bytes."));
    }
    let salt = null;
    try {
      salt = Buffer.from(holdoutReveal.saltHex, "hex");
    } catch {}
    if (!salt || salt.length < 32 || sha256(salt) !== holdoutReveal.saltSha256
      || holdoutReveal.saltSha256 !== commitment?.saltDigest) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_SALT", label, "Revealed salt must match its own digest and the holdout commitment."));
    }
    let freeze = null;
    try {
      freeze = await createProtocolFreezeDigest(protocolRoot);
      if (holdoutReveal.protocolFreezeSha256 !== freeze.digest
        || holdoutReveal.protocolFreezeSha256 !== commitment?.protocolFreezeSha256) {
        diagnostics.push(diagnostic("HOLDOUT_REVEAL_PROTOCOL", label, "Holdout reveal must bind the recomputed immutable protocol freeze."));
      }
    } catch (error) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_PROTOCOL", label, `Protocol freeze could not be recomputed: ${error.message}`));
    }
    let bundleRoot = null;
    if (!safePosixRelativePath(holdoutReveal.bundlePath)) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_PATH", label, "bundlePath must be a safe POSIX-relative path inside results/v1."));
    } else {
      const requestedBundleRoot = path.resolve(resultsRoot, ...holdoutReveal.bundlePath.split("/"));
      if (!pathIsInside(resultsRoot, requestedBundleRoot) || !(await exists(requestedBundleRoot))) {
        diagnostics.push(diagnostic("HOLDOUT_REVEAL_BUNDLE", label, "Revealed holdout bundle is missing or outside results/v1."));
      } else {
        try {
          const metadata = await lstat(requestedBundleRoot);
          bundleRoot = await realpath(requestedBundleRoot);
          const canonicalResultsRoot = await realpath(resultsRoot);
          if (!metadata.isDirectory() || metadata.isSymbolicLink() || !pathIsInside(canonicalResultsRoot, bundleRoot)) {
            diagnostics.push(diagnostic("HOLDOUT_REVEAL_BUNDLE", label, "Revealed holdout bundle must be a real directory inside results/v1."));
            bundleRoot = null;
          }
        } catch (error) {
          diagnostics.push(diagnostic("HOLDOUT_REVEAL_BUNDLE", label, `Revealed holdout bundle could not be resolved: ${error.message}`));
        }
      }
    }
    if (bundleRoot && salt?.length >= 32 && commitment && freeze) {
      try {
        const verification = await verifyHoldoutCommitment(bundleRoot, salt, commitment, {
          benchmarkVersion: protocol.benchmarkVersion,
          protocolFreezeSha256: freeze.digest,
        });
        if (!verification.ok) {
          diagnostics.push(diagnostic("HOLDOUT_REVEAL_VERIFICATION", label, `Holdout commitment mismatches: ${verification.mismatches.join(", ")}.`));
        } else {
          holdoutRevealVerified = true;
        }
      } catch (error) {
        diagnostics.push(diagnostic("HOLDOUT_REVEAL_VERIFICATION", label, `Holdout verification failed: ${error.message}`));
      }
    }
    if (bundleRoot) {
      const topLevel = (await readdir(bundleRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map(({ name }) => name)
        .sort((left, right) => left.localeCompare(right, "en"));
      const expectedBriefIds = [...asArray(holdoutReveal.briefIds)].sort((left, right) => left.localeCompare(right, "en"));
      if (!compareSets(topLevel, expectedBriefIds)
        || expectedBriefIds.length !== protocol?.scope?.sealedHoldoutTarget) {
        diagnostics.push(diagnostic("HOLDOUT_REVEAL_BRIEFS", label, "Revealed bundle must contain exactly the preregistered number of declared holdout brief directories."));
      }
      for (const briefId of topLevel) {
        for (const requiredPath of ["brief.json", "facts.md", "assets/provenance.json"]) {
          if (!(await exists(path.join(bundleRoot, briefId, ...requiredPath.split("/"))))) {
            diagnostics.push(diagnostic("HOLDOUT_REVEAL_BRIEF_FILE", label, `${briefId} is missing ${requiredPath}.`));
          }
        }
      }
    }
    const frozenAt = Date.parse(voteFreeze?.frozenAt);
    const revealedAt = Date.parse(holdoutReveal.revealedAt);
    if (!Number.isFinite(frozenAt) || !Number.isFinite(revealedAt) || revealedAt <= frozenAt) {
      diagnostics.push(diagnostic("HOLDOUT_REVEAL_TIMESTAMP", label, "Holdout reveal must occur strictly after the vote freeze."));
    }
  }

  const publicRunDescriptors = await Promise.all(runs.map(async ({ file }) => ({
    path: toPosix(path.relative(resultsRoot, file)),
    sha256: sha256(await readFile(file)),
  })));
  publicRunDescriptors.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const runManifestSetSha256 = sha256(JSON.stringify(canonicalJson(publicRunDescriptors)));

  let scorecardSha256 = null;
  if (scorecard) {
    const label = relative(root, scorecardFile);
    scorecardSha256 = sha256(await readFile(scorecardFile));
    if (scorecard.benchmarkVersion !== protocol?.benchmarkVersion) {
      diagnostics.push(diagnostic("SCORECARD_VERSION", label, "Scorecard benchmarkVersion must match the protocol."));
    }
    if (!packet || !voteFreeze || !juryReveal) {
      diagnostics.push(diagnostic("SCORECARD_INPUTS_MISSING", label, "A scorecard requires the bound packet, vote freeze, and jury mapping reveal."));
    } else {
      try {
        const recomputedScorecard = createScorecard({
          benchmarkVersion: protocol.benchmarkVersion,
          packet,
          juryReveal,
          runs: runs.map(({ value }) => value),
          votes: votes.map(({ value }) => value),
          inputDigests: {
            blindPacketSha256: packet.blindPacketSha256,
            voteFreezeSha256,
            juryRevealSha256: sha256(await readFile(juryRevealFile)),
            runManifestSetSha256,
          },
        });
        if (!deepEqual(scorecard, recomputedScorecard)) {
          diagnostics.push(diagnostic("SCORECARD_RECOMPUTE", label, "Published scorecard must exactly equal deterministic recomputation from frozen inputs."));
        }
      } catch (error) {
        diagnostics.push(diagnostic("SCORECARD_RECOMPUTE", label, `Scorecard recomputation failed: ${error.message}`));
      }
    }
  }

  const redactionsSha256 = redactions ? sha256(await readFile(redactionsFile)) : null;
  if (redactions) {
    const label = relative(root, redactionsFile);
    if (redactions.benchmarkVersion !== protocol?.benchmarkVersion) {
      diagnostics.push(diagnostic("REDACTIONS_VERSION", label, "Redactions benchmarkVersion must match the protocol."));
    }
    for (const [index, item] of asArray(redactions.items).entries()) {
      const location = `${label}#items/${index}`;
      if (item?.protectedFieldsBeforeSha256 !== item?.protectedFieldsAfterSha256) {
        diagnostics.push(diagnostic("REDACTIONS_SCORING_MUTATION", location, "Redaction cannot change any field used for scoring, assignment, eligibility, or timing."));
      }
      if (!safePosixRelativePath(item?.publishedPath) || !item.publishedPath.startsWith("jury-votes/")) {
        diagnostics.push(diagnostic("REDACTIONS_PATH", location, "Redactions may target only a safe public jury-vote path."));
        continue;
      }
      const target = path.resolve(resultsRoot, ...item.publishedPath.split("/"));
      if (!pathIsInside(resultsRoot, target) || !(await exists(target))) {
        diagnostics.push(diagnostic("REDACTIONS_TARGET_MISSING", location, `Published redaction target is missing: ${item.publishedPath}.`));
        continue;
      }
      const content = await readFile(target);
      if (item.publishedSha256 !== sha256(content)) {
        diagnostics.push(diagnostic("REDACTIONS_TARGET_DIGEST", location, `Published digest does not match ${item.publishedPath}.`));
      }
      try {
        const vote = JSON.parse(content.toString("utf8"));
        if (item.protectedFieldsAfterSha256 !== protectedVoteDigest(vote)) {
          diagnostics.push(diagnostic("REDACTIONS_PROTECTED_DIGEST", location, "Protected post-redaction fields do not match the published vote."));
        }
      } catch (error) {
        diagnostics.push(diagnostic("REDACTIONS_TARGET_JSON", location, `Published redaction target is not valid JSON: ${error.message}`));
      }
    }
  }

  const evidenceBundleSha256 = sha256(JSON.stringify(canonicalJson({
    packetFileSha256: packet ? sha256(await readFile(packetFile)) : null,
    voteFreezeSha256,
    juryRevealSha256: juryReveal ? sha256(await readFile(juryRevealFile)) : null,
    holdoutRevealSha256: holdoutReveal ? sha256(await readFile(holdoutRevealFile)) : null,
    scorecardSha256,
    runManifestSetSha256,
    redactionsSha256,
  })));

  if (result && protocol && matrix) {
    if (result.benchmarkVersion !== protocol.benchmarkVersion) diagnostics.push(diagnostic("RESULT_VERSION", relative(root, resultFile), "Result and protocol benchmarkVersion must match."));
    if (result.evidenceTier !== protocol.evidenceTier) diagnostics.push(diagnostic("RESULT_EVIDENCE_TIER", relative(root, resultFile), "Result evidenceTier must match the preregistered protocol evidenceTier."));
    if (result.expectedRuns !== matrix.expectedRunSlots) diagnostics.push(diagnostic("RESULT_EXPECTED_RUNS", relative(root, resultFile), "Result expectedRuns must match matrix expectedRunSlots."));
    if (result.completedRuns !== completedRunCount) diagnostics.push(diagnostic("RESULT_COMPLETED_RUNS", relative(root, resultFile), "Result completedRuns must equal public success and condition-failure manifests."));
    if (result.validJuryVotes !== validVoteCount) diagnostics.push(diagnostic("RESULT_VALID_VOTES", relative(root, resultFile), "Result validJuryVotes must equal non-invalid public jury votes."));
    if (result.invalidJuryVotes !== invalidVoteCount) diagnostics.push(diagnostic("RESULT_INVALID_VOTES", relative(root, resultFile), "Result invalidJuryVotes must equal public invalid jury votes."));
    if (protocol.resultsStatus !== result.status || matrix.resultsStatus !== result.status) {
      diagnostics.push(diagnostic("RESULT_STATUS_DRIFT", relative(root, resultFile), "Protocol, matrix, and result result-status fields must match."));
    }
    if (result.scorecard) {
      if (!scorecard || result.scorecard.sha256 !== scorecardSha256) {
        diagnostics.push(diagnostic("RESULT_SCORECARD_DIGEST", relative(root, resultFile), "Result scorecard reference must bind the exact deterministic scorecard.json bytes."));
      }
    } else if (scorecard) {
      diagnostics.push(diagnostic("RESULT_SCORECARD_ORPHAN", relative(root, scorecardFile), "A published scorecard must be referenced by status.json."));
    }
    if (result.status === "partial" && (protocol.status !== "running" || matrix.status !== "running")) {
      diagnostics.push(diagnostic("RESULT_PARTIAL_LIFECYCLE", relative(root, resultFile), "Partial results require running protocol and matrix lifecycle status."));
    }
    if (result.status === "partial" && (!packet || !voteFreeze || !juryReveal)) {
      diagnostics.push(diagnostic("RESULT_PARTIAL_PROOFS", relative(root, resultFile), "Partial public results require a frozen packet/vote set and a verified post-freeze mapping reveal."));
    }
    if (result.status === "complete" && (protocol.status !== "complete" || matrix.status !== "complete")) {
      diagnostics.push(diagnostic("RESULT_COMPLETE_LIFECYCLE", relative(root, resultFile), "Complete results require complete protocol and matrix lifecycle status."));
    }
    if (result.status !== "complete" && (result.claims?.length ?? 0) > 0) {
      diagnostics.push(diagnostic("RESULT_PREMATURE_CLAIM", relative(root, resultFile), "Only complete results may publish benchmark claims."));
    }
    if (result.evidenceTier === "calibration" && (result.claims?.length ?? 0) > 0) {
      diagnostics.push(diagnostic("RESULT_CALIBRATION_CLAIM", relative(root, resultFile), "Calibration evidence may debug the protocol but cannot support comparative public claims."));
    }
    if (result.evidenceTier === "scored" && asArray(matrix.briefIds).length !== protocol.scope?.scoredBriefTarget) {
      diagnostics.push(diagnostic("RESULT_SCORED_SCOPE", relative(root, resultFile), "Scored evidence requires the full preregistered public-plus-holdout brief target."));
    }
    if (["partial", "complete"].includes(result.status) && !result.rightsReview) {
      diagnostics.push(diagnostic("RESULT_RIGHTS_REVIEW_MISSING", relative(root, resultFile), "Partial or complete public results require a documented publication-rights review."));
    }
    if (result.rightsReview?.evidenceBundleSha256 !== undefined
      && result.rightsReview.evidenceBundleSha256 !== evidenceBundleSha256) {
      diagnostics.push(diagnostic("RESULT_RIGHTS_EVIDENCE_DIGEST", relative(root, resultFile), "Rights review must bind the exact packet, votes, reveals, run-manifest set, scorecard, and redaction manifest."));
    }
    if (result.rightsReview?.publicationDecision === "approved-with-redactions") {
      if (!redactions
        || result.rightsReview.redactions?.manifestSha256 !== redactionsSha256
        || result.rightsReview.redactions?.count !== asArray(redactions?.items).length) {
        diagnostics.push(diagnostic("RESULT_REDACTIONS_BINDING", relative(root, resultFile), "Approved-with-redactions requires the exact non-empty redactions.json digest and item count."));
      }
    } else if (redactions) {
      diagnostics.push(diagnostic("RESULT_REDACTIONS_ORPHAN", relative(root, redactionsFile), "redactions.json may be published only with an approved-with-redactions rights decision."));
    }
    if (result.rightsReview?.publicationDecision === "withheld"
      && (result.status !== "pending" || packet || votes.length > 0 || scorecard || redactions)) {
      diagnostics.push(diagnostic("RESULT_PUBLICATION_WITHHELD", relative(root, resultFile), "A withheld publication decision forbids partial/complete status and public jury evidence, votes, scoring, or redactions."));
    }
    const reviewedAt = Date.parse(result.rightsReview?.reviewedAt);
    const latestRevealAt = Math.max(
      Date.parse(juryReveal?.revealedAt) || Number.NEGATIVE_INFINITY,
      Date.parse(holdoutReveal?.revealedAt) || Number.NEGATIVE_INFINITY,
    );
    if (result.rightsReview && (!Number.isFinite(reviewedAt) || reviewedAt < latestRevealAt)) {
      diagnostics.push(diagnostic("RESULT_RIGHTS_REVIEW_TIME", relative(root, resultFile), "Publication-rights review must occur after all published reveal artifacts."));
    }
    if ((result.claims?.length ?? 0) > 0
      && !["approved", "approved-with-redactions"].includes(result.rightsReview?.publicationDecision)) {
      diagnostics.push(diagnostic("RESULT_PUBLICATION_WITHHELD", relative(root, resultFile), "Benchmark claims require an approved publication decision in rightsReview."));
    }
    if ((result.claims?.length ?? 0) > 0 && scorecard?.claimEligibility?.improvementVsBaseline !== true) {
      diagnostics.push(diagnostic("RESULT_CLAIM_NOT_ELIGIBLE", relative(root, resultFile), "Improvement claims require a recomputed scorecard whose confidence interval and shipping non-inferiority gates pass."));
    }
    if (result.status === "complete") {
      if (!scorecard || !result.scorecard) {
        diagnostics.push(diagnostic("RESULT_SCORECARD_MISSING", relative(root, resultFile), "Complete results require a deterministic, digest-bound scorecard."));
      }
      if (protocol.holdout?.status !== "revealed") {
        diagnostics.push(diagnostic("RESULT_HOLDOUT_NOT_REVEALED", relative(root, resultFile), "Complete results require the holdout status to be revealed after vote freeze."));
      }
      if (result.evidenceTier === "scored" && (!voteFreeze || !juryReveal || !holdoutRevealVerified)) {
        diagnostics.push(diagnostic("RESULT_RELEASE_PROOFS", relative(root, resultFile), "Complete scored results require a byte-bound vote freeze, regenerated jury-key reveal, and cryptographically verified holdout reveal."));
      }
      if (completedRunCount !== matrix.expectedRunSlots || observedRunIds.size !== expectedRunIds.size
        || [...expectedRunIds].some((runId) => !observedRunIds.has(runId))) {
        diagnostics.push(diagnostic("RESULT_INCOMPLETE_MATRIX", relative(root, resultFile), "Complete results require every declared matrix run manifest."));
      }
      const minimumJurors = protocol.jury?.minimumIndependentJurors ?? Number.POSITIVE_INFINITY;
      const minimumVotes = protocol.jury?.minimumValidVotesPerComparison ?? Number.POSITIVE_INFINITY;
      const validVotes = votes.filter(({ value }) => value.choice !== "invalid").map(({ value }) => value);
      const distinctJurors = new Set(validVotes.map(({ jurorId }) => jurorId));
      const independentJurors = new Set(
        validVotes
          .filter(({ eligibility }) => eligibility?.relationship === "independent")
          .map(({ jurorId }) => jurorId),
      );
      if (independentJurors.size < minimumJurors) {
        diagnostics.push(diagnostic("RESULT_JURY_SIZE", relative(root, resultFile), `Complete results require at least ${minimumJurors} distinct independent pseudonymous jurors.`));
      }
      const minimumIndependentShare = protocol.jury?.minimumIndependentPanelShare ?? 1;
      if (distinctJurors.size === 0 || independentJurors.size / distinctJurors.size < minimumIndependentShare) {
        diagnostics.push(diagnostic("RESULT_JURY_INDEPENDENCE", relative(root, resultFile), `Independent jurors must comprise at least ${minimumIndependentShare * 100}% of the valid panel.`));
      }
      const votesByAssignment = new Map();
      for (const vote of validVotes) votesByAssignment.set(vote.assignmentId, (votesByAssignment.get(vote.assignmentId) ?? 0) + 1);
      const uncoveredAssignments = asArray(packet?.comparisons)
        .map(({ assignmentId }) => assignmentId)
        .filter((assignmentId) => (votesByAssignment.get(assignmentId) ?? 0) < minimumVotes);
      if (!packet || uncoveredAssignments.length > 0) {
        diagnostics.push(diagnostic("RESULT_JURY_COVERAGE", relative(root, resultFile), `Complete results require at least ${minimumVotes} valid votes for every revealed comparison.`));
      }
    }
  }

  if (protocol?.holdout?.status === "pending" && commitmentExists) {
    diagnostics.push(diagnostic("HOLDOUT_PREMATURE_COMMITMENT", relative(root, commitmentFile), "A public commitment cannot exist while protocol holdout status remains pending."));
  }
  if (["committed", "revealed"].includes(protocol?.holdout?.status) && !commitmentExists) {
    diagnostics.push(diagnostic("HOLDOUT_COMMITMENT_MISSING", relative(root, commitmentFile), "Committed or revealed holdout status requires a public commitment file."));
  }
  if (protocol?.holdout?.status === "revealed" && !holdoutRevealVerified) {
    diagnostics.push(diagnostic("HOLDOUT_REVEAL_MISSING", relative(root, holdoutRevealFile), "Revealed holdout status requires a cryptographically verified public reveal artifact."));
  }
  if (commitment) {
    if (protocol && commitment.benchmarkVersion !== protocol.benchmarkVersion) {
      diagnostics.push(diagnostic("HOLDOUT_VERSION", relative(root, commitmentFile), "Holdout commitment benchmarkVersion must match the protocol."));
    }
    try {
      const freeze = await createProtocolFreezeDigest(protocolRoot);
      if (commitment.protocolFreezeSha256 !== freeze.digest) {
        diagnostics.push(diagnostic("HOLDOUT_PROTOCOL_DIGEST", relative(root, commitmentFile), "Holdout commitment must bind the immutable protocol freeze digest."));
      }
    } catch (error) {
      diagnostics.push(diagnostic("HOLDOUT_PROTOCOL_FREEZE", relative(root, commitmentFile), `Protocol freeze digest could not be recomputed: ${error.message}`));
    }
  }

  if (protocol?.status !== "pending") {
    if (!matrix?.locked || !environment?.runReady || conditions.some(({ runReady }) => !runReady) || capture?.status !== "frozen") {
      diagnostics.push(diagnostic("PROTOCOL_FALSE_READY", relative(root, protocolFile), "A non-pending protocol requires a locked matrix and frozen run-ready conditions, environment, and capture profiles."));
    }
    if (!["committed", "revealed"].includes(protocol?.holdout?.status)) {
      diagnostics.push(diagnostic("PROTOCOL_HOLDOUT_PENDING", relative(root, protocolFile), "A non-pending protocol requires a committed holdout."));
    }
  }

  if (environment?.runReady === false && protocol?.status !== "pending") {
    diagnostics.push(diagnostic("ENVIRONMENT_NOT_READY", relative(root, environmentFile), "Protocol must remain pending while the environment is not run-ready."));
  }
  if (provenances.some(({ redistributionStatus }) => redistributionStatus !== "no-third-party-assets")) {
    diagnostics.push(diagnostic("THIRD_PARTY_ASSET", relative(root, briefRoot), "Calibration fixtures must not contain third-party assets."));
  }

  diagnostics.sort((left, right) => left.file.localeCompare(right.file, "en") || left.code.localeCompare(right.code, "en") || left.instancePath.localeCompare(right.instancePath, "en"));
  return {
    ok: diagnostics.length === 0,
    root,
    status: result?.status ?? "unknown",
    protocolStatus: protocol?.status ?? "unknown",
    counts: {
      schemas: Object.keys(schemas).length,
      conditions: conditions.length,
      calibrationBriefs: briefs.length,
      provenances: provenances.length,
      plannedRuns: matrix?.expectedRunSlots ?? 0,
      completedRuns: completedRunCount,
      juryVotes: validVoteCount,
      invalidJuryVotes: invalidVoteCount,
      runManifests: runs.length,
      voteFiles: votes.length,
    },
    diagnostics,
  };
}

function parseArguments(argv) {
  let root = defaultBenchmarkRoot;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") json = true;
    else if (argument === "--root") {
      if (!argv[index + 1]) throw new Error("--root requires a path");
      root = path.resolve(argv[index + 1]);
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return { root, json };
}

async function main() {
  const { root, json } = parseArguments(process.argv.slice(2));
  const result = await validateBenchmark(root);
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (result.ok) {
    process.stdout.write(`Benchmark validation passed: ${result.counts.conditions} conditions, ${result.counts.calibrationBriefs} calibration briefs, ${result.counts.plannedRuns} planned runs, results ${result.status}.\n`);
  } else {
    for (const item of result.diagnostics) {
      const location = item.instancePath ? `${item.file}${item.instancePath}` : item.file;
      process.stderr.write(`ERROR ${item.code} ${location} - ${item.message}\n`);
    }
    process.stderr.write(`Benchmark validation failed with ${result.diagnostics.length} error(s).\n`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Benchmark validation crashed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { validateAgainstSchema };
