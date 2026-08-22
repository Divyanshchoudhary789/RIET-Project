import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatCurrency } from '../../utils/helpers';
import '../../styles/pages.css';

const NewNotesheet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAssessmentId = searchParams.get('assessmentId') || '';

  const [assessments, setAssessments] = useState([]);
  const [assessmentRef, setAssessmentRef] = useState(initialAssessmentId);
  const [remarks, setRemarks] = useState('');
  const [quotations, setQuotations] = useState([
    { vendorName: '', amount: '', validity: '', itemBreakdown: '' },
    { vendorName: '', amount: '', validity: '', itemBreakdown: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [fetchingAssessments, setFetchingAssessments] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForwardedAssessments = async () => {
      try {
        const r = await api.get('/api/assessments?status=forwarded&limit=100');
        const raw = Array.isArray(r.data.data) ? r.data.data : (r.data.data?.assessments || []);
        // Assessment status stays "forwarded" even after a notesheet exists for it, so
        // exclude ones that already have one to prevent picking a duplicate target.
        const list = raw.filter((a) => !a.notesheetRef);
        setAssessments(list);
        // Only pre-select if nothing is already selected (avoid overwriting URL param)
        setAssessmentRef((prev) => (prev ? prev : list[0]?._id || ''));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setFetchingAssessments(false);
      }
    };
    fetchForwardedAssessments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const handleQuotationChange = (index, field, value) => {
    setQuotations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addQuotation = () => {
    if (quotations.length >= 3) return;
    setQuotations((prev) => [
      ...prev,
      { vendorName: '', amount: '', validity: '', itemBreakdown: '' },
    ]);
  };

  const removeQuotation = (index) => {
    if (quotations.length <= 2) return;
    setQuotations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!assessmentRef) {
      setError('Please select a forwarded assessment.');
      return;
    }

    if (quotations.length < 2 || quotations.length > 3) {
      setError('You must provide between 2 and 3 vendor quotations.');
      return;
    }

    for (let i = 0; i < quotations.length; i++) {
      const q = quotations[i];
      if (!q.vendorName.trim()) {
        setError(`Quotation #${i + 1}: Vendor name is required.`);
        return;
      }
      if (!q.amount || Number(q.amount) < 0) {
        setError(`Quotation #${i + 1}: Please enter a valid amount (₹0 or more).`);
        return;
      }
      if (!q.validity) {
        setError(`Quotation #${i + 1}: Validity date is required.`);
        return;
      }
      // Client-side date check — validity must be today or in the future
      const selectedDate = new Date(q.validity);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setError(`Quotation #${i + 1} — Validity Until: Date cannot be in the past. Please select today's date or a future date.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        assessmentRef,
        remarks: remarks.trim(),
        quotations: quotations.map((q) => ({
          vendorName: q.vendorName.trim(),
          amount: Number(q.amount),
          validity: new Date(q.validity).toISOString(),
          itemBreakdown: q.itemBreakdown.trim(),
        })),
      };

      await api.post('/api/notesheets', payload);
      navigate('/po-office/notesheets');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Prepare New Notesheet</h1>
        <p className="page-eyebrow">Bundle vendor quotations for Director review</p>
      </div>

      {error && <div className="page-error" style={{ marginBottom: 20 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="section-card" style={{ padding: 24 }}>
        {/* Assessment selection */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Target Assessment <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          {fetchingAssessments ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
              No forwarded assessments available for notesheet creation.
            </div>
          ) : (
            <select
              className="form-input"
              value={assessmentRef}
              onChange={(e) => setAssessmentRef(e.target.value)}
              required
            >
              <option value="">-- Select Assessment --</option>
              {assessments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.referenceNumber || a._id?.slice(-8)} (Est: {formatCurrency(a.estimatedCost)}) - {a.workProposalRef?.title || 'Proposal'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Remarks */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Remarks / Observations</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Add any comparison remarks, vendor terms, or PO office recommendations..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {/* Quotations Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Vendor Quotations (2 - 3 mandatory)</h3>
          {quotations.length < 3 && (
            <button type="button" className="btn btn-ghost" onClick={addQuotation}>
              <Plus size={14} /> Add Vendor
            </button>
          )}
        </div>

        {/* Quotation Cards */}
        {quotations.map((q, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}>
                Vendor Quotation #{idx + 1}
              </span>
              {quotations.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeQuotation(idx)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Vendor Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Tech Solutions"
                  value={q.vendorName}
                  onChange={(e) => handleQuotationChange(idx, 'vendorName', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount (₹) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 45000"
                  value={q.amount}
                  onChange={(e) => handleQuotationChange(idx, 'amount', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Validity Until <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={q.validity}
                  onChange={(e) => handleQuotationChange(idx, 'validity', e.target.value)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Must be today or a future date
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Item / Service Breakdown</label>
              <input
                type="text"
                className="form-input"
                placeholder="Brief itemized cost breakdown..."
                value={q.itemBreakdown}
                onChange={(e) => handleQuotationChange(idx, 'itemBreakdown', e.target.value)}
              />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || fetchingAssessments}>
            {loading ? <span className="spinner spinner-sm" /> : <Send size={15} />}
            Submit Notesheet to Director
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewNotesheet;
