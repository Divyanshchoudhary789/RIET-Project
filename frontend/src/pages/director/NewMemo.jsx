import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const NewMemo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedNotesheetId = location.state?.notesheetId;
  const resubmitMemoId = location.state?.resubmitMemoId;

  const [notesheets, setNotesheets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [existingMemo, setExistingMemo] = useState(null);

  const [form, setForm] = useState({
    notesheetRef: preselectedNotesheetId || '',
    summary: '',
    recommendedVendor: '',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const nsRes = await api.get('/api/notesheets?status=submitted&limit=100');
        const d = nsRes.data.data;
        setNotesheets(Array.isArray(d) ? d : (d?.notesheets || []));

        if (resubmitMemoId) {
          const memoRes = await api.get(`/api/memos/${resubmitMemoId}`);
          const m = memoRes.data.data;
          setExistingMemo(m);
          setForm({
            notesheetRef: m.notesheetRef?._id || m.notesheetRef || '',
            summary: m.summary || '',
            recommendedVendor: m.recommendedVendor || '',
          });
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [resubmitMemoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.notesheetRef) { setError('Select a notesheet.'); return; }
    if (!form.summary.trim()) { setError('Summary is required.'); return; }

    setLoading(true);
    try {
      if (resubmitMemoId) {
        await api.post(`/api/memos/${resubmitMemoId}/resubmit`, {
          summary: form.summary.trim(),
          recommendedVendor: form.recommendedVendor.trim() || undefined,
        });
      } else {
        await api.post('/api/memos', {
          notesheetRef: form.notesheetRef,
          summary: form.summary.trim(),
          recommendedVendor: form.recommendedVendor.trim() || undefined,
        });
      }
      navigate('/director/memos');
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
          <button style={{ all:'unset', display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:'var(--color-text-muted)', fontSize:13, marginBottom:4 }} onClick={() => navigate('/director/memos')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">{resubmitMemoId ? 'Resubmit Memo' : 'New Memo'}</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {existingMemo?.timeline?.findLast?.((t) => t.action === 'Rejected')?.note && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>Rejection reason:</strong> {existingMemo.timeline.findLast((t) => t.action === 'Rejected').note}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Memo Details</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Notesheet</label>
              <select className="form-select" value={form.notesheetRef} onChange={(e) => set('notesheetRef', e.target.value)} disabled={!!resubmitMemoId}>
                <option value="">Select a notesheet…</option>
                {notesheets.map((ns) => (
                  <option key={ns._id} value={ns._id}>{ns.referenceNumber || ns._id?.slice(-8)}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Recommended Vendor</label>
              <input className="form-input" placeholder="Vendor name (optional)" value={form.recommendedVendor} onChange={(e) => set('recommendedVendor', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label required">Summary</label>
              <textarea className="form-textarea" rows={5} placeholder="Memo summary…" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/director/memos')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Saving…</> : (resubmitMemoId ? 'Resubmit Memo' : 'Create Memo')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewMemo;
