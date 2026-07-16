import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { inspectProject } from "../../frontend-design-ultra/scripts/inspect-project.mjs";

function withFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "frontend-design-ultra-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, file, content) {
  const target = join(root, file);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content, "utf8");
}

test("classifies a documentation-only starter without pretending it is runnable", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Starter\nUse the declared stack.\n");
    write(root, "STACK.md", "Next.js App Router, TypeScript, Tailwind CSS v4, GSAP + ScrollTrigger + Lenis, Playwright, static export with `output: \"export\"`.\n");
    write(root, "PROJECT_BRIEF.md", "# Brief template\n");
    write(root, "DESIGN_CONTRACT_TEMPLATE.md", "# Design contract template\n");
    write(root, "QUALITY_GATES.md", "# Quality gates\n");
    write(root, "templates/next-static/page.tsx", "export default function Page() { return <main />; }\n");

    const report = inspectProject(root);

    assert.equal(report.project.kind, "context-starter");
    assert.equal(report.project.fit, "partial");
    assert.equal(report.stack.framework.value, "Next.js");
    assert.equal(report.stack.framework.source, "declared");
    assert.equal(report.stack.rendering.value, "Static export");
    assert.equal(report.context.templateFiles, 1);
    assert.match(report.warnings.join("\n"), /not an executable scaffold/i);
  });
});

test("detects an executable Next.js static-export project and its real commands", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project context\n");
    write(root, "package.json", JSON.stringify({
      scripts: {
        build: "next build",
        lint: "eslint .",
        preview: "serve out",
      },
      dependencies: {
        next: "^16.2.0",
        react: "^19.2.0",
        gsap: "^3.15.0",
        lenis: "^1.3.0",
      },
      devDependencies: {
        "@playwright/test": "^1.61.0",
        tailwindcss: "^4.3.0",
        typescript: "^6.0.0",
      },
    }, null, 2));
    write(root, "next.config.ts", "export default { output: \"export\" };\n");
    write(root, "package-lock.json", "{}\n");
    write(root, "node_modules/next/package.json", JSON.stringify({ name: "next", version: "16.2.1" }));
    write(root, "tsconfig.json", "{}\n");
    write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");
    write(root, "app/globals.css", "@import \"tailwindcss\";\n@theme { --color-brand: oklch(0.7 0.1 40); }\n");
    for (const file of ["brief", "research", "design-contract", "page-spec", "asset-budget", "seo", "quality-gates"]) {
      write(root, `docs/${file}.md`, `# ${file}\n\nApproved decision content for this project, including owner, scope, constraints, and acceptance evidence.\n`);
    }

    const report = inspectProject(root);

    assert.equal(report.project.kind, "codebase");
    assert.equal(report.project.fit, "baseline-ready");
    assert.equal(report.stack.framework.source, "installed");
    assert.equal(report.stack.router.value, "App Router");
    assert.equal(report.stack.framework.version, "16.2.1");
    assert.equal(report.stack.framework.manifestRange, "^16.2.0");
    assert.equal(report.stack.styling.source, "configured");
    assert.equal(report.stack.styling.version, "^4.3.0");
    assert.equal(report.stack.qa[0].value, "@playwright/test");
    assert.equal(report.contracts.missing.length, 0);
    assert.equal(report.commands.build, "next build");
  });
});

test("flags an invalid static-export preview contract", () => {
  withFixture((root) => {
    write(root, "package.json", JSON.stringify({
      scripts: { build: "next build", lint: "eslint .", start: "next start" },
      dependencies: { next: "^16.2.0" },
    }));
    write(root, "next.config.mjs", "export default { output: 'export' };\n");

    const report = inspectProject(root);

    assert.match(report.warnings.join("\n"), /static export.*next start/i);
  });
});

test("flags contradictory commands and incomplete QA declared only in starter prose", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Context starter\n");
    write(root, "STACK.md", [
      "# Next.js App Router static export",
      "`output: 'export'`",
      "`experimental: { inlineCss: true }`",
      "```json",
      "{ \"scripts\": { \"start\": \"next start\", \"seo:verify\": \"node scripts/seo-verify.mjs --root out\" }, \"devDependencies\": { \"playwright-core\": \"^1\" } }",
      "```",
    ].join("\n"));
    write(root, "BRIEF.md", "# Brief\n");
    write(root, "DESIGN.md", "# Design\n");
    write(root, "QUALITY.md", "# Quality\n");

    const report = inspectProject(root);
    const warnings = report.warnings.join("\n");

    assert.equal(report.declaredCommands.start, "next start");
    assert.match(warnings, /static export.*next start.*starter prose/i);
    assert.match(warnings, /Playwright library.*not execution-ready/i);
    assert.match(warnings, /inlineCss.*experimental/i);
    assert.match(warnings, /seo:verify.*target is missing.*seo-verify\.mjs/i);
  });
});

test("reads a project-fit handshake without pretending a context starter is executable", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Context starter\n");
    write(root, "STACK.md", "Next.js App Router with static export and Tailwind CSS v4.\n");
    write(root, "RESEARCH.md", "# Research template\n");
    write(root, "QUALITY.md", "# Quality template\n");
    const mappedArtifacts = {
      brief: "CUSTOM_BRIEF.md",
      research: "CUSTOM_RESEARCH.md",
      designContract: "CUSTOM_DESIGN_TEMPLATE.md",
      pageSpec: "CUSTOM_PAGE_SPEC.md",
      assetBudget: "CUSTOM_ASSET_BUDGET.md",
      seo: "CUSTOM_SEO.md",
      qualityGates: "CUSTOM_QUALITY.md",
    };
    for (const file of Object.values(mappedArtifacts)) write(root, file, `# ${file}\n`);
    write(root, ".frontend-design-ultra/project-fit.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "context-starter",
      profile: "next-static-marketing",
      starterVersion: "0.1.0",
      skillCompatibility: "project-fit-contract-v1",
      artifactMap: mappedArtifacts,
      expectedScripts: ["lint", "typecheck", "build", "preview", "test:e2e"],
      evidencePolicy: { screenshots: "inherit" },
    }, null, 2));

    const report = inspectProject(root);

    assert.equal(report.project.kind, "context-starter");
    assert.equal(report.project.fit, "bridge-ready");
    assert.equal(report.context.projectContract.valid, true);
    assert.equal(report.context.projectContract.profile, "next-static-marketing");
    assert.equal(report.context.projectContract.capabilityProfile.valid, true);
    assert.deepEqual(
      report.contracts.templates.find(({ name }) => name === "designContract"),
      { name: "designContract", file: "CUSTOM_DESIGN_TEMPLATE.md" },
    );
    assert.equal(report.commands.build, undefined);
  });
});

test("blocks bridge-ready when a machine contract omits scripts required by its shipped profile", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Context starter\n");
    write(root, "STACK.md", "Next.js App Router with static export.\n");
    write(root, "BRIEF.md", "# Brief\n");
    write(root, "DESIGN.md", "# Design\n");
    write(root, "QUALITY.md", "# Quality\n");
    write(root, ".frontend-design-ultra/project-fit.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "context-starter",
      profile: "next-static-marketing",
      skillCompatibility: "project-fit-contract-v1",
      expectedScripts: ["lint", "build", "preview"],
    }));

    const report = inspectProject(root);

    assert.equal(report.project.fit, "partial");
    assert.match(report.warnings.join("\n"), /omits scripts required by profile.*typecheck.*test:e2e/i);
  });
});

test("blocks bridge-ready when a machine contract names an unknown capability profile", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Context starter\n");
    write(root, "STACK.md", "Next.js App Router with static export.\n");
    write(root, "BRIEF.md", "# Brief\n");
    write(root, "DESIGN.md", "# Design\n");
    write(root, "QUALITY.md", "# Quality\n");
    write(root, ".frontend-design-ultra/project-fit.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "context-starter",
      profile: "unknown-profile",
      skillCompatibility: "project-fit-contract-v1",
      expectedScripts: [],
    }));

    const report = inspectProject(root);

    assert.equal(report.project.fit, "partial");
    assert.equal(report.context.projectContract.capabilityProfile.valid, false);
    assert.match(report.warnings.join("\n"), /profile.*does not exist/i);
  });
});

test("rejects project-fit artifact mappings that escape the project root", () => {
  withFixture((root) => {
    write(root, "frontend-design-ultra.project.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "codebase",
      profile: "next-static-marketing",
      skillCompatibility: "project-fit-contract-v1",
      artifactMap: { brief: "../private-brief.md" },
    }));

    const report = inspectProject(root);

    assert.equal(report.context.projectContract.valid, false);
    assert.match(report.context.projectContract.issues.join("\n"), /inside the project root/i);
    assert.match(report.warnings.join("\n"), /project-fit contract is invalid/i);
  });
});

test("marks optional motion mentioned in starter prose without treating it as installed", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Starter\n");
    write(root, "STACK.md", "# Stack\nNext.js App Router with static export.\n");
    write(root, "BRIEF.md", "# Brief\n");
    write(root, "DESIGN.md", "# Design\n");
    write(root, "ADVANCED.md", "Use these only for a heavier layer; they are not default decoration.\n\n## WebGL / Three.js Showroom\nUse rarely.\n");

    const report = inspectProject(root);
    const webgl = report.stack.motion.find(({ value }) => value === "Three.js/WebGL");

    assert.equal(webgl.source, "declared");
    assert.equal(webgl.optional, true);
  });
});

test("does not treat a directory named package.json as an executable codebase", () => {
  withFixture((root) => {
    mkdirSync(join(root, "package.json"), { recursive: true });

    const report = inspectProject(root);

    assert.notEqual(report.project.kind, "codebase");
    assert.equal(report.stack.framework, null);
  });
});

test("does not call a partial codebase baseline-ready without its execution and project contracts", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project\n");
    write(root, "package.json", JSON.stringify({
      scripts: { build: "next build", lint: "eslint ." },
      dependencies: { next: "^16.0.0" },
      devDependencies: { "playwright-core": "^1.60.0" },
    }));
    write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");

    const report = inspectProject(root);

    assert.equal(report.project.kind, "codebase");
    assert.equal(report.project.fit, "adapt");
    assert.equal(report.stack.packageManager, null);
    assert.ok(report.contracts.missing.length > 0);
    assert.match(report.warnings.join("\n"), /project manifest.*Playwright library.*not execution-ready/i);
    assert.equal(report.stack.qa[0].harness, "library-only");
  });
});

test("does not infer a Next router or JavaScript language from a non-Next CSS-only app directory", () => {
  withFixture((root) => {
    write(root, "package.json", JSON.stringify({
      scripts: { build: "vite build", lint: "eslint ." },
      devDependencies: { vite: "^7.0.0" },
    }));
    write(root, "package-lock.json", "{}\n");
    write(root, "app/styles.css", ":root { color: black; }\n");

    const report = inspectProject(root);

    assert.equal(report.stack.framework.value, "Vite");
    assert.equal(report.stack.router, null);
    assert.equal(report.stack.language, null);
    assert.equal(report.stack.styling.value, "CSS");
  });
});

test("classifies a manifest without an application surface as package-only", () => {
  withFixture((root) => {
    write(root, "package.json", JSON.stringify({ name: "tokens-only", private: true }));

    const report = inspectProject(root);

    assert.equal(report.project.kind, "package-only");
    assert.equal(report.project.fit, "partial");
    assert.match(report.warnings.join("\n"), /no application.*source surface/i);
  });
});

test("rejects non-string package scripts as executable readiness evidence", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project context\n");
    write(root, "package.json", JSON.stringify({
      scripts: { build: true, lint: 42 },
      dependencies: { next: "^16.2.0" },
    }));
    write(root, "package-lock.json", "{}\n");
    write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");
    for (const file of ["brief", "research", "design-contract", "page-spec", "asset-budget", "seo", "quality-gates"]) {
      write(root, `docs/${file}.md`, `# ${file}\n\nApproved project decision content with constraints and acceptance evidence.\n`);
    }

    const report = inspectProject(root);

    assert.equal(report.project.kind, "codebase");
    assert.equal(report.project.fit, "adapt");
    assert.deepEqual(report.commands, {});
    assert.match(report.warnings.join("\n"), /non-executable script entries.*build, lint/i);
  });
});

test("does not treat an empty App Router directory as an executable application", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project context\n");
    write(root, "package.json", JSON.stringify({
      scripts: { build: "next build", lint: "eslint ." },
      dependencies: { next: "^16.2.0" },
    }));
    write(root, "package-lock.json", "{}\n");
    mkdirSync(join(root, "app"), { recursive: true });

    const report = inspectProject(root);

    assert.equal(report.project.kind, "package-only");
    assert.equal(report.stack.router, null);
    assert.notEqual(report.project.fit, "baseline-ready");
  });
});

test("does not accept commented static-export configuration as configured evidence", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project context\n");
    write(root, "package.json", JSON.stringify({
      scripts: {
        lint: "eslint .",
        typecheck: "tsc --noEmit",
        build: "next build",
        preview: "serve out",
        "test:e2e": "playwright test",
      },
      dependencies: { next: "^16.2.0" },
      devDependencies: { "@playwright/test": "^1.61.0", tailwindcss: "^4.3.0", typescript: "^6.0.0" },
    }));
    write(root, "package-lock.json", "{}\n");
    write(root, "next.config.ts", "// output: 'export'\nexport default {};\n");
    write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");
    write(root, "app/globals.css", "@import 'tailwindcss';\n@theme { --color-brand: oklch(0.7 0.1 40); }\n");
    for (const file of ["brief", "research", "design-contract", "page-spec", "asset-budget", "seo", "quality-gates"]) {
      write(root, `docs/${file}.md`, `# ${file}\n\nApproved project decision content with constraints and acceptance evidence.\n`);
    }
    write(root, ".frontend-design-ultra/project-fit.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "codebase",
      profile: "next-static-marketing",
      skillCompatibility: "project-fit-contract-v1",
      expectedScripts: ["lint", "typecheck", "build", "preview", "test:e2e"],
    }));

    const report = inspectProject(root);

    assert.equal(report.stack.rendering, null);
    assert.equal(report.project.fit, "adapt");
    assert.match(report.warnings.join("\n"), /profile.*lacks detected evidence.*Static export/i);
  });
});

test("reports profile-ready only after required machine capabilities pass", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "# Project context\n");
    write(root, "package.json", JSON.stringify({
      scripts: {
        lint: "eslint .",
        typecheck: "tsc --noEmit",
        build: "next build",
        preview: "serve out",
        "test:e2e": "playwright test",
      },
      dependencies: { next: "^16.2.0" },
      devDependencies: { "@playwright/test": "^1.61.0", tailwindcss: "^4.3.0", typescript: "^6.0.0" },
    }));
    write(root, "package-lock.json", "{}\n");
    write(root, "next.config.ts", "const nextConfig = { output: 'export' };\nexport default nextConfig;\n");
    write(root, "playwright.config.ts", "export default {};\n");
    write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");
    write(root, "app/globals.css", "@import 'tailwindcss';\n@theme { --color-brand: oklch(0.7 0.1 40); }\n");
    for (const file of ["brief", "research", "design-contract", "page-spec", "asset-budget", "seo", "quality-gates"]) {
      write(root, `docs/${file}.md`, `# ${file}\n\nApproved project decision content with constraints and acceptance evidence.\n`);
    }
    write(root, ".frontend-design-ultra/project-fit.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "codebase",
      profile: "next-static-marketing",
      skillCompatibility: "project-fit-contract-v1",
      expectedScripts: ["lint", "typecheck", "build", "preview", "test:e2e"],
    }));

    const report = inspectProject(root);

    assert.equal(report.project.fit, "profile-ready");
    assert.deepEqual(report.context.projectContract.capabilityProfile.machineEvaluation.missing, []);
    assert.deepEqual(report.context.projectContract.capabilityProfile.machineEvaluation.rejectedDefaultsFound, []);
    assert.ok(report.context.projectContract.capabilityProfile.manualReviewCapabilities.length > 0);
  });
});

test("requires static export on the exported Next configuration object", () => {
  for (const source of [
    "const note = \"output: 'export'\";\nexport default {};\n",
    "const unused = { output: 'export' };\nexport default {};\n",
    "const note = \"export default { output: 'export' }\";\nexport default {};\n",
  ]) {
    withFixture((root) => {
      write(root, "package.json", JSON.stringify({ dependencies: { next: "^16.2.0" } }));
      write(root, "app/page.tsx", "export default function Page() { return <main />; }\n");
      write(root, "next.config.ts", source);

      const report = inspectProject(root);

      assert.equal(report.stack.rendering, null);
    });
  }
});

test("keeps project-fit artifact path validation aligned with the published schema", () => {
  withFixture((root) => {
    write(root, "docs/brief.md", "# Brief\n");
    write(root, "frontend-design-ultra.project.json", JSON.stringify({
      contractVersion: 1,
      projectKind: "scaffold-fragment",
      profile: "next-static-marketing",
      skillCompatibility: "project-fit-contract-v1",
      artifactMap: { brief: "docs/../docs/brief.md" },
    }));

    const report = inspectProject(root);

    assert.equal(report.context.projectContract.valid, false);
    assert.match(report.context.projectContract.issues.join("\n"), /artifactMap entry brief/i);
  });
});
