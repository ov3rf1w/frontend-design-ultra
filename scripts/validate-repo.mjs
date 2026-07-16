#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateGitHubGovernance } from "./validate-github-governance.mjs";

const execFileAsync = promisify(execFile);

const SKILL_DIRECTORY = "frontend-design-ultra";
const SCANNER_RUNTIME_PACKAGE_NAME = "frontend-design-ultra-scanner-runtime";
const PLAYWRIGHT_CORE_VERSION = "1.61.1";
const PLAYWRIGHT_CORE_INTEGRITY = "sha512-h7Qlt6m4REp25qvIdvbDtVmD4LqVXfpRxhORv9L0jzETM05p4fuPJ3dKyuSXQxDSbXnmS79HAgi9589lGSpLkg==";
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const MAX_SKILL_LINES = 500;
const MAX_SKILL_BYTES = 24 * 1024;
const MAX_DESCRIPTION_CHARACTERS = 1024;
const LONG_REFERENCE_LINES = 100;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const PUBLIC_MEDIA_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mp4",
  ".png",
  ".svg",
  ".webm",
  ".webp",
]);
const RELEASE_DIRECTORIES = [
  ".github",
  "adapters",
  "benchmark",
  "docs",
  "evals",
  "examples",
  "scripts",
  "showcase",
  SKILL_DIRECTORY,
];
const RELEASE_ROOT_FILES = [
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "RIGHTS.md",
  "SECURITY.md",
  "SELF_TEST.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  "install.ps1",
  "install.sh",
  "llms.txt",
  "package.json",
  "uninstall.ps1",
  "uninstall.sh",
];
const BUILT_IN_PRIVATE_TERMS = [
  "struct" + "iva",
  "fh" + "wn",
  "new" + "project",
];
const ALLOWED_FRONTMATTER_FIELDS = new Set([
  "allowed-tools",
  "description",
  "license",
  "metadata",
  "name",
]);
const DESIGN_INTELLIGENCE_FILES = [
  "assets/reference-corpus.json",
  "assets/reference-corpus.schema.json",
  "assets/reference-observations.json",
  "assets/reference-observations.schema.json",
  "assets/reference-scan-outcomes.json",
  "assets/reference-scan-outcomes.schema.json",
  "assets/motion-patterns.json",
  "assets/motion-patterns.schema.json",
  "references/reference-intelligence.md",
  "references/motion-pattern-catalog.md",
];
const REFERENCE_ENTRY_FIELDS = [
  "id",
  "title",
  "sourceUrl",
  "status",
  "industry",
  "designLane",
  "heroMechanicHypothesis",
  "motionSignatureHypothesis",
  "assetDependency",
  "scanRisk",
  "provenance",
  "scanPriority",
];
const MOTION_PATTERN_FIELDS = [
  "id",
  "title",
  "status",
  "effectJob",
  "narrativeRole",
  "suitableFor",
  "avoidFor",
  "trigger",
  "assetCost",
  "performanceBudget",
  "timeline",
  "desktopPlan",
  "mobileAlternative",
  "reducedMotion",
  "noJsPlan",
  "implementation",
  "failureModes",
  "verificationContract",
  "sourceReferences",
  "rights",
];
const MOTION_LIFECYCLE_STATUSES = new Set(["idea", "candidate", "recipe", "verified", "promoted"]);
const MOTION_UNVERIFIED_STATUSES = new Set(["idea", "candidate", "recipe"]);
const MOTION_VERIFICATION_FIELDS = [
  "buildId",
  "implementationPath",
  "verifiedAt",
  "commit",
  "evidenceDigest",
  "viewports",
  "checks",
  "reviewType",
];
const MOTION_REVIEW_TYPES = new Set(["maintainer-visual-review", "independent-review", "blind-jury"]);
const REFERENCE_OBSERVATION_FIELDS = [
  "referenceId",
  "sourceUrl",
  "capturedAt",
  "status",
  "evidenceDigest",
  "evidenceDigestAlgorithm",
  "captureProfile",
  "mechanics",
  "runtime",
  "humanReview",
  "rights",
];
const REFERENCE_SCAN_OUTCOME_FIELDS = [
  "refId",
  "capturedAt",
  "status",
  "eligibility",
  "issues",
  "limitations",
  "viewportCoverage",
  "rights",
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function relativeFile(root, file) {
  return toPosix(path.relative(root, file)) || ".";
}

function diagnostic(code, file, message, line) {
  return {
    severity: "error",
    code,
    file,
    ...(line ? { line } : {}),
    message,
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

async function listFiles(directory) {
  if (!(await exists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if ([".git", ".next", "build", "coverage", "dist", "node_modules", "out"].includes(entry.name)) continue;
      files.push(...(await listFiles(target)));
    } else if (entry.isFile()) {
      files.push(target);
    }
  }
  return files;
}

async function directoryDigest(directory) {
  const hash = createHash("sha256");
  const files = (await listFiles(directory))
    .sort((left, right) => left.localeCompare(right, "en"));
  for (const file of files) {
    hash.update(toPosix(path.relative(directory, file)));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function readJsonIfValid(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function isSafeMotionImplementationPath(value) {
  if (!isNonEmptyString(value) || value.includes("\\") || value.includes("\0")) return false;
  const normalized = path.posix.normalize(value);
  return !path.posix.isAbsolute(value)
    && normalized === value
    && normalized !== "."
    && !normalized.startsWith("../")
    && !normalized.endsWith("/");
}

export function validateMotionPatternLifecycle(pattern) {
  const issues = [];
  const status = pattern?.status;
  if (!MOTION_LIFECYCLE_STATUSES.has(status)) {
    issues.push({
      code: "MOTION_STATUS",
      message: "Motion status must be idea, candidate, recipe, verified, or promoted.",
    });
    return issues;
  }

  const hasEvidence = Object.hasOwn(pattern, "verificationEvidence");
  if (MOTION_UNVERIFIED_STATUSES.has(status)) {
    if (hasEvidence) {
      issues.push({
        code: "MOTION_UNVERIFIED_EVIDENCE_FORBIDDEN",
        message: "Idea, candidate, and recipe patterns cannot claim verificationEvidence.",
      });
    }
    return issues;
  }

  const evidence = pattern.verificationEvidence;
  const viewports = evidence?.viewports;
  const checks = evidence?.checks;
  const evidenceIsComplete = hasRequiredFields(evidence, MOTION_VERIFICATION_FIELDS)
    && isNonEmptyString(evidence?.buildId)
    && isSafeMotionImplementationPath(evidence?.implementationPath)
    && isIsoDate(evidence?.verifiedAt)
    && isFullCommit(evidence?.commit)
    && isSha256(evidence?.evidenceDigest)
    && isNonEmptyStringList(viewports)
    && viewports.length >= 2
    && new Set(viewports).size === viewports.length
    && isNonEmptyStringList(checks)
    && new Set(checks).size === checks.length
    && MOTION_REVIEW_TYPES.has(evidence?.reviewType);
  if (!evidenceIsComplete) {
    issues.push({
      code: "MOTION_VERIFICATION_EVIDENCE",
      message: "Verified and promoted patterns require a safe implementation path and complete original-build verification evidence.",
    });
  }
  return issues;
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

function parseFrontmatter(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) return null;

  const raw = normalized.slice(4, closingIndex);
  const fields = new Map();
  for (const line of raw.split("\n")) {
    if (!line || /^\s/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) fields.set(match[1], unquoteYamlScalar(match[2]));
  }
  return { raw, fields };
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function maskMarkdownCode(source) {
  const lines = source.split(/\r?\n/);
  let fence = null;
  return lines.map((line) => {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      return "";
    }
    if (fence) return "";
    return line.replace(/`[^`]*`/g, "");
  });
}

function markdownTargets(source) {
  const targets = [];
  const lines = maskMarkdownCode(source);
  const inlinePattern = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g;
  const definitionPattern = /^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/;

  lines.forEach((line, index) => {
    for (const match of line.matchAll(inlinePattern)) {
      targets.push({ target: match[1], line: index + 1 });
    }
    const definition = line.match(definitionPattern);
    if (definition) targets.push({ target: definition[1], line: index + 1 });
  });
  return targets;
}

function normalizeMarkdownTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
  if (!target || target.startsWith("#") || target.startsWith("//")) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) return null;

  target = target.split("#", 1)[0].split("?", 1)[0];
  if (!target || /[{}*]/.test(target)) return null;
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

async function validateSkillMetadata(root, diagnostics) {
  const skillFile = path.join(root, SKILL_DIRECTORY, "SKILL.md");
  const skillLabel = relativeFile(root, skillFile);
  if (!(await exists(skillFile))) {
    diagnostics.push(diagnostic("SKILL_MISSING", skillLabel, "Required SKILL.md is missing."));
    return null;
  }

  const source = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(source);
  if (!frontmatter) {
    diagnostics.push(diagnostic("FRONTMATTER_INVALID", skillLabel, "SKILL.md must start with closed YAML frontmatter."));
  } else {
    const { fields } = frontmatter;
    for (const field of fields.keys()) {
      if (!ALLOWED_FRONTMATTER_FIELDS.has(field)) {
        diagnostics.push(diagnostic("FRONTMATTER_FIELD", skillLabel, `Unsupported frontmatter field: ${field}.`));
      }
    }

    const name = fields.get("name") ?? "";
    if (!name) {
      diagnostics.push(diagnostic("SKILL_NAME_MISSING", skillLabel, "Frontmatter requires a name."));
    } else {
      if (name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
        diagnostics.push(diagnostic("SKILL_NAME_INVALID", skillLabel, "Skill name must be at most 64 lowercase alphanumeric/hyphen characters."));
      }
      if (name !== SKILL_DIRECTORY) {
        diagnostics.push(diagnostic("SKILL_NAME_FOLDER_MISMATCH", skillLabel, `Skill name must match folder ${SKILL_DIRECTORY}.`));
      }
    }

    const description = fields.get("description") ?? "";
    if (!description) {
      diagnostics.push(diagnostic("SKILL_DESCRIPTION_MISSING", skillLabel, "Frontmatter requires a non-empty description."));
    } else if (description.length > MAX_DESCRIPTION_CHARACTERS) {
      diagnostics.push(diagnostic("SKILL_DESCRIPTION_LONG", skillLabel, `Description exceeds ${MAX_DESCRIPTION_CHARACTERS} characters.`));
    }
  }

  const lines = source.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(source, "utf8");
  if (lines > MAX_SKILL_LINES) {
    diagnostics.push(diagnostic("SKILL_TOO_MANY_LINES", skillLabel, `SKILL.md has ${lines} lines; maximum is ${MAX_SKILL_LINES}.`));
  }
  if (bytes > MAX_SKILL_BYTES) {
    diagnostics.push(diagnostic("SKILL_TOO_LARGE", skillLabel, `SKILL.md is ${bytes} bytes; maximum is ${MAX_SKILL_BYTES}.`));
  }

  return { source, skillFile };
}

async function validateSkillRouting(root, skill, diagnostics) {
  if (!skill) return;
  const skillRoot = path.join(root, SKILL_DIRECTORY);
  const source = skill.source;
  const mentionedPaths = [...new Set(source.match(/\b(?:assets|references|scripts)\/[A-Za-z0-9._/-]+/g) ?? [])].sort();

  for (const mentionedPath of mentionedPaths) {
    const target = path.resolve(skillRoot, ...mentionedPath.split("/"));
    const staysInsideSkill = target === skillRoot || target.startsWith(`${skillRoot}${path.sep}`);
    if (!staysInsideSkill || !(await exists(target)) || !(await stat(target)).isFile()) {
      const index = source.indexOf(mentionedPath);
      diagnostics.push(diagnostic(
        "SKILL_REFERENCE_MISSING",
        relativeFile(root, skill.skillFile),
        `Referenced local file does not exist: ${mentionedPath}.`,
        lineNumberFor(source, index),
      ));
    }
  }

  const referencesRoot = path.join(skillRoot, "references");
  const references = (await listFiles(referencesRoot))
    .filter((file) => path.extname(file).toLowerCase() === ".md")
    .sort();
  for (const reference of references) {
    const route = `references/${toPosix(path.relative(referencesRoot, reference))}`;
    const referenceSource = await readFile(reference, "utf8");
    const lineCount = referenceSource.split(/\r?\n/).length;
    if (!source.includes(route)) {
      diagnostics.push(diagnostic("REFERENCE_UNROUTED", relativeFile(root, reference), `Reference is not routed from SKILL.md as ${route}.`));
    }
    if (lineCount > LONG_REFERENCE_LINES && !/^## (?:Table of )?Contents\s*$/im.test(referenceSource)) {
      diagnostics.push(diagnostic("REFERENCE_CONTENTS_MISSING", relativeFile(root, reference), `Reference has ${lineCount} lines and requires a level-two Contents section.`));
    }
  }
}

async function validateParameterDocumentation(root, skill, diagnostics) {
  if (!skill) return;
  const grammarMatch = skill.source.match(/## Parameter Grammar[\s\S]*?Groups:\s*([\s\S]*?)\nMode precedence:/);
  if (!grammarMatch) return;

  const parameterFile = path.join(root, "docs", "PARAMETERS.md");
  if (!(await exists(parameterFile))) {
    diagnostics.push(diagnostic("PARAMETER_DOC_MISSING", "docs/PARAMETERS.md", "Canonical parameter documentation is missing."));
    return;
  }

  const documented = (await readFile(parameterFile, "utf8")).replaceAll("\\|", "|");
  const readmeFile = path.join(root, "README.md");
  const readme = (await exists(readmeFile)) ? (await readFile(readmeFile, "utf8")).replaceAll("\\|", "|") : "";
  const parameters = [...new Set(grammarMatch[1].match(/\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\|[a-z0-9-]+)*/g) ?? [])].sort();
  for (const parameter of parameters) {
    if (!documented.includes(`\`${parameter}\``)) {
      diagnostics.push(diagnostic(
        "PARAMETER_UNDOCUMENTED",
        "docs/PARAMETERS.md",
        `Canonical SKILL.md parameter is not documented: ${parameter}.`,
      ));
    }
    if (!readme.includes(`\`${parameter}\``)) {
      diagnostics.push(diagnostic(
        "PARAMETER_README_UNDOCUMENTED",
        "README.md",
        `Canonical SKILL.md parameter is missing from the public parameter summary: ${parameter}.`,
      ));
    }
  }
}

async function validateEvalParity(root, diagnostics) {
  const promptRoot = path.join(root, "evals", "prompts");
  const expectedRoot = path.join(root, "evals", "expected");
  if (!(await exists(promptRoot)) || !(await exists(expectedRoot))) {
    diagnostics.push(diagnostic("EVAL_DIRECTORY_MISSING", "evals", "Both evals/prompts and evals/expected must exist."));
    return;
  }

  const promptNames = new Set((await listFiles(promptRoot)).filter((file) => path.extname(file) === ".md").map((file) => path.basename(file)));
  const expectedNames = new Set((await listFiles(expectedRoot)).filter((file) => path.extname(file) === ".md").map((file) => path.basename(file)));
  for (const name of [...promptNames].sort()) {
    if (!expectedNames.has(name)) diagnostics.push(diagnostic("EVAL_EXPECTED_MISSING", `evals/prompts/${name}`, `Missing paired evals/expected/${name}.`));
  }
  for (const name of [...expectedNames].sort()) {
    if (!promptNames.has(name)) diagnostics.push(diagnostic("EVAL_PROMPT_MISSING", `evals/expected/${name}`, `Missing paired evals/prompts/${name}.`));
  }
}

async function validateJsonAssets(root, diagnostics) {
  const assetsRoot = path.join(root, SKILL_DIRECTORY, "assets");
  for (const file of (await listFiles(assetsRoot)).filter((candidate) => path.extname(candidate).toLowerCase() === ".json")) {
    try {
      JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      diagnostics.push(diagnostic("JSON_ASSET_INVALID", relativeFile(root, file), `JSON asset is invalid: ${error.message}`));
    }
  }
}

function normalizeLicense(source) {
  return source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").trimEnd();
}

async function validateLicenseParity(root, diagnostics) {
  const rootLicense = path.join(root, "LICENSE");
  const skillLicense = path.join(root, SKILL_DIRECTORY, "LICENSE");
  if (!(await exists(rootLicense))) {
    diagnostics.push(diagnostic("ROOT_LICENSE_MISSING", "LICENSE", "The repository root LICENSE is required."));
  }
  if (!(await exists(skillLicense))) {
    diagnostics.push(diagnostic("SKILL_LICENSE_MISSING", `${SKILL_DIRECTORY}/LICENSE`, "The installable skill must include its own LICENSE."));
  }
  if (!(await exists(rootLicense)) || !(await exists(skillLicense))) return;

  const [rootSource, skillSource] = await Promise.all([
    readFile(rootLicense, "utf8"),
    readFile(skillLicense, "utf8"),
  ]);
  if (normalizeLicense(rootSource) !== normalizeLicense(skillSource)) {
    diagnostics.push(diagnostic(
      "LICENSE_MISMATCH",
      `${SKILL_DIRECTORY}/LICENSE`,
      "The installable skill LICENSE must match the repository root LICENSE exactly, ignoring line endings and trailing whitespace.",
    ));
  }
}

async function validateWorkflowActionPins(root, diagnostics) {
  const workflowsRoot = path.join(root, ".github", "workflows");
  const workflowFiles = (await listFiles(workflowsRoot))
    .filter((file) => [".yaml", ".yml"].includes(path.extname(file).toLowerCase()));
  for (const file of workflowFiles) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)["']?/);
      if (!match) return;
      const reference = match[1];
      if (reference.startsWith("./")) return;
      const pinned = reference.startsWith("docker://")
        ? /@sha256:[a-f0-9]{64}$/i.test(reference)
        : /@[a-f0-9]{40}$/i.test(reference);
      if (!pinned) {
        diagnostics.push(diagnostic(
          "ACTION_REF_NOT_PINNED",
          relativeFile(root, file),
          `External action reference must be pinned to a full immutable commit SHA: ${reference}.`,
          index + 1,
        ));
      }
    });
  }
}

async function gitTrackedFiles(root) {
  if (!(await exists(path.join(root, ".git")))) {
    // Packaged skills and isolated unit-test fixtures intentionally have no
    // worktree metadata. A real repository root must never fail open.
    return [];
  }
  try {
    const { stdout } = await execFileAsync("git", ["-c", `safe.directory=${toPosix(root)}`, "-C", root, "ls-files", "-z", "--"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout.split("\0").filter(Boolean);
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? "unknown Git error").trim();
    throw new Error(`git ls-files failed for a repository with .git metadata: ${detail}`);
  }
}

function trackedArtifactReason(file) {
  const normalized = file.replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
  if (/(^|\/)\.env(?:\.|$)/.test(normalized)) {
    return "environment secret file";
  }
  if (/(^|\/)(?:credentials?|secrets?)(?:\/|[._-][^/]*$|$)/.test(normalized)
    || /(^|\/)(?:client[-_.]?secret|service[-_.]?account)(?:[._-][^/]*)?$/.test(normalized)) {
    return "credential or secret file";
  }
  if (/(^|\/)(?:id_rsa|id_ed25519|[^/]+\.(?:key|pem|p12|pfx|keystore))$/.test(normalized)) {
    return "private key or credential container";
  }
  if (/^(?:analysis|\.construction|output|playwright-report|test-results|blob-report)(?:\/|$)/.test(normalized)) {
    return "private construction or browser-output directory";
  }
  if (/(^|\/)(?:playwright-report|test-results|blob-report|\.playwright)(?:\/|$)/.test(normalized)) {
    return "raw Playwright output directory";
  }
  if (/(^|\/)(?:trace\.zip|[^/]+\.har(?:\.zip)?|[^/]+\.trace|storage[-_.]?state[^/]*\.json)$/.test(normalized)) {
    return "raw trace, HAR, or browser storage artifact";
  }
  if (/^benchmark\/(?:[^/]+\/)*(?:private|\.private|scratch|secrets|unblinded|raw-captures|browser-traces)(?:\/|$)/.test(normalized)) {
    return "private or unblinded benchmark artifact";
  }
  return null;
}

async function validateTrackedArtifacts(root, diagnostics, suppliedTrackedFiles) {
  let trackedFiles;
  try {
    trackedFiles = suppliedTrackedFiles ?? await gitTrackedFiles(root);
  } catch (error) {
    diagnostics.push(diagnostic(
      "GIT_TRACKED_FILES_UNAVAILABLE",
      ".git",
      `${error.message} Privacy validation cannot continue safely.`,
    ));
    return;
  }
  for (const rawFile of trackedFiles) {
    const file = rawFile.replaceAll("\\", "/").replace(/^\.\//, "");
    const reason = trackedArtifactReason(file);
    if (reason) {
      diagnostics.push(diagnostic(
        "TRACKED_PRIVATE_ARTIFACT",
        file,
        `Git tracks a forbidden ${reason}; keep raw/private evidence outside the public release.`,
      ));
    }
  }
}

function hasRequiredFields(value, fields) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && fields.every((field) => Object.hasOwn(value, field));
}

function sameStringMap(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualEntries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en"));
  const expectedEntries = Object.entries(expected).sort(([left], [right]) => left.localeCompare(right, "en"));
  return actualEntries.length === expectedEntries.length
    && actualEntries.every(([key, item], index) => key === expectedEntries[index][0] && item === expectedEntries[index][1]);
}

async function validateScannerRuntimeManifests(root, diagnostics) {
  const skillRoot = path.join(root, SKILL_DIRECTORY);
  const packageFile = path.join(skillRoot, "package.json");
  const lockFile = path.join(skillRoot, "package-lock.json");
  const [packageExists, lockExists] = await Promise.all([exists(packageFile), exists(lockFile)]);
  if (!packageExists) {
    diagnostics.push(diagnostic(
      "SCANNER_RUNTIME_PACKAGE_MISSING",
      relativeFile(root, packageFile),
      "The installable skill must include its optional scanner runtime package.json.",
    ));
  }
  if (!lockExists) {
    diagnostics.push(diagnostic(
      "SCANNER_RUNTIME_LOCK_MISSING",
      relativeFile(root, lockFile),
      "The installable skill must include its exact scanner runtime package-lock.json.",
    ));
  }
  if (!packageExists || !lockExists) return;

  const [packageMetadata, lockMetadata] = await Promise.all([
    readJsonIfValid(packageFile),
    readJsonIfValid(lockFile),
  ]);
  if (!packageMetadata
    || packageMetadata.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || !SEMVER_PATTERN.test(String(packageMetadata.version ?? ""))
    || packageMetadata.private !== true
    || packageMetadata.license !== "MIT"
    || packageMetadata.type !== "module"
    || packageMetadata.engines?.node !== ">=24"
    || !sameStringMap(packageMetadata.dependencies, { "playwright-core": PLAYWRIGHT_CORE_VERSION })
    || !sameStringMap(packageMetadata.scripts, { "browser:install": "playwright-core install chromium" })
    || ["devDependencies", "optionalDependencies", "peerDependencies", "overrides"].some((field) => Object.hasOwn(packageMetadata, field))) {
    diagnostics.push(diagnostic(
      "SCANNER_RUNTIME_PACKAGE_INVALID",
      relativeFile(root, packageFile),
      "Scanner package.json must contain only the exact playwright-core 1.61.1 runtime and explicit Chromium install script.",
    ));
    return;
  }

  const lockPackageNames = lockMetadata?.packages && typeof lockMetadata.packages === "object"
    ? Object.keys(lockMetadata.packages).sort((left, right) => left.localeCompare(right, "en"))
    : [];
  const lockRoot = lockMetadata?.packages?.[""];
  const lockedPlaywright = lockMetadata?.packages?.["node_modules/playwright-core"];
  if (!lockMetadata
    || lockMetadata.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || lockMetadata.version !== packageMetadata.version
    || lockMetadata.lockfileVersion !== 3
    || lockMetadata.requires !== true
    || lockPackageNames.length !== 2
    || lockPackageNames[0] !== ""
    || lockPackageNames[1] !== "node_modules/playwright-core"
    || lockRoot?.name !== SCANNER_RUNTIME_PACKAGE_NAME
    || lockRoot?.version !== packageMetadata.version
    || lockRoot?.license !== "MIT"
    || lockRoot?.engines?.node !== ">=24"
    || !sameStringMap(lockRoot?.dependencies, { "playwright-core": PLAYWRIGHT_CORE_VERSION })
    || lockedPlaywright?.version !== PLAYWRIGHT_CORE_VERSION
    || lockedPlaywright?.resolved !== `https://registry.npmjs.org/playwright-core/-/playwright-core-${PLAYWRIGHT_CORE_VERSION}.tgz`
    || lockedPlaywright?.integrity !== PLAYWRIGHT_CORE_INTEGRITY
    || lockedPlaywright?.license !== "Apache-2.0"
    || !sameStringMap(lockedPlaywright?.bin, { "playwright-core": "cli.js" })) {
    diagnostics.push(diagnostic(
      "SCANNER_RUNTIME_LOCK_INVALID",
      relativeFile(root, lockFile),
      "Scanner package-lock.json must bind exactly playwright-core 1.61.1 and no additional package.",
    ));
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isFullCommit(value) {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

async function validateDesignIntelligence(root, diagnostics) {
  const skillRoot = path.join(root, SKILL_DIRECTORY);
  const absoluteFiles = DESIGN_INTELLIGENCE_FILES.map((file) => path.join(skillRoot, ...file.split("/")));
  const presence = await Promise.all(absoluteFiles.map(exists));
  if (!presence.some(Boolean)) return;

  DESIGN_INTELLIGENCE_FILES.forEach((file, index) => {
    if (!presence[index]) {
      diagnostics.push(diagnostic(
        "DESIGN_INTELLIGENCE_FILE_MISSING",
        `${SKILL_DIRECTORY}/${file}`,
        "The reference-intelligence subsystem is incomplete; all corpus, schema, and catalog files are required together.",
      ));
    }
  });

  const corpusFile = path.join(skillRoot, "assets", "reference-corpus.json");
  const corpusSchemaFile = path.join(skillRoot, "assets", "reference-corpus.schema.json");
  const observationsFile = path.join(skillRoot, "assets", "reference-observations.json");
  const observationsSchemaFile = path.join(skillRoot, "assets", "reference-observations.schema.json");
  const scanOutcomesFile = path.join(skillRoot, "assets", "reference-scan-outcomes.json");
  const scanOutcomesSchemaFile = path.join(skillRoot, "assets", "reference-scan-outcomes.schema.json");
  const motionFile = path.join(skillRoot, "assets", "motion-patterns.json");
  const motionSchemaFile = path.join(skillRoot, "assets", "motion-patterns.schema.json");
  const [
    corpus,
    corpusSchema,
    observationsCatalog,
    observationsSchema,
    scanOutcomesCatalog,
    scanOutcomesSchema,
    motion,
    motionSchema,
  ] = await Promise.all([
    readJsonIfValid(corpusFile),
    readJsonIfValid(corpusSchemaFile),
    readJsonIfValid(observationsFile),
    readJsonIfValid(observationsSchemaFile),
    readJsonIfValid(scanOutcomesFile),
    readJsonIfValid(scanOutcomesSchemaFile),
    readJsonIfValid(motionFile),
    readJsonIfValid(motionSchemaFile),
  ]);

  const corpusLabel = relativeFile(root, corpusFile);
  const corpusSchemaVersion = corpusSchema?.properties?.schemaVersion?.const;
  const validCorpusStatuses = ["candidate", "scanned", "promoted", "retired"];
  const corpusEntries = Array.isArray(corpus?.entries) ? corpus.entries : [];
  const corpusEntriesById = new Map(corpusEntries.map((entry) => [entry?.id, entry]));
  if (corpus) {
    if (corpus.$schema !== "./reference-corpus.schema.json") {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_SCHEMA_LINK", corpusLabel, "Reference corpus must link its adjacent schema with ./reference-corpus.schema.json."));
    }
    if (!/^\d+\.\d+\.\d+$/.test(String(corpus.schemaVersion ?? "")) || corpus.schemaVersion !== corpusSchemaVersion) {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_VERSION", corpusLabel, "Reference corpus schemaVersion must be semantic and match the schema const."));
    }
    if (corpus.datasetStatus !== "mixed-lifecycle" || corpusSchema?.properties?.datasetStatus?.const !== "mixed-lifecycle") {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_STATUS", corpusLabel, "Reference corpus and schema must declare the mixed-lifecycle dataset status."));
    }

    if (corpusEntries.length === 0 || corpus.entryCount !== corpusEntries.length) {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_COUNT", corpusLabel, "entryCount must equal a non-empty entries array."));
    }
    const actualStatusCounts = Object.fromEntries(validCorpusStatuses.map((status) => [status, 0]));
    for (const entry of corpusEntries) {
      if (Object.hasOwn(actualStatusCounts, entry?.status)) actualStatusCounts[entry.status] += 1;
    }
    if (validCorpusStatuses.some((status) => corpus.statusCounts?.[status] !== actualStatusCounts[status])) {
      diagnostics.push(diagnostic(
        "REFERENCE_CORPUS_STATUS_COUNTS",
        corpusLabel,
        `statusCounts must match entry lifecycle states: ${JSON.stringify(actualStatusCounts)}.`,
      ));
    }
    if (corpus.observationCatalog !== "./reference-observations.json") {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_OBSERVATION_CATALOG", corpusLabel, "observationCatalog must point to ./reference-observations.json."));
    }
    if (corpus.scanOutcomeCatalog !== "./reference-scan-outcomes.json") {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_SCAN_OUTCOME_CATALOG", corpusLabel, "scanOutcomeCatalog must point to ./reference-scan-outcomes.json."));
    }
    const rights = corpus.rightsPolicy;
    if (!isNonEmptyStringList(rights?.publicData)
      || !isNonEmptyStringList(rights?.excludedData)
      || !isNonEmptyString(rights?.captureRule)
      || !isNonEmptyString(rights?.implementationRule)) {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_RIGHTS", corpusLabel, "rightsPolicy requires non-empty publicData, excludedData, captureRule, and implementationRule."));
    }

    const seenIds = new Set();
    const seenUrls = new Set();
    const validStatuses = new Set(validCorpusStatuses);
    corpusEntries.forEach((entry, index) => {
      const location = `${corpusLabel}#entries/${index}`;
      if (!hasRequiredFields(entry, REFERENCE_ENTRY_FIELDS)) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_ENTRY", location, "Reference entry is missing one or more canonical fields."));
      }
      if (!/^ref-\d{3}$/.test(entry?.id ?? "")) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_ID", location, "Reference id must use the ref-000 format."));
      } else if (seenIds.has(entry.id)) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_DUPLICATE", location, `Duplicate reference id: ${entry.id}.`));
      } else {
        seenIds.add(entry.id);
      }
      if (!isHttpsUrl(entry?.sourceUrl)) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_URL", location, "Reference sourceUrl must be a valid HTTPS URL."));
      } else if (seenUrls.has(entry.sourceUrl)) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_DUPLICATE", location, `Duplicate reference sourceUrl: ${entry.sourceUrl}.`));
      } else {
        seenUrls.add(entry.sourceUrl);
      }
      if (!validStatuses.has(entry?.status)) {
        diagnostics.push(diagnostic("REFERENCE_CORPUS_STATUS", location, `Unknown reference status: ${entry?.status ?? "missing"}.`));
      }
      if (["scanned", "promoted"].includes(entry?.status)) {
        const evidence = entry.scanEvidence;
        if (!isNonEmptyString(evidence?.scannedAt)
          || !Array.isArray(evidence?.viewports)
          || evidence.viewports.length < 2
          || !evidence.viewports.every(isNonEmptyString)
          || !isNonEmptyStringList(evidence?.evidencePaths)
          || !isNonEmptyStringList(evidence?.verifiedMechanics)) {
          diagnostics.push(diagnostic("REFERENCE_CORPUS_SCAN_EVIDENCE", location, "Scanned and promoted references require dated evidence, at least two viewports, evidence paths, and verified mechanics."));
        }
      }
    });
  }

  const observationsLabel = relativeFile(root, observationsFile);
  const observationsSchemaVersion = observationsSchema?.properties?.schemaVersion?.const;
  const observations = Array.isArray(observationsCatalog?.observations) ? observationsCatalog.observations : [];
  const observationDigestsByReference = new Map();
  const observationsByReference = new Map();
  if (observationsCatalog) {
    if (observationsCatalog.$schema !== "./reference-observations.schema.json") {
      diagnostics.push(diagnostic("REFERENCE_OBSERVATIONS_SCHEMA_LINK", observationsLabel, "Reference observations must link ./reference-observations.schema.json."));
    }
    if (observationsCatalog.schemaVersion !== observationsSchemaVersion) {
      diagnostics.push(diagnostic("REFERENCE_OBSERVATIONS_VERSION", observationsLabel, "Observation schemaVersion must match the schema const."));
    }
    if (observationsCatalog.sourceCorpusVersion !== corpus?.schemaVersion) {
      diagnostics.push(diagnostic("REFERENCE_OBSERVATIONS_CORPUS_VERSION", observationsLabel, "Observation sourceCorpusVersion must match the reference corpus schemaVersion."));
    }
    if (observationsCatalog.observationCount !== observations.length) {
      diagnostics.push(diagnostic("REFERENCE_OBSERVATION_COUNT", observationsLabel, "observationCount must equal the observations array length."));
    }
    if (corpus?.observationCount !== observations.length) {
      diagnostics.push(diagnostic("REFERENCE_CORPUS_OBSERVATION_COUNT", corpusLabel, "Corpus observationCount must equal the linked observations array length."));
    }
    if (observationsCatalog.rightsPolicy !== "source-links-and-derived-mechanics-only"
      || observationsSchema?.properties?.rightsPolicy?.const !== "source-links-and-derived-mechanics-only") {
      diagnostics.push(diagnostic("REFERENCE_OBSERVATIONS_RIGHTS_POLICY", observationsLabel, "Observation catalog and schema must restrict publication to source links and derived mechanics."));
    }

    const seenObservationIds = new Set();
    const seenDigests = new Set();
    observations.forEach((observation, index) => {
      const location = `${observationsLabel}#observations/${index}`;
      if (!hasRequiredFields(observation, REFERENCE_OBSERVATION_FIELDS)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_ENTRY", location, "Observation is missing one or more canonical fields."));
      }
      if (!/^ref-\d{3}$/.test(observation?.referenceId ?? "")) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_ID", location, "Observation referenceId must use the ref-000 format."));
      } else if (seenObservationIds.has(observation.referenceId)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_DUPLICATE", location, `Duplicate observation referenceId: ${observation.referenceId}.`));
      } else {
        seenObservationIds.add(observation.referenceId);
        observationsByReference.set(observation.referenceId, observation);
      }
      if (!isHttpsUrl(observation?.sourceUrl)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_URL", location, "Observation sourceUrl must be a valid HTTPS URL."));
      }
      if (!isSha256(observation?.evidenceDigest)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_DIGEST", location, "Observation evidenceDigest must be a lowercase SHA-256 digest."));
      } else if (seenDigests.has(observation.evidenceDigest)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_DUPLICATE", location, `Duplicate observation evidenceDigest: ${observation.evidenceDigest}.`));
      } else {
        seenDigests.add(observation.evidenceDigest);
        const digests = observationDigestsByReference.get(observation.referenceId) ?? new Set();
        digests.add(observation.evidenceDigest);
        observationDigestsByReference.set(observation.referenceId, digests);
      }
      if (observation?.evidenceDigestAlgorithm !== "sha256-aggregate-artifact-set-v1") {
        diagnostics.push(diagnostic(
          "REFERENCE_OBSERVATION_DIGEST_ALGORITHM",
          location,
          "Observation evidenceDigest must declare the aggregate artifact-set algorithm.",
        ));
      }

      const corpusEntry = corpusEntriesById.get(observation?.referenceId);
      if (!corpusEntry) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_CORPUS_UNKNOWN", location, `Observation references an unknown corpus id: ${observation?.referenceId ?? "missing"}.`));
      } else if (corpusEntry.sourceUrl !== observation.sourceUrl) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_CORPUS_URL", location, "Observation sourceUrl must exactly match its corpus entry."));
      }
      if (observation?.status !== "machine-captured-needs-human-review") {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_STATUS", location, "Public machine observations must remain marked as needing human review."));
      }
      if (!["exploratory", "benchmark"].includes(observation?.captureProfile?.evidenceTier)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_EVIDENCE_TIER", location, "Observation evidenceTier must be exploratory or benchmark."));
      }
      if (!Number.isInteger(observation?.captureProfile?.evidenceArtifactCount)
        || observation.captureProfile.evidenceArtifactCount < 1) {
        diagnostics.push(diagnostic(
          "REFERENCE_OBSERVATION_ARTIFACT_COUNT",
          location,
          "Observation captureProfile requires a positive aggregate evidenceArtifactCount.",
        ));
      }
      if (observation?.humanReview?.status !== "pending" || !isNonEmptyStringList(observation?.humanReview?.requiredBeforePromotion)) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_HUMAN_REVIEW", location, "Machine observations require a pending human-review checklist before promotion."));
      }
      if (observation?.rights?.rawArtifactsPublished !== false
        || observation?.rights?.publicSurface !== "derived-mechanics-only"
        || observation?.rights?.copiedCode !== false
        || observation?.rights?.copiedAssets !== false) {
        diagnostics.push(diagnostic("REFERENCE_OBSERVATION_RIGHTS", location, "Public observations must exclude raw artifacts, copied code, and copied assets."));
      }
    });
  }

  const scanOutcomesLabel = relativeFile(root, scanOutcomesFile);
  const scanOutcomesSchemaVersion = scanOutcomesSchema?.properties?.schemaVersion?.const;
  const scanOutcomes = Array.isArray(scanOutcomesCatalog?.outcomes) ? scanOutcomesCatalog.outcomes : [];
  if (scanOutcomesCatalog) {
    if (scanOutcomesCatalog.$schema !== "./reference-scan-outcomes.schema.json") {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOMES_SCHEMA_LINK",
        scanOutcomesLabel,
        "Reference scan outcomes must link ./reference-scan-outcomes.schema.json.",
      ));
    }
    if (scanOutcomesCatalog.schemaVersion !== scanOutcomesSchemaVersion) {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOMES_VERSION",
        scanOutcomesLabel,
        "Scan outcome schemaVersion must match the schema const.",
      ));
    }
    if (scanOutcomesCatalog.sourceCorpusVersion !== corpus?.schemaVersion) {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOMES_CORPUS_VERSION",
        scanOutcomesLabel,
        "Scan outcome sourceCorpusVersion must match the reference corpus schemaVersion.",
      ));
    }
    if (scanOutcomesCatalog.outcomeCount !== scanOutcomes.length) {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOME_COUNT",
        scanOutcomesLabel,
        "outcomeCount must equal the outcomes array length.",
      ));
    }
    if (corpus?.scanOutcomeCount !== scanOutcomes.length) {
      diagnostics.push(diagnostic(
        "REFERENCE_CORPUS_SCAN_OUTCOME_COUNT",
        corpusLabel,
        "Corpus scanOutcomeCount must equal the linked scan outcomes array length.",
      ));
    }
    if (scanOutcomesCatalog.publicationClass !== "diagnostic-only"
      || scanOutcomesCatalog.rightsPolicy !== "sanitized-scan-metadata-only-no-raw-artifacts") {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOMES_BOUNDARY",
        scanOutcomesLabel,
        "Scan outcomes must remain diagnostic-only sanitized metadata.",
      ));
    }

    const validAttemptStatuses = ["complete", "partial", "failed", "unsupported"];
    const validViewportStatuses = ["complete", "partial", "unsupported", "missing"];
    const seenOutcomeIds = new Set();
    const eligibleOutcomesByReference = new Map();
    scanOutcomes.forEach((outcome, index) => {
      const location = `${scanOutcomesLabel}#outcomes/${index}`;
      if (!hasRequiredFields(outcome, REFERENCE_SCAN_OUTCOME_FIELDS)) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_ENTRY", location, "Scan outcome is missing one or more canonical fields."));
      }
      if (!/^ref-\d{3}$/.test(outcome?.refId ?? "")) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_ID", location, "Scan outcome refId must use the ref-000 format."));
      } else if (seenOutcomeIds.has(outcome.refId)) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_DUPLICATE", location, `Duplicate latest scan outcome for ${outcome.refId}.`));
      } else {
        seenOutcomeIds.add(outcome.refId);
      }
      if (!corpusEntriesById.has(outcome?.refId)) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_CORPUS_UNKNOWN", location, `Unknown corpus reference: ${outcome?.refId ?? "missing"}.`));
      }
      if (!validAttemptStatuses.includes(outcome?.status)) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_STATUS", location, "Scan outcome status is invalid."));
      }
      if (!Number.isFinite(Date.parse(outcome?.capturedAt ?? ""))) {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_DATE", location, "Scan outcome capturedAt must be a valid date-time."));
      }
      if (outcome?.status !== "complete" && outcome?.eligibility !== "diagnostic-only") {
        diagnostics.push(diagnostic(
          "REFERENCE_SCAN_OUTCOME_ELIGIBILITY",
          location,
          "Partial, failed, and unsupported attempts must remain diagnostic-only.",
        ));
      }
      if (outcome?.eligibility === "eligible-complete-observation") {
        eligibleOutcomesByReference.set(outcome.refId, outcome);
        const observation = observationsByReference.get(outcome.refId);
        if (outcome.status !== "complete" || observation?.capturedAt !== outcome.capturedAt) {
          diagnostics.push(diagnostic(
            "REFERENCE_SCAN_OUTCOME_OBSERVATION_MISMATCH",
            location,
            "An eligible latest complete outcome must match its published complete-only observation timestamp.",
          ));
        }
      } else if (outcome?.eligibility !== "diagnostic-only") {
        diagnostics.push(diagnostic("REFERENCE_SCAN_OUTCOME_ELIGIBILITY", location, "Unknown eligibility value."));
      }
      if (!Array.isArray(outcome?.issues)
        || !Array.isArray(outcome?.limitations)
        || !outcome.limitations.includes("human-visual-review-required")) {
        diagnostics.push(diagnostic(
          "REFERENCE_SCAN_OUTCOME_CODES",
          location,
          "Scan outcomes require allowlisted issue/limitation arrays and a human-review limitation.",
        ));
      }
      if (Object.hasOwn(outcome ?? {}, "evidenceDigest")) {
        diagnostics.push(diagnostic(
          "REFERENCE_SCAN_OUTCOME_DIGEST_FORBIDDEN",
          location,
          "Diagnostic scan outcomes must not expose an evidence digest usable as motion verification.",
        ));
      }
      const rights = outcome?.rights;
      if (rights?.publicSurface !== "sanitized-diagnostic-scan-metadata-only"
        || rights?.rawArtifactsPublished !== false
        || rights?.copiedCode !== false
        || rights?.copiedAssets !== false
        || rights?.usableForMotionVerification !== false) {
        diagnostics.push(diagnostic(
          "REFERENCE_SCAN_OUTCOME_RIGHTS",
          location,
          "Scan outcomes must exclude raw artifacts, copied material, and motion-verification eligibility.",
        ));
      }
      const coverage = Array.isArray(outcome?.viewportCoverage) ? outcome.viewportCoverage : [];
      const viewportNames = new Set();
      for (const viewport of coverage) {
        if (!["desktop", "mobile"].includes(viewport?.viewport)
          || viewportNames.has(viewport.viewport)
          || !validViewportStatuses.includes(viewport?.viewportStatus)) {
          diagnostics.push(diagnostic(
            "REFERENCE_SCAN_OUTCOME_VIEWPORT",
            location,
            "Viewport coverage must contain unique desktop/mobile entries with valid statuses.",
          ));
          break;
        }
        viewportNames.add(viewport.viewport);
      }
    });

    const actualAttemptStatusCounts = Object.fromEntries(
      validAttemptStatuses.map((status) => [status, scanOutcomes.filter((outcome) => outcome?.status === status).length]),
    );
    const actualEligibilityCounts = {
      eligibleCompleteObservation: scanOutcomes.filter((outcome) =>
        outcome?.eligibility === "eligible-complete-observation").length,
      diagnosticOnly: scanOutcomes.filter((outcome) =>
        outcome?.eligibility === "diagnostic-only").length,
    };
    const allViewportCoverage = scanOutcomes.flatMap((outcome) =>
      Array.isArray(outcome?.viewportCoverage) ? outcome.viewportCoverage : []);
    const actualViewportStatusCounts = Object.fromEntries(
      validViewportStatuses.map((status) => [
        status,
        allViewportCoverage.filter((viewport) => viewport?.viewportStatus === status).length,
      ]),
    );
    const summary = scanOutcomesCatalog.summary;
    if (summary?.relevantNewestAttempts !== scanOutcomes.length
      || JSON.stringify(summary?.statusCounts) !== JSON.stringify(actualAttemptStatusCounts)
      || JSON.stringify(summary?.eligibilityCounts) !== JSON.stringify(actualEligibilityCounts)
      || JSON.stringify(summary?.viewportStatusCounts) !== JSON.stringify(actualViewportStatusCounts)) {
      diagnostics.push(diagnostic(
        "REFERENCE_SCAN_OUTCOME_SUMMARY",
        scanOutcomesLabel,
        "Scan outcome summary counts must exactly match the outcomes array.",
      ));
    }
    for (const [referenceId, observation] of observationsByReference) {
      const latestOutcome = scanOutcomes.find((outcome) => outcome.refId === referenceId);
      const eligibleOutcome = eligibleOutcomesByReference.get(referenceId);
      const explicitOlderComplete = latestOutcome
        && latestOutcome.eligibility === "diagnostic-only"
        && ["partial", "failed"].includes(latestOutcome.status)
        && Date.parse(observation.capturedAt) < Date.parse(latestOutcome.capturedAt);
      if (!eligibleOutcome && !explicitOlderComplete) {
        diagnostics.push(diagnostic(
          "REFERENCE_OBSERVATION_SCAN_OUTCOME_MISMATCH",
          observationsLabel,
          `Observation ${referenceId} must match an eligible latest complete outcome or an explicitly newer partial/failed diagnostic outcome.`,
        ));
      }
    }
  }

  const motionLabel = relativeFile(root, motionFile);
  const motionSchemaVersion = motionSchema?.properties?.schemaVersion?.const;
  if (motion) {
    if (motion.$schema !== "./motion-patterns.schema.json") {
      diagnostics.push(diagnostic("MOTION_SCHEMA_LINK", motionLabel, "Motion catalog must link its adjacent schema with ./motion-patterns.schema.json."));
    }
    if (motionSchemaVersion !== 2
      || motion.schemaVersion !== motionSchemaVersion
      || motion.catalogVersion !== "0.2.0"
      || motion.updatedAt !== "2026-07-16") {
      diagnostics.push(diagnostic(
        "MOTION_VERSION",
        motionLabel,
        "Motion catalog must use lifecycle schema v2, catalog 0.2.0, and the 2026-07-16 update date.",
      ));
    }

    const patterns = Array.isArray(motion.patterns) ? motion.patterns : [];
    if (patterns.length === 0) {
      diagnostics.push(diagnostic("MOTION_PATTERNS_EMPTY", motionLabel, "Motion catalog must contain at least one pattern."));
    }
    const referenceIds = new Set(corpusEntries.map(({ id }) => id));
    const patternIds = new Set();
    patterns.forEach((pattern, index) => {
      const location = `${motionLabel}#patterns/${index}`;
      if (!hasRequiredFields(pattern, MOTION_PATTERN_FIELDS)) {
        diagnostics.push(diagnostic("MOTION_PATTERN_ENTRY", location, "Motion pattern is missing one or more canonical fields."));
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pattern?.id ?? "")) {
        diagnostics.push(diagnostic("MOTION_PATTERN_ID", location, "Motion pattern id must be a lowercase hyphenated slug."));
      } else if (patternIds.has(pattern.id)) {
        diagnostics.push(diagnostic("MOTION_PATTERN_DUPLICATE", location, `Duplicate motion pattern id: ${pattern.id}.`));
      } else {
        patternIds.add(pattern.id);
      }

      let previousAt = -1;
      const timelineValid = Array.isArray(pattern?.timeline)
        && pattern.timeline.length > 0
        && pattern.timeline.every((beat) => {
          const valid = Number.isFinite(beat?.at)
            && beat.at >= 0
            && beat.at <= 1
            && beat.at >= previousAt
            && Number.isFinite(beat?.durationMs)
            && beat.durationMs >= 0
            && isNonEmptyString(beat?.layer)
            && isNonEmptyString(beat?.action)
            && isNonEmptyString(beat?.easing);
          if (Number.isFinite(beat?.at)) previousAt = beat.at;
          return valid;
        });
      if (!timelineValid) {
        diagnostics.push(diagnostic("MOTION_TIMELINE", location, "Timeline beats must be non-empty, ordered from 0 to 1, non-negative in duration, and fully described."));
      }
      if (pattern?.performanceBudget?.fallbackRequired !== true) {
        diagnostics.push(diagnostic("MOTION_FALLBACK", location, "Every motion pattern must require a performance fallback."));
      }
      if (!new Set(["original-abstraction", "licensed-reconstruction"]).has(pattern?.rights?.recipeOwnership)
        || pattern?.rights?.implementationLicense !== "MIT"
        || pattern?.rights?.thirdPartyAssetsAllowed !== false) {
        diagnostics.push(diagnostic("MOTION_RIGHTS", location, "Motion recipes must be MIT, original or licensed reconstructions, and exclude third-party assets."));
      }
      if (pattern?.rights?.recipeOwnership === "licensed-reconstruction"
        && (!isNonEmptyString(pattern.rights.sourceLicense) || !isHttpsUrl(pattern.rights.provenanceUrl))) {
        diagnostics.push(diagnostic("MOTION_LICENSE_PROVENANCE", location, "Licensed reconstructions require a named source license and HTTPS provenance URL."));
      }
      for (const issue of validateMotionPatternLifecycle(pattern)) {
        diagnostics.push(diagnostic(issue.code, location, issue.message));
      }
      for (const sourceReference of Array.isArray(pattern?.sourceReferences) ? pattern.sourceReferences : []) {
        if (!referenceIds.has(sourceReference?.referenceId)) {
          diagnostics.push(diagnostic("MOTION_REFERENCE_UNKNOWN", location, `Unknown corpus reference: ${sourceReference?.referenceId ?? "missing"}.`));
        }
        if (["machine-captured", "visually-reviewed"].includes(sourceReference?.status)) {
          const matchingDigests = observationDigestsByReference.get(sourceReference.referenceId);
          if (!isSha256(sourceReference?.evidenceDigest) || !matchingDigests?.has(sourceReference.evidenceDigest)) {
            diagnostics.push(diagnostic(
              "MOTION_OBSERVATION_EVIDENCE_MISMATCH",
              location,
              `Motion source ${sourceReference.referenceId ?? "missing"} must reference its matching published observation digest.`,
            ));
          }
        }
      }
    });
  }
}

function extractDefaultPrompt(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{2}default_prompt:\s*/.test(line));
  if (start === -1) return null;
  const first = lines[start].replace(/^\s{2}default_prompt:\s*/, "");
  if (!/^[>|]/.test(first.trim())) return unquoteYamlScalar(first);

  const continuation = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4,}\S/.test(lines[index])) continuation.push(lines[index].trim());
    else break;
  }
  return continuation.join("\n");
}

async function validateAgentMetadata(root, diagnostics) {
  const file = path.join(root, SKILL_DIRECTORY, "agents", "openai.yaml");
  const label = relativeFile(root, file);
  if (!(await exists(file))) {
    diagnostics.push(diagnostic("OPENAI_YAML_MISSING", label, "agents/openai.yaml is missing."));
    return;
  }
  const source = await readFile(file, "utf8");
  const prompt = extractDefaultPrompt(source);
  if (!prompt) {
    diagnostics.push(diagnostic("DEFAULT_PROMPT_MISSING", label, "interface.default_prompt is missing or empty."));
  } else if (!prompt.includes("$frontend-design-ultra")) {
    diagnostics.push(diagnostic("DEFAULT_PROMPT_SKILL_MISSING", label, "interface.default_prompt must explicitly mention $frontend-design-ultra."));
  }
}

async function validateBenchmarkIntegration(root, diagnostics) {
  const benchmarkRoot = path.join(root, "benchmark");
  if (!(await exists(benchmarkRoot))) return;

  const validatorFile = path.join(benchmarkRoot, "scripts", "validate.mjs");
  const protocolFile = path.join(benchmarkRoot, "protocol", "v1", "protocol.json");
  const statusFile = path.join(benchmarkRoot, "results", "v1", "status.json");
  const requiredFiles = [
    [validatorFile, "BENCHMARK_VALIDATOR_MISSING", "Benchmark validator is required."],
    [protocolFile, "BENCHMARK_PROTOCOL_MISSING", "Benchmark protocol v1 is required."],
    [statusFile, "BENCHMARK_STATUS_MISSING", "Benchmark result status is required."],
  ];
  const presence = await Promise.all(requiredFiles.map(([file]) => exists(file)));
  requiredFiles.forEach(([file, code, message], index) => {
    if (!presence[index]) diagnostics.push(diagnostic(code, relativeFile(root, file), message));
  });
  if (!presence[0]) return;

  try {
    const module = await import(pathToFileURL(validatorFile).href);
    if (typeof module.validateBenchmark !== "function") {
      throw new TypeError("benchmark/scripts/validate.mjs does not export validateBenchmark");
    }
    const result = await module.validateBenchmark(benchmarkRoot);
    if (result?.ok !== true) {
      const nestedCodes = Array.isArray(result?.diagnostics)
        ? [...new Set(result.diagnostics.map(({ code }) => code).filter(Boolean))].slice(0, 8)
        : [];
      const suffix = nestedCodes.length > 0 ? ` (${nestedCodes.join(", ")})` : "";
      diagnostics.push(diagnostic(
        "BENCHMARK_VALIDATION_FAILED",
        relativeFile(root, validatorFile),
        `Benchmark validator reports an invalid public benchmark${suffix}.`,
      ));
    }
    if (presence[1] && presence[2]) {
      const [protocol, status] = await Promise.all([
        readJsonIfValid(protocolFile),
        readJsonIfValid(statusFile),
      ]);
      const validatorResultStatus = result?.resultStatus ?? result?.resultsStatus;
      const protocolResultStatus = protocol?.resultsStatus;
      if (status && validatorResultStatus && validatorResultStatus !== status.status) {
        diagnostics.push(diagnostic(
          "BENCHMARK_STATUS_MISMATCH",
          relativeFile(root, statusFile),
          `Benchmark validator result status ${JSON.stringify(validatorResultStatus)} does not match published result status ${JSON.stringify(status.status)}.`,
        ));
      }
      if (status && protocolResultStatus && protocolResultStatus !== status.status) {
        diagnostics.push(diagnostic(
          "BENCHMARK_STATUS_MISMATCH",
          relativeFile(root, statusFile),
          `Protocol resultsStatus ${JSON.stringify(protocolResultStatus)} does not match published result status ${JSON.stringify(status.status)}.`,
        ));
      }
    }
  } catch (error) {
    diagnostics.push(diagnostic(
      "BENCHMARK_VALIDATOR_ERROR",
      relativeFile(root, validatorFile),
      `Benchmark validator could not run: ${error.message}`,
    ));
  }
}

function qaSummaryContainsUnsupportedClaim(value, keyPath = "") {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((item, index) => qaSummaryContainsUnsupportedClaim(item, `${keyPath}.${index}`));
  }
  if (typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => {
      const nestedPath = keyPath ? `${keyPath}.${key}` : key;
      const keyClaim = /benchmark/i.test(nestedPath)
        || /(?:a11y|accessibility|wcag).*(?:conform|compli|certif|pass|score|level|grade)/i.test(nestedPath);
      return keyClaim || qaSummaryContainsUnsupportedClaim(nested, nestedPath);
    });
  }
  if (typeof value !== "string") return false;
  return /benchmark.{0,40}(?:result|score|winner|better|outperform|pass)/i.test(value)
    || /(?:a11y|accessibility|wcag).{0,40}(?:conform|compli|certif|pass|score|level|grade)/i.test(value);
}

async function validateShowcaseEvidence(root, diagnostics) {
  const showcaseRoot = path.join(root, "docs", "assets", "showcase");
  const manifestFile = path.join(showcaseRoot, "manifest.json");
  const evidenceFile = path.join(root, "showcase", "EVIDENCE.md");
  const provenanceFile = path.join(root, "showcase", "PROVENANCE.md");

  if (!(await exists(evidenceFile))) {
    diagnostics.push(diagnostic("SHOWCASE_EVIDENCE_MISSING", relativeFile(root, evidenceFile), "Showcase evidence documentation is required."));
  }
  if (!(await exists(provenanceFile))) {
    diagnostics.push(diagnostic("SHOWCASE_PROVENANCE_MISSING", relativeFile(root, provenanceFile), "Showcase provenance documentation is required."));
  }
  if (!(await exists(manifestFile))) {
    diagnostics.push(diagnostic("SHOWCASE_MANIFEST_MISSING", relativeFile(root, manifestFile), "Curated showcase manifest is required release evidence."));
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  } catch (error) {
    diagnostics.push(diagnostic("SHOWCASE_MANIFEST_INVALID", relativeFile(root, manifestFile), `Showcase manifest is invalid JSON: ${error.message}`));
    return;
  }
  const manifestLabel = relativeFile(root, manifestFile);
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    diagnostics.push(diagnostic("SHOWCASE_MANIFEST_INVALID", manifestLabel, "Showcase manifest must be a JSON object."));
    return;
  }
  if (manifest.schemaVersion !== 1) {
    diagnostics.push(diagnostic("SHOWCASE_SCHEMA_VERSION", manifestLabel, "Showcase manifest schemaVersion must equal 1."));
  }
  if (manifest.status !== "curated-showcase-not-benchmark") {
    diagnostics.push(diagnostic("SHOWCASE_STATUS", manifestLabel, "Showcase status must be curated-showcase-not-benchmark."));
  }
  if (manifest.capture?.rawArtifactsPublished !== false) {
    diagnostics.push(diagnostic("SHOWCASE_RAW_ARTIFACTS", manifestLabel, "Raw showcase capture artifacts must not be published."));
  }
  const captureProfileValid = manifest.capture?.desktopViewport?.width === 1440
    && manifest.capture?.desktopViewport?.height === 900
    && manifest.capture?.mobileViewport?.width === 393
    && manifest.capture?.mobileViewport?.height === 852
    && JSON.stringify(manifest.capture?.entranceFramesMs) === JSON.stringify([0, 300, 900, 1800])
    && JSON.stringify(manifest.capture?.scrollProgress) === JSON.stringify([0.25, 0.5, 0.75, 1])
    && manifest.capture?.reducedMotion === true;
  if (!captureProfileValid) {
    diagnostics.push(diagnostic("SHOWCASE_CAPTURE_PROFILE", manifestLabel, "Showcase capture profile must preserve the declared desktop, mobile, entrance, scroll, and reduced-motion evidence states."));
  }
  const entranceTiming = manifest.capture?.entranceFrameActualMs;
  const entranceTimingValid = Array.isArray(entranceTiming)
    && entranceTiming.length === 4
    && entranceTiming.every((sample, index) => sample?.targetMs === [0, 300, 900, 1800][index]
      && Number.isFinite(sample?.actualMs)
      && Math.abs(sample.actualMs - sample.targetMs) <= 150);
  if (!entranceTimingValid) {
    diagnostics.push(diagnostic("SHOWCASE_CAPTURE_TIMING", manifestLabel, "Showcase entrance storyboard requires four target-matched actual timing measurements within 150ms."));
  }
  if (!isSha256(manifest.capture?.auditedExportSha256) || !isSha256(manifest.capture?.privateAuditReportSha256)) {
    diagnostics.push(diagnostic("SHOWCASE_AUDIT_BINDING", manifestLabel, "Showcase publication must bind the rendered export and private zero-issue audit with SHA-256 digests."));
  }
  const builtExportRoot = path.join(root, "showcase", "out");
  if (await exists(path.join(builtExportRoot, "index.html"))) {
    const currentExportDigest = await directoryDigest(builtExportRoot);
    if (manifest.capture?.auditedExportSha256 !== currentExportDigest) {
      diagnostics.push(diagnostic(
        "SHOWCASE_EXPORT_STALE",
        manifestLabel,
        "The current showcase static export differs from the export bound to the public gallery. Re-run the browser audit and gallery capture.",
      ));
    }
  }
  const privateAuditFile = path.join(root, "output", "playwright", "showcase-audit", "report.json");
  if (await exists(privateAuditFile)) {
    const privateAuditSource = await readFile(privateAuditFile, "utf8");
    const privateAudit = await readJsonIfValid(privateAuditFile);
    const auditDigest = createHash("sha256").update(privateAuditSource).digest("hex");
    if (!privateAudit
      || !Array.isArray(privateAudit.issues)
      || privateAudit.issues.length !== 0
      || privateAudit.exportDigest !== manifest.capture?.auditedExportSha256
      || auditDigest !== manifest.capture?.privateAuditReportSha256) {
      diagnostics.push(diagnostic(
        "SHOWCASE_AUDIT_STALE",
        manifestLabel,
        "The available private browser audit is missing, non-zero, or not the exact audit bound to the public gallery.",
      ));
    }
  }
  const environmentValid = /^v(?:2[4-9]|[3-9][0-9])\./.test(manifest.environment?.node ?? "")
    && isNonEmptyString(manifest.environment?.playwrightCore)
    && isNonEmptyString(manifest.environment?.chromium)
    && manifest.environment?.locale === "en-GB"
    && /^\d{4}-\d{2}-\d{2}$/.test(manifest.capturedAt ?? "");
  if (!environmentValid) {
    diagnostics.push(diagnostic("SHOWCASE_ENVIRONMENT", manifestLabel, "Showcase evidence requires a dated Node 24+ / Playwright / Chromium / en-GB environment record."));
  }
  if (manifest.rights?.thirdPartyVisualAssets !== false) {
    diagnostics.push(diagnostic("SHOWCASE_THIRD_PARTY_VISUALS", manifestLabel, "Showcase evidence must contain no third-party visual assets."));
  }
  if (!isNonEmptyString(manifest.rights?.claimBoundary)) {
    diagnostics.push(diagnostic("SHOWCASE_CLAIM_BOUNDARY", manifestLabel, "Showcase rights metadata requires a non-empty claimBoundary."));
  }
  if (manifest.qaSummary === null || typeof manifest.qaSummary !== "object" || Array.isArray(manifest.qaSummary)) {
    diagnostics.push(diagnostic("SHOWCASE_QA_SUMMARY", manifestLabel, "Showcase qaSummary must be an object."));
  } else {
    const expectedChecks = {
      routes: 6,
      desktopHorizontalOverflow: 0,
      mobileHorizontalOverflow: 0,
      consoleOrPageErrors: 0,
      reducedMotionRunningAnimationsAfterSettle: 0,
      interactiveTargetsBelow24Px: 0,
      interactionFlowsPassed: 6,
    };
    if (Object.entries(expectedChecks).some(([key, expected]) => manifest.qaSummary[key] !== expected)) {
      diagnostics.push(diagnostic("SHOWCASE_QA_SUMMARY", manifestLabel, "Showcase qaSummary must record the zero-issue six-route browser contract."));
    }
    if (qaSummaryContainsUnsupportedClaim(manifest.qaSummary)) {
      diagnostics.push(diagnostic("SHOWCASE_QA_CLAIM", manifestLabel, "Showcase QA may report measured checks but must not claim benchmark results or accessibility conformance."));
    }
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length !== 7) {
    diagnostics.push(diagnostic("SHOWCASE_FILE_COUNT", manifestLabel, "Showcase manifest must contain exactly seven WebP evidence files."));
  }
  const seenPaths = new Set();
  const routes = new Set();
  const safeManifestPaths = new Set();
  let canonicalShowcaseRoot = null;
  try {
    canonicalShowcaseRoot = await realpath(showcaseRoot);
  } catch {}

  for (const [index, file] of files.entries()) {
    const location = `${manifestLabel}#files/${index}`;
    const filePath = file?.path;
    const normalizedPath = typeof filePath === "string" ? path.posix.normalize(filePath) : "";
    const target = normalizedPath ? path.resolve(showcaseRoot, ...normalizedPath.split("/")) : showcaseRoot;
    const safePath = isNonEmptyString(filePath)
      && !filePath.includes("\\")
      && !path.isAbsolute(filePath)
      && normalizedPath === filePath
      && normalizedPath !== "."
      && !normalizedPath.startsWith("../")
      && path.extname(normalizedPath) === ".webp"
      && target.startsWith(`${showcaseRoot}${path.sep}`);
    if (!safePath) {
      diagnostics.push(diagnostic("SHOWCASE_PATH_UNSAFE", location, "Showcase file path must be a normalized relative .webp path inside docs/assets/showcase."));
      continue;
    }
    if (seenPaths.has(normalizedPath)) {
      diagnostics.push(diagnostic("SHOWCASE_FILE_DUPLICATE", location, `Duplicate showcase file path: ${normalizedPath}.`));
    }
    seenPaths.add(normalizedPath);
    safeManifestPaths.add(normalizedPath);

    if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(file?.route ?? "")) {
      diagnostics.push(diagnostic("SHOWCASE_ROUTE_INVALID", location, "Showcase route must be a normalized root-relative route ending in a slash."));
    } else {
      routes.add(file.route);
    }
    if (!Number.isInteger(file?.width) || file.width <= 0 || !Number.isInteger(file?.height) || file.height <= 0) {
      diagnostics.push(diagnostic("SHOWCASE_DIMENSIONS", location, "Showcase width and height must be positive integers."));
    }
    if (!isSha256(file?.sha256)) {
      diagnostics.push(diagnostic("SHOWCASE_DIGEST_INVALID", location, "Showcase sha256 must be a lowercase SHA-256 digest."));
    }
    if (!(await exists(target)) || !(await stat(target)).isFile()) {
      diagnostics.push(diagnostic("SHOWCASE_FILE_MISSING", location, `Showcase evidence file does not exist: ${normalizedPath}.`));
      continue;
    }
    try {
      const canonicalTarget = await realpath(target);
      if (!canonicalShowcaseRoot || !canonicalTarget.startsWith(`${canonicalShowcaseRoot}${path.sep}`)) {
        diagnostics.push(diagnostic("SHOWCASE_PATH_UNSAFE", location, `Showcase evidence resolves outside its release directory: ${normalizedPath}.`));
        continue;
      }
    } catch {
      diagnostics.push(diagnostic("SHOWCASE_FILE_MISSING", location, `Showcase evidence file cannot be resolved: ${normalizedPath}.`));
      continue;
    }
    const actualDigest = createHash("sha256").update(await readFile(target)).digest("hex");
    if (file.sha256 !== actualDigest) {
      diagnostics.push(diagnostic("SHOWCASE_HASH_MISMATCH", location, `Showcase SHA-256 does not match ${normalizedPath}.`));
    }
  }

  const storyboardFiles = files.filter((file) => typeof file?.path === "string" && /storyboard/i.test(path.basename(file.path)));
  const primaryFiles = files.filter((file) => !storyboardFiles.includes(file));
  const primaryRoutes = new Set(primaryFiles.map((file) => file?.route).filter((route) => typeof route === "string"));
  if (storyboardFiles.length !== 1) {
    diagnostics.push(diagnostic("SHOWCASE_STORYBOARD", manifestLabel, "Showcase manifest must include exactly one storyboard WebP."));
  }
  if (routes.size !== 6
    || primaryFiles.length !== 6
    || primaryRoutes.size !== 6
    || (storyboardFiles.length === 1 && !primaryRoutes.has(storyboardFiles[0].route))) {
    diagnostics.push(diagnostic("SHOWCASE_ROUTE_COUNT", manifestLabel, "Showcase must evidence six unique primary routes, with the storyboard attached to one of them."));
  }

  const actualWebpPaths = new Set((await listFiles(showcaseRoot))
    .filter((file) => path.extname(file).toLowerCase() === ".webp")
    .map((file) => toPosix(path.relative(showcaseRoot, file))));
  const manifestMatchesFiles = actualWebpPaths.size === 7
    && safeManifestPaths.size === 7
    && [...actualWebpPaths].every((file) => safeManifestPaths.has(file));
  if (!manifestMatchesFiles) {
    diagnostics.push(diagnostic("SHOWCASE_FILE_SET", manifestLabel, "Manifest paths must exactly match the seven WebP files in docs/assets/showcase."));
  }
}

function mediaTypeFor(file) {
  const extension = path.extname(file).toLowerCase();
  return new Map([
    [".avif", "image/avif"],
    [".gif", "image/gif"],
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".mp4", "video/mp4"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
    [".webm", "video/webm"],
    [".webp", "image/webp"],
  ]).get(extension);
}

async function validateMediaProvenance(root, diagnostics) {
  const manifestFile = path.join(root, "docs", "assets", "media-provenance.json");
  const schemaFile = path.join(root, "docs", "assets", "media-provenance.schema.json");
  const allReleaseFiles = await releaseFiles(root);
  const publicMedia = allReleaseFiles
    .filter((file) => PUBLIC_MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => toPosix(path.relative(root, file)))
    .sort((left, right) => left.localeCompare(right, "en"));

  if (publicMedia.length === 0 && !(await exists(manifestFile))) return;
  if (!(await exists(schemaFile))) {
    diagnostics.push(diagnostic(
      "MEDIA_PROVENANCE_SCHEMA_MISSING",
      relativeFile(root, schemaFile),
      "Public media requires a versioned provenance schema.",
    ));
  }
  if (!(await exists(manifestFile))) {
    diagnostics.push(diagnostic(
      "MEDIA_PROVENANCE_MISSING",
      relativeFile(root, manifestFile),
      "Every public media file must be declared in the repository media-provenance manifest.",
    ));
    return;
  }

  const manifest = await readJsonIfValid(manifestFile);
  const manifestLabel = relativeFile(root, manifestFile);
  if (!manifest || manifest.schemaVersion !== 1 || manifest.policy !== "all-public-media-enumerated" || !Array.isArray(manifest.assets)) {
    diagnostics.push(diagnostic(
      "MEDIA_PROVENANCE_INVALID",
      manifestLabel,
      "Media provenance must use schemaVersion 1, policy all-public-media-enumerated, and an assets array.",
    ));
    return;
  }

  const declared = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    const location = `${manifestLabel}#/assets/${index}`;
    const normalized = typeof asset?.path === "string"
      ? asset.path.replaceAll("\\", "/").replace(/^\.\//, "")
      : "";
    const absolute = path.resolve(root, normalized);
    const safe = normalized.length > 0
      && normalized === toPosix(normalized)
      && !path.isAbsolute(normalized)
      && absolute !== root
      && isPathInside(root, absolute);
    if (!safe) {
      diagnostics.push(diagnostic("MEDIA_PATH_UNSAFE", location, "Media paths must be normalized repository-relative paths."));
      continue;
    }
    if (declared.has(normalized)) {
      diagnostics.push(diagnostic("MEDIA_PATH_DUPLICATE", location, `Duplicate media declaration: ${normalized}.`));
      continue;
    }
    declared.add(normalized);

    const expectedType = mediaTypeFor(normalized);
    const authoredOrigin = ["repository-authored", "render-of-repository-authored"].includes(asset.origin);
    const externallySourcedOrigin = [
      "compatibly-licensed-third-party",
      "explicitly-permitted-third-party",
      "public-domain",
    ].includes(asset.origin);
    const rightsBasisValid = authoredOrigin
      ? asset.thirdPartyMaterial === false
      : externallySourcedOrigin
        && asset.thirdPartyMaterial === true
        && isHttpsUrl(asset.sourceUrl)
        && isNonEmptyString(asset.rightsEvidence);
    const declarationValid = isSha256(asset.sha256)
      && asset.mediaType === expectedType
      && (authoredOrigin || externallySourcedOrigin)
      && isNonEmptyString(asset.author)
      && isNonEmptyString(asset.source)
      && isNonEmptyString(asset.license)
      && asset.redistribution === "allowed"
      && ["allowed", "not-allowed", "not-applicable"].includes(asset.modification)
      && rightsBasisValid
      && isIsoDate(asset.reviewedAt)
      && isNonEmptyString(asset.claimBoundary);
    if (!declarationValid) {
      diagnostics.push(diagnostic(
        "MEDIA_DECLARATION_INVALID",
        location,
        "Media declarations require exact type/hash, author/source/license, redistribution status, review date, claim boundary, and either authored provenance or a documented external source and rights basis.",
      ));
    }

    if (!(await exists(absolute))) {
      diagnostics.push(diagnostic("MEDIA_FILE_MISSING", location, `Declared media file does not exist: ${normalized}.`));
      continue;
    }
    if ((await stat(absolute)).isFile() && isSha256(asset.sha256)) {
      const actual = createHash("sha256").update(await readFile(absolute)).digest("hex");
      if (actual !== asset.sha256) {
        diagnostics.push(diagnostic("MEDIA_HASH_MISMATCH", normalized, "Media SHA-256 does not match the provenance manifest."));
      }
    }
  }

  const actualSet = new Set(publicMedia);
  for (const file of publicMedia) {
    if (!declared.has(file)) {
      diagnostics.push(diagnostic("MEDIA_UNDECLARED", file, "Public media is not declared in docs/assets/media-provenance.json."));
    }
  }
  for (const file of declared) {
    if (!actualSet.has(file)) {
      diagnostics.push(diagnostic("MEDIA_NOT_PUBLIC", manifestLabel, `Manifest declares a file outside the public release surface: ${file}.`));
    }
  }
}

function excludedReleaseFile(root, file) {
  const relative = toPosix(path.relative(root, file));
  return /^(?:showcase\/)?(?:node_modules|\.next|out|dist|build|coverage)(?:\/|$)/.test(relative)
    || /^(?:output|playwright-report|test-results|blob-report)(?:\/|$)/.test(relative);
}

async function releaseFiles(root) {
  const files = [];
  for (const directory of RELEASE_DIRECTORIES) files.push(...(await listFiles(path.join(root, directory))));
  for (const file of RELEASE_ROOT_FILES) {
    const target = path.join(root, file);
    if (await exists(target)) files.push(target);
  }
  return [...new Set(files.map((file) => path.resolve(file)))]
    .filter((file) => !excludedReleaseFile(root, file))
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function validateMarkdownLinks(root, files, diagnostics) {
  const markdownFiles = files.filter((file) => path.extname(file).toLowerCase() === ".md");
  for (const file of markdownFiles) {
    const source = await readFile(file, "utf8");
    for (const { target: rawTarget, line } of markdownTargets(source)) {
      const target = normalizeMarkdownTarget(rawTarget);
      if (!target) continue;
      const resolved = target.startsWith("/")
        ? path.resolve(root, target.slice(1))
        : path.resolve(path.dirname(file), target);
      if (!(await exists(resolved))) {
        diagnostics.push(diagnostic("MARKDOWN_LINK_MISSING", relativeFile(root, file), `Internal link does not resolve: ${target}.`, line));
      }
    }
  }
}

async function validateReleasePrivacy(root, files, diagnostics) {
  const environmentTerms = (process.env.PRIVATE_RELEASE_TERMS ?? "")
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
  const privateTerms = [...BUILT_IN_PRIVATE_TERMS, ...environmentTerms];
  const privateTermPatterns = privateTerms.map((term) => ({ term, pattern: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") }));
  const absoluteWindowsPath = /\b[A-Za-z]:[\\/](?:(?:Users|Documents and Settings|Desktop|Documents|OneDrive|workspace|projects|repos|src|tmp|temp)[\\/]|(?:[^\\/\s:'"`]+[\\/]){2})/i;
  const credentialPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\bAIza[0-9A-Za-z_-]{30,}\b/,
    /\bxox[baprs]-[0-9A-Za-z-]{16,}\b/,
    /\bsk-(?:proj|svcacct)-[0-9A-Za-z_-]{20,}\b/,
  ];
  const credentialAssignment = /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd)\b\s*[:=]\s*["']?([^\s"'`,;}]{12,})/i;
  const obviousPlaceholder = /(?:example|fake|placeholder|redacted|dummy|changeme|your[_-]|test[_-]|do-not-use)/i;

  for (const file of files) {
    const relative = relativeFile(root, file);
    const sensitivePathReason = trackedArtifactReason(relative);
    if (sensitivePathReason) {
      diagnostics.push(diagnostic(
        "PRIVATE_RELEASE_FILE",
        relative,
        `Release surface contains a forbidden ${sensitivePathReason}.`,
      ));
    }
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) && path.basename(file) !== "LICENSE") continue;
    const source = await readFile(file, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (absoluteWindowsPath.test(line)) {
        diagnostics.push(diagnostic("PRIVATE_ABSOLUTE_PATH", relativeFile(root, file), "Release surface contains an absolute Windows path.", index + 1));
      }
      for (const { term, pattern } of privateTermPatterns) {
        if (pattern.test(line)) {
          diagnostics.push(diagnostic("PRIVATE_TERM", relativeFile(root, file), `Release surface contains blocked private/internal term: ${term}.`, index + 1));
        }
      }
      const assignment = line.match(credentialAssignment);
      if (credentialPatterns.some((pattern) => pattern.test(line))
        || (assignment && !obviousPlaceholder.test(assignment[1]))) {
        diagnostics.push(diagnostic(
          "PRIVATE_CREDENTIAL_PATTERN",
          relative,
          "Release surface contains a credential-like value; remove it or replace it with an obvious non-secret placeholder.",
          index + 1,
        ));
      }
    });
  }
}

export async function validateRepository(inputRoot, options = {}) {
  const root = path.resolve(inputRoot);
  const diagnostics = [];
  const skill = await validateSkillMetadata(root, diagnostics);
  await validateSkillRouting(root, skill, diagnostics);
  await validateParameterDocumentation(root, skill, diagnostics);
  await validateEvalParity(root, diagnostics);
  await validateJsonAssets(root, diagnostics);
  await validateLicenseParity(root, diagnostics);
  await validateScannerRuntimeManifests(root, diagnostics);
  await validateWorkflowActionPins(root, diagnostics);
  diagnostics.push(...(await validateGitHubGovernance(root)));
  await validateTrackedArtifacts(root, diagnostics, options.trackedFiles);
  await validateDesignIntelligence(root, diagnostics);
  await validateAgentMetadata(root, diagnostics);
  await validateBenchmarkIntegration(root, diagnostics);
  await validateShowcaseEvidence(root, diagnostics);
  await validateMediaProvenance(root, diagnostics);
  const files = await releaseFiles(root);
  await validateMarkdownLinks(root, files, diagnostics);
  await validateReleasePrivacy(root, files, diagnostics);
  diagnostics.sort((left, right) =>
    left.file.localeCompare(right.file, "en")
      || (left.line ?? 0) - (right.line ?? 0)
      || left.code.localeCompare(right.code, "en")
      || left.message.localeCompare(right.message, "en"));
  return { root, diagnostics, ok: diagnostics.length === 0 };
}

function parseArguments(argv) {
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--json") json = true;
    else if (argv[index] === "--root") {
      if (!argv[index + 1]) throw new Error("--root requires a path");
      root = path.resolve(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return { root, json };
}

async function main() {
  const { root, json } = parseArguments(process.argv.slice(2));
  const result = await validateRepository(root);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.ok) {
    process.stdout.write("Repository validation passed.\n");
  } else {
    for (const item of result.diagnostics) {
      const location = item.line ? `${item.file}:${item.line}` : item.file;
      process.stderr.write(`ERROR ${item.code} ${location} - ${item.message}\n`);
    }
    process.stderr.write(`Repository validation failed with ${result.diagnostics.length} error(s).\n`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Repository validation crashed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
