import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Eye, RefreshCw, Search } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const WorkProposalsList = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      const r = await api.get(`/api/work-proposals?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.proposals || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['workProposal', 'assessment'].includes(payload?.entity)) fetch();
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Cluster Manager</p>
          <h1 className="page-title">Work Proposals</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/cluster-manager/proposals/new')}>
          <Plus size={16} /> New Proposal
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search proposals…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="revised">Revised</option>
            <option value="forwarded">Forwarded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
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
                    <div className="empty-state-icon"><ClipboardList size={22} /></div>
                    <h3>No proposals yet</h3>
                    <p>Create a work proposal from submitted requirements.</p>
                  </div>
                </td></tr>
              ) : items.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{p.referenceNumber || p._id?.slice(-8)}</td>
                  <td>{p.title || '—'}</td>
                  <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn action-view" onClick={() => setSelected(p)}>
                        <Eye size={13} /> View
                      </button>
                      {p.status === 'rejected' && (
                        <button className="action-btn action-resubmit" onClick={() => navigate(`/cluster-manager/proposals/${p._id}/resubmit`)}>
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

      <DocumentDetail open={!!selected} onClose={() => setSelected(null)} title="Work Proposal Detail" document={selected} docType="proposal" />
    </div>
  );
};

export default WorkProposalsList;
