import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, FilePlus2, X } from 'lucide-react';
import api from '../../utils/api';
import { formatDate, getErrorMessage, getStatusClass, getPriorityClass } from '../../utils/helpers';
import ApprovalJourney from '../../components/ApprovalJourney';
import '../../styles/pages.css';

const RequirementsList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);       // full requirement doc
  const [chain, setChain] = useState(null);              // approval chain
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/api/requirements', { params });
      const data = r.data.data;
      setItems(Array.isArray(data) ? data : (data?.requirements || []));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Open drawer: fetch full detail + chain in parallel
  const openDetail = async (req) => {
    setDrawerOpen(true);
    setSelected(req);   // show immediately with list data
    setChain(null);
    setDetailLoading(true);
    try {
      // Always fetch both — chain API handles the null case gracefully
      const [detailRes, chainRes] = await Promise.all([
        api.get(`/api/requirements/${req._id}`),
        api.get(`/api/requirements/${req._id}/chain`),
      ]);
      const fullDoc = detailRes.data.data;
      setSelected(fullDoc);
      const chainData = chainRes.data.data;
      // Only set chain if at least one downstream document exists
      const chainHasData = chainData && (
        chainData.workProposal || chainData.assessment ||
        chainData.notesheet || chainData.memo
      );
      setChain(chainHasData ? chainData : null);
    } catch (e) {
      // keep list-row data on failure, chain stays null
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    setChain(null);
  };

  const filtered = items.filter((it) =>
    !search ||
    it.justification?.toLowerCase().includes(search.toLowerCase()) ||
    it.priority?.includes(search)
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
            <input
              className="search-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
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
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetail(r)}
                          disabled={detailLoading}
                        >
                          <Eye size={14} /> View
                        </button>
                        {r.status === 'rejected' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/center-head/requirements/${r._id}/resubmit`)}
                          >
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
        )}
      </div>

      {/* Custom Requirement Drawer */}
      {drawerOpen && selected && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            {/* Header */}
            <div className="drawer-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="drawer-title">Requirement Details</span>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Ref: {selected.referenceNumber || selected._id}
                </span>
              </div>
              <button className="modal-close" onClick={closeDrawer} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Status + Priority */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {selected.status && (
                  <span className={`badge ${getStatusClass(selected.status)}`}>{selected.status}</span>
                )}
                {selected.priority && (
                  <span className={`badge ${getPriorityClass(selected.priority)}`}>{selected.priority}</span>
                )}
              </div>

              {/* Justification */}
              {selected.justification && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Justification</div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {selected.justification}
                  </p>
                </div>
              )}

              {/* Items */}
              {selected.items?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="drawer-section-title">Items ({selected.items.length})</div>
                  <table className="table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr><th>Item</th><th>Qty</th><th>Unit</th></tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={item._id || i}>
                          <td style={{ fontWeight: 500 }}>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Meta */}
              <div className="meta-grid" style={{ marginBottom: 24 }}>
                {selected.createdBy?.name && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Author</span>
                    <span className="drawer-field-value">{selected.createdBy.name}</span>
                  </div>
                )}
                {selected.campusRef?.name && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Campus</span>
                    <span className="drawer-field-value">{selected.campusRef.name}</span>
                  </div>
                )}
                {selected.createdAt && (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Created Date</span>
                    <span className="drawer-field-value">{formatDate(selected.createdAt)}</span>
                  </div>
                )}
              </div>

              {/* ── Approval Journey (unified flow) ── */}
              <div className="drawer-section-title">Approval Journey</div>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <span className="spinner" />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Loading journey…
                  </div>
                </div>
              ) : (
                /* Always render ApprovalJourney — passes requirement timeline for step 1,
                   and chain for downstream steps. If chain is null, only step 1 is active. */
                <ApprovalJourney
                  chain={chain}
                  requirementTimeline={selected.timeline || []}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RequirementsList;
