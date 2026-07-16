#!/usr/bin/env node

import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SIGN_OFF_PATTERN = /^Signed-off-by:\s*(.+?)\s*<([^<>\s@]+@[^<>\s@]+)>\s*$/i;

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

function normalizeEmail(value) {
  return value.trim().toLocaleLowerCase("en");
}

export function validateCommitSignOff({ commit, authorName, authorEmail, message }) {
  const signOffs = String(message)
    .split(/\r?\n/)
    .map((line) => line.match(SIGN_OFF_PATTERN))
    .filter(Boolean)
    .map((match) => ({ name: match[1], email: match[2] }));

  if (signOffs.length === 0) {
    return `${commit}: missing a valid "Signed-off-by: Name <email>" trailer.`;
  }

  const authorMatch = signOffs.some(({ name, email }) =>
    normalizeName(name) === normalizeName(authorName)
      && normalizeEmail(email) === normalizeEmail(authorEmail));
  if (!authorMatch) {
    return `${commit}: no Signed-off-by trailer matches commit author ${authorName} <${authorEmail}>.`;
  }
  return null;
}

function parseArguments(argv) {
  const options = { root: process.cwd(), base: null, head: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root" || argument === "--base" || argument === "--head") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.base || !options.head) throw new Error("--base and --head are required.");
  options.root = path.resolve(options.root);
  return options;
}

async function git(root, args) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "-C", root, ...args],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      },
    );
    return stdout;
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? "unknown Git error").trim();
    throw new Error(`git ${args[0]} failed: ${detail}`);
  }
}

async function requireCommit(root, label, commit) {
  if (!COMMIT_SHA_PATTERN.test(commit)) {
    throw new Error(`${label} must be a full 40-character commit SHA.`);
  }
  await git(root, ["cat-file", "-e", `${commit}^{commit}`]);
}

export async function checkDcoRange({ root = process.cwd(), base, head }) {
  const repositoryRoot = path.resolve(root);
  await requireCommit(repositoryRoot, "Base", base);
  await requireCommit(repositoryRoot, "Head", head);

  const mergeBase = (await git(repositoryRoot, ["merge-base", base, head])).trim();
  if (!COMMIT_SHA_PATTERN.test(mergeBase)) {
    throw new Error("Git did not return a valid merge base for the pull-request range.");
  }

  const commits = (await git(repositoryRoot, ["rev-list", "--reverse", `${mergeBase}..${head}`]))
    .split(/\r?\n/)
    .filter(Boolean);
  if (commits.length === 0) {
    throw new Error("The pull-request range contains no commits; refusing to pass open.");
  }

  const failures = [];
  for (const commit of commits) {
    const identity = (await git(repositoryRoot, ["show", "-s", "--format=%an%x00%ae", commit]))
      .replace(/\r?\n$/, "")
      .split("\0");
    if (identity.length !== 2 || !identity[0] || !identity[1]) {
      failures.push(`${commit}: Git did not return a complete author identity.`);
      continue;
    }
    const message = await git(repositoryRoot, ["show", "-s", "--format=%B", commit]);
    const failure = validateCommitSignOff({
      commit,
      authorName: identity[0],
      authorEmail: identity[1],
      message,
    });
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    throw new Error([
      `DCO verification failed for ${failures.length} of ${commits.length} pull-request commit(s):`,
      ...failures.map((failure) => `- ${failure}`),
      "Repair each commit with an author-matching sign-off, for example: git commit --amend --signoff",
    ].join("\n"));
  }
  return { mergeBase, commits };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await checkDcoRange(options);
  process.stdout.write(`DCO verification passed for ${result.commits.length} pull-request commit(s).\n`);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`DCO verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
