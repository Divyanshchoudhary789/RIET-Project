import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Plus, XCircle, X } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const NotesheetsList = () => {
  const navigate = useNavigate();
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
      const r = await api.get(`/api/notesheets?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.notesheets || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['notesheet', 'memo'].includes(payload?.entity)) fetch();
  });

  const handleCreateMemo = async (notesheet) => {
    setActionLoading((p) => ({ ...p, [`memo_${notesheet._id}`]: true }));
    try {
      navigate('/director/memos/new', { state: { notesheetId: notesheet._id } });
    } finally {
      setActionLoading((p) => ({ ...p, [`memo_${notesheet._id}`]: false }));
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) { setRejectError('A rejection note is required.'); return; }
    setRejectLoading(true);
    try {
      await api.patch(`/api/notesheets/${rejectTarget._id}/reject`, { note: rejectNote.trim() });
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
          <h1 className="page-title">Notesheets</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search notesheets…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="rejected">Rejected</option>
            <option value="forwarded">Forwarded</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Prepared by</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding:48 }}><h3>No notesheets found</h3></div>
                </td></tr>
              ) : items.map((n) => (
                <tr key={n._id}>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{n.referenceNumber || n._id?.slice(-8)}</td>
                  <td>{n.preparedBy?.name || n.createdBy?.name || '—'}</td>
                  <td><span className={`badge ${getStatusClass(n.status)}`}>{n.status}</span></td>
                  <td>{formatDate(n.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelected(n)}>
                        <Eye size={13} /> View
                      </button>
                      {n.status === 'submitted' && (
                        <>
                          <button
                            className="action-btn action-create"
                            onClick={() => handleCreateMemo(n)}
                            disabled={actionLoading[`memo_${n._id}`]}
                          >
                            <Plus size={13} /> Create Memo
                          </button>
                          <button className="action-btn action-reject" onClick={() => { setRejectTarget(n); setRejectNote(''); setRejectError(''); }}>
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

      <DocumentDetail open={!!selected} onClose={() => setSelected(null)} title="Notesheet Detail" document={selected} docType="notesheet" />

      {rejectTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Reject Notesheet</h2>
              <button className="modal-close" onClick={() => setRejectTarget(null)}><X size={18} /></button>
            </div>
            <div className="reject-modal-body">
              <p className="reject-modal-note">Provide a reason for rejecting this notesheet.</p>
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

export default NotesheetsList;
