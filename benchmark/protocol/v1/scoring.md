# Scoring Specification

Status: **deterministic primary scorer implemented; protocol freeze pending**.

## Primary Creative Endpoint

For each matched brief and replicate, a juror chooses `left`, `right`, `tie`, or
`invalid`. After unblinding, a Frontend Design Ultra win is 1, a loss is 0, and a
tie is 0.5. Invalid comparisons are reported and excluded only under the frozen
invalidity rules. An invalid vote requires a concrete reason and carries no
dimension scores. Complete results require at least three valid votes per
comparison and at least five distinct independent pseudonymous jurors.

Report preference share with a 95% confidence interval resampled at the brief
level. Runs and jurors remain nested inside their brief during resampling.
`score-results.mjs` uses 10,000 SHA-256-counter bootstrap iterations, integer
parts-per-million outputs, and an input-derived seed. The validator recomputes
the complete scorecard and rejects drift.

## Creative Dimensions

The jury separately evaluates:

| Dimension | Weight | Focus |
|---|---:|---|
| Design | 40% | Composition, typography, palette, assets, rhythm, responsive craft |
| Usability | 30% | Clarity, navigation, readability, interaction, task and action path |
| Creativity | 20% | Subject-specific concept and justified signature move |
| Content | 10% | Message, proof, voice, media, trust and next action |

The weighted value is descriptive. It does not override pairwise preference or
binary shipping gates. Report medians, distributions, missing values, and juror
agreement rather than only one average.

## Shipping Results

Each applicable gate is `pass`, `fail`, `needs-review`, or `not-applicable` and
references machine or manual evidence. Report at least:

- run completion and production build;
- route and required-content completion;
- semantic and keyboard accessibility;
- responsive overflow, overlap, clipping, and control usability;
- console, page, network, and hydration health;
- reduced-motion completeness;
- agreed lab budgets, clearly separated from field data;
- fabricated proof and public-output integrity.

A known failure cannot become `needs-review`. A missing build remains a failed
completion/shipping result even though no visual comparison can be rendered.
The current deterministic scorecard reports run completion by condition and a
frozen 5 percentage-point non-inferiority margin versus baseline. The seven
detailed shipping-gate assessments remain a release precondition before the
scored protocol can be frozen; completion rate is not a substitute for them.

## Secondary Statistics

- all-condition pairwise estimates using a tie-aware model;
- Holm-adjusted pairwise comparisons;
- inter-rater agreement and left/right bias;
- results by industry, marked exploratory when underpowered;
- token use, elapsed time, tool calls, repair loops, and implementation churn;
- failure, invalid-capture, and fabricated-claim rates.

Do not publish a universal leaderboard from calibration data.
