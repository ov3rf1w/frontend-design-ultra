#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const PACKAGE_NAME = "frontend-design-ultra";
const SCANNER_RUNTIME_PACKAGE_NAME = "frontend-design-ultra-scanner-runtime";
const PLAYWRIGHT_CORE_VERSION = "1.61.1";
const PLAYWRIGHT_CORE_INTEGRITY = "sha512-h7Qlt6m4REp25qvIdvbDtVmD4LqVXfpRxhORv9L0jzETM05p4fuPJ3dKyuSXQxDSbXnmS79HAgi9589lGSpLkg==";
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SOURCE_COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const SOURCE_STATES = new Set(["committed", "uncommitted", "unknown"]);
const TAR_BLOCK_SIZE = 512;
const ALLOWED_ROOT_FILES = new Set(["LICENSE", "NOTICE", "NOTICE.md", "README.md", "SKILL.md", "THIRD_PARTY_NOTICES.md", "package.json", "package-lock.json"]);
const ALLOWED_ROOT_DIRECTORIES = new Set(["agents", "assets", "references", "scripts"]);
const FORBIDDEN_PATH_SEGMENTS = new Set([".git", "node_modules", "playwright-report", "test-results"]);
const FORBIDDEN_FILE_PATTERNS = [
  /(?:^|\/)\.env(?:\.|$)/i,
  /(?:^|\/)(?:credentials?|secrets?)(?:\/|[._-][^/]*$|$)/i,
  /(?:^|\/)(?:client[-_.]?secret|service[-_.]?account)(?:[._-][^/]*)?$/i,
  /(?:^|\/)(?:id_rsa|id_ed25519|[^/]+\.(?:key|pem|p12|pfx|keystore))$/i,
  /\.(?:har|trace)$/i,
];
const REQUIRED_PAYLOAD_FILES = [
  "README.md",
  "SKILL.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "package-lock.json",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameStringMap(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualEntries = Object.entries(value).sort(([left], [right]) => compareText(left, right));
  const expectedEntries = Object.entries(expected).sort(([left], [right]) => compareText(left, right));
  return actualEntries.length === expectedEntries.length
    && actualEntries.every(([key, item], index) => key === expectedEntries[index][0] && item === expectedEntries[index][1]);
}

async function validateScannerRuntimeManifests(payloadRoot, expectedVersion) {
  const packagePath = path.join(payloadRoot, "package.json");
  const lockPath = path.join(payloadRoot, "package-lock.json");
  let packageMetadata;
  let lockMetadata;
  try {
    [packageMetadata, lockMetadata] = await Promise.all([
      readFile(packagePath, "utf8").then(JSON.parse),
      readFile(lockPath, "utf8").then(JSON.parse),
    ]);
  } catch (error) {
    throw new Error(`Installable scanner runtime manifests are missing or invalid JSON: ${error.message}`);
  }

  if (packageMetadata.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || packageMetadata.version !== expectedVersion
    || packageMetadata.private !== true
    || packageMetadata.license !== "MIT"
    || packageMetadata.type !== "module"
    || packageMetadata.engines?.node !== ">=24"
    || !sameStringMap(packageMetadata.dependencies, { "playwright-core": PLAYWRIGHT_CORE_VERSION })
    || !sameStringMap(packageMetadata.scripts, { "browser:install": "playwright-core install chromium" })
    || ["devDependencies", "optionalDependencies", "peerDependencies", "overrides"].some((field) => Object.hasOwn(packageMetadata, field))) {
    throw new Error("Installable package.json must declare only the pinned optional scanner runtime and its explicit browser installer.");
  }

  const lockPackageNames = lockMetadata?.packages && typeof lockMetadata.packages === "object"
    ? Object.keys(lockMetadata.packages).sort(compareText)
    : [];
  const lockRoot = lockMetadata?.packages?.[""];
  const lockedPlaywright = lockMetadata?.packages?.["node_modules/playwright-core"];
  if (lockMetadata.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || lockMetadata.version !== expectedVersion
    || lockMetadata.lockfileVersion !== 3
    || lockMetadata.requires !== true
    || lockPackageNames.length !== 2
    || lockPackageNames[0] !== ""
    || lockPackageNames[1] !== "node_modules/playwright-core"
    || lockRoot?.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || lockRoot?.version !== expectedVersion
    || lockRoot?.license !== "MIT"
    || lockRoot?.engines?.node !== ">=24"
    || !sameStringMap(lockRoot?.dependencies, { "playwright-core": PLAYWRIGHT_CORE_VERSION })
    || lockedPlaywright?.version !== PLAYWRIGHT_CORE_VERSION
    || lockedPlaywright?.resolved !== `https://registry.npmjs.org/playwright-core/-/playwright-core-${PLAYWRIGHT_CORE_VERSION}.tgz`
    || lockedPlaywright?.integrity !== PLAYWRIGHT_CORE_INTEGRITY
    || lockedPlaywright?.license !== "Apache-2.0"
    || !sameStringMap(lockedPlaywright?.bin, { "playwright-core": "cli.js" })) {
    throw new Error("Installable package-lock.json must bind exactly playwright-core 1.61.1 and no additional package.");
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function parseSourceDateEpoch(value) {
  if (!/^(?:0|[1-9]\d*)$/.test(String(value))) {
    throw new Error("SOURCE_DATE_EPOCH must be a non-negative integer number of seconds.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 8_589_934_591) {
    throw new Error("SOURCE_DATE_EPOCH is outside the supported deterministic tar range.");
  }
  return parsed;
}

function runGit(root, args) {
  return spawnSync("git", ["-c", `safe.directory=${toPosix(root)}`, "-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.resolve(value);
    let canonical = resolved;
    try {
      canonical = realpathSync.native(resolved);
    } catch {
      // The caller handles missing or invalid paths through the surrounding Git checks.
    }
    return process.platform === "win32" ? canonical.toLowerCase() : canonical;
  };
  return normalize(left) === normalize(right);
}

function inspectGitSource(root) {
  const topLevel = runGit(root, ["rev-parse", "--show-toplevel"]);
  if (topLevel.error?.code === "ENOENT" || topLevel.status !== 0) {
    return { available: false, reason: "Git is unavailable or the release root is not a Git worktree." };
  }

  const repositoryRoot = topLevel.stdout.trim();
  if (!repositoryRoot || !samePath(repositoryRoot, root)) {
    return { available: false, reason: "The release root is not the root of its Git worktree." };
  }

  const headResult = runGit(root, ["rev-parse", "--verify", "HEAD"]);
  if (headResult.status !== 0) {
    return { available: false, reason: "The Git worktree does not have a verifiable HEAD commit." };
  }
  const head = headResult.stdout.trim().toLowerCase();
  if (!SOURCE_COMMIT_PATTERN.test(head)) {
    return { available: false, reason: "Git returned an unsupported HEAD object ID." };
  }

  const statusResult = runGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (statusResult.status !== 0) {
    return { available: false, reason: "Git worktree status could not be inspected." };
  }

  return {
    available: true,
    head,
    clean: statusResult.stdout.trim().length === 0,
  };
}

function resolveSourceClaim(root, value = "unknown") {
  const requested = String(value).trim().toLowerCase();
  if (requested === "unknown" || requested === "uncommitted") {
    return {
      state: requested,
      commit: null,
      verification: "not-claimed",
    };
  }
  if (!SOURCE_COMMIT_PATTERN.test(requested)) {
    throw new Error("Source commit must be `unknown`, `uncommitted`, or a full 40- or 64-character hexadecimal Git HEAD.");
  }

  const git = inspectGitSource(root);
  if (!git.available) {
    throw new Error(`Source commit cannot be verified: ${git.reason} Use --source-commit unknown instead.`);
  }
  if (git.head !== requested) {
    throw new Error(`Source commit ${requested} does not match Git HEAD ${git.head}.`);
  }
  if (!git.clean) {
    throw new Error("A committed source claim requires a clean Git worktree. Use --source-commit uncommitted for a local dirty build.");
  }

  return {
    state: "committed",
    commit: requested,
    verification: "git-head-clean",
  };
}

function writeString(buffer, offset, length, value) {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length > length) throw new Error(`Tar field is too long: ${value}`);
  encoded.copy(buffer, offset);
}

function writeOctal(buffer, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  if (encoded.length > length - 1) throw new Error(`Tar numeric field is too large: ${value}`);
  writeString(buffer, offset, length - 1, encoded);
  buffer[offset + length - 1] = 0;
}

function splitTarPath(value) {
  if (!/^[\x20-\x7e]+$/.test(value)) {
    throw new Error(`Release paths must use portable printable ASCII characters: ${value}`);
  }
  if (Buffer.byteLength(value, "utf8") <= 100) return { name: value, prefix: "" };

  let separator = value.lastIndexOf("/");
  while (separator > 0) {
    const prefix = value.slice(0, separator);
    const name = value.slice(separator + 1);
    if (Buffer.byteLength(prefix, "utf8") <= 155 && Buffer.byteLength(name, "utf8") <= 100) {
      return { name, prefix };
    }
    separator = value.lastIndexOf("/", separator - 1);
  }
  throw new Error(`Path cannot be represented safely in a portable ustar archive: ${value}`);
}

function createTarHeader(filePath, size, sourceDateEpoch) {
  const header = Buffer.alloc(TAR_BLOCK_SIZE, 0);
  const { name, prefix } = splitTarPath(filePath);

  writeString(header, 0, 100, name);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, sourceDateEpoch);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");
  writeString(header, 345, 155, prefix);

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const checksumText = checksum.toString(8).padStart(6, "0");
  writeString(header, 148, 6, checksumText);
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function createTar(files, sourceDateEpoch) {
  const chunks = [];
  for (const file of files) {
    chunks.push(createTarHeader(file.archivePath, file.contents.length, sourceDateEpoch));
    chunks.push(file.contents);
    const padding = (TAR_BLOCK_SIZE - (file.contents.length % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE;
    if (padding) chunks.push(Buffer.alloc(padding, 0));
  }
  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2, 0));
  return Buffer.concat(chunks);
}

function createDeterministicGzip(value) {
  const compressed = Buffer.from(gzipSync(value, { level: 9, mtime: 0 }));
  compressed.writeUInt32LE(0, 4);
  compressed[9] = 255;
  return compressed;
}

function readTarField(header, offset, length) {
  return header.subarray(offset, offset + length).toString("utf8").replace(/\0.*$/s, "");
}

function parseTarOctal(value, field) {
  const normalized = value.trim();
  if (!/^[0-7]+$/.test(normalized)) {
    throw new Error(`Release archive has an invalid ${field} field.`);
  }
  const parsed = Number.parseInt(normalized, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Release archive has an unsupported ${field} value.`);
  }
  return parsed;
}

function assertSafeArchivePath(value) {
  if (!value || value.includes("\\") || path.posix.isAbsolute(value)) {
    throw new Error(`Release archive contains an unsafe path: ${value || "<empty>"}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Release archive contains an unsafe path: ${value}`);
  }
  if (segments[0] !== PACKAGE_NAME || segments.length < 2) {
    throw new Error(`Release archive entry must remain inside ${PACKAGE_NAME}/: ${value}`);
  }
}

function parseTarEntries(archive, expectedSourceDateEpoch) {
  if (archive.length < 18
    || archive[0] !== 0x1f
    || archive[1] !== 0x8b
    || archive[2] !== 8
    || archive[3] !== 0
    || archive.readUInt32LE(4) !== 0
    || archive[9] !== 255) {
    throw new Error("Release archive does not use the required deterministic gzip header.");
  }
  let tar;
  try {
    tar = gunzipSync(archive);
  } catch (error) {
    throw new Error(`Release archive is not valid gzip data: ${error.message}`);
  }
  if (tar.length % TAR_BLOCK_SIZE !== 0) {
    throw new Error("Release archive tar payload is not block aligned.");
  }

  const entries = [];
  const paths = new Set();
  let offset = 0;
  let terminatorFound = false;

  while (offset + TAR_BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) {
      if (offset + TAR_BLOCK_SIZE * 2 > tar.length
        || !tar.subarray(offset, offset + TAR_BLOCK_SIZE * 2).every((byte) => byte === 0)
        || !tar.subarray(offset).every((byte) => byte === 0)) {
        throw new Error("Release archive must end with two zero tar blocks and no trailing payload.");
      }
      terminatorFound = true;
      break;
    }

    const expectedChecksum = parseTarOctal(readTarField(header, 148, 8), "checksum");
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
    if (expectedChecksum !== actualChecksum) {
      throw new Error("Release archive contains a tar header with an invalid checksum.");
    }
    if (readTarField(header, 257, 6) !== "ustar"
      || readTarField(header, 263, 2) !== "00"
      || parseTarOctal(readTarField(header, 100, 8), "mode") !== 0o644
      || parseTarOctal(readTarField(header, 108, 8), "uid") !== 0
      || parseTarOctal(readTarField(header, 116, 8), "gid") !== 0
      || parseTarOctal(readTarField(header, 136, 12), "mtime") !== expectedSourceDateEpoch) {
      throw new Error("Release archive tar metadata is not deterministic or portable.");
    }

    const name = readTarField(header, 0, 100);
    const prefix = readTarField(header, 345, 155);
    const archivePath = prefix ? `${prefix}/${name}` : name;
    assertSafeArchivePath(archivePath);
    if (paths.has(archivePath)) {
      throw new Error(`Release archive contains a duplicate path: ${archivePath}`);
    }
    paths.add(archivePath);

    const type = header[156];
    if (type !== 0 && type !== "0".charCodeAt(0)) {
      throw new Error(`Release archive contains a non-regular entry: ${archivePath}`);
    }
    const size = parseTarOctal(readTarField(header, 124, 12), "size");
    const contentsStart = offset + TAR_BLOCK_SIZE;
    const contentsEnd = contentsStart + size;
    const paddedEnd = contentsStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
    if (contentsEnd > tar.length || paddedEnd > tar.length) {
      throw new Error(`Release archive entry exceeds the tar payload: ${archivePath}`);
    }
    if (!tar.subarray(contentsEnd, paddedEnd).every((byte) => byte === 0)) {
      throw new Error(`Release archive entry has non-zero padding: ${archivePath}`);
    }
    entries.push({
      path: archivePath,
      contents: Buffer.from(tar.subarray(contentsStart, contentsEnd)),
    });
    offset = paddedEnd;
  }

  if (!terminatorFound) {
    throw new Error("Release archive is missing the required tar terminator.");
  }
  return entries;
}

async function collectPayloadFiles(payloadRoot, directory = payloadRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const absolutePath = path.join(directory, entry.name);
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Release payload must not contain symbolic links or reparse-point files: ${absolutePath}`);
    }
    if (metadata.isDirectory()) {
      files.push(...(await collectPayloadFiles(payloadRoot, absolutePath)));
      continue;
    }
    if (!metadata.isFile()) {
      throw new Error(`Release payload contains an unsupported filesystem entry: ${absolutePath}`);
    }

    const relativePath = toPosix(path.relative(payloadRoot, absolutePath));
    const segments = relativePath.split("/");
    const allowedRoot = segments.length === 1
      ? ALLOWED_ROOT_FILES.has(segments[0])
      : ALLOWED_ROOT_DIRECTORIES.has(segments[0]);
    if (!allowedRoot || segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment)) || FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      throw new Error(`Release payload contains a path outside the public skill allowlist: ${relativePath}`);
    }
    const contents = await readFile(absolutePath);
    files.push({
      absolutePath,
      relativePath,
      archivePath: `${PACKAGE_NAME}/${relativePath}`,
      contents,
    });
  }

  return files.sort((left, right) => compareText(left.archivePath, right.archivePath));
}

export async function validateReleaseArtifacts(options = {}) {
  const root = path.resolve(options.root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const outDir = path.resolve(options.outDir ?? path.join(root, "dist", "release"));
  const packageMetadata = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const version = String(options.version ?? packageMetadata.version ?? "");
  if (!SEMVER_PATTERN.test(version)) throw new Error(`Release version is not valid SemVer: ${version || "<empty>"}`);

  const archiveName = `${PACKAGE_NAME}-v${version}.tar.gz`;
  const manifestName = "release-manifest.json";
  const checksumsName = "SHA256SUMS";
  const archivePath = path.resolve(options.archivePath ?? path.join(outDir, archiveName));
  const manifestPath = path.resolve(options.manifestPath ?? path.join(outDir, manifestName));
  const checksumsPath = path.resolve(options.checksumsPath ?? path.join(outDir, checksumsName));
  for (const candidate of [archivePath, manifestPath, checksumsPath]) {
    if (!isInside(outDir, candidate)) {
      throw new Error(`Release verification input must remain inside the release output directory: ${candidate}`);
    }
  }

  const [archive, manifestContents, checksumsContents] = await Promise.all([
    readFile(archivePath),
    readFile(manifestPath),
    readFile(checksumsPath, "utf8"),
  ]);
  let manifest;
  try {
    manifest = JSON.parse(manifestContents.toString("utf8"));
  } catch (error) {
    throw new Error(`Release manifest is not valid JSON: ${error.message}`);
  }

  if (manifest.schemaVersion !== 2
    || manifest.package?.name !== PACKAGE_NAME
    || manifest.package?.version !== version
    || manifest.package?.license !== "MIT"
    || manifest.package?.root !== PACKAGE_NAME) {
    throw new Error("Release manifest package metadata does not match the requested release.");
  }
  if (!SOURCE_STATES.has(manifest.source?.state)) {
    throw new Error("Release manifest source state must be committed, uncommitted, or unknown.");
  }
  if (manifest.source.state === "committed") {
    if (!SOURCE_COMMIT_PATTERN.test(String(manifest.source.commit ?? ""))
      || manifest.source.verification !== "git-head-clean") {
      throw new Error("A committed release manifest requires a verified full Git HEAD.");
    }
  } else if (manifest.source.commit !== null || manifest.source.verification !== "not-claimed") {
    throw new Error("Unknown and uncommitted release manifests must not claim a source commit.");
  }
  parseSourceDateEpoch(manifest.source.sourceDateEpoch);
  if (options.requireCommittedSource && manifest.source.state !== "committed") {
    throw new Error("This release requires a committed source claim.");
  }
  if (options.verifySourceAgainstGit && manifest.source.state === "committed") {
    const verified = resolveSourceClaim(root, manifest.source.commit);
    if (verified.commit !== manifest.source.commit) {
      throw new Error("Release manifest source commit could not be verified against Git HEAD.");
    }
  }

  const archiveDigest = sha256(archive);
  if (manifest.archive?.file !== archiveName
    || manifest.archive?.format !== "tar+gzip"
    || manifest.archive?.bytes !== archive.length
    || manifest.archive?.sha256 !== archiveDigest) {
    throw new Error("Release archive does not match release-manifest.json.");
  }
  const expectedChecksumLines = [
    `${archiveDigest}  ${archiveName}`,
    `${sha256(manifestContents)}  ${manifestName}`,
  ];
  const actualChecksumLines = checksumsContents.trimEnd().split(/\r?\n/);
  if (actualChecksumLines.length !== expectedChecksumLines.length
    || actualChecksumLines.some((line, index) => line !== expectedChecksumLines[index])) {
    throw new Error("SHA256SUMS does not exactly match the release archive and manifest.");
  }

  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Release manifest must enumerate the archive payload.");
  }
  const entries = parseTarEntries(archive, manifest.source.sourceDateEpoch);
  if (entries.length !== manifest.files.length) {
    throw new Error("Release archive entry count does not match the manifest.");
  }
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const declared = manifest.files[index];
    if (declared?.path !== entry.path
      || declared?.bytes !== entry.contents.length
      || declared?.sha256 !== sha256(entry.contents)) {
      throw new Error(`Release archive entry does not match the manifest at index ${index}: ${entry.path}`);
    }
  }

  const extractionRoot = await mkdtemp(path.join(os.tmpdir(), `${PACKAGE_NAME}-verify-`));
  try {
    for (const entry of entries) {
      const destination = path.resolve(extractionRoot, ...entry.path.split("/"));
      if (!isInside(extractionRoot, destination)) {
        throw new Error(`Release archive extraction escaped its temporary root: ${entry.path}`);
      }
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, entry.contents, { flag: "wx" });
    }

    const extractedPayloadRoot = path.join(extractionRoot, PACKAGE_NAME);
    const extractedFiles = await collectPayloadFiles(extractedPayloadRoot);
    if (extractedFiles.length !== manifest.files.length) {
      throw new Error("Extracted release payload does not match the manifest entry count.");
    }
    for (let index = 0; index < extractedFiles.length; index += 1) {
      const extracted = extractedFiles[index];
      const declared = manifest.files[index];
      if (extracted.archivePath !== declared.path
        || extracted.contents.length !== declared.bytes
        || sha256(extracted.contents) !== declared.sha256) {
        throw new Error(`Extracted release payload does not match the manifest: ${extracted.archivePath}`);
      }
    }
    for (const requiredPath of REQUIRED_PAYLOAD_FILES) {
      if (!extractedFiles.some((file) => file.relativePath === requiredPath)) {
        throw new Error(`Extracted release payload is missing required file: ${requiredPath}`);
      }
    }
    await validateScannerRuntimeManifests(extractedPayloadRoot, version);
  } finally {
    await rm(extractionRoot, { recursive: true, force: true });
  }

  return {
    archivePath,
    manifestPath,
    checksumsPath,
    manifest,
    verifiedFiles: entries.length,
    extraction: "temporary-safe-extraction-passed",
  };
}

export async function createReleasePackage(options = {}) {
  const root = path.resolve(options.root ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const payloadRoot = path.join(root, PACKAGE_NAME);
  const outDir = path.resolve(options.outDir ?? path.join(root, "dist", "release"));
  if (isInside(payloadRoot, outDir)) {
    throw new Error("Release output directory must remain outside the installable skill payload.");
  }

  const packageFile = path.join(root, "package.json");
  const packageMetadata = JSON.parse(await readFile(packageFile, "utf8"));
  if (packageMetadata.name !== PACKAGE_NAME) {
    throw new Error(`package.json must declare name: ${PACKAGE_NAME}.`);
  }

  const version = String(options.version ?? packageMetadata.version ?? "");
  if (!SEMVER_PATTERN.test(version)) throw new Error(`Release version is not valid SemVer: ${version || "<empty>"}`);

  const sourceDateEpoch = parseSourceDateEpoch(options.sourceDateEpoch ?? process.env.SOURCE_DATE_EPOCH ?? "0");
  const source = resolveSourceClaim(root, options.sourceCommit ?? "unknown");
  if (options.requireCommittedSource && source.state !== "committed") {
    throw new Error("This release requires a committed source claim.");
  }

  await validateScannerRuntimeManifests(payloadRoot, version);
  const files = await collectPayloadFiles(payloadRoot);
  const required = new Set(files.map((file) => file.relativePath));
  for (const file of REQUIRED_PAYLOAD_FILES) {
    if (!required.has(file)) throw new Error(`Installable release payload is missing required file: ${file}`);
  }

  const tar = createTar(files, sourceDateEpoch);
  const archive = createDeterministicGzip(tar);
  const archiveName = `${PACKAGE_NAME}-v${version}.tar.gz`;
  const manifestName = "release-manifest.json";
  const checksumsName = "SHA256SUMS";

  const manifest = {
    schemaVersion: 2,
    package: {
      name: PACKAGE_NAME,
      version,
      license: "MIT",
      root: PACKAGE_NAME,
    },
    source: {
      state: source.state,
      commit: source.commit,
      verification: source.verification,
      sourceDateEpoch,
    },
    archive: {
      file: archiveName,
      format: "tar+gzip",
      bytes: archive.length,
      sha256: sha256(archive),
    },
    files: files.map((file) => ({
      path: file.archivePath,
      bytes: file.contents.length,
      sha256: sha256(file.contents),
    })),
  };
  const manifestContents = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const checksums = [
    `${manifest.archive.sha256}  ${archiveName}`,
    `${sha256(manifestContents)}  ${manifestName}`,
  ].join("\n") + "\n";

  await mkdir(outDir, { recursive: true });
  const archivePath = path.join(outDir, archiveName);
  const manifestPath = path.join(outDir, manifestName);
  const checksumsPath = path.join(outDir, checksumsName);
  await writeFile(archivePath, archive);
  await writeFile(manifestPath, manifestContents);
  await writeFile(checksumsPath, checksums, "utf8");

  const verification = await validateReleaseArtifacts({
    root,
    outDir,
    version,
    archivePath,
    manifestPath,
    checksumsPath,
  });
  return {
    archivePath,
    manifestPath,
    checksumsPath,
    manifest,
    verification,
  };
}

function usage() {
  return `Usage: node scripts/package-release.mjs [options]

Options:
  --root <path>               Repository root (default: parent of scripts/)
  --out-dir <path>            Output directory (default: dist/release)
  --version <semver>          Override package.json version
  --source-date-epoch <secs>  Deterministic archive timestamp (default: SOURCE_DATE_EPOCH or 0)
  --source-commit <value>     Clean Git HEAD, unknown, or uncommitted (default: unknown)
  --verify-only               Validate and safely unpack existing release artifacts
  --require-committed-source  Fail verification unless the manifest has a verified Git HEAD
  --json                      Print machine-readable output
  -h, --help                  Show this help
`;
}

function parseArguments(args) {
  const options = {};
  let json = false;
  let verifyOnly = false;
  let requireCommittedSource = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--verify-only") {
      verifyOnly = true;
      continue;
    }
    if (argument === "--require-committed-source") {
      requireCommittedSource = true;
      continue;
    }
    if (argument === "-h" || argument === "--help") {
      return { help: true, json, verifyOnly, requireCommittedSource, options };
    }
    const key = {
      "--root": "root",
      "--out-dir": "outDir",
      "--version": "version",
      "--source-date-epoch": "sourceDateEpoch",
      "--source-commit": "sourceCommit",
    }[argument];
    if (!key) throw new Error(`Unknown option: ${argument}`);
    if (index + 1 >= args.length) throw new Error(`${argument} requires a value.`);
    options[key] = args[index + 1];
    index += 1;
  }
  return { help: false, json, verifyOnly, requireCommittedSource, options };
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(usage());
    return;
  }
  if (parsed.verifyOnly) {
    const result = await validateReleaseArtifacts({
      root: parsed.options.root,
      outDir: parsed.options.outDir,
      version: parsed.options.version,
      requireCommittedSource: parsed.requireCommittedSource,
      verifySourceAgainstGit: true,
    });
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify({
        archive: result.archivePath,
        manifest: result.manifestPath,
        checksums: result.checksumsPath,
        source: result.manifest.source,
        verifiedFiles: result.verifiedFiles,
        extraction: result.extraction,
      }, null, 2)}\n`);
      return;
    }
    process.stdout.write(`Release artifacts verified and safely unpacked (${result.verifiedFiles} files):\n- ${result.archivePath}\n- ${result.manifestPath}\n- ${result.checksumsPath}\n`);
    return;
  }
  const result = await createReleasePackage({
    ...parsed.options,
    requireCommittedSource: parsed.requireCommittedSource,
  });
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify({
      archive: result.archivePath,
      manifest: result.manifestPath,
      checksums: result.checksumsPath,
      sha256: result.manifest.archive.sha256,
      source: result.manifest.source,
      verifiedFiles: result.verification.verifiedFiles,
      extraction: result.verification.extraction,
    }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Release package created, verified, and safely unpacked (${result.verification.verifiedFiles} files):\n- ${result.archivePath}\n- ${result.manifestPath}\n- ${result.checksumsPath}\n`);
}

const invokedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedFile === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`[ERROR] ${error.message}\n`);
    process.exitCode = 1;
  });
}
