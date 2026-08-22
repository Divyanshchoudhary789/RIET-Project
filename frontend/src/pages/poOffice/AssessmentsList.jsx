import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText } from 'lucide-react';
import api from '../../utils/api';
import { getErrorMessage, formatDate, getStatusClass, formatCurrency } from '../../utils/helpers';
import DocumentDetail from '../../components/DocumentDetail';
import useSocketEvent from '../../hooks/useSocketEvent';
import '../../styles/pages.css';

const AssessmentsList = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const limit = 15;
  const [selected, setSelected] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams({ page, limit, status: 'forwarded' });
      if (search) p.set('search', search);
      const r = await api.get(`/api/assessments?${p}`);
      const d = r.data.data;
      setItems(Array.isArray(d) ? d : (d?.assessments || []));
      setTotal(r.data.meta?.total || r.data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  useSocketEvent('dashboard:refresh', (payload) => {
    if (['assessment', 'notesheet'].includes(payload?.entity)) fetch();
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">PO Office</p>
          <h1 className="page-title">Forwarded Assessments</h1>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="section-card">
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input type="text" className="form-input" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
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
                  <div className="empty-state" style={{ padding:48 }}><h3>No forwarded assessments</h3></div>
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
                      {a.notesheetRef ? (
                        <span className="badge badge-approved" style={{ fontSize: 11 }}>Notesheet Created</span>
                      ) : (
                        <button
                          className="action-btn action-forward"
                          onClick={() => navigate(`/po-office/notesheets/new?assessmentId=${a._id}`)}
                        >
                          <FileText size={13} /> Create Notesheet
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

      <DocumentDetail open={!!selected} onClose={() => setSelected(null)} title="Assessment Detail" document={selected} docType="assessment" />
    </div>
  );
};

export default AssessmentsList;
