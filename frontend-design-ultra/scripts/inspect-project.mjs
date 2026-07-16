#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAX_TEXT_BYTES = 512_000;
const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".output",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function relativePath(root, file) {
  return normalizePath(relative(root, file)) || ".";
}

function resolveInsideRoot(root, candidate) {
  if (typeof candidate !== "string" || !candidate || /^([A-Za-z]:[\\/]|[\\/]{1,2})/.test(candidate)) return null;
  const target = resolve(root, candidate);
  const relativeTarget = relative(root, target);
  const staysInside = relativeTarget === "" || (!relativeTarget.startsWith("..") && !/^([A-Za-z]:[\\/]|[\\/]{1,2})/.test(relativeTarget));
  if (!staysInside) return null;
  if (existsSync(target)) {
    try {
      const realRoot = realpathSync(root);
      const realTarget = realpathSync(target);
      const realRelative = relative(realRoot, realTarget);
      if (realRelative === ".." || realRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || /^([A-Za-z]:[\\/]|[\\/]{1,2})/.test(realRelative)) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return target;
}

function existingFileInsideRoot(root, candidate) {
  const target = resolveInsideRoot(root, candidate);
  if (!target || !existsSync(target)) return null;
  try {
    return statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    const stats = statSync(file);
    if (!stats.isFile() || stats.size > MAX_TEXT_BYTES) return "";
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function readJson(file) {
  const text = readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripJavaScriptComments(source) {
  let output = "";
  let mode = "code";
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (mode === "line-comment") {
      if (character === "\n") {
        output += character;
        mode = "code";
      }
      continue;
    }
    if (mode === "block-comment") {
      if (character === "*" && next === "/") {
        mode = "code";
        index += 1;
      } else if (character === "\n") {
        output += character;
      }
      continue;
    }
    if (mode === "string") {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        mode = "code";
        quote = "";
      }
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      mode = "string";
      quote = character;
      output += character;
    } else if (character === "/" && next === "/") {
      mode = "line-comment";
      index += 1;
    } else if (character === "/" && next === "*") {
      mode = "block-comment";
      index += 1;
    } else {
      output += character;
    }
  }

  return output;
}

function extractBalancedObject(source, openingBraceIndex) {
  if (openingBraceIndex < 0 || source[openingBraceIndex] !== "{") return null;
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBraceIndex, index + 1);
    }
  }
  return null;
}

function maskJavaScriptStrings(source) {
  let output = "";
  let quote = "";
  let escaped = false;
  for (const character of source) {
    if (quote) {
      output += character === "\n" ? "\n" : " ";
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
    } else if (character === "'" || character === '"' || character === "`") {
      quote = character;
      output += " ";
    } else {
      output += character;
    }
  }
  return output;
}

function exportedConfigObject(source) {
  const cleanSource = stripJavaScriptComments(source);
  const searchSource = maskJavaScriptStrings(cleanSource);
  for (const pattern of [/export\s+default\s*{/g, /module\.exports\s*=\s*{/g]) {
    const match = pattern.exec(searchSource);
    if (match) return extractBalancedObject(cleanSource, match.index + match[0].lastIndexOf("{"));
  }

  const namedExport = searchSource.match(/(?:export\s+default|module\.exports\s*=)\s*([A-Za-z_$][\w$]*)\s*;?/);
  if (!namedExport) return null;
  const name = namedExport[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declaration = searchSource.match(new RegExp(`(?:const|let|var)\\s+${name}(?:\\s*:[^=;]+)?\\s*=\\s*{`));
  if (!declaration) return null;
  return extractBalancedObject(cleanSource, declaration.index + declaration[0].lastIndexOf("{"));
}

function hasConfiguredStaticExport(source) {
  const objectSource = exportedConfigObject(source);
  if (!objectSource) return false;
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < objectSource.length; index += 1) {
    const character = objectSource[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      if (depth === 1 && /^(?:["']output["'])\s*:\s*["']export["']/.test(objectSource.slice(index))) return true;
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      continue;
    }
    if (depth === 1 && /^output\s*:\s*["']export["']/.test(objectSource.slice(index))) return true;
  }
  return false;
}

function configuredPackageScripts(manifest) {
  if (!manifest?.scripts || typeof manifest.scripts !== "object" || Array.isArray(manifest.scripts)) return {};
  return Object.fromEntries(
    Object.entries(manifest.scripts)
      .filter(([, command]) => typeof command === "string" && command.trim())
      .map(([name, command]) => [name, command.trim()]),
  );
}

function invalidPackageScriptNames(manifest) {
  if (!manifest?.scripts || typeof manifest.scripts !== "object" || Array.isArray(manifest.scripts)) return [];
  return Object.entries(manifest.scripts)
    .filter(([, command]) => typeof command !== "string" || !command.trim())
    .map(([name]) => name);
}

function isPortableRelativePath(candidate) {
  if (typeof candidate !== "string" || !candidate || /^([A-Za-z]:[\\/]|[\\/]{1,2})/.test(candidate)) return false;
  return !normalizePath(candidate).split("/").includes("..");
}

function firstExistingFile(root, candidates) {
  for (const candidate of candidates) {
    const file = existingFileInsideRoot(root, candidate);
    if (file) return file;
  }
  return null;
}

function firstExistingDirectory(root, candidates) {
  for (const candidate of candidates) {
    const directory = resolveInsideRoot(root, candidate);
    if (!directory || !existsSync(directory)) continue;
    try {
      if (statSync(directory).isDirectory()) return directory;
    } catch {
      // Ignore unreadable candidates and continue to the next conventional path.
    }
  }
  return null;
}

function walkFiles(root, options = {}) {
  const {
    directories = ["."],
    extensions = null,
    maxDepth = 3,
    maxFiles = 300,
  } = options;
  const results = [];

  function visit(directory, depth) {
    if (results.length >= maxFiles || depth > maxDepth || !existsSync(directory)) return;
    let entries = [];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(file, depth + 1);
      } else if (!extensions || extensions.has(extname(entry.name).toLowerCase())) {
        results.push(file);
      }
    }
  }

  for (const directory of directories) {
    visit(resolve(root, directory), 0);
  }
  return [...new Set(results)];
}

function dependencyVersion(manifest, packageName) {
  if (!manifest) return null;
  for (const group of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const version = manifest[group]?.[packageName];
    if (typeof version === "string") return version;
  }
  return null;
}

function dependencyState(root, manifest, packageName) {
  const configuredVersion = dependencyVersion(manifest, packageName);
  if (!configuredVersion) return null;
  const installedFile = existingFileInsideRoot(root, join("node_modules", packageName, "package.json"));
  const installedManifest = installedFile ? readJson(installedFile) : null;
  return {
    source: installedManifest?.version ? "installed" : "configured",
    version: installedManifest?.version ?? configuredVersion,
    configuredVersion,
    installedVersion: installedManifest?.version ?? null,
    evidence: installedManifest?.version
      ? ["package.json", relativePath(root, installedFile)]
      : ["package.json"],
  };
}

function declaredDependencyVersion(text, packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`["']${escaped}["']\\s*:\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function declaredPackageScripts(text) {
  const scriptNames = ["dev", "lint", "typecheck", "build", "start", "preview", "test", "test:e2e", "seo:verify"];
  const scripts = {};
  for (const name of scriptNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`["']${escaped}["']\\s*:\\s*["']([^"']+)["']`, "i"));
    if (match) scripts[name] = match[1];
  }
  return scripts;
}

function signal(value, source, evidence, version = null, details = {}) {
  return {
    value,
    source,
    ...(version ? { version } : {}),
    ...details,
    evidence: [...new Set(evidence)],
  };
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function matchingDocumentationEvidence(entries, patterns, maxFiles = 12) {
  return entries
    .filter(({ text }) => hasAny(text, patterns))
    .slice(0, maxFiles)
    .map(({ file }) => file);
}

function detectPackageManager(root) {
  const locks = [
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lockb"],
    ["bun", "bun.lock"],
    ["npm", "package-lock.json"],
  ];
  const match = locks.find(([, file]) => existingFileInsideRoot(root, file));
  return match ? signal(match[0], "configured", [match[1]]) : null;
}

function detectFramework(root, manifest, documentationCorpus, documentationEntries) {
  const packages = [
    ["next", "Next.js"],
    ["astro", "Astro"],
    ["nuxt", "Nuxt"],
    ["@sveltejs/kit", "SvelteKit"],
    ["@remix-run/react", "Remix"],
    ["vite", "Vite"],
  ];
  for (const [packageName, label] of packages) {
    const state = dependencyState(root, manifest, packageName);
    if (state) return signal(
      label,
      state.source,
      state.evidence,
      state.version,
      state.installedVersion ? { manifestRange: state.configuredVersion } : {},
    );
  }

  if (/next\.js/i.test(documentationCorpus)) {
    return signal(
      "Next.js",
      "declared",
      matchingDocumentationEvidence(documentationEntries, [/next\.js/i, /["']next["']\s*:/i]),
      declaredDependencyVersion(documentationCorpus, "next"),
    );
  }
  if (/\bastro\b/i.test(documentationCorpus)) {
    return signal(
      "Astro",
      "declared",
      matchingDocumentationEvidence(documentationEntries, [/\bastro\b/i]),
      declaredDependencyVersion(documentationCorpus, "astro"),
    );
  }
  return null;
}

function detectMotion(root, manifest, documentationCorpus, documentationEntries) {
  const packages = [
    ["gsap", "GSAP"],
    ["motion", "Motion"],
    ["framer-motion", "Framer Motion"],
    ["lenis", "Lenis"],
    ["three", "Three.js"],
    ["@react-three/fiber", "React Three Fiber"],
  ];
  const detected = [];
  for (const [packageName, label] of packages) {
    const state = dependencyState(root, manifest, packageName);
    if (state) detected.push(signal(
      label,
      state.source,
      state.evidence,
      state.version,
      state.installedVersion ? { manifestRange: state.configuredVersion } : {},
    ));
  }
  if (detected.length) return detected;

  const declared = [
    [/\bgsap\b/i, "GSAP", "gsap", null],
    [/\bscrolltrigger\b/i, "ScrollTrigger", null, null],
    [/\blenis\b/i, "Lenis", "lenis", /(?:lenis.{0,100}(?:only when|when justified|optional|opt-in)|(?:optional|opt-in).{0,100}lenis)/is],
    [/\bframer(?:\s+motion)?\b/i, "Framer Motion", "framer-motion", null],
    [/\bthree\.js\b|\bwebgl\b/i, "Three.js/WebGL", "three", /(?:(?:not (?:a )?default|use (?:these )?only|use rarely).{0,180}(?:three\.js|webgl)|(?:three\.js|webgl).{0,180}(?:not (?:a )?default|use (?:these )?only|use rarely))/is],
  ];
  return declared
    .filter(([pattern]) => pattern.test(documentationCorpus))
    .map(([pattern, label, packageName, optionalPattern]) => {
      const matchingEntries = documentationEntries.filter(({ text }) => pattern.test(text));
      const optional = Boolean(optionalPattern && matchingEntries.some(({ text }) => optionalPattern.test(text)));
      return signal(
        label,
        "declared",
        matchingEntries.slice(0, 12).map(({ file }) => file),
        packageName ? declaredDependencyVersion(documentationCorpus, packageName) : null,
        optional ? { optional: true } : {},
      );
    });
}

function readProjectFitContract(root) {
  const file = firstExistingFile(root, [
    ".frontend-design-ultra/project-fit.json",
    "frontend-design-ultra.project.json",
  ]);
  if (!file) return null;

  const value = readJson(file);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      file: relativePath(root, file),
      valid: false,
      issues: ["Contract is not valid JSON object data."],
    };
  }

  const issues = [];
  const allowedKeys = new Set([
    "$schema",
    "artifactMap",
    "contractVersion",
    "evidencePolicy",
    "expectedScripts",
    "preserve",
    "profile",
    "projectKind",
    "skillCompatibility",
    "starterVersion",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) issues.push(`Unsupported contract field: ${key}.`);
  }
  if (value.$schema !== undefined && (typeof value.$schema !== "string" || !value.$schema)) {
    issues.push("$schema must be a non-empty string when provided.");
  }
  if (value.contractVersion !== 1) issues.push("contractVersion must equal 1.");
  if (!["codebase", "context-starter", "scaffold-fragment"].includes(value.projectKind)) {
    issues.push("projectKind is missing or unsupported.");
  }
  if (typeof value.profile !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.profile)) {
    issues.push("profile must be a lowercase hyphenated identifier.");
  }
  if (typeof value.skillCompatibility !== "string" || !value.skillCompatibility.trim()) {
    issues.push("skillCompatibility is required.");
  }
  if (value.starterVersion !== undefined && (typeof value.starterVersion !== "string" || !value.starterVersion)) {
    issues.push("starterVersion must be a non-empty string when provided.");
  }
  if (value.artifactMap !== undefined && (!value.artifactMap || typeof value.artifactMap !== "object" || Array.isArray(value.artifactMap))) {
    issues.push("artifactMap must be an object of artifact names to relative paths.");
  } else if (value.artifactMap) {
    for (const [name, mappedPath] of Object.entries(value.artifactMap)) {
      if (!name || !isPortableRelativePath(mappedPath) || !resolveInsideRoot(root, mappedPath)) {
        issues.push(`artifactMap entry ${name || "<empty>"} must point to a relative path inside the project root.`);
      }
    }
  }
  if (value.expectedScripts !== undefined && (!Array.isArray(value.expectedScripts) || value.expectedScripts.some((name) => typeof name !== "string" || !name))) {
    issues.push("expectedScripts must be an array of non-empty script names.");
  } else if (value.expectedScripts && new Set(value.expectedScripts).size !== value.expectedScripts.length) {
    issues.push("expectedScripts must not contain duplicates.");
  }
  if (value.preserve !== undefined && (!Array.isArray(value.preserve) || value.preserve.some((item) => typeof item !== "string" || !item))) {
    issues.push("preserve must be an array of non-empty strings.");
  } else if (value.preserve && new Set(value.preserve).size !== value.preserve.length) {
    issues.push("preserve must not contain duplicates.");
  }
  if (value.evidencePolicy !== undefined) {
    const validPolicy = value.evidencePolicy
      && typeof value.evidencePolicy === "object"
      && !Array.isArray(value.evidencePolicy)
      && Object.keys(value.evidencePolicy).every((key) => key === "screenshots")
      && (value.evidencePolicy.screenshots === undefined
        || ["inherit", "ask", "allowed", "forbidden"].includes(value.evidencePolicy.screenshots));
    if (!validPolicy) issues.push("evidencePolicy supports only screenshots: inherit, ask, allowed, or forbidden.");
  }

  return {
    file: relativePath(root, file),
    valid: issues.length === 0,
    issues,
    contractVersion: value.contractVersion,
    projectKind: value.projectKind,
    profile: value.profile,
    starterVersion: value.starterVersion,
    skillCompatibility: value.skillCompatibility,
    artifactMap: value.artifactMap ?? {},
    expectedScripts: value.expectedScripts ?? [],
    preserve: value.preserve ?? [],
    evidencePolicy: value.evidencePolicy ?? {},
  };
}

function readStackProfile(profileId) {
  if (typeof profileId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profileId)) return null;
  const file = existingFileInsideRoot(SKILL_ROOT, join("assets", "stack-profiles", `${profileId}.json`));
  if (!file) {
    return {
      file: `assets/stack-profiles/${profileId}.json`,
      valid: false,
      issues: ["Capability profile asset does not exist."],
    };
  }
  const value = readJson(file);
  const issues = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push("Capability profile is not valid JSON object data.");
  } else {
    if (value.profileVersion !== 1) issues.push("profileVersion must equal 1.");
    if (value.id !== profileId) issues.push("Profile id does not match its file name.");
    if (!value.detection || typeof value.detection !== "object") issues.push("Profile detection contract is missing.");
    if (!Array.isArray(value.expectedScripts) || value.expectedScripts.some((name) => typeof name !== "string" || !name)) {
      issues.push("Profile expectedScripts must be an array of non-empty script names.");
    }
    for (const field of ["requiredMachineCapabilities", "rejectedMachineDefaults", "manualReviewCapabilities", "manualRiskChecks"]) {
      if (!Array.isArray(value[field]) || value[field].some((name) => typeof name !== "string" || !name)) {
        issues.push(`Profile ${field} must be an array of non-empty names.`);
      } else if (new Set(value[field]).size !== value[field].length) {
        issues.push(`Profile ${field} must not contain duplicates.`);
      }
    }
  }
  return {
    file: relativePath(SKILL_ROOT, file),
    valid: issues.length === 0,
    issues,
    profileVersion: value?.profileVersion,
    id: value?.id,
    detection: value?.detection ?? {},
    expectedScripts: value?.expectedScripts ?? [],
    requiredMachineCapabilities: value?.requiredMachineCapabilities ?? [],
    rejectedMachineDefaults: value?.rejectedMachineDefaults ?? [],
    manualReviewCapabilities: value?.manualReviewCapabilities ?? [],
    manualRiskChecks: value?.manualRiskChecks ?? [],
  };
}

function artifactAppearsFilled(file) {
  const source = readText(file);
  if (!source) return false;
  const meaningful = source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:#|---\s*$)/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (meaningful.length < 40) return false;
  return !/\b(?:TODO|TBD|fill (?:this|in)|replace me|lorem ipsum)\b/i.test(meaningful);
}

function contractStatus(root, projectKind, projectContract) {
  const definitions = [
    ["brief", ["docs/brief.md", "PRODUCT.md"], ["PROJECT_BRIEF.md"]],
    ["research", ["docs/research.md"], ["RESEARCH_TEMPLATE.md", "RESEARCH_PROTOCOL.md"]],
    ["designContract", ["docs/design-contract.md", "DESIGN.md"], ["DESIGN_CONTRACT_TEMPLATE.md"]],
    ["pageSpec", ["docs/page-spec.md"], ["PAGE_SPEC_TEMPLATE.md"]],
    ["assetBudget", ["docs/asset-budget.md"], []],
    ["seo", ["docs/seo.md"], ["SEO_SETUP.md"]],
    ["qualityGates", ["docs/quality-gates.md"], ["QUALITY_GATES.md", "AWWWARDS_QUALITY_BAR.md"]],
  ];

  const present = [];
  const templates = [];
  const missing = [];
  for (const [name, projectFiles, templateFiles] of definitions) {
    const mappedPath = projectContract?.valid && typeof projectContract.artifactMap[name] === "string"
      ? projectContract.artifactMap[name]
      : null;
    const mappedFile = mappedPath ? existingFileInsideRoot(root, mappedPath) : null;
    const projectFile = projectKind === "codebase" && mappedFile ? mappedFile : firstExistingFile(root, projectFiles);
    const templateFile = projectKind !== "codebase" && mappedFile ? mappedFile : firstExistingFile(root, templateFiles);
    if (projectFile) {
      present.push({ name, file: relativePath(root, projectFile), filled: artifactAppearsFilled(projectFile) });
    } else if (templateFile) {
      templates.push({ name, file: relativePath(root, templateFile) });
      if (projectKind === "codebase") missing.push(name);
    } else {
      missing.push(name);
    }
  }
  return { present, templates, missing };
}

export function inspectProject(projectRoot = ".") {
  const root = resolve(projectRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return {
      schemaVersion: 1,
      project: { name: basename(root), kind: "missing", fit: "insufficient" },
      context: { files: [], documentationFiles: 0, templateFiles: 0 },
      stack: {},
      commands: {},
      contracts: { present: [], templates: [], missing: [] },
      warnings: [],
      blockers: ["Project root does not exist or is not a directory."],
      nextActions: ["Provide an existing project or starter-context directory."],
    };
  }

  const packageFile = firstExistingFile(root, ["package.json"]);
  const manifest = packageFile ? readJson(packageFile) : null;
  const projectContract = readProjectFitContract(root);
  const stackProfile = projectContract?.valid ? readStackProfile(projectContract.profile) : null;
  if (projectContract) {
    projectContract.capabilityProfile = stackProfile ? {
      file: stackProfile.file,
      valid: stackProfile.valid,
      profileVersion: stackProfile.profileVersion,
      expectedScripts: stackProfile.expectedScripts,
      requiredMachineCapabilities: stackProfile.requiredMachineCapabilities,
      rejectedMachineDefaults: stackProfile.rejectedMachineDefaults,
      manualReviewCapabilities: stackProfile.manualReviewCapabilities,
      manualRiskChecks: stackProfile.manualRiskChecks,
      issues: stackProfile.issues,
    } : null;
  }
  const contextCandidates = [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursorrules",
    ".github/copilot-instructions.md",
  ];
  const contextFiles = contextCandidates.filter((file) => existingFileInsideRoot(root, file));
  const markdownFiles = walkFiles(root, {
    directories: ["."],
    extensions: new Set([".md", ".mdx"]),
    maxDepth: 2,
    maxFiles: 120,
  });
  const documentationEntries = markdownFiles.map((file) => ({
    file: relativePath(root, file),
    text: readText(file),
  }));
  const documentationCorpus = documentationEntries.map(({ text }) => text).filter(Boolean).join("\n");
  const sourceFiles = walkFiles(root, {
    directories: ["app", "src", "pages", "components", "styles", "templates"],
    extensions: new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]),
    maxDepth: 4,
    maxFiles: 400,
  });
  const templateFiles = sourceFiles.filter((file) => normalizePath(file).includes("/templates/"));
  const scriptFiles = sourceFiles.filter((file) => [".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extname(file).toLowerCase()));
  const executableScriptFiles = scriptFiles.filter((file) => {
    const normalized = relativePath(root, file);
    return !normalized.startsWith("templates/");
  });
  const appRouter = executableScriptFiles.find((file) => {
    const normalized = relativePath(root, file);
    return /^(?:src\/)?app\/.+\/(?:page|layout|route|loading|error|not-found|template)\.(?:js|jsx|ts|tsx)$/.test(normalized)
      || /^(?:src\/)?app\/(?:page|layout|route|loading|error|not-found|template)\.(?:js|jsx|ts|tsx)$/.test(normalized);
  });
  const pagesRouter = executableScriptFiles.find((file) => /^(?:src\/)?pages\/.+\.(?:js|jsx|ts|tsx)$/.test(relativePath(root, file)));

  const hasExecutableSurface = executableScriptFiles.length > 0;
  const kind = packageFile
    ? hasExecutableSurface ? "codebase" : "package-only"
    : contextFiles.length && markdownFiles.length >= 4
      ? "context-starter"
      : templateFiles.length
        ? "scaffold-fragment"
        : hasExecutableSurface
          ? "code-fragment"
          : "empty";

  const nextConfig = firstExistingFile(root, ["next.config.ts", "next.config.mjs", "next.config.js", "next.config.cjs"]);
  const nextConfigText = nextConfig ? readText(nextConfig) : "";
  const cssFiles = sourceFiles.filter((file) => extname(file).toLowerCase() === ".css");
  const cssCorpus = cssFiles.map(readText).join("\n");
  const hasSemanticTokenBridge = /@theme\b|--color-|--surface-|--font-/i.test(cssCorpus);
  const framework = detectFramework(root, manifest, documentationCorpus, documentationEntries);

  const router = framework?.value === "Next.js"
    ? appRouter
      ? signal("App Router", "configured", [relativePath(root, appRouter)])
      : pagesRouter
        ? signal("Pages Router", "configured", [relativePath(root, pagesRouter)])
        : /app router/i.test(documentationCorpus)
          ? signal("App Router", "declared", matchingDocumentationEvidence(documentationEntries, [/app router/i]))
          : null
    : null;

  const staticExport = framework?.value === "Next.js"
    ? hasConfiguredStaticExport(nextConfigText)
      ? signal("Static export", "configured", [relativePath(root, nextConfig)])
      : hasAny(documentationCorpus, [/output\s*:\s*["']export["']/i, /static export/i])
        ? signal(
            "Static export",
            "declared",
            matchingDocumentationEvidence(documentationEntries, [/output\s*:\s*["']export["']/i, /static export/i]),
          )
        : null
    : null;

  const tsconfig = firstExistingFile(root, ["tsconfig.json"]);
  const typescriptState = dependencyState(root, manifest, "typescript");
  const language = tsconfig || typescriptState
    ? signal(
        "TypeScript",
        typescriptState?.source ?? "configured",
        typescriptState?.evidence ?? [relativePath(root, tsconfig)],
        typescriptState?.version,
        typescriptState?.installedVersion ? { manifestRange: typescriptState.configuredVersion } : {},
      )
    : /\btypescript\b/i.test(documentationCorpus)
      ? signal(
          "TypeScript",
          "declared",
          matchingDocumentationEvidence(documentationEntries, [/\btypescript\b/i, /["']typescript["']\s*:/i]),
          declaredDependencyVersion(documentationCorpus, "typescript"),
        )
      : scriptFiles.length
        ? signal("JavaScript", "inferred", [relativePath(root, scriptFiles[0])])
        : null;

  const tailwindState = dependencyState(root, manifest, "tailwindcss");
  const styling = tailwindState
    ? signal(
        "Tailwind CSS",
        tailwindState.source,
        tailwindState.evidence,
        tailwindState.version,
        tailwindState.installedVersion ? { manifestRange: tailwindState.configuredVersion } : {},
      )
    : /tailwind css(?:\s+v?4)?/i.test(documentationCorpus)
      ? signal(
          "Tailwind CSS",
          "declared",
          matchingDocumentationEvidence(documentationEntries, [/tailwind css/i, /["']tailwindcss["']\s*:/i]),
          declaredDependencyVersion(documentationCorpus, "tailwindcss") ?? (/tailwind css\s+v?4/i.test(documentationCorpus) ? "v4" : null),
        )
      : cssFiles.length
        ? signal("CSS", "configured", cssFiles.slice(0, 3).map((file) => relativePath(root, file)))
        : null;

  const qaPackages = ["@playwright/test", "playwright", "playwright-core"]
    .map((packageName) => [packageName, dependencyState(root, manifest, packageName)])
    .filter(([, state]) => state);
  const qa = qaPackages.length
    ? qaPackages.map(([packageName, state]) => signal(
        packageName,
        state.source,
        state.evidence,
        state.version,
        {
          ...(state.installedVersion ? { manifestRange: state.configuredVersion } : {}),
          harness: packageName === "@playwright/test" ? "test-runner" : "library-only",
        },
      ))
    : /\bplaywright\b/i.test(documentationCorpus)
      ? [signal(
          "Playwright",
          "declared",
          matchingDocumentationEvidence(documentationEntries, [/\bplaywright\b/i]),
          declaredDependencyVersion(documentationCorpus, "playwright-core") ?? declaredDependencyVersion(documentationCorpus, "@playwright/test"),
          { harness: declaredDependencyVersion(documentationCorpus, "@playwright/test") ? "test-runner" : "library-only" },
        )]
      : [];
  const playwrightConfig = firstExistingFile(root, [
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.config.mjs",
    "playwright.config.cjs",
  ]);

  const contracts = contractStatus(root, kind, projectContract);
  const commands = configuredPackageScripts(manifest);
  const invalidScriptNames = invalidPackageScriptNames(manifest);
  const declaredCommands = declaredPackageScripts(documentationCorpus);
  const packageManager = detectPackageManager(root);
  const profileMachineEvidence = {
    "static-out-preview": Boolean(staticExport?.source === "configured" && commands.preview && !/^next start\b/.test(commands.preview)),
    "semantic-css-tokens": hasSemanticTokenBridge,
    lint: Boolean(commands.lint),
    typecheck: Boolean(commands.typecheck),
    "production-build": Boolean(commands.build),
    "browser-test-harness": Boolean(commands["test:e2e"] && dependencyVersion(manifest, "@playwright/test") && playwrightConfig),
  };
  const rejectedMachineEvidence = {
    "next-start-as-static-export-preview": Boolean(
      staticExport?.source === "configured"
      && [commands.start, commands.preview].some((command) => /^next start\b/.test(command ?? "")),
    ),
    "experimental-framework-flags": /\bexperimental\s*:/.test(exportedConfigObject(nextConfigText) ?? ""),
  };
  const profileMachineEvaluation = stackProfile?.valid
    ? kind === "codebase"
      ? {
          status: "evaluated",
          satisfied: stackProfile.requiredMachineCapabilities.filter((name) => profileMachineEvidence[name]),
          missing: stackProfile.requiredMachineCapabilities.filter((name) => !profileMachineEvidence[name]),
          rejectedDefaultsFound: stackProfile.rejectedMachineDefaults.filter((name) => rejectedMachineEvidence[name]),
        }
      : {
          status: "deferred-until-codebase",
          satisfied: [],
          missing: [],
          rejectedDefaultsFound: [],
        }
    : null;
  if (projectContract?.capabilityProfile && profileMachineEvaluation) {
    projectContract.capabilityProfile.machineEvaluation = profileMachineEvaluation;
  }
  const warnings = [];
  const blockers = [];
  let projectContractHasProfileMismatch = false;
  let missingMappedArtifacts = [];
  let missingExpectedScripts = [];

  if (kind === "context-starter") {
    warnings.push("This directory declares a production workflow but is not an executable scaffold: package.json and framework configuration are absent.");
  }
  if (kind === "scaffold-fragment") {
    warnings.push("Reusable code fragments exist, but no package manifest or runnable application was detected.");
  }
  if (kind === "package-only") {
    warnings.push("A package manifest exists, but no application or non-template source surface was detected.");
  }
  if (packageFile && !manifest) {
    warnings.push("package.json exists but is not valid JSON; dependency and script claims are unavailable.");
  }
  if (invalidScriptNames.length) {
    warnings.push(`package.json contains non-executable script entries; commands must be non-empty strings: ${invalidScriptNames.join(", ")}.`);
  }
  if (kind === "codebase" && !contextFiles.length) {
    warnings.push("No root agent/context file was detected; local conventions and preservation constraints may be ambiguous.");
  }
  if (kind === "codebase" && !commands.build) warnings.push("No build script is declared in package.json.");
  if (kind === "codebase" && !commands.lint) warnings.push("No lint script is declared in package.json.");
  if (projectContract && !projectContract.valid) {
    warnings.push(`Project-fit contract is invalid: ${projectContract.issues.join(" ")}`);
  }
  if (projectContract?.valid && projectContract.projectKind !== kind) {
    warnings.push(`Project-fit contract declares kind ${projectContract.projectKind}, but inspection found ${kind}.`);
  }
  if (projectContract?.valid) {
    if (!stackProfile?.valid) {
      projectContractHasProfileMismatch = true;
      warnings.push(`Project-fit capability profile is unavailable or invalid: ${stackProfile?.issues.join(" ") || "No profile could be resolved."}`);
    }
    missingMappedArtifacts = Object.entries(projectContract.artifactMap)
      .filter(([, file]) => {
        return !existingFileInsideRoot(root, file);
      })
      .map(([name]) => name);
    if (missingMappedArtifacts.length) {
      warnings.push(`Project-fit contract maps missing artifacts: ${missingMappedArtifacts.join(", ")}.`);
    }
    if (kind === "codebase") {
      const executableScriptContract = [...new Set([
        ...projectContract.expectedScripts,
        ...(stackProfile?.valid ? stackProfile.expectedScripts : []),
      ])];
      missingExpectedScripts = executableScriptContract.filter((name) => !commands[name]);
      if (missingExpectedScripts.length) {
        warnings.push(`Project-fit contract expects missing package scripts: ${missingExpectedScripts.join(", ")}.`);
      }
    }
    if (stackProfile?.valid) {
      const omittedProfileScripts = stackProfile.expectedScripts.filter((name) => !projectContract.expectedScripts.includes(name));
      if (omittedProfileScripts.length) {
        projectContractHasProfileMismatch = true;
        warnings.push(`Project-fit contract omits scripts required by profile ${stackProfile.id}: ${omittedProfileScripts.join(", ")}.`);
      }
      const profileMismatches = [];
      if (framework?.value !== stackProfile.detection.framework) profileMismatches.push(stackProfile.detection.framework ?? "framework");
      if (router?.value !== stackProfile.detection.router) profileMismatches.push(stackProfile.detection.router ?? "router");
      if (staticExport?.value !== stackProfile.detection.rendering) profileMismatches.push(stackProfile.detection.rendering ?? "rendering");
      if (kind === "codebase" && staticExport?.source !== "configured") profileMismatches.push("configured static export");
      if (profileMismatches.length) {
        projectContractHasProfileMismatch = true;
        warnings.push(`Project-fit profile ${stackProfile.id} lacks detected evidence for: ${profileMismatches.join(", ")}.`);
      }
      if (kind === "codebase" && profileMachineEvaluation?.missing.length) {
        projectContractHasProfileMismatch = true;
        warnings.push(`Project-fit profile ${stackProfile.id} lacks required machine capabilities: ${profileMachineEvaluation.missing.join(", ")}.`);
      }
      if (kind === "codebase" && profileMachineEvaluation?.rejectedDefaultsFound.length) {
        projectContractHasProfileMismatch = true;
        warnings.push(`Project-fit profile ${stackProfile.id} found rejected machine defaults: ${profileMachineEvaluation.rejectedDefaultsFound.join(", ")}.`);
      }
    }
  }
  if (framework?.value === "Next.js" && staticExport && /^next start\b/.test(commands.start ?? declaredCommands.start ?? "")) {
    const source = commands.start ? "package.json" : "starter prose";
    warnings.push(`Static export is paired with \`next start\` in ${source}; exported \`out/\` output needs a static preview/server command instead.`);
  }
  const manifestHasPlaywrightLibrary = dependencyVersion(manifest, "playwright-core") || dependencyVersion(manifest, "playwright");
  const manifestHasPlaywrightTest = dependencyVersion(manifest, "@playwright/test");
  const proseHasPlaywrightLibrary = declaredDependencyVersion(documentationCorpus, "playwright-core") || declaredDependencyVersion(documentationCorpus, "playwright");
  const proseHasPlaywrightTest = declaredDependencyVersion(documentationCorpus, "@playwright/test");
  if ((manifestHasPlaywrightLibrary && !manifestHasPlaywrightTest && !playwrightConfig) || (proseHasPlaywrightLibrary && !proseHasPlaywrightTest)) {
    const source = manifestHasPlaywrightLibrary ? "project manifest" : "starter prose";
    warnings.push(`${source} declares a Playwright library without \`@playwright/test\` or a detected harness; browser evidence is not execution-ready.`);
  }
  if (/\binlineCss\s*:\s*true\b/i.test(documentationCorpus)) {
    warnings.push("Starter prose enables `inlineCss` by default; experimental framework flags need an explicit measured reason and fallback.");
  }
  for (const [name, command] of Object.entries(declaredCommands)) {
    const localNodeScript = command.match(/^node\s+(?!-)(?:"([^"]+)"|'([^']+)'|(\S+))/)?.slice(1).find(Boolean);
    if (localNodeScript && !existingFileInsideRoot(root, localNodeScript)) {
      warnings.push(`Starter prose declares script ${name}, but its local target is missing: ${localNodeScript}.`);
    }
  }
  if (styling?.value === "Tailwind CSS" && ["installed", "configured"].includes(styling.source) && !hasSemanticTokenBridge) {
    warnings.push("Tailwind is configured, but no semantic CSS token bridge was detected in the scanned styles.");
  }
  if (kind === "codebase" && contracts.missing.length) {
    warnings.push(`Missing project decision artifacts for substantial work: ${contracts.missing.join(", ")}.`);
  }
  const unfilledArtifacts = kind === "codebase" ? contracts.present.filter(({ filled }) => !filled).map(({ name }) => name) : [];
  if (unfilledArtifacts.length) {
    warnings.push(`Project decision artifacts appear empty or placeholder-only: ${unfilledArtifacts.join(", ")}.`);
  }
  if (["empty", "missing"].includes(kind)) blockers.push("No usable project or starter context was detected.");

  const projectContractReady = !projectContract || (
    projectContract.valid
    && projectContract.projectKind === kind
    && !projectContractHasProfileMismatch
    && missingMappedArtifacts.length === 0
    && missingExpectedScripts.length === 0
  );
  const frameworkReady = framework && ["configured", "installed"].includes(framework.source);
  const routerReady = framework?.value !== "Next.js" || (router && router.source === "configured");
  const executionContractReady = Boolean(
    packageFile
    && contextFiles.length
    && frameworkReady
    && routerReady
    && packageManager
    && commands.build
    && commands.lint
    && contracts.missing.length === 0
    && unfilledArtifacts.length === 0
    && projectContractReady
  );
  const contextBridgeReady = Boolean(
    kind === "context-starter"
    && projectContractReady
    && projectContract
    && contracts.missing.length === 0
    && framework
  );

  const fit = kind === "context-starter"
    ? contextBridgeReady ? "bridge-ready" : "partial"
    : kind === "codebase" && executionContractReady
      ? projectContract?.valid && stackProfile?.valid ? "profile-ready" : "baseline-ready"
      : kind === "codebase"
        ? "adapt"
        : kind === "package-only"
          ? "partial"
          : kind === "scaffold-fragment"
            ? "partial"
            : "insufficient";

  const nextActions = kind === "context-starter"
      ? [
          "Treat this directory as a declared starter contract, not as a runnable website.",
          ...(!projectContract ? ["If this starter will be versioned, add a validated project-fit machine contract and capability profile handshake."] : []),
          ...(projectContract && !projectContractReady ? ["Repair the project-fit contract, mapped artifacts, profile evidence, and expected-script drift before calling the bridge ready."] : []),
          ...(projectContract?.capabilityProfile?.valid ? ["Treat profile machine capabilities as deferred until the inspector runs against the real codebase."] : []),
          "Scaffold or select the real client project, then re-run this inspector against that codebase.",
        "Copy only project-specific decisions into the client repository; keep reusable starter guidance versioned separately.",
      ]
    : kind === "codebase"
      ? [
          "Resolve declared-versus-installed stack differences before changing architecture.",
          ...(contracts.missing.length ? ["Create or fill the missing project decision artifacts before substantial visual implementation."] : []),
          ...(projectContract?.capabilityProfile?.valid ? [`Complete the profile's manual capability and risk review: ${[...projectContract.capabilityProfile.manualReviewCapabilities, ...projectContract.capabilityProfile.manualRiskChecks].join(", ")}.`] : []),
          "Use the repository's real lint, build, preview, and browser commands as the verification contract.",
        ]
      : ["Provide a runnable project or a documented starter contract before implementation."];

  return {
    schemaVersion: 1,
    project: { name: basename(root), kind, fit },
    context: {
      files: contextFiles,
      documentationFiles: markdownFiles.length,
      templateFiles: templateFiles.length,
      projectContract,
    },
    stack: {
      framework,
      router,
      rendering: staticExport,
      language,
      styling,
      motion: detectMotion(root, manifest, documentationCorpus, documentationEntries),
      qa,
      packageManager,
    },
    commands,
    declaredCommands,
    contracts,
    warnings,
    blockers,
    nextActions,
  };
}

function formatSignal(value) {
  if (!value) return "Not detected";
  if (Array.isArray(value)) return value.length ? value.map(formatSignal).join(", ") : "Not detected";
  return `${value.value}${value.version ? ` ${value.version}` : ""}${value.manifestRange ? `; manifest ${value.manifestRange}` : ""} (${value.source}${value.optional ? ", optional" : ""}${value.harness === "library-only" ? ", library-only" : ""})`;
}

function formatCommands(commands) {
  const entries = Object.entries(commands ?? {});
  return entries.length ? entries.map(([name, command]) => `${name}=\`${command}\``).join("; ") : "none";
}

function formatEvidence(label, value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => formatEvidence(label, item));
  return [`- ${label} / ${value.value}: ${value.evidence.join(", ") || "no file evidence"}`];
}

export function formatMarkdown(report) {
  const fitMeaning = {
    "bridge-ready": "validated starter/profile handshake only; not a runnable implementation",
    "profile-ready": "machine-checked profile baseline; manual architecture, responsive, motion, and visual evidence reviews still apply",
    "baseline-ready": "runnable baseline without a validated stack-profile claim",
    adapt: "runnable code exists, but readiness contracts need repair",
    partial: "usable context exists, but it is not implementation-ready",
    insufficient: "no usable implementation or starter contract",
  }[report.project.fit] ?? "see warnings and blockers";
  const lines = [
    "# Project Fit Brief",
    "",
    `- Project: ${report.project.name}`,
    `- Kind: ${report.project.kind}`,
    `- Skill fit: ${report.project.fit}`,
    `- Fit meaning: ${fitMeaning}`,
    `- Context files: ${report.context.files.join(", ") || "none"}`,
    `- Documentation files: ${report.context.documentationFiles}`,
    `- Template code files: ${report.context.templateFiles}`,
    `- Machine contract: ${report.context.projectContract ? `${report.context.projectContract.file} (${report.context.projectContract.valid ? "valid" : "invalid"})` : "none"}`,
    ...(report.context.projectContract?.valid ? [`- Capability profile: ${report.context.projectContract.profile}`] : []),
    ...(report.context.projectContract?.capabilityProfile ? [`- Profile asset: ${report.context.projectContract.capabilityProfile.file} (${report.context.projectContract.capabilityProfile.valid ? `v${report.context.projectContract.capabilityProfile.profileVersion}` : "invalid"})`] : []),
    ...(report.context.projectContract?.capabilityProfile?.valid ? [`- Profile-required scripts: ${report.context.projectContract.capabilityProfile.expectedScripts.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.capabilityProfile?.valid ? [`- Machine capabilities: ${report.context.projectContract.capabilityProfile.requiredMachineCapabilities.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.capabilityProfile?.machineEvaluation ? [`- Machine capability status: ${report.context.projectContract.capabilityProfile.machineEvaluation.status}; missing=${report.context.projectContract.capabilityProfile.machineEvaluation.missing.join(", ") || "none"}; rejected defaults=${report.context.projectContract.capabilityProfile.machineEvaluation.rejectedDefaultsFound.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.capabilityProfile?.valid ? [`- Manual capability review: ${report.context.projectContract.capabilityProfile.manualReviewCapabilities.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.capabilityProfile?.valid ? [`- Manual risk checks: ${report.context.projectContract.capabilityProfile.manualRiskChecks.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.valid && report.context.projectContract.starterVersion ? [`- Starter version: ${report.context.projectContract.starterVersion}`] : []),
    ...(report.context.projectContract?.valid ? [`- Skill compatibility: ${report.context.projectContract.skillCompatibility}`] : []),
    ...(report.context.projectContract?.valid ? [`- Expected scripts: ${report.context.projectContract.expectedScripts.join(", ") || "none"}`] : []),
    ...(report.context.projectContract?.valid ? [`- Preserve: ${report.context.projectContract.preserve.join(", ") || "none declared"}`] : []),
    ...(report.context.projectContract?.valid ? [`- Screenshot policy: ${report.context.projectContract.evidencePolicy.screenshots ?? "inherit"} (never overrides user or host policy)`] : []),
    "",
    "## Stack",
    "",
    `- Framework: ${formatSignal(report.stack.framework)}`,
    `- Router: ${formatSignal(report.stack.router)}`,
    `- Rendering: ${formatSignal(report.stack.rendering)}`,
    `- Language: ${formatSignal(report.stack.language)}`,
    `- Styling: ${formatSignal(report.stack.styling)}`,
    `- Motion: ${formatSignal(report.stack.motion)}`,
    `- QA: ${formatSignal(report.stack.qa)}`,
    `- Package manager: ${formatSignal(report.stack.packageManager)}`,
    "",
    "## Commands",
    "",
    `- Configured: ${formatCommands(report.commands)}`,
    `- Declared in prose: ${formatCommands(report.declaredCommands)}`,
    "",
    "## Signal Evidence",
    "",
    ...formatEvidence("Framework", report.stack.framework),
    ...formatEvidence("Router", report.stack.router),
    ...formatEvidence("Rendering", report.stack.rendering),
    ...formatEvidence("Language", report.stack.language),
    ...formatEvidence("Styling", report.stack.styling),
    ...formatEvidence("Motion", report.stack.motion),
    ...formatEvidence("QA", report.stack.qa),
    ...formatEvidence("Package manager", report.stack.packageManager),
    "",
    "## Project Contracts",
    "",
    `- Present: ${report.contracts.present.map(({ name, file, filled }) => `${name}=\`${file}\`${filled ? "" : " (placeholder?)"}`).join(", ") || "none"}`,
    `- Templates only: ${report.contracts.templates.map(({ name, file }) => `${name}=\`${file}\``).join(", ") || "none"}`,
    `- Missing: ${report.contracts.missing.join(", ") || "none"}`,
  ];

  if (report.warnings.length) {
    lines.push("", "## Warnings", "", ...report.warnings.map((warning) => `- ${warning}`));
  }
  if (report.blockers.length) {
    lines.push("", "## Blockers", "", ...report.blockers.map((blocker) => `- ${blocker}`));
  }
  lines.push("", "## Next Actions", "", ...report.nextActions.map((action) => `- ${action}`));
  return `${lines.join("\n")}\n`;
}

function help() {
  return `Usage: node scripts/inspect-project.mjs [project-root] [--json] [--strict]\n\n` +
    `Inspects project context, declared and installed stack, verification commands, and design-contract readiness.\n`;
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(help());
    return;
  }
  const projectRoot = args.find((argument) => !argument.startsWith("-")) ?? ".";
  const report = inspectProject(projectRoot);
  process.stdout.write(args.includes("--json") ? `${JSON.stringify(report, null, 2)}\n` : formatMarkdown(report));
  if (args.includes("--strict") && report.blockers.length) process.exitCode = 2;
}

const invokedFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedFile === import.meta.url) runCli();
