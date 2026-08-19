import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, ArrowRight, XCircle, X } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass, formatCurrency } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const AssessmentsList = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;
  const [selected, setSelected] = useState(null);

  const [rejectTarget, setRejectTarget]   = useState(null);
  const [rejectNote, setRejectNote]       = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError]     = useState('');

  const [actionLoading, setActionLoading] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const r = await api.get(`/api/assessments?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.assessments || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['assessment', 'notesheet'].includes(payload?.entity)) fetch();
  });

  const handleForward = async (assessment) => {
    setActionLoading((p) => ({ ...p, [`fwd_${assessment._id}`]: true }));
    try {
      await api.patch(`/api/assessments/${assessment._id}/forward`);
      fetch();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading((p) => ({ ...p, [`fwd_${assessment._id}`]: false }));
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) { setRejectError('A rejection note is required.'); return; }
    setRejectLoading(true);
    try {
      await api.patch(`/api/assessments/${rejectTarget._id}/reject`, { note: rejectNote.trim() });
      setRejectTarget(null);
      fetch();
    } catch (err) {
      setRejectError(getErrorMessage(err));
    } finally {
      setRejectLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Director</p>
          <h1 className="page-title">Assessments</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="forwarded">Forwarded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Est. Cost</th>
                <th>Recommended</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state" style={{ padding:48 }}><h3>No assessments found</h3></div>
                </td></tr>
              ) : items.map((a) => (
                <tr key={a._id}>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{a.referenceNumber || a._id?.slice(-8)}</td>
                  <td>{formatCurrency(a.estimatedCost)}</td>
                  <td>{a.recommendedAction || '—'}</td>
                  <td><span className={`badge ${getStatusClass(a.status)}`}>{a.status}</span></td>
                  <td>{formatDate(a.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelected(a)}>
                        <Eye size={13} /> View
                      </button>
                      {a.status === 'submitted' && (
                        <>
                          <button
                            className="action-btn action-forward"
                            onClick={() => handleForward(a)}
                            disabled={actionLoading[`fwd_${a._id}`]}
                          >
                            {actionLoading[`fwd_${a._id}`] ? <span className="spinner spinner-sm" /> : <ArrowRight size={13} />}
                            Forward
                          </button>
                          <button className="action-btn action-reject" onClick={() => { setRejectTarget(a); setRejectNote(''); setRejectError(''); }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">{Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total}</span>
            <button className="pagination-btn" onClick={() => setPage((p) => p-1)} disabled={page===1}>Previous</button>
            <button className="pagination-btn" onClick={() => setPage((p) => p+1)} disabled={page>=totalPages}>Next</button>
          </div>
        )}
      </div>

      <DocumentDetail open={!!selected} onClose={() => setSelected(null)} title="Assessment Detail" document={selected} docType="assessment" />

      {rejectTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Reject Assessment</h2>
              <button className="modal-close" onClick={() => setRejectTarget(null)}><X size={18} /></button>
            </div>
            <div className="reject-modal-body">
              <p className="reject-modal-note">Provide a reason for rejecting this assessment.</p>
              {rejectError && <div className="alert alert-error">{rejectError}</div>}
              <div className="form-field">
                <label className="form-label required">Rejection Note</label>
                <textarea className="form-textarea" rows={3} placeholder="Enter rejection reason…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={rejectLoading}>
                {rejectLoading ? <><span className="spinner spinner-sm" /> Rejecting…</> : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentsList;
