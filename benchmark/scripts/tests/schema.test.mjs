import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schemaRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "protocol",
  "v1",
  "schemas",
);

test("all benchmark schemas compile in strict JSON Schema 2020-12 mode", async () => {
  const files = (await readdir(schemaRoot))
    .filter((file) => file.endsWith(".schema.json"))
    .sort((left, right) => left.localeCompare(right, "en"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const file of files) {
    const schema = JSON.parse(await readFile(path.join(schemaRoot, file), "utf8"));
    assert.doesNotThrow(() => ajv.compile(schema), file);
  }
  assert.equal(files.length, 17);
});
