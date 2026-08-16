import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, FilePlus2 } from 'lucide-react';
import api from '../../utils/api';
import { formatDate, getErrorMessage, getStatusClass, getPriorityClass } from '../../utils/helpers';
import DocumentDrawer from '../../components/DocumentDrawer';
import '../../styles/pages.css';

const RequirementsList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/api/requirements', { params });
      setItems(r.data.data || []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = items.filter((it) =>
    !search || it.justification?.toLowerCase().includes(search.toLowerCase()) || it.priority?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">My Campus</span>
          <h1 className="page-title">Requirements</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/center-head/new-requirement')}>
          <FilePlus2 size={16} /> New Requirement
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-title">All Requirements</span>
          <div className="table-filters">
            <input className="search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="forwarded">Forwarded</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No requirements found</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Justification</th>
                    <th>Items</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r._id}>
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.justification || '—'}
                      </td>
                      <td>{r.items?.length ?? 0}</td>
                      <td><span className={`badge ${getPriorityClass(r.priority)}`}>{r.priority}</span></td>
                      <td><span className={`badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(r)}>
                            <Eye size={14} /> View
                          </button>
                          {r.status === 'rejected' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/center-head/requirements/${r._id}/resubmit`)}>
                              <RefreshCw size={14} /> Resubmit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selected && (
        <DocumentDrawer doc={selected} docType="Requirement" onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default RequirementsList;
