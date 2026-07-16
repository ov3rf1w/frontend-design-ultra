"use client";

import { useState } from "react";

import { Pendant, type PendantMaterial } from "@/components/illustrations";

const materials: { id: PendantMaterial; label: string }[] = [
  { id: "aluminium", label: "Brushed aluminium" },
  { id: "brass", label: "Oxidised brass" },
  { id: "steel", label: "Blackened steel" },
];

const sizes = [
  { diameter: 320, price: 420 },
  { diameter: 480, price: 560 },
  { diameter: 640, price: 720 },
] as const;

export function ProductConfigurator() {
  const [material, setMaterial] = useState<PendantMaterial>("brass");
  const [size, setSize] = useState<(typeof sizes)[number]>(sizes[1]);
  const [saved, setSaved] = useState(false);

  return (
    <section className="configurator" aria-labelledby="configurator-title">
      <div className="product-stage">
        <p className="stage-label">Original technical illustration · no product photography</p>
        <Pendant material={material} size={size.diameter} />
      </div>
      <div className="configurator-panel">
        <p className="eyebrow">Pendant 01 / made to order</p>
        <h1 id="configurator-title">Light, measured.</h1>
        <p>A shallow spun shade, warm replaceable module, and a finish that records how it was made.</p>
        <fieldset>
          <legend>Material</legend>
          <div className="option-grid material-options">
            {materials.map((item) => (
              <button key={item.id} type="button" aria-pressed={material === item.id} onClick={() => { setMaterial(item.id); setSaved(false); }}>
                <span className={`material-swatch ${item.id}`} aria-hidden="true" />{item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Diameter</legend>
          <div className="option-grid size-options">
            {sizes.map((item) => (
              <button key={item.diameter} type="button" aria-pressed={size.diameter === item.diameter} onClick={() => { setSize(item); setSaved(false); }}>
                Ø {item.diameter} mm <span>£{item.price}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="configuration-summary" aria-live="polite">
          <div><span>Configuration</span><strong>{materials.find(({ id }) => id === material)?.label}, Ø {size.diameter} mm</strong></div>
          <div><span>Made-to-order price</span><strong>£{size.price}</strong></div>
          <div><span>Lead time</span><strong>4–6 weeks before dispatch</strong></div>
        </div>
        <button type="button" className="primary-action" onClick={() => setSaved(true)} disabled={saved}>
          {saved ? "Saved locally" : "Save configuration"} <span aria-hidden="true">↗</span>
        </button>
        <p className="form-disclaimer" role="status" aria-live="polite">
          {saved ? "Configuration saved in this page state only. No order or personal data was submitted." : "Local demonstration only. No order or personal data is submitted."}
        </p>
      </div>
    </section>
  );
}
