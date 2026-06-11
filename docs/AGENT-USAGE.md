# Agent Usage Guide

This file teaches any AI coding agent how to use Frontend Design Ultra.

## Natural Language Routing

| User asks for | Use |
|---|---|
| audit, review, critique, what's wrong | `/analyse` |
| create direction, concept, brand, look | `/design` |
| make it prettier, premium, less AI-looking | `/polish` |
| change files, build it, implement | `/implement` |
| final check, can this ship | `/verify` |
| Awwwards, award-winning, stunning, memorable | `/awwward /premium` |
| current trends, inspiration, references | `/trend /reference` |
| screenshot to code, copy this visual | `/image-to-code /reference` |
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

If user asks "is this ready to ship":

```text
/verify /playwright /mobile /performance /accessibility
```

## Required Behavior

- Always preserve the user's explicit intent over automatic routing.
- Do not mention internal routing unless it helps the user.
- Browser-verifiable claims need evidence when browser access is authorized.
- If private/authenticated/confidential UI is involved, ask before screenshots.
- Use references only when needed; do not load every file by default.

