import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, Plus } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/helpers';
import LineItemsEditor from '../../components/LineItemsEditor';
import DocumentDrawer from '../../components/DocumentDrawer';
import '../../styles/pages.css';

const rowsFromRequirement = (req) =>
  (req.items || []).map((it) => ({
    _key: crypto.randomUUID(),
    sourceRequirementRef: req._id,
    sourceItemId: it._id,
    name: it.name || '',
    quantity: it.quantity ?? 1,
    unit: it.unit || '',
    price: it.price ?? '',
    description: it.description || '',
    departmentRef: '',
    _sourceLabel: `${req.title || req.referenceNumber || 'requirement'}${req.campusRef?.name ? ` · ${req.campusRef.name}` : ''}`,
  }));

const NewWorkProposal = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectIds = location.state?.requirementIds || [];
  const fromPropose = preselectIds.length > 0;

  const [requirements, setRequirements] = useState([]);
  const [sourceRequirements, setSourceRequirements] = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [loadingData, setLoadingData]   = useState(true);

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [note, setNote]                 = useState('');
  const [items, setItems]               = useState([]);
  const [addedReqIds, setAddedReqIds]   = useState([]);
  const [viewReq, setViewReq]           = useState(null);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, deptRes] = await Promise.all([
          api.get('/api/requirements?limit=100'),
          api.get('/api/departments?limit=100'),
        ]);
        const reqs = reqRes.data.data;
        const allReqs = (Array.isArray(reqs) ? reqs : (reqs?.requirements || []))
          .filter((r) => r.status === 'submitted' || r.status === 'revised');
        setRequirements(allReqs);
        const depts = deptRes.data.data;
        setDepartments(Array.isArray(depts) ? depts : (depts?.departments || []));

        // Came in via the "Propose" button — scope the proposal to that requirement.
        if (preselectIds.length) {
          const picked = allReqs.filter((r) => preselectIds.includes(r._id));
          setSourceRequirements(picked);
          setAddedReqIds(picked.map((r) => r._id));
          setItems(picked.flatMap(rowsFromRequirement));
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRequirement = (req) => {
    if (addedReqIds.includes(req._id)) return;
    setAddedReqIds((p) => [...p, req._id]);
    setSourceRequirements((p) => [...p, req]);
    setItems((p) => [...p, ...rowsFromRequirement(req)]);
  };

  const availableRequirements = useMemo(
    () => requirements.filter((r) => !addedReqIds.includes(r._id)),
    [requirements, addedReqIds]
  );

  const validate = () => {
    if (!title.trim() || title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (items.length === 0) return 'This proposal has no line items.';
    for (const it of items) {
      if (!it.name.trim()) return 'Every line item needs a name.';
      if (!it.unit.trim()) return 'Every line item needs a unit.';
      if (Number(it.quantity) < 1) return 'Quantity must be at least 1.';
      if (it.price === '' || isNaN(Number(it.price)) || Number(it.price) < 0) return 'Every line item needs a valid price.';
      if (!it.departmentRef) return 'Assign every line item to a department.';
      if (!it.sourceRequirementRef) return 'Every line item must come from a requirement.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/work-proposals', {
        title: title.trim(),
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        items: items.map((it) => ({
          sourceRequirementRef: it.sourceRequirementRef,
          sourceItemId: it.sourceItemId || undefined,
          name: it.name.trim(),
          quantity: Number(it.quantity),
          unit: it.unit.trim(),
          price: Number(it.price),
          description: (it.description || '').trim(),
          departmentRef: it.departmentRef,
        })),
      });
      navigate('/cluster-manager/proposals');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="page-loader"><span className="spinner" /></div>;

  const RequirementCard = ({ req }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-2)' }}>
      <span style={{ flex: 1, fontSize: 13 }}>
        <strong>{req.title || req.referenceNumber || req._id?.slice(-8)}</strong>
        {req.campusRef?.name && <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{req.campusRef.name}</span>}
        <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>· {req.items?.length || 0} item(s)</span>
      </span>
      {req.priority && <span className={`badge badge-${req.priority?.toLowerCase()}`}>{req.priority}</span>}
      <button type="button" className="action-btn action-view" onClick={() => setViewReq(req)}>
        <Eye size={13} /> View
      </button>
    </div>
  );

  return (
    <div className="form-page-wide">
      <div className="page-header">
        <div className="page-heading">
          <button style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 4 }} onClick={() => navigate('/cluster-manager/proposals')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">New Work Proposal</h1>
          <p className="page-subtitle">Edit the line items and route each one to a department</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <p className="form-section-title">Proposal Details</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-field">
              <label className="form-label required">Title</label>
              <input className="form-input" placeholder="Work proposal title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} placeholder="Optional description…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Note (optional)</label>
              <textarea className="form-textarea" rows={2} placeholder="Any note to accompany this proposal…" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        </div>

        {fromPropose ? (
          <div className="form-card">
            <p className="form-section-title">Requirement</p>
            {sourceRequirements.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Requirement not found or no longer available for a proposal.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sourceRequirements.map((req) => <RequirementCard key={req._id} req={req} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="form-card">
            <p className="form-section-title">Add Requirements</p>
            {availableRequirements.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                {requirements.length === 0 ? 'No submitted / revised requirements available.' : 'All available requirements have been added.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {availableRequirements.map((req) => (
                  <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-2)' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>
                      <strong>{req.title || req.referenceNumber || req._id?.slice(-8)}</strong>
                      {req.campusRef?.name && <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{req.campusRef.name}</span>}
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>· {req.items?.length || 0} item(s)</span>
                    </span>
                    <span className={`badge badge-${req.priority?.toLowerCase()}`}>{req.priority}</span>
                    <button type="button" className="action-btn action-view" onClick={() => setViewReq(req)}>
                      <Eye size={13} /> View
                    </button>
                    <button type="button" className="action-btn action-forward" onClick={() => addRequirement(req)}>
                      <Plus size={13} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-card">
          {items.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No line items yet.</p>
          ) : (
            <LineItemsEditor items={items} onChange={setItems} departments={departments} allowAdd={false} />
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/cluster-manager/proposals')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Creating…</> : 'Create Proposal'}
          </button>
        </div>
      </form>

      {viewReq && <DocumentDrawer doc={viewReq} docType="Requirement" onClose={() => setViewReq(null)} />}
    </div>
  );
};

export default NewWorkProposal;
