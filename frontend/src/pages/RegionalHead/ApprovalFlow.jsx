import React from "react";
import "./regional-head.css";

/* =========================================================
   PIPELINE STEP
========================================================= */

const Step = ({ label, sub, active }) => (
  <div className="af-step">
    <div className={`af-dot${active ? " af-dot-active" : ""}`}>
      {active && <span className="af-dot-inner" />}
    </div>
    <div className="af-step-text">
      <strong>{label}</strong>
      <span>{sub}</span>
    </div>
  </div>
);

const Line = () => <div className="af-line" />;

/* =========================================================
   PIPELINE DATA
========================================================= */

const PIPELINES = [
  {
    title: "Standard request",
    sub: "No purchase involved",
    steps: [
      { label: "Regional Head",  sub: "Pending action", active: true },
      { label: "Director",       sub: "Awaiting" },
      { label: "Chairperson",    sub: "Awaiting" },
      { label: "Accounts",       sub: "Awaiting" },
    ],
  },
  {
    title: "Purchase required",
    sub: "New procurement",
    steps: [
      { label: "Regional Head",              sub: "Pending action", active: true },
      { label: "Director",                   sub: "Awaiting" },
      { label: "Chairperson",               sub: "Awaiting" },
      { label: "Purchase Manager (PO)",      sub: "Awaiting" },
      { label: "Director (PO Approval)",     sub: "Awaiting" },
      { label: "Chairperson (PO Approval)",  sub: "Awaiting" },
      { label: "Accounts (Performa Invoice)", sub: "Awaiting" },
      { label: "Order Placed",               sub: "Awaiting" },
      { label: "Material Received",          sub: "Awaiting" },
      { label: "Inventory → Centre",         sub: "Awaiting" },
    ],
  },
  {
    title: "In-stock dispatch",
    sub: "Material already available",
    steps: [
      { label: "Regional Head",           sub: "Pending action", active: true },
      { label: "Director",                sub: "Awaiting" },
      { label: "Chairperson",             sub: "Awaiting" },
      { label: "Despatch from Stock → Centre", sub: "Awaiting" },
    ],
  },
];

/* =========================================================
   APPROVAL FLOW PAGE
========================================================= */

const ApprovalFlow = () => {
  return (
    <div className="af-page">

      {/* Header */}
      <div className="af-header">
        <div className="af-eyebrow">PROCESS</div>
        <h1>Approval flow</h1>
        <p>
          Every requirement is routed through one of three pipelines depending on
          whether it needs a fresh purchase, can be served from existing stock, or
          is a standard request.
        </p>
      </div>

      {/* 3-column pipeline grid */}
      <div className="af-grid">
        {PIPELINES.map((pipeline) => (
          <div
            key={pipeline.title}
            className={`af-pipeline-card${
              pipeline.title === "Purchase required"
                ? " af-pipeline-card-highlight"
                : ""
            }`}
          >
            <div className="af-pipeline-header">
              <h2>{pipeline.title}</h2>
              <p>{pipeline.sub}</p>
            </div>

            <div className="af-pipeline-steps">
              {pipeline.steps.map((step, i) => (
                <React.Fragment key={i}>
                  <Step
                    label={step.label}
                    sub={step.sub}
                    active={step.active}
                  />
                  {i < pipeline.steps.length - 1 && <Line />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ApprovalFlow;
