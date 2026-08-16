import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Send } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const ResubmitNotesheet = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notesheet, setNotesheet] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotesheet = async () => {
      try {
        const r = await api.get(`/api/notesheets/${id}`);
        const data = r.data.data;
        setNotesheet(data);
        setRemarks(data.remarks || '');
        if (data.quotations && data.quotations.length > 0) {
          setQuotations(
            data.quotations.map((q) => ({
              vendorName: q.vendorName || '',
              amount: q.amount || '',
              validity: q.validity ? new Date(q.validity).toISOString().split('T')[0] : '',
              itemBreakdown: q.itemBreakdown || '',
            }))
          );
        } else {
          setQuotations([
            { vendorName: '', amount: '', validity: '', itemBreakdown: '' },
            { vendorName: '', amount: '', validity: '', itemBreakdown: '' },
          ]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setFetching(false);
      }
    };
    fetchNotesheet();
  }, [id]);

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

    if (quotations.length < 2 || quotations.length > 3) {
      setError('You must provide between 2 and 3 vendor quotations.');
      return;
    }

    for (let i = 0; i < quotations.length; i++) {
      const q = quotations[i];
      if (!q.vendorName.trim()) {
        setError(`Vendor name is required for Quotation #${i + 1}.`);
        return;
      }
      if (!q.amount || Number(q.amount) < 0) {
        setError(`Valid amount is required for Quotation #${i + 1}.`);
        return;
      }
      if (!q.validity) {
        setError(`Validity date is required for Quotation #${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        remarks: remarks.trim(),
        quotations: quotations.map((q) => ({
          vendorName: q.vendorName.trim(),
          amount: Number(q.amount),
          validity: new Date(q.validity).toISOString(),
          itemBreakdown: q.itemBreakdown.trim(),
        })),
      };

      await api.post(`/api/notesheets/${id}/resubmit`, payload);
      navigate('/po-office/notesheets');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Resubmit Revised Notesheet</h1>
        <p className="page-eyebrow">
          Notesheet: {notesheet?.referenceNumber || id?.slice(-8)} (Revision {(notesheet?.revisionNumber || 1) + 1})
        </p>
      </div>

      {error && <div className="page-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Show previous rejection note */}
      {notesheet?.decisionNote && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: 4 }}>
            Rejection Reason (Director):
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: '#991b1b', fontStyle: 'italic' }}>
            "{notesheet.decisionNote}"
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="section-card" style={{ padding: 24 }}>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Updated Remarks / Explanation</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Explain changes made to address Director's comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Revised Vendor Quotations (2 - 3 mandatory)</h3>
          {quotations.length < 3 && (
            <button type="button" className="btn btn-ghost" onClick={addQuotation}>
              <Plus size={14} /> Add Vendor
            </button>
          )}
        </div>

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
                Quotation #{idx + 1}
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
                  placeholder="Vendor Name"
                  value={q.vendorName}
                  onChange={(e) => handleQuotationChange(idx, 'vendorName', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₹) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="Amount"
                  value={q.amount}
                  onChange={(e) => handleQuotationChange(idx, 'amount', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Validity <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={q.validity}
                  onChange={(e) => handleQuotationChange(idx, 'validity', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Breakdown / Remarks</label>
              <input
                type="text"
                className="form-input"
                placeholder="Itemized breakdown..."
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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : <Send size={15} />}
            Resubmit Notesheet to Director
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResubmitNotesheet;
