# Design DNA Extraction

Use for `/image-to-code`, `/reference`, `/trend`, screenshot analysis, visual reverse engineering, or competitor teardown.

## Output Shape

```yaml
design_dna:
  source:
    type: screenshot | url | generated-reference | live-site
    confidence: high | medium | low
  palette:
    base: []
    surface: []
    text: []
    accent: []
    state: []
  typography:
    display_role:
    body_role:
    scale:
    line_height:
    letter_spacing:
  layout:
    grid:
    max_width:
    section_rhythm:
    density:
    dominant_axis:
  surfaces:
    background:
    cards:
    borders:
    elevation:
    radius:
  imagery:
    role:
    crop:
    lighting:
    texture:
    proof_value:
  components:
    buttons:
    nav:
    cards:
    forms:
    data:
  motion:
    vocabulary:
    duration_scale:
    scroll_behavior:
    reduced_motion:
  section_grammar:
    - section:
      job:
      composition:
      proof:
      action:
  build_plan:
    tokens:
    components:
    pages:
    verification:
```

## Extraction Rules

- Extract mechanics, not decoration.
- Identify what makes the reference work before choosing colors.
- Separate token facts from interpretation.
- Mark uncertainty instead of inventing precision.
- Convert fixed visuals into responsive grammar.
- Reject visual ideas that require inaccessible text, fragile layout, or unbounded performance cost.

## Implementation Use

Before coding from a visual source, produce:

1. Design DNA.
2. Token map.
3. Component map.
4. Responsive behavior.
5. Motion/fallback map.
6. Browser verification plan.

