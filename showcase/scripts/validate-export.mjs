#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const output = path.join(root, "out");
const routes = [
  ["hospitality", "Alpine House H-01"],
  ["legal", "Litigation Office L-02"],
  ["finance", "Investment Fixture F-03"],
  ["healthcare", "Heart Clinic H-04"],
  ["saas", "Operations Workspace S-05"],
  ["ecommerce", "Pendant Fixture E-06"],
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function readRoute(route) {
  const file = route === "" ? path.join(output, "index.html") : path.join(output, route, "index.html");
  const html = await readFile(file, "utf8");
  invariant(/<main(?:\s|>)/i.test(html), `${route || "index"}: missing main landmark`);
  invariant(!/(?:src|href)=["']https?:\/\//i.test(html), `${route || "index"}: external runtime asset URL found`);
  invariant(!/\b(?:lorem ipsum|todo|placeholder)\b/i.test(html), `${route || "index"}: placeholder copy found`);
  return html;
}

await access(path.join(output, "icon.svg"));
const index = await readRoute("");
invariant(index.includes("Original fictional work"), "index: evidence boundary is missing");

for (const [route, brand] of routes) {
  invariant(index.includes(`href="/${route}/"`), `index: missing link to /${route}/`);
  const html = await readRoute(route);
  invariant(html.includes(brand), `${route}: fictional brand marker is missing`);
  invariant(/<h1(?:\s|>)/i.test(html), `${route}: missing h1`);
  invariant(html.includes("Curated showcase"), `${route}: benchmark boundary is missing`);
  invariant(html.includes("Fictional brand and facts"), `${route}: provenance disclosure is missing`);
}

console.log(`Static export contract passed for index + ${routes.length} showcase routes.`);
