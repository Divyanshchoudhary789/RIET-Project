import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const ResubmitAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    feasibilityNotes: '',
    estimatedCost: '',
    technicalRemarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get(`/api/assessments/${id}`);
        const a = r.data.data;
        setAssessment(a);
        setForm({
          feasibilityNotes: a.feasibilityNotes || '',
          estimatedCost: a.estimatedCost?.toString() || '',
          technicalRemarks: a.technicalRemarks || '',
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.feasibilityNotes.trim()) { setError('Feasibility notes are required.'); return; }
    if (!form.estimatedCost || isNaN(Number(form.estimatedCost))) { setError('Valid estimated cost is required.'); return; }

    setLoading(true);
    try {
      await api.patch(`/api/assessments/${id}/resubmit`, {
        feasibilityNotes: form.feasibilityNotes.trim(),
        estimatedCost: Number(form.estimatedCost),
        technicalRemarks: form.technicalRemarks.trim() || undefined,
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
          <h1 className="page-title">Resubmit Assessment</h1>
          <p className="page-subtitle">Update and resubmit the rejected assessment</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {assessment?.timeline?.findLast?.((t) => t.action === 'Rejected')?.note && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>Rejection reason:</strong> {assessment.timeline.findLast((t) => t.action === 'Rejected').note}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Update Assessment</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Estimated Cost (₹)</label>
              <input className="form-input" type="number" min="0" value={form.estimatedCost} onChange={(e) => set('estimatedCost', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label required">Feasibility Notes</label>
              <textarea className="form-textarea" rows={4} value={form.feasibilityNotes} onChange={(e) => set('feasibilityNotes', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Technical Remarks</label>
              <textarea className="form-textarea" rows={3} value={form.technicalRemarks} onChange={(e) => set('technicalRemarks', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/department-admin/assessments')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Resubmitting…</> : 'Resubmit Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResubmitAssessment;
