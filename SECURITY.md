# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest release candidate | Yes |
| Older prereleases and untagged snapshots | Best effort |

The benchmark harness and reference scanner process untrusted websites and artifacts. Run them in an isolated browser profile and never provide production credentials.

## Reporting

Report security issues through a [private GitHub Security Advisory](https://github.com/ov3rf1w/frontend-design-ultra/security/advisories/new).

Do not open public issues for vulnerabilities, private prompts, private site data, credentials, or screenshots of confidential products.

## Scope

Security-sensitive reports include:

- accidental credential exposure
- unsafe browser automation guidance
- private data leakage in generated outputs
- instructions that encourage destructive interaction with live systems
- accessibility or UX patterns that can cause harmful or deceptive behavior
- archive, installer, benchmark, or path handling that can write outside its declared scope
- traces, HAR files, screenshots, videos, or manifests that expose secrets or personal data

## Handling

Reports should include a concise reproduction, expected impact, and affected files when possible.

The project aims to acknowledge a valid report within five business days, provide an initial assessment within ten business days, and coordinate disclosure after a fix or mitigation is available. These are response targets, not a guarantee.

Normal design disagreements, broken links, expected browser incompatibilities, and public-reference suggestions belong in the issue tracker. Rights, attribution, removal, privacy, or confidential-data concerns should use the private process in [RIGHTS.md](RIGHTS.md).
