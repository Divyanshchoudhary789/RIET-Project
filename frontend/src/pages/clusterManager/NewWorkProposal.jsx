import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import '../../styles/pages.css';

const NewWorkProposal = () => {
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [loadingData, setLoadingData]   = useState(true);

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [selectedReqs, setSelectedReqs] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, deptRes] = await Promise.all([
          api.get('/api/requirements?status=submitted&limit=100'),
          api.get('/api/departments?limit=100'),
        ]);
        const reqs = reqRes.data.data;
        setRequirements(Array.isArray(reqs) ? reqs : (reqs?.requirements || []));
        const depts = deptRes.data.data;
        setDepartments(Array.isArray(depts) ? depts : (depts?.departments || []));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const toggleReq = (id) => {
    setSelectedReqs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleDept = (id) => {
    setSelectedDepts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (selectedReqs.length === 0) { setError('Select at least one requirement.'); return; }
    if (selectedDepts.length === 0) { setError('Select at least one department.'); return; }

    setLoading(true);
    try {
      await api.post('/api/work-proposals', {
        title: title.trim(),
        description: description.trim() || undefined,
        requirementRefs: selectedReqs,
        departments: selectedDepts,
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
    <div className="form-page-wide">
      <div className="page-header">
        <div className="page-heading">
          <button style={{ all:'unset', display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:'var(--color-text-muted)', fontSize:13, marginBottom:4 }} onClick={() => navigate('/cluster-manager/proposals')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">New Work Proposal</h1>
          <p className="page-subtitle">Bundle requirements into a work proposal for departments</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Proposal Details</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-field">
              <label className="form-label required">Title</label>
              <input className="form-input" placeholder="Work proposal title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} placeholder="Optional description…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-card">
          <p className="form-section-title">Select Requirements ({selectedReqs.length} selected)</p>
          {requirements.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No submitted/revised requirements available.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto' }}>
              {requirements.map((req) => (
                <label key={req._id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, border:'1px solid var(--color-border-light)', background: selectedReqs.includes(req._id) ? '#eff6ff' : 'var(--color-surface-2)' }}>
                  <input
                    type="checkbox"
                    checked={selectedReqs.includes(req._id)}
                    onChange={() => toggleReq(req._id)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span style={{ flex:1, fontSize:13 }}>
                    <strong>{req.referenceNumber || req._id?.slice(-8)}</strong>
                    {req.campus?.name && <span style={{ color:'var(--color-text-muted)', marginLeft:8 }}>{req.campus.name}</span>}
                  </span>
                  <span className={`badge badge-${req.priority?.toLowerCase()}`}>{req.priority}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-card">
          <p className="form-section-title">Assign to Departments ({selectedDepts.length} selected)</p>
          {departments.length === 0 ? (
            <p style={{ color:'var(--color-text-muted)', fontSize:13 }}>No departments available.</p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
              {departments.map((dept) => (
                <label key={dept._id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 12px', borderRadius:8, border:'1px solid var(--color-border-light)', background: selectedDepts.includes(dept._id) ? '#eff6ff' : 'var(--color-surface-2)' }}>
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(dept._id)}
                    onChange={() => toggleDept(dept._id)}
                    style={{ accentColor:'var(--color-accent)' }}
                  />
                  <span style={{ fontSize:13 }}>{dept.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/cluster-manager/proposals')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Creating…</> : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewWorkProposal;
