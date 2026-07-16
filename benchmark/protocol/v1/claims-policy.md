# Claims Policy

## Current Permitted Claim

The repository contains a structurally validated benchmark MVP with public
calibration briefs. Results are pending. It does not yet show that any condition
produces better websites.

## Evidence Levels

### Structural

Allowed when schemas, manifests, scripts, and tests pass:

> The benchmark definition and release surface pass the named deterministic
> checks.

This says nothing about rendered quality.

### Calibration

Allowed after all declared calibration slots and failures are public:

> The benchmark harness completed its calibration matrix under protocol X.

Calibration may reveal defects in the method but cannot support a market claim.

### Improvement Versus Baseline

Allowed only when the preregistered primary endpoint is complete, its lower 95%
confidence bound exceeds 50%, run coverage is complete, and shipping is not
materially worse:

> Frontend Design Ultra was preferred to the no-design-skill baseline under
> Benchmark X and the published conditions.

### Best Among Tested

Allowed only after preregistered comparisons against every named condition,
multiple-comparison handling, complete run disclosure, and shipping
non-inferiority:

> Frontend Design Ultra performed best among the conditions tested in Benchmark
> X.

Do not shorten this to “best UI skill,” “best on GitHub,” “award guaranteed,” or
“objectively Awwwards quality.”

## Prohibited Practices

- selecting the best replicate and hiding the others;
- excluding build failures from completion or shipping rates;
- treating calibration briefs as sealed evidence;
- presenting AI scoring as an independent human jury;
- publishing official-looking Awwwards scores or predicted awards;
- merging creative and shipping results into an unexplained single rank;
- suppressing missing captures, failed runs, juror disagreement, or limitations;
- redistributing third-party code, assets, screenshots, or videos without
  documented original, licensed, or otherwise permitted use and publication
  rights;
- calling pseudonymous juror records anonymous;
- publishing a partial or complete result without the required documented
  publication-rights review.

Machine-readable result claims use the controlled
`improvement-vs-baseline` claim ID only. Free claim text is not accepted.
Calibration evidence never unlocks that claim. Scored claims additionally
require complete coverage, verified freeze/reveal artifacts, a deterministically
recomputed scorecard, a lower 95% confidence bound above 50%, shipping
non-inferiority, and an approved publication decision.

Showcase websites must be labeled as curated, human-directed examples and not
blind benchmark outputs.
