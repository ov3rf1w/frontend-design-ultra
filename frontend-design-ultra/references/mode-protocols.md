# Mode Protocols

Use this to execute each major mode consistently.

## `/analyse`

1. Identify page/job/domain and evidence available.
2. Capture browser evidence only when the user or host/project policy authorizes it; otherwise request supplied evidence and mark browser-dependent claims `Needs Browser Verification`.
3. Run diagnosis lenses.
4. Separate symptoms from root causes.
5. Prioritize by severity and impact.
6. Recommend concrete design moves, not vague advice.
7. Mark missing evidence as `Needs Browser Verification`.

## `/polish`

1. Preserve what works.
2. Delete generic or low-value elements.
3. Replace weak systems: type, color, surface, assets, CTA, state, motion.
4. Rebuild only sections with wrong underlying jobs.
5. Apply detail pass: spacing, alignment, line breaks, focus, states, reduced motion.
6. Verify first viewport, mobile, and key interactions when authorized.

## `/design`

1. For `/new-site` or `/project-fit`, inspect the actual project contract and separate installed/configured capabilities from declared or inferred ones.
2. Research read with dated source provenance.
3. Design system first.
4. Website-type playbook.
5. Strategy lane and signature move.
6. Responsive viewport system.
7. UI spec.
8. Asset plan.
9. Verification plan.

## `/implement`

1. Inspect local system and files needed.
2. Map the UI spec to tokens/components.
3. Implement smallest coherent vertical slice.
4. Preserve existing conventions.
5. Add states, accessibility, responsive behavior, reduced-motion, and performance safeguards during implementation.
6. Run safe project checks such as lint, typecheck, tests, and production build when the project supports them.
7. For browser-verifiable work, run the closed loop: build -> inspect/capture when authorized -> compare with the design and shipping contracts -> patch -> recheck.
8. Report the implemented outcome, changed files, checks run, and remaining evidence gaps. When scoped writes are authorized, do not stop at an implementation plan.

## `/verify`

1. Determine changed routes and states.
2. Collect authorized evidence: first viewport, slices, full-page, console, overflow, interactions, accessibility smoke, and performance risk. Slash parameters do not override screenshot/browser policy.
3. Evaluate binary shipping gates separately from the subjective Creative Jury.
4. Return `Pass`, `Fail`, or `Needs Review`.
5. Include evidence IDs or explicitly mark missing evidence.

## Closed Implementation Loop

Do not treat a successful build as visual completion. Use the same route, state, viewport, content, and evidence naming across iterations:

1. Build the production-representative target.
2. Inspect or capture only when authorized.
3. Compare against the design contract, responsive contract, and binary shipping gates.
4. Patch the smallest root cause.
5. Re-run the relevant checks and preserve before/after evidence.
