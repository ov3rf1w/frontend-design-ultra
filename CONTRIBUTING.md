# Contributing

Thanks for helping improve Frontend Design Ultra.

## What Makes A Good Contribution

- A rule that changes agent behavior.
- A clearer routing decision.
- A better output contract.
- A stronger accessibility, performance, mobile, or evidence gate.
- A smaller wording that preserves or improves behavior.

## What To Avoid

- Generic frontend advice.
- Long essays.
- Repeated rules already covered by the dispatcher.
- Tool-specific instructions that fail when the tool is unavailable.
- Aesthetic rules that weaken accessibility, performance, or responsiveness.
- Raw third-party screenshots, videos, traces, HAR files, fonts, brand assets, or copied production code.
- Visual-effect claims without a frozen benchmark result and supporting raw data.

## Local Setup

Use a supported Node release and the locked dependency graph:

```bash
npm ci --ignore-scripts
npm run lint
npm test
npm run build
```

The root tooling supports Windows and Linux. Changes to installers or uninstallers must preserve dry-run, staging, rollback, literal-path, and local-working-tree behavior on both platforms.

## Skill And Reference Changes

- Keep `frontend-design-ultra/SKILL.md` compact and route every substantial reference through its Lazy References section.
- Put machine-readable retrieval data under `frontend-design-ultra/assets/` with a schema and deterministic tests.
- Keep candidate, machine-captured, visually reviewed, verified, and promoted states distinct.
- Add or update paired prompt/expected fixtures when behavior changes.
- Do not turn one successful art direction into a universal default.

## References, Motion, And Public Media

Follow the [Reference, Reconstruction, And Provenance Policy](docs/REFERENCE_POLICY.md). Every public asset needs an ownership or redistribution record.

Original motion recipes must include information job, trigger, timing, transform ownership, mobile alternative, reduced-motion final state, no-JavaScript fallback, performance budget, failure modes, and verification evidence.

Raw third-party Playwright evidence belongs only in the approved private OS-local evidence cache, never in the repository, a cloud-synchronized project directory, a pull request, or a release artifact. Gitignore is not a privacy control.

## License And Contributor Certification

Repository-authored contributions are accepted under the repository's [MIT License](LICENSE). The project uses an inbound-equals-outbound model: by submitting a contribution, you agree that the project may distribute your contribution under the same MIT terms, unless a maintainer has explicitly approved a separately identified asset or file before submission.

Every commit must include a `Signed-off-by` line certifying the [Developer Certificate of Origin 1.1](https://developercertificate.org/):

```bash
git commit --signoff
```

Pull requests run the repository-owned `DCO sign-off` check. It loads the checker from the trusted base commit, calculates the merge base, and checks every commit unique to the pull request, including merge commits. A pull request cannot bypass the gate by weakening its own copy of the checker. A valid trailer must match that commit's author name and email; the check has no bot, dependency, or merge-commit exemptions and fails closed when the range cannot be resolved.

To repair the latest commit, preserve its author identity and add the trailer:

```bash
git commit --amend --signoff --no-edit
```

For multiple commits, use an interactive rebase and amend each affected commit. Force-push only your pull-request branch, never a protected branch, and coordinate first when other contributors share the branch. Maintainers should require the `DCO sign-off / dco` status check in the `main` branch rule.

Sign-off records are public Git history and may be retained indefinitely as described by the DCO. Do not contribute material you cannot submit under the declared terms. A DCO sign-off does not relicense third-party dependencies, trademarks, fonts, media, client work, or reference captures.

## Benchmark Changes

Protocol, scoring, condition, invalidation, holdout, or claims changes require a new version or an explicitly documented preregistration amendment. Never alter a frozen protocol to improve results. Preserve failed runs and keep condition mappings hidden until votes are frozen.

Run the benchmark definition checks when touching `benchmark/`:

```bash
npm run benchmark:validate
npm run benchmark:test
```

## Pull Request Checklist

- The installable skill still validates.
- Public docs do not expose private construction notes.
- New rules are specific, actionable, and worth their tokens.
- Examples use realistic frontend requests.
- Any new reference file is lazy-loaded by a clear routing rule.
- Tests, lint, build, and relevant installer checks are listed with their actual results.
- New public assets include declared provenance, license or permission basis, and redistribution status. Passing review records the project's diligence; it is not a legal-clearance opinion.
- Benchmark impact and claims impact are declared.
- No credentials, customer data, raw private captures, absolute local paths, hidden TODOs, or fabricated proof are included.
- User-facing behavior changes are recorded in `CHANGELOG.md`.

Rights, privacy, or confidential-data concerns should follow the private reporting process in [RIGHTS.md](RIGHTS.md), not a public pull-request thread.

## Validation

Run the repository checks above. When the local Codex skill-creator validator is available, also run it against the installable folder:

```powershell
python "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" ".\frontend-design-ultra"
```
