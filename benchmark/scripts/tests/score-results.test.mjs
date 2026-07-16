import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createBlindPacket } from "../anonymize.mjs";
import { createScorecard } from "../score-results.mjs";

const benchmarkVersion = "v1-calibration-mvp";
const key = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
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

function run(conditionId) {
  return {
    benchmarkVersion,
    runId: `brief-a--${conditionId}--r1`,
    briefId: "brief-a",
    conditionId,
    replicate: 1,
    status: "success",
    artifacts: evidenceTypes.map((evidenceType) => {
      const motion = evidenceType.endsWith("-motion");
      const mobile = evidenceType.startsWith("mobile-");
      return {
        evidenceType,
        path: `${conditionId}/${evidenceType}.${motion ? "webm" : "png"}`,
        mediaType: motion ? "video/webm" : "image/png",
        bytes: 100,
        sha256: sha256(`${conditionId}:${evidenceType}`),
        capture: {
          profileId: mobile ? "mobile-jury" : "desktop-jury",
          width: mobile ? 393 : 1440,
          height: mobile ? 852 : 900,
          durationMs: motion ? 5000 : 0,
          frameCount: motion ? 150 : 1,
          actionTimelineSha256: motion ? sha256(`${evidenceType}:timeline`) : null,
          capturedAt: "2026-07-16T10:00:00Z",
          probe: { tool: "fixture", version: "1", decodable: true },
        },
      };
    }),
  };
}

test("deterministically recomputes primary preference, clustered CI, and shipping gate", () => {
  const runs = [
    run("baseline-no-design-skill"),
    run("frontend-design-ultra"),
  ];
  const packet = createBlindPacket(runs, {
    key,
    seed: "score-test",
    benchmarkVersion,
  }).packet;
  const assignmentId = packet.comparisons[0].assignmentId;
  const regenerated = createBlindPacket(runs, {
    key,
    seed: "score-test",
    benchmarkVersion,
  });
  const mapping = regenerated.mapping.comparisons[0];
  const primarySide = mapping.leftConditionId === "frontend-design-ultra" ? "left" : "right";
  const votes = Array.from({ length: 5 }, (_, index) => ({
    benchmarkVersion,
    packetSha256: packet.blindPacketSha256,
    assignmentId,
    jurorId: `J-ABCDEFG${index + 2}`,
    choice: primarySide,
  }));
  const options = {
    benchmarkVersion,
    packet,
    juryReveal: { keyHex: key.toString("hex") },
    runs,
    votes,
    inputDigests: {
      blindPacketSha256: packet.blindPacketSha256,
      voteFreezeSha256: "a".repeat(64),
      juryRevealSha256: "b".repeat(64),
      runManifestSetSha256: "c".repeat(64),
    },
  };
  const first = createScorecard(options);
  const second = createScorecard(options);
  assert.deepEqual(first, second);
  assert.equal(first.creative.primary.wins, 5);
  assert.equal(first.creative.primary.preferenceSharePpm, 1_000_000);
  assert.deepEqual(first.creative.primary.ci95, {
    lowerPpm: 1_000_000,
    upperPpm: 1_000_000,
  });
  assert.equal(first.shipping.nonInferiority.passes, true);
  assert.equal(first.claimEligibility.improvementVsBaseline, true);
});
