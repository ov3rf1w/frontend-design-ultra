import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  parseQueryArguments,
  queryDesignIntelligence,
} from "../../frontend-design-ultra/scripts/query-design-intelligence.mjs";
import { validateMotionPatternLifecycle } from "../validate-repo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMPLETE_EVIDENCE = {
  buildId: "showcase-motion-build-001",
  implementationPath: "showcase/src/motion/editorial-curtain-reveal.ts",
  verifiedAt: "2026-07-16",
  commit: "a".repeat(40),
  evidenceDigest: "b".repeat(64),
  viewports: ["desktop-1440x900", "mobile-393x852"],
  checks: ["reduced-motion", "runtime", "visual-review"],
  reviewType: "maintainer-visual-review",
};

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function motionValidator() {
  const schema = await json("frontend-design-ultra/assets/motion-patterns.schema.json");
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    validateFormats: true,
  });
  addFormats(ajv);
  return ajv.compile(schema);
}

test("motion catalog v2 uses recipe without claiming builds", async () => {
  const [catalog, validate] = await Promise.all([
    json("frontend-design-ultra/assets/motion-patterns.json"),
    motionValidator(),
  ]);
  assert.equal(validate(catalog), true, JSON.stringify(validate.errors));
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.catalogVersion, "0.2.0");
  assert.equal(catalog.updatedAt, "2026-07-16");
  assert.equal(catalog.patterns.length, 19);
  assert.equal(catalog.patterns.filter(({ status }) => status === "recipe").length, 16);
  assert.equal(catalog.patterns.filter(({ status }) => status === "candidate").length, 3);
  assert.equal(catalog.patterns.some(({ status }) => status === "prototype"), false);
  assert.ok(catalog.patterns.every((pattern) => !Object.hasOwn(pattern, "verificationEvidence")));
});

test("motion schema forbids lower-lifecycle evidence and requires complete verified evidence", async () => {
  const [catalog, validate] = await Promise.all([
    json("frontend-design-ultra/assets/motion-patterns.json"),
    motionValidator(),
  ]);
  const recipe = structuredClone(catalog.patterns.find(({ status }) => status === "recipe"));

  for (const status of ["idea", "candidate", "recipe"]) {
    const lowerLifecycle = {
      ...structuredClone(recipe),
      status,
      verificationEvidence: structuredClone(COMPLETE_EVIDENCE),
    };
    assert.equal(validate({ ...catalog, patterns: [lowerLifecycle] }), false);
  }

  const verifiedWithoutEvidence = { ...structuredClone(recipe), status: "verified" };
  assert.equal(validate({ ...catalog, patterns: [verifiedWithoutEvidence] }), false);

  const verified = {
    ...structuredClone(recipe),
    status: "verified",
    verificationEvidence: structuredClone(COMPLETE_EVIDENCE),
  };
  assert.equal(validate({ ...catalog, patterns: [verified] }), true, JSON.stringify(validate.errors));

  const promoted = { ...structuredClone(verified), status: "promoted" };
  assert.equal(validate({ ...catalog, patterns: [promoted] }), true, JSON.stringify(validate.errors));

  const unsafePath = structuredClone(verified);
  unsafePath.verificationEvidence.implementationPath = "../private/build.ts";
  assert.equal(validate({ ...catalog, patterns: [unsafePath] }), false);

  const oneViewport = structuredClone(verified);
  oneViewport.verificationEvidence.viewports = ["desktop-1440x900"];
  assert.equal(validate({ ...catalog, patterns: [oneViewport] }), false);
});

test("repository lifecycle validator mirrors schema evidence boundaries", () => {
  const recipe = { status: "recipe" };
  assert.deepEqual(validateMotionPatternLifecycle(recipe), []);
  assert.deepEqual(
    validateMotionPatternLifecycle({ ...recipe, verificationEvidence: COMPLETE_EVIDENCE }).map(({ code }) => code),
    ["MOTION_UNVERIFIED_EVIDENCE_FORBIDDEN"],
  );
  assert.deepEqual(
    validateMotionPatternLifecycle({ status: "prototype" }).map(({ code }) => code),
    ["MOTION_STATUS"],
  );
  assert.deepEqual(
    validateMotionPatternLifecycle({ status: "verified" }).map(({ code }) => code),
    ["MOTION_VERIFICATION_EVIDENCE"],
  );
  assert.deepEqual(
    validateMotionPatternLifecycle({ status: "verified", verificationEvidence: COMPLETE_EVIDENCE }),
    [],
  );
  assert.deepEqual(
    validateMotionPatternLifecycle({
      status: "promoted",
      verificationEvidence: { ...COMPLETE_EVIDENCE, implementationPath: "C:\\private\\build.ts" },
    }).map(({ code }) => code),
    ["MOTION_VERIFICATION_EVIDENCE"],
  );
});

test("motion query accepts recipe and rejects retired prototype status", async () => {
  assert.equal(parseQueryArguments(["motion", "--status", "recipe"]).status, "recipe");
  assert.throws(
    () => parseQueryArguments(["motion", "--status", "prototype"]),
    /Unsupported status for motion: prototype/,
  );

  const recipes = await queryDesignIntelligence(
    parseQueryArguments(["motion", "--status", "recipe", "--limit", "100"]),
  );
  assert.equal(recipes.matched, 16);
  assert.ok(recipes.results.every(({ status }) => status === "recipe"));
});
