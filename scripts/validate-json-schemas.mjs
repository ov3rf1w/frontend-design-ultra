#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAIRS = [
  ["frontend-design-ultra/assets/reference-corpus.schema.json", "frontend-design-ultra/assets/reference-corpus.json"],
  ["frontend-design-ultra/assets/reference-observations.schema.json", "frontend-design-ultra/assets/reference-observations.json"],
  ["frontend-design-ultra/assets/reference-scan-outcomes.schema.json", "frontend-design-ultra/assets/reference-scan-outcomes.json"],
  ["frontend-design-ultra/assets/motion-patterns.schema.json", "frontend-design-ultra/assets/motion-patterns.json"],
  ["docs/assets/media-provenance.schema.json", "docs/assets/media-provenance.json"],
];

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function formatErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
}

export async function validateJsonSchemas(root = ROOT) {
  const diagnostics = [];
  for (const [schemaPath, dataPath] of PAIRS) {
    const schemaFile = path.resolve(root, schemaPath);
    const dataFile = path.resolve(root, dataPath);
    let schema;
    let data;
    try {
      schema = JSON.parse(await readFile(schemaFile, "utf8"));
      data = JSON.parse(await readFile(dataFile, "utf8"));
    } catch (error) {
      diagnostics.push({ file: relative(error.path ?? dataFile), message: `JSON read failed: ${error.message}` });
      continue;
    }
    try {
      const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, validateFormats: true });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      if (!validate(data)) diagnostics.push({ file: relative(dataFile), message: formatErrors(validate.errors) });
    } catch (error) {
      diagnostics.push({ file: relative(schemaFile), message: `Schema compile failed: ${error.message}` });
    }
  }
  return diagnostics;
}

async function main() {
  const diagnostics = await validateJsonSchemas();
  if (diagnostics.length) {
    for (const diagnostic of diagnostics) process.stderr.write(`ERROR JSON_SCHEMA ${diagnostic.file} - ${diagnostic.message}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Validated ${PAIRS.length} JSON data/schema pairs.\n`);
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) main().catch((error) => {
  process.stderr.write(`Schema validation crashed: ${error.message}\n`);
  process.exitCode = 1;
});
