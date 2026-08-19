import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Briefcase } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import DocumentDrawer from '../../components/DocumentDrawer';
import RejectModal from '../../components/RejectModal';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const MemosList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [selectedMemo, setSelectedMemo] = useState(null);
  const [rejectingMemoId, setRejectingMemoId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMemos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const r = await api.get(`/api/memos?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.memos || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['memo', 'purchaseOrder'].includes(payload?.entity)) fetchMemos();
  });

  const handleApproveMemo = async (memoId) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/memos/${memoId}/decide`, { action: 'approve' });
      setSelectedMemo(null);
      await fetchMemos();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMemoConfirm = async (note) => {
    if (!rejectingMemoId) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/memos/${rejectingMemoId}/decide`, { action: 'reject', note });
      setRejectingMemoId(null);
      setSelectedMemo(null);
      await fetchMemos();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Chairperson Console</p>
          <h1 className="page-title">Executive Memos</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search memos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Summary</th>
                <th>Recommended Vendor</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ padding: 48 }}>
                      <div className="empty-state-icon"><Briefcase size={22} /></div>
                      <h3>No Memos Found</h3>
                      <p>No executive memos match your search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {m.referenceNumber || m._id?.slice(-8)}
                    </td>
                    <td>{m.summary ? (m.summary.length > 60 ? m.summary.slice(0, 60) + '...' : m.summary) : '—'}</td>
                    <td>{m.recommendedVendor || '—'}</td>
                    <td><span className={`badge ${getStatusClass(m.status)}`}>{m.status}</span></td>
                    <td>{formatDate(m.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn action-view" onClick={() => setSelectedMemo(m)}>
                          <Eye size={13} /> View
                        </button>
                        {(m.status === 'submitted' || m.status === 'under_review') && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleApproveMemo(m._id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setRejectingMemoId(m._id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="pagination">
            <span className="pagination-info">
              {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
            </span>
            <button className="pagination-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Previous
            </button>
            <button className="pagination-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        )}
      </div>

      {selectedMemo && (
        <DocumentDrawer
          doc={selectedMemo}
          docType="Memo"
          onClose={() => setSelectedMemo(null)}
          footer={
            selectedMemo.status === 'submitted' || selectedMemo.status === 'under_review' ? (
              <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger" onClick={() => setRejectingMemoId(selectedMemo._id)} disabled={actionLoading}>
                  Reject Memo
                </button>
                <button className="btn btn-primary" onClick={() => handleApproveMemo(selectedMemo._id)} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner spinner-sm" /> : null} Approve Memo
                </button>
              </div>
            ) : null
          }
        />
      )}

      {rejectingMemoId && (
        <RejectModal
          title="Reject Memo"
          loading={actionLoading}
          onConfirm={handleRejectMemoConfirm}
          onClose={() => setRejectingMemoId(null)}
        />
      )}
    </div>
  );
};

export default MemosList;
