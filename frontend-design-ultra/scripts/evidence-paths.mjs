import os from "node:os";
import path from "node:path";
import process from "node:process";

const SYNC_SEGMENT_PATTERNS = [
  /^onedrive(?:\s*-\s*.+)?$/i,
  /^dropbox(?:\s*\(.+\))?$/i,
  /^google drive$/i,
  /^icloud drive$/i,
  /^box$/i,
];

function normalizedAbsolute(value) {
  return path.resolve(String(value));
}

function isPathInside(root, candidate) {
  const relative = path.relative(normalizedAbsolute(root), normalizedAbsolute(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function configuredSyncRoots(env) {
  return [
    env.OneDrive,
    env.OneDriveCommercial,
    env.OneDriveConsumer,
    env.Dropbox,
    env.GOOGLE_DRIVE,
    env.ICLOUD_DRIVE,
    env.BOX_SYNC,
  ].filter(Boolean);
}

export function isKnownSyncedPath(candidate, { env = process.env } = {}) {
  const resolved = normalizedAbsolute(candidate);
  if (configuredSyncRoots(env).some((root) => isPathInside(root, resolved))) return true;
  return resolved
    .split(path.sep)
    .filter(Boolean)
    .some((segment) => SYNC_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)));
}

export function getDefaultPrivateEvidenceRoot({
  platform = process.platform,
  env = process.env,
  home = os.homedir(),
  temp = os.tmpdir(),
} = {}) {
  if (env.FDU_EVIDENCE_ROOT) return normalizedAbsolute(env.FDU_EVIDENCE_ROOT);
  let cacheRoot;
  if (platform === "win32") cacheRoot = env.LOCALAPPDATA || temp;
  else if (platform === "darwin") cacheRoot = path.join(home, "Library", "Caches");
  else cacheRoot = env.XDG_CACHE_HOME || path.join(home, ".cache");
  return path.join(normalizedAbsolute(cacheRoot), "frontend-design-ultra", "playwright", "reference-scans");
}

export function assertNonSyncedEvidencePath(candidate, options = {}) {
  const resolved = normalizedAbsolute(candidate);
  if (isKnownSyncedPath(resolved, options)) {
    throw new Error(
      "Raw third-party evidence cannot be written to a known cloud-synchronized path. "
      + "Choose a private local cache with --output or FDU_EVIDENCE_ROOT.",
    );
  }
  return resolved;
}
