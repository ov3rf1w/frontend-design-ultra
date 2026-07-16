# Installation

## Codex

### Open Agent Skills CLI

```bash
npx skills add ov3rf1w/frontend-design-ultra --skill frontend-design-ultra -g -a codex
```

### Trust-pinned installation

Do not pipe an installer from mutable `main` directly into a shell. After the first GitHub release, download the versioned release archive, `release-manifest.json`, and `SHA256SUMS`, verify the hashes, inspect the payload, and install that exact version.

While the project is an RC without a published release, use an exact-commit local checkout. This makes the code and validator you execute auditable.

### Local checkout

Running the checked-out installer automatically uses the adjacent `frontend-design-ultra/` directory. This includes local committed and uncommitted changes; it does not re-download `main`.

```bash
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
git checkout --detach <40-character-commit>
npm ci --ignore-scripts
npm run build
bash install.sh --local
```

Windows local checkout:

```powershell
git clone https://github.com/ov3rf1w/frontend-design-ultra.git
cd frontend-design-ultra
git checkout --detach <40-character-commit>
npm ci --ignore-scripts
npm run build
.\install.ps1 -Source Local
```

Maintainers may deliberately test the installer's remote path from an already inspected checkout:

```bash
bash install.sh --remote --ref '<branch-tag-or-commit>'
```

```powershell
.\install.ps1 -Source Remote -Ref '<branch-tag-or-commit>'
```

### Validation, replacement, and dry runs

Every install is copied to a staging directory and receives built-in structural validation before activation. If Codex's `quick_validate.py`, Python, and its YAML dependency are already available, that validator also runs; Python is not an installation requirement.

An existing installation is renamed to a temporary backup immediately before the staged directory is activated on the same filesystem. If activation fails or the script receives a handled interrupt during the swap, the installer restores the previous directory. The backup is removed only after activation succeeds; after a forced process termination it remains beside the target for manual recovery.

Validate a local checkout without changing the installed skill:

```bash
bash install.sh --dry-run
```

```powershell
.\install.ps1 -DryRun
```

Installed path:

```text
~/.codex/skills/frontend-design-ultra
```

Restart Codex after installation so skill metadata reloads.

### Optional one-time reference-scanner setup

The installed skill works normally without `node_modules`. Strategy, design, implementation, critique, project inspection, reference queries, and verification guidance do not need this setup.

Only `scripts/scan-reference.mjs` requires the locked Node runtime. After installing through Agent Skills CLI, a release archive, `install.sh`, or `install.ps1`, change into the actual installed skill directory and run:

```bash
cd ~/.codex/skills/frontend-design-ultra
npm ci --ignore-scripts
```

PowerShell default path:

```powershell
Set-Location "$env:USERPROFILE\.codex\skills\frontend-design-ultra"
npm ci --ignore-scripts
```

If `CODEX_HOME` points elsewhere, use that skill directory instead. The lockfile installs exactly `playwright-core` 1.61.1 and does not download a browser because install scripts are disabled.

Two capture modes are intentionally separate:

- Exploratory/default `--browser auto` scans can launch an existing Chrome or Edge installation. No browser download is required.
- `--evidence-tier benchmark` requires the Chromium build matched to pinned `playwright-core` 1.61.1. Install it explicitly from the same skill directory:

```bash
npm run browser:install
```

This is the locked-package equivalent of `npx playwright-core install chromium`. It requires network access and additional disk space. No repository, archive, Agent Skills CLI, Bash, or PowerShell install path downloads this browser automatically.

## Other Agents

See [platforms.md](platforms.md) and [Agent Usage Guide](AGENT-USAGE.md). For manual integrations, keep the complete `frontend-design-ultra/` directory together and add `docs/AGENT-USAGE.md` plus `docs/PARAMETERS.md` as project knowledge. Behavioral parity with the tested Codex surface is not yet certified.
