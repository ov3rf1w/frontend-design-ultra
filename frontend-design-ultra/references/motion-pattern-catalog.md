# Motion Pattern Catalog

Use this reference after the design lane, page job, asset gate, and motion intensity are known. The machine-readable source is `assets/motion-patterns.json`; its contract is `assets/motion-patterns.schema.json`.

## Contents

- Purpose
- Status Model
- Retrieval Contract
- Pattern Selection
- Evidence And Promotion
- Reconstruction Boundary
- Capture Contract
- Pattern Index
- Failure Rules
- Contribution Contract

## Purpose

The catalog is a motion decision system, not an effect buffet. Every pattern states:

- the information job it performs;
- the narrative role it serves;
- suitable and unsuitable page types;
- a normalized timeline;
- desktop, mobile, reduced-motion, and no-JavaScript behavior;
- asset and runtime budgets;
- implementation ownership;
- failure modes and a verification contract, with build evidence only for verified states;
- source relationships and documented publication-rights basis.

Select motion only after content hierarchy and asset reality are solved. A page gets at most one signature pattern per major viewport. Microinteraction patterns may support it only when they do not compete for attention or transform ownership.

## Status Model

- `idea`: a useful hypothesis without implementation or evidence.
- `candidate`: a grounded proposal whose original reusable contract has not yet been accepted as complete.
- `recipe`: a complete, original mechanism and implementation contract, including timeline, ownership, fallbacks, budgets, and verification requirements. It does not claim that code or a build exists.
- `verified`: implemented in an original build and passed its listed technical and visual checks with complete verification evidence.
- `promoted`: repeated successfully across different page jobs without becoming a house-style default.

Do not describe a candidate or recipe as built, tested, or proven. A machine capture can support source observation, but it cannot verify an original implementation.

Current catalog snapshot: 16 recipes and 3 candidates. No pattern is labelled `verified` until an original build, repository-relative implementation path, exact commit, evidence digest, viewport set, completed checks, and review type are attached.

## Retrieval Contract

Filter by the current design contract:

```text
domain + primary lane + effect job + asset budget + motion dial
+ mobile constraint + reduced-motion requirement + runtime budget
```

Return no more than three matches. For each match, explain:

1. why its information job matches the section;
2. what assets it needs;
3. the specific mobile replacement;
4. the specific reduced-motion final state;
5. the main failure risk;
6. the capture states needed to verify it.

Reject a pattern when the design lacks the assets, content, runtime budget, or fallback needed to make the final static state work.

## Pattern Selection

Choose the information job first:

- `orientation`: show location, chapter, direction, or spatial relationship;
- `hierarchy`: establish reading order and focal priority;
- `causality`: connect a user action, claim, or scroll step to a visible state change;
- `continuity`: bridge sections, routes, or related objects;
- `pacing`: control attention and narrative tempo;
- `delight`: add character only after clarity is complete.

If a proposed motion has no job, remove it. If two signature patterns have the same job in one viewport, keep the stronger one.

## Evidence And Promotion

A pattern moves from `candidate` to `recipe` when its original mechanism and implementation contract is complete. This transition does not assert code, a build, or verification. A `recipe` moves to `verified` only after an original implementation exists and the following evidence is reviewed:

- entrance or pre-interaction frame;
- anticipation frame;
- main transition at roughly 25, 50, and 75 percent;
- settled final frame;
- mobile alternative;
- reduced-motion final frame;
- console and request failures;
- a video or trace when timing, easing, drag, pointer, or scroll behavior matters;
- performance and accessibility risks against the pattern budget.

Promotion to `promoted` requires use in more than one subject world with a changed composition, asset language, type system, and page job. Repetition alone is not promotion.

## Reconstruction Boundary

Reference mechanics may be studied through clean-room, mechanism-level abstraction. Public reusable implementations must use original code and owned, generated, public-domain, or compatibly licensed assets, and must visibly differentiate composition, typography, palette, copy, asset language, and the combined motion sequence.

Do not publish third-party:

- page screenshots or videos without rights;
- source code or production bundles;
- brand copy, logos, icons, typefaces, or campaign media;
- a complete trade-dress clone presented as original work.

A source URL and access date do not grant republication rights. Raw Playwright
captures belong in the private OS-local evidence cache outside the repository;
gitignore is not a privacy boundary. Public entries store derived mechanics,
original recipes, and source relationships.

## Capture Contract

For motion-rich references use `scripts/scan-reference.mjs`. The default contract records:

- desktop at 1440 by 900;
- mobile at 393 by 852;
- seven navigation-commit-anchored entrance frames from fresh isolated browser contexts from first paint through 3500ms, with target/actual timing and drift status;
- ten target-versus-actual scroll states from 0 through 100 percent against the verified scroll surface;
- settled full-page views;
- reduced-motion first viewport and full page;
- an explicit-dimension continuous video that preserves motion between sampled frames;
- opt-in private Playwright traces for targeted diagnosis;
- bounded `document.getAnimations()` timing plus computed-state and geometry signals;
- library, sticky, fixed, canvas, video, overflow, font, console, and request signals;
- a private raw manifest and a sanitized `derived-motion.json` mechanics record under Capture Contract v2.

The scanner separates network-policy warnings from failed evidence. A blocked public analytics or tracking subresource remains visible in the private manifest, but it does not downgrade otherwise complete visual evidence unless the relevant capture step fails. Raw captures default to a private OS-local cache outside the repository; repository-local and known cloud-synchronized paths are rejected because gitignore is not a privacy boundary.

Public ingestion has two separate outputs. `assets/reference-scan-outcomes.json` records sanitized diagnostic status, eligibility, limitations, rights, and per-viewport counts for each newest relevant attempt; it is never motion-verification evidence. `assets/reference-observations.json` contains only strict complete attempts, and its aggregate digest binds the manifest, derived record, contact sheet, and every referenced screenshot, video, trace, and reduced-motion artifact. Partial, failed, unsupported, and strict-ineligible complete attempts cannot supply a motion source digest.

Extra clicks and hovers must be opt-in selectors. Never auto-navigate authenticated, destructive, private, paid, or client-confidential states.

## Pattern Index

### Editorial Curtain Reveal

Use for one decisive editorial opening. The complete final content must exist underneath the enhancement, and navigation must never wait for the curtain.

### Pinned Chapter Hand-off

Use when one media stage genuinely explains a short sequence of claims. Remove pinning on mobile and reduced motion.

### Kinetic Type Line Reveal

Use art-directed line groups, not decorative per-character noise. Preserve natural reading order and localization behavior.

### Floating Image Convergence

Use only with a strong, art-directed asset family. The motion should gather narrative fragments into one focal proof, not create a generic collage.

### Product Object Stage

Keep a real product or interface visible while claims change its state. Do not fabricate product proof.

### Cursor Media Preview

Use for a labelled index on fine pointers. Touch and keyboard need explicit, equally informative alternatives.

### Route Curtain Transition

Use for editorial continuity when route changes are already fast. Preserve back/forward, focus, cancellation, and native fallback.

### Horizontal Catalog Chapter

Use for a finite sequence with visible direction and progress. Never map an unlimited archive or essential reading to a pinned lateral track.

### Parallax Depth Stack

Use small relative travel to connect layers. Preserve subject crops at both extremes and disable it for reduced motion.

### Archive Filter Morph

Use visible reflow to explain a filter result change. Preserve focus, URL state, and a live result count.

### Image Sequence Scrub

Use only when frames explain a meaningful physical transformation. A poster and mobile still-state alternative are mandatory.

### Data Scrollytelling Stepper

Use one state per explanatory claim while axes, units, source, and accessible data remain available.

### Cinematic Media Crossfade

Use a small number of strong campaign or place images with long readable holds. Do not build an involuntary, endless distraction.

### Card Stack Compression

Use for a short sequential proof set. Do not leave interactive controls on visually buried cards.

### Proof Board Focus

Use a real evidence board and map each claim to a readable region. Mobile gets intentional crops rather than a microscopic desktop screenshot.

### Immersive Footer Deceleration

Use one slow ending beat after all navigation and legal links are visible. The final frame should settle instead of looping forever.

### Spatial Canvas Camera

Use only when spatial navigation represents real content. A complete semantic index, no-WebGL state, reduced-motion path, and escape route are hard gates.

### Magnetic Action Field

Use on one high-value action and transform only a visual child. The actual hit target cannot move.

### Section Color Hand-off

Use semantic surface tokens and validate contrast throughout the blend, not just at its endpoints.

## Failure Rules

Fail a motion proposal when any of these are true:

- the first or pinned frame is blank;
- required content exists only inside motion;
- mobile receives a squeezed desktop timeline;
- reduced motion hides, delays, or removes information;
- the main action moves, becomes covered, or arrives late;
- more than one controller owns the same transform or scroll lock;
- media or JavaScript exceeds the declared budget without a measured exception;
- the effect uses foreign assets or source code without rights;
- the pattern is repeated because it is fashionable rather than because its information job matches.

## Contribution Contract

New recipes must include the full mechanism and implementation contract, but they must not claim an implementation path or verification evidence. A repository-relative implementation path is required only when a pattern becomes `verified` or `promoted`, as part of its complete `verificationEvidence`. A source screenshot alone is not a contribution.

Each proposal must state:

- page job and effect job;
- source ledger and observation status;
- what was abstracted and what was deliberately not copied;
- original implementation ownership and license;
- asset and runtime budgets;
- mobile, reduced-motion, and no-JavaScript alternatives;
- failure modes;
- exact Playwright capture states;
- evidence required for the next status.

For `verified` and `promoted` contributions, also provide the original build ID, repository-relative implementation path, exact commit, evidence digest, at least two tested viewports, completed checks, verification date, and review type.

Keep patterns independent of one house palette, typeface, radius scale, hero layout, or industry. The same mechanics may travel; the visual identity must not.
