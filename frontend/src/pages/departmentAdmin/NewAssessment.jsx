import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const RECOMMENDED_ACTIONS = ['approve', 'reject', 'defer', 'partial_approve'];

const NewAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [proposals, setProposals]   = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    workProposalRef: location.state?.workProposalId || '',
    feasibilityNotes: '',
    estimatedCost: '',
    technicalRemarks: '',
    recommendedAction: 'approve',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Load both submitted and revised proposals (both are assessable states)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.workProposalRef) { setError('Select a work proposal.'); return; }
    if (!form.feasibilityNotes.trim()) { setError('Feasibility notes are required.'); return; }
    if (!form.estimatedCost || isNaN(Number(form.estimatedCost))) { setError('Valid estimated cost is required.'); return; }

    setLoading(true);
    try {
      await api.post('/api/assessments', {
        workProposalRef: form.workProposalRef,
        feasibilityNotes: form.feasibilityNotes.trim(),
        estimatedCost: Number(form.estimatedCost),
        technicalRemarks: form.technicalRemarks.trim() || undefined,
        recommendedAction: form.recommendedAction,
      });
      navigate('/department-admin/assessments');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  if (loadingData) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-heading">
          <button style={{ all:'unset', display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:'var(--color-text-muted)', fontSize:13, marginBottom:4 }} onClick={() => navigate('/department-admin/assessments')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">New Assessment</h1>
          <p className="page-subtitle">Assess a work proposal assigned to your department</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Assessment Details</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Work Proposal</label>
              <select className="form-select" value={form.workProposalRef} onChange={(e) => set('workProposalRef', e.target.value)}>
                <option value="">Select a work proposal…</option>
                {proposals.map((p) => (
                  <option key={p._id} value={p._id}>{p.title || p.referenceNumber || p._id?.slice(-8)}</option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label required">Estimated Cost (₹)</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.estimatedCost} onChange={(e) => set('estimatedCost', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label required">Recommended Action</label>
                <select className="form-select" value={form.recommendedAction} onChange={(e) => set('recommendedAction', e.target.value)}>
                  {RECOMMENDED_ACTIONS.map((a) => (
                    <option key={a} value={a}>{a.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
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
          </div>
        </div>

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
