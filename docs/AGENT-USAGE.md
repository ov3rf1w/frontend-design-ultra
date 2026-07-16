# Agent Usage Guide

This file teaches any AI coding agent how to use Frontend Design Ultra.

## Natural Language Routing

| User asks for | Use |
|---|---|
| audit, review, critique, what's wrong | `/analyse` |
| create direction, concept, brand, look | `/design` |
| create a new client website | `/new-site /design /premium` |
| make it prettier, premium, less AI-looking | `/polish` |
| change files, build it, implement | `/implement` |
| final check, can this ship | `/verify` |
| Awwwards, award-winning, stunning, memorable | `/awwward /premium` |
| current trends, inspiration, references | `/trend /reference` |
| screenshot to code, reconstruct this visual mechanism | `/image-to-code /reference` |
| inspect this starter, stack, or project fit | `/project-fit` |
| redesign existing page | `/redesign` |
| landing page | `/landing` |
| dashboard/admin/product UI | `/dashboard /saas` |
| store, product page, checkout | `/ecommerce /conversion` |
| mobile issue or responsive check | `/mobile` |
| accessibility, WCAG, keyboard | `/accessibility` |
| speed, LCP, INP, CLS | `/performance` |
| browser proof, screenshots, console | `/playwright` |
| Tailwind, tokens, theme | `/tailwind` |
| Figma frame or design handoff | `/figma` |
| GSAP, Framer, animation | `/gsap` or `/framer` |
| 3D, WebGL, R3F, canvas | `/3d` |

## Intensity Routing

- Use `/quick` for quick triage.
- Use `/deep` for substantial design or implementation.
- Use `/brutal` for strict critique, ship decisions, or premium polish.

## Default Expansions

If user says "make this homepage Awwwards level":

```text
/polish /landing /awwward /premium /brutal
```

If user gives a URL and asks "what should I improve":

```text
/analyse <url> /playwright /performance /accessibility /mobile
```

If user gives a screenshot and asks "build this":

```text
/image-to-code /reference /implement /premium
```

If user asks for a new premium client website in a local starter:

```text
/new-site /project-fit /design /premium /responsive
```

If user asks "is this ready to ship":

```text
/verify /playwright /mobile /performance /accessibility
```

## Required Behavior

- Always preserve the user's explicit intent over automatic routing.
- Do not mention internal routing unless it helps the user.
- Browser-verifiable claims need evidence when browser access is authorized.
- `/playwright` requests an evidence method; it never overrides screenshot or browser-automation policy.
- `/reference` uses clean-room, mechanism-level abstraction. Public output must visibly differentiate composition, typography, palette, copy, assets, and the combined motion sequence; it cannot transfer third-party code, brand material, or confusingly similar overall trade dress.
- Query the reference and motion assets before loading the full corpus; candidate descriptions are hypotheses until scanned and visually reviewed.
- If private/authenticated/confidential UI is involved, ask before screenshots.
- Substantial `/implement` work changes the authorized files, runs relevant checks, and reports evidence gaps; it is not an implementation-plan-only mode.
- Use references only when needed; do not load every file by default.
