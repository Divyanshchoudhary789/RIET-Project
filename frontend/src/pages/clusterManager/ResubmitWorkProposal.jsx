import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const ResubmitWorkProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get(`/api/work-proposals/${id}`);
        const p = r.data.data;
        setProposal(p);
        setTitle(p.title || '');
        setDescription(p.description || '');
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
    if (!title.trim()) { setError('Title is required.'); return; }
    setLoading(true);
    try {
      await api.patch(`/api/work-proposals/${id}/resubmit`, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      navigate('/cluster-manager/proposals');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="page-loader"><span className="spinner" /></div>;

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-heading">
          <button style={{ all:'unset', display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:'var(--color-text-muted)', fontSize:13, marginBottom:4 }} onClick={() => navigate('/cluster-manager/proposals')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">Resubmit Work Proposal</h1>
          <p className="page-subtitle">Revise the rejected proposal and resubmit</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {proposal?.timeline?.find((t) => t.action === 'Rejected') && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>Rejection reason:</strong> {proposal.timeline.findLast((t) => t.action === 'Rejected')?.note || 'No note provided.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Edit Proposal</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Title</label>
              <input className="form-input" placeholder="Work proposal title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={4} placeholder="Updated description…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/cluster-manager/proposals')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Resubmitting…</> : 'Resubmit Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResubmitWorkProposal;
