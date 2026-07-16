# Frontend Design Ultra Benchmark

This directory is an independent evaluation subsystem. It is not installed with
the `frontend-design-ultra` skill and it does not make the skill larger at
runtime.

The benchmark has two separate evidence systems:

- Creative evidence: condition-blind human pairwise preference plus the four
  declared creative dimensions.
- Shipping evidence: build, correctness, accessibility, responsive, motion,
  performance, content-integrity, and runtime gates.

A creative result never cancels a shipping failure. A structurally valid
benchmark repository is not evidence that the skill improves rendered sites.

## Current Status

`pending`

- Completed model runs: 0
- Completed blind comparisons: 0
- Published visual-effect claims: none
- Holdout: not created or committed
- Condition source commits: not yet pinned
- Browser/toolchain revisions: not yet pinned

The six included briefs are public calibration fixtures. They are intended to
exercise the harness before a scored dataset exists and must not be included in
a market-leadership claim.

## MVP Matrix

The declared calibration matrix contains:

- 6 fictional public briefs across hospitality, legal, finance, healthcare,
  SaaS, and e-commerce;
- 4 conditions;
- 3 independent replicates;
- 72 planned calibration run slots;
- 0 executed slots.

Every condition receives the same facts, content requirements, asset packet,
starter commit, model snapshot, tool permissions, time/token budget, and repair
budget. The primary track has network access and image generation disabled after
the environment is prepared.

## Commands

Validate the benchmark definition without installing dependencies:

```bash
node benchmark/scripts/validate.mjs
```

Run benchmark subsystem tests:

```bash
node --test benchmark/scripts/tests/*.test.mjs
```

Create a salted public commitment for a private holdout directory:

```bash
node benchmark/scripts/commit-holdout.mjs \
  --input /private/holdout-v1 \
  --output benchmark/protocol/v1/commitments/holdout.commitment.json \
  --salt-file /private/holdout-v1.salt \
  --protocol-file benchmark/protocol/v1/protocol.json
```

The salt and cleartext holdout remain outside the public repository until the
jury votes are frozen. V3 binds the holdout to an immutable freeze digest over
the protocol, matrix, conditions, environment, capture profiles, schemas,
calibration fixtures, methodology documents, and benchmark scripts/tests.
Lifecycle-only status fields are normalized out, so publishing results does not
invalidate a legitimate pre-run commitment. Verify a revealed bundle with
`--verify` and the same arguments.

Create blind comparison packets from completed run manifests:

```bash
node benchmark/scripts/anonymize.mjs \
  --input /private/runs.json \
  --packet /private/jury-packet.json \
  --mapping /private/condition-map.json \
  --key-file /private/anonymization.key \
  --artifact-root /private/run-artifacts \
  --artifact-dir /private/jury-evidence
```

Every successful run manifest supplies six evidence descriptors with a relative
source path, media type, byte count, SHA-256 digest, capture dimensions, probe
attestation, and timing metadata. Motion clips must be at least three seconds,
contain multiple frames, and bind the recorded actions and timestamps. The
anonymizer verifies content digests and media signatures, rejects embedded
condition/run identifiers and common EXIF/XMP/text/location metadata, then
copies the files to opaque jury paths. A signature check is not a decoder; the
frozen capture workflow must still perform the pinned Playwright/Chromium and
media-probe decode pass before jury delivery.

The live jury receives only the blind packet and staged `jury-evidence`
directory. Public descriptors use keyed blind digests, not the source content
hashes from condition-named run manifests. The mapping, key, labeled manifests,
votes, and source artifacts remain outside the public repository until vote
freeze. Public vote files contain controlled tags and invalidity codes only;
free-text comments are always `null`.

The randomization seed is intentionally recorded verbatim for reproducibility.
Use a public, non-secret, non-identifying seed; never place a condition name,
person, email, client identifier, or credential in it.

Post-freeze run manifests belong in `results/v1/run-manifests/`; pseudonymous
structured jury votes belong in `results/v1/jury-votes/`; delivered bytes belong
in `results/v1/jury-evidence/`; and the revealed packet belongs at
`results/v1/jury-packet.json`. `vote-freeze.json` binds the exact packet, vote
files, and evidence bytes. `jury-mapping.reveal.json` publishes the key so the
validator can regenerate all opaque IDs, sides, and assignments.
`holdout-reveal.json` publishes the salt and revealed bundle location so the
original commitment can be recomputed. `scorecard.json` is derived
deterministically from these inputs:

```bash
node benchmark/scripts/score-results.mjs --root benchmark
```

`partial` and `complete` publication states fail closed when required freeze,
reveal, rights, or scoring bindings are absent. Juror identifiers are
pseudonyms, not anonymous identities.

## Run Preconditions

Do not execute or publish a scored run until all of these are true:

1. `protocol/v1/protocol.json` and `matrix.lock.json` are tagged and immutable.
2. Every condition has an exact source commit, verified license, install path,
   and effective-context SHA-256.
3. Model, starter, Node, package-manager, Playwright, browser, fonts, locale, and
   capture environment are pinned.
4. A salted holdout commitment is public while its cleartext remains private.
5. Invalidation, rerun, jury exclusion, and claims rules are frozen.
6. Every supplied asset has machine-readable provenance and documented
   original, licensed, or otherwise permitted use and publication rights.
7. Jury consent, pseudonymization, retention, redaction, independence, invalid
   vote, and minimum-coverage rules are frozen.
8. The publication-rights review process in
   `protocol/v1/publication-review.md` is ready for the final evidence set.
9. Retry limits are frozen. Every run manifest retains ordered generation and
   capture attempts; only infrastructure-invalid attempts may be retried.

## Large Artifacts

Raw builds, videos, traces, and full-resolution screenshots should be stored as
content-addressed release artifacts or in approved object storage. The Git
repository should contain schemas, manifests, checksums, compact thumbnails,
pseudonymous redacted votes, the documented rights review, and derived results.
Third-party website captures must not be published unless their use and
publication rights are documented; reference scans are research inputs, not
automatically redistributable benchmark assets.
