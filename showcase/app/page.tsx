/* eslint-disable @next/next/no-html-link-for-pages -- Static export intentionally uses document navigation so generic static hosts never need RSC data routes. */
import { industries } from "@/lib/showcase";

export default function ShowcaseIndex() {
  return (
    <main id="main" className="showcase-index">
      <header className="index-header">
        <a href="/" className="index-mark">FDU / 06</a>
        <p>Curated multi-industry reference suite</p>
        <p>Original fictional work · not benchmark evidence</p>
      </header>
      <section className="index-hero" aria-labelledby="index-title">
        <p className="eyebrow">Six subjects. Six visual grammars.</p>
        <h1 id="index-title">One quality system should not produce one look.</h1>
        <p className="index-intro">Each route starts from different material, proof, action, risk, and mobile needs. Shared code carries accessibility and production discipline—not a template aesthetic.</p>
      </section>
      <ol className="index-routes">
        {industries.map((industry, index) => (
          <li key={industry.slug} data-preview={industry.slug}>
            <a href={`/${industry.slug}/`}>
              <span className="route-number">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{industry.fullName}</strong>
                <small>{industry.lane}</small>
              </span>
              <span className="route-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ol>
      <footer className="index-footer">
        <p>Next App Router · TypeScript · Tailwind CSS v4 · GSAP · static export</p>
        <p>No external visual assets.</p>
      </footer>
    </main>
  );
}
