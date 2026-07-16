"use client";

import { useState, type KeyboardEvent } from "react";

import { RelayMap } from "@/components/illustrations";

const stages = [
  {
    id: "intake",
    label: "Intake",
    owner: "Unassigned",
    status: "Needs triage",
    activity: "Request entered through the operations inbox.",
    action: "Assign an owner",
  },
  {
    id: "owner",
    label: "Ownership",
    owner: "A. Flores",
    status: "In progress",
    activity: "Dependencies mapped and due date acknowledged.",
    action: "Request approval",
  },
  {
    id: "approval",
    label: "Approval",
    owner: "M. Chen",
    status: "Reviewing",
    activity: "Change summary and evidence attached to the activity history.",
    action: "Approve completion",
  },
  {
    id: "complete",
    label: "Completion",
    owner: "A. Flores",
    status: "Complete",
    activity: "Final state and approver recorded in the exportable history.",
    action: "Export history",
  },
] as const;

export function SaasFlow() {
  const [active, setActive] = useState(0);
  const [exported, setExported] = useState(false);
  const stage = stages[active];

  function activateStage(index: number) {
    setActive(index);
    setExported(false);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + stages.length) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;

    event.preventDefault();
    activateStage(next);
    document.getElementById(`tab-${stages[next].id}`)?.focus();
  }

  function handleStageAction() {
    if (active < stages.length - 1) {
      activateStage(active + 1);
      return;
    }
    setExported(true);
  }

  return (
    <section className="workflow-demo" aria-labelledby="workflow-title">
      <div className="workflow-heading">
        <div>
          <p className="eyebrow">Synthetic product state</p>
          <h2 id="workflow-title">A workflow you can inspect.</h2>
        </div>
        <p>Four linked states, scoped ownership, and activity history. No decorative dashboard rectangles.</p>
      </div>
      <div className="workflow-stage">
        <div className="workflow-tabs" role="tablist" aria-label="Workflow stages">
          {stages.map((item, index) => (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              role="tab"
              aria-selected={active === index}
              aria-controls={`panel-${item.id}`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => activateStage(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
        </div>
        <RelayMap active={active} />
        <div id={`panel-${stage.id}`} role="tabpanel" aria-labelledby={`tab-${stage.id}`} className="workflow-panel" aria-live="polite">
          <div><span>Owner</span><strong>{stage.owner}</strong></div>
          <div><span>Status</span><strong>{stage.status}</strong></div>
          <div><span>Latest activity</span><strong>{stage.activity}</strong></div>
          <button type="button" onClick={handleStageAction} disabled={exported}>
            {exported ? "History exported locally" : stage.action}<span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
