/* eslint-disable @next/next/no-html-link-for-pages -- Static export intentionally uses document navigation so generic static hosts never need RSC data routes. */
import type { ReactNode } from "react";

import { industries, type IndustrySlug } from "@/lib/showcase";

type BrandShellProps = {
  current: IndustrySlug;
  brand: string;
  descriptor: string;
  children: ReactNode;
};

function RouteLinks({ current, compact = false }: { current: IndustrySlug; compact?: boolean }) {
  return (
    <nav aria-label={compact ? "Showcase routes" : "Multi-industry showcase"} className={compact ? "mobile-route-list" : "desktop-route-list"}>
      {industries.map(({ slug, brand }) => (
        <a key={slug} href={`/${slug}/`} aria-current={slug === current ? "page" : undefined}>
          {brand}
        </a>
      ))}
    </nav>
  );
}

export function BrandShell({ current, brand, descriptor, children }: BrandShellProps) {
  return (
    <div className="route-shell" data-brand={current}>
      <header className="brand-nav" data-benchmark-key="navigation">
        <a href={`/${current}/`} className="brand-wordmark" aria-label={`${brand} home`}>
          {brand}
        </a>
        <p className="brand-descriptor">{descriptor}</p>
        <RouteLinks current={current} />
        <details className="mobile-route-menu">
          <summary>Explore</summary>
          <RouteLinks current={current} compact />
        </details>
      </header>
      {children}
      <footer className="brand-footer">
        <div>
          <p className="brand-footer-name">{brand}</p>
          <p>{descriptor}</p>
        </div>
        <div className="brand-footer-note">
          <p>Fictional brand and facts.</p>
          <p>Curated showcase — not a benchmark result.</p>
        </div>
        <a href="/">All six directions</a>
      </footer>
    </div>
  );
}
