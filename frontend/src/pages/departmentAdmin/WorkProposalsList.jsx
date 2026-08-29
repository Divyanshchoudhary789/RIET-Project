import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileCheck, Package, X } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const StockDrawer = ({ campus, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = { limit: 200 };
    if (campus?._id) params.ownerRef = campus._id;
    api.get('/api/stock', { params })
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [campus]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 560, maxWidth: '100vw' }}>
        <div className="drawer-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <span className="drawer-title" style={{ fontSize: 17, fontWeight: 700 }}>
            Campus Stock — {campus?.name || 'All campuses'}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="drawer-body" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Stock this campus already holds in your department's category.
          </p>
          {loading ? (
            <div className="page-loader"><span className="spinner" /></div>
          ) : error ? (
            <div className="page-error">{error}</div>
          ) : items.length === 0 ? (
            <div className="empty"><div className="empty-title">No related stock on record</div></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Item</th><th>Category</th><th>Available</th><th>Unit</th><th>Campus</th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it._id}>
                      <td style={{ fontWeight: 600 }}>{it.itemName}</td>
                      <td>{it.category}</td>
                      <td style={{ fontWeight: 700 }}>{it.quantityAvailable}</td>
                      <td>{it.unit}</td>
                      <td>{it.ownerRef?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const WorkProposalsList = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [campuses, setCampuses] = useState([]);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;
  const [selected, setSelected] = useState(null);
  const [stockCampus, setStockCampus] = useState(null);

  useEffect(() => {
    api.get('/api/campuses?limit=100')
      .then((r) => {
        const d = r.data.data;
        setCampuses(Array.isArray(d) ? d : (d?.campuses || []));
      })
      .catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      if (campusFilter) p.set('campusRef', campusFilter);
      const r = await api.get(`/api/work-proposals?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.proposals || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, campusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['workProposal', 'assessment'].includes(payload?.entity)) fetch();
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const proposalCampus = (p) => {
    const c = p.campusRefs?.[0] || p.items?.[0]?.sourceRequirementRef?.campusRef;
    return c || null;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Department Admin</p>
          <h1 className="page-title">Work Proposals</h1>
        </div>
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
          <select className="filter-select" value={campusFilter} onChange={(e) => { setCampusFilter(e.target.value); setPage(1); }}>
            <option value="">All Campuses</option>
            {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Campus</th>
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
                  <div className="empty-state" style={{ padding:48 }}><h3>No proposals found</h3></div>
                </td></tr>
              ) : items.map((p) => {
                const campus = proposalCampus(p);
                return (
                  <tr key={p._id}>
                    <td style={{ fontWeight:500, color:'var(--color-text-primary)' }}>{p.referenceNumber || p._id?.slice(-8)}</td>
                    <td>{p.title || '—'}</td>
                    <td>{p.campusRefs?.map((c) => c.name).join(', ') || campus?.name || '—'}</td>
                    <td><span className={`badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn action-view" onClick={() => setSelected(p)}>
                          <Eye size={13} /> View
                        </button>
                        <button className="action-btn action-view" onClick={() => setStockCampus(campus || {})}>
                          <Package size={13} /> View Stock
                        </button>
                        {(p.status === 'submitted' || p.status === 'revised') && (
                          <button
                            className="action-btn action-forward"
                            onClick={() => navigate('/department-admin/assessments/new', { state: { workProposalId: p._id } })}
                          >
                            <FileCheck size={13} /> Create Assessment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      {stockCampus && <StockDrawer campus={stockCampus} onClose={() => setStockCampus(null)} />}
    </div>
  );
};

export default WorkProposalsList;
