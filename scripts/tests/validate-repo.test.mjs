import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateRepository } from "../validate-repo.mjs";

async function writeShowcaseFixture(root) {
  const showcase = path.join(root, "docs", "assets", "showcase");
  await mkdir(showcase, { recursive: true });
  const specifications = [
    ["ecommerce.webp", "/ecommerce/", 960, 600],
    ["finance.webp", "/finance/", 960, 600],
    ["healthcare.webp", "/healthcare/", 960, 600],
    ["hospitality.webp", "/hospitality/", 960, 600],
    ["legal.webp", "/legal/", 960, 600],
    ["saas.webp", "/saas/", 960, 600],
    ["hospitality-entrance-storyboard.webp", "/hospitality/", 1440, 900],
  ];
  const files = [];
  for (const [file, route, width, height] of specifications) {
    const contents = Buffer.from(`fixture-webp:${file}`);
    await writeFile(path.join(showcase, file), contents);
    files.push({
      path: file,
      route,
      width,
      height,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  }
  await writeFile(path.join(showcase, "manifest.json"), `${JSON.stringify({
    schemaVersion: 1,
    status: "curated-showcase-not-benchmark",
    capturedAt: "2026-07-16",
    environment: {
      node: "v24.18.0",
      playwrightCore: "1.61.1",
      chromium: "149.0.7827.55",
      locale: "en-GB",
    },
    capture: {
      desktopViewport: { width: 1440, height: 900 },
      mobileViewport: { width: 393, height: 852 },
      entranceFramesMs: [0, 300, 900, 1800],
      entranceFrameActualMs: [
        { targetMs: 0, actualMs: 18 },
        { targetMs: 300, actualMs: 310 },
        { targetMs: 900, actualMs: 907 },
        { targetMs: 1800, actualMs: 1812 },
      ],
      scrollProgress: [0.25, 0.5, 0.75, 1],
      reducedMotion: true,
      rawArtifactsPublished: false,
      auditedExportSha256: "a".repeat(64),
      privateAuditReportSha256: "b".repeat(64),
    },
    qaSummary: {
      routes: 6,
      desktopHorizontalOverflow: 0,
      mobileHorizontalOverflow: 0,
      consoleOrPageErrors: 0,
      reducedMotionRunningAnimationsAfterSettle: 0,
      interactiveTargetsBelow24Px: 0,
      interactionFlowsPassed: 6,
    },
    rights: {
      thirdPartyVisualAssets: false,
      claimBoundary: "Curated visual evidence only; no benchmark, customer-outcome, award, or conformance claim.",
    },
    files,
  }, null, 2)}\n`);
  const canonicalShowcase = path.join(root, "showcase");
  await mkdir(canonicalShowcase, { recursive: true });
  await writeFile(path.join(canonicalShowcase, "EVIDENCE.md"), "# Showcase Evidence\n\nCurated visual release evidence.\n");
  await writeFile(path.join(canonicalShowcase, "PROVENANCE.md"), "# Showcase Provenance\n\nRepository-authored visuals only.\n");
  await writeFile(path.join(showcase, "..", "media-provenance.schema.json"), "{}\n");
  await writeFile(path.join(showcase, "..", "media-provenance.json"), `${JSON.stringify({
    $schema: "./media-provenance.schema.json",
    schemaVersion: 1,
    policy: "all-public-media-enumerated",
    updatedAt: "2026-07-16",
    scope: "All public media.",
    legalBoundary: "Maintainer provenance declaration, not legal advice.",
    assets: files.map((file) => ({
      path: `docs/assets/showcase/${file.path}`,
      sha256: file.sha256,
      mediaType: "image/webp",
      origin: "render-of-repository-authored",
      author: "Example maintainers",
      source: `Repository-authored fixture route ${file.route}.`,
      license: "MIT",
      redistribution: "allowed",
      modification: "allowed",
      thirdPartyMaterial: false,
      reviewedAt: "2026-07-16",
      claimBoundary: "Curated fixture only; no benchmark or legal-clearance claim.",
    })),
  }, null, 2)}\n`);
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "frontend-design-ultra-validator-"));
  await mkdir(path.join(root, "frontend-design-ultra", "agents"), { recursive: true });
  await mkdir(path.join(root, "frontend-design-ultra", "references"), { recursive: true });
  await mkdir(path.join(root, "evals", "prompts"), { recursive: true });
  await mkdir(path.join(root, "evals", "expected"), { recursive: true });
  await writeFile(path.join(root, "frontend-design-ultra", "SKILL.md"), [
    "---",
    "name: frontend-design-ultra",
    "description: A compact frontend design skill used for substantial interface design and verification work.",
    "---",
    "",
    "# Frontend Design Ultra",
    "",
    "Read `references/foundation.md` when a foundation is needed.",
    "",
  ].join("\n"));
  await writeFile(path.join(root, "frontend-design-ultra", "references", "foundation.md"), "# Foundation\n\nA compact reference.\n");
  await writeFile(path.join(root, "frontend-design-ultra", "agents", "openai.yaml"), [
    "interface:",
    "  display_name: Frontend Design Ultra",
    "  short_description: Premium frontend design",
    "  default_prompt: Use $frontend-design-ultra to design and verify this interface.",
    "",
  ].join("\n"));
  await writeFile(path.join(root, "evals", "prompts", "baseline.md"), "# Prompt\n");
  await writeFile(path.join(root, "evals", "expected", "baseline.md"), "# Expected\n");
  await writeFile(path.join(root, "README.md"), "[Skill](frontend-design-ultra/SKILL.md)\n");
  await writeFile(path.join(root, "LICENSE"), "MIT License\n\nCopyright (c) 2026 Example\n");
  await writeFile(path.join(root, "frontend-design-ultra", "LICENSE"), "MIT License\r\n\r\nCopyright (c) 2026 Example\r\n");
  await writeFile(path.join(root, "frontend-design-ultra", "package.json"), `${JSON.stringify({
    name: "frontend-design-ultra-scanner-runtime",
    version: "1.2.3",
    description: "Optional scanner fixture.",
    private: true,
    license: "MIT",
    type: "module",
    scripts: { "browser:install": "playwright-core install chromium" },
    engines: { node: ">=24" },
    dependencies: { "playwright-core": "1.61.1" },
  }, null, 2)}\n`);
  await writeFile(path.join(root, "frontend-design-ultra", "package-lock.json"), `${JSON.stringify({
    name: "frontend-design-ultra-scanner-runtime",
    version: "1.2.3",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "frontend-design-ultra-scanner-runtime",
        version: "1.2.3",
        license: "MIT",
        dependencies: { "playwright-core": "1.61.1" },
        engines: { node: ">=24" },
      },
      "node_modules/playwright-core": {
        version: "1.61.1",
        resolved: "https://registry.npmjs.org/playwright-core/-/playwright-core-1.61.1.tgz",
        integrity: "sha512-h7Qlt6m4REp25qvIdvbDtVmD4LqVXfpRxhORv9L0jzETM05p4fuPJ3dKyuSXQxDSbXnmS79HAgi9589lGSpLkg==",
        license: "Apache-2.0",
        bin: { "playwright-core": "cli.js" },
        engines: { node: ">=18" },
      },
    },
  }, null, 2)}\n`);
  await writeShowcaseFixture(root);
  return root;
}

test("accepts a compact, fully routed skill release", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await validateRepository(root);
  assert.deepEqual(result.diagnostics, []);
});

test("reports long references, eval drift, broken links, and private release data", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, "frontend-design-ultra", "references", "foundation.md"),
    ["# Foundation", ...Array.from({ length: 101 }, (_, index) => `Line ${index + 1}`)].join("\n"),
  );
  await writeFile(path.join(root, "evals", "prompts", "unpaired.md"), "# Prompt\n");
  await writeFile(path.join(root, "README.md"), `[Missing](docs/missing.md)\nInternal project: ${"new" + "project"}\n`);

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.equal(result.ok, false);
  assert.ok(codes.has("REFERENCE_CONTENTS_MISSING"));
  assert.ok(codes.has("EVAL_EXPECTED_MISSING"));
  assert.ok(codes.has("MARKDOWN_LINK_MISSING"));
  assert.ok(codes.has("PRIVATE_TERM"));
});

test("reports canonical parameters missing from the public parameter reference", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "docs"), { recursive: true });
  const skillFile = path.join(root, "frontend-design-ultra", "SKILL.md");
  const source = await readFile(skillFile, "utf8");
  await writeFile(skillFile, `${source}\n## Parameter Grammar\n\nGroups:\n\n- Mode: \`/design\`, \`/verify\`\n\nMode precedence: \`/verify\` > \`/design\`.\n`);
  await writeFile(path.join(root, "docs", "PARAMETERS.md"), "# Parameters\n\n- `/design`\n");

  const result = await validateRepository(root);
  assert.ok(result.diagnostics.some(({ code, message }) => code === "PARAMETER_UNDOCUMENTED" && message.includes("/verify")));
});

test("rejects frontmatter fields outside the canonical Codex schema", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const skillFile = path.join(root, "frontend-design-ultra", "SKILL.md");
  const source = await readFile(skillFile, "utf8");
  await writeFile(skillFile, source.replace("description:", "compatibility: Node.js 24+\ndescription:"));

  const result = await validateRepository(root);
  assert.ok(result.diagnostics.some(({ code, message }) => code === "FRONTMATTER_FIELD" && message.includes("compatibility")));
});

test("rejects malformed machine-readable skill assets", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const assets = path.join(root, "frontend-design-ultra", "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(assets, "broken.json"), "{ not-json }\n");

  const result = await validateRepository(root);
  assert.ok(result.diagnostics.some(({ code, file }) => code === "JSON_ASSET_INVALID" && file.endsWith("broken.json")));
});

test("requires the installable skill LICENSE to match the root LICENSE", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "frontend-design-ultra", "LICENSE"), "A different license.\n");

  const mismatch = await validateRepository(root);
  assert.ok(mismatch.diagnostics.some(({ code }) => code === "LICENSE_MISMATCH"));

  await rm(path.join(root, "frontend-design-ultra", "LICENSE"));
  const missing = await validateRepository(root);
  assert.ok(missing.diagnostics.some(({ code }) => code === "SKILL_LICENSE_MISSING"));
});

test("requires external GitHub Actions and containers to use immutable SHA pins", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const workflows = path.join(root, ".github", "workflows");
  await mkdir(workflows, { recursive: true });
  await writeFile(path.join(workflows, "release.yml"), [
    "jobs:",
    "  validate:",
    "    steps:",
    "      - uses: actions/checkout@v6",
    `      - uses: actions/setup-node@${"a".repeat(40)}`,
    "      - uses: ./local-action",
    `      - uses: docker://alpine@sha256:${"b".repeat(64)}`,
    "",
  ].join("\n"));

  const result = await validateRepository(root);
  const actionDiagnostics = result.diagnostics.filter(({ code }) => code === "ACTION_REF_NOT_PINNED");
  assert.equal(actionDiagnostics.length, 1);
  assert.match(actionDiagnostics[0].message, /actions\/checkout@v6/);
});

test("rejects tracked raw browser and private benchmark artifacts without banning curated evidence", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await validateRepository(root, {
    trackedFiles: [
      "output/playwright/reference-scans/example/trace.zip",
      "benchmark/protocol/v1/private/jury-map.json",
      ".env.production",
      "config/credentials.json",
      "config/secrets/runtime.json",
      "ops/client-secret.pem",
      "docs/assets/public-motion-proof.webm",
    ],
  });

  const artifactDiagnostics = result.diagnostics.filter(({ code }) => code === "TRACKED_PRIVATE_ARTIFACT");
  assert.equal(artifactDiagnostics.length, 6);
  assert.ok(artifactDiagnostics.some(({ file }) => file.includes("trace.zip")));
  assert.ok(artifactDiagnostics.some(({ file }) => file.includes("jury-map.json")));
  assert.ok(artifactDiagnostics.some(({ file }) => file === ".env.production"));
  assert.ok(artifactDiagnostics.some(({ file }) => file.includes("credentials.json")));
  assert.ok(artifactDiagnostics.some(({ file }) => file.includes("secrets/runtime.json")));
  assert.ok(artifactDiagnostics.some(({ file }) => file.includes("client-secret.pem")));
  assert.ok(!artifactDiagnostics.some(({ file }) => file.includes("public-motion-proof.webm")));
});

test("rejects untracked secret files and credential-like values on the public release surface", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const docs = path.join(root, "docs");
  await writeFile(path.join(docs, ".env.local"), "PUBLIC_FIXTURE=not-public\n");
  await writeFile(path.join(docs, "credentials.json"), "{\"purpose\":\"fixture\"}\n");
  const credential = `AK${"IA"}${"A".repeat(16)}`;
  await writeFile(path.join(docs, "configuration.md"), `# Configuration\n\nAccidentally published token: ${credential}\n`);

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("PRIVATE_RELEASE_FILE"));
  assert.ok(codes.has("PRIVATE_CREDENTIAL_PATTERN"));
  assert.ok(result.diagnostics.some(({ file, code }) => code === "PRIVATE_RELEASE_FILE" && file.endsWith(".env.local")));
  assert.ok(result.diagnostics.some(({ file, code }) => code === "PRIVATE_RELEASE_FILE" && file.endsWith("credentials.json")));
});

test("requires exact installable scanner runtime manifests", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const packageFile = path.join(root, "frontend-design-ultra", "package.json");
  const packageMetadata = JSON.parse(await readFile(packageFile, "utf8"));
  packageMetadata.dependencies["playwright-core"] = "^1.61.1";
  await writeFile(packageFile, `${JSON.stringify(packageMetadata, null, 2)}\n`);

  const packageResult = await validateRepository(root);
  assert.ok(packageResult.diagnostics.some(({ code }) => code === "SCANNER_RUNTIME_PACKAGE_INVALID"));

  await rm(packageFile);
  const missingResult = await validateRepository(root);
  assert.ok(missingResult.diagnostics.some(({ code }) => code === "SCANNER_RUNTIME_PACKAGE_MISSING"));
});

test("fails closed when Git metadata exists but tracked-file inspection cannot run", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".git"));

  const result = await validateRepository(root);
  assert.ok(result.diagnostics.some(({ code }) => code === "GIT_TRACKED_FILES_UNAVAILABLE"));
});

test("requires an exact, rights-bounded manifest for every public media file", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const manifestFile = path.join(root, "docs", "assets", "media-provenance.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.assets[0].thirdPartyMaterial = true;
  manifest.assets[1].sha256 = "0".repeat(64);
  manifest.assets.pop();
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(root, "docs", "assets", "extra.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n");

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("MEDIA_DECLARATION_INVALID"));
  assert.ok(codes.has("MEDIA_HASH_MISMATCH"));
  assert.ok(codes.has("MEDIA_UNDECLARED"));
});

test("detects a rebuilt showcase export that has not been rebound to public evidence", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const exportRoot = path.join(root, "showcase", "out");
  await mkdir(exportRoot, { recursive: true });
  await writeFile(path.join(exportRoot, "index.html"), "<!doctype html><title>Changed export</title>\n");

  const result = await validateRepository(root);
  assert.ok(result.diagnostics.some(({ code }) => code === "SHOWCASE_EXPORT_STALE"));
});

test("enforces curated showcase evidence, provenance, hashes, routes, rights, and claim boundaries", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const showcaseAssets = path.join(root, "docs", "assets", "showcase");
  const manifestFile = path.join(showcaseAssets, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.schemaVersion = 2;
  manifest.status = "benchmark-winner";
  manifest.capture.rawArtifactsPublished = true;
  manifest.capture.desktopViewport.width = 1;
  manifest.capture.entranceFrameActualMs[1].actualMs = 999;
  manifest.capture.auditedExportSha256 = "invalid";
  manifest.environment.node = "v22.0.0";
  manifest.qaSummary = { routes: 99, benchmarkWinner: true, wcagConformance: "AA" };
  manifest.rights.thirdPartyVisualAssets = true;
  manifest.rights.claimBoundary = "";
  manifest.files = manifest.files.slice(0, 6);
  manifest.files[0] = { ...manifest.files[0], path: "../escape.webp", route: "/finance/" };
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(showcaseAssets, "finance.webp"), "changed-showcase-evidence");
  await rm(path.join(root, "showcase", "EVIDENCE.md"));
  await rm(path.join(root, "showcase", "PROVENANCE.md"));

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("SHOWCASE_EVIDENCE_MISSING"));
  assert.ok(codes.has("SHOWCASE_PROVENANCE_MISSING"));
  assert.ok(codes.has("SHOWCASE_SCHEMA_VERSION"));
  assert.ok(codes.has("SHOWCASE_STATUS"));
  assert.ok(codes.has("SHOWCASE_RAW_ARTIFACTS"));
  assert.ok(codes.has("SHOWCASE_CAPTURE_PROFILE"));
  assert.ok(codes.has("SHOWCASE_CAPTURE_TIMING"));
  assert.ok(codes.has("SHOWCASE_AUDIT_BINDING"));
  assert.ok(codes.has("SHOWCASE_ENVIRONMENT"));
  assert.ok(codes.has("SHOWCASE_THIRD_PARTY_VISUALS"));
  assert.ok(codes.has("SHOWCASE_CLAIM_BOUNDARY"));
  assert.ok(codes.has("SHOWCASE_QA_SUMMARY"));
  assert.ok(codes.has("SHOWCASE_QA_CLAIM"));
  assert.ok(codes.has("SHOWCASE_FILE_COUNT"));
  assert.ok(codes.has("SHOWCASE_PATH_UNSAFE"));
  assert.ok(codes.has("SHOWCASE_HASH_MISMATCH"));
  assert.ok(codes.has("SHOWCASE_STORYBOARD"));
  assert.ok(codes.has("SHOWCASE_ROUTE_COUNT"));
  assert.ok(codes.has("SHOWCASE_FILE_SET"));

  await rm(manifestFile);
  const missingManifest = await validateRepository(root);
  assert.ok(missingManifest.diagnostics.some(({ code }) => code === "SHOWCASE_MANIFEST_MISSING"));
});

test("requires observation data and schema whenever design intelligence is shipped", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const assets = path.join(root, "frontend-design-ultra", "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(assets, "reference-corpus.json"), "{}\n");

  const result = await validateRepository(root);
  const missing = result.diagnostics
    .filter(({ code }) => code === "DESIGN_INTELLIGENCE_FILE_MISSING")
    .map(({ file }) => file);
  assert.ok(missing.some((file) => file.endsWith("assets/reference-observations.json")));
  assert.ok(missing.some((file) => file.endsWith("assets/reference-observations.schema.json")));
});

test("enforces cross-dataset corpus, observation, and motion invariants", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const skillRoot = path.join(root, "frontend-design-ultra");
  const assets = path.join(skillRoot, "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(skillRoot, "references", "reference-intelligence.md"), "# Reference Intelligence\n");
  await writeFile(path.join(skillRoot, "references", "motion-pattern-catalog.md"), "# Motion Pattern Catalog\n");
  const skillFile = path.join(skillRoot, "SKILL.md");
  const skill = await readFile(skillFile, "utf8");
  await writeFile(skillFile, `${skill}\nRead \`references/reference-intelligence.md\` and \`references/motion-pattern-catalog.md\`.\n`);

  await writeFile(path.join(assets, "reference-corpus.schema.json"), JSON.stringify({
    properties: {
      schemaVersion: { const: "1.0.0" },
      datasetStatus: { const: "mixed-lifecycle" },
    },
  }));
  const reference = {
    id: "ref-001",
    title: "Example",
    sourceUrl: "https://example.com",
    status: "candidate",
    industry: "editorial",
    designLane: "editorial-engine",
    heroMechanicHypothesis: "Layered headline",
    motionSignatureHypothesis: "Curtain reveal",
    assetDependency: "low",
    scanRisk: { level: "low", reasons: ["none"] },
    provenance: { sourceType: "official-live-site", observedAt: "2026-07-15", reachability: "http-200" },
    scanPriority: "must-scan",
  };
  const scannedReference = {
    ...reference,
    id: "ref-002",
    sourceUrl: "https://example.org",
    status: "scanned",
    scanEvidence: {
      scannedAt: "2026-07-15T12:00:00Z",
      viewports: ["desktop", "mobile"],
      evidencePaths: ["private-evidence-digest"],
      verifiedMechanics: ["curtain reveal"],
    },
  };
  await writeFile(path.join(assets, "reference-corpus.json"), JSON.stringify({
    $schema: "./reference-corpus.schema.json",
    schemaVersion: "1.0.0",
    datasetStatus: "mixed-lifecycle",
    entryCount: 2,
    statusCounts: { candidate: 1, scanned: 1, promoted: 0, retired: 0 },
    observationCatalog: "./wrong-observations.json",
    observationCount: 2,
    rightsPolicy: {
      publicData: ["derived taxonomy"],
      excludedData: ["third-party captures"],
      captureRule: "Keep raw captures private.",
      implementationRule: "Reconstruct with original code.",
    },
    entries: [reference, scannedReference, { ...scannedReference }],
  }));
  await writeFile(path.join(assets, "reference-observations.schema.json"), JSON.stringify({
    properties: {
      schemaVersion: { const: 1 },
      rightsPolicy: { const: "source-links-and-derived-mechanics-only" },
    },
  }));
  const observation = {
    referenceId: "ref-001",
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-15T12:00:00Z",
    status: "machine-captured-needs-human-review",
    evidenceDigest: "a".repeat(64),
    captureProfile: { evidenceTier: "exploratory" },
    mechanics: {},
    runtime: { consoleMessages: 0, runtimeErrors: 0, requestFailures: 0 },
    humanReview: { status: "pending", requiredBeforePromotion: ["Inspect all frames."] },
    rights: {
      rawArtifactsPublished: false,
      publicSurface: "derived-mechanics-only",
      copiedCode: false,
      copiedAssets: false,
    },
  };
  await writeFile(path.join(assets, "reference-observations.json"), JSON.stringify({
    $schema: "./reference-observations.schema.json",
    schemaVersion: 1,
    sourceCorpusVersion: "1.0.0",
    observationCount: 2,
    rightsPolicy: "source-links-and-derived-mechanics-only",
    observations: [
      observation,
      {
        ...observation,
        sourceUrl: "http://example.com",
        evidenceDigest: "not-a-digest",
        captureProfile: { evidenceTier: "unclassified" },
        humanReview: { status: "approved", requiredBeforePromotion: [] },
        rights: { ...observation.rights, rawArtifactsPublished: true },
      },
      {
        ...observation,
        referenceId: "ref-999",
        sourceUrl: "https://unknown.example",
        evidenceDigest: "a".repeat(64),
        captureProfile: { evidenceTier: "benchmark" },
      },
    ],
  }));
  await writeFile(path.join(assets, "motion-patterns.schema.json"), JSON.stringify({
    properties: { schemaVersion: { const: 1 } },
  }));
  const pattern = {
    id: "curtain-reveal",
    title: "Curtain Reveal",
    status: "verified",
    effectJob: "hierarchy",
    narrativeRole: "Open the editorial composition.",
    suitableFor: ["editorial"],
    avoidFor: ["dashboard"],
    trigger: "load",
    assetCost: "low",
    performanceBudget: { fallbackRequired: false },
    timeline: [{ at: 1.1, layer: "curtain", action: "Reveal", durationMs: -1, easing: "linear" }],
    desktopPlan: "Reveal the full composition.",
    mobileAlternative: "Use a short opacity reveal.",
    reducedMotion: "Show the final frame.",
    noJsPlan: "Show the final frame.",
    implementation: { preferred: ["CSS"], fallback: "None", ownershipRule: "One owner" },
    failureModes: ["blank frame"],
    verificationContract: ["capture states"],
    sourceReferences: [
      { referenceId: "ref-001", relationship: "machine evidence", status: "machine-captured", evidenceDigest: "c".repeat(64) },
      { referenceId: "ref-999", relationship: "hypothesis", status: "hypothesis" },
    ],
    rights: { recipeOwnership: "licensed-reconstruction", implementationLicense: "proprietary", thirdPartyAssetsAllowed: true },
  };
  await writeFile(path.join(assets, "motion-patterns.json"), JSON.stringify({
    $schema: "./motion-patterns.schema.json",
    schemaVersion: 1,
    catalogVersion: "0.1.0",
    patterns: [pattern, { ...pattern }],
  }));

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("REFERENCE_CORPUS_COUNT"));
  assert.ok(codes.has("REFERENCE_CORPUS_STATUS_COUNTS"));
  assert.ok(codes.has("REFERENCE_CORPUS_OBSERVATION_CATALOG"));
  assert.ok(codes.has("REFERENCE_CORPUS_DUPLICATE"));
  assert.ok(!codes.has("REFERENCE_CORPUS_STATUS"), "scanned entries are valid in a mixed-lifecycle corpus");
  assert.ok(codes.has("REFERENCE_OBSERVATION_COUNT"));
  assert.ok(codes.has("REFERENCE_CORPUS_OBSERVATION_COUNT"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_DUPLICATE"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_URL"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_DIGEST"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_CORPUS_UNKNOWN"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_EVIDENCE_TIER"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_HUMAN_REVIEW"));
  assert.ok(codes.has("REFERENCE_OBSERVATION_RIGHTS"));
  assert.ok(codes.has("MOTION_PATTERN_DUPLICATE"));
  assert.ok(codes.has("MOTION_TIMELINE"));
  assert.ok(codes.has("MOTION_FALLBACK"));
  assert.ok(codes.has("MOTION_RIGHTS"));
  assert.ok(codes.has("MOTION_LICENSE_PROVENANCE"));
  assert.ok(codes.has("MOTION_VERIFICATION_EVIDENCE"));
  assert.ok(codes.has("MOTION_OBSERVATION_EVIDENCE_MISMATCH"));
  assert.ok(codes.has("MOTION_REFERENCE_UNKNOWN"));
});

test("runs the public benchmark validator and checks its published status", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const benchmark = path.join(root, "benchmark");
  await mkdir(path.join(benchmark, "scripts"), { recursive: true });
  await mkdir(path.join(benchmark, "protocol", "v1"), { recursive: true });
  await mkdir(path.join(benchmark, "results", "v1"), { recursive: true });
  await writeFile(path.join(benchmark, "scripts", "validate.mjs"), [
    "export async function validateBenchmark() {",
    "  return { ok: false, protocolStatus: 'pending', resultStatus: 'complete', diagnostics: [{ code: 'BROKEN_FIXTURE' }] };",
    "}",
    "",
  ].join("\n"));
  await writeFile(path.join(benchmark, "protocol", "v1", "protocol.json"), '{"status":"pending","resultsStatus":"pending"}\n');
  await writeFile(path.join(benchmark, "results", "v1", "status.json"), '{"status":"pending"}\n');

  const result = await validateRepository(root);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.ok(codes.has("BENCHMARK_VALIDATION_FAILED"));
  assert.ok(codes.has("BENCHMARK_STATUS_MISMATCH"));
});
