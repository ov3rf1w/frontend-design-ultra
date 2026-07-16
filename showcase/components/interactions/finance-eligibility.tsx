"use client";

import { useId, useState } from "react";

export function FinanceEligibility() {
  const amountId = useId();
  const horizonId = useId();
  const [amount, setAmount] = useState(2500);
  const [horizon, setHorizon] = useState(5);
  const meetsFixtureFloor = amount >= 2500 && horizon >= 5;

  return (
    <section className="eligibility-tool" aria-labelledby="eligibility-title">
      <div>
        <p className="eyebrow">Illustrative eligibility check</p>
        <h2 id="eligibility-title">Start with constraints, not a promise.</h2>
        <p>This local tool uses only the fictional fixture thresholds. It is not advice, a suitability assessment, or a return projection.</p>
      </div>
      <div className="eligibility-controls">
        <label htmlFor={amountId}>
          <span>Initial amount</span>
          <output htmlFor={amountId}>£{amount.toLocaleString("en-GB")}</output>
        </label>
        <input id={amountId} type="range" min="500" max="20000" step="500" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        <label htmlFor={horizonId}>
          <span>Investment horizon</span>
          <output htmlFor={horizonId}>{horizon} years</output>
        </label>
        <input id={horizonId} type="range" min="1" max="15" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} />
        <div className="eligibility-result" aria-live="polite">
          <span className={meetsFixtureFloor ? "result-mark is-positive" : "result-mark"} aria-hidden="true" />
          <div>
            <strong>{meetsFixtureFloor ? "Fixture thresholds met" : "Outside this fixture’s starting thresholds"}</strong>
            <p>{meetsFixtureFloor ? "A real service would still need risk, eligibility, and suitability information." : "The fictional minimum is £2,500 with a five-year horizon."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

