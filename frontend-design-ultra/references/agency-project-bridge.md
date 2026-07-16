# Agency Project Bridge

Use this for `/new-site`, `/agency`, `/implement`, `/project-fit`, starter repositories, multi-client work, or a Next.js/Tailwind/GSAP production stack.

## Contents

- [Separation Of Concerns](#separation-of-concerns)
- [Project Fit Intake](#project-fit-intake)
- [Authority And Preservation](#authority-and-preservation)
- [Project Artifact Crosswalk](#project-artifact-crosswalk)
- [Optional Machine Contract](#optional-machine-contract)
- [Concept And Subject Gate](#concept-and-subject-gate)
- [Design Fingerprint](#design-fingerprint)
- [Next Static Marketing Profile](#next-static-marketing-profile)
- [Motion And Media Contract](#motion-and-media-contract)
- [Closed Verification Loop](#closed-verification-loop)
- [Two-Jury Ship Decision](#two-jury-ship-decision)
- [Project Fit Brief](#project-fit-brief)

## Separation Of Concerns

Keep the design skill, production starter, and client project separate but connected:

- Skill: portable strategy, art direction, UI/UX judgment, implementation governance, and verification.
- Starter: versioned framework scaffold, dependencies, configs, scripts, and reusable mechanics.
- Client project: brand, content, assets, routes, tokens, decisions, and evidence.
- Private agency overlay: internal provenance, client-confidential patterns, and recent-build history.

Do not paste a private starter or client archive into the public skill. Do not copy a skill's full doctrine into every client repository. Connect the layers with a small project-fit contract and local `AGENTS.md`.

## Project Fit Intake

Before substantial implementation, inspect facts rather than assuming the stack. When Node.js is available, run:

```bash
node <skill-root>/scripts/inspect-project.mjs <project-root>
```

Classify every finding as:

- `installed`: present in the local dependency tree or executable toolchain;
- `configured`: declared by the real package manifest/lockfile or proven by configs, routes, tokens, and scripts;
- `declared`: described only in starter/project documentation;
- `inferred`: plausible from files but not authoritative.

Inspect framework, router, rendering model, package manager, scripts, React/Tailwind/motion versions, tokens, shared components, routes, content, assets, fonts and licenses, test/browser harness, deployment, and preservation constraints.

A directory with documentation and snippets but no package manifest/config is a context starter, not a runnable scaffold. Never claim that it builds, tests, or previews.

## Authority And Preservation

Resolve decisions in this order:

1. Explicit user brief and constraints.
2. Project `AGENTS.md` and repository instructions.
3. Existing brand/design system and real content/assets.
4. Installed stack, configs, and working scripts.
5. Starter profile and this skill's defaults.

Do not migrate framework, router, rendering mode, component system, CMS, motion stack, or deployment merely to fit a preferred recipe. Propose a migration separately when it materially changes scope.

## Project Artifact Crosswalk

For substantial client websites, keep the packet compact and map it to the skill contracts:

| Project artifact | Holds | Skill contract |
|---|---|---|
| `AGENTS.md` | stack, commands, routes, preservation rules, evidence policy | Project Fit Intake |
| `docs/brief.md` | client, audience, offer, top tasks, proof, constraints | Design Read + UX packet |
| `docs/research.md` | dated sources, extracted mechanics, anti-copy notes, confidence | Research Read |
| `docs/design-contract.md` | Brand DNA, taste profile, tokens, fingerprint, rejected defaults | Design system + Aesthetic Locks |
| `docs/page-spec.md` | page jobs, IA, first viewports, section/state grammar, mobile order | UI Spec DSL |
| `docs/asset-budget.md` | role, source/rights, dimensions, crop, alt, weight, fallback | Asset Reality Gate |
| `docs/seo.md` | intent, metadata, schema, sitemap/robots, local/GEO needs | SEO specialist handoff |
| `docs/quality-gates.md` | creative jury, shipping gates, evidence IDs, residual risk | Ship decision |

Use existing equivalent files instead of duplicating them. Project facts live in the project, not in the skill.

## Optional Machine Contract

An independently versioned starter may expose `.frontend-design-ultra/project-fit.json` or `frontend-design-ultra.project.json`. Validate it against `assets/project-fit.schema.json`. This is a small compatibility handshake, not a second package manifest and not a replacement for project instructions.

```json
{
  "contractVersion": 1,
  "projectKind": "context-starter",
  "profile": "next-static-marketing",
  "starterVersion": "0.1.0",
  "skillCompatibility": "project-fit-contract-v1",
  "artifactMap": {
    "brief": "PROJECT_BRIEF.md",
    "designContract": "DESIGN_CONTRACT_TEMPLATE.md",
    "qualityGates": "QUALITY_GATES.md"
  },
  "expectedScripts": ["lint", "typecheck", "build", "preview", "test:e2e"],
  "evidencePolicy": {
    "screenshots": "inherit"
  }
}
```

The contract may map differently named artifacts, identify the capability profile, and state expected script names. The inspector must still verify real files and scripts. Missing scripts stay missing; a contract cannot turn declared prose into installed capability. User and host policy remain above its screenshot preference.

Inspector fit labels are deliberately narrow: `bridge-ready` proves only a validated starter/profile handshake, `baseline-ready` proves a runnable baseline without a validated profile, and `profile-ready` proves the profile's machine-checkable baseline. None of them certifies art direction, architecture, responsive craft, reduced motion, accessibility, or shipment; the report keeps those manual capability and risk reviews explicit.

## Concept And Subject Gate

For a new premium client site or large redesign, compare three genuinely different routes before implementation. Make them differ in at least five of: strategy lane, first viewport, typography class, palette temperature, asset carrier, surface rhythm, signature motion, conversion path, and pattern mix.

Ground every route in the client's subject world first:

- materials, places, objects, tools, interfaces, or documents native to the work;
- characteristic actions and verbs;
- real proof and data;
- category language and customer questions;
- cultural or regulatory constraints.

Choose one justifiable aesthetic risk. Reject routes that could keep the same composition and art direction after swapping the logo and industry noun. Apply a style preset only after this subject inventory; a preset is a constraint, not the source of identity.

## Design Fingerprint

Make cross-client diversity measurable when the agency supplies an opt-in local ledger:

```yaml
design_fingerprint:
  primary_lane:
  first_viewport_mechanic:
  typography_class:
  palette_temperature:
  asset_carrier:
  surface_rhythm:
  signature_motion:
  section_rhythm:
```

Compare against recent entries only when such an artifact exists. If five or more fields collide with a recent build without a brand reason, revise the route. Never claim cross-project originality from model memory alone. Never store client history globally or transmit it as telemetry.

## Next Static Marketing Profile

For a Next.js App Router marketing/editorial site with static export:

- Treat the real manifest and lockfile as version authority. For a new scaffold, verify current stable compatible versions in primary documentation, then pin and test them; do not copy stale major ranges from prose.
- Use Server Components by default. Keep motion, pointer, media controls, and browser APIs in small client leaves.
- Treat `output: "export"` as a capability constraint. Avoid request-time server features, cookies, Server Actions, ISR, and dynamic handlers that require a runtime unless architecture changes explicitly.
- Preview the generated `out/` directory with a static server. `next start` is not the exported-output preview contract.
- Do not enable experimental framework flags as production defaults without a measured need and an explicit fallback.
- In Tailwind v4, use CSS-first `@theme` plus semantic CSS variables for brand tokens. Do not import a starter's palette, radii, or motion values as identity.
- Prefer typed content/data modules. Add a CMS only when real editorial ownership requires it and the rendering/deployment contract supports it.
- Use `@playwright/test` or the project's complete harness, not a browser library package with no tests, browsers, or evidence workflow.
- Run the repository's actual lint, typecheck, build, static preview, SEO, and browser scripts. Report missing commands instead of inventing green checks.
- Treat the profile's machine checks as a floor. Review Server Component boundaries, client-leaf size, responsive/reduced-motion evidence, runtime-only features, global animation cleanup, smooth-scroll policy, and autoplay controls manually before shipment.

## Motion And Media Contract

- Make Lenis opt-in, not a desktop default. Native scroll is the baseline.
- In React, scope GSAP with `useGSAP()` or `gsap.context()`, use responsive/reduced-motion matching, and revert only instances owned by the component.
- Let one system own each animated property. Do not have React inline styles and GSAP both control the same transform.
- Render required content visibly before motion initializes; reduced motion gets a compact authored composition, not a frozen pinned scene.
- Autoplaying or looping video needs a poster, reduced-motion behavior, and pause/control treatment when required by duration or content.
- Keep production media local or through an approved asset pipeline. Record source/rights, intrinsic dimensions, responsive crops, alt role, and weight budget.

## Closed Verification Loop

For implementation, run an outcome loop rather than returning a plan:

```text
implement -> production build -> inspect/capture when authorized -> compare to contract
-> creative critique -> technical audit -> patch -> re-run evidence
```

Check the isolated first viewport, compact laptop, standard and wide desktop, mobile first viewport and slices, full-page rhythm, reduced motion, keyboard path, console/runtime, overflow, and performance risk. Follow host and user policy for screenshots; a skill parameter cannot grant capture permission by itself.

## Two-Jury Ship Decision

Keep subjective ambition separate from objective production gates:

- Creative jury: Design 40%, Usability 30%, Creativity 20%, Content 10%. Use as an art-direction critique, not mathematical proof of an award.
- Shipping jury: semantic HTML/SEO, accessibility, correctness, responsive behavior, motion safety, performance, metadata, and build/runtime evidence. These are pass/fail or evidence-missing gates.

Do not average away a shipping failure. `Needs Review` means evidence is missing; it does not soften a known blocker. A creative score can guide polish but cannot certify usability or performance.

## Project Fit Brief

Before code, record or return:

- project kind: codebase, context starter, scaffold fragment, or unknown;
- installed/configured/declared stack and version evidence;
- authoritative local files and commands;
- systems and flows that must be preserved;
- missing project artifacts and assets;
- selected concept route, rejected routes, and subject-world grounding;
- stack deviations and static/runtime capability risks;
- implementation boundary;
- verification commands, evidence plan, and unresolved blockers.
