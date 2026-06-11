# Motion Lenses

Use separate paths for motion creation and motion audit.

## Lens Weighting

| Context | Primary | Secondary | Avoid |
|---|---|---|---|
| Dashboard/productivity | restraint | polish | playful surprise |
| SaaS/product marketing | polish | restraint | scroll theatre |
| Portfolio/campaign | experiment | polish | hidden content |
| E-commerce | restraint | polish | motion near checkout friction |
| Playful apps | experiment | polish | sterile minimalism |

## Create Mode

Before adding motion: identify the state change, decide if motion helps orientation/hierarchy/causality/delight, pick one recipe, use a shared duration/easing scale, add reduced-motion final state, and verify no CLS.

Recipes: enter/exit, state swap, list reorder, drawer/modal, toast, hover/focus, scroll chapter, canvas/3D.

## Audit Mode

Find motion gaps and motion slop:

- conditional render with no enter/exit handling
- instant state swap where orientation is lost
- hover-scale on every card
- stagger spam
- pulsing indicator with no information value
- scroll pin with blank state
- animated layout property causing shift
- missing reduced-motion completion

Report Critical when motion breaks comprehension, accessibility, performance, or navigation. Report Important when it weakens polish but does not block use.

