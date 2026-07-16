import { BrandShell } from "@/components/brand-shell";
import { CarePath } from "@/components/illustrations";
import { LocalRequestForm } from "@/components/interactions/local-request-form";
import { MotionShell } from "@/components/motion-shell";

export function HealthcarePage() {
  return (
    <BrandShell current="healthcare" brand="PULSE 04" descriptor="A legible path to non-emergency care">
      <main id="main">
        <MotionShell brand="healthcare">
          <aside className="emergency-boundary" aria-label="Emergency boundary">
            <strong>New severe chest pain, collapse, or severe breathing difficulty?</strong>
            <span>Use local emergency services—not this fictional request form.</span>
          </aside>
          <section className="healthcare-hero" data-benchmark-key="hero">
            <div className="healthcare-copy">
              <p className="eyebrow" data-hero-reveal>Non-emergency outpatient cardiology</p>
              <h1 data-hero-reveal>A calmer route from question to appointment.</h1>
              <p data-hero-reveal>Consultation, ECG review, ambulatory monitoring, and follow-up planning—explained before anyone asks for clinical details.</p>
              <a className="primary-action" href="#appointment" data-hero-reveal>Request an appointment <span aria-hidden="true">→</span></a>
            </div>
            <div className="care-stage" data-hero-reveal>
              <CarePath />
              <p>Request → Prepare → Visit → Plan</p>
            </div>
          </section>

          <section className="care-preparation" data-section-reveal>
            <div className="care-prep-heading"><p className="eyebrow">Before the visit</p><h2>Bring less uncertainty.</h2></div>
            <ul>
              <li><span>01</span><strong>Medicine list</strong><p>Names, doses, and when they are taken.</p></li>
              <li><span>02</span><strong>Prior reports</strong><p>Relevant results already available to you.</p></li>
              <li><span>03</span><strong>Identification</strong><p>Plus insurance information where applicable.</p></li>
              <li><span>04</span><strong>Access request</strong><p>Interpretation or a quiet waiting option by advance request.</p></li>
            </ul>
          </section>

          <section className="care-access" data-section-reveal>
            <div className="access-orbit" aria-hidden="true"><span>step-free</span><span>quiet</span><span>interpreted</span></div>
            <div><p className="eyebrow">Access is part of care</p><h2>Step-free. Quiet when needed. Interpreted by request.</h2><p>The fictional clinic treats arrival, communication, and sensory needs as appointment information—not a footnote.</p></div>
          </section>

          <section className="appointment-section" id="appointment" data-section-reveal>
            <div>
              <p className="eyebrow">Local appointment demonstration</p>
              <h2>Request, without over-disclosing.</h2>
              <p>A referral is preferred but not required. A fictional response window of two business days is not urgent triage.</p>
            </div>
            <LocalRequestForm
              fields={[
                { id: "visit-type", label: "Reason category", type: "select", required: true, options: ["Initial consultation", "ECG review", "Ambulatory monitoring", "Follow-up planning"] },
                { id: "referral", label: "Referral status", type: "select", required: true, options: ["I have a referral", "I do not have a referral", "I am not sure"] },
                { id: "access", label: "Access request (optional)", type: "select", options: ["Step-free route", "Quiet waiting option", "Interpretation", "Discuss by email"] },
                { id: "email", label: "Email", type: "email", required: true },
              ]}
              submitLabel="Request fictional appointment"
              successTitle="The request state is complete."
              successText="A real clinic would now apply privacy, scheduling, clinical-boundary, and emergency-routing procedures."
              disclaimer="No health information is stored or sent. This is not diagnosis, triage, or an appointment service."
            />
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
