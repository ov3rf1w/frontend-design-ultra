# Third-Party Notices

The repository's [MIT License](LICENSE) covers repository-authored material only. Third-party software and content remain subject to their own licenses and terms. This notice is informational and does not replace the license files shipped by a dependency.

Exact dependency versions are pinned in `package-lock.json` and `showcase/package-lock.json`. The direct packages used by the repository currently include:

| Packages | Declared license or terms |
|---|---|
| `ajv`, `ajv-formats` | MIT |
| `playwright-core` | Apache License 2.0 |
| `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `eslint`, `eslint-config-next`, `serve`, and the installed `@types/*` packages | MIT |
| `typescript`, `sharp` | Apache License 2.0 |
| `gsap`, `@gsap/react` | [GreenSock Standard License](https://gsap.com/community/standard-license/) |

Transitive packages may use additional compatible licenses. Their package metadata and bundled license or notice files are authoritative. `node_modules` is not part of the installable skill release; a downstream application or deployed showcase must preserve any notices required by the dependencies it distributes.

## Technology Names And Trademarks

GSAP, GreenSock, Next.js, React, Tailwind CSS, Playwright, Awwwards, CSS Design Awards, and other names referenced by the repository belong to their respective owners. Their mention describes compatibility, research provenance, or an implementation option and does not imply affiliation, endorsement, certification, or a trademark license.

## References And Captured Content

Links, derived observations, and factual metadata about third-party sites do not place the linked pages or their media under this repository's MIT License. Raw third-party captures are not release content. See [RIGHTS.md](RIGHTS.md) and [docs/REFERENCE_POLICY.md](docs/REFERENCE_POLICY.md).
