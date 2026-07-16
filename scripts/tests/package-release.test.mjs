import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { createReleasePackage, validateReleaseArtifacts } from "../package-release.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function createFixture(root) {
  const skill = path.join(root, "frontend-design-ultra");
  mkdirSync(path.join(skill, "references"), { recursive: true });
  writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ name: "frontend-design-ultra", version: "1.2.3" }, null, 2)}\n`);
  writeFileSync(path.join(root, ".gitignore"), "release*/\n");
  writeFileSync(path.join(skill, "README.md"), "# Fixture payload\n");
  writeFileSync(path.join(skill, "SKILL.md"), "---\nname: frontend-design-ultra\ndescription: Test fixture\n---\n\n# Fixture\n");
  writeFileSync(path.join(skill, "LICENSE"), "MIT fixture license\n");
  writeFileSync(path.join(skill, "THIRD_PARTY_NOTICES.md"), "# Third-party notices\n\nNone bundled.\n");
  writeFileSync(path.join(skill, "package.json"), `${JSON.stringify({
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
  writeFileSync(path.join(skill, "package-lock.json"), `${JSON.stringify({
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
  writeFileSync(path.join(skill, "references", "guide.md"), "# Guide\n\nDeterministic fixture.\n");
}

function initializeGitFixture(root) {
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", [
    "-c", "user.name=Release Fixture",
    "-c", "user.email=release-fixture@example.invalid",
    "commit", "-m", "fixture",
  ], { cwd: root, stdio: "ignore" });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function listTarPaths(archive) {
  const tar = gunzipSync(archive);
  const paths = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const readField = (start, length) => header.subarray(start, start + length).toString("utf8").replace(/\0.*$/s, "");
    const name = readField(0, 100);
    const prefix = readField(345, 155);
    const sizeText = readField(124, 12).trim();
    const size = Number.parseInt(sizeText || "0", 8);
    paths.push(prefix ? `${prefix}/${name}` : name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return paths;
}

test("creates a byte-for-byte deterministic licensed release archive", async (context) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-package-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  createFixture(fixture);

  const common = {
    root: fixture,
    version: "1.2.3",
    sourceDateEpoch: 1_700_000_000,
    sourceCommit: "unknown",
  };
  const first = await createReleasePackage({ ...common, outDir: path.join(fixture, "release-a") });
  const second = await createReleasePackage({ ...common, outDir: path.join(fixture, "release-b") });
  const firstArchive = readFileSync(first.archivePath);
  const secondArchive = readFileSync(second.archivePath);

  assert.deepEqual(firstArchive, secondArchive);
  assert.equal(first.manifest.archive.sha256, sha256(firstArchive));
  assert.deepEqual(first.manifest.source, {
    state: "unknown",
    commit: null,
    verification: "not-claimed",
    sourceDateEpoch: 1_700_000_000,
  });
  assert.equal(first.verification.extraction, "temporary-safe-extraction-passed");
  assert.equal(first.verification.verifiedFiles, 7);
  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(listTarPaths(firstArchive), [
    "frontend-design-ultra/LICENSE",
    "frontend-design-ultra/README.md",
    "frontend-design-ultra/SKILL.md",
    "frontend-design-ultra/THIRD_PARTY_NOTICES.md",
    "frontend-design-ultra/package-lock.json",
    "frontend-design-ultra/package.json",
    "frontend-design-ultra/references/guide.md",
  ]);

  const checksumLines = readFileSync(first.checksumsPath, "utf8").trim().split("\n");
  assert.equal(checksumLines.length, 2);
  assert.match(checksumLines[0], new RegExp(`^${first.manifest.archive.sha256}  frontend-design-ultra-v1\\.2\\.3\\.tar\\.gz$`));
  assert.match(checksumLines[1], /^[0-9a-f]{64}  release-manifest\.json$/);
});

test("packages only the real installable skill payload and includes its public notices", async (context) => {
  const output = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-real-release-"));
  context.after(() => rmSync(output, { recursive: true, force: true }));

  const result = await createReleasePackage({
    root: repositoryRoot,
    outDir: output,
    sourceDateEpoch: 0,
  });
  const paths = result.manifest.files.map((file) => file.path);
  assert.ok(paths.includes("frontend-design-ultra/LICENSE"));
  assert.ok(paths.includes("frontend-design-ultra/README.md"));
  assert.ok(paths.includes("frontend-design-ultra/SKILL.md"));
  assert.ok(paths.includes("frontend-design-ultra/THIRD_PARTY_NOTICES.md"));
  assert.ok(paths.includes("frontend-design-ultra/package.json"));
  assert.ok(paths.includes("frontend-design-ultra/package-lock.json"));
  assert.ok(paths.every((file) => file.startsWith("frontend-design-ultra/")));
  assert.ok(!paths.some((file) => file.includes("/node_modules/")));
  assert.equal(
    readFileSync(path.join(repositoryRoot, "frontend-design-ultra", "LICENSE"), "utf8").trimEnd(),
    readFileSync(path.join(repositoryRoot, "LICENSE"), "utf8").trimEnd(),
  );
});

test("rejects unsafe output paths, invalid versions, and abbreviated commits", async (context) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-package-invalid-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  createFixture(fixture);

  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "frontend-design-ultra", "release") }),
    /outside the installable skill payload/,
  );
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release"), version: "latest" }),
    /not valid SemVer/,
  );
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release"), sourceCommit: "abc123" }),
    /unknown.*uncommitted.*full 40- or 64-character/i,
  );
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release"), sourceCommit: "a".repeat(40) }),
    /cannot be verified/,
  );

  writeFileSync(path.join(fixture, "frontend-design-ultra", ".env.local"), "SECRET=do-not-package\n");
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /outside the public skill allowlist/,
  );
  rmSync(path.join(fixture, "frontend-design-ultra", ".env.local"));

  writeFileSync(path.join(fixture, "frontend-design-ultra", "credentials.json"), "{\"token\":\"do-not-package\"}\n");
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /outside the public skill allowlist/,
  );
  rmSync(path.join(fixture, "frontend-design-ultra", "credentials.json"));

  mkdirSync(path.join(fixture, "frontend-design-ultra", "secrets"));
  writeFileSync(path.join(fixture, "frontend-design-ultra", "secrets", "runtime.json"), "{\"token\":\"do-not-package\"}\n");
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /outside the public skill allowlist/,
  );
  rmSync(path.join(fixture, "frontend-design-ultra", "secrets"), { recursive: true });

  writeFileSync(path.join(fixture, "frontend-design-ultra", "UNREVIEWED.md"), "Not an allowlisted payload root file.\n");
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /outside the public skill allowlist/,
  );
});

test("rejects scanner runtime manifest drift and unpinned dependencies", async (context) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-package-runtime-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  createFixture(fixture);
  const packageFile = path.join(fixture, "frontend-design-ultra", "package.json");
  const packageMetadata = JSON.parse(readFileSync(packageFile, "utf8"));
  packageMetadata.dependencies["playwright-core"] = "^1.61.1";
  writeFileSync(packageFile, `${JSON.stringify(packageMetadata, null, 2)}\n`);

  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /must declare only the pinned optional scanner runtime/,
  );

  createFixture(fixture);
  const lockFile = path.join(fixture, "frontend-design-ultra", "package-lock.json");
  const lockMetadata = JSON.parse(readFileSync(lockFile, "utf8"));
  lockMetadata.packages["node_modules/unexpected"] = { version: "1.0.0" };
  writeFileSync(lockFile, `${JSON.stringify(lockMetadata, null, 2)}\n`);
  await assert.rejects(
    createReleasePackage({ root: fixture, outDir: path.join(fixture, "release") }),
    /must bind exactly playwright-core 1\.61\.1/,
  );
});

test("records a commit only when it matches a clean Git HEAD", async (context) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-package-git-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  createFixture(fixture);
  const head = initializeGitFixture(fixture);

  const committed = await createReleasePackage({
    root: fixture,
    outDir: path.join(fixture, "release-committed"),
    sourceDateEpoch: 123,
    sourceCommit: head,
  });
  assert.deepEqual(committed.manifest.source, {
    state: "committed",
    commit: head,
    verification: "git-head-clean",
    sourceDateEpoch: 123,
  });
  const verified = await validateReleaseArtifacts({
    root: fixture,
    outDir: path.join(fixture, "release-committed"),
    requireCommittedSource: true,
    verifySourceAgainstGit: true,
  });
  assert.equal(verified.manifest.source.commit, head);

  const otherCommit = `${head[0] === "a" ? "b" : "a"}${head.slice(1)}`;
  await assert.rejects(
    createReleasePackage({
      root: fixture,
      outDir: path.join(fixture, "release-mismatch"),
      sourceCommit: otherCommit,
    }),
    /does not match Git HEAD/,
  );

  writeFileSync(path.join(fixture, "frontend-design-ultra", "references", "guide.md"), "# Dirty fixture\n");
  await assert.rejects(
    createReleasePackage({
      root: fixture,
      outDir: path.join(fixture, "release-dirty-claimed"),
      sourceCommit: head,
    }),
    /requires a clean Git worktree/,
  );
  const uncommitted = await createReleasePackage({
    root: fixture,
    outDir: path.join(fixture, "release-dirty"),
    sourceCommit: "uncommitted",
  });
  assert.deepEqual(uncommitted.manifest.source, {
    state: "uncommitted",
    commit: null,
    verification: "not-claimed",
    sourceDateEpoch: 0,
  });
});

test("rejects release artifacts that no longer match their manifest and checksums", async (context) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-package-tamper-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  createFixture(fixture);
  const outDir = path.join(fixture, "release");
  const result = await createReleasePackage({ root: fixture, outDir, sourceCommit: "unknown" });
  const archive = readFileSync(result.archivePath);
  archive[Math.floor(archive.length / 2)] ^= 0xff;
  writeFileSync(result.archivePath, archive);

  await assert.rejects(
    validateReleaseArtifacts({ root: fixture, outDir }),
    /does not match release-manifest/,
  );
});

test("release workflow verifies extraction and marks SemVer RCs as GitHub prereleases", () => {
  const workflow = readFileSync(path.join(repositoryRoot, ".github", "workflows", "release.yml"), "utf8");
  assert.match(workflow, /git rev-parse HEAD/);
  assert.doesNotMatch(workflow, /--source-commit "\$GITHUB_SHA"/);
  assert.match(workflow, /--verify-only --require-committed-source/);
  assert.match(workflow, /sha256sum --check SHA256SUMS/);
  assert.match(workflow, /tar --extract --gzip/);
  assert.match(workflow, /release_flags\+=\(--prerelease\)/);
});

test("repository ignores dotenv files globally, not only inside benchmark", () => {
  const ignore = readFileSync(path.join(repositoryRoot, ".gitignore"), "utf8");
  assert.match(ignore, /^\.env\*$/m);
});
