import { BrandShell } from "@/components/brand-shell";
import { FinanceAtlas } from "@/components/illustrations";
import { FinanceEligibility } from "@/components/interactions/finance-eligibility";
import { MotionShell } from "@/components/motion-shell";

export function FinancePage() {
  return (
    <BrandShell current="finance" brand="FIVE 03" descriptor="Fees, method, and risk before persuasion">
      <main id="main">
        <MotionShell brand="finance">
          <section className="finance-hero" data-benchmark-key="hero">
            <div className="finance-hero-copy">
              <p className="eyebrow" data-hero-reveal>Five risk bands / no return targets</p>
              <h1 data-hero-reveal>See the method before you meet the portfolio.</h1>
              <p data-hero-reveal>A fictional long-term investment service that puts minimums, fees, review logic, and capital risk in the first decision frame.</p>
              <a className="primary-action" href="#eligibility" data-hero-reveal>Check fixture eligibility <span aria-hidden="true">↘</span></a>
            </div>
            <div className="finance-figure" data-hero-reveal>
              <FinanceAtlas />
              <div className="finance-source">Source: benchmark-authored illustrative data · not performance</div>
            </div>
            <dl className="finance-terms" data-hero-reveal>
              <div><dt>Minimum</dt><dd>£2,500</dd></div>
              <div><dt>Platform fee</dt><dd>0.48% / yr</dd></div>
              <div><dt>Fund costs</dt><dd>0.12–0.24%</dd></div>
            </dl>
          </section>

          <section className="finance-method" data-section-reveal>
            <header><p className="eyebrow">Method / not prediction</p><h2>Risk is a band, not a marketing adjective.</h2></header>
            <div className="method-grid">
              <article><span>01</span><h3>Map</h3><p>Five globally diversified fictional portfolios map to declared risk bands, never promised returns.</p></article>
              <article><span>02</span><h3>Review</h3><p>Weights are reviewed quarterly against the fixture methodology.</p></article>
              <article><span>03</span><h3>Rebalance</h3><p>Changes occur only when a declared tolerance is exceeded.</p></article>
            </div>
          </section>

          <div id="eligibility" data-section-reveal><FinanceEligibility /></div>

          <section className="finance-risk" data-section-reveal>
            <div><p className="eyebrow">The disclosure belongs in the composition</p><h2>Capital is at risk.</h2></div>
            <div><p>Eligibility is not advice, a suitability decision, or a guarantee. The platform, fees, bands, and data shown here are fictional benchmark material.</p><p>No regulator, performance history, certification, customer count, or security claim is represented.</p></div>
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
