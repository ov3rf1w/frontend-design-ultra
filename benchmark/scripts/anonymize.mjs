#!/usr/bin/env node

import { createHash, createHmac } from "node:crypto";
import { access, lstat, mkdir, readFile, realpath, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const REQUIRED_EVIDENCE = [
  "desktop-first-viewport",
  "desktop-full-page",
  "desktop-motion",
  "mobile-first-viewport",
  "mobile-full-page",
  "mobile-motion",
];
const EXTENSION_BY_MEDIA_TYPE = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);

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

export function computeBlindPacketSha256(inputPacket) {
  const packet = structuredClone(inputPacket);
  delete packet.blindPacketSha256;
  packet.status = "blind";
  packet.mappingRevealedAt = null;
  return sha256(JSON.stringify(canonicalJson(packet)));
}

function base32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function normalizeKey(input) {
  const key = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (key.length < 32) throw new Error("Anonymization key must contain at least 32 bytes");
  return key;
}

function digest(key, namespace, value) {
  return createHmac("sha256", key).update(`${namespace}\0${value}`, "utf8").digest();
}

export function opaqueId(value, inputKey, prefix = "E") {
  const key = normalizeKey(inputKey);
  return `${prefix}-${base32(digest(key, prefix, value).subarray(0, 10))}`;
}

function normalizeRelativeArtifactPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    throw new Error("Artifact path must be a non-empty POSIX relative path");
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Artifact path is unsafe: ${value}`);
  }
  return normalized;
}

function validateArtifact(artifact, runId) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new Error(`Run ${runId} contains an invalid artifact descriptor`);
  }
  if (!REQUIRED_EVIDENCE.includes(artifact.evidenceType)) {
    throw new Error(`Run ${runId} has an unsupported evidenceType: ${artifact.evidenceType}`);
  }
  normalizeRelativeArtifactPath(artifact.path);
  if (!EXTENSION_BY_MEDIA_TYPE.has(artifact.mediaType)) {
    throw new Error(`Run ${runId} has an unsupported artifact mediaType: ${artifact.mediaType}`);
  }
  if (!Number.isInteger(artifact.bytes) || artifact.bytes < 1) {
    throw new Error(`Run ${runId} has an invalid artifact byte count`);
  }
  if (typeof artifact.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
    throw new Error(`Run ${runId} has an invalid artifact SHA-256`);
  }
  const capture = artifact.capture;
  if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
    throw new Error(`Run ${runId} artifact ${artifact.evidenceType} is missing capture metadata`);
  }
  if (typeof capture.profileId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capture.profileId)
    || !Number.isInteger(capture.width) || capture.width < 320
    || !Number.isInteger(capture.height) || capture.height < 1
    || !Number.isInteger(capture.durationMs) || capture.durationMs < 0
    || !Number.isInteger(capture.frameCount) || capture.frameCount < 1
    || typeof capture.capturedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(capture.capturedAt)
    || !capture.probe || capture.probe.decodable !== true
    || typeof capture.probe.tool !== "string" || capture.probe.tool.length === 0
    || typeof capture.probe.version !== "string" || capture.probe.version.length === 0) {
    throw new Error(`Run ${runId} artifact ${artifact.evidenceType} has invalid capture metadata`);
  }
  const isMotion = artifact.evidenceType.endsWith("-motion");
  if (isMotion) {
    if (!artifact.mediaType.startsWith("video/")
      || capture.durationMs < 3000
      || capture.frameCount < 2
      || typeof capture.actionTimelineSha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(capture.actionTimelineSha256)) {
      throw new Error(`Run ${runId} motion artifact ${artifact.evidenceType} must be a probed video with a timeline digest`);
    }
  } else if (!artifact.mediaType.startsWith("image/")
    || capture.durationMs !== 0
    || capture.frameCount !== 1
    || capture.actionTimelineSha256 !== null) {
    throw new Error(`Run ${runId} static artifact ${artifact.evidenceType} must be a single probed image`);
  }
}

function validateRuns(runs, benchmarkVersion) {
  if (!Array.isArray(runs) || runs.length < 2) throw new Error("Input must contain at least two run manifests");
  const runIds = new Set();
  for (const run of runs) {
    if (!run || typeof run !== "object") throw new Error("Every run must be an object");
    for (const field of ["benchmarkVersion", "runId", "briefId", "conditionId", "status"]) {
      if (typeof run[field] !== "string" || !run[field]) throw new Error(`Run is missing ${field}`);
    }
    if (run.benchmarkVersion !== benchmarkVersion) {
      throw new Error(`Run ${run.runId} benchmarkVersion does not match ${benchmarkVersion}`);
    }
    if (!Number.isInteger(run.replicate) || run.replicate < 1) throw new Error(`Run ${run.runId} has an invalid replicate`);
    if (runIds.has(run.runId)) throw new Error(`Duplicate runId: ${run.runId}`);
    runIds.add(run.runId);
    if (run.status === "success") {
      if (!Array.isArray(run.artifacts)) throw new Error(`Successful run ${run.runId} must contain artifact descriptors`);
      run.artifacts.forEach((artifact) => validateArtifact(artifact, run.runId));
      const evidenceTypes = run.artifacts.map(({ evidenceType }) => evidenceType);
      if (new Set(evidenceTypes).size !== evidenceTypes.length) {
        throw new Error(`Run ${run.runId} contains duplicate evidence types`);
      }
      const artifactPaths = run.artifacts.map(({ path: artifactPath }) => artifactPath);
      if (new Set(artifactPaths).size !== artifactPaths.length) {
        throw new Error(`Run ${run.runId} reuses an artifact path across evidence types`);
      }
      const missing = REQUIRED_EVIDENCE.filter((evidenceType) => !evidenceTypes.includes(evidenceType));
      if (missing.length > 0) throw new Error(`Run ${run.runId} is missing required jury evidence: ${missing.join(", ")}`);
    }
  }
}

function pairs(items) {
  const output = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) output.push([items[left], items[right]]);
  }
  return output;
}

export function createBlindPacket(inputRuns, options = {}) {
  const key = normalizeKey(options.key);
  const benchmarkVersion = options.benchmarkVersion ?? "v1-calibration-mvp";
  const seed = options.seed ?? benchmarkVersion;
  if (typeof seed !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(seed)) {
    throw new Error("Randomization seed must be a 1-128 character public identifier using letters, digits, dot, underscore, colon, or hyphen");
  }
  validateRuns(inputRuns, benchmarkVersion);
  if (inputRuns.some(({ runId, conditionId }) => seed.includes(runId) || seed.includes(conditionId))) {
    throw new Error("Randomization seed must not contain a run or condition identifier");
  }
  const successfulRuns = inputRuns.filter(({ status }) => status === "success");
  if (successfulRuns.length < 2) throw new Error("At least two successful runs are required");

  const entryByRun = new Map();
  for (const run of successfulRuns) {
    entryByRun.set(run.runId, opaqueId(run.runId, key, "E"));
  }

  const groups = new Map();
  for (const run of successfulRuns) {
    const groupKey = `${run.briefId}\0${run.replicate}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(run);
  }

  const comparisons = [];
  const mappingComparisons = [];
  for (const [groupKey, groupRuns] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const conditionIds = groupRuns.map(({ conditionId }) => conditionId);
    if (new Set(conditionIds).size !== conditionIds.length) throw new Error(`Duplicate condition in brief/replicate group: ${groupKey.replace("\0", "/")}`);
    const orderedRuns = [...groupRuns].sort((left, right) => left.conditionId.localeCompare(right.conditionId, "en"));
    for (const [first, second] of pairs(orderedRuns)) {
      const pairSource = `${seed}\0${first.briefId}\0${first.replicate}\0${first.runId}\0${second.runId}`;
      const assignmentId = opaqueId(pairSource, key, "P");
      const swap = (digest(key, "side", pairSource)[0] & 1) === 1;
      const leftRun = swap ? second : first;
      const rightRun = swap ? first : second;
      const publicComparison = {
        assignmentId,
        briefId: first.briefId,
        replicate: first.replicate,
        left: { entryId: entryByRun.get(leftRun.runId) },
        right: { entryId: entryByRun.get(rightRun.runId) },
        requiredEvidence: [...REQUIRED_EVIDENCE]
      };
      const orderKey = digest(key, "order", `${seed}\0${assignmentId}`).toString("hex");
      comparisons.push({ orderKey, value: publicComparison });
      mappingComparisons.push({
        assignmentId,
        leftRunId: leftRun.runId,
        leftConditionId: leftRun.conditionId,
        rightRunId: rightRun.runId,
        rightConditionId: rightRun.conditionId,
      });
    }
  }

  if (comparisons.length === 0) throw new Error("No within-brief, within-replicate comparison could be created");
  comparisons.sort((left, right) => left.orderKey.localeCompare(right.orderKey, "en"));
  mappingComparisons.sort((left, right) => left.assignmentId.localeCompare(right.assignmentId, "en"));

  const privateEntries = [];
  const publicEntries = [...entryByRun.entries()]
    .map(([runId, entryId]) => {
      const run = successfulRuns.find((candidate) => candidate.runId === runId);
      const artifacts = [...run.artifacts]
        .sort((left, right) => left.evidenceType.localeCompare(right.evidenceType, "en"))
        .map((artifact) => {
          const artifactId = opaqueId(`${run.runId}\0${artifact.evidenceType}\0${artifact.sha256}`, key, "A");
          const extension = EXTENSION_BY_MEDIA_TYPE.get(artifact.mediaType);
          const juryPath = `entries/${entryId}/${artifactId}${extension}`;
          const blindDigest = digest(
            key,
            "artifact",
            `${run.runId}\0${artifact.evidenceType}\0${artifact.sha256}`,
          ).toString("hex");
          const publicCapture = {
            profileId: artifact.capture.profileId,
            width: artifact.capture.width,
            height: artifact.capture.height,
            durationMs: artifact.capture.durationMs,
            frameCount: artifact.capture.frameCount,
            actionTimelineBlindDigest: artifact.capture.actionTimelineSha256 === null
              ? null
              : digest(
                key,
                "timeline",
                `${run.runId}\0${artifact.evidenceType}\0${artifact.capture.actionTimelineSha256}`,
              ).toString("hex"),
            probe: { ...artifact.capture.probe },
          };
          return {
            artifactId,
            evidenceType: artifact.evidenceType,
            path: juryPath,
            mediaType: artifact.mediaType,
            blindDigest,
            capture: {
              ...artifact.capture,
              probe: { ...artifact.capture.probe },
            },
            publicCapture,
            originalPath: artifact.path,
            sourceBytes: artifact.bytes,
            sourceSha256: artifact.sha256,
          };
        });
      privateEntries.push({
        entryId,
        runId,
        conditionId: run.conditionId,
        artifacts: artifacts.map(({ originalPath, publicCapture, ...artifact }) => ({
          ...artifact,
          originalPath,
        })),
      });
      const publicArtifacts = artifacts.map(({
        originalPath,
        sourceBytes,
        sourceSha256,
        capture,
        publicCapture,
        ...artifact
      }) => ({
        ...artifact,
        capture: publicCapture,
      }));
      return {
        entryId,
        artifactSetSha256: sha256(JSON.stringify(canonicalJson(publicArtifacts))),
        artifacts: publicArtifacts,
      };
    })
    .sort((left, right) => left.entryId.localeCompare(right.entryId, "en"));
  privateEntries.sort((left, right) => left.entryId.localeCompare(right.entryId, "en"));

  const randomization = {
    algorithm: "hmac-sha256-v1",
    seed,
    seedSha256: sha256(seed),
    keyCommitmentSha256: sha256(key),
  };

  const packet = {
    $schema: "../../protocol/v1/schemas/blind-packet.schema.json",
    schemaVersion: 2,
    benchmarkVersion,
    status: "blind",
    mappingRevealedAt: null,
    randomization,
    entryCount: publicEntries.length,
    comparisonCount: comparisons.length,
    entries: publicEntries,
    comparisons: comparisons.map(({ value }) => value),
  };
  packet.blindPacketSha256 = computeBlindPacketSha256(packet);
  return {
    packet,
    mapping: {
      schemaVersion: 2,
      benchmarkVersion,
      status: "private-until-vote-freeze",
      blindPacketSha256: packet.blindPacketSha256,
      randomization,
      entries: privateEntries,
      comparisons: mappingComparisons,
    },
  };
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function resolveThroughExistingAncestor(target) {
  let cursor = path.resolve(target);
  const missingSegments = [];
  while (!(await exists(cursor))) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`No existing ancestor could be resolved for ${target}`);
    missingSegments.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.resolve(await realpath(cursor), ...missingSegments);
}

export function assertOutputSeparation(packetPath, mappingPath, artifactDirectory) {
  const packet = path.resolve(packetPath);
  const mapping = path.resolve(mappingPath);
  const artifacts = path.resolve(artifactDirectory);
  if (packet === mapping) throw new Error("Packet and private mapping paths must differ");
  if (pathIsInside(artifacts, mapping)) {
    throw new Error("Private mapping must remain outside the public jury artifact directory");
  }
  return { packet, mapping, artifacts };
}

export async function assertCanonicalOutputSeparation(packetPath, mappingPath, artifactDirectory) {
  const lexical = assertOutputSeparation(packetPath, mappingPath, artifactDirectory);
  const [packet, mapping, artifacts] = await Promise.all([
    resolveThroughExistingAncestor(lexical.packet),
    resolveThroughExistingAncestor(lexical.mapping),
    resolveThroughExistingAncestor(lexical.artifacts),
  ]);
  if (packet === mapping) throw new Error("Packet and private mapping paths resolve to the same canonical location");
  if (pathIsInside(artifacts, mapping)) {
    throw new Error("Private mapping resolves inside the public jury artifact directory");
  }
  return { packet, mapping, artifacts };
}

function hasExpectedMediaSignature(content, mediaType) {
  if (mediaType === "image/jpeg") {
    return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  }
  if (mediaType === "image/png") {
    return content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mediaType === "image/webp") {
    return content.length >= 12
      && content.subarray(0, 4).toString("ascii") === "RIFF"
      && content.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mediaType === "video/mp4") {
    return content.length >= 12 && content.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mediaType === "video/webm") {
    return content.length >= 4 && content.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  return false;
}

export function inspectMediaPrivacy(content, mediaType, options = {}) {
  const issues = [];
  const lowerText = content.toString("latin1").toLowerCase();
  for (const value of options.sensitiveValues ?? []) {
    if (typeof value !== "string" || value.length < 3) continue;
    if (lowerText.includes(value.toLowerCase())) issues.push(`embedded private identifier ${JSON.stringify(value)}`);
  }
  const genericMarkers = [
    "exif\u0000\u0000",
    "http://ns.adobe.com/xap",
    "xml:com.adobe.xmp",
    "gpslatitude",
    "gpslongitude",
    "location-eng",
  ];
  for (const marker of genericMarkers) {
    if (lowerText.includes(marker)) issues.push(`embedded metadata marker ${JSON.stringify(marker)}`);
  }
  if (mediaType === "image/png") {
    let offset = 8;
    while (offset + 12 <= content.length) {
      const length = content.readUInt32BE(offset);
      const type = content.subarray(offset + 4, offset + 8).toString("ascii");
      if (["tEXt", "zTXt", "iTXt", "eXIf"].includes(type)) issues.push(`PNG ${type} metadata chunk`);
      const nextOffset = offset + 12 + length;
      if (nextOffset <= offset || nextOffset > content.length) break;
      offset = nextOffset;
    }
  } else if (mediaType === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= content.length && content[offset] === 0xff) {
      const marker = content[offset + 1];
      if ([0xe1, 0xed, 0xfe].includes(marker)) issues.push(`JPEG metadata marker 0x${marker.toString(16)}`);
      if (marker === 0xd9 || marker === 0xda) break;
      const length = content.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  } else if (mediaType === "image/webp") {
    let offset = 12;
    while (offset + 8 <= content.length) {
      const type = content.subarray(offset, offset + 4).toString("ascii");
      const length = content.readUInt32LE(offset + 4);
      if (["EXIF", "XMP ", "ICCP"].includes(type)) issues.push(`WebP ${type.trim()} metadata chunk`);
      const nextOffset = offset + 8 + length + (length % 2);
      if (nextOffset <= offset || nextOffset > content.length) break;
      offset = nextOffset;
    }
  } else if (mediaType === "video/mp4") {
    for (const marker of ["\u00a9nam", "\u00a9art", "\u00a9cmt", "com.apple.quicktime.location"]) {
      if (lowerText.includes(marker)) issues.push(`MP4 identifying metadata ${JSON.stringify(marker)}`);
    }
  } else if (mediaType === "video/webm") {
    for (const marker of ["\u0012t\u00c3g", "title\u0000", "artist\u0000", "comment\u0000"]) {
      if (lowerText.includes(marker)) issues.push(`WebM identifying metadata ${JSON.stringify(marker)}`);
    }
  }
  return [...new Set(issues)];
}

export async function stageBlindArtifacts(mapping, artifactRoot, artifactDirectory) {
  const sourceRoot = await realpath(path.resolve(artifactRoot));
  const requestedOutput = path.resolve(artifactDirectory);
  if (pathIsInside(sourceRoot, requestedOutput)) {
    throw new Error("Jury artifact output must remain outside the private artifact source root");
  }
  await mkdir(path.dirname(requestedOutput), { recursive: true });
  const outputParent = await realpath(path.dirname(requestedOutput));
  const output = path.join(outputParent, path.basename(requestedOutput));
  if (pathIsInside(sourceRoot, output)) {
    throw new Error("Jury artifact output resolves inside the private artifact source root");
  }
  if (await exists(output)) throw new Error(`Refusing to overwrite existing jury artifact directory: ${output}`);

  const temporary = `${output}.tmp-${process.pid}`;
  await mkdir(temporary, { recursive: true });
  try {
    const stagedTargets = new Set();
    for (const entry of mapping.entries) {
      for (const artifact of entry.artifacts) {
        const relativeSource = normalizeRelativeArtifactPath(artifact.originalPath);
        const source = path.resolve(sourceRoot, ...relativeSource.split("/"));
        if (!pathIsInside(sourceRoot, source)) throw new Error(`Artifact resolves outside source root: ${relativeSource}`);
        const metadata = await lstat(source);
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new Error(`Artifact source must be a regular non-link file: ${relativeSource}`);
        }
        const canonicalSource = await realpath(source);
        if (!pathIsInside(sourceRoot, canonicalSource)) {
          throw new Error(`Artifact source resolves outside source root: ${relativeSource}`);
        }
        const content = await readFile(canonicalSource);
        if (content.length !== artifact.sourceBytes) {
          throw new Error(`Artifact byte count mismatch for ${relativeSource}`);
        }
        if (sha256(content) !== artifact.sourceSha256) {
          throw new Error(`Artifact SHA-256 mismatch for ${relativeSource}`);
        }
        if (!hasExpectedMediaSignature(content, artifact.mediaType)) {
          throw new Error(`Artifact media signature does not match ${artifact.mediaType}: ${relativeSource}`);
        }
        const privacyIssues = inspectMediaPrivacy(content, artifact.mediaType, {
          sensitiveValues: [
            entry.runId,
            entry.conditionId,
            artifact.originalPath,
            path.posix.basename(artifact.originalPath),
          ],
        });
        if (privacyIssues.length > 0) {
          throw new Error(`Artifact contains private identifiers or metadata (${relativeSource}): ${privacyIssues.join(", ")}`);
        }
        const target = path.resolve(temporary, ...artifact.path.split("/"));
        if (!pathIsInside(temporary, target)) throw new Error(`Jury artifact path is unsafe: ${artifact.path}`);
        if (stagedTargets.has(target)) throw new Error(`Duplicate jury artifact target: ${artifact.path}`);
        stagedTargets.add(target);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content, { mode: 0o644 });
      }
    }
    await rename(temporary, output);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function atomicJsonWrite(target, value, options = {}) {
  if (!options.force && (await exists(target))) throw new Error(`Refusing to overwrite existing file: ${target}`);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: options.mode ?? 0o600 });
    if (options.force && (await exists(target))) await unlink(target);
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

function parseArguments(argv) {
  const options = { force: false, seed: undefined, benchmarkVersion: "v1-calibration-mvp" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") options.force = true;
    else if (["--input", "--packet", "--mapping", "--key-file", "--seed", "--benchmark-version", "--artifact-root", "--artifact-dir"].includes(argument)) {
      if (!argv[index + 1]) throw new Error(`${argument} requires a value`);
      const name = {
        "--input": "input",
        "--packet": "packet",
        "--mapping": "mapping",
        "--key-file": "keyFile",
        "--seed": "seed",
        "--benchmark-version": "benchmarkVersion",
        "--artifact-root": "artifactRoot",
        "--artifact-dir": "artifactDir",
      }[argument];
      options[name] = argv[index + 1];
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  for (const required of ["input", "packet", "mapping", "keyFile", "artifactRoot", "artifactDir"]) {
    if (!options[required]) throw new Error(`Missing required --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const input = JSON.parse(await readFile(path.resolve(options.input), "utf8"));
  const runs = Array.isArray(input) ? input : input.runs;
  const key = await readFile(path.resolve(options.keyFile));
  const result = createBlindPacket(runs, {
    key,
    seed: options.seed,
    benchmarkVersion: options.benchmarkVersion,
  });
  const {
    packet: packetPath,
    mapping: mappingPath,
    artifacts: artifactDirectory,
  } = await assertCanonicalOutputSeparation(options.packet, options.mapping, options.artifactDir);
  const packetExisted = await exists(packetPath);
  const mappingExisted = await exists(mappingPath);
  if (!options.force) {
    if (packetExisted) throw new Error(`Refusing to overwrite existing file: ${packetPath}`);
    if (mappingExisted) throw new Error(`Refusing to overwrite existing file: ${mappingPath}`);
  }
  await stageBlindArtifacts(result.mapping, options.artifactRoot, artifactDirectory);
  try {
    await atomicJsonWrite(mappingPath, result.mapping, { force: options.force, mode: 0o600 });
    await atomicJsonWrite(packetPath, result.packet, { force: options.force, mode: 0o644 });
  } catch (error) {
    await rm(artifactDirectory, { recursive: true, force: true }).catch(() => {});
    if (!packetExisted) await unlink(packetPath).catch(() => {});
    if (!mappingExisted) await unlink(mappingPath).catch(() => {});
    throw error;
  }
  process.stdout.write(`Created ${result.packet.comparisonCount} blind comparisons and staged ${result.packet.entryCount} opaque evidence entries. Keep ${mappingPath} and the key private until vote freeze.\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Anonymization failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
