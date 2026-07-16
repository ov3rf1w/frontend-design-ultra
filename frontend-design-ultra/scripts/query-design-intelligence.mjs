#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return `Usage:
  node scripts/query-design-intelligence.mjs references [filters]
  node scripts/query-design-intelligence.mjs motion [filters]

Shared:
  --query <text>             Search all descriptive fields.
  --status <value>           Filter lifecycle status; see kind-specific values.
  --limit <number>           Maximum results (default: 10, max: 100).
  --json                     Emit machine-readable JSON.

Reference filters:
  --status <candidate|scanned|promoted|retired>
  --industry <text>
  --lane <id>
  --priority <must-scan|high|standard|fallback>
  --asset <low|medium|high>
  --risk <low|medium|high>
  --captured-only            Require an eligible complete-only machine observation.

Motion filters:
  --status <idea|candidate|recipe|verified|promoted>
  --effect-job <orientation|hierarchy|causality|continuity|pacing|delight>
  --trigger <load|scroll|hover|pointer|drag|route|state|continuous>
  --suitable-for <text>
  --asset <low|medium|high>

The query returns matching records, not an instruction to combine every match. Select
at most one signature motion for a major viewport and verify its asset, mobile,
reduced-motion, and performance contracts.
`;
}

export function parseQueryArguments(argv) {
  const options = {
    kind: argv[0] ?? null,
    query: null,
    status: null,
    limit: 10,
    json: false,
    industry: null,
    lane: null,
    priority: null,
    asset: null,
    risk: null,
    effectJob: null,
    trigger: null,
    suitableFor: null,
    capturedOnly: false,
    help: false,
  };
  if (["--help", "-h"].includes(options.kind)) {
    options.help = true;
    return options;
  }
  if (!["references", "motion"].includes(options.kind)) throw new Error("First argument must be references or motion.");
  const mappings = {
    "--query": "query",
    "--status": "status",
    "--limit": "limit",
    "--industry": "industry",
    "--lane": "lane",
    "--priority": "priority",
    "--asset": "asset",
    "--risk": "risk",
    "--effect-job": "effectJob",
    "--trigger": "trigger",
    "--suitable-for": "suitableFor",
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--captured-only") options.capturedOnly = true;
    else if (["--help", "-h"].includes(argument)) options.help = true;
    else if (mappings[argument]) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[mappings[argument]] = argument === "--limit" ? Number(value) : value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100) throw new Error("--limit must be an integer from 1 to 100.");
  const referenceOnly = ["industry", "lane", "priority", "risk", "capturedOnly"];
  const motionOnly = ["effectJob", "trigger", "suitableFor"];
  if (options.kind === "references" && motionOnly.some((key) => options[key])) throw new Error("Motion-only filters cannot be used for a reference query.");
  if (options.kind === "motion" && referenceOnly.some((key) => options[key])) throw new Error("Reference-only filters cannot be used for a motion query.");
  const allowed = {
    priority: ["must-scan", "high", "standard", "fallback"],
    asset: ["low", "medium", "high"],
    risk: ["low", "medium", "high"],
    effectJob: ["orientation", "hierarchy", "causality", "continuity", "pacing", "delight"],
    trigger: ["load", "scroll", "hover", "pointer", "drag", "route", "state", "continuous"],
    lane: ["archive-catalog", "calm-luxury", "cinematic-immersion", "data-narrative", "editorial-engine", "expressive-typography", "playful-interaction", "product-choreography", "spatial-webgl", "systemic-clarity", "trust-narrative"],
  };
  for (const [key, values] of Object.entries(allowed)) {
    if (options[key] && !values.includes(options[key])) throw new Error(`Unsupported ${key} filter: ${options[key]}.`);
  }
  const statuses = options.kind === "references"
    ? ["candidate", "scanned", "promoted", "retired"]
    : ["idea", "candidate", "recipe", "verified", "promoted"];
  if (options.status && !statuses.includes(options.status)) throw new Error(`Unsupported status for ${options.kind}: ${options.status}.`);
  return options;
}

function includes(value, query) {
  return String(value ?? "").toLowerCase().includes(String(query ?? "").toLowerCase());
}

function searchable(value) {
  return JSON.stringify(value).toLowerCase();
}

function referenceMatches(entry, options) {
  return (!options.query || includes(searchable(entry), options.query))
    && (!options.status || entry.status === options.status)
    && (!options.industry || includes(entry.industry, options.industry))
    && (!options.lane || entry.designLane === options.lane)
    && (!options.priority || entry.scanPriority === options.priority)
    && (!options.asset || entry.assetDependency === options.asset)
    && (!options.risk || entry.scanRisk?.level === options.risk);
}

function motionMatches(entry, options) {
  return (!options.query || includes(searchable(entry), options.query))
    && (!options.status || entry.status === options.status)
    && (!options.effectJob || entry.effectJob === options.effectJob)
    && (!options.trigger || entry.trigger === options.trigger)
    && (!options.asset || entry.assetCost === options.asset)
    && (!options.suitableFor || entry.suitableFor.some((value) => includes(value, options.suitableFor)));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(SKILL_ROOT, relativePath), "utf8"));
}

async function readOptionalJson(relativePath) {
  try {
    return await readJson(relativePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function queryDesignIntelligence(options) {
  if (options.kind === "references") {
    const corpus = await readJson(path.join("assets", "reference-corpus.json"));
    const observationCatalog = await readOptionalJson(path.join("assets", "reference-observations.json"));
    const scanOutcomeCatalog = await readOptionalJson(path.join("assets", "reference-scan-outcomes.json"));
    const observations = new Map((observationCatalog?.observations ?? []).map((observation) => [observation.referenceId, observation]));
    const scanOutcomes = new Map((scanOutcomeCatalog?.outcomes ?? []).map((outcome) => [outcome.refId, outcome]));
    const allMatches = corpus.entries
      .map((entry) => ({
        ...entry,
        machineObservation: observations.get(entry.id) ?? null,
        latestScanOutcome: scanOutcomes.get(entry.id) ?? null,
      }))
      .filter((entry) => referenceMatches(entry, options) && (!options.capturedOnly || entry.machineObservation));
    const matches = allMatches.slice(0, options.limit);
    return {
      kind: "references",
      datasetStatus: corpus.datasetStatus,
      total: corpus.entries.length,
      matched: allMatches.length,
      returned: matches.length,
      results: matches,
    };
  }
  const catalog = await readJson(path.join("assets", "motion-patterns.json"));
  const allMatches = catalog.patterns.filter((entry) => motionMatches(entry, options));
  const matches = allMatches.slice(0, options.limit);
  return {
    kind: "motion",
    catalogVersion: catalog.catalogVersion,
    total: catalog.patterns.length,
    matched: allMatches.length,
    returned: matches.length,
    results: matches,
  };
}

function formatReference(entry) {
  return [
    `## ${entry.title}`,
    "",
    `- ID: ${entry.id}`,
    `- Source: ${entry.sourceUrl}`,
    `- Status: ${entry.status}; priority: ${entry.scanPriority}; risk: ${entry.scanRisk.level}`,
    `- Industry: ${entry.industry}`,
    `- Lane: ${entry.designLane}`,
    `- Hero hypothesis: ${entry.heroMechanicHypothesis}`,
    `- Motion hypothesis: ${entry.motionSignatureHypothesis}`,
    `- Asset dependency: ${entry.assetDependency}`,
    `- Machine observation: ${entry.machineObservation ? `${entry.machineObservation.capturedAt}; candidates=${entry.machineObservation.mechanics.candidateMechanics.join(", ") || "none"}; human review pending` : "none"}`,
    `- Latest scan outcome: ${entry.latestScanOutcome ? `${entry.latestScanOutcome.capturedAt}; status=${entry.latestScanOutcome.status}; eligibility=${entry.latestScanOutcome.eligibility}` : "none"}`,
  ].join("\n");
}

function formatMotion(entry) {
  return [
    `## ${entry.title}`,
    "",
    `- ID: ${entry.id}`,
    `- Status: ${entry.status}`,
    `- Job: ${entry.effectJob}; trigger: ${entry.trigger}; asset cost: ${entry.assetCost}`,
    `- Role: ${entry.narrativeRole}`,
    `- Suitable for: ${entry.suitableFor.join(", ")}`,
    `- Mobile: ${entry.mobileAlternative}`,
    `- Reduced motion: ${entry.reducedMotion}`,
    `- Main risks: ${entry.failureModes.join("; ")}`,
  ].join("\n");
}

function formatResult(result) {
  const lines = [
    `# ${result.kind === "references" ? "Reference" : "Motion"} Intelligence Query`,
    "",
    `Matched ${result.matched} of ${result.total}; returned ${result.returned}.`,
    "",
    ...result.results.map(result.kind === "references" ? formatReference : formatMotion),
  ];
  return `${lines.join("\n\n")}\n`;
}

export async function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseQueryArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const result = await queryDesignIntelligence(options);
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : formatResult(result));
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) runCli();
