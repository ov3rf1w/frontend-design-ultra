import { BrandShell } from "@/components/brand-shell";
import { LegalDocket } from "@/components/illustrations";
import { LocalRequestForm } from "@/components/interactions/local-request-form";
import { MotionShell } from "@/components/motion-shell";

const matters = [
  ["01", "Contract disputes", "Commercial obligations, interpretation, and contested performance."],
  ["02", "Shareholder conflicts", "Ownership, governance, and decision deadlock."],
  ["03", "Emergency injunctions", "Time-sensitive relief with an immediate procedural path."],
  ["04", "Trial support", "Local litigation support for in-house and outside counsel."],
] as const;

export function LegalPage() {
  return (
    <BrandShell current="legal" brand="MATTER 02" descriptor="Commercial disputes, precisely scoped">
      <main id="main">
        <MotionShell brand="legal">
          <section className="legal-hero" data-benchmark-key="hero">
            <div className="legal-case-label" data-hero-reveal>
              <span>MATTER / 001</span>
              <span>TWO JURISDICTIONS</span>
              <span>FICTIONAL FIRM</span>
            </div>
            <div className="legal-heading">
              <p className="eyebrow" data-hero-reveal>Commercial litigation without theatre</p>
              <h1 data-hero-reveal>Make the next procedural decision legible.</h1>
              <p data-hero-reveal>Four partners, three associates, and two litigation support specialists—organized around scope, conflicts, review, and response.</p>
              <a className="primary-action" href="#matter-review" data-hero-reveal>Request a matter review <span aria-hidden="true">↗</span></a>
            </div>
            <div className="legal-docket-stage" data-hero-reveal><LegalDocket /></div>
            <div className="legal-response-note" data-hero-reveal><strong>1 business day</strong><span>Initial request review, after a conflicts screen.</span></div>
          </section>

          <section className="legal-matters" data-section-reveal>
            <div className="legal-section-heading"><p className="eyebrow">Matter scope</p><h2>We name the work before we describe the firm.</h2></div>
            <ol>
              {matters.map(([number, title, description]) => (
                <li key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></li>
              ))}
            </ol>
          </section>

          <section className="legal-process" data-section-reveal>
            <div><p className="eyebrow">Confidentiality boundary</p><h2>Send enough to check fit. Not the whole file.</h2></div>
            <div className="legal-process-copy">
              <p>The first request identifies parties, jurisdiction, matter category, timing, and a safe contact route. Detailed privileged documents wait until conflicts are cleared.</p>
              <p>Submitting a request does not create an attorney-client relationship. No case result is promised or implied.</p>
            </div>
          </section>

          <section className="legal-review" id="matter-review" data-section-reveal>
            <div className="legal-form-intro">
              <p className="eyebrow">Local intake demonstration</p>
              <h2>Start a conflicts-safe review.</h2>
              <p>No message is transmitted. Do not enter real names, confidential facts, or documents.</p>
            </div>
            <LocalRequestForm
              fields={[
                { id: "matter-type", label: "Matter category", type: "select", required: true, options: matters.map(([, title]) => title) },
                { id: "jurisdiction", label: "Jurisdiction", type: "text", required: true },
                { id: "timing", label: "Timing", type: "select", required: true, options: ["Immediate deadline", "Within 30 days", "Early assessment"] },
                { id: "contact", label: "Safe contact email", type: "email", required: true },
              ]}
              submitLabel="Continue to conflicts check"
              successTitle="The request boundary is clear."
              successText="A real firm would now run a conflicts process before accepting detailed confidential information."
              disclaimer="Local UI only. No legal service, attorney-client relationship, or data submission occurs."
            />
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
