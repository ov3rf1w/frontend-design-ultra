# Holdout Commitments

No holdout commitment exists yet. The protocol and results therefore remain
`pending`.

When the private holdout is ready, generate
`holdout.commitment.json` with `benchmark/scripts/commit-holdout.mjs`. Commit only
the public commitment. Keep its salt, canonical private manifest, and cleartext
brief bundle outside this repository until pseudonymous jury votes are frozen.

V3 binds the private file manifest to both `benchmarkVersion` and a canonical
protocol-freeze digest. That digest covers all protocol V1 files except the
self-referential `commitments/` directory. JSON is canonicalized. Mutable
lifecycle-only fields in `protocol.json` and `matrix.lock.json` are normalized
out; methodology, schemas, conditions, environment pins, capture profiles,
calibration fixtures, scoring text, and benchmark scripts/tests remain bound.
Verification recomputes that freeze digest and therefore detects substantive
post-freeze changes without breaking when only run/result status advances.
