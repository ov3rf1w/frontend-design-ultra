# UI Spec DSL

Use when implementation needs deterministic structure rather than free prose.

## Page Spec

```yaml
page:
  name:
  route:
  audience:
  page_job:
  design_lane:
  taste_dials:
    variance:
    motion:
    density:
  tokens:
    color:
    type:
    spacing:
    radius:
    elevation:
    motion:
  viewport:
    first_impression:
    proof:
    primary_action:
    safe_areas:
  sections:
    - id:
      job:
      layout:
      grid:
      content:
      components:
      assets:
      motion:
      responsive:
      evidence:
  verification:
    viewports:
    interactions:
    accessibility:
    performance:
```

## Component Spec

```yaml
component:
  name:
  purpose:
  variants:
  props:
  states:
  keyboard:
  aria:
  responsive:
  motion:
  tokens:
  examples:
```

## Use

- Generate this spec before large implementation.
- Keep section jobs concrete.
- If the UI looks generic, revise `design_lane`, `taste_dials`, `assets`, and `signature move` before coding.

