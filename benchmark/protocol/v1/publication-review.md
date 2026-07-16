# Publication Rights Review

Status: **required before partial or complete public results**.

This is a documented release decision process. It is not legal clearance and
does not claim that a reviewer can eliminate all intellectual-property,
contract, privacy, publicity, or similarity risk.

## Required Review Record

The result manifest’s `rightsReview` block records:

1. **Model and provider terms** — identify every model, API, hosting, capture,
   font, media, and storage provider relevant to the published outputs; record
   that the applicable terms were reviewed and note material restrictions.
2. **Asset and network inventory** — freeze an inventory of input assets,
   generated assets, fonts, packages, remote requests, downloaded media, and
   release artifacts; publish its SHA-256, counts, and a concise disposition.
3. **Logo and trademark review** — inspect rendered pages, metadata, filenames,
   favicons, screenshots, and videos for third-party logos, trade dress, names,
   and confusing brand presentation.
4. **Human similarity review** — have a human compare the final rendered output
   against the documented inspiration/reference set and known source material.
   Record the method and any material compositional, textual, visual, or motion
   similarity concern.
5. **Publication decision** — choose `approved`,
   `approved-with-redactions`, or `withheld`; identify the reviewer and UTC
   review time.

Every included item must be original, licensed, or otherwise permitted for the
specific benchmark use and publication surface. “Found online,” “used as
inspiration,” model-generated, or technically downloadable is not by itself a
publication-rights basis.

## Decision Rules

- `approved`: the documented inventory and reviews support publishing the
  specified evidence set without additional redaction.
- `approved-with-redactions`: publish only the reviewed redacted set and bind
  the exact `redactions.json` digest and count. Public redactions may remove
  direct identifiers from non-scoring vote text only; they cannot change
  assignments, choices, scores, eligibility, timing, or evidence shown to the
  jury.
- `withheld`: do not publish claims or the affected evidence. Report the
  withheld count and limitation without exposing restricted material.

If the evidence set, provider terms, asset inventory, reference set, or rendered
output changes after review, perform a new review and update `reviewedAt`. A
benchmark claim is never allowed when the decision is `withheld`.

`evidenceBundleSha256` binds the packet, vote freeze, both reveal artifacts, run
manifest set, deterministic scorecard, and any redaction manifest. A withheld
decision forbids publishing partial/complete status or the affected public
evidence. Post-jury visual edits are not redactions: perform them before jury
freeze and regenerate the packet, or withhold the affected comparison and
recompute scoring.
