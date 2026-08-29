import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Plus } from 'lucide-react';
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
                      {(n.status === 'submitted' || n.status === 'revised') && (
                        <button
                          className="action-btn action-create"
                          onClick={() => handleCreateMemo(n)}
                          disabled={actionLoading[`memo_${n._id}`]}
                        >
                          <Plus size={13} /> Create Memo
                        </button>
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
    </div>
  );
};

export default NotesheetsList;
