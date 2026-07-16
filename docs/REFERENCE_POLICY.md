# Reference, Reconstruction, And Provenance Policy

This policy applies to live-site research, Playwright captures, motion analysis, derived mechanics, showcase assets, benchmark packets, and public repository media.

## Three Evidence Surfaces

### Private reference cache

Authorized scans of public third-party sites may produce screenshots, video, traces, DOM snapshots, animation keyframes, console output, and request metadata. These artifacts default to a private OS-local cache outside the repository. Repository-local and known cloud-synchronized output paths are rejected; `FDU_EVIDENCE_ROOT` can select another private local cache. Gitignore is not a privacy boundary and does not prevent OneDrive, Dropbox, Google Drive, iCloud, Box, backup software, or endpoint telemetry from copying files. The artifacts are for analysis and review, not automatic publication.

Use an explicit retention policy. Keep only the evidence needed for the current review, remove stale raw captures after derived mechanics and review notes are complete, and never use the raw cache as a public asset library.

Do not scan authenticated, paid, admin, private, client-confidential, credential-bearing, or destructive states without explicit authority. Never store cookies, storage state, authorization headers, query tokens, or user data in public artifacts.

### Public mechanics catalog

The repository may publish:

- source title, direct public URL, and access date;
- observed route, state, locale, and viewport;
- derived composition, interaction, motion, asset, and usability mechanics;
- scan status and known limitations;
- original implementation recipes;
- mobile, reduced-motion, accessibility, and performance adaptations.

Candidate descriptions remain hypotheses. Machine capture does not equal human visual verification. Promotion status must reflect the evidence actually reviewed.

Public scan outcomes and public observations are separate contracts. The scan-outcome catalog may publish only sanitized, allowlisted diagnostic metadata for the newest relevant attempt: status, eligibility, issue/limitation codes, per-viewport counts, rights boundaries, and aggregate summaries. Partial, failed, unsupported, and strict-ineligible complete outcomes are diagnostic-only and cannot verify motion. The observation catalog accepts only complete attempts that pass freshness, source, capture-profile, reduced-motion, artifact-completeness, and aggregate artifact-set digest checks.

### Public original evidence

Public screenshots, videos, demos, and code must use repository-authored fictional calibration identities and original code plus assets that are owned, generated for the project, public domain, or covered by a compatible license. Every external asset needs a provenance record with source, creator, license or permission basis, and redistribution status. Provenance review is required diligence, not a legal-clearance opinion or warranty.

## What May Be Reconstructed

Mechanics can be studied through clean-room, mechanism-level abstraction and can inspire an original implementation. Examples include timing structure, scroll-to-state mapping, masking strategy, layout rhythm, interaction causality, or a responsive fallback. A public reconstruction must deliberately change composition, typography, palette, copy, assets, and the combined motion sequence so the result is not confusingly similar to the source experience.

Do not copy or republish third-party:

- production source or minified bundles;
- logos, icons, brand copy, campaign concepts, or a complete identity;
- fonts, photography, illustration, video, audio, 3D models, or data without rights;
- complete screenshots, recordings, traces, or page archives without permission;
- a complete trade-dress clone presented as original work.

A public URL, an award listing, attribution, or the repository maintainer's permission cannot grant rights owned by the source site's creator or client.

## Benchmark Tracks

- Original Design: no direct reference image; this is the only track eligible for an originality or leadership claim.
- Reference-Assisted Synthesis: every condition receives the same derived mechanics packet.
- Licensed Reconstruction: measures fidelity only against owned, public-domain, compatibly licensed, or explicitly permitted references.

Never mix a reconstruction result into the original-design score.

## Pull Request Requirements

A contribution that adds a reference, motion pattern, screenshot, video, demo, or asset must state:

- ownership or license;
- direct source and access date;
- whether redistribution and modification are allowed;
- what was extracted and what was deliberately not copied;
- whether the artifact is private evidence, public mechanics, or public original evidence;
- the related mobile, reduced-motion, accessibility, and performance contract;
- any client, personal, location, or credential data review performed.

Unclear rights block merging. Replace the asset with an original equivalent or keep the raw evidence local.

## Jury Privacy, Retention, And Redaction

Benchmark jury data is pseudonymous, not anonymous. Public ballots use stable juror codes so repeat votes and exclusions can be audited without publishing names or contact details.

Before recruitment, a run must define its retention and redaction schedule. Contact data and consent records stay access-controlled and separate from votes. Public free text must be reviewed for names, contact details, customer information, confidential project details, credentials, and other identifying data. The default retention periods and permitted public records are defined in [RIGHTS.md](../RIGHTS.md); a run may adopt a shorter or more protective schedule.

Do not claim anonymity unless the maintainers cannot reasonably link a public vote to a person. Redaction must not alter the numeric score, condition mapping after unblinding, invalidation reason, or substantive design rationale needed to audit the result.

## Award-platform boundary

Frontend Design Ultra is not affiliated with, endorsed by, or certified by
Awwwards, CSS Design Awards, or any referenced studio, client, or brand.
Award-platform links are discovery or provenance references only. They do not
grant capture, redistribution, trademark, font, media, source-code, or design
rights. Raw award-platform pages and third-party website captures must never be
included in this repository or its release artifacts without documented rights.

## Removal

If you own material that appears here, represent its rights holder, or believe a public artifact exposes confidential or personal data, follow the private reporting and temporary-restriction process in [RIGHTS.md](../RIGHTS.md). Do not place contracts, identity documents, credentials, customer data, or confidential evidence in a public issue.
