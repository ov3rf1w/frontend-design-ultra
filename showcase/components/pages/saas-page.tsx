import { BrandShell } from "@/components/brand-shell";
import { RelayMap } from "@/components/illustrations";
import { SaasFlow } from "@/components/interactions/saas-flow";
import { MotionShell } from "@/components/motion-shell";

export function SaasPage() {
  return (
    <BrandShell current="saas" brand="WORK 05" descriptor="Recurring work made operational">
      <main id="main">
        <MotionShell brand="saas">
          <section className="saas-hero" data-benchmark-key="hero">
            <div className="saas-copy">
              <p className="eyebrow" data-hero-reveal>Intake → ownership → approval → completion</p>
              <h1 data-hero-reveal>Recurring work should leave a readable trail.</h1>
              <p data-hero-reveal>WORK 05 is a non-commercial cloud-workspace fixture for work that crosses teams, dependencies, and approvals.</p>
              <a className="primary-action" href="#workflow" data-hero-reveal>Inspect the workflow <span aria-hidden="true">↘</span></a>
            </div>
            <div className="saas-live-stage" data-hero-reveal>
              <div className="stage-chrome"><span>OPS-24 / QUARTER CLOSE</span><span>SYNCED · SYNTHETIC DATA</span></div>
              <RelayMap active={2} />
              <div className="stage-state-grid">
                <div><span>Owner</span><strong>A. Flores</strong></div>
                <div><span>Dependency</span><strong>Finance sign-off</strong></div>
                <div><span>Due</span><strong>17:00 UTC</strong></div>
              </div>
            </div>
          </section>

          <div id="workflow" data-section-reveal><SaasFlow /></div>

          <section className="saas-permissions" data-section-reveal>
            <div><p className="eyebrow">Operational trust, not logo proof</p><h2>Roles that narrow. History that exports.</h2></div>
            <table className="permission-matrix">
              <caption>Fictional permission levels</caption>
              <thead>
                <tr><th scope="col">Scope</th><th scope="col">Can view</th><th scope="col">Can change</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Workspace</th><td>All teams</td><td>Policy only</td></tr>
                <tr><th scope="row">Team</th><td>Assigned work</td><td>Ownership + due date</td></tr>
                <tr><th scope="row">Item</th><td>Named participants</td><td>State + evidence</td></tr>
              </tbody>
            </table>
          </section>

          <section className="saas-sandbox" data-section-reveal>
            <div className="sandbox-number">14</div>
            <div><p className="eyebrow">Day sandbox / synthetic data only</p><h2>Test the operating model, not a staged success metric.</h2><p>Cloud-hosted in this fictional fixture. Email, webhook, CSV, and generic identity-provider categories are described without borrowed vendor logos.</p></div>
            <a className="primary-action" href="#workflow">Open local workflow state <span aria-hidden="true">↗</span></a>
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
