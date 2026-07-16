# Competitive Benchmark And Evidence Plan

Research snapshot: 2026-07-16. Re-check volatile repository, framework, CLI, and ranking claims before publication.

## Product Thesis

Frontend Design Ultra should win on an end-to-end agency loop, not on the length of its instruction file:

```text
client strategy -> subject-grounded art direction -> real content/assets
-> project-aware implementation -> authorized visual loop -> reproducible evaluation
```

The skill does not claim that a prompt can guarantee an award. A credible public claim requires controlled comparisons showing that the skill improves outcomes over the same model without the skill and over representative alternatives.

## Current Landscape

| Project | Public strength | Gap this project should solve |
|---|---|---|
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Large searchable dataset, industry reasoning rules, design-system generation, stack recipes, CLI retrieval, and persistent master/page output | A generated category match is a useful prior, but still needs rendered, subject-specific and condition-blind outcome evidence |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Concrete anti-generic heuristics, visible taste controls, motion/spacing direction, examples, research, and multimodal reference-board workflows | Strong taste priors and reference boards still need project-fit controls and comparable rendered evaluations to establish cross-industry reliability |
| [Impeccable](https://github.com/pbakaus/impeccable) | Broad design vocabulary, project teaching/documentation, 23 refinement commands, seven domain references, browser iteration, deterministic detectors, CLI, and tests | Detection and visual refinement are strong product features; a public condition-blind benchmark is still required before comparative outcome claims |
| [Anthropic frontend-design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) | Compact subject-grounded art direction, justified risk, design planning, and critique | No persistent agency/project bridge, executable project inspector, deterministic release gates, or public visual benchmark |
| [Addy Osmani frontend-ui-engineering](https://github.com/addyosmani/agent-skills/blob/main/skills/frontend-ui-engineering/SKILL.md) | Production-minded UI engineering guidance covering project design systems, accessibility, responsive behavior, state, architecture, and verification | It is an engineering workflow specialist rather than an editorial art-direction, reference-intelligence, motion-capture, and agency evidence system |
| [GSAP Skills](https://github.com/greensock/gsap-skills) | Focused first-party motion knowledge for GSAP, ScrollTrigger, React, and frameworks | Motion specialist, not an agency design operating system; route to it rather than duplicate it wholesale |

Stars and social attention are discovery signals, not effectiveness evidence. [SWE-Skills-Bench](https://arxiv.org/abs/2603.15401) reports that many tested skills did not improve task pass rate and that added context can materially increase token cost. This repository therefore treats public evaluation as product work, not release decoration.

## Quality Model

Use two independent juries:

- Creative Jury: Design 40%, Usability 30%, Creativity 20%, Content 10%, modeled on the weighting shown on published [Awwwards result pages](https://www.awwwards.com/sites/aro). It is a subjective expert critique, not official jury prediction.
- Shipping Jury: correctness, semantics/SEO, accessibility, responsive behavior, motion safety, performance, metadata, runtime/build evidence, and content integrity. Known failures cannot be averaged away.

Technical evidence should follow current primary standards:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for accessibility targets and conformance claims.
- [Core Web Vitals](https://web.dev/articles/vitals) with field/RUM evidence kept separate from lab diagnostics.
- [Agent Skills specification](https://agentskills.io/specification) and [skill authoring guidance](https://agentskills.io/skill-creation/best-practices) for portable structure and progressive disclosure.
- The project's actual framework manifest and official current documentation for implementation decisions; for the first-party Next profile use [Next.js static export constraints](https://nextjs.org/docs/app/guides/static-exports), [Tailwind theme variables](https://tailwindcss.com/docs/theme), and scoped [GSAP React integration](https://github.com/greensock/react).

## What Is Reproducible Today

- Skill metadata, reference routing, internal links, public-path hygiene, eval pairing, and progressive-disclosure limits are checked by `scripts/validate-repo.mjs`.
- The project inspector has executable tests for a documentation-only starter, a configured Next static-export project, and an invalid export-preview contract.
- Installer staging, validation, backup, rollback, local-working-tree, branch/tag/SHA, and dry-run paths are exercised manually before release.
- Prompt/expected-output pairs cover routing and contract behavior.
- The independent [benchmark subsystem](../benchmark/README.md) validates a versioned draft protocol, four conditions, six fictional calibration briefs, asset-provenance records, a 72-slot planned matrix, condition-blinding tooling, and salted holdout commitments.
- The Playwright reference scanner records entrance and scroll storyboards, explicit-size video, trace, desktop/mobile/reduced-motion states, Web Animations metadata, composition signals, and runtime failures into a gitignored local cache.
- The public intelligence layer contains 76 dated reference candidates and 19 reusable motion contracts; source hypotheses remain distinct from machine capture and human visual review.

These checks do not yet prove superior rendered websites. The current benchmark result manifest contains zero completed runs and zero votes. Prompt contracts, reference candidates, and curated showcases are not visual benchmark results.

## Public Visual Benchmark

The committed calibration MVP uses six public briefs, four conditions, and three replicates: 72 planned calibration builds. It exists to prove the harness before any scored dataset is opened. Failed runs must remain visible and calibration results cannot support a market-leadership claim.

Before claiming market leadership, extend and freeze the versioned benchmark to at least 30 scored briefs across:

- SaaS/product
- luxury/hospitality
- healthcare/legal/finance
- e-commerce
- culture/editorial/portfolio
- local services

For each brief, compare the same model, stack, asset packet, token/time budget, tool policy, repair budget, and run count across:

1. baseline without a design skill;
2. Frontend Design Ultra;
3. representative compact, database-driven, anti-slop, and detector-driven alternatives.

Use at least three runs per condition and publish failed runs. Measure:

- blind expert pairwise preference and Creative Jury scores;
- task/content completeness and fabricated-proof rate;
- build, lint, typecheck, route, interaction, and Shipping Jury results;
- responsive and reduced-motion evidence at fixed viewport/state fixtures;
- automated accessibility findings plus manual keyboard/focus review;
- lab performance, bundle/DOM/media budgets, and field metrics only where real telemetry exists;
- token use, elapsed time, implementation churn, and number of visual repair loops.

The scored protocol uses 20 public briefs and 10 sealed holdouts across ten industries, with a public salted commitment before generation. The holdout, anonymization key, condition mapping, and private raw artifacts remain outside the repository until votes are frozen. The primary statistic is condition-blind pairwise preference, clustered by brief; Shipping Jury gates remain separate and cannot be averaged away.

Suitable public research fixtures include [Design2Code](https://github.com/NoviScl/Design2Code), [DesignBench](https://github.com/WebPAI/DesignBench), and iterative render-feedback work such as [UI2Code_N](https://github.com/zai-org/UI2Code_N). Their metrics should be adapted carefully; pixel similarity alone does not measure usability, brand fit, or creative quality.

## Known Gaps Before A Leadership Claim

- No completed blind expert run, baseline comparison, jury panel, or published result yet; the executable draft and validation tooling exist, but the scored protocol is not frozen and there is no outcome evidence.
- No executable first-party production starter in this repository; the skill currently supplies a project contract and inspector, while starters stay independently versioned.
- Manual non-Codex adapters are not behaviorally certified.
- Scored model adapters still need exact provider/model snapshots, usage accounting, and cost authorization; the calibration matrix intentionally leaves those environment fields pending.
- The six original multi-industry showcase builds now have audited public screenshot evidence and a timed editorial entrance storyboard. They remain labelled human-curated calibration examples, not benchmark outcomes.
- Independent external jurors, manual accessibility review, rights review, and real publication authority cannot be synthesized by the repository itself.
- Optional visual examples should become multimodal skill artifacts only after licensing, rights, and token-cost impact are measured.

## Release Standard

A release may claim structural validation and named regression coverage when CI is green. It may claim improved visual outcomes only when the corresponding versioned benchmark, baseline, model/run configuration, evidence artifacts, and limitations are public.
