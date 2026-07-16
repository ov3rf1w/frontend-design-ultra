# Frontend Design Ultra

Installable Codex skill for project-aware premium frontend strategy,
implementation, critique, and browser-backed verification.

It combines subject-grounded art direction with explicit UX, responsive,
accessibility, performance, motion, provenance, and evidence contracts. The
skill routes detailed guidance lazily from `references/` and queries its
machine-readable reference and motion catalogs only when the task needs them.

## Install

Copy or symlink this directory into a Codex skill root such as:

```text
~/.codex/skills/frontend-design-ultra
```

The public repository also provides guarded Bash and PowerShell installers.
Read `SKILL.md` for routing and parameter precedence.

## Optional Scanner Runtime

Normal skill use does not require `npm install`. The live-reference scanner is
the only feature with a local Node dependency. After installing this directory
through Agent Skills CLI, a release archive, or the repository installer, run
the following once from the installed skill path:

```bash
npm ci --ignore-scripts
```

The lockfile installs exactly `playwright-core` 1.61.1 and no browser binary.
Exploratory scans use `--browser auto` and can reuse an existing Chrome or Edge
installation. Benchmark-tier scans require Playwright's matching Chromium:

```bash
npm run browser:install
```

This is equivalent to `npx playwright-core install chromium` after the locked
runtime install. The skill installer never installs `node_modules` or downloads
a browser automatically.

## Evidence Boundary

- Third-party live-site captures stay in a private local evidence cache unless
  publication and redistribution permission is documented.
- Public reference intelligence contains source links, lifecycle state, and
  a separate sanitized diagnostic outcome for the newest relevant scan.
- Public machine observations are strict complete-only derived mechanics whose
  aggregate digest binds the full referenced artifact set rather than raw captures.
- Motion recipes are repository-authored abstractions with mobile,
  reduced-motion, performance, no-JavaScript, and verification contracts.
- Curated showcases and expected-output fixtures are not blind benchmark
  results.

## License Boundary

The included `LICENSE` covers repository-authored material in this payload.
Dependencies, linked sites, media, fonts, names, and trademarks retain their
own terms. See `THIRD_PARTY_NOTICES.md`.
