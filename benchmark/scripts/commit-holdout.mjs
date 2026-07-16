#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { access, lstat, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const benchmarkRoot = path.resolve(scriptDirectory, "..");
const defaultProtocolFile = path.join(benchmarkRoot, "protocol", "v1", "protocol.json");
const COMMITMENT_SCHEMA = "../schemas/holdout-commitment.schema.json";
const COMMITMENT_ALGORITHM = "sha256-salted-freeze-bound-canonical-manifest-v3";
const COMMITMENT_DOMAIN = Buffer.from("frontend-design-ultra-holdout-v3\0", "utf8");

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Committed tree cannot contain a symbolic link: ${toPosix(path.relative(root, target))}`);
    if (entry.isDirectory()) files.push(...(await collectFiles(root, target)));
    else if (entry.isFile()) files.push(target);
    else throw new Error(`Committed tree contains an unsupported filesystem entry: ${toPosix(path.relative(root, target))}`);
  }
  return files;
}

function requireBenchmarkVersion(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(value)) {
    throw new Error("benchmarkVersion must be a non-empty lowercase version identifier");
  }
  return value;
}

function requireSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function canonicalCommitmentPayload(entries, benchmarkVersion, protocolFreezeSha256, generatedAt) {
  return JSON.stringify({
    commitmentVersion: 3,
    benchmarkVersion,
    protocolFreezeSha256,
    generatedAt,
    files: entries,
  });
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

function normalizeLifecycleFields(relativePath, value) {
  const normalized = structuredClone(value);
  if (relativePath === "protocol.json") {
    delete normalized.status;
    delete normalized.resultsStatus;
    for (const track of normalized.tracks ?? []) delete track.status;
    if (normalized.holdout) delete normalized.holdout.status;
  }
  if (relativePath === "matrix.lock.json") {
    delete normalized.status;
    delete normalized.executedRunSlots;
    delete normalized.resultsStatus;
  }
  return normalized;
}

export async function createProtocolFreezeDigest(inputProtocolRoot) {
  const root = path.resolve(inputProtocolRoot);
  const metadata = await lstat(root);
  const protocolRoot = metadata.isDirectory() ? root : path.dirname(root);
  const protocolFile = path.join(protocolRoot, "protocol.json");
  if (!(await exists(protocolFile))) throw new Error(`Protocol root is missing protocol.json: ${protocolRoot}`);
  const protocolFiles = (await collectFiles(protocolRoot))
    .filter((file) => {
      const relativePath = toPosix(path.relative(protocolRoot, file));
      return !relativePath.startsWith("commitments/");
    })
    .map((file) => ({
      file,
      sourceRelativePath: toPosix(path.relative(protocolRoot, file)),
      commitmentPath: `protocol/v1/${toPosix(path.relative(protocolRoot, file))}`,
    }));
  const benchmarkScriptRoot = path.resolve(protocolRoot, "..", "..", "scripts");
  const scriptFiles = path.basename(path.dirname(protocolRoot)) === "protocol" && await exists(benchmarkScriptRoot)
    ? (await collectFiles(benchmarkScriptRoot)).map((file) => ({
      file,
      sourceRelativePath: toPosix(path.relative(benchmarkScriptRoot, file)),
      commitmentPath: `scripts/${toPosix(path.relative(benchmarkScriptRoot, file))}`,
    }))
    : [];
  const entries = [];
  for (const { file, sourceRelativePath, commitmentPath } of [...protocolFiles, ...scriptFiles]) {
    const source = await readFile(file);
    let canonicalSource = source;
    if (file.endsWith(".json")) {
      let parsed;
      try {
        parsed = JSON.parse(source.toString("utf8"));
      } catch (error) {
        throw new Error(`Freeze input is not valid JSON (${commitmentPath}): ${error.message}`);
      }
      const normalized = normalizeLifecycleFields(sourceRelativePath, parsed);
      canonicalSource = Buffer.from(JSON.stringify(canonicalJson(normalized)), "utf8");
    }
    entries.push({
      path: commitmentPath,
      sha256: sha256(canonicalSource),
    });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return {
    digest: sha256(Buffer.from(JSON.stringify({ freezeVersion: 1, files: entries }), "utf8")),
    files: entries,
  };
}

export async function createHoldoutCommitment(inputDirectory, inputSalt, options = {}) {
  const root = path.resolve(inputDirectory);
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw new Error("Holdout input must be a real directory, not a link");
  const salt = Buffer.isBuffer(inputSalt) ? inputSalt : Buffer.from(inputSalt);
  if (salt.length < 32) throw new Error("Holdout salt must contain at least 32 bytes");
  const benchmarkVersion = requireBenchmarkVersion(options.benchmarkVersion ?? "v1-calibration-mvp");
  const protocolFreezeSha256 = requireSha256(options.protocolFreezeSha256, "protocolFreezeSha256");
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(generatedAt)) {
    throw new Error("generatedAt must be an RFC 3339 date-time");
  }
  const files = await collectFiles(root);
  if (files.length === 0) throw new Error("Holdout directory must not be empty");

  const entries = [];
  let totalBytes = 0;
  for (const file of files) {
    const content = await readFile(file);
    totalBytes += content.length;
    entries.push({
      path: toPosix(path.relative(root, file)),
      bytes: content.length,
      sha256: sha256(content),
    });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const canonical = canonicalCommitmentPayload(entries, benchmarkVersion, protocolFreezeSha256, generatedAt);
  const bundleDigest = sha256(Buffer.concat([
    COMMITMENT_DOMAIN,
    salt,
    Buffer.from("\0", "utf8"),
    Buffer.from(canonical, "utf8"),
  ]));
  return {
    publicCommitment: {
      $schema: COMMITMENT_SCHEMA,
      schemaVersion: 3,
      benchmarkVersion,
      protocolFreezeSha256,
      status: "committed",
      algorithm: COMMITMENT_ALGORITHM,
      generatedAt,
      bundleDigest,
      saltDigest: sha256(salt),
      fileCount: entries.length,
      totalBytes,
      disclosure: "File names, per-file hashes, salt, and cleartext remain private until reveal."
    },
    privateManifest: {
      manifestVersion: 3,
      benchmarkVersion,
      protocolFreezeSha256,
      generatedAt,
      files: entries,
    },
  };
}

export async function verifyHoldoutCommitment(inputDirectory, salt, commitment, options = {}) {
  if (options.benchmarkVersion === undefined || options.protocolFreezeSha256 === undefined) {
    throw new Error("Verification requires expected benchmarkVersion and protocolFreezeSha256");
  }
  const benchmarkVersion = requireBenchmarkVersion(options.benchmarkVersion);
  const protocolFreezeSha256 = requireSha256(options.protocolFreezeSha256, "protocolFreezeSha256");
  if (typeof commitment?.generatedAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(commitment.generatedAt)) {
    throw new Error("Commitment generatedAt must be an RFC 3339 date-time");
  }
  const recomputed = await createHoldoutCommitment(inputDirectory, salt, {
    benchmarkVersion,
    protocolFreezeSha256,
    generatedAt: commitment.generatedAt,
  });
  const fields = [
    "$schema",
    "schemaVersion",
    "benchmarkVersion",
    "protocolFreezeSha256",
    "status",
    "algorithm",
    "generatedAt",
    "bundleDigest",
    "saltDigest",
    "fileCount",
    "totalBytes",
    "disclosure",
  ];
  const mismatches = fields.filter((field) => recomputed.publicCommitment[field] !== commitment[field]);
  return {
    ok: mismatches.length === 0,
    mismatches,
    recomputed: recomputed.publicCommitment,
  };
}

async function atomicWrite(target, data, options = {}) {
  if (!options.force && (await exists(target))) throw new Error(`Refusing to overwrite existing file: ${target}`);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, data, { mode: options.mode ?? 0o600 });
    if (options.force && (await exists(target))) await unlink(target);
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function parseArguments(argv) {
  const options = {
    force: false,
    verify: false,
    benchmarkVersion: "v1-calibration-mvp",
    protocolFile: defaultProtocolFile,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") options.force = true;
    else if (argument === "--verify") options.verify = true;
    else if (["--input", "--output", "--salt-file", "--benchmark-version", "--protocol-file"].includes(argument)) {
      if (!argv[index + 1]) throw new Error(`${argument} requires a value`);
      const name = {
        "--input": "input",
        "--output": "output",
        "--salt-file": "saltFile",
        "--benchmark-version": "benchmarkVersion",
        "--protocol-file": "protocolFile",
      }[argument];
      options[name] = argv[index + 1];
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  for (const required of ["input", "output", "saltFile"]) {
    if (!options[required]) throw new Error(`Missing required --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  return options;
}

async function loadProtocolBinding(protocolFile, benchmarkVersion) {
  const file = path.resolve(protocolFile);
  const source = await readFile(file);
  let protocol;
  try {
    protocol = JSON.parse(source.toString("utf8"));
  } catch (error) {
    throw new Error(`Protocol file is not valid JSON: ${error.message}`);
  }
  if (protocol.benchmarkVersion !== benchmarkVersion) {
    throw new Error(`Protocol benchmarkVersion ${JSON.stringify(protocol.benchmarkVersion)} does not match ${JSON.stringify(benchmarkVersion)}`);
  }
  const freeze = await createProtocolFreezeDigest(path.dirname(file));
  return { file, protocolFreezeSha256: freeze.digest };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const input = path.resolve(options.input);
  const output = path.resolve(options.output);
  const saltFile = path.resolve(options.saltFile);
  const protocolBinding = await loadProtocolBinding(options.protocolFile, options.benchmarkVersion);
  if (pathIsInside(input, output)) throw new Error("Public commitment output must not be written inside the private holdout directory");
  if (pathIsInside(input, saltFile)) throw new Error("Salt file must not be stored inside the committed holdout directory");
  if (output === saltFile) throw new Error("Public commitment output and private salt paths must differ");

  if (options.verify) {
    const salt = await readFile(saltFile);
    const commitment = JSON.parse(await readFile(output, "utf8"));
    const result = await verifyHoldoutCommitment(input, salt, commitment, {
      benchmarkVersion: options.benchmarkVersion,
      protocolFreezeSha256: protocolBinding.protocolFreezeSha256,
    });
    if (!result.ok) {
      process.stderr.write(`Holdout verification failed: ${result.mismatches.join(", ")}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Holdout commitment verified: ${commitment.bundleDigest}\n`);
    return;
  }

  if (!options.force && await exists(output)) {
    throw new Error(`Refusing to overwrite existing file: ${output}`);
  }
  let salt;
  if (await exists(saltFile)) salt = await readFile(saltFile);
  else {
    salt = randomBytes(32);
    await atomicWrite(saltFile, salt, { force: false, mode: 0o600 });
  }
  const result = await createHoldoutCommitment(input, salt, {
    benchmarkVersion: options.benchmarkVersion,
    protocolFreezeSha256: protocolBinding.protocolFreezeSha256,
  });
  await atomicWrite(output, `${JSON.stringify(result.publicCommitment, null, 2)}\n`, { force: options.force, mode: 0o644 });
  process.stdout.write(`Created holdout commitment ${result.publicCommitment.bundleDigest}. Keep ${saltFile} and the cleartext bundle private until vote freeze.\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Holdout commitment failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
