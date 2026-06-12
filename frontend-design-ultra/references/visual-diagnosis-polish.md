# Visual Diagnosis And Polish

Use this for `/analyse`, `/polish`, `/redesign`, `/brutal`, screenshot reviews, and any request to make an existing UI more premium.

## Diagnosis Lenses

Evaluate in this order:

1. Page job: can the user understand the page's purpose quickly?
2. First viewport: is the first screen complete, specific, and action-readable?
3. Trust/conversion: are proof and CTA near the right friction?
4. Composition: is there one visual verb and a clear hierarchy?
5. Typography: are roles, scale, line breaks, and measures intentional?
6. Color/surfaces: is there a token system and rhythm?
7. Assets: do visuals prove, explain, or create identity?
8. Components/states: are interactive states complete?
9. Motion: does it orient or distract?
10. Responsive: laptop, wide, mobile, and reduced-motion compositions.
11. Accessibility/performance: hard gates.
12. Specificity: could this belong to any random startup?

## Heuristic Lens

Check:

- system status is visible
- language matches user expectations
- user can undo/back out
- components follow standards
- errors are prevented before recovery is needed
- recognition is favored over memory
- expert paths exist without confusing beginners
- interface is minimal without hiding necessary help
- errors are understandable and recoverable
- help/context exists where tasks are risky

## Keep / Delete / Replace / Rebuild

- Keep: elements with real proof, clear conversion value, strong brand specificity, or working accessibility.
- Delete: filler badges, fake proof, decorative cards, redundant CTAs, weak images, generic section clones.
- Replace: default type, generic colors, dead hero compositions, unverified proof, inaccessible motion.
- Rebuild: sections whose underlying job is wrong, not just visually weak.

## High-Impact Polish Moves

- Change the opening composition before changing tiny details.
- Strengthen type roles and line breaks.
- Replace generic hero media with proof, product, process, or typographic composition.
- Reduce CTA competition.
- Introduce surface rhythm every 1-2 screenfuls.
- Convert card grids into proof boards, index rows, editorial splits, or object stages.
- Tune spacing with fewer, larger decisions.
- Add missing states and focus treatment.
- Remove motion that delays comprehension.
- Recompose mobile rather than stacking desktop.

## Severity Model

- Critical: blocks comprehension, conversion, accessibility, correctness, performance, or mobile usability.
- Important: makes the UI generic, cheap, untrusted, or hard to scan.
- Polish: detail improvements after strategy and gates are correct.

## Output Contract

For `/analyse` and `/polish`, include:

- Visual Diagnosis
- Root Cause
- Keep / Delete / Replace / Rebuild
- High-Impact Moves
- Typography / Color / Surface Fixes
- Component / State Fixes
- Motion / Responsive Fixes
- Evidence Needed
- Ship Risk

## Evidence Confidence

For each finding, label:

- High: observed in browser/screenshot/live evidence.
- Medium: inferred from source/code/design-system evidence.
- Low: expert hypothesis needing verification.
