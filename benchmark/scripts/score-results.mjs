#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createBlindPacket } from "./anonymize.mjs";

const SCORE_ALGORITHM = "fdu-score-v1";
const BOOTSTRAP_ALGORITHM = "sha256-counter-brief-bootstrap-v1";
const BOOTSTRAP_ITERATIONS = 10000;
const PRIMARY_CONDITION = "frontend-design-ultra";
const BASELINE_CONDITION = "baseline-no-design-skill";
const SHIPPING_NON_INFERIORITY_MARGIN_PPM = 50000;

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

function ppm(numerator, denominator) {
  if (denominator === 0) return 0;
  return Math.round((numerator * 1_000_000) / denominator);
}

function bootstrapConfidenceInterval(clusters, seed) {
  const samples = [];
  for (let iteration = 0; iteration < BOOTSTRAP_ITERATIONS; iteration += 1) {
    let pointsTwice = 0;
    let possiblePointsTwice = 0;
    for (let draw = 0; draw < clusters.length; draw += 1) {
      const random = createHash("sha256")
        .update(`${seed}\0${iteration}\0${draw}`, "utf8")
        .digest()
        .readUInt32BE(0);
      const cluster = clusters[random % clusters.length];
      pointsTwice += cluster.pointsTwice;
      possiblePointsTwice += cluster.possiblePointsTwice;
    }
    samples.push(ppm(pointsTwice, possiblePointsTwice));
  }
  samples.sort((left, right) => left - right);
  return {
    lowerPpm: samples[Math.floor((samples.length - 1) * 0.025)],
    upperPpm: samples[Math.ceil((samples.length - 1) * 0.975)],
  };
}

export function createScorecard({
  benchmarkVersion,
  packet,
  juryReveal,
  runs,
  votes,
  inputDigests,
}) {
  const key = Buffer.from(juryReveal.keyHex, "hex");
  const successfulRuns = runs.filter(({ status }) => status === "success");
  const regenerated = createBlindPacket(successfulRuns, {
    key,
    seed: packet.randomization.seed,
    benchmarkVersion,
  });
  if (regenerated.packet.blindPacketSha256 !== packet.blindPacketSha256) {
    throw new Error("Revealed key and run manifests do not regenerate the blind packet");
  }
  const packetComparisonById = new Map(packet.comparisons.map((comparison) => [comparison.assignmentId, comparison]));
  const relevantAssignments = new Map();
  for (const comparison of regenerated.mapping.comparisons) {
    const conditions = new Set([comparison.leftConditionId, comparison.rightConditionId]);
    if (!conditions.has(PRIMARY_CONDITION) || !conditions.has(BASELINE_CONDITION)) continue;
    const packetComparison = packetComparisonById.get(comparison.assignmentId);
    if (!packetComparison) throw new Error(`Packet comparison is missing ${comparison.assignmentId}`);
    relevantAssignments.set(comparison.assignmentId, {
      briefId: packetComparison.briefId,
      primarySide: comparison.leftConditionId === PRIMARY_CONDITION ? "left" : "right",
    });
  }
  if (relevantAssignments.size === 0) throw new Error("No Frontend Design Ultra versus baseline assignments were found");

  const primary = {
    conditionId: PRIMARY_CONDITION,
    comparatorConditionId: BASELINE_CONDITION,
    wins: 0,
    losses: 0,
    ties: 0,
    validVotes: 0,
    invalidVotes: 0,
    pointsTwice: 0,
    possiblePointsTwice: 0,
    preferenceSharePpm: 0,
    briefClusters: 0,
    ci95: { lowerPpm: 0, upperPpm: 0 },
  };
  const clusters = new Map();
  for (const vote of votes) {
    const assignment = relevantAssignments.get(vote.assignmentId);
    if (!assignment) continue;
    if (vote.packetSha256 !== packet.blindPacketSha256) {
      throw new Error(`Vote ${vote.assignmentId}/${vote.jurorId} binds a different packet`);
    }
    if (vote.choice === "invalid") {
      primary.invalidVotes += 1;
      continue;
    }
    primary.validVotes += 1;
    primary.possiblePointsTwice += 2;
    const cluster = clusters.get(assignment.briefId) ?? {
      briefId: assignment.briefId,
      pointsTwice: 0,
      possiblePointsTwice: 0,
    };
    cluster.possiblePointsTwice += 2;
    if (vote.choice === "tie") {
      primary.ties += 1;
      primary.pointsTwice += 1;
      cluster.pointsTwice += 1;
    } else if (vote.choice === assignment.primarySide) {
      primary.wins += 1;
      primary.pointsTwice += 2;
      cluster.pointsTwice += 2;
    } else {
      primary.losses += 1;
    }
    clusters.set(assignment.briefId, cluster);
  }
  if (primary.validVotes === 0 || clusters.size === 0) {
    throw new Error("At least one valid vote in one brief cluster is required");
  }
  primary.preferenceSharePpm = ppm(primary.pointsTwice, primary.possiblePointsTwice);
  primary.briefClusters = clusters.size;
  const bootstrapSeedSha256 = sha256([
    SCORE_ALGORITHM,
    inputDigests.blindPacketSha256,
    inputDigests.voteFreezeSha256,
    inputDigests.juryRevealSha256,
    inputDigests.runManifestSetSha256,
  ].join("\0"));
  primary.ci95 = bootstrapConfidenceInterval(
    [...clusters.values()].sort((left, right) => left.briefId.localeCompare(right.briefId, "en")),
    bootstrapSeedSha256,
  );

  const shippingByCondition = [];
  for (const conditionId of [...new Set(runs.map((run) => run.conditionId))].sort((left, right) => left.localeCompare(right, "en"))) {
    const conditionRuns = runs.filter((run) => run.conditionId === conditionId);
    const successful = conditionRuns.filter(({ status }) => status === "success").length;
    shippingByCondition.push({
      conditionId,
      totalRuns: conditionRuns.length,
      successfulRuns: successful,
      conditionFailures: conditionRuns.filter(({ status }) => status === "condition-failure").length,
      infrastructureInvalid: conditionRuns.filter(({ status }) => status === "infrastructure-invalid").length,
      pendingRuns: conditionRuns.filter(({ status }) => status === "pending").length,
      successRatePpm: ppm(successful, conditionRuns.length),
    });
  }
  const primaryShipping = shippingByCondition.find(({ conditionId }) => conditionId === PRIMARY_CONDITION);
  const baselineShipping = shippingByCondition.find(({ conditionId }) => conditionId === BASELINE_CONDITION);
  if (!primaryShipping || !baselineShipping) throw new Error("Shipping summary requires both primary and baseline conditions");
  const shippingDifferencePpm = primaryShipping.successRatePpm - baselineShipping.successRatePpm;
  const shippingNonInferiority = {
    marginPpm: SHIPPING_NON_INFERIORITY_MARGIN_PPM,
    differencePpm: shippingDifferencePpm,
    passes: shippingDifferencePpm >= -SHIPPING_NON_INFERIORITY_MARGIN_PPM,
  };
  const improvementEligible = primary.ci95.lowerPpm > 500000 && shippingNonInferiority.passes;

  return {
    $schema: "../../protocol/v1/schemas/scorecard.schema.json",
    schemaVersion: 1,
    benchmarkVersion,
    status: "computed",
    inputs: { ...inputDigests },
    method: {
      id: SCORE_ALGORITHM,
      tiePointsNumerator: 1,
      tiePointsDenominator: 2,
      bootstrap: {
        algorithm: BOOTSTRAP_ALGORITHM,
        iterations: BOOTSTRAP_ITERATIONS,
        confidenceLevelPpm: 950000,
        seedSha256: bootstrapSeedSha256,
      },
    },
    creative: { primary },
    shipping: {
      byCondition: shippingByCondition,
      nonInferiority: shippingNonInferiority,
    },
    claimEligibility: {
      improvementVsBaseline: improvementEligible,
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

async function listJsonFiles(directory) {
  if (!(await exists(directory))) return [];
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function parseArguments(argv) {
  const options = { root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") options.force = true;
    else if (argument === "--root" || argument === "--output") {
      if (!argv[index + 1]) throw new Error(`${argument} requires a value`);
      options[argument === "--root" ? "root" : "output"] = path.resolve(argv[index + 1]);
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  options.output ??= path.join(options.root, "results", "v1", "scorecard.json");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const resultsRoot = path.join(options.root, "results", "v1");
  const protocol = await readJson(path.join(options.root, "protocol", "v1", "protocol.json"));
  const packetFile = path.join(resultsRoot, "jury-packet.json");
  const voteFreezeFile = path.join(resultsRoot, "vote-freeze.json");
  const juryRevealFile = path.join(resultsRoot, "jury-mapping.reveal.json");
  const runFiles = await listJsonFiles(path.join(resultsRoot, "run-manifests"));
  const voteFiles = await listJsonFiles(path.join(resultsRoot, "jury-votes"));
  const packet = await readJson(packetFile);
  const juryReveal = await readJson(juryRevealFile);
  const runs = await Promise.all(runFiles.map(readJson));
  const votes = await Promise.all(voteFiles.map(readJson));
  const runDescriptors = await Promise.all(runFiles.map(async (file) => ({
    path: path.posix.join("run-manifests", path.basename(file)),
    sha256: sha256(await readFile(file)),
  })));
  const scorecard = createScorecard({
    benchmarkVersion: protocol.benchmarkVersion,
    packet,
    juryReveal,
    runs,
    votes,
    inputDigests: {
      blindPacketSha256: packet.blindPacketSha256,
      voteFreezeSha256: sha256(await readFile(voteFreezeFile)),
      juryRevealSha256: sha256(await readFile(juryRevealFile)),
      runManifestSetSha256: sha256(JSON.stringify(canonicalJson(runDescriptors))),
    },
  });
  if (!options.force && await exists(options.output)) throw new Error(`Refusing to overwrite ${options.output}`);
  await mkdir(path.dirname(options.output), { recursive: true });
  const temporary = `${options.output}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(scorecard, null, 2)}\n`, { mode: 0o644 });
  if (options.force && await exists(options.output)) await unlink(options.output);
  await rename(temporary, options.output);
  process.stdout.write(`Scorecard written to ${options.output}.\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Scoring failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
