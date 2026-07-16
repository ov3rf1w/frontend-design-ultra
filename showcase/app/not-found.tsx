/* eslint-disable @next/next/no-html-link-for-pages -- Static export intentionally uses document navigation so generic static hosts never need RSC data routes. */
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <p className="eyebrow">404 / Route not in the suite</p>
      <h1>This direction does not exist.</h1>
      <p>The curated suite contains six fictional industries and no hidden customer work.</p>
      <a className="primary-action" href="/">Return to all directions <span aria-hidden="true">↗</span></a>
    </main>
  );
}
