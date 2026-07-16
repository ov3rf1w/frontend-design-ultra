import { BrandShell } from "@/components/brand-shell";
import { ProductConfigurator } from "@/components/interactions/product-configurator";
import { MotionShell } from "@/components/motion-shell";

export function EcommercePage() {
  return (
    <BrandShell current="ecommerce" brand="OBJECT 06" descriptor="Made-to-order light, fully specified">
      <main id="main">
        <MotionShell brand="ecommerce">
          <section className="commerce-hero" data-benchmark-key="hero" data-hero-reveal>
            <ProductConfigurator />
          </section>

          <section className="commerce-spec" data-section-reveal>
            <div className="spec-heading"><p className="eyebrow">What the object requires</p><h2>Specification before atmosphere.</h2></div>
            <dl>
              <div><dt>Installation</dt><dd>Hardwired ceiling installation by a qualified electrician.</dd></div>
              <div><dt>Included</dt><dd>Ceiling rose and two-metre cable.</dd></div>
              <div><dt>Light source</dt><dd>Warm replaceable LED module and driver.</dd></div>
              <div><dt>Dispatch</dt><dd>Four to six weeks after the fictional configuration is placed.</dd></div>
            </dl>
          </section>

          <section className="commerce-material" data-section-reveal>
            <div className="material-rings" aria-hidden="true"><span /><span /><span /></div>
            <div><p className="eyebrow">Three finishes / one form</p><h2>The finish changes the object, not the interface hierarchy.</h2><p>Brushed aluminium catches a cool edge. Oxidised brass carries depth. Blackened steel turns the shade into a silhouette. The selector never depends on colour alone.</p></div>
          </section>

          <section className="commerce-aftercare" data-section-reveal>
            <article><span>RETURN / 01</span><h3>Made to order is a real boundary.</h3><p>Configured pieces may be returned for defect or damage. Fictional terms never reduce statutory rights.</p></article>
            <article><span>REPAIR / 02</span><h3>Eight years of replaceable light.</h3><p>The fictional paid repair service supports the LED module and driver for eight years after purchase.</p></article>
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
