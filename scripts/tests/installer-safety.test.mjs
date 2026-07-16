import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("installers require the public payload guide, license, and third-party notices", async () => {
  const [bash, powershell] = await Promise.all([
    readFile(path.join(root, "install.sh"), "utf8"),
    readFile(path.join(root, "install.ps1"), "utf8"),
  ]);

  for (const required of ["README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"]) {
    assert.match(bash, new RegExp(required.replace(".", "\\.")));
    assert.match(powershell, new RegExp(required.replace(".", "\\.")));
  }
});

test("PowerShell local dry run survives unavailable optional validator dependencies", (context) => {
  if (process.platform !== "win32") context.skip("Windows PowerShell regression");
  const codexHome = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-local-dry-run-"));
  context.after(() => rmSync(codexHome, { recursive: true, force: true }));

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(root, "install.ps1"),
    "-Source",
    "Local",
    "-DryRun",
  ], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome },
    timeout: 30_000,
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /Dry run passed/);
  assert.equal(existsSync(path.join(codexHome, "skills", "frontend-design-ultra")), false);
});

test("remote installer status paths redact repository credentials", async () => {
  const [bash, powershell] = await Promise.all([
    readFile(path.join(root, "install.sh"), "utf8"),
    readFile(path.join(root, "install.ps1"), "utf8"),
  ]);

  assert.match(bash, /REPO_DISPLAY="\$\(redact_repo_url/);
  assert.match(bash, /Fetching \$\{REPO_REF\} from \$\{REPO_DISPLAY\}/);
  assert.match(bash, /fetch --quiet --depth 1 origin "\$\{REPO_REF\}" 2>\/dev\/null/);
  assert.doesNotMatch(bash, /Fetching \$\{REPO_REF\} from \$\{REPO_URL\}/);

  assert.match(powershell, /function Get-RedactedRepoUrl/);
  assert.match(powershell, /Fetching \$Ref from \$RepoDisplay/);
  assert.match(powershell, /fetch.*\$Ref\) -SuppressOutput/);
  assert.doesNotMatch(powershell, /Fetching \$Ref from \$Repo\.\.\./);
});

test("failed remote fetch never prints credential-bearing repository input", (context) => {
  const secret = "FAKE_SECRET_DO_NOT_PRINT";
  const query = "FAKE_QUERY_DO_NOT_PRINT";
  const repo = `https://user:${secret}@127.0.0.1:9/repo.git?token=${query}`;
  const codexHome = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-installer-"));
  context.after(() => rmSync(codexHome, { recursive: true, force: true }));

  const command = process.platform === "win32" ? "powershell.exe" : "bash";
  const args = process.platform === "win32"
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "install.ps1"), "-Source", "Remote", "-DryRun", "-Repo", repo]
    : [path.join(root, "install.sh"), "--remote", "--dry-run", "--repo", repo];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome },
    timeout: 15_000,
  });
  if (result.error?.code === "ENOENT") context.skip(`${command} is unavailable`);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(output, new RegExp(secret));
  assert.doesNotMatch(output, new RegExp(query));
  assert.match(output, /https:\/\/\*\*\*@127\.0\.0\.1:9\/repo\.git/);
});

test("failed SSH-URL fetch redacts userinfo and query data", (context) => {
  const secret = "FAKE_SSH_SECRET_DO_NOT_PRINT";
  const query = "FAKE_SSH_QUERY_DO_NOT_PRINT";
  const repo = `ssh://user:${secret}@127.0.0.1:9/repo.git?token=${query}`;
  const codexHome = mkdtempSync(path.join(os.tmpdir(), "frontend-design-ultra-installer-ssh-"));
  context.after(() => rmSync(codexHome, { recursive: true, force: true }));

  const command = process.platform === "win32" ? "powershell.exe" : "bash";
  const args = process.platform === "win32"
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "install.ps1"), "-Source", "Remote", "-DryRun", "-Repo", repo]
    : [path.join(root, "install.sh"), "--remote", "--dry-run", "--repo", repo];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome },
    timeout: 15_000,
  });
  if (result.error?.code === "ENOENT") context.skip(`${command} is unavailable`);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(output, new RegExp(secret));
  assert.doesNotMatch(output, new RegExp(query));
  assert.match(output, /ssh:\/\/\*\*\*@127\.0\.0\.1:9\/repo\.git/);
});
