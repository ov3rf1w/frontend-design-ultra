import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { checkDcoRange, validateCommitSignOff } from "../check-dco.mjs";
import { validateGitHubGovernance } from "../validate-github-governance.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function governanceFixture(context) {
  const root = await mkdtemp(path.join(os.tmpdir(), "frontend-design-ultra-governance-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workflows = path.join(root, ".github", "workflows");
  await mkdir(workflows, { recursive: true });
  for (const file of ["release.yml", "dco.yml"]) {
    const source = await readFile(path.join(repositoryRoot, ".github", "workflows", file), "utf8");
    await writeFile(path.join(workflows, file), source.replaceAll("\r\n", "\n"));
  }
  return root;
}

test("repository workflows preserve the release permission boundary and DCO contract", async () => {
  assert.deepEqual(await validateGitHubGovernance(repositoryRoot), []);
});

test("all external workflow actions use immutable full commit pins", async () => {
  const workflows = path.join(repositoryRoot, ".github", "workflows");
  for (const file of await (await import("node:fs/promises")).readdir(workflows)) {
    if (!/\.ya?ml$/i.test(file)) continue;
    const source = await readFile(path.join(workflows, file), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)["']?/);
      if (!match || match[1].startsWith("./")) continue;
      const pinned = match[1].startsWith("docker://")
        ? /@sha256:[a-f0-9]{64}$/i.test(match[1])
        : /@[a-f0-9]{40}$/i.test(match[1]);
      assert.equal(pinned, true, `${file} contains a mutable action reference: ${match[1]}`);
    }
  }
});

test("governance validator rejects collapsed release permissions and mutable artifact download", async (context) => {
  const root = await governanceFixture(context);
  const releaseFile = path.join(root, ".github", "workflows", "release.yml");
  const source = await readFile(releaseFile, "utf8");
  await writeFile(
    releaseFile,
    source
      .replace("permissions:\n  contents: read", "permissions:\n  contents: write")
      .replace("    needs: build\n", "")
      .replace(/actions\/download-artifact@[a-f0-9]{40}/, "actions/download-artifact@v5"),
  );

  const codes = new Set((await validateGitHubGovernance(root)).map(({ code }) => code));
  assert.ok(codes.has("RELEASE_PERMISSION_BOUNDARY"));
  assert.ok(codes.has("RELEASE_PUBLISH_DEPENDENCY"));
  assert.ok(codes.has("RELEASE_DOWNLOAD_PIN"));
});

test("governance validator rejects privileged DCO events and fail-open checkout semantics", async (context) => {
  const root = await governanceFixture(context);
  const dcoFile = path.join(root, ".github", "workflows", "dco.yml");
  const source = await readFile(dcoFile, "utf8");
  await writeFile(
    dcoFile,
    source
      .replace("pull_request:", "pull_request_target:")
      .replace(/actions\/checkout@[a-f0-9]{40}/, "actions/checkout@v6")
      .replace("persist-credentials: false", "persist-credentials: true")
      .replace(
        "        shell: bash",
        "        continue-on-error: true\n        shell: bash",
      ),
  );

  const codes = new Set((await validateGitHubGovernance(root)).map(({ code }) => code));
  assert.ok(codes.has("DCO_EVENT_BOUNDARY"));
  assert.ok(codes.has("DCO_ACTION_SURFACE"));
  assert.ok(codes.has("DCO_CHECKOUT_SEMANTICS"));
  assert.ok(codes.has("DCO_RANGE_CHECK"));
});

test("DCO trailer must be structured and match the commit author", () => {
  const commit = "a".repeat(40);
  assert.equal(validateCommitSignOff({
    commit,
    authorName: "Ada Lovelace",
    authorEmail: "ada@example.invalid",
    message: "Improve governance\n\nSigned-off-by: Ada Lovelace <ada@example.invalid>\n",
  }), null);
  assert.match(validateCommitSignOff({
    commit,
    authorName: "Ada Lovelace",
    authorEmail: "ada@example.invalid",
    message: "Improve governance\n",
  }), /missing a valid/);
  assert.match(validateCommitSignOff({
    commit,
    authorName: "Ada Lovelace",
    authorEmail: "ada@example.invalid",
    message: "Improve governance\n\nSigned-off-by: Other Person <other@example.invalid>\n",
  }), /no Signed-off-by trailer matches commit author/);
});

test("DCO range checker fails on any unsigned PR commit and passes after repair", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "frontend-design-ultra-dco-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const git = async (...args) => {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
    return stdout.trim();
  };

  await git("init");
  await git("config", "user.name", "Ada Lovelace");
  await git("config", "user.email", "ada@example.invalid");
  await writeFile(path.join(root, "fixture.txt"), "base\n");
  await git("add", "fixture.txt");
  await git("-c", "commit.gpgsign=false", "commit", "--signoff", "-m", "Base");
  const base = await git("rev-parse", "HEAD");

  await writeFile(path.join(root, "fixture.txt"), "head\n");
  await git("add", "fixture.txt");
  await git("-c", "commit.gpgsign=false", "commit", "-m", "Unsigned change");
  const unsignedHead = await git("rev-parse", "HEAD");
  await assert.rejects(
    checkDcoRange({ root, base, head: unsignedHead }),
    /DCO verification failed for 1 of 1/,
  );

  await git("-c", "commit.gpgsign=false", "commit", "--amend", "--signoff", "--no-edit");
  const signedHead = await git("rev-parse", "HEAD");
  const result = await checkDcoRange({ root, base, head: signedHead });
  assert.equal(result.commits.length, 1);
  assert.equal(result.commits[0], signedHead);
});
