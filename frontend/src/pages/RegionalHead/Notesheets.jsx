import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Check, Plus, FileText, X } from "lucide-react";

import api from "../../utils/api";
import "./regional-head.css";

const DEPARTMENTS = [
  "All departments",
  "Marketing",
  "HR",
  "Operations",
  "Academics",
  "Events",
  "Administration",
];

/* =========================================================
   NEW NOTESHEET MODAL
========================================================= */

const NewNotesheetModal = ({ onClose, onSubmit }) => {
  const [title, setTitle]           = useState("");
  const [department, setDepartment] = useState("Marketing");
  const [submittedBy, setSubmittedBy] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseRequired, setPurchaseRequired] = useState(false);
  const [alreadyInStock, setAlreadyInStock]   = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);

  const deptRef = useRef(null);

  /* Close dept dropdown on outside click */
  useEffect(() => {
    const handle = (e) => {
      if (deptRef.current && !deptRef.current.contains(e.target)) {
        setDeptOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, department, submittedBy, description, purchaseRequired, alreadyInStock });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>New notesheet</h2>
            <p>Log a notesheet received from a department.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="modal-field">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Department + Submitted by */}
        <div className="modal-two-col">

          {/* Department custom dropdown */}
          <div className="modal-field" style={{ marginBottom: 0 }}>
            <label>Department</label>
            <div ref={deptRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="filter-btn"
                style={{ width: "100%", minWidth: 0 }}
                onClick={() => setDeptOpen((o) => !o)}
              >
                <span>{department}</span>
                <ChevronDown size={15} />
              </button>
              {deptOpen && (
                <div
                  className="dept-dropdown"
                  style={{ minWidth: "100%", left: 0 }}
                >
                  {DEPARTMENTS.slice(1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="dept-dropdown-item"
                      onClick={() => {
                        setDepartment(d);
                        setDeptOpen(false);
                      }}
                    >
                      <span>{d}</span>
                      {department === d && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submitted by */}
          <div className="modal-field" style={{ marginBottom: 0 }}>
            <label>Submitted by</label>
            <input
              type="text"
              placeholder="Name / designation"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
            />
          </div>

        </div>

        {/* Description */}
        <div className="modal-field" style={{ marginTop: 14 }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Purchase required toggle */}
        <div
          className="modal-toggle-row"
          onClick={() => setPurchaseRequired((v) => !v)}
        >
          <div className="modal-toggle-text">
            <strong>Purchase required</strong>
            <span>Routes through Purchase Manager → PO flow.</span>
          </div>
          <div className={`rh-toggle${purchaseRequired ? " on" : ""}`}>
            <div className="rh-toggle-knob" />
          </div>
        </div>

        {/* Already in stock toggle */}
        <div
          className="modal-toggle-row"
          onClick={() => setAlreadyInStock((v) => !v)}
        >
          <div className="modal-toggle-text">
            <strong>Item already in stock</strong>
            <span>Skip purchase. Dispatch from inventory after Chairperson.</span>
          </div>
          <div className={`rh-toggle${alreadyInStock ? " on" : ""}`}>
            <div className="rh-toggle-knob" />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-submit-btn" onClick={handleSubmit}>
            Log notesheet
          </button>
        </div>

      </div>
    </div>
  );
};


/* =========================================================
   NOTESHEETS PAGE
========================================================= */

const Notesheets = () => {
  const [searchParams] = useSearchParams();
  const status     = searchParams.get("status");
  const department = searchParams.get("department");

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [selectedDept, setSelectedDept] = useState(
    department || "All departments"
  );
  const [deptOpen, setDeptOpen]         = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);

  const deptRef = useRef(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handle = (e) => {
      if (deptRef.current && !deptRef.current.contains(e.target)) {
        setDeptOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  /* Load notesheets */
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const params = {};
        if (status) params.status = status;

        const dept = selectedDept !== "All departments" ? selectedDept : null;
        if (dept) params.department = dept;

        const response = await api.get("/api/requirements", { params });

        if (isMounted) setRequirements(response.data);
      } catch (err) {
        console.error("Failed to load requirements:", err);
        if (isMounted) setRequirements([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [status, selectedDept]);

  const handleNewNotesheet = (data) => {
    console.log("New notesheet:", data);
    /* TODO: POST to API, then refetch */
  };

  return (
    <div className="notes-page">

      {/* Header */}
      <section className="notes-header">

        <div className="notes-header-left">
          <div className="notes-eyebrow">INBOX</div>
          <h1>Departmental notesheets</h1>
          <p>
            All notesheets from Marketing, HR,
            Operations, Academics, Events and Administration.
          </p>
        </div>

        <div className="notes-actions">

          {/* Department filter dropdown */}
          <div className="dept-filter-wrap" ref={deptRef}>
            <button
              type="button"
              className="filter-btn"
              onClick={() => setDeptOpen((o) => !o)}
            >
              <span>{selectedDept}</span>
              <ChevronDown size={16} />
            </button>

            {deptOpen && (
              <div className="dept-dropdown">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="dept-dropdown-item"
                    onClick={() => {
                      setSelectedDept(d);
                      setDeptOpen(false);
                    }}
                  >
                    <span>{d}</span>
                    {selectedDept === d && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Log notesheet button — opens modal */}
          <button
            type="button"
            className="log-btn"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={17} />
            <span>Log notesheet</span>
          </button>

        </div>

      </section>


      {/* Notesheets card */}
      <section className="notes-card">

        {loading ? (
          <div className="notes-empty-state">
            <FileText size={36} />
            <h3>Loading...</h3>
            <p>Fetching notesheets, please wait.</p>
          </div>
        ) : requirements.length > 0 ? (

          <div className="notes-list">
            {requirements.map((item) => (
              <div key={item._id} className="notes-list-row">
                <div>
                  <div className="notes-list-title">{item.title}</div>
                  <div className="notes-list-meta">
                    {item.department} · {item.centreName} · {item.currentStage}
                  </div>
                </div>
                <span
                  className={`notes-status-pill notes-status-${String(
                    item.status
                  ).toLowerCase()}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>

        ) : (

          <div className="notes-empty-state">
            <FileText size={36} />
            <h3>No notesheets here yet</h3>
            <p>Log the first one to see it appear.</p>
          </div>

        )}

      </section>


      {/* New Notesheet Modal */}
      {modalOpen && (
        <NewNotesheetModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleNewNotesheet}
        />
      )}

    </div>
  );
};

export default Notesheets;
