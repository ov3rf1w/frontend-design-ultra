import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createHoldoutCommitment, createProtocolFreezeDigest, verifyHoldoutCommitment } from "../commit-holdout.mjs";

const salt = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const protocolV1 = "1".repeat(64);
const protocolV2 = "2".repeat(64);

async function fixture(context) {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-holdout-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "brief-a", "assets"), { recursive: true });
  await writeFile(path.join(root, "brief-a", "brief.json"), "{\"id\":\"hidden-a\"}\n");
  await writeFile(path.join(root, "brief-a", "assets", "facts.txt"), "private fixture\n");
  return root;
}

test("creates a deterministic salted commitment without exposing filenames", async (context) => {
  const root = await fixture(context);
  const options = {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
    generatedAt: "2026-07-15T00:00:00.000Z",
  };
  const first = await createHoldoutCommitment(root, salt, options);
  const second = await createHoldoutCommitment(root, salt, options);
  assert.deepEqual(first, second);
  assert.equal(first.publicCommitment.schemaVersion, 3);
  assert.equal(first.publicCommitment.protocolFreezeSha256, protocolV1);
  assert.equal(first.publicCommitment.fileCount, 2);
  assert.match(first.publicCommitment.bundleDigest, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(first.publicCommitment).includes("brief-a"), false);
  assert.equal(first.privateManifest.files.some(({ path: file }) => file === "brief-a/brief.json"), true);
});

test("verifies an unchanged bundle and detects a changed file", async (context) => {
  const root = await fixture(context);
  const binding = { benchmarkVersion: "v1", protocolFreezeSha256: protocolV1 };
  const commitment = (await createHoldoutCommitment(root, salt, binding)).publicCommitment;
  const valid = await verifyHoldoutCommitment(root, salt, commitment, binding);
  assert.equal(valid.ok, true);

  await writeFile(path.join(root, "brief-a", "brief.json"), "{\"id\":\"changed\"}\n");
  const invalid = await verifyHoldoutCommitment(root, salt, commitment, binding);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.mismatches.includes("bundleDigest"));
});

test("rejects salts shorter than 32 bytes", async (context) => {
  const root = await fixture(context);
  await assert.rejects(
    () => createHoldoutCommitment(root, Buffer.from("short"), { benchmarkVersion: "v1", protocolFreezeSha256: protocolV1 }),
    /at least 32 bytes/,
  );
});

test("binds the digest and verification to benchmark version and protocol", async (context) => {
  const root = await fixture(context);
  const first = await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
    generatedAt: "2026-07-15T00:00:00.000Z",
  });
  const changedVersion = await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v2",
    protocolFreezeSha256: protocolV1,
    generatedAt: "2026-07-15T00:00:00.000Z",
  });
  const changedProtocol = await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV2,
    generatedAt: "2026-07-15T00:00:00.000Z",
  });
  assert.notEqual(first.publicCommitment.bundleDigest, changedVersion.publicCommitment.bundleDigest);
  assert.notEqual(first.publicCommitment.bundleDigest, changedProtocol.publicCommitment.bundleDigest);

  const wrongVersion = await verifyHoldoutCommitment(root, salt, first.publicCommitment, {
    benchmarkVersion: "v2",
    protocolFreezeSha256: protocolV1,
  });
  assert.equal(wrongVersion.ok, false);
  assert.ok(wrongVersion.mismatches.includes("benchmarkVersion"));

  const tampered = { ...first.publicCommitment, benchmarkVersion: "v2" };
  const tamperedResult = await verifyHoldoutCommitment(root, salt, tampered, {
    benchmarkVersion: "v2",
    protocolFreezeSha256: protocolV1,
  });
  assert.equal(tamperedResult.ok, false);
  assert.ok(tamperedResult.mismatches.includes("bundleDigest"));
});

test("binds the public generation timestamp to the commitment digest", async (context) => {
  const root = await fixture(context);
  const first = await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
    generatedAt: "2026-07-15T00:00:00.000Z",
  });
  const second = await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
    generatedAt: "2026-07-15T00:00:01.000Z",
  });
  assert.notEqual(first.publicCommitment.bundleDigest, second.publicCommitment.bundleDigest);

  const tampered = {
    ...first.publicCommitment,
    generatedAt: second.publicCommitment.generatedAt,
  };
  const result = await verifyHoldoutCommitment(root, salt, tampered, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
  });
  assert.equal(result.ok, false);
  assert.ok(result.mismatches.includes("bundleDigest"));
});

test("verification refuses to trust binding fields supplied only by the commitment", async (context) => {
  const root = await fixture(context);
  const commitment = (await createHoldoutCommitment(root, salt, {
    benchmarkVersion: "v1",
    protocolFreezeSha256: protocolV1,
  })).publicCommitment;
  await assert.rejects(
    () => verifyHoldoutCommitment(root, salt, commitment),
    /requires expected benchmarkVersion and protocolFreezeSha256/,
  );
});

test("protocol freeze digest ignores lifecycle fields but binds methodology changes", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fdu-protocol-freeze-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const protocolFile = path.join(root, "protocol.json");
  const matrixFile = path.join(root, "matrix.lock.json");
  const protocol = {
    benchmarkVersion: "v1",
    status: "pending",
    resultsStatus: "pending",
    objective: "immutable question",
    tracks: [{ id: "primary", status: "pending" }],
    holdout: { status: "pending", commitmentAlgorithm: "v3" },
  };
  const matrix = {
    benchmarkVersion: "v1",
    status: "pending-pins",
    executedRunSlots: 0,
    resultsStatus: "pending",
    expectedRunSlots: 12,
  };
  await writeFile(protocolFile, `${JSON.stringify(protocol, null, 2)}\n`);
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);
  await writeFile(path.join(root, "scoring.md"), "immutable scoring method\n");
  const first = await createProtocolFreezeDigest(root);

  protocol.status = "complete";
  protocol.resultsStatus = "complete";
  protocol.tracks[0].status = "complete";
  protocol.holdout.status = "revealed";
  matrix.status = "complete";
  matrix.executedRunSlots = 12;
  matrix.resultsStatus = "complete";
  await writeFile(protocolFile, `${JSON.stringify(protocol, null, 2)}\n`);
  await writeFile(matrixFile, `${JSON.stringify(matrix, null, 2)}\n`);
  const lifecycleOnly = await createProtocolFreezeDigest(root);
  assert.equal(lifecycleOnly.digest, first.digest);

  await writeFile(path.join(root, "scoring.md"), "changed scoring method\n");
  const changedMethod = await createProtocolFreezeDigest(root);
  assert.notEqual(changedMethod.digest, first.digest);
});
