#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_FILE = path.join(ROOT, "app", "globals.css");
const MIN_NORMAL_TEXT_RATIO = 4.5;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function selectorDeclarations(source, selector) {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]+)\\}`, "m"));
  if (!match) throw new Error(`Missing contrast selector: ${selector}`);
  const declarations = {};
  for (const declaration of match[1].matchAll(/([-\w]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
    declarations[declaration[1]] = declaration[2].toLowerCase();
  }
  return declarations;
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g)?.map((part) => channel(Number.parseInt(part, 16)));
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) throw new Error(`Unsupported color: ${hex}`);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function requireColor(tokens, name, context) {
  const value = tokens[name];
  if (!value) throw new Error(`${context} is missing ${name}.`);
  return value;
}

const css = await readFile(CSS_FILE, "utf8");
const base = selectorDeclarations(css, ".route-shell");
const brands = ["hospitality", "legal", "finance", "healthcare", "saas", "ecommerce"];
const tokens = Object.fromEntries(brands.map((brand) => [
  brand,
  { ...base, ...selectorDeclarations(css, `.route-shell[data-brand="${brand}"]`) },
]));
const workflow = { ...tokens.saas, ...selectorDeclarations(css, ".workflow-demo") };
const workflowIndex = selectorDeclarations(css, ".workflow-tabs button span").color;

const contracts = [
  {
    label: "base muted text",
    foreground: requireColor(base, "--muted", "base route"),
    background: requireColor(base, "--surface", "base route"),
  },
  {
    label: "base primary action",
    foreground: requireColor(base, "--accent-ink", "base route"),
    background: requireColor(base, "--accent", "base route"),
  },
  ...brands.flatMap((brand) => [
    {
      label: `${brand} muted text`,
      foreground: requireColor(tokens[brand], "--muted", brand),
      background: requireColor(tokens[brand], "--surface", brand),
    },
    {
      label: `${brand} primary action`,
      foreground: requireColor(tokens[brand], "--accent-ink", brand),
      background: requireColor(tokens[brand], "--accent", brand),
    },
  ]),
  {
    label: "healthcare muted text on raised surface",
    foreground: requireColor(tokens.healthcare, "--muted", "healthcare"),
    background: requireColor(tokens.healthcare, "--surface-raised", "healthcare"),
  },
  {
    label: "ecommerce muted text on raised surface",
    foreground: requireColor(tokens.ecommerce, "--muted", "ecommerce"),
    background: requireColor(tokens.ecommerce, "--surface-raised", "ecommerce"),
  },
  {
    label: "ecommerce accent text on surface",
    foreground: requireColor(tokens.ecommerce, "--accent", "ecommerce"),
    background: requireColor(tokens.ecommerce, "--surface", "ecommerce"),
  },
  {
    label: "workflow muted text",
    foreground: requireColor(workflow, "--muted", "workflow"),
    background: requireColor(workflow, "background", "workflow"),
  },
  {
    label: "workflow muted text on raised surface",
    foreground: requireColor(workflow, "--muted", "workflow"),
    background: requireColor(workflow, "--surface-raised", "workflow"),
  },
  {
    label: "workflow tab index on surface",
    foreground: workflowIndex,
    background: requireColor(workflow, "background", "workflow"),
  },
  {
    label: "workflow tab index on raised surface",
    foreground: workflowIndex,
    background: requireColor(workflow, "--surface-raised", "workflow"),
  },
];

const failures = [];
let minimum = Number.POSITIVE_INFINITY;
for (const contract of contracts) {
  const ratio = contrastRatio(contract.foreground, contract.background);
  minimum = Math.min(minimum, ratio);
  process.stdout.write(`${ratio.toFixed(2)}:1  ${contract.label}\n`);
  if (ratio + Number.EPSILON < MIN_NORMAL_TEXT_RATIO) {
    failures.push(`${contract.label}: ${ratio.toFixed(2)}:1 (${contract.foreground} on ${contract.background})`);
  }
}

if (failures.length) {
  throw new Error(`Normal-text contrast gate failed:\n- ${failures.join("\n- ")}`);
}

process.stdout.write(`Contrast token contract passed (${contracts.length} pairs, minimum ${minimum.toFixed(2)}:1).\n`);
