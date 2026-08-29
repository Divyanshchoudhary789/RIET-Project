import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, formatCurrency } from '../../utils/helpers';
import LineItemsEditor from '../../components/LineItemsEditor';
import '../../styles/pages.css';

const NewAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const myDept = user?.scopeRef?.toString?.() || user?.scopeRef;

  const [proposals, setProposals]   = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    workProposalRef: location.state?.workProposalId || '',
    feasibilityNotes: '',
    estimatedCost: '',
    technicalRemarks: '',
    note: '',
  });
  const [items, setItems] = useState([]);
  const [costTouched, setCostTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.get('/api/work-proposals?status=submitted&limit=100'),
          api.get('/api/work-proposals?status=revised&limit=100'),
        ]);
        const extract = (r) => { const d = r.data.data; return Array.isArray(d) ? d : (d?.proposals || []); };
        const all = [...extract(r1), ...extract(r2)];
        const seen = new Set();
        setProposals(all.filter((p) => { if (seen.has(p._id)) return false; seen.add(p._id); return true; }));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // Load the selected proposal's line items for this department
  useEffect(() => {
    if (!form.workProposalRef) { setItems([]); return; }
    api.get(`/api/work-proposals/${form.workProposalRef}`)
      .then((r) => {
        const p = r.data.data;
        const mine = (p.items || []).filter((it) => {
          const d = it.departmentRef?._id || it.departmentRef;
          return !myDept || d?.toString() === myDept;
        });
        setItems(mine.map((it) => ({
          _key: crypto.randomUUID(),
          sourceRequirementRef: it.sourceRequirementRef?._id || it.sourceRequirementRef,
          sourceItemId: it.sourceItemId || undefined,
          name: it.name || '', quantity: it.quantity ?? 1, unit: it.unit || '',
          price: it.price ?? '', description: it.description || '',
          _sourceLabel: it.sourceRequirementRef?.title,
        })));
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [form.workProposalRef, myDept]);

  const itemsTotal = items.reduce((a, it) => a + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const effectiveCost = costTouched ? form.estimatedCost : (items.length ? String(itemsTotal) : form.estimatedCost);

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.workProposalRef) { setError('Select a work proposal.'); return; }
    if (!form.feasibilityNotes.trim() || form.feasibilityNotes.trim().length < 10) { setError('Feasibility notes must be at least 10 characters.'); return; }
    const cost = Number(effectiveCost);
    if (isNaN(cost) || cost < 0) { setError('Enter a valid estimated cost.'); return; }
    for (const it of items) {
      if (!it.name.trim() || !it.unit.trim()) { setError('Every line item needs a name and unit.'); return; }
      if (it.price === '' || isNaN(Number(it.price)) || Number(it.price) < 0) { setError('Every line item needs a valid price.'); return; }
    }

    setLoading(true);
    try {
      await api.post('/api/assessments', {
        workProposalRef: form.workProposalRef,
        feasibilityNotes: form.feasibilityNotes.trim(),
        estimatedCost: cost,
        technicalRemarks: form.technicalRemarks.trim() || undefined,
        recommendedAction: 'approve',
        note: form.note.trim() || undefined,
        items: items.length ? items.map((it) => ({
          sourceRequirementRef: it.sourceRequirementRef || undefined,
          sourceItemId: it.sourceItemId || undefined,
          name: it.name.trim(), quantity: Number(it.quantity), unit: it.unit.trim(),
          price: Number(it.price), description: (it.description || '').trim(),
        })) : undefined,
      });
      navigate('/department-admin/assessments');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div className="form-page-wide">
      <div className="page-header">
        <div className="page-heading">
          <button style={{ all:'unset', display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:'var(--color-text-muted)', fontSize:13, marginBottom:4 }} onClick={() => navigate('/department-admin/assessments')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">New Assessment</h1>
          <p className="page-subtitle">Assess the line items routed to your department</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Assessment Details</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Work Proposal</label>
              <select className="form-select" value={form.workProposalRef} onChange={(e) => { set('workProposalRef', e.target.value); setCostTouched(false); }}>
                <option value="">Select a work proposal…</option>
                {proposals.map((p) => (
                  <option key={p._id} value={p._id}>{p.title || p.referenceNumber || p._id?.slice(-8)}</option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label required">Estimated Cost (₹)</label>
                <input className="form-input" type="number" min="0" placeholder="0"
                  value={effectiveCost}
                  onChange={(e) => { setCostTouched(true); set('estimatedCost', e.target.value); }} />
                {items.length > 0 && !costTouched && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Auto-summed from line items ({formatCurrency(itemsTotal)}). Edit to override.</span>
                )}
              </div>
              <div className="form-field">
                <label className="form-label">Recommended Action</label>
                <input className="form-input" value="Approve" disabled />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label required">Feasibility Notes</label>
              <textarea className="form-textarea" rows={4} placeholder="Feasibility analysis…" value={form.feasibilityNotes} onChange={(e) => set('feasibilityNotes', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Technical Remarks</label>
              <textarea className="form-textarea" rows={3} placeholder="Optional technical remarks…" value={form.technicalRemarks} onChange={(e) => set('technicalRemarks', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Note (optional)</label>
              <textarea className="form-textarea" rows={2} placeholder="Any note for the Director…" value={form.note} onChange={(e) => set('note', e.target.value)} />
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="form-card">
            <LineItemsEditor items={items} onChange={setItems} allowAdd title="Line Items (your department)" />
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/department-admin/assessments')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Submitting…</> : 'Submit Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewAssessment;
