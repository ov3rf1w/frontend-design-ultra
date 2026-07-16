# Blind Jury Guide

Status: **draft**. No juror has been recruited and no vote exists.

Jurors are pseudonymous, not anonymous. The benchmark operator can temporarily
link a `J-...` identifier to a consent record, so that private mapping is
minimized, access-controlled, and retained only under the frozen policy.

## Role

Judge the rendered result, not the presumed model or skill. You will receive
opaque A/B entries for the same fictional brief. Condition identity and source
code are hidden until all votes are frozen.

## Evidence Packet

Each valid comparison should include the same evidence types for both sides:

- desktop first viewport and full-page view;
- mobile first viewport and full-page view;
- synchronized desktop and mobile motion clips when motion exists;
- the fictional facts and required task, without condition metadata.

Motion clips must include at least three seconds, multiple frames, and the
preregistered scroll/action sequence. Static screenshots do not substitute for
motion evidence. If one side lacks, cannot decode, or materially mismatches
required evidence, select `invalid` and state the concrete reason. Do not infer
quality from a missing file.

## Vote

Choose an overall preference:

- `left`
- `right`
- `tie`
- `invalid`

For `left`, `right`, or `tie`, assess **both sides separately** on Design,
Usability, Creativity, and Content using the declared 1–5 scale, record
confidence from 1–5, and select concise reason tags. Public vote comments are
disabled and must be `null`. For `invalid`, choose one controlled
`invalidReason` code and do not fabricate
dimension scores. Do not evaluate accessibility conformance or measured
performance from screenshots; those belong to shipping evidence.

Use at most five controlled reason tags from the vote schema. Invalidity codes
are limited to missing/corrupt evidence, non-decodable evidence, a comparison
that cannot be evaluated, or a technical access failure.

## Evaluation Questions

- Does the first viewport make the subject and page job tangible?
- Does the composition feel authored rather than assembled from defaults?
- Are type, color, assets, and motion specific to this fictional client?
- Is the next meaningful action clear without flattening an editorial concept?
- Does mobile look recomposed rather than squeezed?
- Does motion improve hierarchy, orientation, pacing, or state clarity?
- Is the final frame stronger than the effect itself?
- Are facts and proof handled credibly without invention?

## Independence

Jurors declare relevant experience, project involvement, competitor involvement,
and conflicts. At least half of the final panel should have no contribution to
the benchmark or evaluated conditions. Exclusion rules and calibration items are
frozen before scoring begins.

Do not share packets, identify visual signatures publicly, or attempt to recover
the hidden mapping before vote freeze.

## Consent, Retention, And Redaction

- Obtain informed consent before issuing a pseudonymous juror ID. Store the
  consent record privately; never place names, emails, signatures, or IP
  addresses in a vote file.
- Record `consentStatus: verified-private-record` in each vote only after the
  private record exists.
- Retain the private identity map for at most 180 days after final publication
  or dispute closure, whichever is later, then delete it and record deletion.
- Retain private consent records for at most 730 days unless applicable
  obligations require a different preregistered period.
- Publish only pseudonymous structured votes with `comment: null`. Do not
  collect names, contact details, employers, client details, URLs, or unique
  project facts in the public vote contract.
- A redaction may protect a person but must not change the vote, score,
  invalidity reason, or substantive evaluation. Document redaction counts.

These controls are a benchmark privacy process, not a promise of anonymity and
not legal advice.
