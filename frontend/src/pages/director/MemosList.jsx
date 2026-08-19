import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Eye, RefreshCw, Search } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const MemosList = () => {
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

  const fetch = useCallback(async () => {
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

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['memo', 'purchaseOrder'].includes(payload?.entity)) fetch();
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Director</p>
          <h1 className="page-title">Memos</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/director/memos/new')}>
          <Plus size={16} /> New Memo
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search memos…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Vendor</th>
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
                  <div className="empty-state" style={{ padding:48 }}>
                    <div className="empty-state-icon"><Briefcase size={22} /></div>
                    <h3>No memos yet</h3>
                    <p>Create a memo from a submitted notesheet.</p>
                  </div>
                </td></tr>
              ) : items.map((m) => (
                <tr key={m._id}>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{m.referenceNumber || m._id?.slice(-8)}</td>
                  <td>{m.recommendedVendor || '—'}</td>
                  <td><span className={`badge ${getStatusClass(m.status)}`}>{m.status}</span></td>
                  <td>{formatDate(m.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelected(m)}>
                        <Eye size={13} /> View
                      </button>
                      {m.status === 'rejected' && (
                        <button className="action-btn action-resubmit" onClick={() => navigate('/director/memos/new', { state: { resubmitMemoId: m._id } })}>
                          <RefreshCw size={13} /> Resubmit
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

      <DocumentDetail open={!!selected} onClose={() => setSelected(null)} title="Memo Detail" document={selected} docType="memo" />
    </div>
  );
};

export default MemosList;
