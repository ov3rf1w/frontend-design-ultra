# Release And GitHub Hardening

This repository is prepared as `0.9.0-rc.1`. A tag, GitHub release, published benchmark result, and protected default branch are external release actions and must happen only after the local release candidate is committed and reviewed.

## Release Preconditions

1. `package.json`, the changelog heading, tag, archive name, and release title use the same SemVer version.
2. Node 24 and 26 pass on Windows and Linux.
3. `npm ci --ignore-scripts`, `npm run lint`, `npm test`, and `npm run build` pass from a clean checkout.
4. Bash and PowerShell installers and uninstallers pass their platform checks.
5. The installable payload includes `README.md`, `SKILL.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, routed references, scripts, schemas, and no private artifacts.
6. `npm run release:package -- --source-commit "$(git rev-parse HEAD)"` creates a deterministic archive, manifest, and checksums only when that commit matches a clean repository `HEAD`.
7. The packager reopens the generated files, verifies both checksums, parses the tar defensively, safely extracts it into a temporary directory, and compares every extracted byte with the manifest.
8. Public screenshots, videos, and assets have documented provenance and a redistribution basis. Review confirms the repository's declared inputs; it is not a legal-clearance opinion.
9. Benchmark status and claims match the actual result data. Pending results cannot support a quality claim.
10. The pre-publication history privacy gate below has a dated maintainer decision and independent review record.

For local builds that cannot make a commit-level provenance claim, pass `--source-commit unknown`. If the payload intentionally contains worktree changes, pass `--source-commit uncommitted`. Both states keep `source.commit` null in `release-manifest.json`; a syntactically valid but unverifiable SHA is rejected.

## GitHub Repository Settings

Enable these controls before publishing the first release:

- restrict Actions to GitHub-owned and explicitly approved actions;
- require full commit SHA pinning for Actions;
- enable dependency graph, Dependabot alerts, and security updates;
- keep the committed weekly root/showcase dependency-audit workflow green;
- enable secret scanning and push protection where the plan supports them;
- enable private vulnerability reporting;
- enable CodeQL default setup or keep the committed full-SHA CodeQL workflow;
- enable immutable releases before the first non-draft release;
- add the repository description, homepage, social preview, and topics listed in the README;
- keep benchmark secrets and paid provider credentials in a protected `benchmark` environment.

## Pre-Publication History Privacy Gate

The current pre-publication Git history is **unreviewed and therefore not cleared for public push**. A clean working tree, release archive, or current-tree secret scan does not prove that older commits, deleted files, commit identities, tags, or other reachable objects are safe.

Before creating or pushing the public repository:

1. Freeze public-push activity and record the exact local source commit under review.
2. Enumerate all refs and reachable objects, including old branches and tags. Review object paths and historical file contents for platform-specific absolute home/workspace paths, client or internal names, credentials, private URLs, customer data, private captures, and other non-public material.
3. Export commit author and committer names/emails across all refs. Confirm each identity is intentionally public; personal email addresses are a privacy failure even when no secret is present.
4. Run a history-aware secret scanner over every reachable commit, not only the current checkout. Independently review scanner findings and common false-negative classes such as renamed binary archives, generated logs, and deleted environment files.
5. Choose and record exactly one publication strategy:
   - **Fresh public repository:** publish the reviewed current tree as new public history. This is the default when historical continuity is not essential.
   - **Authorized history rewrite:** only the repository owner may explicitly authorize a rewrite after a private backup. Remove sensitive objects and identities from every affected ref, then repeat the complete gate against the rewritten repository.
6. Configure future commits to use the contributor's intended public identity, preferably a GitHub-provided `users.noreply.github.com` address, before the first public commit. Do not paste a private address into examples, CI logs, or review records.
7. Have a second reviewer confirm the selected strategy, the scan scope, unresolved limitations, and the exact commit/ref set approved for publication.
8. Push only after that record is complete. Re-run the gate if refs or history change before the first public push.

This gate does not authorize rewriting or deleting history by itself. Do not rewrite the existing repository during ordinary release preparation, and never describe the old history as clean until the full history-aware review has passed.

Recommended topics:

```text
agent-skills codex frontend-design web-design ui-ux design-system
playwright gsap accessibility core-web-vitals
```

## Branch And Tag Rules

For `main`:

- require a pull request;
- require the release validation, `DCO sign-off / dco`, and CodeQL checks;
- require conversation resolution and an up-to-date branch;
- block force pushes and deletion;
- keep emergency bypass narrow and auditable.

For `v*` tags:

- block deletion and retargeting;
- allow creation only through the release process;
- require the tag version to equal `package.json`.

## Release Workflow

The tag workflow separates unprivileged construction from publication. The `build` job has read-only repository access while it re-runs validation, builds deterministic artifacts from the clean tagged `HEAD`, runs the packager's safe extraction check, verifies `SHA256SUMS` with the runner toolchain, independently unpacks the archive, and uploads a workflow artifact. Only the dependent `publish` job receives `contents: write`, `id-token: write`, and `attestations: write`; it downloads the exact artifact, verifies `SHA256SUMS` again, creates build-provenance attestation, and opens a draft GitHub release. SemVer prerelease tags such as `v0.9.0-rc.1` are also marked as GitHub prereleases. Review the draft before publication.

Publish in this order:

1. Merge the reviewed release commit.
2. Confirm required checks on that commit.
3. Create the exact `v<version>` tag.
4. Let the release workflow create a draft and attach all assets.
5. Verify `SHA256SUMS`, archive contents, manifest source state and commit, and attestation.
6. Publish the draft.
7. Enable or confirm immutable release enforcement.
8. Test the documented installation from the release artifact on a clean machine.

Do not create a stable `v1.0.0` until the scored blind benchmark, failed runs, jury method, shipping results, and limitations are public. Until then, use release-candidate language and keep the evidence table explicit.

## Benchmark Publication

Benchmark runs are separate from ordinary CI. They require a frozen protocol, exact condition commits, fixed asset packets, a sealed holdout commitment, cost authorization, and an independent jury. Never run paid or secret-bearing workflows on pull requests or forks.

Repository-authored benchmark builds and first-party evidence may use immutable release artifacts or approved content-addressed storage with SHA-256 manifests when their publication basis is documented. Git history should contain compact repository-authored thumbnails, result data, pseudonymous and redacted votes, failures, checksums, and reproduction instructions.

Raw third-party screenshots, videos, traces, HAR files, DOM archives, source bundles, fonts, or brand assets must never enter a release artifact. They stay in the private OS-local evidence cache and follow the retention schedule in [REFERENCE_POLICY.md](REFERENCE_POLICY.md). Before publishing a release, inspect both the archive and attached workflow artifacts for private capture paths, juror contact mappings, unredacted free text, credentials, customer data, and absolute local paths.
