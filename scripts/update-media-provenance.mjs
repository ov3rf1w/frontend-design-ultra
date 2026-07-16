#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_FILE = path.join(ROOT, "docs", "assets", "media-provenance.json");
const SHOWCASE_MANIFEST_FILE = path.join(ROOT, "docs", "assets", "showcase", "manifest.json");
const INITIAL_REVIEW_DATE = "2026-07-16";
const MEDIA_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".mp4", ".png", ".svg", ".webm", ".webp"]);
const SKIPPED_DIRECTORIES = new Set([".git", ".next", "build", "coverage", "dist", "node_modules", "out"]);

const MIME_BY_EXTENSION = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function listMedia(directory) {
  if (!(await exists(directory))) return [];
  const media = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) media.push(...await listMedia(absolute));
    else if (entry.isFile() && MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) media.push(absolute);
  }
  return media;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function staticDeclaration(relativePath) {
  if (relativePath === "docs/assets/readme-hero.svg") {
    return {
      origin: "repository-authored",
      source: "Original vector artwork authored for the Frontend Design Ultra repository README.",
      claimBoundary: "Repository identity artwork only; it is not an award mark, certification, customer logo, or benchmark result.",
    };
  }
  if (relativePath === "showcase/app/icon.svg") {
    return {
      origin: "repository-authored",
      source: "Original vector application icon authored for the local multi-industry showcase.",
      claimBoundary: "Calibration-showcase icon only; it does not represent a registered commercial brand or third-party endorsement.",
    };
  }
  return null;
}

export async function updateMediaProvenance(root = ROOT) {
  const showcaseManifestFile = path.join(root, path.relative(ROOT, SHOWCASE_MANIFEST_FILE));
  const showcaseManifest = JSON.parse(await readFile(showcaseManifestFile, "utf8"));
  const showcaseRecords = new Map((showcaseManifest.files ?? []).map((record) => [
    `docs/assets/showcase/${record.path}`,
    record,
  ]));
  const files = [
    ...await listMedia(path.join(root, "docs")),
    ...await listMedia(path.join(root, "showcase")),
  ];
  const uniqueFiles = [...new Set(files.map((file) => path.resolve(file)))]
    .sort((left, right) => left.localeCompare(right, "en"));
  const assets = [];

  for (const file of uniqueFiles) {
    const relativePath = toPosix(path.relative(root, file));
    const staticRecord = staticDeclaration(relativePath);
    const showcaseRecord = showcaseRecords.get(relativePath);
    if (!staticRecord && !showcaseRecord) {
      throw new Error(`Public media lacks an explicit provenance classification: ${relativePath}`);
    }
    const declaration = staticRecord ?? {
      origin: "render-of-repository-authored",
      source: `Playwright render of original showcase route ${showcaseRecord.route}; generated from repository-authored code, SVG/CSS visuals, and fictional calibration facts.`,
      claimBoundary: "Curated calibration-showcase render only; not a blind benchmark result, customer outcome, award score, accessibility certificate, or trademark-clearance opinion.",
    };
    assets.push({
      path: relativePath,
      sha256: await sha256(file),
      mediaType: MIME_BY_EXTENSION.get(path.extname(file).toLowerCase()),
      origin: declaration.origin,
      author: "Frontend Design Ultra maintainers",
      source: declaration.source,
      license: "MIT",
      redistribution: "allowed",
      modification: "allowed",
      thirdPartyMaterial: false,
      reviewedAt: showcaseRecord ? showcaseManifest.capturedAt : INITIAL_REVIEW_DATE,
      claimBoundary: declaration.claimBoundary,
    });
  }

  const expectedShowcasePaths = new Set(showcaseRecords.keys());
  const capturedShowcasePaths = new Set(assets
    .filter(({ path: assetPath }) => assetPath.startsWith("docs/assets/showcase/"))
    .map(({ path: assetPath }) => assetPath));
  if (expectedShowcasePaths.size !== capturedShowcasePaths.size
    || [...expectedShowcasePaths].some((assetPath) => !capturedShowcasePaths.has(assetPath))) {
    throw new Error("Showcase media manifest and public media file set do not match.");
  }

  const manifest = {
    $schema: "./media-provenance.schema.json",
    schemaVersion: 1,
    policy: "all-public-media-enumerated",
    updatedAt: showcaseManifest.capturedAt,
    scope: "Every public raster image, vector image, animation, or video in the documented release surface.",
    legalBoundary: "This is a maintainer provenance declaration, not a legal opinion or trademark-clearance report. Dependencies, platforms, and referenced third parties retain their own rights.",
    assets,
  };
  const manifestFile = path.join(root, path.relative(ROOT, MANIFEST_FILE));
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  updateMediaProvenance().then((manifest) => {
    process.stdout.write(`Updated public media provenance for ${manifest.assets.length} assets.\n`);
  }).catch((error) => {
    process.stderr.write(`Media provenance update failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
