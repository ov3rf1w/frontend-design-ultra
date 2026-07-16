import { AlpineContour } from "@/components/illustrations";
import { LocalRequestForm } from "@/components/interactions/local-request-form";
import { BrandShell } from "@/components/brand-shell";
import { MotionShell } from "@/components/motion-shell";

export function HospitalityPage() {
  return (
    <BrandShell current="hospitality" brand="HOUSE 01" descriptor="A car-free twelve-room mountain house">
      <main id="main">
        <MotionShell brand="hospitality">
          <section className="hospitality-hero" data-benchmark-key="hero">
            <div className="hospitality-kicker" data-hero-reveal>
              <span>47° N</span><span>Two seasons</span><span>Car-free arrival</span>
            </div>
            <div className="hospitality-copy">
              <p className="eyebrow" data-hero-reveal>A fictional house above the last road</p>
              <h1 data-hero-reveal>House<br />01</h1>
              <p data-hero-reveal>Twelve rooms, a timber sauna, and dinner when the mountain light leaves the table.</p>
              <a className="editorial-action" href="#availability" data-hero-reveal>Read the seasons <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hospitality-visual" data-hero-reveal>
              <AlpineContour />
              <div className="season-seal"><span>12</span><small>rooms only</small></div>
            </div>
          </section>

          <section className="hospitality-seasons" data-section-reveal>
            <div className="season-title">
              <p className="eyebrow">The year is edited, not filled.</p>
              <h2>Snow silence.<br />High-summer air.</h2>
            </div>
            <div className="season-ledger">
              <article><span>Winter / 01</span><h3>December—April</h3><p>Four nights minimum. Breakfast and a four-course evening menu are included.</p></article>
              <article><span>Summer / 02</span><h3>June—October</h3><p>Three nights minimum. The same twelve rooms, with longer paths and later light.</p></article>
            </div>
          </section>

          <section className="hospitality-arrival" data-section-reveal>
            <p className="vertical-note">ARRIVAL / DINING / SAUNA</p>
            <div>
              <p className="eyebrow">A precise small-house promise</p>
              <h2>Nothing here needs the language of a resort.</h2>
            </div>
            <dl>
              <div><dt>Arrival</dt><dd>Village shuttle from a fictional rail station, 18 minutes away.</dd></div>
              <div><dt>Table</dt><dd>Breakfast and a four-course evening menu. Lunch is not served.</dd></div>
              <div><dt>Heat / cold</dt><dd>One timber sauna and an outdoor plunge—not a full spa.</dd></div>
            </dl>
          </section>

          <section className="hospitality-availability" id="availability" data-section-reveal>
            <div>
              <p className="eyebrow">Availability / local demonstration</p>
              <h2>Choose a season before a room.</h2>
              <p>This form does not contact a property. HOUSE 01 is a non-commercial benchmark calibration identity.</p>
            </div>
            <LocalRequestForm
              fields={[
                { id: "season", label: "Season", type: "select", required: true, options: ["Winter · December—April", "Summer · June—October"] },
                { id: "arrival", label: "Preferred arrival", type: "date", required: true },
                {
                  id: "nights",
                  label: "Nights",
                  type: "number",
                  required: true,
                  min: 3,
                  max: 14,
                  contextualMinimum: {
                    fieldId: "season",
                    values: { "Winter · December—April": 4, "Summer · June—October": 3 },
                  },
                  hint: "Three-night summer / four-night winter minimum.",
                },
                { id: "email", label: "Email", type: "email", required: true },
              ]}
              submitLabel="Check fictional availability"
              successTitle="The local state is complete."
              successText="A real availability service would now validate season, minimum stay, inventory, and privacy consent. No data left this browser."
              disclaimer="No booking, inventory check, or personal-data transfer occurs in this showcase."
            />
          </section>
        </MotionShell>
      </main>
    </BrandShell>
  );
}
