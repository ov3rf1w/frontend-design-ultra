# Reference Intelligence

The public reference corpus is a research index, not a screenshot pack and not a claim that every live site currently behaves as described.

Every record starts as `candidate`; lifecycle counts are machine-readable and may later become mixed.

Hero and motion fields are hypotheses until a documented browser capture and human visual review verify them.

## Contents

- [Purpose](#purpose)
- [Source files](#source-files)
- [Status model](#status-model)
- [Reference taxonomy](#reference-taxonomy)
- [Query workflow](#query-workflow)
- [Diversity rules](#diversity-rules)
- [Browser scan workflow](#browser-scan-workflow)
- [Animation evidence](#animation-evidence)
- [Promotion workflow](#promotion-workflow)
- [Promotion scorecard](#promotion-scorecard)
- [Rights and publication workflow](#rights-and-publication-workflow)
- [Using references in design work](#using-references-in-design-work)
- [Maintenance](#maintenance)
- [Quality checks](#quality-checks)

## Purpose

The corpus exists to give the skill a broad, queryable starting point for premium interface research.

It is intentionally multi-industry.

It includes hospitality, editorial publishing, luxury, creative studios, SaaS, ecommerce, legal services, finance, healthcare, data journalism, science and experimental interaction.

It is intentionally multi-lane.

It should prevent a narrow definition of premium that defaults to one typography treatment, one cinematic hero or one smooth-scroll pattern.

The corpus has four jobs:

1. Route research toward relevant live references.
2. Create contrast between different design approaches.
3. Supply hypotheses for a reproducible browser scan.
4. Promote only verified, transferable mechanics with an explicit publication-rights classification into durable skill guidance.

The corpus does not:

- redistribute third-party screenshots or videos;
- mirror third-party production code;
- grant rights to third-party brands, fonts, imagery or motion assets;
- prove that a candidate is usable, accessible or performant;
- prove that an award listing remains current;
- replace project-specific user research.

## Source files

The machine-readable corpus is stored in `../assets/reference-corpus.json`.

Its contract is stored in `../assets/reference-corpus.schema.json`.

Sanitized strict observations are stored in `../assets/reference-observations.json` and validated by `../assets/reference-observations.schema.json`. Only complete, fresh Capture Contract v2 attempts that pass the stricter artifact and reduced-motion integrity checks are eligible. Their aggregate evidence digest binds the manifest, derived record, contact sheet, and every referenced screenshot, video, trace, and reduced-motion artifact without publishing individual hashes or paths.

The newest relevant Capture Contract v2 attempt for each scanned reference is published separately in `../assets/reference-scan-outcomes.json`, validated by `../assets/reference-scan-outcomes.schema.json`. This diagnostic-only surface contains allowlisted issue and limitation codes, per-viewport sample/artifact/runtime counts, rights boundaries, and status summaries. It never contains raw captures, capture IDs, resume keys, source code, copied assets, private filenames, or local paths, and it is never motion-verification evidence.

The initial dataset contains 76 records observed on 2026-07-15.

The current lifecycle counts are stored in `statusCounts` rather than frozen in prose.

The current newest-attempt scan split is exact: 20 diagnostic outcomes comprise 11 scanner-complete, 7 partial, 0 failed, and 2 unsupported attempts. Seven complete attempts pass strict observation eligibility; the other 13 remain diagnostic-only, including four scanner-complete attempts rejected by stricter observation-integrity checks. Partial, failed, unsupported, and strict-ineligible complete outcomes never become normal observations or motion-verification evidence. All seven published observations remain human-review-pending and are not promoted design guidance.

Twenty records have `scanPriority: must-scan` because they cover the most important lane and industry contrasts.

Reachability is only a dated HTTP observation.

It is not equivalent to a successful browser render.

An HTTP 403 or 429 can indicate bot protection rather than an offline site.

An HTTP 200 can still return a challenge page, empty application shell or locale redirect.

## Status model

### `candidate`

A publicly linked site selected for possible study.

Its hero and motion descriptions are hypotheses.

Do not describe a candidate mechanic as observed fact.

Candidate records require no stored screenshot, video or third-party source.

### `scanned`

A candidate with documented browser evidence that has been visually reviewed by
a human against the capture contract. Machine capture alone stays in the
observation catalog and does not change the corpus lifecycle state.

The evidence must cover at least:

- one desktop viewport;
- one mobile viewport;
- the initial load state;
- the hero idle state;
- the relevant interaction or scroll sequence;
- the reduced-motion state or its absence;
- the scan timestamp;
- the effective source URL after redirects.

A scan verifies what happened during that session only.

It does not establish a permanent property of the site.

An exploratory system-browser scan is not comparable benchmark evidence. Official benchmark capture requires the pinned environment and capture contract declared by the benchmark protocol.

### `promoted`

A scanned reference whose mechanic is useful beyond its source site.

Promotion requires:

- evidence-backed mechanic description;
- a documented purpose;
- transfer guidance;
- mobile and reduced-motion behavior;
- performance and accessibility notes;
- rights classification;
- an original reconstruction recipe or implementation.

Only promoted mechanics may be treated as stable skill intelligence.

### `retired`

A record that should not be selected for new work.

Common reasons include:

- source removed or materially replaced;
- persistent access failure;
- mechanic no longer reproducible;
- rights ambiguity;
- duplicate learning value;
- promotion evidence found the original hypothesis to be misleading.

Retirement preserves the stable ID and explains the history.

Never reuse a retired ID for a different source.

## Reference taxonomy

### `archive-catalog`

Information or products become an explorable collection.

Study indexing, sorting, grouping, category transitions and density.

### `calm-luxury`

Premium value is created through restraint, material imagery, spacing and controlled pacing.

Study whether clarity survives the restraint.

### `cinematic-immersion`

Film, photography, sound or staged sequences create a narrative world.

Study load cost, user control, pacing and mobile alternatives.

### `data-narrative`

Data changes state as the user progresses through an explanation.

Study annotation, narrative order, chart transitions and fallback access to the information.

### `editorial-engine`

Typography, hierarchy and modular story systems carry the experience.

Study content variety, reading rhythm and how templates preserve identity.

### `expressive-typography`

Type behaves as a primary visual or kinetic material.

Study legibility, line breaking, variable-font behavior and reduced-motion handling.

### `playful-interaction`

The interface rewards exploration through cursor, drag, game or unexpected state changes.

Study discoverability, keyboard access, touch replacement and whether play supports the product goal.

### `product-choreography`

Product states, devices, interfaces or diagrams are sequenced to explain value.

Study explanatory order, pinned sections, image sequences and truthful product representation.

### `spatial-webgl`

Navigation or storytelling happens in a rendered spatial scene.

Study loading, GPU cost, input alternatives, mobile behavior and recovery when WebGL fails.

### `systemic-clarity`

Precision, hierarchy and reusable interface patterns create the premium result.

Study density, component consistency, feedback and conversion paths.

### `trust-narrative`

The interface combines evidence, clarity and human reassurance in a consequential domain.

Study proof placement, uncertainty, claims, forms and accessible task completion.

## Query workflow

Do not ask the corpus for one visually similar site and copy the whole page.

Query it as a contrast set.

### Step 1: Translate the project brief

Identify:

- industry and subject world;
- user task;
- trust level;
- primary asset carrier;
- acceptable motion cost;
- technical constraints;
- desired and prohibited design lanes.

### Step 2: Exclude unsuitable candidates

Exclude by default when:

- `scanPriority` is `fallback` and an accessible alternative exists;
- scan risk exceeds the project's evidence budget;
- the asset dependency cannot be met;
- the source industry creates a misleading analogy;
- the project requires accessibility or performance behavior the candidate cannot help evaluate.

### Step 3: Select a contrast set

Choose three to five references.

Each reference must have a different job.

Example:

- one for editorial hierarchy;
- one for conversion or product clarity;
- one for motion or spatial behavior;
- one for subject-world imagery;
- one for trust and evidence placement.

### Step 4: Preserve source IDs

Every research note should cite the corpus ID and live URL.

Example:

```text
ref-011 — editorial hierarchy candidate
ref-035 — product clarity candidate
ref-067 — data transition candidate
```

This allows later scans to correct a hypothesis without losing provenance.

### Step 5: State uncertainty

Before scan, use language such as:

```text
Hypothesis: the hero appears to use a pinned product sequence.
Verification required: trigger, duration, mobile adaptation and reduced-motion behavior.
```

After scan, replace the hypothesis with evidence-backed language and preserve the observation date.

## Diversity rules

A premium reference set must avoid aesthetic collapse.

For a normal project query:

- select at least three design lanes;
- include at least one usable or conversion-led reference;
- include no more than two references from the same studio category;
- include no more than two references whose primary mechanic is WebGL;
- include at least one reference whose premium quality does not depend on cinematic media;
- include at least one reference from outside the client's direct competitor set;
- do not select only Awwwards-style portfolio or hospitality sites.

For an agency-wide review:

- sample every lane;
- sample legal, finance and healthcare separately;
- compare motion-heavy references with calm and systemic references;
- track which references are repeatedly selected;
- investigate repeated selection as a possible taste bias.

The corpus is a floor for diversity, not a fixed taste oracle.

## Browser scan workflow

Use a real browser only when the user, host and project policy authorize it.

Do not bypass authentication, paywalls, consent choices, anti-bot systems or geographic controls.

### 1. Preflight

Record:

- corpus ID;
- requested source URL;
- effective URL;
- scan date and time;
- browser and viewport;
- locale;
- color scheme;
- reduced-motion preference;
- consent state;
- access limitation.

Capture Contract v2 samples each entrance timestamp from a fresh isolated browser context and uses continuous video to preserve the motion between frames. This prevents a slow earlier screenshot from shifting every later sample. It also distinguishes a blocked public analytics or tracking subresource from a failed visual capture: the former is a recorded warning unless the affected step itself fails.

### 2. Desktop pass

Suggested baseline viewport: `1440 x 900`.

Capture or document:

- preloader before dismissal;
- first stable hero frame;
- hero after its initial entrance;
- navigation closed and open;
- 25%, 50%, 75% and 100% document progress;
- relevant hover, drag, carousel or cursor state;
- route transition when central to the mechanic;
- footer and conversion state.

### 3. Mobile pass

Suggested baseline viewport: `390 x 844`.

Check:

- whether the same mechanic remains;
- whether pinning becomes a simple reveal;
- whether horizontal behavior gains controls;
- whether pointer effects disappear safely;
- whether video and 3D are replaced;
- whether navigation and conversion remain usable;
- whether content order changes.

### 4. Reduced-motion pass

Set `prefers-reduced-motion: reduce`.

Record whether:

- the final state is visible without animation;
- pinned sections remain navigable;
- autoplay stops;
- parallax is removed;
- route transitions shorten or disappear;
- essential explanation is preserved.

### 5. Failure pass

Where safe and feasible, inspect:

- slow loading;
- failed video;
- unavailable WebGL;
- missing image;
- interrupted transition;
- keyboard-only navigation;
- touch-only navigation.

Do not manufacture destructive states on a third-party production service.

## Animation evidence

Screenshots are necessary but insufficient for motion analysis.

They do not preserve easing, timing, acceleration, direction, overlap or input causality.

A complete internal scan package can contain:

1. A keyframe contact sheet.
2. A short screen recording at original speed.
3. A structured timeline record.
4. A mechanic card.
5. An original reconstruction.

Raw captures remain private unless publication rights are documented.

### Minimum timeline fields

Record:

- trigger: load, scroll, hover, focus, drag, route or time;
- start and end condition;
- duration;
- easing estimate;
- scrub or time-based behavior;
- pinned or normal flow;
- affected layers;
- entry and exit states;
- interruption behavior;
- mobile adaptation;
- reduced-motion adaptation;
- likely performance carrier;
- confidence level.

Do not claim an exact easing curve, duration or library without observable evidence.

### Contact-sheet states

Prefer meaningful states over uniform screenshot intervals.

Recommended states:

- loader start;
- loader end;
- hero before entrance;
- hero settled;
- first user-triggered change;
- midpoint of the central sequence;
- final state;
- menu open;
- relevant hover or drag state;
- mobile replacement;
- reduced-motion replacement.

## Promotion workflow

Promotion is deliberately harder than scanning.

### Candidate to scanned

Require all of the following:

- a completed human visual-review checklist for the selected capture;
- successful browser render or documented access limitation;
- effective URL recorded;
- desktop and mobile evidence;
- reduced-motion inspection;
- hero hypothesis confirmed, corrected or rejected;
- motion hypothesis confirmed, corrected or rejected;
- interaction trigger identified;
- evidence timestamped;
- no raw third-party asset added to the public corpus.

If the page cannot be inspected, keep it `candidate` or mark it `retired`.

Do not promote from reputation, memory or an award listing alone.

### Scanned to promoted

Require all of the following:

- mechanic has a clear user or communication purpose;
- mechanic transfers beyond the original brand;
- reconstruction does not require copied brand assets;
- mobile and reduced-motion versions are defined;
- performance budget is stated;
- accessibility risks and mitigations are stated;
- original implementation or sufficiently detailed reconstruction exists;
- public evidence has an explicit rights classification;
- a second reviewer can reproduce the learning from the evidence.

### Promotion output

A promoted mechanic should produce a compact record containing:

- mechanic name;
- source IDs;
- purpose;
- anatomy;
- trigger and timeline;
- suitable industries;
- unsuitable contexts;
- asset requirements;
- mobile behavior;
- reduced-motion behavior;
- accessibility risks;
- performance costs;
- implementation recipe;
- evidence confidence;
- rights status.

Promote the learning, not the source site's identity.

## Promotion scorecard

Score each scanned mechanic from 0 to 5:

| Dimension | Question |
|---|---|
| Purpose | Does the mechanic improve comprehension, navigation, emotion or conversion? |
| Distinctiveness | Does it create recognizable character beyond a common reveal? |
| Transferability | Can it serve more than one brand without becoming imitation? |
| Evidence | Are trigger, states, mobile and reduced motion verified? |
| Feasibility | Can the current stack implement it within a clear budget? |
| Resilience | Does it degrade safely when motion, media or WebGL is unavailable? |

Suggested promotion threshold: 24/30.

No score overrides a hard failure in rights, accessibility evidence or source attribution.

Common reasons not to promote:

- visually impressive but no user purpose;
- depends entirely on proprietary film or product photography;
- unusable on touch or keyboard;
- no reduced-motion equivalent;
- impossible to reconstruct without copying protected assets;
- timing cannot be verified;
- duplicates an existing promoted mechanic;
- only works as a complete page imitation.

## Rights and publication workflow

The public repository stores derived intelligence.

It does not store a downloadable collection of third-party websites.

### Public by default

The following can be public when accurately attributed:

- source title;
- source URL;
- observation date;
- reachability result;
- derived industry and lane taxonomy;
- abstract mechanic description;
- scan methodology;
- original code and original demonstration assets;
- links to official award or provenance pages.

### Private by default

Keep the following private unless publication rights are documented:

- full-page third-party screenshots;
- screen recordings;
- downloaded images or video;
- copied CSS, JavaScript, shader code or production bundles;
- extracted fonts;
- logos and brand systems;
- authenticated or paywalled states;
- personal data visible during a scan.

### Original reconstruction

The preferred public artifact is an original mechanic reconstruction.

It must:

- use repository-owned or properly licensed assets;
- use original implementation code;
- name the mechanic generically;
- cite inspiration sources;
- avoid source trademarks in the demo UI;
- avoid source copy and product claims;
- define reduced-motion behavior;
- include accessibility and performance constraints.

Reproducing a general interaction idea is different from redistributing source code or assets.

When rights are uncertain, publish the abstract analysis and source link only.

### Evidence classification

Assign one class before publishing scan evidence:

- `link-only`: source URL and derived notes only;
- `private-capture`: internal screenshot or recording, not redistributed;
- `permission-granted`: publication permission documented;
- `licensed-asset`: asset license documented;
- `original-reconstruction`: repository-owned implementation and assets.

Only the last three classes may include public media, subject to their terms.

This workflow is operational guidance, not legal advice.

## Using references in design work

References should inform a synthesis, not determine a page clone.

For each selected source, extract one job:

```text
Source: ref-002
Job: pacing and floating image choreography
Do not transfer: resort photography, copy, palette or exact layout
```

Then ground the design in the client subject world:

- real customer tasks;
- credible content;
- available assets;
- brand position;
- industry proof;
- technical constraints;
- conversion path.

Combine mechanics from different lanes only when their purposes support one another.

Avoid stacking motion because several references use motion.

One strong signature mechanic usually needs calmer supporting sections.

For three concept routes, vary the source logic:

- Route A can lead with editorial structure.
- Route B can lead with product or conversion clarity.
- Route C can lead with cinematic or playful interaction.

Do not create three routes that differ only in color, font or animation intensity.

## Maintenance

The live web changes continuously.

### On every corpus update

- update `capturedAt`;
- preserve stable IDs;
- add new IDs sequentially;
- record redirects in provenance notes;
- update reachability without treating it as scan evidence;
- keep hypotheses explicitly marked;
- do not silently replace a source under an existing ID;
- update `entryCount`;
- validate against the schema.

### Suggested cadence

- reachability check: monthly;
- must-scan freshness review: quarterly;
- promoted mechanic review: every release;
- rights review: before any public media publication;
- duplicate and selection-bias review: every six months.

### Selection-bias audit

Track which IDs appear in project research.

Flag when:

- one studio supplies more than 15% of selected references;
- one lane supplies more than 35%;
- hospitality and agency sites dominate unrelated industries;
- high-risk WebGL references are selected more often than systemic references;
- the same hero mechanic appears in several recent builds.

Use these flags to widen research, not to ban a source automatically.

## Quality checks

Before accepting a corpus change, verify:

- JSON parses;
- JSON validates against `reference-corpus.schema.json`;
- `entryCount` matches the number of records;
- IDs are unique and sequential;
- source URLs are unique and use HTTPS;
- every new item begins as `candidate`;
- every candidate has explicit hero and motion hypotheses;
- every record has industry, design lane, asset dependency, scan risk, provenance and priority;
- no private filesystem path appears;
- no third-party screenshot, video, code, copy or asset appears;
- award references point to official award pages;
- `scanned` and `promoted` records include scan evidence;
- promoted mechanics have an original reconstruction and a documented publication-rights classification.

The corpus becomes valuable through disciplined correction.

Its initial hypotheses are not the product.

The verified, reusable mechanics and their documented publication boundaries are the product.
