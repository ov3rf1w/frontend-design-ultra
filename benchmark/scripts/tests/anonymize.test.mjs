import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertOutputSeparation,
  assertCanonicalOutputSeparation,
  computeBlindPacketSha256,
  createBlindPacket,
  opaqueId,
  stageBlindArtifacts,
} from "../anonymize.mjs";
import { validateAgainstSchema } from "../validate.mjs";

const key = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const benchmarkVersion = "v1-calibration-mvp";
const benchmarkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidenceTypes = [
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

function artifactDescriptors(conditionId) {
  return evidenceTypes.map((evidenceType) => {
    const isMotion = evidenceType.endsWith("-motion");
    const prefix = isMotion
      ? Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
      : Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const content = Buffer.concat([prefix, Buffer.from(`opaque-evidence:${evidenceType}`, "utf8")]);
    const mobile = evidenceType.startsWith("mobile-");
    return {
      evidenceType,
      path: `${conditionId}/${evidenceType}${isMotion ? ".webm" : ".png"}`,
      mediaType: isMotion ? "video/webm" : "image/png",
      bytes: content.length,
      sha256: sha256(content),
      capture: {
        profileId: mobile ? "mobile-jury" : "desktop-jury",
        width: mobile ? 393 : 1440,
        height: mobile ? 852 : 900,
        durationMs: isMotion ? 5000 : 0,
        frameCount: isMotion ? 150 : 1,
        actionTimelineSha256: isMotion ? sha256(`${evidenceType}:timeline`) : null,
        capturedAt: "2026-07-16T12:00:00Z",
        probe: {
          tool: "fixture-probe",
          version: "1.0.0",
          decodable: true,
        },
      },
      content,
    };
  });
}

function run(conditionId, status = "success") {
  return {
    benchmarkVersion,
    runId: `brief--${conditionId}--r1`,
    briefId: "brief",
    conditionId,
    replicate: 1,
    status,
    artifacts: artifactDescriptors(conditionId).map(({ content, ...artifact }) => artifact),
  };
}

const runs = [
  run("baseline-no-design-skill"),
  run("frontend-design-ultra"),
  run("compact-subject-grounded"),
  run("workflow-detector"),
];

test("creates deterministic all-pairs blind comparisons with reproducible seed metadata and no condition leakage", async () => {
  const first = createBlindPacket(runs, { key, seed: "fixed-seed", benchmarkVersion });
  const second = createBlindPacket(runs, { key, seed: "fixed-seed", benchmarkVersion });
  assert.deepEqual(first, second);
  assert.equal(first.packet.schemaVersion, 2);
  assert.equal(first.packet.comparisonCount, 6);
  assert.equal(first.packet.entryCount, 4);
  assert.equal(first.packet.blindPacketSha256, computeBlindPacketSha256(first.packet));
  assert.equal(first.mapping.blindPacketSha256, first.packet.blindPacketSha256);
  assert.deepEqual(first.packet.randomization, {
    algorithm: "hmac-sha256-v1",
    seed: "fixed-seed",
    seedSha256: sha256("fixed-seed"),
    keyCommitmentSha256: sha256(key),
  });
  assert.deepEqual(first.mapping.randomization, first.packet.randomization);

  const serializedPacket = JSON.stringify(first.packet);
  for (const sourceRun of runs) {
    assert.equal(serializedPacket.includes(sourceRun.runId), false);
    assert.equal(serializedPacket.includes(sourceRun.conditionId), false);
    for (const artifact of sourceRun.artifacts) {
      assert.equal(serializedPacket.includes(artifact.path), false);
      assert.equal(serializedPacket.includes(artifact.sha256), false);
      if (artifact.capture.actionTimelineSha256) {
        assert.equal(serializedPacket.includes(artifact.capture.actionTimelineSha256), false);
      }
      assert.equal(serializedPacket.includes(artifact.capture.capturedAt), false);
    }
  }
  assert.equal(serializedPacket.includes("\"bytes\""), false);
  assert.equal(serializedPacket.includes("\"sha256\""), false);
  assert.ok(first.packet.entries.every(({ entryId, artifacts }) =>
    /^E-[A-Z2-7]+$/.test(entryId)
      && artifacts.length === 6
      && artifacts.every(({ artifactId, path: artifactPath, blindDigest }) =>
        /^A-[A-Z2-7]+$/.test(artifactId)
          && artifactPath.startsWith(`entries/${entryId}/${artifactId}.`)
          && /^[a-f0-9]{64}$/.test(blindDigest))));
  assert.ok(first.packet.comparisons.every(({ assignmentId }) => /^P-[A-Z2-7]+$/.test(assignmentId)));
  const schema = JSON.parse(await readFile(path.join(
    benchmarkRoot,
    "protocol",
    "v1",
    "schemas",
    "blind-packet.schema.json",
  ), "utf8"));
  assert.deepEqual(validateAgainstSchema(first.packet, schema), []);
});

test("ignores unsuccessful runs but retains successful within-group comparisons", () => {
  const result = createBlindPacket(
    [runs[0], runs[1], { ...runs[2], status: "condition-failure", artifacts: [] }],
    { key, seed: "fixed-seed", benchmarkVersion },
  );
  assert.equal(result.packet.comparisonCount, 1);
  assert.equal(result.mapping.entries.length, 2);
});

test("rejects weak keys, mismatched benchmark versions, unsafe paths, and incomplete evidence", () => {
  assert.throws(() => opaqueId("run", "short-key"), /at least 32 bytes/);
  assert.throws(
    () => createBlindPacket([{ ...runs[0], benchmarkVersion: "other" }, runs[1]], { key, benchmarkVersion }),
    /benchmarkVersion does not match/,
  );
  assert.throws(
    () => createBlindPacket(runs.slice(0, 2), {
      key,
      benchmarkVersion,
      seed: `seed-${runs[0].conditionId}`,
    }),
    /must not contain a run or condition identifier/,
  );
  assert.throws(
    () => createBlindPacket([{ ...runs[0], artifacts: runs[0].artifacts.slice(1) }, runs[1]], { key, benchmarkVersion }),
    /missing required jury evidence/,
  );
  assert.throws(
    () => createBlindPacket([
      { ...runs[0], artifacts: [{ ...runs[0].artifacts[0], path: "../leak.webp" }, ...runs[0].artifacts.slice(1)] },
      runs[1],
    ], { key, benchmarkVersion }),
    /unsafe/,
  );
});

test("keeps the private mapping outside the public jury artifact directory", () => {
  assert.throws(
    () => assertOutputSeparation(
      "release/jury-packet.json",
      "release/evidence/private-mapping.json",
      "release/evidence",
    ),
    /Private mapping must remain outside/,
  );
  assert.doesNotThrow(() => assertOutputSeparation(
    "release/jury-packet.json",
    "private/jury-mapping.json",
    "release/evidence",
  ));
});

test("rejects a mapping parent junction that resolves into the public artifact tree", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-anonymize-junction-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const publicRoot = path.join(root, "public");
  const artifactRoot = path.join(publicRoot, "evidence");
  const apparentPrivateRoot = path.join(root, "private-link");
  await mkdir(artifactRoot, { recursive: true });
  await symlink(artifactRoot, apparentPrivateRoot, "junction");
  await assert.rejects(
    () => assertCanonicalOutputSeparation(
      path.join(publicRoot, "jury-packet.json"),
      path.join(apparentPrivateRoot, "mapping.json"),
      artifactRoot,
    ),
    /resolves inside/,
  );
});

test("stages digest-verified jury artifacts at opaque packet paths", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-anonymize-artifacts-"));
  const sourceRoot = path.join(root, "private-source");
  const outputRoot = path.join(root, "jury-evidence");
  context.after(() => rm(root, { recursive: true, force: true }));

  for (const sourceRun of runs.slice(0, 2)) {
    for (const artifact of artifactDescriptors(sourceRun.conditionId)) {
      const target = path.join(sourceRoot, ...artifact.path.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, artifact.content);
    }
  }

  const result = createBlindPacket(runs.slice(0, 2), { key, seed: "public-seed", benchmarkVersion });
  await stageBlindArtifacts(result.mapping, sourceRoot, outputRoot);

  for (const entry of result.packet.entries) {
    for (const artifact of entry.artifacts) {
      const content = await readFile(path.join(outputRoot, ...artifact.path.split("/")));
      const privateArtifact = result.mapping.entries
        .flatMap(({ artifacts }) => artifacts)
        .find(({ path: artifactPath }) => artifactPath === artifact.path);
      assert.equal(content.length, privateArtifact.sourceBytes);
      assert.equal(sha256(content), privateArtifact.sourceSha256);
    }
  }
});

test("rejects a digest-matching file whose binary signature contradicts its declared media type", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-anonymize-signature-"));
  const sourceRoot = path.join(root, "private-source");
  const outputRoot = path.join(root, "jury-evidence");
  context.after(() => rm(root, { recursive: true, force: true }));

  const sourceRuns = runs.slice(0, 2).map((sourceRun) => ({
    ...sourceRun,
    artifacts: sourceRun.artifacts.map((artifact) => ({ ...artifact })),
  }));
  const badContent = Buffer.from("not really a PNG", "utf8");
  sourceRuns[0].artifacts[0] = {
    ...sourceRuns[0].artifacts[0],
    bytes: badContent.length,
    sha256: sha256(badContent),
  };
  for (const sourceRun of sourceRuns) {
    for (const artifact of sourceRun.artifacts) {
      const target = path.join(sourceRoot, ...artifact.path.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      const fixtureArtifact = artifactDescriptors(sourceRun.conditionId)
        .find(({ evidenceType }) => evidenceType === artifact.evidenceType);
      await writeFile(target, sourceRun === sourceRuns[0] && artifact === sourceRun.artifacts[0]
        ? badContent
        : fixtureArtifact.content);
    }
  }

  const result = createBlindPacket(sourceRuns, { key, seed: "public-seed", benchmarkVersion });
  await assert.rejects(
    () => stageBlindArtifacts(result.mapping, sourceRoot, outputRoot),
    /media signature does not match/,
  );
});

test("rejects digest-matching media that embeds identifying metadata", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-anonymize-metadata-"));
  const sourceRoot = path.join(root, "private-source");
  const outputRoot = path.join(root, "jury-evidence");
  context.after(() => rm(root, { recursive: true, force: true }));

  const sourceRuns = runs.slice(0, 2).map((sourceRun) => ({
    ...sourceRun,
    artifacts: sourceRun.artifacts.map((artifact) => ({ ...artifact })),
  }));
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const metadataContent = Buffer.concat([
    pngSignature,
    Buffer.from([0, 0, 0, 4]),
    Buffer.from("tEXt", "ascii"),
    Buffer.from("name", "ascii"),
    Buffer.alloc(4),
  ]);
  sourceRuns[0].artifacts[0] = {
    ...sourceRuns[0].artifacts[0],
    bytes: metadataContent.length,
    sha256: sha256(metadataContent),
  };
  for (const sourceRun of sourceRuns) {
    for (const artifact of sourceRun.artifacts) {
      const target = path.join(sourceRoot, ...artifact.path.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      const fixtureArtifact = artifactDescriptors(sourceRun.conditionId)
        .find(({ evidenceType }) => evidenceType === artifact.evidenceType);
      await writeFile(
        target,
        sourceRun === sourceRuns[0] && artifact === sourceRun.artifacts[0]
          ? metadataContent
          : fixtureArtifact.content,
      );
    }
  }

  const result = createBlindPacket(sourceRuns, { key, seed: "public-seed", benchmarkVersion });
  await assert.rejects(
    () => stageBlindArtifacts(result.mapping, sourceRoot, outputRoot),
    /metadata/,
  );
});
