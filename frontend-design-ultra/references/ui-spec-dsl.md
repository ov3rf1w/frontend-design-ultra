# UI Spec DSL

Use when implementation needs deterministic structure rather than free prose.

## Page Spec

```yaml
page:
  name:
  route:
  audience:
  page_job:
  audience_intent:
  conversion_spine:
    relevance:
    outcome:
    proof:
    action:
    post_click_expectation:
  design_lane:
  signature_move:
  asset_reality:
    available:
    missing:
    concept_risk:
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
    fit_risks:
  mobile_recomposition:
    order:
    first_visible_action:
    media_focal_points:
    reduced_motion:
  responsive_viewports:
    laptop:
      target:
      fit_strategy:
    desktop:
      target:
      baseline:
    wide:
      target:
      expansion_strategy:
    reduced_motion:
      no_pin_layout:
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
    reduced_motion:
    public_safety:
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
- If the first viewport job, proof/action path, or mobile recomposition is missing, revise the spec before coding.
- If laptop fit or wide-monitor expansion strategy is missing for a premium page, revise the spec before coding.
