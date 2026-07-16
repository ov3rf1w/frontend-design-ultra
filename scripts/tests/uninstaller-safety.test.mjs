import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("PowerShell uninstaller treats CODEX_HOME as a literal path", (context) => {
  if (process.platform !== "win32") context.skip("Windows PowerShell regression");

  const fixture = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-uninstall-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  const literalHome = path.join(fixture, "codex[1]");
  const wildcardSibling = path.join(fixture, "codex1");
  const literalTarget = path.join(literalHome, "skills", "frontend-design-ultra");
  const siblingTarget = path.join(wildcardSibling, "skills", "frontend-design-ultra");
  mkdirSync(literalTarget, { recursive: true });
  mkdirSync(siblingTarget, { recursive: true });
  writeFileSync(path.join(literalTarget, "literal.txt"), "remove me", "utf8");
  writeFileSync(path.join(siblingTarget, "sibling.txt"), "preserve me", "utf8");

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(root, "uninstall.ps1"),
  ], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: literalHome },
    timeout: 15_000,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(literalTarget), false);
  assert.equal(existsSync(path.join(siblingTarget, "sibling.txt")), true);
});
