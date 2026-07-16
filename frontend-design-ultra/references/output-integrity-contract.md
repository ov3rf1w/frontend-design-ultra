# Output Integrity Contract

Use before final answers for `/implement`, `/verify`, `/designplan`, `/image-to-code`, `/imagegen`, public examples, or any deliverable that another agent or developer will act on.

## Completeness Gate

Final output must not contain:

- placeholders such as TODO, TBD, lorem ipsum, or "insert X here" unless explicitly requested as scaffolding
- vague continuation language such as "and so on" for required implementation details
- omitted states for interactive components
- unverifiable awards, customer names, logos, metrics, screenshots, or claims
- hidden assumptions presented as facts
- source or construction notes that are not relevant to the user-facing deliverable

## Required Fill States

For every major component or page, specify:

- default
- hover
- focus-visible
- active/pressed when relevant
- disabled when relevant
- loading when relevant
- empty/error/success when relevant
- mobile behavior
- reduced-motion behavior
- accessibility notes
- performance risks

## Evidence Claims

Use claim levels:

- Verified: backed by browser, screenshot, console, audit, or file evidence.
- Inferred: based on code, visual reference, or known constraints.
- Proposed: a recommendation not yet verified.
- Blocked: requires user asset, private access, credentials, or live environment.

Do not label a result as shipped when hard-gate evidence is missing. Use `Needs Review`.

## Public Delivery Safety

Before publishing docs, examples, or README-style content:

- remove internal paths, raw construction notes, private customer details, and source dependency names
- keep examples generic or fictional
- avoid implying the skill copies another system
- phrase inspiration as mechanisms and operating rules
- keep safety guidance concise and actionable

