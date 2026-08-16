import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, Trash2 } from "lucide-react";
import "./regional-head.css";

/* =========================================================
   APPROVAL STEP — small reusable component
========================================================= */

const ApprovalStep = ({ label, sub, active }) => (
  <div className="nm-approval-step">
    <div className={`nm-approval-dot${active ? " nm-approval-dot-active" : ""}`}>
      {active && <span className="nm-approval-dot-inner" />}
    </div>
    <div className="nm-approval-step-text">
      <strong>{label}</strong>
      <span>{sub}</span>
    </div>
  </div>
);

const ApprovalLine = () => <div className="nm-approval-line" />;

/* =========================================================
   NEW MEMO PAGE
========================================================= */

const NewMemo = () => {
  const navigate = useNavigate();

  const [title, setTitle]           = useState("");
  const [department, setDepartment] = useState("Marketing");
  const [campus, setCampus]         = useState("SHS Dhawas");
  const [requiresPurchase, setRequiresPurchase] = useState(false);
  const [alreadyInStock, setAlreadyInStock]     = useState(false);
  const [notes, setNotes]           = useState("");

  const [items, setItems] = useState([
    { id: 1, name: "", qty: 1, unitPrice: 0 },
  ]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
        0
      ),
    [items]
  );

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: "", qty: 1, unitPrice: 0 },
    ]);

  const updateItem = (id, field, value) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

  const removeItem = (id) =>
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== id)
    );

  const handleGenerate = () => {
    console.log("Memo:", {
      title, department, campus,
      requiresPurchase, alreadyInStock,
      items, notes, total,
    });
    /* TODO: POST to API */
  };

  return (
    <div className="nm-page">

      {/* ── Header ── */}
      <div className="nm-header">
        <div className="nm-eyebrow">NEW MEMO</div>
        <h1>Generate a memo</h1>
        <p>Capture the requirement and route it through the approval flow.</p>
      </div>


      {/* ── Body: left content + right panel ── */}
      <div className="nm-body">

        {/* ── LEFT COLUMN ── */}
        <div className="nm-left">

          {/* Details card */}
          <div className="nm-card">
            <h2 className="nm-card-title">Details</h2>

            {/* Title */}
            <div className="nm-field">
              <label>Title</label>
              <input
                type="text"
                placeholder="e.g. Procurement of projectors for Academics block"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Department + Campus */}
            <div className="nm-row">
              <div className="nm-field">
                <label>Department</label>
                <div className="nm-select-wrap">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option>Marketing</option>
                    <option>HR</option>
                    <option>Operations</option>
                    <option>Academics</option>
                    <option>Events</option>
                    <option>Administration</option>
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>

              <div className="nm-field">
                <label>Campus</label>
                <div className="nm-select-wrap">
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                  >
                    <option>SHS Dhawas</option>
                    <option>Sapiens Main Campus</option>
                    <option>North Campus</option>
                    <option>South Campus</option>
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>

            {/* Routing */}
            <div className="nm-routing-label">Routing</div>

            <div
              className="nm-toggle-row"
              onClick={() => setRequiresPurchase((v) => !v)}
            >
              <span>Requires purchase</span>
              <div className={`rh-toggle${requiresPurchase ? " on" : ""}`}>
                <div className="rh-toggle-knob" />
              </div>
            </div>

            <div
              className="nm-toggle-row"
              onClick={() => setAlreadyInStock((v) => !v)}
            >
              <span>Already in stock</span>
              <div className={`rh-toggle${alreadyInStock ? " on" : ""}`}>
                <div className="rh-toggle-knob" />
              </div>
            </div>
          </div>


          {/* Items card */}
          <div className="nm-card">
            <div className="nm-card-header">
              <h2 className="nm-card-title">Items</h2>
              <button type="button" className="nm-add-item-btn" onClick={addItem}>
                <Plus size={15} />
                Add item
              </button>
            </div>

            {/* Column headers */}
            <div className="nm-items-head">
              <span className="nm-col-name">Item name</span>
              <span className="nm-col-qty">Qty</span>
              <span className="nm-col-price">Est. unit ₹</span>
              <span className="nm-col-del" />
            </div>

            {/* Item rows */}
            {items.map((item) => (
              <div key={item.id} className="nm-item-row">
                <input
                  className="nm-col-name"
                  type="text"
                  placeholder="Item description"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(item.id, "name", e.target.value)
                  }
                />
                <input
                  className="nm-col-qty"
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) =>
                    updateItem(item.id, "qty", Number(e.target.value))
                  }
                />
                <input
                  className="nm-col-price"
                  type="number"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(item.id, "unitPrice", Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  className="nm-col-del nm-del-btn"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Estimated total */}
            <div className="nm-total-row">
              <span>Estimated total</span>
              <strong>₹ {total.toLocaleString("en-IN")}</strong>
            </div>
          </div>


          {/* Notes card */}
          <div className="nm-card">
            <h2 className="nm-card-title">Notes</h2>
            <textarea
              className="nm-notes-area"
              placeholder="Any special case, justification or attachment reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>


          {/* Footer actions */}
          <div className="nm-actions">
            <button
              type="button"
              className="nm-cancel-btn"
              onClick={() => navigate("/regional-head")}
            >
              Cancel
            </button>

            <button
              type="button"
              className="nm-generate-btn"
              onClick={handleGenerate}
            >
              Generate memo
            </button>
          </div>

        </div>


        {/* ── RIGHT COLUMN — Approval flow ── */}
        <aside className="nm-right">
          <div className="nm-card nm-approval-card">
            <h2 className="nm-card-title">Approval flow</h2>
            <p className="nm-approval-subtitle">Standard pipeline</p>

            <div className="nm-approval-list">
              <ApprovalStep label="Regional Head" sub="Pending action" active />
              <ApprovalLine />
              <ApprovalStep label="Director"      sub="Awaiting" />
              <ApprovalLine />
              <ApprovalStep label="Chairperson"   sub="Awaiting" />
              <ApprovalLine />
              <ApprovalStep label="Accounts"      sub="Awaiting" />
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
};

export default NewMemo;
