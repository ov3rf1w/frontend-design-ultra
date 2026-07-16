import { access, readFile } from "node:fs/promises";
import path from "node:path";

const DOWNLOAD_ARTIFACT_V5_SHA = "634f93cb2916e3fdff6788551b99b062d0335ce0";
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/i;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function diagnostic(code, file, message) {
  return { code, file, message };
}

function indentation(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function mappingAt(lines, key, indent) {
  const start = lines.findIndex((line) => indentation(line) === indent && line.trim() === `${key}:`);
  if (start === -1) return null;
  const entries = new Map();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const currentIndent = indentation(line);
    if (currentIndent <= indent) break;
    if (currentIndent !== indent + 2) continue;
    const match = line.trim().match(/^([A-Za-z0-9_-]+):\s*([^#]+?)\s*$/);
    if (match) entries.set(match[1], match[2].replace(/^["']|["']$/g, ""));
  }
  return entries;
}

function jobBlock(lines, name) {
  const start = lines.findIndex((line) => indentation(line) === 2 && line.trim() === `${name}:`);
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && indentation(lines[index]) === 2 && /^[A-Za-z0-9_-]+:/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end);
}

function exactPermissions(actual, expected) {
  if (!actual || actual.size !== Object.keys(expected).length) return false;
  return Object.entries(expected).every(([name, value]) => actual.get(name) === value);
}

function actionReferences(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)["']?/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function validateReleaseWorkflow(source, diagnostics) {
  const file = ".github/workflows/release.yml";
  const lines = source.split(/\r?\n/);
  const topPermissions = mappingAt(lines, "permissions", 0);
  const build = jobBlock(lines, "build");
  const publish = jobBlock(lines, "publish");

  if (!exactPermissions(topPermissions, { contents: "read" })) {
    diagnostics.push(diagnostic(
      "RELEASE_PERMISSION_BOUNDARY",
      file,
      "Release workflow top-level permissions must be exactly contents: read.",
    ));
  }
  if (!build || !publish) {
    diagnostics.push(diagnostic(
      "RELEASE_JOB_SEPARATION",
      file,
      "Release workflow must have separate build and publish jobs.",
    ));
    return;
  }

  const buildSource = build.join("\n");
  const publishSource = publish.join("\n");
  if (!exactPermissions(mappingAt(build, "permissions", 4), { contents: "read" })) {
    diagnostics.push(diagnostic(
      "RELEASE_BUILD_PERMISSIONS",
      file,
      "The build job must explicitly have only contents: read.",
    ));
  }
  if (!exactPermissions(mappingAt(publish, "permissions", 4), {
    contents: "write",
    "id-token": "write",
    attestations: "write",
  })) {
    diagnostics.push(diagnostic(
      "RELEASE_PUBLISH_PERMISSIONS",
      file,
      "The publish job permissions must be exactly contents: write, id-token: write, and attestations: write.",
    ));
  }
  if (!/^\s{4}needs:\s*build\s*$/m.test(publishSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_PUBLISH_DEPENDENCY",
      file,
      "The publish job must depend on the successful build job.",
    ));
  }

  const downloadReference = `actions/download-artifact@${DOWNLOAD_ARTIFACT_V5_SHA}`;
  if (!publishSource.includes(downloadReference)) {
    diagnostics.push(diagnostic(
      "RELEASE_DOWNLOAD_PIN",
      file,
      `The publish job must use actions/download-artifact v5.0.0 at ${DOWNLOAD_ARTIFACT_V5_SHA}.`,
    ));
  }
  if (!/actions\/upload-artifact@[a-f0-9]{40}/i.test(buildSource)
    || /actions\/upload-artifact@/i.test(publishSource)
    || /actions\/download-artifact@/i.test(buildSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_ARTIFACT_HANDOFF",
      file,
      "The build job must upload once and the publish job must download; artifact transfer may not be reversed.",
    ));
  }
  const publishActions = actionReferences(publishSource);
  if (publishActions.length !== 2
    || publishActions[0] !== downloadReference
    || !/^actions\/attest-build-provenance@[a-f0-9]{40}$/i.test(publishActions[1])
    || /actions\/checkout@|\b(?:npm|npx)\b|\bnode\s+(?:scripts\/|\.)/.test(publishSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_PUBLISH_SURFACE",
      file,
      "The privileged publish job may only download, reverify, attest, and create the draft release; it must not check out or execute repository code.",
    ));
  }
  if (/actions\/attest-build-provenance@|gh release create/.test(buildSource)
    || !/actions\/attest-build-provenance@[a-f0-9]{40}/i.test(publishSource)
    || !/gh release create/.test(publishSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_PRIVILEGED_STEPS",
      file,
      "Attestation and GitHub release creation must exist only in the publish job.",
    ));
  }

  const requiredBuildChecks = [
    /npm run lint/,
    /npm test/,
    /npm run build/,
    /--verify-only --require-committed-source/,
    /sha256sum --check SHA256SUMS/,
    /tar --extract --gzip/,
  ];
  if (requiredBuildChecks.some((pattern) => !pattern.test(buildSource))) {
    diagnostics.push(diagnostic(
      "RELEASE_BUILD_VALIDATION",
      file,
      "The read-only build job must preserve lint, test, build, committed-source, checksum, and independent extraction checks.",
    ));
  }
  if (!/sha256sum --check SHA256SUMS/.test(publishSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_PUBLISH_CHECKSUM",
      file,
      "The publish job must reverify SHA256SUMS after downloading the workflow artifact.",
    ));
  }
  if (!/--draft\b/.test(publishSource)
    || !/--verify-tag\b/.test(publishSource)
    || !/release_flags\+=\(--prerelease\)/.test(publishSource)
    || !/\^v\[0-9\]\+/.test(publishSource)) {
    diagnostics.push(diagnostic(
      "RELEASE_DRAFT_PRERELEASE",
      file,
      "The publish job must create a verified draft and mark SemVer prerelease tags as GitHub prereleases.",
    ));
  }
}

function validateDcoWorkflow(source, diagnostics) {
  const file = ".github/workflows/dco.yml";
  const lines = source.split(/\r?\n/);
  const dco = jobBlock(lines, "dco");
  if (!/^\s*pull_request:\s*$/m.test(source) || /pull_request_target\s*:/.test(source)) {
    diagnostics.push(diagnostic(
      "DCO_EVENT_BOUNDARY",
      file,
      "DCO must run on pull_request and must never use pull_request_target.",
    ));
  }
  if (!exactPermissions(mappingAt(lines, "permissions", 0), { contents: "read" })
    || !dco
    || !exactPermissions(mappingAt(dco, "permissions", 4), { contents: "read" })) {
    diagnostics.push(diagnostic(
      "DCO_PERMISSIONS",
      file,
      "DCO workflow and job permissions must be exactly contents: read.",
    ));
  }

  const references = actionReferences(source);
  if (references.length !== 1
    || !references[0].startsWith("actions/checkout@")
    || !FULL_SHA_PATTERN.test(references[0].split("@")[1] ?? "")) {
    diagnostics.push(diagnostic(
      "DCO_ACTION_SURFACE",
      file,
      "DCO may use only GitHub-owned actions/checkout pinned to a full commit SHA.",
    ));
  }
  if (!/fetch-depth:\s*0/.test(source)
    || !/persist-credentials:\s*false/.test(source)
    || !/ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/.test(source)) {
    diagnostics.push(diagnostic(
      "DCO_CHECKOUT_SEMANTICS",
      file,
      "DCO checkout must fetch full history, disable persisted credentials, and check out the exact PR head SHA.",
    ));
  }
  if (!/scripts\/check-dco\.mjs/.test(source)
    || !/github\.event\.pull_request\.base\.sha/.test(source)
    || !/github\.event\.pull_request\.head\.sha/.test(source)
    || !/git show "\$BASE_SHA:scripts\/check-dco\.mjs" > "\$trusted_checker"/.test(source)
    || !/node "\$trusted_checker"/.test(source)
    || /continue-on-error:\s*true/.test(source)) {
    diagnostics.push(diagnostic(
      "DCO_RANGE_CHECK",
      file,
      "DCO must load the checker from the trusted base commit, pass immutable base/head SHAs, and have no continue-on-error escape.",
    ));
  }
}

export async function validateGitHubGovernance(inputRoot) {
  const root = path.resolve(inputRoot);
  const releaseFile = path.join(root, ".github", "workflows", "release.yml");
  const dcoFile = path.join(root, ".github", "workflows", "dco.yml");
  const releaseExists = await exists(releaseFile);
  const dcoExists = await exists(dcoFile);
  if (!releaseExists && !dcoExists) return [];

  const diagnostics = [];
  if (!releaseExists) {
    diagnostics.push(diagnostic("RELEASE_WORKFLOW_MISSING", ".github/workflows/release.yml", "Governed repositories require the release workflow."));
  } else {
    validateReleaseWorkflow(await readFile(releaseFile, "utf8"), diagnostics);
  }
  if (!dcoExists) {
    diagnostics.push(diagnostic("DCO_WORKFLOW_MISSING", ".github/workflows/dco.yml", "Governed repositories require the DCO workflow."));
  } else {
    validateDcoWorkflow(await readFile(dcoFile, "utf8"), diagnostics);
  }
  return diagnostics;
}
